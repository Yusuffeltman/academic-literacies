// content/micro-modules/argument-builder.js
// ── Skill: argument_structure ─────────────────

export const MODULE = {
  id:       'argument-builder',
  title:    'Argument Builder',
  skill:    'argument_structure',
  maxScore: 5,
  tagline:  'Construct logical, persuasive academic arguments',
  duration: '15–20 min',
  icon:     '🗺',

  system: `You are an academic argumentation tutor at a South African university evaluating a student's structured argument.

Assess against these criteria:
1. Clarity of claim: Is the position clear, specific, and arguable (not just a fact or opinion)?
2. Quality of reasoning: Does the student explain WHY the claim is true (logical warrants)?
3. Use of evidence: Is evidence cited, specific, and relevant — not vague?
4. Counterargument: Does the student acknowledge and respond to an opposing view?
5. Logical coherence: Do all parts work together toward one clear position?

Return ONLY valid JSON — no markdown fences:
{"score":<0-5 integer>,"strengths":"<one specific strength>","improve":"<one concrete suggestion>","example":"<rewrite or add one sentence to demonstrate the improvement>"}`,

  buildPrompt(text) {
    return `Student's structured argument:\n\n"${text}"\n\nEvaluate and return JSON feedback.`;
  },

  parseScore(data) { return data.score ?? 0; },

  html() {
    return `
    <div class="mm-header">
      <button class="mm-back-btn" id="mm-back-btn">← Dashboard</button>
      <div class="mm-title-group">
        <span class="mm-icon">🗺</span>
        <div>
          <h1 class="mm-title">Argument Builder</h1>
          <div class="mm-meta"><span class="mm-skill-tag">Argument Structure</span> · 15–20 min</div>
        </div>
      </div>
    </div>

    <div class="mm-body">

      <div class="mm-section">
        <h2>What makes an academic argument?</h2>
        <p>An academic argument is not a fight — it is a reasoned case for a specific position, supported by
        evidence and acknowledging alternative views. A common failure is confusing <em>describing</em> a topic
        with <em>arguing</em> a position: description tells us what; argument tells us why and so what.</p>
        <p>Use this four-part structure to build a complete, convincing academic argument:</p>
        <div class="mm-framework">
          <div class="mm-fw-row"><span class="mm-letter" style="background:#6366f1">C</span><div><strong>Claim</strong> — Your arguable position on the topic. Must be specific and debatable.</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#0ea5e9">R</span><div><strong>Reasoning</strong> — The logical explanation for why your claim is true.</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#10b981">E</span><div><strong>Evidence</strong> — Specific, cited support that grounds your reasoning in scholarship.</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#f59e0b">C</span><div><strong>Counterargument + Response</strong> — Acknowledge a credible opposing view, then refute or qualify it.</div></div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Worked example</h2>
        <p class="mm-example-label">Topic: Should universities provide free higher education?</p>
        <div class="mm-example-box">
          <div class="mm-ex-weak">
            <div class="mm-ex-tag mm-tag-weak">✗ Weak — description, not argument</div>
            <p>"Free education is a topic that many people discuss. Some people think universities should be free and others disagree. There are advantages and disadvantages. Education is important for South Africa's development."</p>
          </div>
          <div class="mm-ex-strong">
            <div class="mm-ex-tag mm-tag-strong">✓ Strong — structured argument</div>
            <p><strong>Claim:</strong> South Africa should implement a fully subsidised higher education system for students from households earning below R350,000 per year.</p>
            <p><strong>Reasoning:</strong> Financial barriers disproportionately exclude historically disadvantaged communities from university access, entrenching post-apartheid inequalities in the knowledge economy.</p>
            <p><strong>Evidence:</strong> The CHE (2016) found that 72% of university dropouts cited financial reasons, and Statistics South Africa (2019) reports that only 6% of Black South Africans hold degrees compared to 33% of white South Africans.</p>
            <p><strong>Counter + Response:</strong> Critics argue that fee-free education is fiscally unsustainable; however, comparative models from Germany and Norway demonstrate that well-structured public funding — supported by progressive taxation — can sustain quality tertiary education without institutional collapse (Usher, 2018).</p>
          </div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Your turn</h2>
        <div class="mm-task-box">
          <p><strong>Task:</strong> Build a structured academic argument using the CREC framework. Include all four components, clearly labelled.</p>
          <div class="mm-task-given">
            <div class="mm-task-item"><span class="mm-task-label">Topic:</span> Should South African universities require students to complete a module on academic integrity and AI use?</div>
            <div class="mm-task-item"><span class="mm-task-label">Tip:</span> Write a clear Claim first (one sentence), then your Reasoning, then cite or reference at least one source for Evidence, then address a Counterargument and respond to it.</div>
          </div>
          <textarea id="mm-practice-ta" class="mm-textarea" rows="10"
            placeholder="Claim: [Your arguable position]&#10;&#10;Reasoning: [Why is this true?]&#10;&#10;Evidence: [Cited support]&#10;&#10;Counterargument: [Opposing view] — Response: [Your refutation or qualification]"
            oninput="document.getElementById('mm-charcount').textContent=this.value.length"></textarea>
          <div class="mm-ta-meta"><span id="mm-charcount">0</span> characters · aim for 200+</div>
          <button id="mm-submit-btn" class="mm-submit-btn" onclick="window._submitMicroModule()">Get AI Feedback →</button>
        </div>
      </div>

      <div id="mm-feedback" class="mm-feedback" style="display:none;"></div>

    </div>`;
  }
};
