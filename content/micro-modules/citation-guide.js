// content/micro-modules/citation-guide.js
// ── Skill: citation_practice ──────────────────

export const MODULE = {
  id:       'citation-guide',
  title:    'Citation Guide',
  skill:    'citation_practice',
  maxScore: 5,
  tagline:  'Master APA 7th edition in-text citations and reference lists',
  duration: '15–20 min',
  icon:     '📎',

  system: `You are an APA 7th edition citation expert at a South African university evaluating a student's citation practice exercise.

The student was asked to write three APA 7 in-text citations and three corresponding reference list entries.

Evaluate for accuracy against these APA 7 rules:
- In-text: (Author, Year) for paraphrase; (Author, Year, p. X) for direct quote; multiple authors: two authors = "Author & Author" (narrative) or (Author & Author, Year); 3+ authors = first author et al.
- Reference list: Author, A. A., & Author, B. B. (Year). Title in sentence case. Journal Name in Title Case, Volume(Issue), page–page. https://doi.org/xxxxx
- Book: Author, A. A. (Year). Title of work: Capital letter also for subtitle. Publisher.
- Website: Author, A. A. (Year, Month Day). Title of webpage. Site Name. URL

Award partial credit for near-misses (e.g. correct structure but minor punctuation error).

Return ONLY valid JSON — no markdown fences:
{"score":<0-5 integer>,"strengths":"<one thing they got right>","improve":"<most important error to fix>","example":"<show the corrected version of one citation or reference entry>"}`,

  buildPrompt(text) {
    return `Student's APA 7 citations and references:\n\n"${text}"\n\nEvaluate and return JSON feedback.`;
  },

  parseScore(data) { return data.score ?? 0; },

  html() {
    return `
    <div class="mm-header">
      <button class="mm-back-btn" id="mm-back-btn">← Dashboard</button>
      <div class="mm-title-group">
        <span class="mm-icon">📎</span>
        <div>
          <h1 class="mm-title">Citation Guide</h1>
          <div class="mm-meta"><span class="mm-skill-tag">Citation &amp; Integrity</span> · 15–20 min</div>
        </div>
      </div>
    </div>

    <div class="mm-body">

      <div class="mm-section">
        <h2>APA 7 essentials</h2>
        <p>The American Psychological Association (APA) 7th edition is the referencing style used across most
        social science, education, and humanities courses at South African universities. Correct citation
        practice is not just a formatting requirement — it is the foundation of academic integrity,
        giving credit to original thinkers and allowing readers to trace your sources.</p>

        <div class="mm-citation-table">
          <div class="mm-ct-head">In-text citations</div>
          <div class="mm-ct-row"><div class="mm-ct-type">Paraphrase (one author)</div><div class="mm-ct-format">(Naidoo, 2023)</div></div>
          <div class="mm-ct-row"><div class="mm-ct-type">Direct quote</div><div class="mm-ct-format">(Naidoo, 2023, p. 45)</div></div>
          <div class="mm-ct-row"><div class="mm-ct-type">Two authors</div><div class="mm-ct-format">(Dlamini &amp; Mokoena, 2022)</div></div>
          <div class="mm-ct-row"><div class="mm-ct-type">Three or more authors</div><div class="mm-ct-format">(Czerniewicz et al., 2020)</div></div>

          <div class="mm-ct-head" style="margin-top:20px">Reference list entries</div>
          <div class="mm-ct-row"><div class="mm-ct-type">Journal article</div><div class="mm-ct-format">Author, A. A. (Year). Title of article in sentence case. <em>Journal Name in Title Case, Volume</em>(Issue), pp–pp. https://doi.org/xxxxx</div></div>
          <div class="mm-ct-row"><div class="mm-ct-type">Book</div><div class="mm-ct-format">Author, A. A. (Year). <em>Title of book in sentence case.</em> Publisher.</div></div>
          <div class="mm-ct-row"><div class="mm-ct-type">Website</div><div class="mm-ct-format">Author, A. A. (Year, Month Day). Title of page. Site Name. URL</div></div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Worked example</h2>
        <div class="mm-example-box">
          <div class="mm-ex-weak">
            <div class="mm-ex-tag mm-tag-weak">✗ Common errors</div>
            <p><strong>In-text:</strong> "Academic literacy is a threshold concept (Land and Meyer 2003)."<br>
            <strong>Reference:</strong> Land, R. and Meyer, J.H.F. (2003). Threshold Concepts and Troublesome Knowledge. <em>Improving Student Learning</em>, Oxford Brookes University.</p>
          </div>
          <div class="mm-ex-strong">
            <div class="mm-ex-tag mm-tag-strong">✓ Corrected APA 7</div>
            <p><strong>In-text:</strong> "Academic literacy is a threshold concept (Land &amp; Meyer, 2003)."<br>
            <strong>Reference:</strong> Land, R., &amp; Meyer, J. H. F. (2003). Threshold concepts and troublesome knowledge. In C. Rust (Ed.), <em>Improving student learning: Theory and practice ten years on</em> (pp. 412–424). Oxford Brookes University.</p>
          </div>
        </div>
        <div class="mm-anno-grid">
          <div class="mm-anno-item"><span class="mm-anno-tag">✓ Fixed</span> "and" → "&amp;" between authors</div>
          <div class="mm-anno-item"><span class="mm-anno-tag">✓ Fixed</span> Comma before year in in-text</div>
          <div class="mm-anno-item"><span class="mm-anno-tag">✓ Fixed</span> Article title in sentence case</div>
          <div class="mm-anno-item"><span class="mm-anno-tag">✓ Fixed</span> Book title and chapter structure added</div>
        </div>
      </div>

      <div class="mm-section">
        <h2>Your turn</h2>
        <div class="mm-task-box">
          <p><strong>Task:</strong> Write the APA 7 in-text citation and reference list entry for each source below.</p>
          <div class="mm-task-given">
            <div class="mm-task-item">
              <span class="mm-task-label">Source 1 (Journal article):</span>
              Author: Selwyn, Neil · Year: 2022 · Title: "Robots and AI in education: Preparing students for an automated future" · Journal: <em>British Journal of Educational Technology</em> · Volume: 53, Issue: 4, Pages: 789–805 · DOI: 10.1111/bjet.13201
            </div>
            <div class="mm-task-item">
              <span class="mm-task-label">Source 2 (Book):</span>
              Authors: Czerniewicz, Laura and Brown, Cheryl · Year: 2021 · Title: "Digital Education in South Africa: Emerging Challenges and Opportunities" · Publisher: HSRC Press
            </div>
            <div class="mm-task-item">
              <span class="mm-task-label">Source 3 (Webpage):</span>
              Author: Department of Higher Education and Training · Date: 15 March 2023 · Page title: "National Framework for AI in Higher Education" · Website: DHET.gov.za · URL: https://www.dhet.gov.za/ai-framework
            </div>
          </div>
          <textarea id="mm-practice-ta" class="mm-textarea" rows="12"
            placeholder="Source 1&#10;In-text: (…)&#10;Reference: …&#10;&#10;Source 2&#10;In-text: (…)&#10;Reference: …&#10;&#10;Source 3&#10;In-text: (…)&#10;Reference: …"
            oninput="document.getElementById('mm-charcount').textContent=this.value.length"></textarea>
          <div class="mm-ta-meta"><span id="mm-charcount">0</span> characters</div>
          <button id="mm-submit-btn" class="mm-submit-btn" onclick="window._submitMicroModule()">Get AI Feedback →</button>
        </div>
      </div>

      <div id="mm-feedback" class="mm-feedback" style="display:none;"></div>

    </div>`;
  }
};
