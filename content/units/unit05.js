// content/units/unit05.js — Unit 5: The Scholarly Publication Ecosystem
import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
import { visualTask }  from '../../src/components/visual-task.js';

const RT_CONFIG = {
  id: 'rt-u5', unitId: 'u5', unitNum: 5,
  title: 'What Makes a Source Scholarly?',
  level: 'Foundation Level 1', wordTarget: 100,
  source: 'Adapted for Academic Literacies — drawing on Elsevier & South African Journal of Education author guidelines',
  vocab: [
    { term: 'Peer review', definition: 'A quality control process where a scholarly article is evaluated by two or more independent experts before publication — they assess the method, evidence, and conclusions, then recommend acceptance, revision, or rejection.', example: 'Before a paper about teacher education in South Africa appears in an academic journal, other teacher education researchers read it critically and give detailed feedback to the editor.' },
    { term: 'Primary source', definition: 'Original research or firsthand evidence — the raw data, interviews, experiments, or observations at the origin of knowledge.', example: 'A research article where the author conducted surveys with Grade 10 learners is a primary source. A textbook that summarises that research is not.' },
    { term: 'Secondary source', definition: 'A source that analyses, interprets, or summarises primary sources — one step removed from original research.', example: 'A literature review discussing ten studies on classroom technology use is a secondary source.' },
    { term: 'Grey literature', definition: 'Documents produced outside commercial publishing and peer review — government reports, policy documents, NGO publications. Often valuable but not peer-reviewed.', example: 'A Department of Basic Education report on Grade 3 literacy outcomes is grey literature — authoritative and important, but not peer-reviewed.' },
  ],
  text: `<h3>What Makes a Source Scholarly?</h3>
    <p>Not all published text is equal. A tweet, a Wikipedia article, a newspaper editorial, a government policy document, and a peer-reviewed journal article are all "published" — but they carry very different levels of reliability, accountability, and intellectual rigour. Understanding these differences is one of the first and most important skills you will develop as a university student.</p>
    <p>At the top of the scholarly hierarchy is the <em>peer-reviewed journal article</em>. Before any article can appear in a reputable academic journal, it must survive a process called peer review. The author submits their research to a journal editor, who sends it anonymously to two or three experts in that specific field. These reviewers read it critically — evaluating the research design, the evidence, the argument, and the conclusions. They write detailed comments and recommend whether the article should be published, revised, or rejected. Many articles are rejected; most require significant revision. This process takes months. It is slow. But it is also the reason peer-reviewed research is the gold standard of academic knowledge.</p>
    <p>Below peer-reviewed articles in the scholarly hierarchy are secondary sources like textbooks and review articles, grey literature like government reports, and at the bottom, unverified sources like websites and social media. Each has its uses — grey literature is essential for understanding education policy in South Africa. But you need to know what type of source you are using, and be transparent about it in your academic work.</p>`,
  visual: `<div class="rt-infographic">
    <div class="rt-infographic-title">The Source Hierarchy in Academic Research</div>
    <div style="padding:16px;display:flex;flex-direction:column;gap:8px;">
      <div style="background:#15803d;color:#fff;padding:14px 20px;border-radius:8px;display:flex;justify-content:space-between;align-items:center;"><span style="font-weight:700;">🥇 Peer-reviewed journal articles</span><span style="font-size:12px;opacity:.8;">Highest reliability</span></div>
      <div style="background:#4ade80;color:var(--navy);padding:14px 20px;border-radius:8px;display:flex;justify-content:space-between;"><span style="font-weight:700;">📚 Academic books & edited volumes</span><span style="font-size:12px;">High reliability</span></div>
      <div style="background:#fbbf24;color:var(--navy);padding:14px 20px;border-radius:8px;display:flex;justify-content:space-between;"><span style="font-weight:700;">📋 Grey literature (gov/NGO reports)</span><span style="font-size:12px;">Moderate — verify source</span></div>
      <div style="background:#f97316;color:#fff;padding:14px 20px;border-radius:8px;display:flex;justify-content:space-between;"><span style="font-weight:700;">📰 News articles & journalism</span><span style="font-size:12px;">Use with caution</span></div>
      <div style="background:#ef4444;color:#fff;padding:14px 20px;border-radius:8px;display:flex;justify-content:space-between;"><span style="font-weight:700;">💬 Social media, blogs, opinion sites</span><span style="font-size:12px;">Lowest reliability</span></div>
    </div></div>`,
  questions: [
    'Describe the peer review process in your own words. Why does it make a journal article more reliable than a blog post?',
    'What is the difference between a primary and a secondary source? Give one example of each relevant to a South African teacher researching classroom management.',
    'The text says grey literature can be valuable even though it is not peer-reviewed. Give one SA education example and explain why it is useful despite not being peer-reviewed.',
  ],
  writingPrompt: `Think about an assignment you are working on or have recently submitted.
Write a structured source annotation (3–5 sentences): Name one source you used. Describe what type of source it is. Explain how you know, and how reliable you now think it is based on the source hierarchy. If it is not peer-reviewed, explain how you would use it carefully.`,
};

const VT_CONFIG = {
  id: 'vt-u5', unitId: 'u5',
  title: 'Comparing Source Types: A Data Table',
  chartType: 'comparison table',
  visualDescription: 'A table comparing four source types across five quality dimensions',
  source: 'Adapted for Academic Literacies from Nunnally & Bernstein (1994) and Elsevier Library Resources',
  observePrompt: 'Read this table carefully. Look at what each row and column represents before answering. Notice which cells have ✅, ⚠️, or ❌ — what do these symbols signal?',
  observeChecklist: [
    'The four source types listed in the columns',
    'The five quality dimensions listed in the rows',
    'Which source type scores highest overall',
    'At least one surprising or unexpected cell in the table',
  ],
  visual: `<div style="overflow-x:auto;padding:8px;">
    <table style="width:100%;border-collapse:collapse;font-size:14px;min-width:500px;">
      <thead>
        <tr style="background:var(--navy);color:#fff;">
          <th style="padding:12px 14px;text-align:left;">Quality Dimension</th>
          <th style="padding:12px 14px;text-align:center;">Peer-reviewed Article</th>
          <th style="padding:12px 14px;text-align:center;">Textbook</th>
          <th style="padding:12px 14px;text-align:center;">Govt Report</th>
          <th style="padding:12px 14px;text-align:center;">News Article</th>
        </tr>
      </thead>
      <tbody>
        <tr style="background:#f8fafc;"><td style="padding:11px 14px;font-weight:600;">Independent expert review</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">⚠️ Editorial only</td><td style="text-align:center;">❌ No</td><td style="text-align:center;">❌ No</td></tr>
        <tr style="background:#fff;"><td style="padding:11px 14px;font-weight:600;">Evidence of methodology</td><td style="text-align:center;">✅ Required</td><td style="text-align:center;">⚠️ Sometimes</td><td style="text-align:center;">⚠️ Sometimes</td><td style="text-align:center;">❌ Rarely</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:11px 14px;font-weight:600;">Can be cited in assignments</td><td style="text-align:center;">✅ Preferred</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">✅ With care</td><td style="text-align:center;">⚠️ With caution</td></tr>
        <tr style="background:#fff;"><td style="padding:11px 14px;font-weight:600;">Speed of publication</td><td style="text-align:center;">❌ Slow (months–years)</td><td style="text-align:center;">❌ Slow</td><td style="text-align:center;">✅ Fast</td><td style="text-align:center;">✅ Very fast</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:11px 14px;font-weight:600;">Current / up to date</td><td style="text-align:center;">⚠️ Depends</td><td style="text-align:center;">❌ Often outdated</td><td style="text-align:center;">✅ Usually current</td><td style="text-align:center;">✅ Very current</td></tr>
      </tbody>
    </table>
    <p style="font-size:12px;color:var(--muted);margin-top:8px;font-style:italic;">✅ Strong &nbsp;⚠️ Partial or conditional &nbsp;❌ Weak or absent</p>
  </div>`,
  questions: [
    { q: 'What does the table tell us about the trade-off between reliability and speed? Identify the pattern and explain what it means for a researcher who needs current information.', hint: 'Look at the "Speed of publication" and "Independent expert review" rows together.', modelAnswer: 'There is an inverse relationship: the most reliable sources (peer-reviewed articles) are the slowest, while the fastest sources (news) have the least reliability. For researchers needing current information — e.g. on a recent policy change — this means using grey literature or news for current data, then verifying claims against older but more reliable peer-reviewed research.' },
    { q: 'A student wants to cite a government report about South African matric pass rates. The table shows government reports score ❌ on "independent expert review." Does this mean the student should NOT use it? Explain your reasoning.', hint: 'Think about what the ❌ means — and what government reports are authoritative for.', modelAnswer: 'Not necessarily. Government reports are the primary authoritative source for official statistics — the DBE\'s own data on matric pass rates is more authoritative than any secondary commentary on it. The ❌ means it has not been independently peer-reviewed for methodology, not that the data is unreliable. The student should cite it as grey literature, acknowledge its nature, and not use it as evidence for theoretical or methodological claims.' },
    { q: 'Look at the "Can be cited in assignments" row. News articles receive ⚠️ "with caution." Describe one situation where citing a news article in a university assignment would be appropriate, and one where it would not be.', hint: 'Think about what news articles are good for versus what they cannot provide.', modelAnswer: 'Appropriate: citing a news article to establish that a particular event occurred (e.g. a teacher strike, a policy announcement) — where the news article is itself the primary record. Inappropriate: citing a news article as evidence for a theoretical claim about pedagogy or child development, where peer-reviewed research is required. News articles cannot substitute for evidence-based academic argument.' },
  ],
};

export const unit05 = {
  id: 'u5', badge: 'Unit 5', title: 'The Scholarly Publication Ecosystem',
  phase: 'Phase 2 — Finding & Evaluating Knowledge',
  html: () => `
    <h1>Unit 5: The Scholarly Publication Ecosystem</h1>
    <p class="lead">Not all published text is equal. A tweet, a Wikipedia article, a government report, and a peer-reviewed journal article all exist — but they carry very different levels of reliability. This unit gives you the map of the academic publishing world.</p>
    <div class="unit-outcomes"><div class="outcomes-label">By the end of this unit you will be able to:</div><ul>
      <li>Describe the peer review process and explain why it matters for research reliability</li>
      <li>Distinguish between primary sources, secondary sources, and grey literature</li>
      <li>Read and interpret a comparison table to evaluate source types</li>
      <li>Write a structured source annotation for a source in your current field of study</li>
    </ul></div>
    <div class="section-label">🎬 Watch First</div>
    <p>This short Elsevier explainer walks through exactly what happens to a research article between submission and publication. Understanding this process will permanently change how you read an academic paper.</p>
    <div id="ivp-unit5" data-video-key="unit5" class="ivp-container"></div>
    ${quiz('q5a','A journal article has been through peer review. A blog post has not. A student argues: "But the blog is written by a professor — surely it\'s just as reliable?" How do you respond?',['The student is right — author expertise is what matters','Peer review adds independent scrutiny that author expertise alone cannot substitute — even experts have blind spots','The student is wrong — professors should never blog','It depends which journal the professor publishes in'],1,'✅ Even the most expert researchers benefit from peer review. Independent scrutiny catches errors, challenges assumptions, and strengthens arguments. A professor\'s blog may be excellent — but it has not been through that process.')}
    ${quiz('q5b','You are researching the National Curriculum Statement (NCS) for your assignment. The best primary source is:',['A textbook chapter about the NCS','An academic article critiquing the NCS','The actual NCS document published by the Department of Basic Education','A Wikipedia article summarising the NCS'],2,'✅ The DBE\'s own published document is the primary source for the NCS — it is the original policy itself. A textbook chapter or academic article about it is a secondary source. Always go to the original where possible.')}
    <h2>📊 Visual Activity: Reading a Comparison Table</h2>
    <p>Academic papers and reports frequently present information in comparison tables. Being able to read a table critically — not just describe what it says, but interpret what it means — is a core academic skill. Work through this activity carefully.</p>
    ${visualTask('vt-u5', VT_CONFIG)}
    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u5', RT_CONFIG)}
    <div class="unit-closing"><div class="unit-closing-label">Before You Move On</div>
    <p>"Knowing the difference between a peer-reviewed article and a blog post is not elitism. It is the foundation of intellectual honesty — knowing exactly what kind of evidence you are standing on."</p></div>`,
};
