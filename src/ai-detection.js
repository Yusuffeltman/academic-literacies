// src/ai-detection.js
// ─────────────────────────────────────────────
// AI Detection & Writing Profile Analysis
// Builds baseline writing profiles from student work and detects potential AI use
// ─────────────────────────────────────────────

/**
 * Extract writing features from a text sample
 * Returns: {
 *   avgSentenceLength, sentenceLengthVariance, avgWordLength,
 *   uniqueWordRatio, complexityScore, formalityScore, hasCommaSpice,
 *   hedgingPhrases, genericPhrases, repetitionIndex, specificity
 * }
 */
export function extractWritingFeatures(text) {
  if (!text || text.length < 30) return null;

  text = text.trim();
  const sentences = text.match(/[^.!?]+[.!?]+/g) || [];
  const words = text.toLowerCase().split(/\s+/).filter(w => w.length > 0);
  const uniqueWords = new Set(words);

  // Sentence-level analysis
  const sentenceLengths = sentences.map(s => s.trim().split(/\s+/).length);
  const avgSentenceLength = sentenceLengths.length > 0 
    ? sentenceLengths.reduce((a, b) => a + b, 0) / sentenceLengths.length 
    : 0;
  const sentenceLengthVariance = sentenceLengths.length > 1
    ? Math.sqrt(sentenceLengths.reduce((sq, len) => sq + Math.pow(len - avgSentenceLength, 2), 0) / sentenceLengths.length)
    : 0;

  // Word-level analysis
  const avgWordLength = words.length > 0 
    ? words.reduce((sum, w) => sum + w.length, 0) / words.length 
    : 0;
  const uniqueWordRatio = words.length > 0 ? uniqueWords.size / words.length : 0;

  // Complexity: % of words > 5 chars, % of sentences > 15 words
  const complexWords = words.filter(w => w.length > 5).length;
  const complexSentences = sentenceLengths.filter(l => l > 15).length;
  const complexityScore = (complexWords / Math.max(words.length, 1) + 
                           complexSentences / Math.max(sentences.length, 1)) / 2;

  // Formality: detect academic markers and contractions
  const academicMarkers = (text.match(/\b(however|furthermore|thus|consequently|argue|suggest|evidence|demonstrate|indicate)\b/gi) || []).length;
  const contractions = (text.match(/\b(don't|can't|won't|isn't|aren't|doesn't|haven't)\b/gi) || []).length;
  const formalityScore = (academicMarkers / Math.max(sentences.length, 1)) * 2 - (contractions / Math.max(words.length, 100)) * 0.1;

  // Detect comma splices (sign of human error, lack of AI)
  const commaSplices = (text.match(/,[^.!?]{20,}[a-z]/g) || []).length;
  const hasCommaSpice = commaSplices > 0;

  // Hedging phrases (both AI and human use, but AI overuses)
  const hedgingPhrases = (text.match(/\b(may|might|could|perhaps|arguably|seems|appears|suggests|indicates)\b/gi) || []).length;

  // Generic phrases (strong AI signal)
  const genericPatterns = [
    /\b(in today's world|in the modern era|in contemporary society|in this day and age)\b/i,
    /\b(as we can see|it is important to|furthermore|moreover|in addition)\b/i,
    /\b(plays a crucial role|is essential|is vital|cannot be overstated)\b/i,
    /\b(various aspects|different perspectives|many people believe)\b/i,
  ];
  const genericPhrases = genericPatterns.reduce((count, pattern) => count + (text.match(pattern) ? 1 : 0), 0);

  // Repetition index: track word reuse (humans repeat less precisely)
  const wordFreq = {};
  words.forEach(w => {
    if (w.length > 4) wordFreq[w] = (wordFreq[w] || 0) + 1;
  });
  const repetitionIndex = Object.values(wordFreq).filter(f => f > 2).length / Math.max(Object.keys(wordFreq).length, 1);

  // Specificity: number of specific details (examples, numbers, named things)
  const specificity = (
    (text.match(/\d+/g) || []).length +
    (text.match(/[A-Z][a-z]+\s+[A-Z][a-z]+/g) || []).length * 2 +
    (text.match(/\b(for example|such as|like|including)\b/gi) || []).length * 2
  ) / Math.max(sentences.length, 1);

  return {
    textLength: text.length,
    sentenceCount: sentences.length,
    wordCount: words.length,
    avgSentenceLength,
    sentenceLengthVariance,
    avgWordLength,
    uniqueWordRatio,
    complexityScore,
    formalityScore,
    hasCommaSpice,
    hedgingPhrases,
    genericPhrases,
    repetitionIndex,
    specificity,
  };
}

/**
 * Build a baseline profile from multiple writing samples
 * baseline = average of all samples
 */
export function buildBaselineProfile(samples) {
  if (!samples || samples.length === 0) return null;

  const features = samples
    .map(s => extractWritingFeatures(s))
    .filter(f => f !== null);

  if (features.length === 0) return null;

  const baseline = {};
  const keys = Object.keys(features[0]);
  keys.forEach(k => {
    const vals = features.map(f => f[k]).filter(v => typeof v === 'number');
    baseline[k] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  baseline.sampleCount = features.length;

  return baseline;
}

/**
 * Score a submission for potential AI use
 * Compares against baseline and checks for AI tell-tale signs
 * Returns: {
 *   suspicionScore (0-100),
 *   reasons: [],
 *   isRiskFlag: boolean,
 *   recommendation: string
 * }
 */
export function scoreSubmissionForAI(text, baseline) {
  if (!text || text.length < 30) {
    return {
      suspicionScore: 0,
      reasons: ['Text too short to analyze meaningfully.'],
      isRiskFlag: false,
      recommendation: 'Submission is too brief—expand your response.',
    };
  }

  if (!baseline || baseline.sampleCount === 0) {
    return {
      suspicionScore: 0,
      reasons: ['No baseline established yet. Keep writing authentically!'],
      isRiskFlag: false,
      recommendation: 'We will develop your profile as you submit more work.',
    };
  }

  const current = extractWritingFeatures(text);
  if (!current) {
    return {
      suspicionScore: 0,
      reasons: [],
      isRiskFlag: false,
      recommendation: 'Submission accepted.',
    };
  }

  const reasons = [];
  let suspicionScore = 0;

  // 1. Perfect formality (AI signal) combined with lack of commas splices
  if (!current.hasCommaSpice && current.formalityScore > baseline.formalityScore * 1.3) {
    suspicionScore += 15;
    reasons.push('Unusually formal language with no natural errors.');
  }

  // 2. Low sentence length variance (all sentences similar length = AI)
  if (current.sentenceLengthVariance < baseline.sentenceLengthVariance * 0.6) {
    suspicionScore += 12;
    reasons.push('Sentences are all very similar length—human writing varies more.');
  }

  // 3. Excessive generic phrases
  if (current.genericPhrases > baseline.genericPhrases + 2) {
    suspicionScore += 18;
    reasons.push(`Many generic phrases ("in today's world", "plays a crucial role", etc.)—strong AI indicator.`);
  }

  // 4. High hedging but low specificity (AI hedge without backing)
  if (current.hedgingPhrases > baseline.hedgingPhrases * 1.5 && current.specificity < baseline.specificity * 0.7) {
    suspicionScore += 14;
    reasons.push('Excessive hedging ("may", "could", "appears") without specific examples.');
  }

  // 5. Unusually high unique word ratio (AI uses more varied vocab, sometimes too much)
  if (current.uniqueWordRatio > baseline.uniqueWordRatio * 1.2 && current.specificityScore > baseline.specificity * 1.3) {
    suspicionScore += 10;
    reasons.push('Vocabulary diversity is unusually high for your profile.');
  }

  // 6. Dramatic deviation in complexity from personal baseline
  const complexityDelta = Math.abs(current.complexityScore - baseline.complexityScore);
  if (complexityDelta > 0.25) {
    suspicionScore += 10;
    reasons.push(`Writing complexity jumped unexpectedly (${(complexityDelta * 100).toFixed(0)}% change).`);
  }

  // 7. Perfect average sentence length (AI is more consistent)
  if (current.avgSentenceLength > baseline.avgSentenceLength * 0.9 && 
      current.avgSentenceLength < baseline.avgSentenceLength * 1.1 &&
      current.sentenceLengthVariance < 4) {
    suspicionScore += 8;
    reasons.push('Average sentence length is suspiciously consistent with your baseline.');
  }

  // 8. Very high word count with low specificity (padding)
  if (current.wordCount > 500 && current.specificity < 0.5) {
    suspicionScore += 12;
    reasons.push('Long response with few specific details or examples.');
  }

  // 9. Deviation in average word length (AI tends to pick more complex words)
  const wordLengthDelta = Math.abs(current.avgWordLength - baseline.avgWordLength);
  if (wordLengthDelta > 1) {
    suspicionScore += 8;
    reasons.push(`Average word length differs significantly from your writing pattern.`);
  }

  // Clamp to 0-100
  suspicionScore = Math.min(100, suspicionScore);

  // Determine risk flag and recommendation
  let isRiskFlag = false;
  let recommendation = '';

  if (suspicionScore >= 60) {
    isRiskFlag = true;
    recommendation = `⚠️ CAUTION: This submission shows multiple signs that may indicate AI generation. This would violate academic integrity. Please review the feedback and resubmit with your own authentic thinking. Your tutor will notice.`;
  } else if (suspicionScore >= 40) {
    isRiskFlag = false;
    recommendation = '🔍 Your response differs noticeably from your usual writing style. If you used AI, please acknowledge it in your next submission and explain why. Unacknowledged AI use is treated as plagiarism.';
  } else if (suspicionScore >= 20) {
    recommendation = '✓ This looks authentic, but keep developing your unique voice.';
  } else {
    recommendation = '✅ This matches your writing profile. Great work!';
  }

  return {
    suspicionScore: Math.round(suspicionScore),
    reasons,
    isRiskFlag,
    recommendation,
  };
}

/**
 * Extract all responses from student's persistent storage
 * Used to build baseline from all saved work
 */
export function extractStudentResponses(unitId) {
  const responses = [];

  // Reading task responses
  try {
    const rtKey = `acadlit-rt-v1:${unitId}`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(rtKey)) {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.writing) responses.push(data.writing);
        data.answers && Object.values(data.answers).forEach(a => { if (a) responses.push(a); });
      }
    }
  } catch {}

  // Visual task responses
  try {
    const vtKey = `acadlit-vt-v1:${unitId}`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(vtKey)) {
        const data = JSON.parse(localStorage.getItem(key));
        data.answers && Object.values(data.answers).forEach(a => { if (a) responses.push(a); });
      }
    }
  } catch {}

  // Session process writing responses
  try {
    const pwKey = `acadlit-pw-v1`;
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key.startsWith(pwKey)) {
        const data = JSON.parse(localStorage.getItem(key));
        if (data.text) responses.push(data.text);
      }
    }
  } catch {}

  return responses.filter(r => r && r.length > 30);
}

/**
 * Get or create a baseline profile for the current student
 * Looks in STATE if user is logged in, or localStorage
 */
export function getStudentBaselineProfile(unitId) {
  const storageKey = `acadlit-baseline:student:${unitId}`;
  
  try {
    const cached = localStorage.getItem(storageKey);
    if (cached) return JSON.parse(cached);
  } catch {}

  // Build fresh baseline from all responses in this unit
  const responses = extractStudentResponses(unitId);
  if (responses.length < 2) return null; // Need at least 2 samples

  const baseline = buildBaselineProfile(responses);
  
  // Cache it
  try {
    localStorage.setItem(storageKey, JSON.stringify(baseline));
  } catch {}

  return baseline;
}
