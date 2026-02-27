// content/micro-modules/evidence-booster.js
// ── Skill: evidence_use ───────────────────────

export const MODULE = {
  id:       'evidence-booster',
  title:    'Evidence Booster',
  skill:    'evidence_use',
  maxScore: 5,
  tagline:  'Master evidence integration with the PEEL structure',
  duration: '15–20 min',
  icon:     '🔬',

  system: `You are an academic writing coach at a South African university marking a student's PEEL paragraph.

Evaluate against these four criteria (each 0–5, averaged for overall score):
1. Integration: Evidence is woven in (introduced + cited), not just dropped.
2. Analysis: Student explains what the evidence shows and why it supports the claim.
3. PEEL structure: Identifiable Point → Evidence → Explain → Link sequence.
4. Academic register: Formal, third-person, hedged language.

Return ONLY valid JSON — no markdown fences, no extra text:
{"score":<0-5 integer>,"strengths":"<one specific thing done well>","improve":"<one concrete, actionable suggestion>","example":"<rewrite one weak sentence from the student's paragraph to show improvement>"}`,

  buildPrompt(text) {
    return `Student PEEL paragraph:\n\n"${text}"\n\nEvaluate and return JSON feedback.`;
  },

  parseScore(data) { return data.score ?? 0; },

  html() {
    return `
    <div class="mm-header">
      <button class="mm-back-btn" id="mm-back-btn">← Dashboard</button>
      <div class="mm-title-group">
        <span class="mm-icon">🔬</span>
        <div>
          <h1 class="mm-title">Evidence Booster</h1>
          <div class="mm-meta"><span class="mm-skill-tag">Using Evidence</span> · 15–20 min</div>
        </div>
      </div>
    </div>

    <div class="mm-body">

      <div class="mm-section">
        <h2>Why evidence integration matters</h2>
        <p>Dropping a quotation into a paragraph without analysis is one of the most common weaknesses in
        undergraduate writing. Strong academic writers don't just cite evidence — they <em>integrate</em> it:
        introducing the source, presenting the data, and then explaining what it means for their argument.</p>
        <p>The <strong>PEEL</strong> structure gives you a reliable scaffold for this process:</p>
        <div class="mm-framework">
          <div class="mm-fw-row"><span class="mm-letter" style="background:#6366f1">P</span><div><strong>Point</strong> — State your argument claim clearly at the start of the paragraph.</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#0ea5e9">E</span><div><strong>Evidence</strong> — Introduce your source, then present the quotation or paraphrase.</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#10b981">E</span><div><strong>Explain</strong> — Analyse what the evidence shows; connect it explicitly to your claim.</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#f59e0b">L</span><div><strong>Link</strong> — Connect back to the broader argument or essay question.</div></div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Worked example</h2>
        <p class="mm-example-label">Topic: The impact of social media on student academic performance</p>
        <div class="mm-example-box">
          <div class="mm-ex-weak">
            <div class="mm-ex-tag mm-tag-weak">✗ Weak — evidence dropped</div>
            <p>"Social media harms student grades. 'Students who used social media during study time scored 15% lower on tests' (Kirschner &amp; Karpinski, 2010). This shows it is bad."</p>
          </div>
          <div class="mm-ex-strong">
            <div class="mm-ex-tag mm-tag-strong">✓ Strong — evidence integrated</div>
            <p>"Social media use during study sessions measurably impairs academic performance. <mark>Kirschner and Karpinski (2010) found that</mark> students who accessed social media while studying scored 15% lower on assessments than those who did not. <mark>This suggests that</mark> the cognitive interruption of task-switching undermines information retention — a finding with direct implications for how students structure their study environments. <mark>Therefore,</mark> managing digital distraction is not merely a matter of self-discipline, but of evidence-based study strategy."</p>
          </div>
        </div>
        <p class="mm-note">The strong version introduces the source, presents the data, explains its significance, and links it to the broader argument.</p>
      </div>

      <div class="mm-section">
        <h2>Your turn</h2>
        <div class="mm-task-box">
          <p><strong>Task:</strong> Using the claim and evidence provided below, write a PEEL paragraph (minimum 4 sentences) that integrates <em>both</em> pieces of evidence.</p>
          <div class="mm-task-given">
            <div class="mm-task-item"><span class="mm-task-label">Claim:</span> Digital literacy skills are essential for students in contemporary higher education.</div>
            <div class="mm-task-item"><span class="mm-task-label">Evidence A:</span> According to Ng (2012), digital literacy encompasses three interconnected dimensions: technical competence, cognitive ability, and socio-emotional awareness.</div>
            <div class="mm-task-item"><span class="mm-task-label">Evidence B:</span> A survey of 1,200 South African university students found that 67% struggled to evaluate the credibility of online sources (Czerniewicz et al., 2020).</div>
          </div>
          <textarea id="mm-practice-ta" class="mm-textarea" rows="8"
            placeholder="Start with your point (claim), then introduce and present Evidence A, explain its significance, then introduce and present Evidence B, explain it, and link back to your claim…"
            oninput="document.getElementById('mm-charcount').textContent=this.value.length"></textarea>
          <div class="mm-ta-meta"><span id="mm-charcount">0</span> characters · aim for 150+</div>
          <button id="mm-submit-btn" class="mm-submit-btn" onclick="window._submitMicroModule()">Get AI Feedback →</button>
        </div>
      </div>

      <div id="mm-feedback" class="mm-feedback" style="display:none;"></div>

    </div>`;
  }
};
