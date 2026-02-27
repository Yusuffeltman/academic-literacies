// src/ai.js
// ─────────────────────────────────────────────
// Shared AI utility — Google Gemini API.
// ─────────────────────────────────────────────

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY?.trim();
const MODEL = 'gemini-2.5-flash';

/**
 * Send a single-turn prompt to Gemini.
 */
export async function _aiChat(prompt, { maxTokens = 512, system = '' } = {}) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('VITE_GEMINI_API_KEY is not set in .env');
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  const body = {
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: { maxOutputTokens: maxTokens }
  };
  
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  
  // Track Token Usage
  if (data.usageMetadata) {
    _logAIUsage('single', data.usageMetadata);
  }
  
  if (!text) throw new Error('Empty response from AI');
  return text.trim();
}

window._aiChat = _aiChat;

/**
 * Send a multi-turn conversation to Gemini.
 * messages: Array of { role: 'user' | 'assistant', content: string }
 */
export async function _aiChatMultiTurn(messages, { maxTokens = 512, system = '' } = {}) {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error('VITE_GEMINI_API_KEY is not set in .env');
  }

  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${GEMINI_API_KEY}`;

  // Map 'assistant' to 'model' for Gemini
  const geminiHistory = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  const body = {
    contents: geminiHistory,
    generationConfig: { maxOutputTokens: maxTokens }
  };
  
  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API error ${res.status}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

  // Track Token Usage
  if (data.usageMetadata) {
    _logAIUsage('multi', data.usageMetadata);
  }

  if (!text) throw new Error('Empty response from AI');
  return text.trim();
}

window._aiChatMultiTurn = _aiChatMultiTurn;

// ── Coordinator Agent ─────────────────────────
// Reads STATE.adaptive and returns a personalised recommendation.
// Cached for 2 hours to avoid redundant API calls.

const COORDINATOR_SYSTEM = `You are an adaptive learning coordinator for ALE00Y1 — "Academic Literacies in the Age of AI" at the University of Johannesburg.

You receive a student's learning profile and return a single JSON recommendation (no markdown, no extra text).

SKILLS (priority order for this course):
argument_structure, evidence_use, academic_tone, source_evaluation,
critical_reading, citation_practice, research_skills, ai_literacy

ADAPTATION RULES (apply all that match, prioritise highest urgency):
1. REMEDIATE: If any skill status is "weak" → recommend its micro-module. urgency: high
2. EXTEND: If high_performer is true → recommend an extension challenge. urgency: low
3. STAGNATE: If a skill has been "developing" for 5+ scores with no improvement → suggest a different approach. urgency: medium
4. INTERVENE: If frustration_index >= 3 → recommend Study Buddy or tutor contact. urgency: high
5. PREREQUISITE: If student is on unit 4+ and argument_structure is weak → block and remediate first. urgency: high
6. LEVERAGE: If a skill is "strong", use it as a bridge to scaffold a weaker related skill. urgency: low
7. TOPIC MATCH: If study_topics contains a skill ID in needs_remediation → surface that micro-module proactively. urgency: medium
8. CELEBRATE: If all tested skills are "strong" → trigger achievement. urgency: low

MICRO-MODULES (use these as targets):
evidence_use → "evidence-booster", argument_structure → "argument-builder",
academic_tone → "tone-workshop", source_evaluation → "source-skills",
citation_practice → "citation-guide", critical_reading → "reading-strategies"

Return ONLY this JSON:
{"type":"continue|remediate|extend|intervene|celebrate","skill_focus":"skill_id or null","message":"2-3 sentence encouraging message for the student","action_label":"Button text","action_target":"micro-module id or agent name or null","urgency":"low|medium|high","flag_instructor":false}

Write warmly. Acknowledge the student's specific progress. Never be condescending. Respect the diverse South African university context.`;

export async function getCoordinatorRecommendation() {
  const adaptive = window.STATE?.adaptive;
  if (!adaptive) return null;

  // Return cached recommendation if less than 2 hours old
  if (adaptive.last_recommendation && adaptive.recommendation_at) {
    const age = Date.now() - new Date(adaptive.recommendation_at).getTime();
    if (age < 2 * 60 * 60 * 1000) return adaptive.last_recommendation;
  }

  // Build a lean profile summary for the prompt
  const skillAverages = {};
  Object.entries(adaptive.skill_scores || {}).forEach(([id, entries]) => {
    if (entries.length) {
      const recent = entries.slice(-3).map(e => e.score);
      skillAverages[id] = Math.round(recent.reduce((a, b) => a + b, 0) / recent.length * 10) / 10;
    }
  });

  const summary = {
    skill_status:      adaptive.skill_status,
    skill_averages:    skillAverages,
    needs_remediation: adaptive.needs_remediation,
    high_performer:    adaptive.high_performer,
    frustration_index: adaptive.frustration_index,
    study_topics:      (adaptive.study_topics || []).slice(-5),
    active_unit:       window.STATE?.activeUnit ?? 0,
  };

  try {
    const raw = await _aiChat(
      `Student profile:\n${JSON.stringify(summary, null, 2)}\n\nWhat should this student do next?`,
      { system: COORDINATOR_SYSTEM, maxTokens: 300 }
    );
    const cleaned = raw.replace(/```json|```/g, '').trim();
    const rec = JSON.parse(cleaned);

    adaptive.last_recommendation = rec;
    adaptive.recommendation_at   = new Date().toISOString();
    if (window.saveState) window.saveState().catch(console.error);
    return rec;
  } catch {
    return {
      type: 'continue', skill_focus: null, urgency: 'low', flag_instructor: false,
      message: 'Keep working through the course material. Every interaction builds your skills.',
      action_label: 'Continue Learning', action_target: null,
    };
  }
}

window.getCoordinatorRecommendation = getCoordinatorRecommendation;

// ── Usage Tracking Logic ────────────────────────
async function _logAIUsage(type, usageMetadata) {
  if (!window.STATE) return;
  if (!window.STATE.aiUsage) {
    window.STATE.aiUsage = { promptTokens: 0, candidateTokens: 0, totalTokens: 0, requests: 0 };
  }
  
  window.STATE.aiUsage.promptTokens += (usageMetadata.promptTokenCount || 0);
  window.STATE.aiUsage.candidateTokens += (usageMetadata.candidatesTokenCount || 0);
  window.STATE.aiUsage.totalTokens += (usageMetadata.totalTokenCount || 0);
  window.STATE.aiUsage.requests += 1;

  if (window.saveState) {
    // Fire and forget save so it doesn't block the UI
    window.saveState().catch(console.error);
  }
}
