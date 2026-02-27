// content/micro-modules/source-skills.js
// ── Skill: source_evaluation ──────────────────

export const MODULE = {
  id:       'source-skills',
  title:    'Source Skills',
  skill:    'source_evaluation',
  maxScore: 5,
  tagline:  'Evaluate sources critically using the SIFT method',
  duration: '15–20 min',
  icon:     '🔍',

  system: `You are an information literacy tutor at a South African university evaluating a student's source evaluation response.

The student was given three sources on AI in education and asked to rank them by academic credibility and justify their ranking. Evaluate against:
1. Correct identification: Did the student identify the peer-reviewed/scholarly source as most credible?
2. Reasoning quality: Does the student cite specific credibility indicators (peer review, author credentials, publication type, recency, methodology)?
3. Critical thinking: Does the student go beyond surface features (e.g., not just "it's from a journal so it's good")?
4. SIFT application: Does the student show evidence of investigating the source and tracing claims?
5. Nuance: Does the student acknowledge limitations even of credible sources?

Return ONLY valid JSON — no markdown fences:
{"score":<0-5 integer>,"strengths":"<one specific strength in their evaluation>","improve":"<one concrete suggestion>","example":"<demonstrate how to strengthen one part of their evaluation>"}`,

  buildPrompt(text) {
    return `Student's source evaluation:\n\n"${text}"\n\nEvaluate and return JSON feedback.`;
  },

  parseScore(data) { return data.score ?? 0; },

  html() {
    return `
    <div class="mm-header">
      <button class="mm-back-btn" id="mm-back-btn">← Dashboard</button>
      <div class="mm-title-group">
        <span class="mm-icon">🔍</span>
        <div>
          <h1 class="mm-title">Source Skills</h1>
          <div class="mm-meta"><span class="mm-skill-tag">Source Evaluation</span> · 15–20 min</div>
        </div>
      </div>
    </div>

    <div class="mm-body">

      <div class="mm-section">
        <h2>Why source evaluation matters</h2>
        <p>In the age of AI-generated content and misinformation, the ability to evaluate sources critically is
        a core academic skill. A single unreliable source can undermine an otherwise strong argument.
        Experienced researchers don't just ask "Does this support my point?" — they ask "Can I trust this,
        and how much?"</p>
        <p>The <strong>SIFT</strong> method offers a practical framework for rapid source evaluation:</p>
        <div class="mm-framework">
          <div class="mm-fw-row"><span class="mm-letter" style="background:#6366f1">S</span><div><strong>Stop</strong> — Pause before sharing or citing. Ask: do I know enough about this source?</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#0ea5e9">I</span><div><strong>Investigate the source</strong> — Who wrote it? What are their credentials? Who published it?</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#10b981">F</span><div><strong>Find better coverage</strong> — Is this the best available source, or is there a more authoritative one?</div></div>
          <div class="mm-fw-row"><span class="mm-letter" style="background:#f59e0b">T</span><div><strong>Trace claims</strong> — Follow evidence back to its original source; don't cite secondary reports of data.</div></div>
        </div>
        <div class="mm-tip-box">
          <strong>Key credibility indicators:</strong> Peer-reviewed publication · Named expert author with institutional affiliation · Clear methodology · Recent publication date · DOI or verifiable citation · No obvious ideological agenda
        </div>
      </div>

      <div class="mm-section">
        <h2>The three sources</h2>
        <p class="mm-example-label">Topic: The impact of AI tools on academic integrity in higher education</p>
        <div class="mm-sources-grid">
          <div class="mm-source-card">
            <div class="mm-source-label">Source A</div>
            <p><strong>Title:</strong> "AI Writing Tools and Academic Integrity: A Systematic Review"</p>
            <p><strong>Author:</strong> Dr Priya Naidoo, Associate Professor of Educational Technology, University of Cape Town</p>
            <p><strong>Publication:</strong> <em>Higher Education Research &amp; Development</em> (Taylor &amp; Francis), Vol. 42, Issue 3, 2023</p>
            <p><strong>Method:</strong> Systematic review of 47 peer-reviewed studies (2019–2023)</p>
            <p><strong>DOI:</strong> Available</p>
          </div>
          <div class="mm-source-card">
            <div class="mm-source-label">Source B</div>
            <p><strong>Title:</strong> "ChatGPT is Destroying Universities — Here's Why"</p>
            <p><strong>Author:</strong> Anonymous contributor</p>
            <p><strong>Publication:</strong> Medium blog post, published March 2023</p>
            <p><strong>Method:</strong> Opinion piece; cites "recent studies" without references</p>
            <p><strong>DOI:</strong> None</p>
          </div>
          <div class="mm-source-card">
            <div class="mm-source-label">Source C</div>
            <p><strong>Title:</strong> <em>Teaching in the Age of AI: Strategies for Higher Education</em></p>
            <p><strong>Author:</strong> Dr Sipho Dlamini, Senior Lecturer, University of the Witwatersrand</p>
            <p><strong>Publication:</strong> HSRC Press, 2022 (Book, ISBN available)</p>
            <p><strong>Method:</strong> Qualitative case studies across 5 South African universities</p>
            <p><strong>DOI:</strong> N/A (book)</p>
          </div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Your turn</h2>
        <div class="mm-task-box">
          <p><strong>Task:</strong> Rank Sources A, B, and C from most to least academically credible. For each source, explain your reasoning using specific credibility indicators from the SIFT framework.</p>
          <textarea id="mm-practice-ta" class="mm-textarea" rows="10"
            placeholder="Most credible: Source [X] because…&#10;&#10;Second: Source [X] because…&#10;&#10;Least credible: Source [X] because…&#10;&#10;I would / would not use Source [X] in an assignment because…"
            oninput="document.getElementById('mm-charcount').textContent=this.value.length"></textarea>
          <div class="mm-ta-meta"><span id="mm-charcount">0</span> characters · aim for 150+</div>
          <button id="mm-submit-btn" class="mm-submit-btn" onclick="window._submitMicroModule()">Get AI Feedback →</button>
        </div>
      </div>

      <div id="mm-feedback" class="mm-feedback" style="display:none;"></div>

    </div>`;
  }
};
