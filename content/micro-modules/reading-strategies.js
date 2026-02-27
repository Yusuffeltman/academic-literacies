// content/micro-modules/reading-strategies.js
// ── Skill: critical_reading ───────────────────

export const MODULE = {
  id:       'reading-strategies',
  title:    'Reading Strategies',
  skill:    'critical_reading',
  maxScore: 5,
  tagline:  'Read actively and critically for argument, evidence, and assumptions',
  duration: '15–20 min',
  icon:     '📖',

  system: `You are an academic reading tutor at a South African university evaluating a student's critical reading analysis.

The student was given a short academic excerpt and asked to identify: the main claim, key evidence, one underlying assumption, and one potential weakness. Evaluate against:
1. Claim identification: Did the student correctly identify the central argument (not a sub-point or background fact)?
2. Evidence: Did the student identify what type of evidence is used (statistical, anecdotal, theoretical) and assess its quality?
3. Assumption: Did the student identify a genuine assumption — an unstated premise the argument depends on — rather than an obvious stated point?
4. Weakness: Is the identified weakness substantive (methodological, scope, counter-evidence) rather than trivial?
5. Critical depth: Does the response go beyond surface description to genuine analytical engagement?

Return ONLY valid JSON — no markdown fences:
{"score":<0-5 integer>,"strengths":"<one strong aspect of their analysis>","improve":"<one thing to deepen the analysis>","example":"<demonstrate what a stronger version of their weakest component would look like>"}`,

  buildPrompt(text) {
    return `Student's critical reading analysis:\n\n"${text}"\n\nEvaluate and return JSON feedback.`;
  },

  parseScore(data) { return data.score ?? 0; },

  html() {
    return `
    <div class="mm-header">
      <button class="mm-back-btn" id="mm-back-btn">← Dashboard</button>
      <div class="mm-title-group">
        <span class="mm-icon">📖</span>
        <div>
          <h1 class="mm-title">Reading Strategies</h1>
          <div class="mm-meta"><span class="mm-skill-tag">Critical Reading</span> · 15–20 min</div>
        </div>
      </div>
    </div>

    <div class="mm-body">

      <div class="mm-section">
        <h2>Reading critically vs reading passively</h2>
        <p>Passive reading is extracting information: understanding what a text says. Critical reading goes
        further — it asks <em>how</em> and <em>why</em>. A critical reader interrogates the argument:
        What is the author claiming? What evidence supports it? What is being assumed? Where might this
        reasoning fail?</p>
        <p>This four-part framework will help you analyse any academic text critically:</p>
        <div class="mm-framework">
          <div class="mm-fw-row"><span class="mm-letter" style="background:#6366f1">C</span><div><strong>Claim</strong> — What is the main argument? (Not background, not a sub-point — the central thesis.)</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#0ea5e9">E</span><div><strong>Evidence</strong> — What type of evidence supports the claim? How strong/credible is it?</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#10b981">A</span><div><strong>Assumption</strong> — What unstated premise does the argument depend on? What must be true for the claim to hold?</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#f59e0b">W</span><div><strong>Weakness</strong> — Where is the argument vulnerable? What evidence or scenario could challenge it?</div></div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Worked example</h2>
        <p class="mm-example-label">Extract from Jacobs (2005, p. 3):</p>
        <blockquote class="mm-blockquote">
          "Academic literacy programmes that focus solely on surface-level writing skills — grammar, spelling, and sentence structure — fail to address the deeper epistemological challenges facing first-generation university students. What is required is an approach that integrates students into the disciplinary discourse communities of their chosen fields."
        </blockquote>
        <div class="mm-example-box">
          <div class="mm-ex-weak">
            <div class="mm-ex-tag mm-tag-weak">✗ Passive reading (surface)</div>
            <p><strong>Claim:</strong> "Academic literacy programmes aren't good enough."<br>
            <strong>Evidence:</strong> "The author says so."<br>
            <strong>Assumption:</strong> "That grammar is important."<br>
            <strong>Weakness:</strong> "It's a short extract."</p>
          </div>
          <div class="mm-ex-strong">
            <div class="mm-ex-tag mm-tag-strong">✓ Critical reading (analytical)</div>
            <p><strong>Claim:</strong> Academic literacy development requires disciplinary discourse community integration, not merely surface writing correction.</p>
            <p><strong>Evidence:</strong> The argument is theoretical/conceptual — no empirical data is provided. The strength rests on the authority of the framing, not quantitative evidence.</p>
            <p><strong>Assumption:</strong> That first-generation students' challenges are primarily epistemological (how knowledge is constructed in a discipline) rather than language-based. This assumption deserves scrutiny.</p>
            <p><strong>Weakness:</strong> The claim is prescriptive ("what is required") but does not demonstrate that discourse community integration programmes outperform grammar-focused ones in measurable outcomes.</p>
          </div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Your turn</h2>
        <div class="mm-task-box">
          <p><strong>Task:</strong> Read the extract below carefully, then analyse it using the CEAW framework.</p>
          <blockquote class="mm-blockquote" style="margin-bottom: 20px;">
            "The rapid adoption of large language model tools such as ChatGPT by university students raises urgent questions about the future of academic assessment. Surveys conducted across five South African universities in 2023 found that 71% of undergraduate students had used an AI writing tool at least once during their studies, yet fewer than 20% reported receiving formal guidance on ethical use from their institutions (Swart &amp; Pillay, 2024). These findings suggest that universities are ill-equipped to navigate the pedagogical and ethical implications of generative AI, and that the absence of institutional policy frameworks is creating an uneven, inequitable assessment landscape."
          </blockquote>
          <div class="mm-task-given">
            <div class="mm-task-item"><span class="mm-task-label">Claim:</span> What is the central argument? (One sentence)</div>
            <div class="mm-task-item"><span class="mm-task-label">Evidence:</span> What evidence is used? What type is it (statistical, qualitative, etc.) and how credible does it appear?</div>
            <div class="mm-task-item"><span class="mm-task-label">Assumption:</span> Identify one unstated assumption the argument depends on. Explain why it matters.</div>
            <div class="mm-task-item"><span class="mm-task-label">Weakness:</span> Identify one substantive weakness in the argument (methodological, scope, counter-evidence).</div>
          </div>
          <textarea id="mm-practice-ta" class="mm-textarea" rows="10"
            placeholder="Claim: …&#10;&#10;Evidence: …&#10;&#10;Assumption: …&#10;&#10;Weakness: …"
            oninput="document.getElementById('mm-charcount').textContent=this.value.length"></textarea>
          <div class="mm-ta-meta"><span id="mm-charcount">0</span> characters · aim for 150+</div>
          <button id="mm-submit-btn" class="mm-submit-btn" onclick="window._submitMicroModule()">Get AI Feedback →</button>
        </div>
      </div>

      <div id="mm-feedback" class="mm-feedback" style="display:none;"></div>

    </div>`;
  }
};
