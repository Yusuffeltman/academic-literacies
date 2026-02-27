// content/units/unit09.js — Unit 9: Reference Management & Citation Ethics
import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
import { visualTask }  from '../../src/components/visual-task.js';

const RT_CONFIG = {
  id: 'rt-u9', unitId: 'u9', unitNum: 9,
  title: 'Why Citations Are the Architecture of Academic Trust',
  level: 'Transitional Level 1', wordTarget: 150,
  source: 'Adapted for Academic Literacies — drawing on Pecorari (2008) and APA Publication Manual (7th ed.)',
  vocab: [
    { term: 'In-text citation', definition: 'A brief reference within the body of your writing that points to a full reference in your reference list. In APA 7th: (Author, Year) or Author (Year).', example: 'Research suggests that play-based learning supports mathematical concept development (Ginsburg, 2006). OR: Ginsburg (2006) argues that play-based learning supports mathematical concept development.' },
    { term: 'Reference list', definition: 'A complete, alphabetically ordered list at the end of an academic document, containing full details of every source cited in the text.', example: 'Ginsburg, H. P. (2006). Mathematical play and playful mathematics. In D. Singer et al. (Eds.), Play = Learning (pp. 145–165). Oxford University Press.' },
    { term: 'Plagiarism', definition: 'Presenting someone else\'s words, ideas, or work as your own, without acknowledging the source — whether intentional or accidental.', example: 'Copying a paragraph and submitting it as your own writing, even if you change a few words, is plagiarism. Paraphrasing and citing the source is not.' },
    { term: 'Paraphrase', definition: 'Restating someone else\'s idea in your own words and sentence structure, while maintaining the original meaning — always acknowledging the original source.', example: 'Original: "Children learn mathematics most effectively through concrete manipulation." Paraphrase: According to researchers, hands-on engagement with physical materials is the most effective route to mathematical understanding (Smith, 2015).' },
  ],
  text: `<h3>Why Citations Are the Architecture of Academic Trust</h3>
    <p>A citation is not merely a formatting requirement. It is a claim about accountability. When you cite a source in an academic essay, you are telling your reader: this idea is not mine — it belongs to someone else, it was published in a specific place, and you can go and read it yourself to verify what I am saying. You are making yourself accountable to the intellectual community. This is why citation is an ethical act, not a bureaucratic one.</p>
    <p>Understanding what a citation communicates helps explain why plagiarism is treated so seriously in academia. When you present someone else's words or ideas as your own — even accidentally — you are committing a form of intellectual theft and fraud. You are claiming credit for work you did not do, and denying the original author the acknowledgement they are owed. In a research community built on accumulated, attributed knowledge, this damages the entire system. It is not about following rules — it is about participating honestly in a knowledge community.</p>
    <p>The practical tool for managing citations is a reference manager. Zotero is the most widely used free tool — it saves source information, generates formatted references, and inserts in-text citations into your document. But reference managers make errors, particularly with unusual source types, online articles, and grey literature. You must always check auto-generated references against the APA 7th manual. A reference manager is a tool, not a substitute for knowing how to cite correctly.</p>
    <p>APA 7th is the citation style most commonly used in education research globally, including at many South African universities. Its logic is straightforward: every in-text citation contains the author's surname and publication year, directing the reader to the full reference list where they can find every detail needed to locate the original source.</p>`,
  questions: [
    'The text says a citation is "an ethical act, not a bureaucratic one." What does this mean? What are two things a citation communicates to the reader beyond just "where you got the information"?',
    'Explain the difference between plagiarism and paraphrasing. Use the examples from the vocabulary panel to illustrate your explanation.',
    'The text says reference managers "make errors" and you must check their output. Give one type of source where a reference manager is particularly likely to produce an incorrect reference — and explain why.',
  ],
  writingPrompt: `Find one peer-reviewed journal article relevant to your teaching specialisation.
Write: (1) A correct APA 7th in-text citation — e.g. (Author, Year). (2) A correct APA 7th full reference list entry. (3) Two sentences paraphrasing the article's main argument in your own words, with the in-text citation. (4) One sentence explaining what you had to fix when you checked the auto-generated reference against APA 7th guidelines — or confirming it was correct and how you verified this.`,
};

const VT_CONFIG = {
  id: 'vt-u9', unitId: 'u9',
  title: 'Anatomy of an APA 7th Reference: Annotated Diagram',
  chartType: 'annotated diagram',
  visualDescription: 'An annotated breakdown of a real APA 7th journal article reference, with each component colour-coded and labelled',
  source: 'Academic Literacies module — APA Publication Manual 7th edition (American Psychological Association, 2020)',
  observePrompt: 'Study every colour-coded element in this reference. Each element has a specific purpose in APA 7th. Before answering, make sure you can name every component.',
  observeChecklist: [
    'How many authors are listed and how their names are formatted',
    'Where the publication year appears — and its exact format',
    'Which part is the article title — and how it is capitalised',
    'The journal name format — and how it differs from the article title',
    'What a DOI is and where it appears',
  ],
  visual: `<div style="padding:24px;background:#fff;border-radius:12px;border:1px solid var(--border);">
    <div style="font-size:13px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:16px;">A real APA 7th reference — each colour = one required component</div>
    <div style="background:var(--navy);border-radius:10px;padding:20px;font-family:'DM Mono',monospace;font-size:13px;line-height:2.2;color:#fff;">
      <span style="background:#fbbf24;color:var(--navy);padding:1px 6px;border-radius:4px;font-weight:700;">Reddy, V.</span><span style="color:rgba(255,255,255,.7);">, </span><span style="background:#4ade80;color:var(--navy);padding:1px 6px;border-radius:4px;font-weight:700;">&amp; Juan, A.</span><span style="color:rgba(255,255,255,.7);"> </span><span style="background:#60a5fa;color:var(--navy);padding:1px 6px;border-radius:4px;font-weight:700;">(2021).</span><span style="color:rgba(255,255,255,.7);"> </span><span style="background:#f9a8d4;color:var(--navy);padding:1px 6px;border-radius:4px;font-weight:700;">Mathematics and science achievement in South African schools.</span><span style="color:rgba(255,255,255,.7);"> </span><span style="background:#a78bfa;color:var(--navy);padding:1px 6px;border-radius:4px;font-weight:700;font-style:italic;">South African Journal of Education,</span><span style="color:rgba(255,255,255,.7);"> </span><span style="background:#fb923c;color:var(--navy);padding:1px 6px;border-radius:4px;font-weight:700;font-style:italic;">41</span><span style="color:rgba(255,255,255,.7);">(2), 1–14. </span><span style="background:#34d399;color:var(--navy);padding:1px 6px;border-radius:4px;font-weight:700;">https://doi.org/10.15700/saje.v41n2a1816</span>
    </div>
    <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:16px;font-size:12px;">
      <div style="background:#fef9c3;border-radius:8px;padding:10px;"><div style="background:#fbbf24;display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;"></div><strong>First author</strong><br>Surname, Initial(s).</div>
      <div style="background:#f0fdf4;border-radius:8px;padding:10px;"><div style="background:#4ade80;display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;"></div><strong>Additional author(s)</strong><br>& Surname, I.</div>
      <div style="background:#eff6ff;border-radius:8px;padding:10px;"><div style="background:#60a5fa;display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;"></div><strong>Year</strong><br>(Year of publication).</div>
      <div style="background:#fdf2f8;border-radius:8px;padding:10px;"><div style="background:#f9a8d4;display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;"></div><strong>Article title</strong><br>Sentence case. No italics.</div>
      <div style="background:#f5f3ff;border-radius:8px;padding:10px;"><div style="background:#a78bfa;display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;"></div><strong>Journal name</strong><br><em>Title Case. Italics.</em></div>
      <div style="background:#fff7ed;border-radius:8px;padding:10px;"><div style="background:#fb923c;display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;"></div><strong>Volume (issue)</strong><br><em>Vol</em>(issue), pages.</div>
    </div>
    <div style="margin-top:10px;padding:10px;background:#f0fdf4;border-radius:8px;font-size:12px;"><div style="background:#34d399;display:inline-block;width:12px;height:12px;border-radius:2px;margin-right:6px;"></div><strong>DOI</strong> — Digital Object Identifier. A permanent link. Always include when available. Format: https://doi.org/xxxxx</div>
  </div>`,
  questions: [
    { q: 'Look at the article title (pink): "Mathematics and science achievement in South African schools." How is it capitalised — and why is this different from how the journal name (purple) is capitalised?', hint: 'Compare the capitalisation pattern. In APA 7th, article titles and journal names follow different rules.', modelAnswer: 'The article title uses sentence case — only the first word and proper nouns are capitalised. The journal name uses title case — all major words capitalised. This is a deliberate APA 7th rule: article and chapter titles use sentence case; journal names, book titles, and periodicals use italics with title case. This is one of the most common errors Zotero makes and must always be checked manually.' },
    { q: 'This reference has two authors formatted as "Reddy, V., & Juan, A." How would you format an in-text citation for this paper — and how would it change if there were three or more authors?', hint: 'APA 7th simplified multi-author rules in the 7th edition.', modelAnswer: 'Two authors: (Reddy & Juan, 2021) in-text, or Reddy and Juan (2021) if the authors\' names are used in the sentence. For three or more authors: APA 7th uses "et al." from the first citation — (Reddy et al., 2021). This differs from APA 6th, which required all authors for the first citation when there were 3–5. Always check which edition your institution uses.' },
    { q: 'The DOI is highlighted in green: https://doi.org/10.15700/saje.v41n2a1816. What is a DOI, why is it important to include it, and what should you do if a journal article does not have one?', hint: 'Think about what happens to URLs over time — and what a DOI guarantees.', modelAnswer: 'A DOI (Digital Object Identifier) is a permanent, stable identifier for a published document — unlike URLs, which can change or break. Including the DOI allows any reader to find the exact paper regardless of where it is hosted. If an article has no DOI (some older articles and many SA open-access journals), include the URL of the journal\'s website instead: "Retrieved from https://..." Some articles have neither — in that case, end the reference at the page numbers.' },
  ],
};

export const unit09 = {
  id: 'u9', badge: 'Unit 9', title: 'Reference Management & Citation Ethics',
  phase: 'Phase 2 — Finding & Evaluating Knowledge',
  html: () => `
    <h1>Unit 9: Reference Management & Citation Ethics</h1>
    <p class="lead">Citations are not just formatting. They are the architecture of academic trust. This unit teaches you to use that system correctly — and to understand exactly why every component of a reference has a purpose.</p>
    <div class="unit-outcomes"><div class="outcomes-label">By the end of this unit you will be able to:</div><ul>
      <li>Explain what a citation communicates — ethically, not just formally</li>
      <li>Distinguish between plagiarism and paraphrase with specific examples</li>
      <li>Identify every component of an APA 7th reference from an annotated diagram</li>
      <li>Format a real in-text citation and reference list entry from your own research</li>
    </ul></div>
    <div class="section-label">🎬 Watch First</div>
    <p>This Scribbr Zotero tutorial is one of the most practical things you will watch in this module. Set up Zotero while you watch — you will use it for the rest of your degree. Then complete the visual activity to make sure you understand what Zotero is generating for you.</p>
    <div id="ivp-unit9" data-video-key="unit9" class="ivp-container"></div>
    ${quiz('q9a','In APA 7th, you are citing an article by three authors — Dlamini, Nkosi, and Botha — published in 2022. How do you write the in-text citation?',['(Dlamini, Nkosi and Botha, 2022)','(Dlamini et al., 2022)','(Dlamini & Nkosi & Botha, 2022)','(Dlamini, 2022)'],1,'✅ In APA 7th, three or more authors are cited as (First Author et al., Year) from the very first citation. APA 7th simplified this from APA 6th — you no longer need to list all authors for the first citation when there are 3–5.')}
    ${quiz('q9b','A student paraphrases a paragraph from a journal article, changes most of the words, but includes no citation. Is this plagiarism?',['No — if they changed the words, the idea is now theirs','Yes — paraphrasing without attribution is plagiarism, regardless of word changes','Only if the original author can prove the student read their work','It depends on how many words were changed'],1,'✅ The idea belongs to the original author, not the words used to express it. Paraphrasing without attribution is plagiarism because you are presenting someone else\'s thinking as your own. This is one of the most common forms of unintentional plagiarism.')}
    <h2>📊 Visual Activity: Anatomy of an APA 7th Reference</h2>
    <p>Zotero generates references for you — but you are responsible for checking them. Before you can check a reference, you need to know what every component should look like. This annotated diagram maps each element of a real APA 7th citation.</p>
    ${visualTask('vt-u9', VT_CONFIG)}
    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u9', RT_CONFIG)}
    <div class="unit-closing"><div class="unit-closing-label">Before You Move On</div>
    <p>"Every citation is a small act of academic generosity — acknowledging the people whose thinking made your thinking possible."</p></div>`,
};
