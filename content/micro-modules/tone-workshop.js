// content/micro-modules/tone-workshop.js
// ── Skill: academic_tone ──────────────────────

export const MODULE = {
  id:       'tone-workshop',
  title:    'Tone Workshop',
  skill:    'academic_tone',
  maxScore: 5,
  tagline:  'Transform your writing into appropriate academic register',
  duration: '15–20 min',
  icon:     '✍',

  system: `You are an academic writing tutor at a South African university evaluating a student's register transformation exercise.

The student was asked to rewrite four informal sentences in academic style. Evaluate their rewrite against:
1. Formality: Avoidance of contractions, slang, colloquialisms, and first-person "I think/I feel".
2. Objectivity: Claims are attributed or hedged rather than stated as personal beliefs.
3. Precision: Vague words (things, stuff, a lot, really, very) replaced with specific academic vocabulary.
4. Nominalisation: Verbs converted to noun phrases where appropriate (e.g., "investigate" → "investigation of").
5. Hedging: Appropriate use of modal verbs and adverbs (may, might, appears to, suggests).

Return ONLY valid JSON — no markdown fences:
{"score":<0-5 integer>,"strengths":"<one specific thing done well>","improve":"<one concrete suggestion>","example":"<show how one of their sentences could be improved further>"}`,

  buildPrompt(text) {
    return `Student's academic rewrite:\n\n"${text}"\n\nEvaluate and return JSON feedback.`;
  },

  parseScore(data) { return data.score ?? 0; },

  html() {
    return `
    <div class="mm-header">
      <button class="mm-back-btn" id="mm-back-btn">← Dashboard</button>
      <div class="mm-title-group">
        <span class="mm-icon">✍</span>
        <div>
          <h1 class="mm-title">Tone Workshop</h1>
          <div class="mm-meta"><span class="mm-skill-tag">Academic Tone</span> · 15–20 min</div>
        </div>
      </div>
    </div>

    <div class="mm-body">

      <div class="mm-section">
        <h2>What is academic register?</h2>
        <p>Register refers to the level of formality appropriate for a given context. Academic writing demands
        a formal, impersonal, and precise register — very different from everyday conversation or social media.
        Inappropriate register is one of the main reasons student essays lose marks at university level.</p>
        <p>Five features define strong academic register:</p>
        <div class="mm-framework">
          <div class="mm-fw-row"><span class="mm-letter" style="background:#6366f1">F</span><div><strong>Formality</strong> — No contractions (don't → do not), no slang, no first-person "I feel/I think".</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#0ea5e9">O</span><div><strong>Objectivity</strong> — Attribute claims to sources rather than stating them as personal beliefs.</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#10b981">P</span><div><strong>Precision</strong> — Replace vague words (things, a lot, very) with specific academic vocabulary.</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#f59e0b">N</span><div><strong>Nominalisation</strong> — Convert verbs into noun phrases: "studied" → "the study of".</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#8b5cf6">H</span><div><strong>Hedging</strong> — Show appropriate certainty: "may suggest", "appears to indicate", "is likely to".</div></div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Worked example</h2>
        <div class="mm-example-box">
          <div class="mm-ex-weak">
            <div class="mm-ex-tag mm-tag-weak">✗ Informal</div>
            <p>"I think AI is gonna change everything about how students learn stuff at university. It's a really big deal and teachers don't really get it yet."</p>
          </div>
          <div class="mm-ex-strong">
            <div class="mm-ex-tag mm-tag-strong">✓ Academic</div>
            <p>"Artificial intelligence appears poised to significantly transform pedagogical practices in higher education. Scholars suggest that many academic staff have yet to fully engage with the implications of these technological developments for teaching and learning (Selwyn, 2022)."</p>
          </div>
        </div>
        <div class="mm-anno-grid">
          <div class="mm-anno-item"><span class="mm-anno-tag">✓ Formal</span> "appears poised" replaces "gonna"</div>
          <div class="mm-anno-item"><span class="mm-anno-tag">✓ Objective</span> "Scholars suggest" replaces "I think"</div>
          <div class="mm-anno-item"><span class="mm-anno-tag">✓ Precise</span> "pedagogical practices" replaces "stuff"</div>
          <div class="mm-anno-item"><span class="mm-anno-tag">✓ Hedged</span> "have yet to fully engage" vs "don't really get it"</div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Your turn</h2>
        <div class="mm-task-box">
          <p><strong>Task:</strong> Rewrite all four sentences below in appropriate academic style. Number your rewrites 1–4.</p>
          <div class="mm-task-given">
            <div class="mm-task-item"><span class="mm-task-label">1.</span> "Lots of students struggle with university because the work is just too hard and no one explains things properly."</div>
            <div class="mm-task-item"><span class="mm-task-label">2.</span> "I feel like social media is making people dumber and they can't focus anymore."</div>
            <div class="mm-task-item"><span class="mm-task-label">3.</span> "We did an experiment and found out that reading on a screen isn't as good as reading a proper book."</div>
            <div class="mm-task-item"><span class="mm-task-label">4.</span> "It's super important that universities don't just teach students facts but also teach them how to think."</div>
          </div>
          <textarea id="mm-practice-ta" class="mm-textarea" rows="10"
            placeholder="1. [Your academic rewrite of sentence 1]&#10;&#10;2. [Your academic rewrite of sentence 2]&#10;&#10;3. [Your academic rewrite of sentence 3]&#10;&#10;4. [Your academic rewrite of sentence 4]"
            oninput="document.getElementById('mm-charcount').textContent=this.value.length"></textarea>
          <div class="mm-ta-meta"><span id="mm-charcount">0</span> characters</div>
          <button id="mm-submit-btn" class="mm-submit-btn" onclick="window._submitMicroModule()">Get AI Feedback →</button>
        </div>
      </div>

      <div id="mm-feedback" class="mm-feedback" style="display:none;"></div>

    </div>`;
  }
};
