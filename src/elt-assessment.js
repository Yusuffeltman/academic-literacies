const ELT_TEXT_LIMIT = 18000;
const ELT_INSUFFICIENT_EVIDENCE_PATTERNS = [
  /no student text was available/i,
  /file extraction error/i,
  /not possible to assess/i,
  /no readable (?:student )?(?:file )?text/i,
  /does not contain readable student prose/i,
  /limited to metadata/i,
  /unable to evaluate/i,
];

function _cleanText(value, max = 4000) {
  return String(value || '').replace(/\s+/g, ' ').trim().slice(0, max);
}

function _normalizeMultiline(value, max = ELT_TEXT_LIMIT) {
  return String(value || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, max);
}

function _parseMarkValue(raw) {
  const matches = String(raw || '').match(/\d+(?:\.\d+)?/g);
  if (!matches?.length) return 0;
  return Math.max(...matches.map((value) => Number(value)).filter((value) => Number.isFinite(value)));
}

function _signalsInsufficientEvidence(value = '') {
  const text = _normalizeMultiline(value, 2400);
  return Boolean(text) && ELT_INSUFFICIENT_EVIDENCE_PATTERNS.some((pattern) => pattern.test(text));
}

export function detectEltInsufficientEvidence(eltAssessment = {}) {
  const explicitStatus = _cleanText(eltAssessment?.evaluation_status, 80).toLowerCase();
  const explicitWarning = _cleanText(eltAssessment?.evidence_warning, 1200);
  if (explicitStatus === 'insufficient_evidence') {
    return {
      insufficient: true,
      warning: explicitWarning || 'No readable student text was available for evaluation. Manual review is required.',
    };
  }

  const criteria = Array.isArray(eltAssessment?.criteria_breakdown) ? eltAssessment.criteria_breakdown : [];
  const holistic = eltAssessment?.holistic_feedback || {};
  const zeroScores = criteria.length > 0 && criteria.every((row) => {
    const score = Number(row?.score);
    return !Number.isFinite(score) || score === 0;
  });
  const flaggedCriteria = criteria.length > 0 && criteria.every((row) => _signalsInsufficientEvidence(row?.justification || ''));
  const flaggedHolistic = _signalsInsufficientEvidence(holistic?.strengths_summary || '')
    || _signalsInsufficientEvidence(holistic?.areas_for_improvement || '')
    || _signalsInsufficientEvidence(holistic?.alignment_with_course_goals || '');
  const insufficient = zeroScores && flaggedCriteria && flaggedHolistic;
  return {
    insufficient,
    warning: explicitWarning
      || (insufficient ? 'No readable student text was available for evaluation. Manual review is required.' : ''),
  };
}

export function getEltCourseObjectives(cfg = null) {
  const explicit = Array.isArray(cfg?.courseObjectives) ? cfg.courseObjectives : [];
  const fallback = Array.isArray(cfg?.courseOutcomes) ? cfg.courseOutcomes : [];
  return (explicit.length ? explicit : fallback)
    .map((item) => _cleanText(item, 240))
    .filter(Boolean)
    .slice(0, 8);
}

export function buildEltRubric(cfg = null) {
  return (Array.isArray(cfg?.rubric) ? cfg.rubric : [])
    .map((row) => {
      const criterionName = _cleanText(row?.criterion, 240);
      const maxScore = Math.max(0, ...((Array.isArray(row?.levels) ? row.levels : []).map((level) => _parseMarkValue(level?.mark))));
      const descriptor = (Array.isArray(row?.levels) ? row.levels : [])
        .map((level) => {
          const mark = _cleanText(level?.mark, 80);
          const desc = _cleanText(level?.desc, 320);
          return mark || desc ? `${mark}${mark && desc ? ': ' : ''}${desc}`.trim() : '';
        })
        .filter(Boolean)
        .join(' | ');
      if (!criterionName) return null;
      return {
        criterion_name: criterionName,
        score: 0,
        max_score: maxScore || 25,
        justification: '',
        descriptor,
      };
    })
    .filter(Boolean);
}

export function buildEltStudentText(bundle = {}, maxChars = ELT_TEXT_LIMIT) {
  const results = Array.isArray(bundle?.results) ? bundle.results : [];
  const fullText = results
    .filter((item) => item?.text)
    .map((item) => `[File: ${item.name}]\n${_normalizeMultiline(item.text, Math.max(maxChars * 2, ELT_TEXT_LIMIT))}`)
    .join('\n\n');
  const normalized = String(fullText || '')
    .replace(/\r\n?/g, '\n')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
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

function _coerceNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function _deriveLetterGrade(percentage) {
  if (percentage >= 75) return 'A';
  if (percentage >= 70) return 'B';
  if (percentage >= 60) return 'C';
  if (percentage >= 50) return 'D';
  return 'F';
}

function _rankCriteria(criteria = []) {
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
    .filter((row) => _cleanText(row?.criterion_name, 240));
}

function _weakestCriteria(criteria = [], limit = 2) {
  return _rankCriteria(criteria)
    .filter((row) => row.ratio != null)
    .sort((a, b) => a.ratio - b.ratio)
    .slice(0, limit);
}

function _strongestCriteria(criteria = [], limit = 2) {
  return _rankCriteria(criteria)
    .filter((row) => row.ratio != null)
    .sort((a, b) => b.ratio - a.ratio)
    .slice(0, limit);
}

function _criterionFailSummary(row = {}) {
  const criterion = _cleanText(row?.criterion_name, 200) || 'this criterion';
  const score = row?.score == null || !Number.isFinite(Number(row.score)) || Number(row?.max_score) <= 0
    ? 'unscored'
    : `${row.score}/${row.max_score}`;
  const justification = _cleanText(row?.justification, 220);
  return `${criterion} (${score})${justification ? `: ${justification}` : ''}`.trim();
}

function _criterionImproveSummary(row = {}) {
  const criterion = _cleanText(row?.criterion_name, 200) || 'this criterion';
  const justification = _cleanText(row?.justification, 200);
  return `${criterion}${justification ? `: ${justification}` : ': strengthen the evidence and judgment against the rubric.'}`.trim();
}

export function adaptEltAssessmentToAiDraft(eltAssessment = {}, cfg = null) {
  const criteria = Array.isArray(eltAssessment?.criteria_breakdown) ? eltAssessment.criteria_breakdown : [];
  const holistic = eltAssessment?.holistic_feedback || {};
  const summary = eltAssessment?.grading_summary || {};
  const courseObjectives = getEltCourseObjectives(cfg);
  const evidenceState = detectEltInsufficientEvidence(eltAssessment);

  const criterionRows = criteria.map((row) => ({
    criterion: _cleanText(row?.criterion_name, 240),
    provisionalMark: evidenceState.insufficient ? null : _coerceNumber(row?.score, 0),
    maxMark: _coerceNumber(row?.max_score, 0),
    rationale: _cleanText(row?.justification, 1400),
    evidenceRefs: [],
  })).filter((row) => row.criterion);

  const totalPossible = _coerceNumber(summary.total_points_possible, criterionRows.reduce((acc, row) => acc + (row.maxMark || 0), 0));
  const totalEarned = evidenceState.insufficient
    ? null
    : _coerceNumber(summary.total_points_earned, criterionRows.reduce((acc, row) => acc + (row.provisionalMark || 0), 0));
  const overallPercentage = evidenceState.insufficient
    ? null
    : (summary?.overall_percentage == null
    ? (totalPossible > 0 ? Math.round((totalEarned / totalPossible) * 100) : null)
    : _coerceNumber(summary.overall_percentage, null));
  const weakestCriteria = _weakestCriteria(criteria, 2);
  const strongestCriteria = _strongestCriteria(criteria, 2);
  const failingOverall = overallPercentage != null && overallPercentage < 50;

  if (evidenceState.insufficient) {
    const warning = _cleanText(
      evidenceState.warning || 'No readable student text was available for evaluation. Manual review is required.',
      1200,
    );
    return {
      overallMark: null,
      confidenceNote: warning,
      evidenceBasis: _cleanText('The ELT review detected insufficient readable submission text. Do not treat this as a zero; inspect the source document and extraction diagnostics manually.', 1200),
      criterionRows,
      feedback: {
        whereYouAreNow: warning,
        whereYouShouldBe: _cleanText('Readable submission text is required before criterion-level grading can be defended.', 2400),
        relationToOutcomes: _cleanText(courseObjectives.join(' | ') || 'Course outcomes still need to be applied manually once readable text is available.', 2400),
        whatToDoNext: _cleanText('Open the submission in the in-app viewer, run extraction diagnostics, and complete the review manually rather than accepting an AI score.', 2400),
      },
      actionItems: [
        'Open the submission in the in-app viewer and inspect the original file manually.',
        'Run the extraction check and confirm whether the document can be read reliably.',
        'Do not accept or release an AI score until readable evidence is available.',
      ],
      integrity: {
        advisory: true,
        suspicionScore: 0,
        confidenceBand: 'low',
        reasons: [],
        requiredHumanFollowUp: '',
        recommendedStaffAction: '',
      },
      gradingSummary: {
        overall_percentage: null,
        total_points_earned: null,
        total_points_possible: totalPossible,
        letter_grade: '',
      },
    };
  }

  const failExplanation = failingOverall
    ? _cleanText(
      `The preliminary mark is below the 50% pass threshold because ${weakestCriteria.length ? weakestCriteria.map((row) => _criterionFailSummary(row)).join(' ') : 'the current evidence does not yet meet pass standard across the rubric.'}`,
      1200,
    )
    : '';
  const nextStepText = failingOverall
    ? _cleanText(
      weakestCriteria.length
        ? weakestCriteria.map((row) => `To reach a pass, strengthen ${_criterionImproveSummary(row)}`).join(' ')
        : 'To reach a pass, strengthen the weakest criteria with clearer evidence and closer alignment to the task requirements.',
      2400,
    )
    : _cleanText((Array.isArray(eltAssessment?.annotations) ? eltAssessment.annotations : [])
      .map((item) => item?.suggested_revision)
      .filter(Boolean)
      .slice(0, 4)
      .join(' '), 2400);

  return {
    overallMark: overallPercentage,
    confidenceNote: failingOverall
      ? failExplanation
      : _cleanText(`ELT Assessment Specialist review generated from structured submission text.`, 1200),
    evidenceBasis: _cleanText(`Vertex ELT review based on normalized submission text and rubric criteria.`, 1200),
    criterionRows,
    feedback: {
      whereYouAreNow: failingOverall
        ? _cleanText(`${failExplanation}${strongestCriteria.length ? ` The strongest evidence remains in ${strongestCriteria.map((row) => _cleanText(row?.criterion_name, 120)).join(', ')}, but it does not yet offset the weaker criteria.` : ''}`, 2400)
        : _cleanText(holistic?.strengths_summary, 2400),
      whereYouShouldBe: failingOverall
        ? nextStepText
        : _cleanText(holistic?.areas_for_improvement, 2400),
      relationToOutcomes: failingOverall
        ? _cleanText(`Because the script is currently below 50%, the evidence does not yet show secure achievement of ${courseObjectives.join(' | ') || 'the course outcomes'}. The weakest alignment sits in ${weakestCriteria.map((row) => _cleanText(row?.criterion_name, 120)).join(', ') || 'the weakest criteria noted above'}.`, 2400)
        : _cleanText(holistic?.alignment_with_course_goals || courseObjectives.join(' | '), 2400),
      whatToDoNext: nextStepText,
    },
    actionItems: (Array.isArray(eltAssessment?.annotations) ? eltAssessment.annotations : [])
      .map((item) => _cleanText(item?.suggested_revision, 280))
      .filter(Boolean)
      .slice(0, 5)
      .concat(failingOverall && weakestCriteria.length
        ? weakestCriteria.map((row) => _cleanText(`Improve ${row?.criterion_name} first because it is currently keeping the submission below the 50% pass threshold.`, 280))
        : [])
      .filter(Boolean)
      .slice(0, 5),
    integrity: {
      advisory: true,
      suspicionScore: 0,
      confidenceBand: 'low',
      reasons: [],
      requiredHumanFollowUp: '',
      recommendedStaffAction: '',
    },
    gradingSummary: {
      overall_percentage: overallPercentage,
      total_points_earned: totalEarned,
      total_points_possible: totalPossible,
      letter_grade: _cleanText(summary?.letter_grade, 20) || (overallPercentage == null ? '' : _deriveLetterGrade(overallPercentage)),
    },
  };
}

export function buildEltAssessmentMeta({
  generatedAt = new Date().toISOString(),
  generatedByUid = '',
  generatedByName = '',
  sourceTextLength = 0,
  truncated = false,
} = {}) {
  return {
    generatedAt: _cleanText(generatedAt, 80),
    generatedByUid: _cleanText(generatedByUid, 120),
    generatedByName: _cleanText(generatedByName, 160),
    model: 'vertex-auto',
    provider: 'vertex-ai',
    schemaVersion: 'elt-assessment-v1',
    sourceTextLength: _coerceNumber(sourceTextLength, 0),
    truncated: Boolean(truncated),
  };
}
