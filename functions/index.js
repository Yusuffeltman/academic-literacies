const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { onValueWritten } = require("firebase-functions/v2/database");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const fs = require("fs");
const path = require("path");
const vm = require("vm");
const mammoth = require("mammoth");

let _adminReady = false;
let _adminApp = null;
let _cachedTransport = null;
let _cachedVertex = null;
const ELT_VERTEX_MODEL_CANDIDATES = [
  process.env.ALE00Y1_ELT_VERTEX_MODEL || "",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
].filter(Boolean);
const AUTO_GRADE_MAX_FILES = 4;
const AUTO_GRADE_MAX_CHARS_PER_FILE = 5000;
const AUTO_GRADE_TOTAL_MAX_CHARS = 18000;
const AUTO_GRADE_PDF_PAGE_LIMIT = 8;
const AUTO_GRADE_PIPELINE_VERSION = "2026-05-07-compact-json-v2";
const AUTO_GRADE_VERTEX_OCR_TRIGGER_CHARS = 160;
const AUTO_GRADE_VERTEX_OCR_MIN_GAIN_CHARS = 80;
const AUTO_GRADE_QUEUE_LOCK_STALE_MS = 10 * 60 * 1000;
const AUTO_GRADE_QUEUE_BATCH_SIZE = 4;
const AUTO_GRADE_QUEUE_RUN_BUDGET_MS = 150 * 1000;
const AUTO_GRADE_OCR_IMAGE_EXTENSIONS = new Set(["png", "jpg", "jpeg", "gif", "webp"]);

function ensureAdminApp() {
  if (_adminReady && _adminApp) return _adminApp;
  const { getApps, initializeApp } = require("firebase-admin/app");
  _adminApp = getApps()[0] || initializeApp();
  _adminReady = true;
  return _adminApp;
}

function adminAuth() {
  const app = ensureAdminApp();
  return require("firebase-admin/auth").getAuth(app);
}

function adminDatabase() {
  const app = ensureAdminApp();
  return require("firebase-admin/database").getDatabase(app);
}

function adminStorage() {
  const app = ensureAdminApp();
  return require("firebase-admin/storage").getStorage(app);
}

function getProjectId() {
  if (process.env.GCLOUD_PROJECT) return process.env.GCLOUD_PROJECT;
  if (process.env.GCP_PROJECT) return process.env.GCP_PROJECT;
  try {
    return JSON.parse(process.env.FIREBASE_CONFIG || "{}")?.projectId || "";
  } catch {
    return "";
  }
}

function getEltVertex() {
  if (_cachedVertex) return _cachedVertex;
  const project = getProjectId();
  if (!project) {
    throw new HttpsError("failed-precondition", "Missing Google Cloud project configuration.");
  }
  const { VertexAI } = require("@google-cloud/vertexai");
  _cachedVertex = new VertexAI({ project, location: "us-central1" });
  return _cachedVertex;
}

function getEltVertexModel(modelName) {
  return getEltVertex().getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0.2,
      responseMimeType: "application/json",
      maxOutputTokens: 4096,
    },
    systemInstruction: {
      role: "system",
      parts: [{
        text: [
          "You are a professional ELT Grader. Evaluate the student text based on provided rubrics.",
          "You must:",
          "Annotate: Use exact quotes from the text to provide feedback.",
          "Align: Link every comment to a specific Course Objective.",
          "Format: Output ONLY valid JSON. No markdown formatting.",
        ].join("\n"),
      }],
    },
  });
}

function isMissingVertexModelError(err) {
  const message = String(err?.message || "");
  return err?.code === 404
    || /404/i.test(message)
    || /NOT_FOUND/i.test(message)
    || /Publisher Model .* was not found/i.test(message)
    || /does not have access to it/i.test(message)
    || /denied access/i.test(message)
    || /contact support/i.test(message);
}

async function generateVertexTextParts(parts = [], options = {}) {
  let lastErr = null;
  const responseMimeType = cleanText(options?.responseMimeType, 80) || undefined;
  const maxOutputTokens = Math.max(256, safeNumber(options?.maxOutputTokens, 4096));
  const temperature = Number.isFinite(Number(options?.temperature))
    ? Number(options.temperature)
    : 0.2;
  const systemInstruction = options?.systemInstruction || null;

  for (const modelName of ELT_VERTEX_MODEL_CANDIDATES) {
    try {
      const model = getEltVertex().getGenerativeModel({
        model: modelName,
        generationConfig: {
          temperature,
          maxOutputTokens,
          ...(responseMimeType ? { responseMimeType } : {}),
        },
        ...(systemInstruction ? { systemInstruction } : {}),
      });
      const result = await model.generateContent({
        contents: [{ role: "user", parts }],
      });
      return {
        modelName,
        rawText: String(
          result?.response?.text?.()
          || result?.response?.candidates?.[0]?.content?.parts?.map((part) => part.text || "").join("")
          || ""
        ).trim(),
      };
    } catch (err) {
      lastErr = err;
      if (!isMissingVertexModelError(err)) throw err;
    }
  }

  throw new HttpsError(
    "failed-precondition",
    `No supported Vertex ELT model was available. Tried: ${ELT_VERTEX_MODEL_CANDIDATES.join(", ")}.${lastErr?.message ? ` ${lastErr.message}` : ""}`.trim()
  );
}

async function generateEltVertexContent(prompt, options = {}) {
  return generateVertexTextParts(
    [{ text: prompt }],
    {
      responseMimeType: "application/json",
      maxOutputTokens: Math.max(4096, safeNumber(options?.maxOutputTokens, 8192)),
      temperature: 0.2,
      systemInstruction: {
        role: "system",
        parts: [{
          text: [
            "You are a professional ELT Grader. Evaluate the student text based on provided rubrics.",
            "You must:",
            "Annotate: Use exact quotes from the text to provide feedback.",
            "Align: Link every comment to a specific Course Objective.",
            "Format: Output ONLY valid JSON. No markdown formatting.",
          ].join("\n"),
        }],
      },
    }
  );
}

function cleanText(value, max = 4000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function cleanMultiline(value, max = 24000) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
    .slice(0, max);
}

function cleanExactQuote(value, max = 1200) {
  return String(value || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim()
    .slice(0, max);
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function deriveLetterGrade(percentage) {
  if (percentage >= 75) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 60) return "C";
  if (percentage >= 50) return "D";
  return "F";
}

const ELT_INSUFFICIENT_EVIDENCE_PATTERNS = [
  /no student text was available/i,
  /file extraction error/i,
  /not possible to assess/i,
  /no readable (?:student )?(?:file )?text/i,
  /does not contain readable student prose/i,
  /limited to metadata/i,
  /unable to evaluate/i,
];

function signalsInsufficientEvidence(text = "") {
  const value = cleanMultiline(text, 2400);
  return Boolean(value) && ELT_INSUFFICIENT_EVIDENCE_PATTERNS.some((pattern) => pattern.test(value));
}

function parseJsonText(raw) {
  const text = String(raw || "").trim().replace(/^```json/i, "").replace(/^```/, "").replace(/```$/, "").trim();
  return JSON.parse(text);
}

function normalizeIntegrityBand(value, fallback = "low") {
  const band = cleanText(value, 20).toLowerCase();
  return ["low", "medium", "high"].includes(band) ? band : fallback;
}

function strongerIntegrityBand(left = "low", right = "low") {
  const order = { low: 0, medium: 1, high: 2 };
  const a = normalizeIntegrityBand(left);
  const b = normalizeIntegrityBand(right);
  return (order[b] || 0) > (order[a] || 0) ? b : a;
}

function parseConfidenceRatio(value) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  if (parsed > 1 && parsed <= 100) return clamp(parsed / 100, 0, 1);
  return clamp(parsed, 0, 1);
}

function synthIdConfigured() {
  return Boolean(cleanText(process.env.ALE00Y1_SYNTHID_PROVIDER_URL, 2000));
}

function synthIdProviderLabel(url = "") {
  try {
    return cleanText(new URL(url).hostname, 120) || "synthid-provider";
  } catch {
    return cleanText(url, 120) || "synthid-provider";
  }
}

function synthIdFileModality(name = "") {
  const ext = extension(name);
  if (["txt", "docx", "doc", "pdf", "md", "rtf"].includes(ext)) return "text";
  if (["png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff"].includes(ext)) return "image";
  if (["mp3", "wav", "m4a", "aac", "ogg", "flac"].includes(ext)) return "audio";
  if (["mp4", "mov", "avi", "mkv", "webm", "mpeg", "mpg"].includes(ext)) return "video";
  return ext || "unknown";
}

function buildSynthIdCheckedFiles(files = []) {
  return (Array.isArray(files) ? files : [])
    .map((file) => ({
      name: cleanText(file?.name, 240) || "file",
      ext: cleanText(extension(file?.name), 24),
      modality: cleanText(synthIdFileModality(file?.name), 40),
      size: safeNumber(file?.size, 0),
      status: "submitted",
      note: "",
    }))
    .slice(0, 12);
}

function synthIdAuthHeaders(token = "", apiKey = "") {
  const headers = { "content-type": "application/json" };
  const safeToken = cleanText(token, 2000);
  const safeApiKey = cleanText(apiKey, 2000);
  if (safeToken) headers.authorization = `Bearer ${safeToken}`;
  if (safeApiKey) headers["x-api-key"] = safeApiKey;
  return headers;
}

function cleanSynthIdSignal(payload = {}, fallback = null) {
  const source = payload && typeof payload === "object" ? payload : {};
  const base = fallback && typeof fallback === "object" ? fallback : {};
  if (!Object.keys(source).length && !Object.keys(base).length) return null;
  const explicitStatus = cleanText(source.status || base.status, 40).toLowerCase();
  const detected = typeof source.detected === "boolean"
    ? source.detected
    : (typeof base.detected === "boolean" ? base.detected : null);
  const status = (() => {
    if (["detected", "watermarked", "verified", "match"].includes(explicitStatus) || detected === true) return "detected";
    if (["not_detected", "not-watermarked", "not_watermarked", "clean", "no_match", "absent"].includes(explicitStatus) || detected === false) return "not_detected";
    if (["uncertain", "inconclusive", "partial"].includes(explicitStatus)) return "uncertain";
    if (["unsupported", "unavailable", "error"].includes(explicitStatus)) return explicitStatus;
    return detected === true ? "detected" : (detected === false ? "not_detected" : "uncertain");
  })();
  const checkedFiles = (Array.isArray(source.checkedFiles) ? source.checkedFiles : (Array.isArray(base.checkedFiles) ? base.checkedFiles : []))
    .map((item) => ({
      name: cleanText(item?.name, 240) || "file",
      ext: cleanText(item?.ext, 24) || cleanText(extension(item?.name), 24),
      modality: cleanText(item?.modality, 40) || cleanText(synthIdFileModality(item?.name), 40),
      size: safeNumber(item?.size, 0),
      status: cleanText(item?.status, 40) || "checked",
      note: cleanText(item?.note, 240),
    }))
    .filter((item) => item.name)
    .slice(0, 12);
  const evidence = (Array.isArray(source.evidence) ? source.evidence : (Array.isArray(source.matches) ? source.matches : []))
    .map((item) => {
      if (typeof item === "string") return cleanText(item, 320);
      return cleanText(item?.summary || item?.note || item?.text || item?.name, 320);
    })
    .filter(Boolean)
    .slice(0, 6);
  return {
    status,
    provider: cleanText(source.provider || base.provider, 120),
    detectorVersion: cleanText(source.detectorVersion || source.version || base.detectorVersion, 120),
    checkedAt: cleanText(source.checkedAt || base.checkedAt || new Date().toISOString(), 80),
    detected: status === "detected" ? true : (status === "not_detected" ? false : detected),
    confidence: parseConfidenceRatio(source.confidence ?? source.score ?? base.confidence),
    confidenceBand: normalizeIntegrityBand(source.confidenceBand || base.confidenceBand, "low"),
    summary: cleanText(source.summary || source.message || source.explanation || base.summary, 1200),
    evidence,
    checkedFiles,
    requiredHumanFollowUp: cleanText(source.requiredHumanFollowUp || base.requiredHumanFollowUp, 1200),
    recommendedStaffAction: cleanText(source.recommendedStaffAction || base.recommendedStaffAction, 1200),
  };
}

function mergeIntegrityWithSynthId(baseIntegrity = {}, synthIdSignal = null) {
  const synthId = synthIdSignal ? cleanSynthIdSignal(synthIdSignal) : null;
  const merged = {
    advisory: baseIntegrity?.advisory !== false,
    suspicionScore: safeNumber(baseIntegrity?.suspicionScore, 0),
    confidenceBand: normalizeIntegrityBand(baseIntegrity?.confidenceBand, "low"),
    reasons: (Array.isArray(baseIntegrity?.reasons) ? baseIntegrity.reasons : []).map((item) => cleanText(item, 240)).filter(Boolean).slice(0, 6),
    requiredHumanFollowUp: cleanText(baseIntegrity?.requiredHumanFollowUp, 1200),
    recommendedStaffAction: cleanText(baseIntegrity?.recommendedStaffAction, 1200),
    synthId,
  };
  if (!synthId) return merged;

  if (synthId.status === "detected") {
    merged.suspicionScore = Math.max(
      merged.suspicionScore,
      synthId.confidenceBand === "high" ? 85 : (synthId.confidenceBand === "medium" ? 72 : 60)
    );
    merged.confidenceBand = strongerIntegrityBand(merged.confidenceBand, synthId.confidenceBand === "low" ? "medium" : synthId.confidenceBand);
    if (synthId.summary) merged.reasons.unshift(cleanText(synthId.summary, 240));
    if (!merged.requiredHumanFollowUp) {
      merged.requiredHumanFollowUp = synthId.requiredHumanFollowUp
        || "Ask the student to account for their drafting process and disclose any AI assistance before finalising the mark.";
    }
    if (!merged.recommendedStaffAction) {
      merged.recommendedStaffAction = synthId.recommendedStaffAction
        || "Route this script to lecturer moderation and compare it against notebook evidence, drafting history, and any declared AI use.";
    }
  } else if (synthId.status === "uncertain") {
    merged.suspicionScore = Math.max(merged.suspicionScore, 45);
    merged.confidenceBand = strongerIntegrityBand(merged.confidenceBand, "medium");
    if (synthId.summary) merged.reasons.unshift(cleanText(synthId.summary, 240));
    if (!merged.recommendedStaffAction) {
      merged.recommendedStaffAction = synthId.recommendedStaffAction
        || "Treat the SynthID result as inconclusive and continue with manual integrity checks rather than drawing a finding from it.";
    }
  }

  merged.reasons = merged.reasons.filter((item, idx, list) => item && list.indexOf(item) === idx).slice(0, 6);
  return merged;
}

async function detectSynthIdSignal({
  assessmentId,
  studentUid,
  submissionId,
  submission = {},
  extractionBundle = {},
  studentText = "",
} = {}) {
  const checkedAt = new Date().toISOString();
  const checkedFiles = buildSynthIdCheckedFiles(submission?.files || []);
  const providerUrl = cleanText(process.env.ALE00Y1_SYNTHID_PROVIDER_URL, 2000);
  if (!providerUrl) {
    return cleanSynthIdSignal({
      status: "unavailable",
      provider: "not-configured",
      checkedAt,
      checkedFiles,
      confidenceBand: "low",
      summary: "SynthID verification is not configured in this Firebase functions environment.",
      recommendedStaffAction: "Treat the missing SynthID result as a configuration gap, not as evidence of human authorship.",
    });
  }

  const payload = {
    assessmentId: cleanText(assessmentId, 120),
    studentUid: cleanText(studentUid, 160),
    submissionId: cleanText(submissionId, 160),
    submittedAt: cleanText(submission?.submittedAt, 80),
    submissionNote: cleanText(submission?.note, 1200),
    textSnippet: cleanMultiline(studentText, 6000),
    extractionDiagnostics: cleanMultiline(formatExtractionDiagnostics(extractionBundle), 2400),
    files: (Array.isArray(submission?.files) ? submission.files : []).map((file) => ({
      name: cleanText(file?.name, 240),
      url: cleanText(file?.url, 1600),
      size: safeNumber(file?.size, 0),
      ext: cleanText(extension(file?.name), 24),
      modality: cleanText(synthIdFileModality(file?.name), 40),
    })).slice(0, 12),
  };

  try {
    const response = await fetch(providerUrl, {
      method: "POST",
      headers: synthIdAuthHeaders(
        process.env.ALE00Y1_SYNTHID_PROVIDER_TOKEN,
        process.env.ALE00Y1_SYNTHID_PROVIDER_API_KEY
      ),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const raw = await response.json().catch(() => ({}));
    return cleanSynthIdSignal({
      provider: synthIdProviderLabel(providerUrl),
      checkedAt,
      checkedFiles,
      ...raw,
    });
  } catch (err) {
    return cleanSynthIdSignal({
      status: "error",
      provider: synthIdProviderLabel(providerUrl),
      checkedAt,
      checkedFiles,
      confidenceBand: "low",
      summary: `SynthID verification could not be completed automatically. ${cleanText(err?.message, 240)}`.trim(),
      recommendedStaffAction: "Do not treat the missing SynthID result as evidence of human authorship. Continue with notebook, drafting-history, and marker-led integrity checks.",
    });
  }
}

function parseRequestJson(req) {
  if (req?.body && typeof req.body === "object") return req.body;
  const raw = typeof req?.rawBody === "string"
    ? req.rawBody
    : (Buffer.isBuffer(req?.rawBody) ? req.rawBody.toString("utf8") : "");
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function synthIdAdapterSecretMatches(req) {
  const configured = cleanText(process.env.ALE00Y1_SYNTHID_SHARED_SECRET, 2000);
  if (!configured) return true;
  const authHeader = String(req?.headers?.authorization || "");
  const bearer = authHeader.toLowerCase().startsWith("bearer ")
    ? authHeader.slice(7).trim()
    : "";
  const apiKey = String(req?.headers?.["x-api-key"] || "").trim();
  return bearer === configured || apiKey === configured;
}

async function forwardSynthIdUpstream(payload = {}) {
  const upstreamUrl = cleanText(process.env.ALE00Y1_SYNTHID_UPSTREAM_URL, 2000);
  const checkedAt = new Date().toISOString();
  const checkedFiles = buildSynthIdCheckedFiles(payload?.files || []);
  if (!upstreamUrl) {
    return cleanSynthIdSignal({
      status: "unavailable",
      provider: "adapter",
      checkedAt,
      checkedFiles,
      confidenceBand: "low",
      summary: "No upstream SynthID detector is configured for this adapter.",
      recommendedStaffAction: "Configure an upstream detector, or continue with notebook, drafting-history, and marker-led integrity review.",
    });
  }

  try {
    const response = await fetch(upstreamUrl, {
      method: "POST",
      headers: synthIdAuthHeaders(
        process.env.ALE00Y1_SYNTHID_UPSTREAM_TOKEN,
        process.env.ALE00Y1_SYNTHID_UPSTREAM_API_KEY
      ),
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const raw = await response.json().catch(() => ({}));
    return cleanSynthIdSignal({
      provider: synthIdProviderLabel(upstreamUrl),
      checkedAt,
      checkedFiles,
      ...raw,
    });
  } catch (err) {
    return cleanSynthIdSignal({
      status: "error",
      provider: synthIdProviderLabel(upstreamUrl),
      checkedAt,
      checkedFiles,
      confidenceBand: "low",
      summary: `The SynthID adapter could not reach the upstream detector. ${cleanText(err?.message, 240)}`.trim(),
      recommendedStaffAction: "Do not infer human authorship from this failure. Continue with manual integrity checks until upstream detector access is restored.",
    });
  }
}

async function requireStaffRole(uid) {
  const snap = await adminDatabase().ref(`users/${uid}/profile/role`).once("value");
  const role = String(snap.val() || "").trim().toLowerCase();
  if (!["lecturer", "moderator", "tutor"].includes(role)) {
    throw new HttpsError("permission-denied", "Staff access required.");
  }
  return role;
}

function validateEltRequest(data = {}) {
  const studentId = cleanText(data.student_id, 120);
  const assignmentId = cleanText(data.assignment_id, 120);
  const submissionId = cleanText(data.submission_id, 160);
  const studentText = cleanMultiline(data.student_text, 24000);
  const courseObjectives = (Array.isArray(data.course_objectives) ? data.course_objectives : [])
    .map((item) => cleanText(item, 240))
    .filter(Boolean)
    .slice(0, 10);
  const rubric = (Array.isArray(data.rubric) ? data.rubric : [])
    .map((row) => ({
      criterion_name: cleanText(row?.criterion_name, 240),
      max_score: safeNumber(row?.max_score, 0),
      descriptor: cleanText(row?.descriptor, 800),
    }))
    .filter((row) => row.criterion_name && row.max_score > 0);
  const timestamp = cleanText(data.timestamp, 80) || new Date().toISOString();

  if (!studentId) throw new HttpsError("invalid-argument", "student_id is required.");
  if (!assignmentId) throw new HttpsError("invalid-argument", "assignment_id is required.");
  if (!submissionId) throw new HttpsError("invalid-argument", "submission_id is required.");
  if (!studentText) throw new HttpsError("invalid-argument", "student_text is required.");
  if (!courseObjectives.length) throw new HttpsError("invalid-argument", "course_objectives must contain at least one objective.");
  if (!rubric.length) throw new HttpsError("invalid-argument", "rubric must contain at least one criterion.");

  return { studentId, assignmentId, submissionId, studentText, courseObjectives, rubric, timestamp };
}

function normalizeEltResponse(raw = {}, context = {}) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    throw new HttpsError("data-loss", "ELT grader returned an invalid JSON object.");
  }
  if (!raw.assessment_metadata || !raw.grading_summary || !Array.isArray(raw.criteria_breakdown) || !raw.holistic_feedback || !Array.isArray(raw.annotations)) {
    throw new HttpsError("data-loss", "ELT grader response is missing required sections.");
  }

  const totalPossible = context.rubric.reduce((sum, row) => sum + row.max_score, 0);
  if (raw.criteria_breakdown.length !== context.rubric.length) {
    throw new HttpsError("data-loss", "ELT grader returned an incomplete criteria_breakdown.");
  }

  const criteriaBreakdown = raw.criteria_breakdown.map((item, idx) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpsError("data-loss", `Criterion ${idx + 1} is invalid.`);
    }
    const criterionName = cleanText(item.criterion_name, 240);
    const justification = cleanMultiline(item.justification, 1400);
    if (!criterionName || !justification) {
      throw new HttpsError("data-loss", `Criterion ${idx + 1} is missing required values.`);
    }
    const rubricRow = context.rubric[idx];
    const maxScore = clamp(safeNumber(item.max_score, rubricRow.max_score), 0, rubricRow.max_score);
    const score = clamp(safeNumber(item.score, 0), 0, maxScore);
    return {
      criterion_name: criterionName,
      score,
      max_score: maxScore,
      justification,
    };
  });

  const totalEarned = clamp(
    safeNumber(raw.grading_summary.total_points_earned, criteriaBreakdown.reduce((sum, item) => sum + item.score, 0)),
    0,
    totalPossible
  );
  const percentage = clamp(
    safeNumber(raw.grading_summary.overall_percentage, totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : 0),
    0,
    100
  );

  const annotations = raw.annotations.map((item, idx) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new HttpsError("data-loss", `Annotation ${idx + 1} is invalid.`);
    }
    const feedbackType = cleanText(item.feedback_type, 20);
    if (!["strength", "growth", "correction"].includes(feedbackType)) {
      throw new HttpsError("data-loss", `Annotation ${idx + 1} has an invalid feedback_type.`);
    }
    const normalized = {
      exact_quote: cleanExactQuote(item.exact_quote, 600),
      feedback_type: feedbackType,
      comment: cleanMultiline(item.comment, 1200),
      related_objective: cleanText(item.related_objective, 240),
      suggested_revision: cleanMultiline(item.suggested_revision, 1200),
    };
    if (!normalized.comment || !normalized.related_objective) {
      throw new HttpsError("data-loss", `Annotation ${idx + 1} is missing required fields.`);
    }
    return normalized;
  });

  const holistic = {
    strengths_summary: cleanMultiline(raw.holistic_feedback.strengths_summary, 2400),
    areas_for_improvement: cleanMultiline(raw.holistic_feedback.areas_for_improvement, 2400),
    alignment_with_course_goals: cleanMultiline(raw.holistic_feedback.alignment_with_course_goals, 2400),
  };
  if (!holistic.strengths_summary || !holistic.areas_for_improvement || !holistic.alignment_with_course_goals) {
    throw new HttpsError("data-loss", "ELT grader returned incomplete holistic_feedback.");
  }

  const insufficientEvidence = criteriaBreakdown.length > 0
    && criteriaBreakdown.every((item) => item.score === 0 && signalsInsufficientEvidence(item.justification))
    && signalsInsufficientEvidence(holistic.strengths_summary)
    && signalsInsufficientEvidence(holistic.areas_for_improvement);
  const evidenceWarning = insufficientEvidence
    ? "No readable student text was available for evaluation. Treat this as an extraction failure requiring manual review, not as a zero mark."
    : "";

  return {
    assessment_metadata: {
      student_id: context.studentId,
      assignment_id: context.assignmentId,
      timestamp: context.timestamp,
    },
    grading_summary: {
      overall_percentage: insufficientEvidence ? null : percentage,
      total_points_earned: insufficientEvidence ? null : totalEarned,
      total_points_possible: totalPossible,
      letter_grade: insufficientEvidence ? "" : (cleanText(raw.grading_summary.letter_grade, 20) || deriveLetterGrade(percentage)),
    },
    criteria_breakdown: criteriaBreakdown,
    annotations,
    holistic_feedback: holistic,
    evaluation_status: insufficientEvidence ? "insufficient_evidence" : "ok",
    evidence_warning: evidenceWarning,
  };
}

function cloneJsonSafe(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function extension(name = "") {
  return String(name || "").split(".").pop()?.toLowerCase() || "";
}

function truncateText(value = "", max = AUTO_GRADE_MAX_CHARS_PER_FILE) {
  const text = cleanMultiline(value, max + 1);
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(0, max - 1)).trimEnd()}…`;
}

async function fetchArrayBuffer(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

function parseStorageFileRef(file = {}) {
  const rawStoragePath = cleanText(file?.storagePath, 2000).replace(/^\/+/, "");
  if (rawStoragePath) return { bucketName: "", filePath: rawStoragePath };

  const rawUrl = String(file?.url || "").trim();
  const gsMatch = rawUrl.match(/^gs:\/\/([^/]+)\/(.+)$/i);
  if (gsMatch) {
    return {
      bucketName: gsMatch[1],
      filePath: gsMatch[2].replace(/^\/+/, ""),
    };
  }

  return null;
}

function storageFileUri(file = {}) {
  const storageRef = parseStorageFileRef(file);
  if (!storageRef?.filePath) return "";
  const bucketName = storageRef.bucketName || cleanText(adminStorage().bucket()?.name, 400);
  return bucketName ? `gs://${bucketName}/${storageRef.filePath}` : "";
}

function submissionFileMimeType(file = {}) {
  const explicit = cleanText(file?.type, 160).toLowerCase();
  if (explicit) return explicit;
  const ext = extension(file?.name);
  if (ext === "pdf") return "application/pdf";
  if (ext === "txt") return "text/plain";
  if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "gif") return "image/gif";
  if (ext === "webp") return "image/webp";
  return "";
}

function supportsInlineVertexOcr(mimeType = "") {
  return ["image/png", "image/jpeg"].includes(cleanText(mimeType, 80).toLowerCase());
}

function pickBetterExtractedText(primaryText = "", secondaryText = "", {
  maxChars = AUTO_GRADE_MAX_CHARS_PER_FILE,
  preferSecondaryWhenPrimaryShort = false,
} = {}) {
  const primary = truncateText(primaryText, maxChars);
  const secondary = truncateText(secondaryText, maxChars);
  if (!secondary) return { text: primary, usedSecondary: false };
  if (!primary) return { text: secondary, usedSecondary: true };
  if (preferSecondaryWhenPrimaryShort && primary.length < AUTO_GRADE_VERTEX_OCR_TRIGGER_CHARS) {
    return { text: secondary.length >= primary.length ? secondary : primary, usedSecondary: secondary.length >= primary.length };
  }
  if (secondary.length >= (primary.length + AUTO_GRADE_VERTEX_OCR_MIN_GAIN_CHARS)) {
    return { text: secondary, usedSecondary: true };
  }
  return { text: primary, usedSecondary: false };
}

async function fetchSubmissionFileBuffer(file = {}) {
  const storageRef = parseStorageFileRef(file);
  const rawUrl = String(file?.url || "").trim();

  if (storageRef?.filePath) {
    try {
      const bucket = storageRef.bucketName ? adminStorage().bucket(storageRef.bucketName) : adminStorage().bucket();
      const [buffer] = await bucket.file(storageRef.filePath).download();
      return buffer;
    } catch (storageErr) {
      if (!rawUrl) throw storageErr;
    }
  }

  if (!rawUrl) throw new Error("Missing file URL.");
  return fetchArrayBuffer(rawUrl);
}

async function fetchSubmissionText(file = {}) {
  const storageRef = parseStorageFileRef(file);
  if (storageRef?.filePath) {
    const buffer = await fetchSubmissionFileBuffer(file);
    return buffer.toString("utf8");
  }

  const response = await fetch(String(file?.url || ""));
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.text();
}

async function extractVertexOcrText(file = {}, buffer = null, {
  maxChars = AUTO_GRADE_MAX_CHARS_PER_FILE,
} = {}) {
  const mimeType = submissionFileMimeType(file);
  if (!mimeType) return "";

  const parts = [{
    text: [
      "Transcribe the readable student-authored text from this academic submission file.",
      "Return plain text only.",
      "Preserve paragraph breaks where possible.",
      "Ignore decorative headers, footers, and page numbers when they are clearly not part of the student's answer.",
      "If there is no readable student text, return an empty response.",
    ].join("\n"),
  }];

  const fileUri = storageFileUri(file);
  if (fileUri) {
    parts.push({
      fileData: {
        fileUri,
        mimeType,
      },
    });
  } else {
    const resolvedBuffer = buffer || await fetchSubmissionFileBuffer(file);
    if (!resolvedBuffer || !supportsInlineVertexOcr(mimeType)) return "";
    parts.push({
      inlineData: {
        mimeType,
        data: resolvedBuffer.toString("base64"),
      },
    });
  }

  const result = await generateVertexTextParts(parts, {
    responseMimeType: "text/plain",
    temperature: 0.1,
    maxOutputTokens: 4096,
  });
  return truncateText(result?.rawText || "", maxChars);
}

async function extractPdfText(buffer, {
  maxChars = AUTO_GRADE_MAX_CHARS_PER_FILE,
  pageLimit = AUTO_GRADE_PDF_PAGE_LIMIT,
} = {}) {
  const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(buffer) }).promise;
  const parts = [];
  const totalPages = Math.min(pdf.numPages || 0, pageLimit);
  for (let pageNo = 1; pageNo <= totalPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    const pageText = [];
    for (const item of Array.isArray(textContent?.items) ? textContent.items : []) {
      if (!item || typeof item.str !== "string") continue;
      pageText.push(item.str);
      if (item.hasEOL) pageText.push("\n");
    }
    const normalized = cleanMultiline(pageText.join(" "), maxChars);
    if (normalized) parts.push(normalized);
    if (cleanMultiline(parts.join("\n\n"), maxChars).length >= maxChars) break;
  }
  return truncateText(parts.join("\n\n"), maxChars);
}

async function extractDocxText(buffer, { maxChars = AUTO_GRADE_MAX_CHARS_PER_FILE } = {}) {
  const result = await mammoth.extractRawText({ buffer });
  return truncateText(result?.value || "", maxChars);
}

async function extractSubmissionFileText(file = {}, {
  maxChars = AUTO_GRADE_MAX_CHARS_PER_FILE,
  pageLimit = AUTO_GRADE_PDF_PAGE_LIMIT,
} = {}) {
  const ext = extension(file?.name);
  const url = String(file?.url || "");
  const base = {
    name: String(file?.name || "file"),
    ext,
    url,
    status: "unsupported",
    text: "",
    note: "",
    source: "",
  };
  if (!url) return { ...base, note: "Missing file URL." };
  try {
    if (ext === "txt") {
      const text = await fetchSubmissionText(file);
      return { ...base, status: "ok", text: truncateText(text, maxChars), source: "native" };
    }
    if (ext === "pdf") {
      const buffer = await fetchSubmissionFileBuffer(file);
      const nativeText = await extractPdfText(buffer, { maxChars, pageLimit });
      let text = nativeText;
      let note = nativeText ? "" : "No extractable PDF text found.";
      let source = "native";

      if (!nativeText || nativeText.length < AUTO_GRADE_VERTEX_OCR_TRIGGER_CHARS) {
        const ocrText = await extractVertexOcrText(file, buffer, { maxChars }).catch(() => "");
        const chosen = pickBetterExtractedText(nativeText, ocrText, {
          maxChars,
          preferSecondaryWhenPrimaryShort: true,
        });
        text = chosen.text;
        if (chosen.usedSecondary && ocrText) {
          source = "ocr";
          note = nativeText
            ? "Vertex OCR recovered more readable PDF text than the embedded text layer."
            : "Vertex OCR extracted PDF text.";
        } else if (nativeText && ocrText) {
          source = "native+ocr";
          note = "Embedded PDF text layer used; Vertex OCR also recovered readable text.";
        }
      }

      return {
        ...base,
        status: text ? "ok" : "empty",
        text,
        note: text ? note : "No extractable PDF text found.",
        source,
      };
    }
    if (ext === "docx") {
      const buffer = await fetchSubmissionFileBuffer(file);
      const text = await extractDocxText(buffer, { maxChars });
      return {
        ...base,
        status: text ? "ok" : "empty",
        text,
        note: text ? "" : "No extractable DOCX text found.",
        source: "native",
      };
    }
    if (AUTO_GRADE_OCR_IMAGE_EXTENSIONS.has(ext)) {
      const buffer = storageFileUri(file) ? null : await fetchSubmissionFileBuffer(file);
      const text = await extractVertexOcrText(file, buffer, { maxChars }).catch(() => "");
      return {
        ...base,
        status: text ? "ok" : "empty",
        text,
        note: text ? "Vertex OCR extracted image text." : "No readable text found in the image.",
        source: "ocr",
      };
    }
    return { ...base, note: "Unsupported file type for automatic extraction." };
  } catch (err) {
    return {
      ...base,
      status: "error",
      note: cleanText(err?.message || `Failed to extract ${ext.toUpperCase()} text.`, 280),
    };
  }
}

async function extractSubmissionBundle(files = {}, {
  maxFiles = AUTO_GRADE_MAX_FILES,
  maxCharsPerFile = AUTO_GRADE_MAX_CHARS_PER_FILE,
  totalMaxChars = AUTO_GRADE_TOTAL_MAX_CHARS,
  pageLimit = AUTO_GRADE_PDF_PAGE_LIMIT,
} = {}) {
  const candidates = (Array.isArray(files) ? files : []).filter(Boolean);
  const supported = candidates.filter((file) => (
    ["pdf", "docx", "txt"].includes(extension(file?.name))
    || AUTO_GRADE_OCR_IMAGE_EXTENSIONS.has(extension(file?.name))
  )).slice(0, maxFiles);
  const unsupported = candidates
    .filter((file) => !supported.includes(file))
    .map((file) => ({
      name: String(file?.name || "file"),
      ext: extension(file?.name),
      note: ["png", "jpg", "jpeg", "gif", "webp"].includes(extension(file?.name))
        ? "Image OCR could not be run for this file in backend auto-marking."
        : "Unsupported file type for backend auto-marking extraction.",
    }));

  const results = [];
  let remaining = totalMaxChars;
  for (const file of supported) {
    const limit = Math.max(500, Math.min(maxCharsPerFile, remaining));
    const extracted = await extractSubmissionFileText(file, { maxChars: limit, pageLimit });
    if (extracted?.text) remaining -= extracted.text.length;
    results.push(extracted);
    if (remaining <= 0) break;
  }

  return { results, unsupported };
}

function normalizeCachedExtractionItem(item = {}, fallbackStatus = "unsupported") {
  const status = cleanText(item?.status, 40).toLowerCase();
  const source = cleanText(item?.source, 40).toLowerCase();
  return {
    name: cleanText(item?.name, 240) || "file",
    ext: cleanText(item?.ext, 24).toLowerCase(),
    status: ["ok", "empty", "error", "unsupported"].includes(status) ? status : fallbackStatus,
    text: truncateText(item?.text || "", AUTO_GRADE_MAX_CHARS_PER_FILE),
    note: cleanText(item?.note, 400),
    source: cleanText(source, 40),
  };
}

function normalizeCachedExtractionBundle(bundle = {}) {
  const results = (Array.isArray(bundle?.results) ? bundle.results : [])
    .map((item) => normalizeCachedExtractionItem(item, "unsupported"));
  const unsupported = (Array.isArray(bundle?.unsupported) ? bundle.unsupported : [])
    .map((item) => normalizeCachedExtractionItem(item, "unsupported"));
  const extractedFiles = results.filter((item) => item.status === "ok" && item.text).length;
  const usedChars = results.reduce((sum, item) => sum + (item?.text ? item.text.length : 0), 0);
  return {
    generatedAt: cleanText(bundle?.generatedAt, 80),
    results,
    unsupported,
    usedChars,
    totalFiles: Math.max(
      safeNumber(bundle?.totalFiles, 0),
      results.length + unsupported.length
    ),
    extractedFiles: Math.max(safeNumber(bundle?.extractedFiles, 0), extractedFiles),
  };
}

function extractionBundleStats(bundle = {}) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const unsupported = Array.isArray(bundle?.unsupported) ? bundle.unsupported : [];
  return {
    extractedFiles: results.filter((item) => item.status === "ok" && item.text).length,
    usedChars: results.reduce((sum, item) => sum + (item?.text ? item.text.length : 0), 0),
    ocrFiles: results.filter((item) => item.status === "ok" && item.text && /ocr/i.test(item.source || "")).length,
    totalEntries: results.length + unsupported.length,
  };
}

function preferExtractionBundle(primary = null, secondary = null) {
  if (!primary) return secondary;
  if (!secondary) return primary;
  const a = extractionBundleStats(primary);
  const b = extractionBundleStats(secondary);
  if (a.extractedFiles !== b.extractedFiles) return a.extractedFiles > b.extractedFiles ? primary : secondary;
  if (a.usedChars !== b.usedChars) return a.usedChars > b.usedChars ? primary : secondary;
  if (a.ocrFiles !== b.ocrFiles) return a.ocrFiles > b.ocrFiles ? primary : secondary;
  if (a.totalEntries !== b.totalEntries) return a.totalEntries > b.totalEntries ? primary : secondary;
  return primary;
}

async function resolveSubmissionExtractionBundle(submission = {}) {
  const cached = submission?.extractionCache ? normalizeCachedExtractionBundle(submission.extractionCache) : null;
  const live = await extractSubmissionBundle(submission.files || []);
  return preferExtractionBundle(cached, live) || live || cached || { results: [], unsupported: [] };
}

function describeExtractionBundle(bundle = {}) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const unsupported = Array.isArray(bundle?.unsupported) ? bundle.unsupported : [];
  const extractedFiles = results.filter((item) => item.status === "ok" && item.text).length;
  const ocrFiles = results.filter((item) => item.status === "ok" && item.text && /ocr/i.test(item.source || "")).length;
  const warnings = results.filter((item) => item.status !== "ok").length + unsupported.length;
  const parts = [];
  if (extractedFiles) parts.push(`Automatic content extraction succeeded for ${extractedFiles} file(s).`);
  if (ocrFiles) parts.push(`OCR was used for ${ocrFiles} file(s).`);
  if (!extractedFiles) parts.push("No submission text could be extracted automatically.");
  if (warnings) parts.push(`${warnings} file(s) were empty, unsupported, or failed extraction.`);
  return parts.join(" ");
}

function formatExtractionDiagnostics(bundle = {}) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const unsupported = Array.isArray(bundle?.unsupported) ? bundle.unsupported : [];
  const lines = [];
  results.forEach((item, idx) => {
    const status = item?.status || "unknown";
    const source = item?.source ? ` via ${item.source}` : "";
    const charCount = item?.text ? ` (${item.text.length} chars)` : "";
    const note = item?.note ? ` ${item.note}` : "";
    lines.push(`${idx + 1}. ${item?.name || "file"} — ${status}${source}${charCount}.${note}`.trim());
  });
  unsupported.forEach((item, idx) => {
    lines.push(`${results.length + idx + 1}. ${item?.name || "file"} — unsupported. ${item?.note || "Unsupported file type."}`.trim());
  });
  return lines.join("\n").trim();
}

function normalizeChecklist(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((item) => ({
      title: cleanText(item?.title, 180),
      detail: cleanText(item?.detail, 1000),
    }))
    .filter((item) => item.title || item.detail);
}

function normalizeRubric(list) {
  if (!Array.isArray(list)) return [];
  return list
    .map((row) => ({
      criterion: cleanText(row?.criterion, 240),
      levels: Array.isArray(row?.levels)
        ? row.levels
          .map((level) => ({
            mark: cleanText(level?.mark, 80),
            desc: cleanText(level?.desc, 600),
          }))
          .filter((level) => level.mark || level.desc)
        : [],
    }))
    .filter((row) => row.criterion || row.levels.length);
}

function normalizeLoadedAssessmentSettingsOverride(assessmentId, raw = {}) {
  const safeId = cleanText(assessmentId, 40);
  if (!safeId) return null;
  const deadline = Object.prototype.hasOwnProperty.call(raw, "deadline")
    ? (() => {
        const parsed = new Date(raw.deadline);
        return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
      })()
    : null;
  return {
    assessmentId: safeId,
    deadline,
    checklist: normalizeChecklist(raw.checklist),
    rubric: normalizeRubric(raw.rubric),
  };
}

function mergeAssessmentConfig(baseCfg, overrideCfg = null) {
  if (!baseCfg) return null;
  const cfg = {
    ...baseCfg,
    checklist: normalizeChecklist(baseCfg.checklist || []),
    rubric: normalizeRubric(baseCfg.rubric || []),
  };
  if (!overrideCfg) return cfg;
  if (Object.prototype.hasOwnProperty.call(overrideCfg, "deadline")) cfg.deadline = overrideCfg.deadline || null;
  if (Array.isArray(overrideCfg.checklist)) cfg.checklist = normalizeChecklist(overrideCfg.checklist);
  if (Array.isArray(overrideCfg.rubric)) cfg.rubric = normalizeRubric(overrideCfg.rubric);
  return cfg;
}

function assessmentSourceFile(assessmentId = "") {
  const digits = String(assessmentId || "").match(/\d+/)?.[0];
  if (!digits) return "";
  const filename = `assess${String(digits).padStart(2, "0")}.js`;
  const bundledPath = path.resolve(__dirname, "content", "assessments", filename);
  if (fs.existsSync(bundledPath)) return bundledPath;
  return path.resolve(__dirname, "..", "content", "assessments", filename);
}

function loadAssessmentSourceConfig(assessmentId = "") {
  const filename = assessmentSourceFile(assessmentId);
  if (!filename || !fs.existsSync(filename)) return null;
  const source = fs.readFileSync(filename, "utf8");
  const match = source.match(/const CFG = (\{[\s\S]*?\n\});\s*\n\s*registerAssessment\(CFG\);/);
  if (!match?.[1]) return null;
  return vm.runInNewContext(`(${match[1]})`, {}, { timeout: 1000 });
}

async function loadEffectiveAssessmentConfig(assessmentId = "") {
  const baseCfg = loadAssessmentSourceConfig(assessmentId);
  if (!baseCfg) return null;
  const overrideSnap = await adminDatabase().ref(`assessment-settings/${assessmentId}`).once("value");
  const override = overrideSnap.exists()
    ? normalizeLoadedAssessmentSettingsOverride(assessmentId, overrideSnap.val() || {})
    : null;
  return mergeAssessmentConfig(baseCfg, override);
}

function getEltCourseObjectives(cfg = null) {
  const explicit = Array.isArray(cfg?.courseObjectives) ? cfg.courseObjectives : [];
  const fallback = Array.isArray(cfg?.courseOutcomes) ? cfg.courseOutcomes : [];
  return (explicit.length ? explicit : fallback)
    .map((item) => cleanText(item, 240))
    .filter(Boolean)
    .slice(0, 8);
}

function parseMarkValue(raw) {
  const matches = String(raw || "").match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return 0;
  return Math.max(...matches.map((value) => Number(value)).filter((value) => Number.isFinite(value)));
}

function buildEltRubric(cfg = null) {
  return (Array.isArray(cfg?.rubric) ? cfg.rubric : [])
    .map((row) => {
      const criterionName = cleanText(row?.criterion, 240);
      const maxScore = Math.max(0, ...((Array.isArray(row?.levels) ? row.levels : []).map((level) => parseMarkValue(level?.mark))));
      const descriptor = (Array.isArray(row?.levels) ? row.levels : [])
        .map((level) => {
          const mark = cleanText(level?.mark, 80);
          const desc = cleanText(level?.desc, 320);
          return mark || desc ? `${mark}${mark && desc ? ": " : ""}${desc}`.trim() : "";
        })
        .filter(Boolean)
        .join(" | ");
      if (!criterionName) return null;
      return {
        criterion_name: criterionName,
        max_score: maxScore || 25,
        descriptor,
      };
    })
    .filter(Boolean);
}

function buildEltStudentText(bundle = {}, maxChars = AUTO_GRADE_TOTAL_MAX_CHARS) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const fullText = results
    .filter((item) => item?.text)
    .map((item) => `[File: ${item.name}]\n${cleanMultiline(item.text, Math.max(maxChars * 2, AUTO_GRADE_TOTAL_MAX_CHARS))}`)
    .join("\n\n");
  const normalized = String(fullText || "")
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  const truncated = normalized.length > maxChars;
  const text = normalized.slice(0, maxChars).trim();
  return {
    text,
    originalLength: normalized.length,
    truncated,
    maxChars,
  };
}

function buildLimitedEvidenceContext(submission = {}, extractionBundle = {}) {
  const parts = [];
  const studentNote = cleanText(submission?.note || "", 3000);
  const files = Array.isArray(submission?.files) ? submission.files : [];
  const extractionSummary = cleanText(describeExtractionBundle(extractionBundle), 800);
  const extractionDiagnostics = cleanText(formatExtractionDiagnostics(extractionBundle), 3000);
  if (studentNote) parts.push(`[Student Submission Note]\n${studentNote}`);
  if (files.length) {
    parts.push(`[Submission File Manifest]\n${files.map((file, idx) => `${idx + 1}. ${file?.name || "file"}${file?.size ? ` (${file.size} bytes)` : ""}`).join("\n")}`);
  }
  if (extractionSummary) parts.push(`[Automatic Extraction Status]\n${extractionSummary}`);
  if (extractionDiagnostics) parts.push(`[Per-File Extraction Diagnostics]\n${extractionDiagnostics}`);
  return parts.join("\n\n").trim();
}

function detectEltInsufficientEvidence(eltAssessment = {}) {
  const explicitStatus = cleanText(eltAssessment?.evaluation_status, 80).toLowerCase();
  const explicitWarning = cleanText(eltAssessment?.evidence_warning, 1200);
  if (explicitStatus === "insufficient_evidence") {
    return {
      insufficient: true,
      warning: explicitWarning || "No readable student text was available for evaluation. Manual review is required.",
    };
  }
  const criteria = Array.isArray(eltAssessment?.criteria_breakdown) ? eltAssessment.criteria_breakdown : [];
  const holistic = eltAssessment?.holistic_feedback || {};
  const zeroScores = criteria.length > 0 && criteria.every((row) => {
    const score = Number(row?.score);
    return !Number.isFinite(score) || score === 0;
  });
  const flaggedCriteria = criteria.length > 0 && criteria.every((row) => signalsInsufficientEvidence(row?.justification || ""));
  const flaggedHolistic = signalsInsufficientEvidence(holistic?.strengths_summary || "")
    || signalsInsufficientEvidence(holistic?.areas_for_improvement || "")
    || signalsInsufficientEvidence(holistic?.alignment_with_course_goals || "");
  const insufficient = zeroScores && flaggedCriteria && flaggedHolistic;
  return {
    insufficient,
    warning: explicitWarning || (insufficient ? "No readable student text was available for evaluation. Manual review is required." : ""),
  };
}

function rankEltCriteria(criteria = []) {
  return (Array.isArray(criteria) ? criteria : [])
    .map((row) => {
      const score = Number(row?.score);
      const maxScore = Number(row?.max_score);
      return {
        ...row,
        score: Number.isFinite(score) ? score : null,
        max_score: Number.isFinite(maxScore) ? maxScore : 0,
        ratio: Number.isFinite(score) && Number.isFinite(maxScore) && maxScore > 0 ? score / maxScore : null,
      };
    })
    .filter((row) => cleanText(row?.criterion_name, 240));
}

function weakestEltCriteria(criteria = [], limit = 2) {
  return rankEltCriteria(criteria)
    .filter((row) => row.ratio != null)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit);
}

function strongestEltCriteria(criteria = [], limit = 2) {
  return rankEltCriteria(criteria)
    .filter((row) => row.ratio != null)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit);
}

function criterionFailSummary(row = {}) {
  const criterion = cleanText(row?.criterion_name, 200) || "this criterion";
  const score = row?.score == null || !Number.isFinite(Number(row.score)) || Number(row?.max_score) <= 0
    ? "unscored"
    : `${row.score}/${row.max_score}`;
  const justification = cleanText(row?.justification, 220);
  return `${criterion} (${score})${justification ? `: ${justification}` : ""}`.trim();
}

function criterionImproveSummary(row = {}) {
  const criterion = cleanText(row?.criterion_name, 200) || "this criterion";
  const justification = cleanText(row?.justification, 200);
  return `${criterion}${justification ? `: ${justification}` : ": strengthen the evidence and judgment against the rubric."}`.trim();
}

function genericDraftPatterns() {
  return [
    /this provisional draft can confirm/i,
    /a strong submission .* should meet/i,
    /final feedback should explain how/i,
    /the marker should now review/i,
    /replace this provisional ai draft/i,
    /open the submitted files and verify performance/i,
  ];
}

function looksGenericDraftText(value = "") {
  const text = cleanText(value, 4000);
  return Boolean(text) && genericDraftPatterns().some((pattern) => pattern.test(text));
}

function deriveOverallMarkFromDraftCriteria(rows = []) {
  const scoredRows = (Array.isArray(rows) ? rows : []).filter((row) => (
    row?.provisionalMark != null
    && Number.isFinite(Number(row.provisionalMark))
    && Number(row?.maxMark) > 0
  ));
  if (!scoredRows.length) return null;
  const earned = scoredRows.reduce((acc, row) => acc + Number(row.provisionalMark || 0), 0);
  const possible = scoredRows.reduce((acc, row) => acc + Number(row.maxMark || 0), 0);
  return possible > 0 ? Math.round((earned / possible) * 100) : null;
}

function draftHasSpecificFailJustification(draft = {}) {
  const overallMark = draft?.overallMark == null || Number.isNaN(Number(draft.overallMark))
    ? deriveOverallMarkFromDraftCriteria(draft?.criterionRows || [])
    : Number(draft.overallMark);
  if (!(Number.isFinite(Number(overallMark)) && Number(overallMark) < 50)) return true;
  const text = [
    draft?.confidenceNote,
    draft?.evidenceBasis,
    draft?.feedback?.whereYouAreNow,
    draft?.feedback?.whereYouShouldBe,
    draft?.feedback?.relationToOutcomes,
    draft?.feedback?.whatToDoNext,
  ].map((value) => cleanText(value, 2400).toLowerCase()).join(" ");
  const weakestCriteria = (Array.isArray(draft?.criterionRows) ? draft.criterionRows : [])
    .filter((row) => row?.provisionalMark != null && Number(row?.maxMark) > 0)
    .map((row) => ({
      criterion: cleanText(row?.criterion, 120).toLowerCase(),
      ratio: Number(row.provisionalMark) / Number(row.maxMark),
    }))
    .filter((row) => row.criterion && Number.isFinite(row.ratio))
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, 2)
    .map((row) => row.criterion);
  const mentionsThreshold = /50|pass|below the 50% pass threshold|below pass/.test(text);
  const mentionsWeakness = weakestCriteria.some((criterion) => text.includes(criterion));
  return mentionsThreshold && mentionsWeakness;
}

function draftQualityIssueLabel(code = "") {
  const map = {
    criterion_rationale_missing: "Criterion rationale missing",
    criterion_rationale_generic: "Criterion rationale too generic",
    feedback_generic: "Feedback sections read as generic",
    fail_justification_missing: "Fail mark lacks pass-threshold explanation",
    overall_mark_unsupported: "Overall mark is not supported by criterion rows",
    evidence_basis_missing: "Evidence basis is too thin",
  };
  return map[code] || String(code || "").replace(/_/g, " ");
}

function draftQualityIssues(draft = {}) {
  const criterionRows = Array.isArray(draft?.criterionRows) ? draft.criterionRows : [];
  const scoredRows = criterionRows.filter((row) => row?.provisionalMark != null && Number.isFinite(Number(row.provisionalMark)));
  const issues = [];
  if (scoredRows.some((row) => cleanText(row?.rationale, 1400).length < 35)) issues.push("criterion_rationale_missing");
  else if (scoredRows.some((row) => looksGenericDraftText(row?.rationale || ""))) issues.push("criterion_rationale_generic");
  const feedbackSections = [
    draft?.feedback?.whereYouAreNow,
    draft?.feedback?.whereYouShouldBe,
    draft?.feedback?.relationToOutcomes,
    draft?.feedback?.whatToDoNext,
  ].map((value) => cleanText(value, 2400)).filter(Boolean);
  if (!feedbackSections.length || feedbackSections.filter((value) => value.length < 30 || looksGenericDraftText(value)).length >= 2) {
    issues.push("feedback_generic");
  }
  const overallMark = draft?.overallMark == null || Number.isNaN(Number(draft.overallMark))
    ? deriveOverallMarkFromDraftCriteria(criterionRows)
    : Number(draft.overallMark);
  const derivedMark = deriveOverallMarkFromDraftCriteria(criterionRows);
  if (Number.isFinite(Number(overallMark)) && Number.isFinite(Number(derivedMark)) && Math.abs(Number(overallMark) - Number(derivedMark)) > 8) {
    issues.push("overall_mark_unsupported");
  }
  if (Number.isFinite(Number(overallMark)) && Number(overallMark) < 50 && !draftHasSpecificFailJustification(draft)) {
    issues.push("fail_justification_missing");
  }
  if (cleanText(draft?.evidenceBasis, 1200).length < 24) {
    issues.push("evidence_basis_missing");
  }
  return Array.from(new Set(issues));
}

function buildQualityFallbackDraft(draft = {}, cfg = null, issues = []) {
  const issueLabels = issues.map((code) => draftQualityIssueLabel(code));
  const criterionRows = (Array.isArray(draft?.criterionRows) ? draft.criterionRows : [])
    .map((row) => ({
      criterion: cleanText(row?.criterion, 240),
      provisionalMark: null,
      maxMark: row?.maxMark == null || Number.isNaN(Number(row.maxMark)) ? 0 : Number(row.maxMark),
      rationale: `Automatic draft withheld. ${issueLabels.length ? `Reason: ${issueLabels.join("; ")}.` : "Reason: the draft quality checks failed."} Review the source document and mark manually.`,
    }))
    .filter((row) => row.criterion);
  if (!criterionRows.length) {
    (Array.isArray(cfg?.rubric) ? cfg.rubric : []).forEach((row) => {
      const criterion = cleanText(row?.criterion, 240);
      if (!criterion) return;
      criterionRows.push({
        criterion,
        provisionalMark: null,
        maxMark: Math.max(0, ...((Array.isArray(row?.levels) ? row.levels : []).map((level) => parseMarkValue(level?.mark)))),
        rationale: "Automatic draft withheld. Review the source document and mark manually.",
      });
    });
  }
  const warning = `Automatic draft withheld because ${issueLabels.length ? issueLabels.join(", ").toLowerCase() : "the draft quality checks failed"}. Manual review is required before any mark is accepted.`;
  return {
    overallMark: null,
    confidenceNote: cleanText(warning, 1200),
    evidenceBasis: cleanText(`${draft?.evidenceBasis || "The initial AI draft did not provide a defensible mark."} ${warning}`, 1200),
    criterionRows,
    feedback: {
      whereYouAreNow: cleanText(warning, 2400),
      whereYouShouldBe: cleanText("Open the student submission and rebuild the mark with criterion-specific evidence before sending it forward.", 2400),
      relationToOutcomes: cleanText(`Do not rely on the withheld AI score. Re-apply ${(Array.isArray(cfg?.rubric) ? cfg.rubric : []).map((row) => cleanText(row?.criterion, 120)).filter(Boolean).join(", ") || "the rubric"} directly to the submission evidence.`, 2400),
      whatToDoNext: cleanText("Review the original document, correct the weak or unsupported rationale, and enter a defended mark manually.", 2400),
    },
    actionItems: [
      "Open the original submission and verify the evidence against the rubric.",
      "Replace weak or generic criterion rationales with file-specific reasoning.",
      "Do not forward the script until the mark and feedback are fully defended.",
    ],
    integrity: {
      ...(draft?.integrity || {}),
      advisory: true,
    },
    qualityChecks: {
      passed: false,
      mode: "manual_review_required",
      issues,
      issueLabels,
    },
  };
}

function finalizeAiDraftQuality(draft = {}, cfg = null) {
  if (draft?.qualityChecks?.mode === "manual_review_required") {
    return {
      ...draft,
      qualityChecks: {
        passed: false,
        mode: "manual_review_required",
        issues: Array.isArray(draft?.qualityChecks?.issues) ? draft.qualityChecks.issues : [],
        issueLabels: Array.isArray(draft?.qualityChecks?.issueLabels) ? draft.qualityChecks.issueLabels : [],
      },
    };
  }
  const issues = draftQualityIssues(draft);
  if (issues.length) return buildQualityFallbackDraft(draft, cfg, issues);
  return {
    ...draft,
    qualityChecks: {
      passed: true,
      mode: "validated",
      issues: [],
      issueLabels: [],
    },
  };
}

function adaptEltAssessmentToAiDraft(eltAssessment = {}, cfg = null) {
  const criteria = Array.isArray(eltAssessment?.criteria_breakdown) ? eltAssessment.criteria_breakdown : [];
  const holistic = eltAssessment?.holistic_feedback || {};
  const summary = eltAssessment?.grading_summary || {};
  const courseObjectives = getEltCourseObjectives(cfg);
  const evidenceState = detectEltInsufficientEvidence(eltAssessment);
  const criterionRows = criteria.map((row) => ({
    criterion: cleanText(row?.criterion_name, 240),
    provisionalMark: evidenceState.insufficient ? null : safeNumber(row?.score, 0),
    maxMark: safeNumber(row?.max_score, 0),
    rationale: cleanText(row?.justification, 1400),
  })).filter((row) => row.criterion);
  const totalPossible = safeNumber(summary.total_points_possible, criterionRows.reduce((acc, row) => acc + (row.maxMark || 0), 0));
  const totalEarned = evidenceState.insufficient
    ? null
    : safeNumber(summary.total_points_earned, criterionRows.reduce((acc, row) => acc + (row.provisionalMark || 0), 0));
  const overallPercentage = evidenceState.insufficient
    ? null
    : (summary?.overall_percentage == null
      ? (totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null)
      : safeNumber(summary.overall_percentage, null));
  const weakestCriteria = weakestEltCriteria(criteria, 2);
  const strongestCriteria = strongestEltCriteria(criteria, 2);
  const failingOverall = overallPercentage != null && overallPercentage < 50;

  if (evidenceState.insufficient) {
    const warning = cleanText(
      evidenceState.warning || "No readable student text was available for evaluation. Manual review is required.",
      1200
    );
    return {
      overallMark: null,
      confidenceNote: warning,
      evidenceBasis: cleanText("The ELT review detected insufficient readable submission text. Do not treat this as a zero; inspect the source document and extraction diagnostics manually.", 1200),
      criterionRows,
      feedback: {
        whereYouAreNow: warning,
        whereYouShouldBe: cleanText("Readable submission text is required before criterion-level grading can be defended.", 2400),
        relationToOutcomes: cleanText(courseObjectives.join(" | ") || "Course outcomes still need to be applied manually once readable text is available.", 2400),
        whatToDoNext: cleanText("Open the submission in the in-app viewer, run extraction diagnostics, and complete the review manually rather than accepting an AI score.", 2400),
      },
      actionItems: [
        "Open the submission in the in-app viewer and inspect the original file manually.",
        "Run the extraction check and confirm whether the document can be read reliably.",
        "Do not accept or release an AI score until readable evidence is available.",
      ],
      integrity: {
        advisory: true,
        suspicionScore: 0,
        confidenceBand: "low",
        reasons: [],
        requiredHumanFollowUp: "",
        recommendedStaffAction: "",
      },
      qualityChecks: {
        passed: false,
        mode: "manual_review_required",
        issues: ["evidence_basis_missing"],
        issueLabels: ["Readable evidence is insufficient for an automatic mark"],
      },
    };
  }

  const failExplanation = failingOverall
    ? cleanText(
      `The preliminary mark is below the 50% pass threshold because ${
        weakestCriteria.length
          ? weakestCriteria.map((row) => criterionFailSummary(row)).join(" ")
          : "the current evidence does not yet meet pass standard across the rubric."
      }`,
      1200
    )
    : "";
  const nextStepText = failingOverall
    ? cleanText(
      weakestCriteria.length
        ? weakestCriteria.map((row) => `To reach a pass, strengthen ${criterionImproveSummary(row)}`).join(" ")
        : "To reach a pass, strengthen the weakest criteria with clearer evidence and closer alignment to the task requirements.",
      2400
    )
    : cleanText((Array.isArray(eltAssessment?.annotations) ? eltAssessment.annotations : [])
      .map((item) => item?.suggested_revision)
      .filter(Boolean)
      .slice(0, 4)
      .join(" "), 2400);

  return {
    overallMark: overallPercentage,
    confidenceNote: failingOverall
      ? failExplanation
      : cleanText("ELT Assessment Specialist review generated from structured submission text.", 1200),
    evidenceBasis: cleanText("Vertex ELT review based on normalized submission text and rubric criteria.", 1200),
    criterionRows,
    feedback: {
      whereYouAreNow: failingOverall
        ? cleanText(`${failExplanation}${strongestCriteria.length ? ` The strongest evidence remains in ${strongestCriteria.map((row) => cleanText(row?.criterion_name, 120)).join(", ")}, but it does not yet offset the weaker criteria.` : ""}`, 2400)
        : cleanText(holistic?.strengths_summary, 2400),
      whereYouShouldBe: failingOverall
        ? nextStepText
        : cleanText(holistic?.areas_for_improvement, 2400),
      relationToOutcomes: failingOverall
        ? cleanText(`Because the script is currently below 50%, the evidence does not yet show secure achievement of ${courseObjectives.join(" | ") || "the course outcomes"}. The weakest alignment sits in ${weakestCriteria.map((row) => cleanText(row?.criterion_name, 120)).join(", ") || "the weakest criteria noted above"}.`, 2400)
        : cleanText(holistic?.alignment_with_course_goals || courseObjectives.join(" | "), 2400),
      whatToDoNext: nextStepText,
    },
    actionItems: (Array.isArray(eltAssessment?.annotations) ? eltAssessment.annotations : [])
      .map((item) => cleanText(item?.suggested_revision, 280))
      .filter(Boolean)
      .slice(0, 5)
      .concat(failingOverall && weakestCriteria.length
        ? weakestCriteria.map((row) => cleanText(`Improve ${row?.criterion_name} first because it is currently keeping the submission below the 50% pass threshold.`, 280))
        : [])
      .filter(Boolean)
      .slice(0, 5),
    integrity: {
      advisory: true,
      suspicionScore: 0,
      confidenceBand: "low",
      reasons: [],
      requiredHumanFollowUp: "",
      recommendedStaffAction: "",
    },
  };
}

function buildEvidenceLimitedAiDraft(cfg = null, extractionBundle = {}) {
  const warning = cleanText(
    `${describeExtractionBundle(extractionBundle)} Manual review is required before any mark is approved.`,
    1200
  ) || "Automatic extraction did not recover enough readable evidence for a defensible automated grade. Manual review is required.";
  const criterionRows = (Array.isArray(cfg?.rubric) ? cfg.rubric : []).map((row) => ({
    criterion: cleanText(row?.criterion, 240),
    provisionalMark: null,
    maxMark: Math.max(0, ...((Array.isArray(row?.levels) ? row.levels : []).map((level) => parseMarkValue(level?.mark)))),
    rationale: warning,
  })).filter((row) => row.criterion);
  return {
    overallMark: null,
    confidenceNote: warning,
    evidenceBasis: cleanText(`${describeExtractionBundle(extractionBundle)} The draft has been left unscored because the readable evidence is insufficient for a defensible automated mark.`, 1200),
    criterionRows,
    feedback: {
      whereYouAreNow: warning,
      whereYouShouldBe: "Readable submission evidence is required before criterion-level grading can be defended.",
      relationToOutcomes: "Open the original document in the in-app viewer and apply the rubric manually if the extraction remains incomplete.",
      whatToDoNext: "Inspect the source file, run the extraction diagnostics, and complete the mark manually rather than accepting an ungrounded AI score.",
    },
    actionItems: [
      "Open the original submission in the in-app viewer.",
      "Run the extraction diagnostics and verify whether readable text can be recovered.",
      "Complete or amend the review manually before the submission is sent forward.",
    ],
    integrity: {
      advisory: true,
      suspicionScore: 0,
      confidenceBand: "low",
      reasons: [],
      requiredHumanFollowUp: "",
      recommendedStaffAction: "",
    },
    qualityChecks: {
      passed: false,
      mode: "manual_review_required",
      issues: ["evidence_basis_missing"],
      issueLabels: ["Readable evidence is insufficient for an automatic mark"],
    },
  };
}

function buildEltAssessmentMeta({
  generatedAt = new Date().toISOString(),
  sourceTextLength = 0,
  truncated = false,
  model = "vertex-auto",
} = {}) {
  return {
    generatedAt: cleanText(generatedAt, 80),
    generatedByUid: "system:auto-grader",
    generatedByName: "System Auto-Marker",
    model: cleanText(model, 80),
    provider: "vertex-ai",
    schemaVersion: "elt-assessment-v1",
    sourceTextLength: safeNumber(sourceTextLength, 0),
    truncated: Boolean(truncated),
  };
}

function buildEltPrompt(context = {}) {
  return [
    "Evaluate the student text against the provided course objectives and rubric.",
    "Return ONLY valid JSON with this exact structure and these exact keys:",
    JSON.stringify({
      assessment_metadata: {
        student_id: "string",
        assignment_id: "string",
        timestamp: "string",
      },
      grading_summary: {
        overall_percentage: 0,
        total_points_earned: 0,
        total_points_possible: 0,
        letter_grade: "string",
      },
      criteria_breakdown: [
        {
          criterion_name: "string",
          score: 0,
          max_score: 0,
          justification: "string",
        },
      ],
      annotations: [
        {
          exact_quote: "string",
          feedback_type: "strength | growth | correction",
          comment: "string",
          related_objective: "string",
          suggested_revision: "string",
        },
      ],
      holistic_feedback: {
        strengths_summary: "string",
        areas_for_improvement: "string",
        alignment_with_course_goals: "string",
      },
    }, null, 2),
    "Rules:",
    "- Use exact quotes from the student text only.",
    "- Every annotation must link to a related course objective.",
    "- Justifications must be evidence-based and criterion-specific.",
    "- Each criterion justification must be exactly two concise sentences and must explain why that criterion earned this mark rather than a higher or lower band.",
    "- Holistic feedback must be specific to this student's submission and must not use generic stock phrasing that could apply to every script.",
    "- Each holistic feedback field must be one or two concise sentences and must mention the relevant criterion names or quoted evidence.",
    "- When readable student prose is available, provide exactly 3 annotations grounded in that text.",
    "- Keep every string value under 420 characters.",
    "- If overall_percentage is below 50, explain explicitly why the submission is below the 50% pass threshold and identify the weakest criteria preventing a pass.",
    "- Even for a failing submission, strengths_summary must still identify the strongest criterion or strongest available evidence in this script.",
    "- If the provided student text is limited to metadata, submission notes, or staff excerpts and does not contain readable student prose, return annotations as an empty array.",
    "- In low-evidence cases, make the criteria justifications and holistic feedback explicitly conservative about the evidence limits.",
    "- Do not include markdown, commentary, or extra keys.",
    `Student ID: ${context.studentId}`,
    `Assignment ID: ${context.assignmentId}`,
    `Timestamp: ${context.timestamp}`,
    `Course Objectives: ${context.courseObjectives.join(" | ")}`,
    `Rubric: ${context.rubric.map((row) => `${row.criterion_name} (max ${row.max_score})${row.descriptor ? ` - ${row.descriptor}` : ""}`).join("\n")}`,
    `Student Text:\n${context.studentText}`,
  ].join("\n\n");
}

function buildEltCompactPrompt(context = {}, parseError = "") {
  return [
    "Evaluate the student submission and return compact valid JSON only.",
    "Use exactly this JSON shape:",
    JSON.stringify({
      assessment_metadata: {
        student_id: "string",
        assignment_id: "string",
        timestamp: "string",
      },
      grading_summary: {
        overall_percentage: 0,
        total_points_earned: 0,
        total_points_possible: 0,
        letter_grade: "string",
      },
      criteria_breakdown: [
        {
          criterion_name: "string",
          score: 0,
          max_score: 0,
          justification: "string",
        },
      ],
      annotations: [
        {
          exact_quote: "string",
          feedback_type: "strength | growth | correction",
          comment: "string",
          related_objective: "string",
          suggested_revision: "string",
        },
      ],
      holistic_feedback: {
        strengths_summary: "string",
        areas_for_improvement: "string",
        alignment_with_course_goals: "string",
      },
    }),
    "Rules:",
    "- Valid JSON only. No markdown.",
    "- Return one criteria_breakdown row for every rubric criterion, in the same order.",
    "- Keep every string under 300 characters.",
    "- Each criterion justification must be one specific sentence naming evidence from the submission.",
    "- Return exactly 3 annotations when readable prose exists; otherwise return an empty annotations array.",
    "- Holistic feedback fields must each be one concise sentence.",
    "- If below 50, mention below-pass reasons in the weakest criterion justification and areas_for_improvement.",
    parseError ? `Previous JSON parse error to avoid: ${cleanText(parseError, 240)}` : "",
    `Student ID: ${context.studentId}`,
    `Assignment ID: ${context.assignmentId}`,
    `Timestamp: ${context.timestamp}`,
    `Course Objectives: ${context.courseObjectives.join(" | ")}`,
    `Rubric: ${context.rubric.map((row) => `${row.criterion_name} (max ${row.max_score})${row.descriptor ? ` - ${row.descriptor}` : ""}`).join("\n")}`,
    `Student Text:\n${context.studentText}`,
  ].filter(Boolean).join("\n\n");
}

function buildEltRepairPrompt(context = {}, priorReview = {}, issues = []) {
  const issueLabels = (Array.isArray(issues) ? issues : [])
    .map((code) => draftQualityIssueLabel(code))
    .filter(Boolean);
  return [
    "You previously produced an ELT grading JSON draft that failed quality checks.",
    "Rewrite the response so it keeps the same JSON schema but fixes the weak sections.",
    "Return ONLY valid JSON with the same top-level keys as before.",
    "Fixes required:",
    `- Resolve these quality issues: ${issueLabels.join("; ") || "quality issues detected"}.`,
    "- Make every criterion justification criterion-specific, evidence-based, and exactly two concise sentences.",
    "- Make every holistic feedback field specific to this submission, one or two concise sentences long, and tied to named criteria or quoted evidence.",
    "- Keep every string value under 420 characters.",
    "- If the mark is below 50, explicitly explain why the submission remains below the pass threshold and name the weakest criteria preventing a pass.",
    "- Keep annotations grounded in exact quotes from the student text.",
    "Student ID / Assignment / Rubric / Text:",
    buildEltPrompt(context),
    "Previous JSON draft:",
    JSON.stringify(priorReview, null, 2),
  ].join("\n\n");
}

async function generateEltReviewFromContext(context = {}) {
  const prompt = buildEltPrompt(context);
  const result = await generateEltVertexContent(prompt);
  if (!result?.rawText) {
    throw new HttpsError("data-loss", "Vertex AI returned an empty ELT review.");
  }
  try {
    return {
      modelName: result.modelName,
      review: normalizeEltResponse(parseJsonText(result.rawText), context),
    };
  } catch (err) {
    const compactPrompt = buildEltCompactPrompt(context, err?.message || String(err));
    const compactResult = await generateEltVertexContent(compactPrompt, { maxOutputTokens: 8192 });
    if (!compactResult?.rawText) {
      throw new HttpsError("data-loss", "Vertex AI returned an empty compact ELT review.");
    }
    return {
      modelName: compactResult.modelName || result.modelName,
      review: normalizeEltResponse(parseJsonText(compactResult.rawText), context),
    };
  }
}

async function generateEltReviewRepairFromContext(context = {}, priorReview = {}, issues = []) {
  const prompt = buildEltRepairPrompt(context, priorReview, issues);
  const result = await generateEltVertexContent(prompt);
  if (!result?.rawText) {
    throw new HttpsError("data-loss", "Vertex AI returned an empty ELT repair review.");
  }
  return {
    modelName: result.modelName,
    review: normalizeEltResponse(parseJsonText(result.rawText), context),
  };
}

function buildSubmissionSignature(submission = {}) {
  return JSON.stringify({
    status: cleanText(submission?.status, 40),
    note: cleanText(submission?.note, 1000),
    files: (Array.isArray(submission?.files) ? submission.files : []).map((file) => ({
      name: cleanText(file?.name, 240),
      size: safeNumber(file?.size, 0),
      url: cleanText(file?.url, 1200),
      storagePath: cleanText(file?.storagePath, 1200),
    })),
    extractionCache: (() => {
      const cache = normalizeCachedExtractionBundle(submission?.extractionCache || {});
      return {
        results: cache.results.map((item) => ({
          name: item.name,
          status: item.status,
          source: item.source,
          textLength: item.text.length,
          note: item.note,
        })),
        unsupported: cache.unsupported.map((item) => ({
          name: item.name,
          status: item.status,
          note: item.note,
        })),
      };
    })(),
  });
}

function isoMs(value = "") {
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function autoGradeQueuePath(assessmentId = "") {
  return `grading-auto-queue/${assessmentId}`;
}

function autoGradeRunId(prefix = "run") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isCompletedGradingStatus(status = "") {
  return ["finalised", "moderated", "posted"].includes(cleanText(status, 40).toLowerCase());
}

function shouldRetryHeldAutoDraft(record = {}) {
  const aiDraft = record?.aiDraft && typeof record.aiDraft === "object" ? record.aiDraft : null;
  if (!aiDraft || aiDraft?.qualityChecks?.passed !== false) return false;
  const generatedByUid = cleanText(aiDraft?.generatedByUid || record?.aiGeneratedByUid, 160);
  const generatedByName = cleanText(aiDraft?.generatedByName || record?.aiGeneratedByName, 160);
  const generatedBySystem = generatedByUid === "system:auto-grader" || generatedByName === "System Auto-Marker";
  if (!generatedBySystem) return false;
  const pipelineVersion = cleanText(
    record?.autoGradePipelineVersion
    || record?.eltAssessmentMeta?.pipelineVersion
    || aiDraft?.pipelineVersion,
    120
  );
  return pipelineVersion !== AUTO_GRADE_PIPELINE_VERSION;
}

function submissionNeedsAutoGrade(submission = {}, record = {}, options = {}) {
  if (!submission?.submittedAt || cleanText(submission?.status, 40).toLowerCase() !== "submitted") return false;
  if (isCompletedGradingStatus(record?.status)) return false;

  const cycleId = cleanText(options?.cycleId, 160);
  if (cycleId && cleanText(record?.autoGradeQueueCycleId, 160) === cycleId) return false;

  const sourceSignature = buildSubmissionSignature(submission);
  const existingSynthIdStatus = cleanText(
    record?.integrity?.synthId?.status || record?.aiDraft?.integrity?.synthId?.status,
    40
  ).toLowerCase();
  const synthIdReady = !synthIdConfigured() || Boolean(existingSynthIdStatus && !["unavailable", "error"].includes(existingSynthIdStatus));
  if (options?.forceRefresh === true) return true;
  if (shouldRetryHeldAutoDraft(record)) return true;
  return !(record?.aiDraft && record?.aiSourceSignature === sourceSignature && synthIdReady);
}

async function recordAutoGradeAttemptFailure(assessmentId, studentUid, submissionId, cycleId = "", err = null) {
  const now = new Date().toISOString();
  await adminDatabase().ref(`grading-records/${assessmentId}/${studentUid}/${submissionId}`).update({
    autoGradeQueueCycleId: cleanText(cycleId, 160),
    autoGradeLastAttemptAt: now,
    autoGradeLastError: cleanText(err?.message || err, 1200),
    autoGradeLastErrorAt: now,
    updatedAt: now,
  });
}

async function listLatestAutoGradeCandidates(assessmentId, options = {}) {
  const [submissionsSnap, gradingSnap] = await Promise.all([
    adminDatabase().ref(`submissions/${assessmentId}`).once("value"),
    adminDatabase().ref(`grading-records/${assessmentId}`).once("value"),
  ]);
  const byStudent = submissionsSnap.exists() ? submissionsSnap.val() || {} : {};
  const gradingByStudent = gradingSnap.exists() ? gradingSnap.val() || {} : {};
  const candidates = [];

  Object.entries(byStudent).forEach(([studentUid, rawBySubmission]) => {
    let latest = null;
    Object.entries(rawBySubmission || {}).forEach(([rawSubmissionId, submission]) => {
      if (!submission || typeof submission !== "object") return;
      if (cleanText(submission?.status, 40).toLowerCase() === "cleared") return;
      const submissionId = cleanText(submission?.id || rawSubmissionId, 160);
      const submittedAtMs = isoMs(submission?.submittedAt || submission?.updatedAt);
      if (!submissionId || !submittedAtMs) return;
      if (!latest || submittedAtMs > latest.submittedAtMs) {
        latest = { submissionId, submission, submittedAtMs };
      }
    });
    if (!latest) return;

    const record = gradingByStudent?.[studentUid]?.[latest.submissionId] || {};
    if (!submissionNeedsAutoGrade(latest.submission, record, options)) return;

    candidates.push({
      studentUid,
      submissionId: latest.submissionId,
      submission: latest.submission,
      submittedAtMs: latest.submittedAtMs,
    });
  });

  return candidates.sort((a, b) => a.submittedAtMs - b.submittedAtMs);
}

async function enqueueAssessmentAutoGrade(assessmentId, options = {}) {
  if (!assessmentId) return null;
  const queueRef = adminDatabase().ref(autoGradeQueuePath(assessmentId));
  const now = new Date().toISOString();
  const requestedByUid = cleanText(options?.requestedByUid, 160);
  const requestedByName = cleanText(options?.requestedByName, 160);
  const requestedReason = cleanText(options?.requestedReason || options?.reason, 80) || "submission_write";
  const requestedSubmissionId = cleanText(options?.submissionId, 160);
  const forceNewCycle = options?.forceNewCycle === true;

  const result = await queueRef.transaction((current) => {
    const base = current && typeof current === "object" ? current : {};
    const activeRunId = cleanText(base.activeRunId, 160);
    const lockedAtMs = isoMs(base.lockedAt);
    const staleRunning = activeRunId && lockedAtMs && (Date.now() - lockedAtMs) >= AUTO_GRADE_QUEUE_LOCK_STALE_MS;
    const restartCycle = forceNewCycle || cleanText(base.state, 40).toLowerCase() === "error" || staleRunning;
    return {
      ...base,
      assessmentId,
      state: "queued",
      requestedAt: now,
      requestedByUid: requestedByUid || cleanText(base.requestedByUid, 160),
      requestedByName: requestedByName || cleanText(base.requestedByName, 160),
      requestedReason,
      requestedSubmissionId: requestedSubmissionId || cleanText(base.requestedSubmissionId, 160),
      forceRefresh: Boolean(base.forceRefresh || options?.forceRefresh),
      activeRunId: restartCycle ? "" : cleanText(base.activeRunId, 160),
      lockedAt: restartCycle ? "" : cleanText(base.lockedAt, 80),
      cycleId: restartCycle ? "" : cleanText(base.cycleId, 160),
      wakeCounter: safeNumber(base.wakeCounter, 0) + 1,
      updatedAt: now,
      lastEnqueuedAt: now,
    };
  }, undefined, false);

  return result?.snapshot?.exists() ? (result.snapshot.val() || {}) : null;
}

async function acquireAssessmentAutoGradeLock(assessmentId) {
  const queueRef = adminDatabase().ref(autoGradeQueuePath(assessmentId));
  const runId = autoGradeRunId("autograde");
  const nowIso = new Date().toISOString();
  const nowMs = Date.now();
  const result = await queueRef.transaction((current) => {
    const base = current && typeof current === "object" ? current : {};
    const activeRunId = cleanText(base.activeRunId, 160);
    const lockedAtMs = isoMs(base.lockedAt);
    const lockFresh = activeRunId && lockedAtMs && (nowMs - lockedAtMs) < AUTO_GRADE_QUEUE_LOCK_STALE_MS;
    if (lockFresh) return;

    const cycleId = cleanText(base.cycleId, 160) || autoGradeRunId("cycle");
    const continuing = cleanText(base.cycleId, 160) === cycleId;
    return {
      ...base,
      assessmentId,
      state: "running",
      activeRunId: runId,
      lockedAt: nowIso,
      cycleId,
      lastStartedAt: nowIso,
      updatedAt: nowIso,
      processedInCurrentCycle: continuing ? safeNumber(base.processedInCurrentCycle, 0) : 0,
      successInCurrentCycle: continuing ? safeNumber(base.successInCurrentCycle, 0) : 0,
      failedInCurrentCycle: continuing ? safeNumber(base.failedInCurrentCycle, 0) : 0,
      lastError: continuing ? cleanText(base.lastError, 1200) : "",
    };
  }, undefined, false);

  if (!result?.committed || !result?.snapshot?.exists()) return null;
  const queue = result.snapshot.val() || {};
  if (cleanText(queue.activeRunId, 160) !== runId) return null;
  return { queueRef, runId, queue };
}

async function processAssessmentAutoGradeQueue(assessmentId = "") {
  if (!assessmentId) return { ok: false, error: "assessmentId is required." };

  const lock = await acquireAssessmentAutoGradeLock(assessmentId);
  if (!lock) return { ok: true, skipped: true };

  const { queueRef, runId, queue } = lock;
  const cycleId = cleanText(queue.cycleId, 160) || autoGradeRunId("cycle");
  const forceRefresh = queue.forceRefresh === true;
  let processed = safeNumber(queue.processedInCurrentCycle, 0);
  let success = safeNumber(queue.successInCurrentCycle, 0);
  let failed = safeNumber(queue.failedInCurrentCycle, 0);
  let pendingCount = 0;
  let repairedLegacyStatuses = 0;
  const startedMs = Date.now();

  try {
    repairedLegacyStatuses = await repairLegacyAiFailedStatuses(assessmentId);
    const candidates = await listLatestAutoGradeCandidates(assessmentId, { forceRefresh, cycleId });
    pendingCount = candidates.length;

    for (const candidate of candidates) {
      if ((processed - safeNumber(queue.processedInCurrentCycle, 0)) >= AUTO_GRADE_QUEUE_BATCH_SIZE) break;
      if ((Date.now() - startedMs) >= AUTO_GRADE_QUEUE_RUN_BUDGET_MS) break;

      try {
        const didUpdate = await autoGradeSubmission(
          assessmentId,
          candidate.studentUid,
          candidate.submissionId,
          candidate.submission,
          { forceRefresh, queueCycleId: cycleId }
        );
        if (didUpdate !== false) success += 1;
      } catch (err) {
        failed += 1;
        await recordAutoGradeAttemptFailure(
          assessmentId,
          candidate.studentUid,
          candidate.submissionId,
          cycleId,
          err
        );
      }

      processed += 1;
      pendingCount = Math.max(0, pendingCount - 1);

      await queueRef.update({
        state: "running",
        activeRunId: runId,
        lockedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        cycleId,
        processedInCurrentCycle: processed,
        successInCurrentCycle: success,
        failedInCurrentCycle: failed,
        pendingCount,
        lastProcessedSubmissionId: candidate.submissionId,
        lastProcessedStudentUid: candidate.studentUid,
      });
    }

    const remainingCandidates = await listLatestAutoGradeCandidates(assessmentId, { forceRefresh, cycleId });
    pendingCount = remainingCandidates.length;
    const finishedAt = new Date().toISOString();

    if (pendingCount > 0) {
      const currentSnap = await queueRef.once("value");
      const current = currentSnap.exists() ? (currentSnap.val() || {}) : {};
      await queueRef.update({
        state: "queued",
        activeRunId: "",
        lockedAt: "",
        updatedAt: finishedAt,
        cycleId,
        processedInCurrentCycle: processed,
        successInCurrentCycle: success,
        failedInCurrentCycle: failed,
        pendingCount,
        wakeCounter: safeNumber(current?.wakeCounter, 0) + 1,
        lastSummary: `Background AI marking updated ${success} submission(s), repaired ${repairedLegacyStatuses} legacy status record(s), and has ${pendingCount} remaining.`,
        lastFinishedAt: finishedAt,
      });
      return { ok: true, state: "queued", processed, success, failed, pendingCount, repairedLegacyStatuses };
    }

    await queueRef.update({
      state: "idle",
      activeRunId: "",
      lockedAt: "",
      updatedAt: finishedAt,
      cycleId: "",
      forceRefresh: false,
      processedInCurrentCycle: processed,
      successInCurrentCycle: success,
      failedInCurrentCycle: failed,
      pendingCount: 0,
      lastSummary: failed
        ? `Background AI marking finished. ${success} updated, ${failed} need retry, ${repairedLegacyStatuses} legacy status record(s) repaired.`
        : `Background AI marking finished. ${success} latest submission(s) updated and ${repairedLegacyStatuses} legacy status record(s) repaired.`,
      lastFinishedAt: finishedAt,
      lastCompletedAt: finishedAt,
    });
    return { ok: true, state: "idle", processed, success, failed, pendingCount: 0, repairedLegacyStatuses };
  } catch (err) {
    const failedAt = new Date().toISOString();
    await queueRef.update({
      state: "error",
      activeRunId: "",
      lockedAt: "",
      updatedAt: failedAt,
      processedInCurrentCycle: processed,
      successInCurrentCycle: success,
      failedInCurrentCycle: failed,
      pendingCount,
      lastError: cleanText(err?.message || err, 1200),
      lastSummary: "Background AI marking paused after a backend error.",
      lastFinishedAt: failedAt,
    });
    throw err;
  }
}

function isFreshRunningQueue(queue = {}) {
  const activeRunId = cleanText(queue?.activeRunId, 160);
  const lockedAtMs = isoMs(queue?.lockedAt);
  return Boolean(activeRunId && lockedAtMs && (Date.now() - lockedAtMs) < AUTO_GRADE_QUEUE_LOCK_STALE_MS);
}

async function listAssessmentIdsForAutoGradeSweep() {
  const [submissionsSnap, queueSnap] = await Promise.all([
    adminDatabase().ref("submissions").once("value"),
    adminDatabase().ref("grading-auto-queue").once("value"),
  ]);
  const ids = new Set();
  if (submissionsSnap.exists()) {
    Object.keys(submissionsSnap.val() || {}).forEach((assessmentId) => {
      const cleanId = cleanText(assessmentId, 120);
      if (cleanId) ids.add(cleanId);
    });
  }
  if (queueSnap.exists()) {
    Object.keys(queueSnap.val() || {}).forEach((assessmentId) => {
      const cleanId = cleanText(assessmentId, 120);
      if (cleanId) ids.add(cleanId);
    });
  }
  return Array.from(ids);
}

async function repairLegacyAiFailedStatuses(assessmentId = "") {
  if (!assessmentId) return 0;
  const [submissionsSnap, gradingSnap] = await Promise.all([
    adminDatabase().ref(`submissions/${assessmentId}`).once("value"),
    adminDatabase().ref(`grading-records/${assessmentId}`).once("value"),
  ]);
  if (!submissionsSnap.exists() || !gradingSnap.exists()) return 0;

  const byStudent = submissionsSnap.val() || {};
  const gradingByStudent = gradingSnap.val() || {};
  const updates = [];
  const now = new Date().toISOString();

  Object.entries(byStudent).forEach(([studentUid, rawBySubmission]) => {
    let latest = null;
    Object.entries(rawBySubmission || {}).forEach(([rawSubmissionId, submission]) => {
      if (!submission || typeof submission !== "object") return;
      if (cleanText(submission?.status, 40).toLowerCase() === "cleared") return;
      const submissionId = cleanText(submission?.id || rawSubmissionId, 160);
      const submittedAtMs = isoMs(submission?.submittedAt || submission?.updatedAt);
      if (!submissionId || !submittedAtMs) return;
      if (!latest || submittedAtMs > latest.submittedAtMs) {
        latest = { submissionId, submittedAtMs };
      }
    });
    if (!latest) return;

    const record = gradingByStudent?.[studentUid]?.[latest.submissionId] || {};
    if (cleanText(record?.status, 40).toLowerCase() !== "ai_failed") return;
    if (!record?.aiDraft || typeof record.aiDraft !== "object") return;

    updates.push(
      adminDatabase().ref(`grading-records/${assessmentId}/${studentUid}/${latest.submissionId}`).update({
        status: "ai_ready",
        autoGradeLastError: null,
        autoGradeLastErrorAt: null,
        updatedAt: now,
      })
    );
  });

  if (!updates.length) return 0;
  await Promise.all(updates);
  return updates.length;
}

async function resumeAssessmentAutoGradeSweep() {
  const assessmentIds = await listAssessmentIdsForAutoGradeSweep();
  const summary = {
    scanned: assessmentIds.length,
    resumed: 0,
    repairedLegacyStatuses: 0,
    running: 0,
    idle: 0,
    failed: 0,
  };

  for (const assessmentId of assessmentIds) {
    try {
      summary.repairedLegacyStatuses += await repairLegacyAiFailedStatuses(assessmentId);
      const queueSnap = await adminDatabase().ref(autoGradeQueuePath(assessmentId)).once("value");
      const queue = queueSnap.exists() ? (queueSnap.val() || {}) : {};
      const queueState = cleanText(queue?.state, 40).toLowerCase();
      if (queueState === "running" && isFreshRunningQueue(queue)) {
        summary.running += 1;
        continue;
      }

      const pending = await listLatestAutoGradeCandidates(assessmentId, {
        cycleId: autoGradeRunId("resume-preview"),
      });
      if (!pending.length) {
        summary.idle += 1;
        continue;
      }

      const needsRecoveryCycle = queueState === "error" || (queueState === "running" && !isFreshRunningQueue(queue));
      await enqueueAssessmentAutoGrade(assessmentId, {
        requestedReason: needsRecoveryCycle ? "scheduled_recovery" : "scheduled_resume",
        forceNewCycle: needsRecoveryCycle,
      });
      await processAssessmentAutoGradeQueue(assessmentId);
      summary.resumed += 1;
    } catch (err) {
      summary.failed += 1;
      console.error("[auto-grade-sweep] Failed to resume queue", {
        assessmentId,
        message: err?.message || String(err),
      });
    }
  }

  return summary;
}

async function saveAutoGeneratedDraft(assessmentId, studentUid, submissionId, payload = {}, existingRecord = {}, cfg = null) {
  const now = new Date().toISOString();
  const sourceDraft = payload?.aiDraft || {};
  let cleanDraft = {
    overallMark: sourceDraft?.overallMark == null || Number.isNaN(Number(sourceDraft.overallMark)) ? null : Number(sourceDraft.overallMark),
    confidenceNote: cleanText(sourceDraft?.confidenceNote, 1200),
    evidenceBasis: cleanText(sourceDraft?.evidenceBasis, 1200),
    criterionRows: (Array.isArray(sourceDraft?.criterionRows) ? sourceDraft.criterionRows : []).map((row) => ({
      criterion: cleanText(row?.criterion, 240),
      provisionalMark: row?.provisionalMark == null || Number.isNaN(Number(row.provisionalMark)) ? null : Number(row.provisionalMark),
      maxMark: row?.maxMark == null || Number.isNaN(Number(row.maxMark)) ? 0 : Number(row.maxMark),
      rationale: cleanText(row?.rationale, 1400),
    })).filter((row) => row.criterion),
    feedback: {
      whereYouAreNow: cleanText(sourceDraft?.feedback?.whereYouAreNow, 2400),
      whereYouShouldBe: cleanText(sourceDraft?.feedback?.whereYouShouldBe, 2400),
      relationToOutcomes: cleanText(sourceDraft?.feedback?.relationToOutcomes, 2400),
      whatToDoNext: cleanText(sourceDraft?.feedback?.whatToDoNext, 2400),
    },
    actionItems: (Array.isArray(sourceDraft?.actionItems) ? sourceDraft.actionItems : []).map((item) => cleanText(item, 280)).filter(Boolean).slice(0, 5),
    integrity: {
      advisory: Boolean(sourceDraft?.integrity?.advisory),
      suspicionScore: safeNumber(sourceDraft?.integrity?.suspicionScore, 0),
      confidenceBand: cleanText(sourceDraft?.integrity?.confidenceBand, 40) || "low",
      reasons: (Array.isArray(sourceDraft?.integrity?.reasons) ? sourceDraft.integrity.reasons : []).map((item) => cleanText(item, 240)).filter(Boolean),
      requiredHumanFollowUp: cleanText(sourceDraft?.integrity?.requiredHumanFollowUp, 1200),
      recommendedStaffAction: cleanText(sourceDraft?.integrity?.recommendedStaffAction, 1200),
      synthId: cleanSynthIdSignal(sourceDraft?.integrity?.synthId || payload?.integrity?.synthId || existingRecord?.integrity?.synthId || null),
    },
    qualityChecks: sourceDraft?.qualityChecks && typeof sourceDraft.qualityChecks === "object"
      ? {
        passed: sourceDraft.qualityChecks.passed !== false,
        mode: cleanText(sourceDraft?.qualityChecks?.mode, 80) || "validated",
        issues: (Array.isArray(sourceDraft?.qualityChecks?.issues) ? sourceDraft.qualityChecks.issues : []).map((item) => cleanText(item, 80)).filter(Boolean).slice(0, 8),
        issueLabels: (Array.isArray(sourceDraft?.qualityChecks?.issueLabels) ? sourceDraft.qualityChecks.issueLabels : []).map((item) => cleanText(item, 160)).filter(Boolean).slice(0, 8),
      }
      : null,
    pipelineVersion: AUTO_GRADE_PIPELINE_VERSION,
    generatedAt: now,
    generatedByUid: "system:auto-grader",
    generatedByName: "System Auto-Marker",
  };
  cleanDraft = finalizeAiDraftQuality(cleanDraft, cfg);
  const nextStatus = "ai_ready";

  await adminDatabase().ref(`grading-records/${assessmentId}/${studentUid}/${submissionId}`).update({
    assessmentId,
    studentUid,
    submissionId,
    tutorialGroup: cleanText(existingRecord?.tutorialGroup || payload?.tutorialGroup, 20),
    assignmentSource: cleanText(existingRecord?.assignmentSource || payload?.assignmentSource, 80),
    assignedMarkerUid: cleanText(existingRecord?.assignedMarkerUid || payload?.assignedMarkerUid, 120),
    assignedMarkerName: cleanText(existingRecord?.assignedMarkerName || payload?.assignedMarkerName, 160),
    assignedMarkerRole: cleanText(existingRecord?.assignedMarkerRole || payload?.assignedMarkerRole, 40),
    evidenceNotes: cleanText(payload?.evidenceNotes, 4000),
    eltAssessment: cloneJsonSafe(payload?.eltAssessment),
    eltAssessmentText: cleanText(payload?.eltAssessmentText, 24000),
    eltAssessmentMeta: payload?.eltAssessmentMeta
      ? {
        ...cloneJsonSafe(payload.eltAssessmentMeta),
        pipelineVersion: AUTO_GRADE_PIPELINE_VERSION,
      }
      : null,
    integrity: cloneJsonSafe(cleanDraft.integrity),
    aiDraft: cleanDraft,
    aiGeneratedAt: now,
    aiGeneratedByUid: "system:auto-grader",
    aiGeneratedByName: "System Auto-Marker",
    aiSourceSignature: cleanText(payload?.sourceSignature, 4000),
    autoGradePipelineVersion: AUTO_GRADE_PIPELINE_VERSION,
    autoGradeQueueCycleId: cleanText(payload?.queueCycleId, 160),
    autoGradeLastAttemptAt: now,
    autoGradeLastError: null,
    autoGradeLastErrorAt: null,
    status: nextStatus,
    updatedAt: now,
  });
}

async function autoGradeSubmission(assessmentId, studentUid, submissionId, submission = {}, options = {}) {
  if (!assessmentId || !studentUid || !submissionId) return;
  if (!submission?.submittedAt || cleanText(submission?.status, 40).toLowerCase() !== "submitted") return false;

  const gradingRef = adminDatabase().ref(`grading-records/${assessmentId}/${studentUid}/${submissionId}`);
  const gradingSnap = await gradingRef.once("value");
  const existingRecord = gradingSnap.exists() ? gradingSnap.val() || {} : {};
  const forceRefresh = options?.forceRefresh === true;
  const queueCycleId = cleanText(options?.queueCycleId, 160);
  if (!submissionNeedsAutoGrade(submission, existingRecord, { forceRefresh, cycleId: queueCycleId })) return false;

  const sourceSignature = buildSubmissionSignature(submission);

  const cfg = await loadEffectiveAssessmentConfig(assessmentId);
  if (!cfg) return false;

  const extractionBundle = await resolveSubmissionExtractionBundle(submission);
  const extractedBundle = buildEltStudentText(extractionBundle);
  const limitedEvidenceContext = buildLimitedEvidenceContext(submission, extractionBundle);
  const eltTextParts = [];
  if (extractedBundle.text) eltTextParts.push(extractedBundle.text);
  else if (limitedEvidenceContext) eltTextParts.push(limitedEvidenceContext);
  const studentText = String(eltTextParts.join("\n\n")).trim().slice(0, 20000);
  const hasReadableExtractedText = Boolean(extractedBundle.text);
  const usedLimitedEvidenceFallback = !hasReadableExtractedText && Boolean(limitedEvidenceContext);
  const synthIdPromise = detectSynthIdSignal({
    assessmentId,
    studentUid,
    submissionId,
    submission,
    extractionBundle,
    studentText,
  });

  let payload = null;
  if (!hasReadableExtractedText) {
    const aiDraft = buildEvidenceLimitedAiDraft(cfg, extractionBundle);
    const synthId = await synthIdPromise;
    aiDraft.integrity = mergeIntegrityWithSynthId(aiDraft.integrity || {}, synthId);
    payload = {
      evidenceNotes: "",
      eltAssessment: null,
      eltAssessmentText: studentText,
      eltAssessmentMeta: buildEltAssessmentMeta({
        sourceTextLength: studentText.length,
        truncated: extractedBundle.truncated || studentText.length >= 20000,
        model: "manual-review",
      }),
      aiDraft,
      integrity: aiDraft.integrity || {},
      sourceSignature,
      queueCycleId,
    };
    await saveAutoGeneratedDraft(assessmentId, studentUid, submissionId, payload, existingRecord, cfg);
    return true;
  }

  try {
    const context = validateEltRequest({
      student_id: studentUid,
      assignment_id: assessmentId,
      submission_id: submissionId,
      student_text: studentText,
      course_objectives: getEltCourseObjectives(cfg),
      rubric: buildEltRubric(cfg),
      timestamp: new Date().toISOString(),
    });
    let generated = await generateEltReviewFromContext(context);
    let aiDraft = adaptEltAssessmentToAiDraft(generated.review, cfg);
    const initialIssues = draftQualityIssues(aiDraft).filter((code) => code !== "evidence_basis_missing");
    if (initialIssues.length && aiDraft?.qualityChecks?.mode !== "manual_review_required") {
      try {
        const repaired = await generateEltReviewRepairFromContext(context, generated.review, initialIssues);
        const repairedDraft = adaptEltAssessmentToAiDraft(repaired.review, cfg);
        const repairedIssues = draftQualityIssues(repairedDraft).filter((code) => code !== "evidence_basis_missing");
        if (repairedIssues.length < initialIssues.length) {
          generated = repaired;
          aiDraft = repairedDraft;
        }
      } catch (repairErr) {
        console.warn("[auto-grade] ELT repair pass failed.", {
          assessmentId,
          studentUid,
          submissionId,
          message: repairErr?.message || String(repairErr),
        });
      }
    }
    const synthId = await synthIdPromise;
    aiDraft.integrity = mergeIntegrityWithSynthId(aiDraft.integrity || {}, synthId);
    aiDraft.evidenceBasis = cleanText(
      usedLimitedEvidenceFallback
        ? `${describeExtractionBundle(extractionBundle)}${submission?.note ? " Student submission note was included." : ""} The ELT review was generated from limited submission context because no readable file text was recovered automatically.`
        : `${describeExtractionBundle(extractionBundle)}`,
      1200
    );
    payload = {
      evidenceNotes: "",
      eltAssessment: generated.review,
      eltAssessmentText: studentText,
      eltAssessmentMeta: buildEltAssessmentMeta({
        sourceTextLength: studentText.length,
        truncated: extractedBundle.truncated || studentText.length >= 20000,
        model: generated.modelName || "vertex-auto",
      }),
      aiDraft,
      integrity: aiDraft.integrity || {},
      sourceSignature,
      queueCycleId,
    };
  } catch (err) {
    const aiDraft = buildEvidenceLimitedAiDraft(cfg, extractionBundle);
    const synthId = await synthIdPromise;
    aiDraft.integrity = mergeIntegrityWithSynthId(aiDraft.integrity || {}, synthId);
    aiDraft.confidenceNote = cleanText(
      `${aiDraft.confidenceNote}${err?.message ? ` ${err.message}` : ""}`,
      1200
    );
    payload = {
      evidenceNotes: "",
      eltAssessment: null,
      eltAssessmentText: studentText,
      eltAssessmentMeta: buildEltAssessmentMeta({
        sourceTextLength: studentText.length,
        truncated: extractedBundle.truncated || studentText.length >= 20000,
        model: "manual-review",
      }),
      aiDraft,
      integrity: aiDraft.integrity || {},
      sourceSignature,
      queueCycleId,
    };
  }

  await saveAutoGeneratedDraft(assessmentId, studentUid, submissionId, payload, existingRecord, cfg);
  return true;
}

const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;
const RATE_LIMIT_MS = 60 * 1000; // 1 request per minute per email
const OTP_MAX_ATTEMPTS = 5;

function generateOtp() {
  const digits = [];
  for (let i = 0; i < OTP_LENGTH; i++) {
    digits.push(Math.floor(Math.random() * 10));
  }
  return digits.join("");
}

function normalizeEmail(raw) {
  return String(raw || "").trim().toLowerCase().replace(/\s+/g, "");
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

function emailKey(email) {
  return normalizeEmail(email).replace(/[.#$\[\]@/]/g, "_");
}

function createTransport() {
  if (_cachedTransport) return _cachedTransport;
  const nodemailer = require("nodemailer");

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465", 10);

  if (!user || !pass) {
    throw new HttpsError("failed-precondition", "SMTP not configured.");
  }

  _cachedTransport = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
    pool: true,
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 10,
  });
  return _cachedTransport;
}

async function sendMailWithRetry(transporter, mailOptions, retries = 2) {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await transporter.sendMail(mailOptions);
    } catch (err) {
      if (attempt === retries) throw err;
      // Wait before retry: 500ms, then 1500ms
      await new Promise((r) => setTimeout(r, 500 * (attempt + 1)));
      // Reset cached transport on connection errors
      if (err.code === "ECONNRESET" || err.code === "ETIMEDOUT" || err.code === "ESOCKET") {
        _cachedTransport = null;
        transporter = createTransport();
      }
    }
  }
}

function normalizeContinueUrl(raw) {
  const value = String(raw || "").trim();
  if (!value) return "";
  try {
    const url = new URL(value);
    const isHttps = url.protocol === "https:";
    const isLocalhost =
      url.protocol === "http:" &&
      ["localhost", "127.0.0.1"].includes(String(url.hostname || "").toLowerCase());
    return isHttps || isLocalhost ? url.toString() : "";
  } catch {
    return "";
  }
}

const TEMPORARY_POLL_CONFIGS = {
  "referencing-management-session-2026-05-16": {
    title: "Referencing management applications session",
    sessionDate: "2026-05-16",
    closesAt: "2026-05-15T23:00:00+02:00",
    minimumVotes: 300,
    options: [
      { id: "slot_1300_1400", label: "13:00-14:00" },
      { id: "slot_1400_1600", label: "14:00-16:00" },
      { id: "slot_1830_1930", label: "18:30-19:30" },
    ],
  },
};

function normalizePollStudentNumber(value) {
  return String(value || "").replace(/\D/g, "").trim();
}

function publicPollSummary(raw = {}, config = {}) {
  const rawCounts = raw?.counts || {};
  const counts = {};
  for (const option of config.options || []) {
    const count = Number(rawCounts[option.id] || 0);
    counts[option.id] = Number.isFinite(count) && count > 0 ? count : 0;
  }
  const computedTotal = Object.values(counts).reduce((sum, count) => sum + count, 0);
  const rawTotal = Number(raw?.totalVotes);
  return {
    title: config.title || "",
    sessionDate: config.sessionDate || "",
    closesAt: config.closesAt || "",
    minimumVotes: Number(config.minimumVotes || 0),
    options: config.options || [],
    counts,
    totalVotes: Number.isFinite(rawTotal) ? rawTotal : computedTotal,
    updatedAt: cleanText(raw?.updatedAt, 80),
  };
}

// ── Temporary Student Polls ───────────────────
exports.castTemporaryPollVote = onCall(
  {
    region: "us-central1",
    cors: true,
    enforceAppCheck: false,
    maxInstances: 100,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in before voting.");
    }

    const pollId = cleanText(request.data?.pollId, 120);
    const config = TEMPORARY_POLL_CONFIGS[pollId];
    if (!config) {
      throw new HttpsError("invalid-argument", "Unknown poll.");
    }

    const now = Date.now();
    const closeAt = new Date(config.closesAt).getTime();
    if (Number.isFinite(closeAt) && now >= closeAt) {
      throw new HttpsError("failed-precondition", "This poll is closed.");
    }

    const studentNumber = normalizePollStudentNumber(request.data?.studentNumber);
    if (!/^\d{6,12}$/.test(studentNumber)) {
      throw new HttpsError("invalid-argument", "Enter a valid student number.");
    }

    const option = cleanText(request.data?.option, 80);
    if (!config.options.some((row) => row.id === option)) {
      throw new HttpsError("invalid-argument", "Select a valid timeslot.");
    }

    const db = adminDatabase();
    const pollRef = db.ref(`temporaryPolls/${pollId}`);
    const voteRef = pollRef.child(`votes/${studentNumber}`);
    const nowIso = new Date(now).toISOString();
    const votePayload = {
      option,
      uid: request.auth.uid,
      votedAt: nowIso,
      studentNumberLast4: studentNumber.slice(-4),
      authEmail: normalizeEmail(request.auth.token?.email || ""),
      displayName: cleanText(request.auth.token?.name, 160),
    };

    const voteResult = await voteRef.transaction((current) => {
      if (current) return;
      return votePayload;
    }, undefined, false);

    if (!voteResult.committed) {
      throw new HttpsError("already-exists", "A vote for this student number has already been recorded.");
    }

    const { ServerValue } = require("firebase-admin/database");
    await pollRef.update({
      "meta/title": config.title,
      "meta/sessionDate": config.sessionDate,
      "meta/closesAt": config.closesAt,
      "meta/minimumVotes": config.minimumVotes,
      "meta/options": config.options,
      "summary/closesAt": config.closesAt,
      "summary/minimumVotes": config.minimumVotes,
      "summary/updatedAt": nowIso,
      "summary/totalVotes": ServerValue.increment(1),
      [`summary/counts/${option}`]: ServerValue.increment(1),
    });

    const summarySnap = await pollRef.child("summary").once("value");
    return {
      ok: true,
      pollId,
      summary: publicPollSummary(summarySnap.val() || {}, config),
    };
  }
);

// ── Send OTP ──────────────────────────────────
exports.sendOtp = onCall(
  {
    region: "us-central1",
    cors: true,
    secrets: ["SMTP_USER", "SMTP_PASS"],
    enforceAppCheck: false,
    maxInstances: 100,
    minInstances: 1,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "Valid email required.");
    }

    const db = adminDatabase();
    const key = emailKey(email);
    const otpRef = db.ref(`otp/${key}`);
    const now = Date.now();
    const code = generateOtp();
    const writeResult = await otpRef.transaction((current) => {
      if (current?.createdAt && now - Number(current.createdAt) < RATE_LIMIT_MS) {
        return;
      }
      return {
        code,
        email,
        createdAt: now,
        expiresAt: now + OTP_EXPIRY_MS,
        attempts: 0,
        consumedAt: null,
      };
    }, undefined, false);
    if (!writeResult.committed) {
      const existing = writeResult.snapshot.val();
      const wait = Math.max(1, Math.ceil((RATE_LIMIT_MS - (now - Number(existing?.createdAt || 0))) / 1000));
      throw new HttpsError(
        "resource-exhausted",
        `Please wait ${wait} seconds before requesting a new code.`
      );
    }

    // Send email with retry for resilience under load
    const transporter = createTransport();
    const fromName = process.env.SMTP_FROM_NAME || "Academic Literacies";
    const fromAddr = process.env.SMTP_USER;

    try {
      await sendMailWithRetry(transporter, {
        from: `"${fromName}" <${fromAddr}>`,
        to: email,
        subject: `${code} — Your sign-in code for Academic Literacies`,
        text: `Your sign-in code is: ${code}\n\nThis code expires in 10 minutes.\nIf you did not request this, ignore this email.`,
        html: `
          <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
            <p style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0d9488;margin:0 0 16px 0;">ACADLIT · AI</p>
            <p style="font-size:15px;color:#1e293b;margin:0 0 16px 0;">Your sign-in code is:</p>
            <div style="background:#f0fdfa;border:2px solid #0d9488;border-radius:12px;padding:20px;text-align:center;margin:0 0 16px 0;">
              <span style="font-family:monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:#0f172a;">${code}</span>
            </div>
            <p style="font-size:13px;color:#64748b;margin:0 0 8px 0;">Enter this code in the app to sign in. It expires in 10 minutes.</p>
            <p style="font-size:12px;color:#94a3b8;margin:0;">If you did not request this code, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      await otpRef.remove().catch(() => {});
      throw new HttpsError("unavailable", "Could not send a sign-in code right now. Please try again.");
    }

    return { sent: true };
  }
);

// ── Staff password reset via SMTP ─────────────
exports.sendStaffPasswordReset = onCall(
  {
    region: "us-central1",
    cors: true,
    secrets: ["SMTP_USER", "SMTP_PASS"],
    enforceAppCheck: false,
    maxInstances: 50,
    minInstances: 0,
    timeoutSeconds: 60,
    memory: "256MiB",
  },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const continueUrl = normalizeContinueUrl(request.data?.continueUrl);

    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "Valid email required.");
    }

    const db = adminDatabase();
    const key = emailKey(email);
    const resetRef = db.ref(`passwordReset/${key}`);
    const now = Date.now();
    const writeResult = await resetRef.transaction((current) => {
      if (current?.createdAt && now - Number(current.createdAt) < RATE_LIMIT_MS) {
        return;
      }
      return {
        email,
        createdAt: now,
      };
    }, undefined, false);

    if (!writeResult.committed) {
      const existing = writeResult.snapshot.val();
      const wait = Math.max(1, Math.ceil((RATE_LIMIT_MS - (now - Number(existing?.createdAt || 0))) / 1000));
      throw new HttpsError(
        "resource-exhausted",
        `Please wait ${wait} seconds before requesting another reset email.`
      );
    }

    let resetLink = "";
    try {
      resetLink = await adminAuth().generatePasswordResetLink(
        email,
        continueUrl ? { url: continueUrl } : undefined
      );
    } catch (err) {
      await resetRef.remove().catch(() => {});
      if (err?.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "No account found with that email address.");
      }
      if (err?.code === "auth/invalid-continue-uri" || err?.code === "auth/unauthorized-continue-uri") {
        throw new HttpsError("invalid-argument", "Password reset redirect URL is not authorized.");
      }
      logger.error("generatePasswordResetLink failed", { code: err?.code, message: err?.message, email });
      throw new HttpsError("internal", "Could not create a password reset link right now.");
    }

    const transporter = createTransport();
    const fromName = process.env.SMTP_FROM_NAME || "Academic Literacies";
    const fromAddr = process.env.SMTP_USER;

    try {
      await sendMailWithRetry(transporter, {
        from: `"${fromName}" <${fromAddr}>`,
        to: email,
        subject: "Reset your Academic Literacies password",
        text: [
          "We received a request to reset your Academic Literacies password.",
          "",
          `Reset your password: ${resetLink}`,
          "",
          "If you did not request this, you can ignore this email.",
        ].join("\n"),
        html: `
          <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;">
            <p style="font-size:12px;font-weight:700;letter-spacing:2px;text-transform:uppercase;color:#0d9488;margin:0 0 16px 0;">ACADLIT · AI</p>
            <h2 style="font-size:22px;line-height:1.3;color:#0f172a;margin:0 0 12px 0;">Reset your password</h2>
            <p style="font-size:14px;line-height:1.7;color:#334155;margin:0 0 18px 0;">We received a request to reset the password for <strong>${email}</strong>.</p>
            <p style="margin:0 0 20px 0;">
              <a href="${resetLink}" style="display:inline-block;background:#0f766e;color:white;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 18px;">Reset password</a>
            </p>
            <p style="font-size:13px;line-height:1.7;color:#64748b;margin:0 0 8px 0;">If the button does not open, copy and paste this link into your browser:</p>
            <p style="font-size:12px;line-height:1.7;color:#0f172a;word-break:break-all;margin:0 0 16px 0;">${resetLink}</p>
            <p style="font-size:12px;line-height:1.7;color:#94a3b8;margin:0;">If you did not request this password reset, you can safely ignore this email.</p>
          </div>
        `,
      });
    } catch (err) {
      await resetRef.remove().catch(() => {});
      logger.error("sendStaffPasswordReset email failed", { code: err?.code, message: err?.message, email });
      throw new HttpsError("unavailable", "Could not send a password reset email right now. Please try again.");
    }

    return { sent: true };
  }
);

// ── Verify OTP ────────────────────────────────
exports.verifyOtp = onCall(
  {
    region: "us-central1",
    cors: true,
    enforceAppCheck: false,
    maxInstances: 100,
    minInstances: 1,
    timeoutSeconds: 30,
    memory: "256MiB",
  },
  async (request) => {
    const email = normalizeEmail(request.data?.email);
    const code = String(request.data?.code || "").trim();

    if (!isValidEmail(email) || !/^\d{6}$/.test(code)) {
      throw new HttpsError("invalid-argument", "Email and code required.");
    }

    const db = adminDatabase();
    const key = emailKey(email);
    const otpRef = db.ref(`otp/${key}`);
    const now = Date.now();
    let outcome = "missing";
    const verifyResult = await otpRef.transaction((current) => {
      if (!current) {
        outcome = "missing";
        return current;
      }
      if (current.consumedAt) {
        outcome = "consumed";
        return current;
      }
      if (normalizeEmail(current.email) !== email) {
        outcome = "mismatch";
        return null;
      }
      if (now > Number(current.expiresAt || 0)) {
        outcome = "expired";
        return null;
      }
      const attempts = Number(current.attempts || 0);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        outcome = "locked";
        return null;
      }
      if (String(current.code || "") !== code) {
        outcome = "incorrect";
        return {
          ...current,
          attempts: attempts + 1,
          lastAttemptAt: now,
        };
      }
      outcome = "verified";
      return {
        ...current,
        consumedAt: now,
        lastAttemptAt: now,
      };
    }, undefined, false);
    const record = verifyResult.snapshot.val();

    if (outcome === "missing") {
      throw new HttpsError("not-found", "No code found. Request a new one.");
    }
    if (outcome === "expired") {
      throw new HttpsError("deadline-exceeded", "Code expired. Request a new one.");
    }
    if (outcome === "locked") {
      throw new HttpsError("resource-exhausted", "Too many attempts. Request a new one.");
    }
    if (outcome === "consumed") {
      throw new HttpsError("already-exists", "This code has already been used. Request a new one.");
    }
    if (outcome === "mismatch") {
      throw new HttpsError("permission-denied", "This code does not match that email address.");
    }
    if (outcome === "incorrect") {
      const attempts = Number(record?.attempts || 0);
      if (attempts >= OTP_MAX_ATTEMPTS) {
        await otpRef.remove().catch(() => {});
        throw new HttpsError("resource-exhausted", "Too many attempts. Request a new one.");
      }
      const remaining = Math.max(OTP_MAX_ATTEMPTS - attempts, 0);
      throw new HttpsError("permission-denied", `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`);
    }
    if (outcome !== "verified") {
      throw new HttpsError("internal", "Could not verify this sign-in code.");
    }

    const auth = adminAuth();

    // Get or create the Firebase Auth user
    let user;
    let createdUser = false;
    try {
      user = await auth.getUserByEmail(email);
    } catch (err) {
      if (err.code === "auth/user-not-found") {
        user = await auth.createUser({ email, emailVerified: true });
        createdUser = true;
      } else {
        throw err;
      }
    }

    const profileRef = db.ref(`users/${user.uid}/profile`);
    const profileSnap = await profileRef.once("value");
    if (!profileSnap.exists()) {
      const nowIso = new Date().toISOString();
      const fallbackName = email.split("@")[0] || "Student";
      await profileRef.set({
        uid: user.uid,
        role: "student",
        email,
        authEmail: email,
        username: email,
        displayName: createdUser ? `${fallbackName} [student]` : fallbackName,
        disabled: false,
        source: "otp-sign-in-bootstrap",
        createdAt: nowIso,
        updatedAt: nowIso,
      });
    }

    const customToken = await auth.createCustomToken(user.uid);
    await otpRef.remove().catch(() => {});
    return { token: customToken };
  }
);

// ── Create Tutor Account ─────────────────────
exports.createTutorAccount = onCall(
  {
    region: "us-central1",
    cors: true,
    enforceAppCheck: true,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const db = adminDatabase();
    const callerSnap = await db
      .ref(`users/${request.auth.uid}/profile/role`)
      .once("value");
    const callerRole = String(callerSnap.val() || "");
    if (callerRole !== "lecturer" && callerRole !== "moderator") {
      throw new HttpsError(
        "permission-denied",
        "Only lecturers and moderators can create tutor accounts."
      );
    }

    const name = String(request.data?.name || "").trim();
    const email = normalizeEmail(request.data?.email);
    if (!name) {
      throw new HttpsError("invalid-argument", "Tutor name is required.");
    }
    if (!isValidEmail(email)) {
      throw new HttpsError("invalid-argument", "A valid email is required.");
    }

    // Generate a 12-char temporary password
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
    let tempPassword = "";
    for (let i = 0; i < 12; i++) {
      tempPassword += chars.charAt(Math.floor(Math.random() * chars.length));
    }

    const auth = adminAuth();
    const displayName = `${name} [tutor]`;

    let user;
    try {
      user = await auth.createUser({
        email,
        password: tempPassword,
        displayName,
        emailVerified: false,
      });
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        throw new HttpsError(
          "already-exists",
          "A user with this email already exists."
        );
      }
      throw new HttpsError("internal", err.message || "Failed to create user.");
    }

    const now = new Date().toISOString();
    await db.ref(`users/${user.uid}/profile`).set({
      uid: user.uid,
      email,
      displayName,
      role: "tutor",
      disabled: false,
      createdAt: now,
      createdBy: request.auth.uid,
      source: "cloud-function/createTutorAccount",
    });

    return { uid: user.uid, email, tempPassword };
  }
);

exports.deleteUserAccountRecord = onCall(
  {
    region: "us-central1",
    cors: true,
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const requesterRole = await requireStaffRole(request.auth.uid);
    if (!["lecturer", "moderator"].includes(requesterRole)) {
      throw new HttpsError("permission-denied", "Lecturer or moderator access required.");
    }

    const uid = cleanText(request.data?.uid, 160);
    if (!uid) {
      throw new HttpsError("invalid-argument", "uid is required.");
    }

    const audit = request.data?.audit && typeof request.data.audit === "object" && !Array.isArray(request.data.audit)
      ? request.data.audit
      : {};
    const cleanAudit = Object.fromEntries(
      Object.entries(audit)
        .map(([key, value]) => {
          const safeKey = cleanText(key, 80);
          if (!safeKey) return null;
          if (value == null) return [safeKey, null];
          if (typeof value === "number" || typeof value === "boolean") return [safeKey, value];
          return [safeKey, cleanMultiline(value, 1200)];
        })
        .filter(Boolean)
    );

    const db = adminDatabase();
    const payload = {
      uid,
      deletedAt: new Date().toISOString(),
      deletedByUid: request.auth.uid,
      deletedByRole: requesterRole,
      ...cleanAudit,
    };

    await db.ref(`analytics/deleted-student-accounts/${String(uid).replace(/[.#$\[\]/]/g, "_")}`).set(payload);
    await db.ref(`users/${uid}`).remove();
    await db.ref(`tutorial-groups/assignmentsByTutor/${uid}`).remove().catch(() => {});

    try {
      await adminAuth().deleteUser(uid);
    } catch (err) {
      if (err?.code !== "auth/user-not-found") {
        throw new HttpsError("internal", `Failed to delete Firebase Auth user: ${err?.message || err}`);
      }
    }

    return { ok: true };
  }
);

// ── Reassign a merged student's sign-in email ─
// After two duplicate accounts are merged (see src/account-merge.js) only the
// keeper holds the student's work, but verifyOtp resolves the uid purely by
// getUserByEmail. If the student had been signing in on the account that lost,
// this hands that email to the keeper so they keep using the inbox they know.
//
// The losing Auth user is parked and disabled rather than deleted: the email
// has to be freed before it can be assigned, and parking keeps the step
// reversible if the second write fails.
exports.reassignMergedAccountEmail = onCall(
  {
    region: "us-central1",
    cors: true,
    enforceAppCheck: false,
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Authentication required.");
    }

    const requesterRole = await requireStaffRole(request.auth.uid);
    if (!["lecturer", "moderator"].includes(requesterRole)) {
      throw new HttpsError("permission-denied", "Lecturer or moderator access required.");
    }

    const keeperUid = cleanText(request.data?.keeperUid, 160);
    const loserUid = cleanText(request.data?.loserUid, 160);
    if (!keeperUid || !loserUid || keeperUid === loserUid) {
      throw new HttpsError("invalid-argument", "Distinct keeperUid and loserUid are required.");
    }

    const db = adminDatabase();

    // Only ever run against a pair the merge has already tombstoned, so this
    // cannot be used to move an email between two live accounts.
    const tombstoneSnap = await db.ref(`users/${loserUid}/profile/mergedIntoUid`).once("value");
    if (tombstoneSnap.val() !== keeperUid) {
      throw new HttpsError(
        "failed-precondition",
        "That account has not been merged into this keeper. Run the account merge first."
      );
    }

    const auth = adminAuth();
    let loserUser;
    try {
      loserUser = await auth.getUser(loserUid);
    } catch (err) {
      if (err?.code === "auth/user-not-found") {
        throw new HttpsError("not-found", "The merged account no longer exists in Firebase Auth.");
      }
      throw new HttpsError("internal", `Could not read the merged account: ${err?.message || err}`);
    }

    const targetEmail = normalizeEmail(loserUser.email || "");
    if (!targetEmail) {
      throw new HttpsError("failed-precondition", "The merged account has no email to reassign.");
    }

    let keeperUser;
    try {
      keeperUser = await auth.getUser(keeperUid);
    } catch (err) {
      throw new HttpsError("internal", `Could not read the kept account: ${err?.message || err}`);
    }
    const previousEmail = normalizeEmail(keeperUser.email || "");

    // The two addresses are exchanged rather than one being parked on a
    // synthetic domain. Leaving the keeper's old address unowned would let a
    // student signing in with it out of habit bootstrap a fresh empty account,
    // recreating the duplicate this merge just removed. Sitting on the
    // disabled tombstone it is refused instead.
    const scratchEmail = `merged-${loserUid}@merged.invalid`.toLowerCase();
    const nowIso = new Date().toISOString();

    // 1. Free the target address.
    await auth.updateUser(loserUid, { email: scratchEmail, emailVerified: false, disabled: true });

    // 2. Hand it to the keeper. On failure, put it back so the student is not
    //    left unable to sign in with either address.
    try {
      await auth.updateUser(keeperUid, { email: targetEmail, emailVerified: true });
    } catch (err) {
      await auth.updateUser(loserUid, { email: targetEmail, emailVerified: true, disabled: true }).catch(() => {});
      throw new HttpsError("internal", `Could not move the email to the keeper: ${err?.message || err}`);
    }

    // 3. Give the keeper's freed address to the disabled tombstone.
    const parkedEmail = previousEmail || scratchEmail;
    await auth.updateUser(loserUid, { email: parkedEmail, emailVerified: false, disabled: true }).catch(() => {});

    // 4. Keep the RTDB profile consistent with Auth. username is left alone: it
    //    holds the canonical UJ address used for roster matching.
    await db.ref(`users/${keeperUid}/profile`).update({
      authEmail: targetEmail,
      email: targetEmail,
      loginEmail: targetEmail,
      updatedAt: nowIso,
    });
    await db.ref(`users/${loserUid}/profile`).update({
      authEmail: parkedEmail,
      parkedAt: nowIso,
      updatedAt: nowIso,
    });

    return { ok: true, keeperUid, loserUid, reassignedEmail: targetEmail, parkedEmail };
  }
);

// ── ELT Assessment Specialist ─────────────────
exports.generateEltAssessmentReview = onCall(
  {
    region: "us-central1",
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    await requireStaffRole(request.auth.uid);
    const context = validateEltRequest(request.data || {});
    try {
      const generated = await generateEltReviewFromContext(context);
      return generated.review;
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err?.message || "Vertex AI request failed.");
    }
  }
);

exports.requestAssessmentAutoGradeRun = onCall(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (request) => {
    if (!request.auth?.uid) throw new HttpsError("unauthenticated", "Sign in required.");
    await requireStaffRole(request.auth.uid);

    const assessmentId = cleanText(request.data?.assessmentId, 120);
    if (!assessmentId) throw new HttpsError("invalid-argument", "assessmentId is required.");

    const forceRefresh = request.data?.forceRefresh === true;
    const queuedState = await enqueueAssessmentAutoGrade(assessmentId, {
      requestedByUid: request.auth.uid,
      requestedByName: cleanText(request.auth.token?.name || request.auth.token?.email, 160),
      requestedReason: forceRefresh ? "manual_refresh" : "manual_queue",
      forceRefresh,
    });
    const pending = await listLatestAutoGradeCandidates(assessmentId, {
      forceRefresh,
      cycleId: autoGradeRunId("preview"),
    });

    return {
      ok: true,
      assessmentId,
      forceRefresh,
      pendingCount: pending.length,
      queue: queuedState || {},
    };
  }
);

exports.runSubmissionSynthIdCheck = onCall(
  {
    region: "us-central1",
    cors: true,
    enforceAppCheck: false,
    timeoutSeconds: 120,
    memory: "512MiB",
  },
  async (request) => {
    try {
      if (!request.auth?.uid) {
        throw new HttpsError("unauthenticated", "You must be signed in.");
      }

      await requireStaffRole(request.auth.uid);
      const assessmentId = cleanText(request.data?.assessmentId, 120);
      const studentUid = cleanText(request.data?.studentUid, 160);
      const submissionId = cleanText(request.data?.submissionId, 160);
      if (!assessmentId || !studentUid || !submissionId) {
        throw new HttpsError("invalid-argument", "assessmentId, studentUid, and submissionId are required.");
      }

      const submissionRef = adminDatabase().ref(`submissions/${assessmentId}/${studentUid}/${submissionId}`);
      const submissionSnap = await submissionRef.once("value");
      if (!submissionSnap.exists()) {
        throw new HttpsError("not-found", "Submission could not be found.");
      }
      const submission = submissionSnap.val() || {};
      const gradingRef = adminDatabase().ref(`grading-records/${assessmentId}/${studentUid}/${submissionId}`);
      const gradingSnap = await gradingRef.once("value");
      const existingRecord = gradingSnap.exists() ? gradingSnap.val() || {} : {};

      const extractionBundle = await resolveSubmissionExtractionBundle(submission);
      const extractedBundle = buildEltStudentText(extractionBundle);
      const limitedEvidenceContext = buildLimitedEvidenceContext(submission, extractionBundle);
      const studentText = String(
        [
          extractedBundle.text || "",
          !extractedBundle.text && limitedEvidenceContext ? limitedEvidenceContext : "",
        ].filter(Boolean).join("\n\n")
      ).trim().slice(0, 20000);

      const synthIdSignal = await detectSynthIdSignal({
        assessmentId,
        studentUid,
        submissionId,
        submission,
        extractionBundle,
        studentText,
      });

      const mergedIntegrity = mergeIntegrityWithSynthId(
        existingRecord?.integrity || existingRecord?.aiDraft?.integrity || {},
        synthIdSignal
      );
      const now = new Date().toISOString();
      const nextRecord = {
        assessmentId,
        studentUid,
        submissionId,
        integrity: cloneJsonSafe(mergedIntegrity),
        updatedAt: now,
        synthIdCheckedAt: now,
        synthIdCheckedByUid: request.auth.uid,
      };
      if (existingRecord?.aiDraft && typeof existingRecord.aiDraft === "object") {
        nextRecord.aiDraft = {
          ...existingRecord.aiDraft,
          integrity: cloneJsonSafe(mergeIntegrityWithSynthId(existingRecord.aiDraft?.integrity || {}, synthIdSignal)),
        };
      }

      await gradingRef.update(nextRecord);
      return {
        ok: true,
        integrity: nextRecord.integrity,
        synthId: nextRecord.integrity?.synthId || null,
        checkedAt: now,
      };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      throw new HttpsError("internal", err?.message || "Manual SynthID check failed.");
    }
  }
);

exports.autoGradeSubmittedAssessment = onValueWritten(
  {
    region: "us-central1",
    ref: "/submissions/{assessmentId}/{studentUid}/{submissionId}",
    timeoutSeconds: 180,
    memory: "1GiB",
  },
  async (event) => {
    const after = event.data.after?.val();
    if (!after || typeof after !== "object") return;
    if (!after.submittedAt || cleanText(after.status, 40).toLowerCase() !== "submitted") return;
    const assessmentId = cleanText(event.params?.assessmentId, 120);
    const submissionId = cleanText(event.params?.submissionId, 160);
    await enqueueAssessmentAutoGrade(assessmentId, {
      requestedReason: "submission_write",
      submissionId,
    });
  }
);

exports.processAssessmentAutoGradeQueueOnWrite = onValueWritten(
  {
    region: "us-central1",
    ref: "/grading-auto-queue/{assessmentId}",
    timeoutSeconds: 180,
    memory: "1GiB",
  },
  async (event) => {
    const after = event.data.after?.val();
    if (!after || typeof after !== "object") return;
    if (cleanText(after.state, 40).toLowerCase() !== "queued") return;
    const assessmentId = cleanText(event.params?.assessmentId, 120);
    await processAssessmentAutoGradeQueue(assessmentId);
  }
);

exports.resumeAssessmentAutoGradeQueue = onSchedule(
  {
    region: "us-central1",
    schedule: "every 10 minutes",
    timeoutSeconds: 180,
    memory: "512MiB",
  },
  async () => {
    const summary = await resumeAssessmentAutoGradeSweep();
    console.info("[auto-grade-sweep] Completed", summary);
  }
);

exports.synthIdDetectorAdapter = onRequest(
  {
    region: "us-central1",
    timeoutSeconds: 120,
    memory: "256MiB",
  },
  async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).json({ ok: false, error: "POST required." });
      return;
    }
    if (!synthIdAdapterSecretMatches(req)) {
      res.status(401).json({ ok: false, error: "Unauthorized." });
      return;
    }

    const payload = parseRequestJson(req);
    const signal = await forwardSynthIdUpstream(payload);
    res.status(200).json(signal || {
      status: "unavailable",
      provider: "adapter",
      checkedAt: new Date().toISOString(),
      confidenceBand: "low",
      summary: "SynthID adapter returned no signal.",
    });
  }
);

// ── Jeeves: propose code change ────────────────────────────────
// Called by the `propose_code_change` skill. Gated to moderators.
// Opens a draft PR against the academic-literacies repo so the request
// can be reviewed by a human. Never touches the running app.
//
// Requires these Functions config values (set with `firebase functions:config:set`):
//   github.token  — PAT with repo:write
//   github.repo   — owner/name, e.g. "Yusuffeltman/academic-literacies"
//   github.base   — base branch, defaults to "master"
exports.jeevesProposeCodeChange = onCall(
  { region: "us-central1" },
  async (request) => {
    if (!request.auth?.uid) {
      throw new HttpsError("unauthenticated", "Sign in required.");
    }
    const roleSnap = await adminDatabase()
      .ref(`users/${request.auth.uid}/profile/role`)
      .get();
    if (roleSnap.val() !== "moderator") {
      throw new HttpsError("permission-denied", "Moderator role required.");
    }

    const description = String(request.data?.description || "").trim();
    if (!description) {
      throw new HttpsError("invalid-argument", "description is required.");
    }

    // This is a stub: it logs the request into a review queue the
    // moderator can process by hand. Wiring the GitHub API is left as
    // a follow-up — see the plan's "Open questions".
    const now = new Date().toISOString();
    const queueRef = getDatabase().ref("jeeves/code-change-queue").push();
    await queueRef.set({
      description,
      branchHint: request.data?.branchHint || null,
      requestedBy: request.auth.uid,
      status: "pending",
      createdAt: now,
    });

    return {
      ok: true,
      queueId: queueRef.key,
      message: "Your change request is queued for human review.",
    };
  }
);
