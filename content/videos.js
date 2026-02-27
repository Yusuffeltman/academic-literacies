// content/videos.js
// ─────────────────────────────────────────────
// Video metadata + interactive configurations.
//
// Each VIDEO_CONFIG entry now has:
//   knowledge  — curated facts/concepts from the video (AI chat context)
//   scope      — topic pills shown in chat panel ("I can help with:")
//   outOfScope — topics to redirect away from
//   keyTerms   — definitions introduced in the video
//   ctx        — one-line context summary
//   chapters   — {t, n} seek points
//   ix         — {id, t, type, q, opts?, ok?, fb?, ph?} pause interactions
// ─────────────────────────────────────────────

export const VIDEOS = {
  unit1:  { id: 'hJP5GqnTrNo', title: 'How AI could save (not destroy) education — Sal Khan, TED 2023' },
  unit2:  { id: 'B8ofWFx525s', title: 'Beware Online "Filter Bubbles" — Eli Pariser, TED 2011' },
  unit3:  { id: 'UBVV8pch1dM', title: 'The Science of Thinking — Veritasium' },
  unit4:  { id: '3E7hkPZ-HTk', title: 'Why You Should Quit Social Media — Cal Newport, TEDx' },
  unit5:  { id: 'rOCQZ7QnoN0', title: 'How Peer Review Works — Elsevier' },
  // Unit 6 — Scopus Search Tutorial (Elsevier official channel)
  // Reliable embed, institution-neutral, directly demonstrates database search
  unit6:  { id: 'vJbIFCQw75E', title: 'Scopus: Basic Search Tutorial — Elsevier' },
  unit7:  { id: 'GoQG6Tin-1E', title: 'SIFT: The Four Moves — Mike Caulfield' },
  // Unit 8 — Using AI Tools for Academic Research (NCSU Libraries)
  // Well-produced library tutorial covering Elicit, ResearchRabbit, citation verification
  unit8:  { id: 'tZPOAlvfbkQ', title: 'AI Tools for Research: What Works and What Doesn\'t — NCSU Libraries' },
  unit9:  { id: 'JG7Uq_JFDzE', title: 'Zotero in 5 Minutes — Scribbr' },
  unit10: { id: 'jVKNkB0U7OE', title: 'How to Read a Research Paper — Simon Clark' },
  unit11: { id: 'WtDZFpELese', title: 'The Cornell Note Taking System — Thomas Frank' },
  unit12: { id: 'iK6K_N2qe9Y', title: 'How to Write an Academic Essay — Scribbr' },
  unit13: { id: 'iRA9O3dsmfY', title: 'Academic Writing Tips: Formal vs Informal Language — Scribbr' },
  unit14: { id: '5Zg-C8AAIGg', title: 'The Beauty of Data Visualisation — David McCandless, TED' },
  unit15: { id: 'TxGALKSBsuQ', title: 'How to Give Effective Feedback — The Art of Improvement' },
  unit16: { id: 'dOxUroR57xs', title: 'Prompt Engineering for Beginners — Google' },
  unit17: { id: 'zIYC6zG265E', title: 'How to Write a Literature Review — Scribbr' },
  unit19: { id: 'zIYC6zG265E', title: 'How to Write a Literature Review — Scribbr' },
  unit20: { id: 'rDjrOaoHz9s', title: 'How to Get Better at the Things You Care About — Eduardo Briceño, TED' },
};

export const VIDEO_CONFIG = {

  // ──────────────────────────────────────────────────────────
  // UNIT 1 — Sal Khan: How AI could save education
  // ──────────────────────────────────────────────────────────
  unit1: {
    ctx: 'AI in education: personalised learning, AI tutors, and the risks of unequal access.',
    scope: ['AI tutors and personalisation', 'Khan Academy and Khanmigo', 'AI risks in education', 'Socratic teaching method', 'Equity and access in EdTech'],
    outOfScope: ['How to build AI', 'South African curriculum details', 'Other TED talks', 'Assignment help'],
    keyTerms: [
      { term: 'Khanmigo', def: 'Khan Academy\'s AI tutor that uses the Socratic method — asking questions rather than giving answers directly.' },
      { term: 'Socratic method', def: 'A teaching approach that guides students to discover answers through questioning rather than direct instruction.' },
      { term: 'Personalised learning', def: 'Adjusting the pace, level, and content of education to each individual student\'s needs.' },
    ],
    knowledge: [
      'Sal Khan founded Khan Academy, a free online education platform used by hundreds of millions of learners worldwide.',
      'Khan argues that AI could act as a "personal tutor for every student" — something previously only available to wealthy students.',
      'Khanmigo is Khan Academy\'s AI tutor. It uses the Socratic method: instead of giving answers, it asks guiding questions.',
      'The Socratic method keeps students cognitively active — they arrive at understanding themselves rather than being told.',
      'Khan acknowledges AI could be misused for cheating, but argues the solution is smarter assessment, not banning AI.',
      'One major risk Khan identifies: not all students have equal access to devices and internet — AI could widen inequality if not carefully deployed.',
      'Khan suggests AI could help teachers by handling administrative tasks and personalising feedback, freeing teachers for human connection.',
      'The video does NOT address South African-specific curriculum, languages, or infrastructure challenges — only global patterns.',
      'Khan is optimistic about AI in education but stresses that teachers remain essential for motivation, mentorship, and relationships.',
      'AI tutors work best when combined with human teachers, not when they replace them.',
    ],
    chapters: [
      { t: 0,   n: 'The Problem' },
      { t: 120, n: 'Khanmigo Demo' },
      { t: 300, n: 'AI as Tutor' },
      { t: 480, n: 'Socratic Method' },
      { t: 600, n: 'Risks & Limits' },
    ],
    ix: [
      { id: 'u1-ix1', t: 115, type: 'refl', q: 'Khan has described the current state of education. Does his description match your school experience in South Africa? What was different?', ph: 'In my school experience…' },
      { id: 'u1-ix2', t: 360, type: 'mcq',
        q: 'Khan argues AI could act as a personal tutor for every learner. What is the MOST important concern for a South African teacher?',
        opts: ['Learners will stop paying attention in class', 'AI tutors cannot speak isiZulu or Sesotho', 'Unequal access to devices and internet means not all learners can benefit equally', 'AI tutors will make teachers feel less valued'],
        ok: 2, fb: '✅ Infrastructure inequality is the defining challenge for EdTech in South Africa. Any AI tool must be evaluated against the reality that millions of learners lack reliable connectivity.' },
      { id: 'u1-ix3', t: 595, type: 'refl', q: 'Khan says AI will not replace teachers but will change what teaching means. What do you think will change most?', ph: 'I think the biggest change will be…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 2 — Eli Pariser: Filter Bubbles
  // ──────────────────────────────────────────────────────────
  unit2: {
    ctx: 'How social media algorithms create filter bubbles and narrow your information world.',
    scope: ['Filter bubbles', 'How social media algorithms work', 'The personalised internet', 'Effects on democracy and critical thinking', 'Differences between algorithmic and editorial curation'],
    outOfScope: ['How to code algorithms', 'Specific South African social media stats', 'Other Pariser books or talks', 'Assignment help'],
    keyTerms: [
      { term: 'Filter bubble', def: 'A state of intellectual isolation that can result from personalised searches — when algorithms only show you what confirms your existing views.' },
      { term: 'Algorithmic curation', def: 'When a computer system — not a human editor — decides what content you see based on your past behaviour.' },
      { term: 'Personalisation', def: 'Tailoring digital content to the individual user based on their clicks, location, device, and browsing history.' },
    ],
    knowledge: [
      'Eli Pariser coined the term "filter bubble" in 2011. He noticed Facebook was filtering out posts from his conservative friends because he never clicked on them.',
      'Algorithms learn from what you click, share, and linger on — then show you more of that type of content.',
      'Two people can search the same term on Google and see completely different results because of their personalisation history.',
      'Filter bubbles make it harder to encounter ideas that challenge your existing beliefs — this is the opposite of academic inquiry.',
      'Pariser argues that before the internet, human editors (journalists, librarians) made choices about what was important — not just what was popular.',
      'The problem is not that algorithms are malicious — it is that they optimise for engagement (clicks) rather than importance or accuracy.',
      'Pariser warns filter bubbles threaten democracy because informed citizens need shared facts to debate policy.',
      'The video was made in 2011 — social media algorithms have become significantly more powerful and targeted since then.',
      'Pariser does not provide a technical solution — he calls for transparency in how algorithms work.',
      'For researchers and students, the lesson is: do not rely on Google Search alone for academic sources, because results are personalised.',
    ],
    chapters: [
      { t: 0,   n: 'The Personalised Web' },
      { t: 120, n: 'How Filters Work' },
      { t: 300, n: 'The Consequences' },
      { t: 420, n: 'What We Lose' },
    ],
    ix: [
      { id: 'u2-ix1', t: 115, type: 'refl', q: 'Pariser has described how Facebook personalised his feed based on his clicks. Have you noticed an algorithm showing you more of one kind of content? Describe it.', ph: 'I have noticed that…' },
      { id: 'u2-ix2', t: 295, type: 'mcq',
        q: 'Pariser says algorithms filter based on what is "most relevant" to you. Why is this a problem for academic research?',
        opts: ['It makes searches too slow', 'You may never encounter evidence that challenges your existing views', 'It shows too many advertisements', 'Academic databases do not use algorithms'],
        ok: 1, fb: '✅ Academic thinking requires exposure to challenging perspectives. Filter bubbles create intellectual comfort zones — the opposite of scholarly inquiry.' },
      { id: 'u2-ix3', t: 490, type: 'refl', q: 'Pariser says "the internet shows us what it thinks we want to see — not what we need to see." As a future teacher, what does this mean for how you will help learners find reliable information?', ph: 'As a teacher, I would…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 3 — Veritasium: The Science of Thinking
  // ──────────────────────────────────────────────────────────
  unit3: {
    ctx: 'How the brain uses System 1 (fast, automatic) and System 2 (slow, deliberate) thinking — and implications for critical thinking.',
    scope: ['System 1 and System 2 thinking', 'Cognitive bias', 'The bat and ball problem', 'Metacognition', 'Why fast thinking fails us online'],
    outOfScope: ['Full list of all cognitive biases', 'Neuroscience of the brain in detail', 'How to diagnose cognitive disorders', 'Assignment help'],
    keyTerms: [
      { term: 'System 1 thinking', def: 'Fast, automatic, unconscious thinking — pattern recognition, intuition, emotional response. Requires little effort.' },
      { term: 'System 2 thinking', def: 'Slow, deliberate, conscious thinking — analysis, reasoning, evaluation. Requires effort and concentration.' },
      { term: 'Cognitive bias', def: 'A systematic error in thinking that occurs when System 1 shortcuts lead to inaccurate judgements.' },
      { term: 'Metacognition', def: 'Thinking about your own thinking — being aware of which thinking system you are using and whether it is appropriate.' },
      { term: 'Illusory truth effect', def: 'The tendency to believe something is true simply because you have heard it before — familiarity feels like accuracy.' },
    ],
    knowledge: [
      'Psychologist Daniel Kahneman identified two thinking systems: System 1 (fast, automatic, emotional) and System 2 (slow, deliberate, analytical).',
      'System 1 evolved for survival — quick pattern recognition was essential for our ancestors. It works well for routine decisions but fails on complex problems.',
      'The "bat and ball" problem illustrates System 1 failure: A bat and ball cost $1.10. The bat costs $1 more than the ball. Most people intuitively answer 10 cents — but the correct answer is 5 cents.',
      'Confirmation bias is a System 1 phenomenon: we automatically favour information that matches our existing beliefs without engaging System 2 to evaluate it.',
      'Misinformation exploits System 1 thinking — it is designed to feel immediately correct, emotionally resonant, and familiar.',
      'The illusory truth effect: repeated exposure to a false claim makes it feel more true, even if we know it is false.',
      'System 2 can override System 1 — but it requires deliberate effort and is easily exhausted (decision fatigue).',
      'Metacognition — thinking about your own thinking — is the skill that allows you to recognise when System 1 is misleading you.',
      'The video uses visual puzzles and paradoxes to demonstrate that System 1 failures are not a sign of low intelligence — they happen to everyone.',
      'For educators: students (and teachers) reading online content are primarily using System 1 — the goal of critical thinking education is to activate System 2 at appropriate moments.',
    ],
    chapters: [
      { t: 0,   n: 'Two Systems' },
      { t: 120, n: 'System 1 in Action' },
      { t: 280, n: 'When Fast Thinking Fails' },
      { t: 420, n: 'Thinking About Thinking' },
    ],
    ix: [
      { id: 'u3-ix1', t: 115, type: 'refl', q: 'The video has introduced System 1 and System 2 thinking. Give one example from your own student life where System 1 thinking led you to a wrong conclusion.', ph: 'One time my fast thinking led me astray was…' },
      { id: 'u3-ix2', t: 275, type: 'mcq',
        q: 'System 1 relies on pattern recognition. Why does this make us vulnerable to misinformation?',
        opts: ['We read too quickly and miss details', 'We mistake familiarity for truth — content matching our existing patterns feels correct even when false', 'System 1 only processes images, not text', 'Fast thinking uses less energy and is therefore lazier'],
        ok: 1, fb: '✅ The illusory truth effect: repeated exposure to a claim makes it feel more credible, regardless of evidence. Misinformation is designed to match existing patterns and be shared repeatedly.' },
      { id: 'u3-ix3', t: 415, type: 'refl', q: 'The video suggests metacognition — thinking about your own thinking. As a future teacher, how would you help Grade 10 learners develop this habit practically?', ph: 'A practical approach I could use is…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 4 — Cal Newport: Why You Should Quit Social Media
  // ──────────────────────────────────────────────────────────
  unit4: {
    ctx: 'Why deep, distraction-free work is becoming rarer and more valuable — and how to build the capacity for it.',
    scope: ['Deep work vs shallow work', 'Social media and attention', 'Cognitive residue', 'The craftsman approach to tools', 'Building focus as a skill'],
    outOfScope: ['Social media platform features', 'How to build apps', 'Newport\'s other books in detail', 'Assignment help'],
    keyTerms: [
      { term: 'Deep work', def: 'Professional activity performed in a state of distraction-free concentration that pushes your cognitive capabilities to their limit.' },
      { term: 'Shallow work', def: 'Non-cognitively demanding, logistical-style tasks often performed while distracted — easy to replicate, low value.' },
      { term: 'Attention residue', def: 'The mental traces left by a previous task that reduce the quality of attention on the current task, even after switching.' },
      { term: 'Craftsman approach', def: 'Newport\'s idea that you should adopt a tool only if its benefits substantially outweigh its harms to your core professional goals.' },
    ],
    knowledge: [
      'Cal Newport is a computer science professor at Georgetown University who has never had a social media account.',
      'Newport argues deep work — cognitively demanding, distraction-free work — is becoming both rarer and more economically valuable.',
      'Social media fragments attention even when you are not using it — the habit of constant checking rewires the brain to resist sustained focus.',
      'Researcher Gloria Mark found it takes an average of 23 minutes to return to full concentration after a digital interruption.',
      'Newport\'s "craftsman approach": adopt a tool only if its benefits to your core professional goals substantially outweigh its harms.',
      'Shallow work (email, social media, admin) fills the day and produces the feeling of productivity without the reality of it.',
      'Newport does NOT argue all social media is evil — he argues you should be deliberate rather than default in your tool choices.',
      'Deep work requires practice — it is a skill that deteriorates without use, but can be rebuilt through deliberate training.',
      'Newport suggests specific strategies: time-block your calendar, schedule "deep work sessions," do not take social media with you.',
      'For students: the inability to read long academic texts is often not a vocabulary or intelligence problem — it is an attention problem caused by fragmented digital habits.',
    ],
    chapters: [
      { t: 0,   n: 'The Problem' },
      { t: 150, n: 'Why Social Media?' },
      { t: 300, n: 'What You Lose' },
      { t: 450, n: 'The Alternative' },
    ],
    ix: [
      { id: 'u4-ix1', t: 145, type: 'refl', q: 'Newport has described the state of distracted knowledge work. What is your biggest source of distraction when you try to study?', ph: 'My experience is…' },
      { id: 'u4-ix2', t: 295, type: 'mcq',
        q: 'Newport argues social media fragments attention even when you are not using it. What does he mean?',
        opts: ['Apps drain your phone battery', 'The habit of constant checking rewires your brain to crave distraction, making deep focus harder even offline', 'Social media appears in dreams and affects sleep', 'Platforms track your study habits and send notifications'],
        ok: 1, fb: '✅ Newport\'s neurological argument: the habit of constant checking trains your brain to resist sustained focus. The brain adapts to its environment.' },
      { id: 'u4-ix3', t: 445, type: 'refl', q: 'Newport suggests quitting social media entirely. Is this realistic for a South African university student? What would be a practical version of his advice for your context?', ph: 'A realistic approach for me would be…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 5 — How Peer Review Works
  // ──────────────────────────────────────────────────────────
  unit5: {
    ctx: 'The peer review process in academic publishing — from submission to publication.',
    scope: ['The peer review process step by step', 'Why peer review matters', 'Open access vs paywalled journals', 'The role of journal editors and reviewers', 'Preprints and their status'],
    outOfScope: ['How to write a journal article', 'Specific journal submission guidelines', 'Assignment help'],
    keyTerms: [
      { term: 'Peer review', def: 'Independent evaluation of a research paper by experts in the same field before publication.' },
      { term: 'Double-blind review', def: 'A peer review process where both the author and the reviewers are anonymous to each other.' },
      { term: 'Preprint', def: 'A research paper shared publicly before peer review — it has not yet been independently verified.' },
      { term: 'Open access', def: 'Publishing model where research is freely available to anyone online, without a paywall.' },
    ],
    knowledge: [
      'Peer review is the quality control process of academic publishing — papers are evaluated by independent experts before publication.',
      'The basic process: author submits paper → editor screens it → 2-3 expert reviewers evaluate it anonymously → reviewers recommend accept, revise, or reject → editor makes final decision.',
      'Most submitted papers are rejected or require major revision — being published in a reputable journal means the work survived critical scrutiny.',
      'In double-blind review, neither the author nor the reviewers know each other\'s identities — this reduces bias.',
      'Peer review can take months to over a year — this is why research findings take time to reach publication.',
      'Preprints are research papers shared before peer review. They are valuable for speed but have not been independently verified.',
      'Open access journals are freely available to read online. Many reputable journals (including South African Journal of Education) are open access.',
      'Limitations of peer review: it is slow, relies on volunteer reviewers, and does not catch all errors — but it is still the best quality standard we have.',
      'A paper being peer-reviewed does not guarantee it is correct — but it does mean independent experts found no fatal flaws in the methodology.',
      'Predatory journals claim to be peer-reviewed but accept papers for a fee without genuine review — always check if a journal is listed in legitimate indices like Scopus.',
    ],
    chapters: [
      { t: 0,   n: 'What is Peer Review?' },
      { t: 90,  n: 'Submission Process' },
      { t: 210, n: 'The Review Stage' },
      { t: 330, n: 'Accept or Reject' },
    ],
    ix: [
      { id: 'u5-ix1', t: 85, type: 'refl', q: 'Before seeing how peer review works — why do you think having your research checked by other experts before publication matters? What could go wrong without it?', ph: 'Without peer review, I think…' },
      { id: 'u5-ix2', t: 205, type: 'mcq',
        q: 'A preprint is a paper shared before peer review. Which statement about preprints is TRUE?',
        opts: ['Preprints are fake papers and should never be used', 'Preprints are valuable for seeing cutting-edge research but have not yet been independently verified', 'Preprints are only written by junior researchers', 'Preprints become peer-reviewed automatically after 6 months'],
        ok: 1, fb: '✅ Preprints can be valuable — especially in fast-moving fields. But they carry more risk than peer-reviewed papers. If you cite a preprint, say so explicitly. Always check if a peer-reviewed version has since been published.' },
      { id: 'u5-ix3', t: 325, type: 'refl', q: 'A reviewer has rejected your paper but given detailed feedback. How is this rejection actually a valuable part of the research process?', ph: 'A rejection with feedback is valuable because…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 6 — Scopus AI
  // ──────────────────────────────────────────────────────────
  unit6: {
    ctx: 'How to search Scopus effectively — using filters, date ranges, and subject refinements to find peer-reviewed literature.',
    scope: ['How to search Scopus step by step', 'Using filters and date ranges', 'Citation analysis in Scopus', 'Exporting results', 'How Scopus differs from Google Scholar'],
    outOfScope: ['How to access Scopus without institutional access', 'Scopus pricing', 'Other database platforms in detail', 'Assignment help'],
    keyTerms: [
      { term: 'Scopus', def: 'The world\'s largest curated abstract and citation database of peer-reviewed literature, maintained by Elsevier.' },
      { term: 'Natural language query', def: 'Searching using conversational language rather than technical Boolean operators.' },
      { term: 'Citation count', def: 'How many other papers have referenced a given paper — a rough indicator of its influence in the field.' },
      { term: 'Abstract', def: 'A short summary (150–300 words) of a research paper\'s purpose, methods, findings, and conclusions.' },
    ],
    knowledge: [
      'Scopus indexes over 90 million research records from more than 7,000 publishers — all verified, peer-reviewed academic content.',
      'Scopus AI allows researchers to search using plain conversational language rather than Boolean strings (AND, OR, NOT).',
      'Scopus only indexes peer-reviewed and verified academic content — unlike Google Scholar, which includes preprints and grey literature.',
      'When Scopus returns a citation, the paper exists — unlike AI chatbots which can generate fake citations.',
      'Citation count in Scopus indicates how often a paper has been cited by other researchers — highly cited papers are often landmark studies.',
      'You can filter Scopus results by year range, document type (article, review, conference paper), subject area, and country.',
      'Scopus AI can summarise key themes across a set of search results — useful for getting an overview of a field quickly.',
      'Scopus is a subscription service — most universities provide access through their library systems.',
      'Google Scholar is broader (more documents) but less curated. Use Scopus for verified peer-reviewed sources; use Google Scholar to find open-access versions.',
      'A good Scopus search includes: specific topic + context + time range. Example: "teacher professional development secondary schools South Africa 2018-2024".',
    ],
    chapters: [
      { t: 0,   n: 'What is Scopus?' },
      { t: 90,  n: 'Natural Language Search' },
      { t: 220, n: 'Filtering Results' },
      { t: 330, n: 'Citation Analysis' },
    ],
    ix: [
      { id: 'u6-ix1', t: 85, type: 'refl', q: 'Before trying Scopus AI — what do you think the advantage is of searching a curated database of only peer-reviewed content versus searching the open internet?', ph: 'I think the advantage is…' },
      { id: 'u6-ix2', t: 215, type: 'mcq',
        q: 'You search Scopus AI for "effects of technology on learning." It returns 400,000 results. What is the most effective next step?',
        opts: ['Read the first 10 results — they are probably the most relevant', 'Narrow your search: add a specific context (e.g. "South Africa"), a date range, and a specific outcome (e.g. "academic performance")', 'Switch to Google Scholar — Scopus has too many results', 'Use the citation count to identify the top 5 most-cited papers and only read those'],
        ok: 1, fb: '✅ Broad searches return too many results to use effectively. Specificity is everything: add your context (South African secondary schools), your population (Grade 9 learners), and your variable (smartphone use, reading outcomes) to get a manageable and relevant result set.' },
      { id: 'u6-ix3', t: 325, type: 'refl', q: 'What does a high citation count tell you about a paper — and what does it NOT tell you?', ph: 'A high citation count tells me… but it does not tell me…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 7 — SIFT Framework
  // ──────────────────────────────────────────────────────────
  unit7: {
    ctx: 'The SIFT framework for evaluating online sources — Stop, Investigate, Find, Trace.',
    scope: ['The four SIFT steps in detail', 'Lateral reading technique', 'Why "About Us" pages are unreliable', 'How professional fact-checkers work', 'Applying SIFT to education sources'],
    outOfScope: ['Full fact-check of specific South African claims', 'How to use specific fact-checking websites', 'Assignment help'],
    keyTerms: [
      { term: 'SIFT', def: 'Stop, Investigate the source, Find better coverage, Trace claims to origin — a four-step source evaluation framework.' },
      { term: 'Lateral reading', def: 'Verifying a source by opening new tabs and reading what others say about it — not reading the source itself more carefully.' },
      { term: 'Upstream source', def: 'The original source of a claim — many media articles are based on earlier reports, which may have been based on research, which is the upstream source.' },
    ],
    knowledge: [
      'SIFT was developed by Mike Caulfield, a media literacy researcher, based on how professional fact-checkers actually evaluate sources.',
      'S — Stop: Before reading, sharing, or believing anything, pause your emotional reaction. If content makes you angry, scared, or excited — that is exactly when to slow down.',
      'I — Investigate the source: Before reading the content, open a new tab and search what others say about the source. Not what the source says about itself.',
      'F — Find better coverage: Look for the best available evidence on the claim — not just the first result. Is there a peer-reviewed paper? An official statement? A fact-check?',
      'T — Trace claims to their origin: Most content is borrowed and re-reported. Trace back to the original study, statement, or data and evaluate that.',
      'Lateral reading is faster and more reliable than close reading — professional fact-checkers spend less than 30 seconds on a source before opening other tabs.',
      'The "About Us" page of a website is written by the website itself — it cannot be used to verify the website\'s credibility.',
      'Emotional content is specifically designed to bypass your SIFT instincts — outrage, fear, and excitement make you want to share before you investigate.',
      'Africa Check is South Africa\'s leading independent fact-checking organisation — useful in the "Find better coverage" step.',
      'SIFT is not about being skeptical of everything — it is about knowing specifically WHY you trust what you trust.',
    ],
    chapters: [
      { t: 0,   n: 'Why Old Methods Fail' },
      { t: 90,  n: 'S — Stop' },
      { t: 180, n: 'I — Investigate' },
      { t: 300, n: 'F — Find & T — Trace' },
    ],
    ix: [
      { id: 'u7-ix1', t: 85, type: 'refl', q: 'Caulfield argues that traditional media literacy advice ("read carefully, check for bias") does not work. Why do you think that might be true? What does reading carefully NOT tell you?', ph: 'Reading carefully does not tell you…' },
      { id: 'u7-ix2', t: 175, type: 'mcq',
        q: 'Lateral reading means:',
        opts: ['Reading an article very carefully from beginning to end', 'Opening new browser tabs to find what others say about the source you are evaluating', 'Skimming headings and bold text', 'Reading the About Us and Contact pages of a website'],
        ok: 1, fb: '✅ Lateral reading takes you off the source immediately. You cannot trust what a source says about itself. In under 3 minutes of lateral reading, you will know more about a source\'s credibility than hours of close reading.' },
      { id: 'u7-ix3', t: 295, type: 'refl', q: 'A WhatsApp message circulates among teachers claiming the DBE has cancelled a major exam. Apply SIFT in your head — what would you do at each step before forwarding it?', ph: 'At each step of SIFT I would…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 8 — AI Research Tools
  // ──────────────────────────────────────────────────────────
  unit8: {
    ctx: 'Which AI research tools are reliable for academic work — and how to verify every output before using it in an assignment.',
    scope: ['How Elicit works', 'How ResearchRabbit maps connected papers', 'Why AI chatbots hallucinate citations', 'Verification workflow for AI-generated references', 'Comparing retrieval vs generative AI tools'],
    outOfScope: ['How to build AI tools', 'Full tutorial on every AI platform', 'Assignment help'],
    keyTerms: [
      { term: 'Elicit', def: 'An AI research tool that searches peer-reviewed databases and summarises paper findings. Uses real papers, not generated text.' },
      { term: 'ResearchRabbit', def: 'A free tool that maps the network of papers connected to a seed paper — showing what came before and what cited it after.' },
      { term: 'Hallucinated citation', def: 'A reference generated by an AI chatbot that looks like a real paper but does not exist.' },
      { term: 'Retrieval tool', def: 'A tool that finds and returns real documents from a real database — as opposed to generating text.' },
    ],
    knowledge: [
      'Elicit searches peer-reviewed databases and returns real papers with verified citations — it is a retrieval tool, not a generative one.',
      'ResearchRabbit maps the network of connections between papers — you input one key paper and it shows you what papers cited it and what it cited.',
      'Perplexity AI searches the live web and provides cited sources — it is more reliable than ChatGPT for citations but still requires verification.',
      'ChatGPT, Claude, and Gemini are generative AI tools — they produce text based on patterns in training data, not live database queries.',
      'Hallucinated citations look exactly like real ones — correct format, plausible author names, realistic journal titles — but the paper does not exist.',
      'The only way to verify an AI-generated citation is to search the exact title in Scopus or Google Scholar and confirm every detail matches.',
      'Do NOT ask ChatGPT to verify its own citations — it will confidently confirm hallucinated references.',
      'AI chatbots are useful for brainstorming search terms, understanding complex concepts, and identifying broad debates — just not for citations.',
      'The rule: AI generates → you verify. Every time. No exceptions. Before submitting any AI-assisted research.',
      'Using a hallucinated citation in an assignment is academic misconduct, even if you did not know it was false.',
    ],
    chapters: [
      { t: 0,   n: 'The Promise' },
      { t: 100, n: 'Elicit Demo' },
      { t: 220, n: 'ResearchRabbit' },
      { t: 340, n: 'The Hallucination Problem' },
    ],
    ix: [
      { id: 'u8-ix1', t: 95, type: 'refl', q: 'Elicit is about to be demonstrated. Based on what you know so far — what do you think is the key difference between a tool that retrieves papers from a database and a tool that generates text?', ph: 'The key difference is…' },
      { id: 'u8-ix2', t: 215, type: 'mcq',
        q: 'You use ChatGPT to find 5 references on your topic. It provides 5 detailed, well-formatted citations. What must you do FIRST?',
        opts: ['Use them directly — they look professional and well-formatted', 'Ask ChatGPT to double-check them', 'Search each title in Scopus or Google Scholar to verify they exist and say what ChatGPT claims', 'Use only the 3 most recently published ones'],
        ok: 2, fb: '✅ ChatGPT cannot verify its own output. The only verification is searching the title in Scopus or Google Scholar. If the paper does not appear, or the details do not match, it is a hallucination — discard and find a real source.' },
      { id: 'u8-ix3', t: 335, type: 'refl', q: 'A classmate says "I always use ChatGPT for my references because it is faster." What would you tell them — specifically — about why this is a risk?', ph: 'I would tell them…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 9 — Zotero Reference Management
  // ──────────────────────────────────────────────────────────
  unit9: {
    ctx: 'Using Zotero to collect, organise, and cite sources — and the ethics of academic citation.',
    scope: ['Installing and using Zotero', 'Saving sources to Zotero', 'Generating reference lists', 'APA 7th formatting in Zotero', 'Why auto-generated references must be checked'],
    outOfScope: ['Other reference managers in detail (Mendeley, EndNote)', 'Manual APA formatting of unusual sources', 'Assignment help'],
    keyTerms: [
      { term: 'Zotero', def: 'A free, open-source reference management tool that saves sources, generates citations, and inserts references into documents.' },
      { term: 'Browser extension', def: 'A small add-on installed in your browser. The Zotero connector saves web pages and academic papers directly to your Zotero library with one click.' },
      { term: 'Citation style', def: 'A standardised format for references — APA, Harvard, Chicago, MLA. Zotero can generate references in any style.' },
      { term: 'DOI', def: 'Digital Object Identifier — a permanent link to a published document. Always include the DOI in academic references when available.' },
    ],
    knowledge: [
      'Zotero is a free, open-source reference manager used by professional researchers worldwide.',
      'The Zotero browser connector allows you to save a paper directly from Scopus, Google Scholar, or a journal website with a single click.',
      'Zotero automatically extracts metadata (author, title, journal, year, DOI) when you save a source.',
      'You can organise sources into collections (like folders) — useful for organising sources by assignment or theme.',
      'Zotero can generate a reference list in any citation style (APA, Harvard, Chicago) and insert in-text citations directly into Word or Google Docs.',
      'APA 7th is the most common citation style in education research. Zotero supports APA 7th.',
      'Important limitation: Zotero\'s auto-generated references contain errors — especially for online articles, grey literature, and non-standard sources. Always check against the APA 7th manual.',
      'Common Zotero errors: wrong capitalisation in titles (APA 7th uses sentence case for article titles), missing DOI, incorrect author name format.',
      'A reference is not correct just because Zotero generated it. You are responsible for the accuracy of every reference you submit.',
      'Organising sources in Zotero from the start of a research project saves enormous time when writing the reference list at the end.',
    ],
    chapters: [
      { t: 0,   n: 'Installing Zotero' },
      { t: 90,  n: 'Saving Sources' },
      { t: 200, n: 'Organising Your Library' },
      { t: 300, n: 'Generating References' },
    ],
    ix: [
      { id: 'u9-ix1', t: 85, type: 'refl', q: 'Before this tutorial — how were you managing your sources and references for university assignments? What problems did that approach cause?', ph: 'Before Zotero, I was…' },
      { id: 'u9-ix2', t: 195, type: 'mcq',
        q: 'Zotero auto-generates your reference list. Why should you still check every entry manually?',
        opts: ['Zotero references are always perfect — checking is unnecessary', 'Zotero sometimes generates incorrect capitalisation, missing DOIs, and wrong author formats — you are responsible for accuracy', 'Only check if your lecturer asks you to', 'Only check references from non-English sources'],
        ok: 1, fb: '✅ Zotero is a tool, not a guarantee. Auto-generated references regularly contain errors — especially capitalisation (APA 7th requires sentence case for article titles) and missing digital identifiers. Submitting an incorrect reference list is your mistake, not Zotero\'s.' },
      { id: 'u9-ix3', t: 295, type: 'refl', q: 'You are about to generate your reference list for your first university assignment. Based on this tutorial, what are the two most important things to check in every auto-generated reference?', ph: 'The two most important things to check are…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 11 — Cornell Note Taking System
  // ──────────────────────────────────────────────────────────
  unit11: {
    ctx: 'Effective note-taking strategies for academic study — Cornell method, active recall, and synthesising across sources.',
    scope: ['Cornell note-taking method', 'Note-taking for thinking vs transcription', 'Active recall and spaced repetition', 'Connecting notes across sources', 'Zettelkasten and atomic notes'],
    outOfScope: ['Study timetabling', 'Exam preparation outside reading', 'Memory techniques unrelated to notes'],
    keyTerms: [
      { term: 'Cornell method', def: 'A structured note-taking layout: main notes in a wide right column, cue words/questions in a narrow left column, summary at the bottom.' },
      { term: 'Active recall', def: 'Retrieving information from memory rather than re-reading — the left column cues in Cornell notes are designed for this.' },
      { term: 'Atomic note', def: 'A note that captures one idea only, in your own words, so it can be linked to other notes independently.' },
    ],
    knowledge: [
      'The Cornell method divides a page into three sections: a wide notes column on the right, a cue column on the left, and a summary section at the bottom.',
      'The left cue column is filled in after the lecture or reading — not during — using key words, questions, or prompts that help you recall the notes without looking at them.',
      'The summary at the bottom forces you to synthesise the whole page into 2–3 sentences in your own words.',
      'Note-taking by transcription (copying what you hear or read word-for-word) is less effective than note-taking that forces you to rephrase ideas.',
      'The Zettelkasten method emphasises atomic notes: one idea per note, written in your own words, with explicit links to related notes.',
      'Connecting ideas across sources — finding where Vygotsky and a contemporary study agree or disagree — is more valuable than summarising each source separately.',
    ],
    chapters: [
      { t: 0,   n: 'Why most note-taking fails' },
      { t: 120, n: 'The Cornell layout explained' },
      { t: 280, n: 'The cue column — active recall' },
      { t: 400, n: 'The summary section' },
    ],
    ix: [
      { id: 'u11-ix1', t: 115, type: 'refl', q: 'How do you currently take notes — during lectures and when reading? What problems does that approach create when you later try to write an essay?', ph: 'When I take notes, I usually…' },
      { id: 'u11-ix2', t: 375, type: 'mcq',
        q: 'What is the PURPOSE of the cue column in Cornell notes — the narrow left column?',
        opts: [
          'To write the date and page number',
          'To write key words, questions, or prompts you can use to test yourself — covering the main notes and seeing if you can recall them from the cue alone',
          'To copy the textbook headings',
          'To write your to-do list for the day',
        ],
        ok: 1, fb: '✅ The cue column transforms your notes from a record into a revision tool. Cover the right column and see if you can recall the ideas from the cues alone — that is active recall, one of the most effective study strategies in education research.' },
      { id: 'u11-ix3', t: 510, type: 'refl', q: 'Take one reading from this module and create 3 Cornell-style cue words or questions for it. Write them here — what would you need to be able to recall to demonstrate you have understood that reading?', ph: 'Three cue words/questions for the reading are…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 13 — Academic Register: Formal vs Informal Language
  // ──────────────────────────────────────────────────────────
  unit13: {
    ctx: 'Academic register, hedging language, and the difference between formal and informal writing in university contexts.',
    scope: ['Formal vs informal register', 'Hedging language in academic writing', 'Avoiding casual language and contractions', 'Academic voice development', 'Discipline-specific language conventions'],
    outOfScope: ['Creative writing', 'Journalistic writing', 'Business communication outside academic contexts'],
    keyTerms: [
      { term: 'Register', def: 'The variety of language used in a particular social situation — academic register uses formal vocabulary, full sentences, and hedged claims.' },
      { term: 'Hedging', def: 'Using language that qualifies a claim to show appropriate academic caution — e.g. "suggests," "may indicate," "appears to."' },
      { term: 'Academic voice', def: 'A consistent formal, evidence-based writing style that makes claims precisely, attributes ideas to sources, and avoids personal informality.' },
    ],
    knowledge: [
      'Academic register uses full words — do not, cannot, it is — rather than contractions — don\'t, can\'t, it\'s.',
      'Hedging language (may, suggests, appears to, tends to) shows appropriate academic caution and is not a sign of weakness — it accurately represents the strength of evidence.',
      'First person (I, we) is increasingly acceptable in academic writing but should be used purposefully — for clearly marking your own argument or reflection.',
      'Informal intensifiers like "very," "really," "obviously," and "clearly" weaken academic writing by asserting rather than demonstrating.',
      'Discipline-specific vocabulary used correctly is a sign of academic fluency — but jargon without understanding is a red flag.',
      'Revising informal writing into academic register means more than replacing words — it means restructuring sentences to make explicit what was implied.',
    ],
    chapters: [
      { t: 0,   n: 'What is register?' },
      { t: 90,  n: 'Informal vs formal: examples' },
      { t: 220, n: 'Hedging and precision' },
      { t: 320, n: 'Revision strategies' },
    ],
    ix: [
      { id: 'u13-ix1', t: 85, type: 'refl', q: 'Write 2–3 sentences about a topic from your teaching subject in the way you would speak out loud to a friend. Then note: what would need to change to make this academic writing?', ph: 'Informal version: … What needs to change: …' },
      { id: 'u13-ix2', t: 315, type: 'mcq',
        q: 'Which sentence uses hedging language CORRECTLY for an academic claim based on limited evidence?',
        opts: [
          'Play-based learning definitely causes better outcomes in all Foundation Phase classrooms.',
          'Obviously, learners in well-resourced schools always perform better.',
          'The available evidence suggests that play-based approaches may support cognitive development in early childhood contexts, though contextual factors significantly mediate this relationship.',
          'Everybody knows that technology improves student engagement.',
        ],
        ok: 2, fb: '✅ Option C hedges appropriately: "suggests" (not proves), "may support" (not causes), and "contextual factors significantly mediate this relationship" acknowledges the complexity of the evidence without abandoning the claim. The other options overclaim or use informal intensifiers.' },
      { id: 'u13-ix3', t: 430, type: 'refl', q: 'Take this informal sentence and revise it into academic register: "It\'s really obvious that poor schools struggle way more than rich schools because they don\'t have enough money." Write your revised version here.', ph: 'Revised academic version: …' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 14 — Data Visualisation: The Beauty of Information
  // ──────────────────────────────────────────────────────────
  unit14: {
    ctx: 'Data visualisation, visual arguments, and how graphical representations of information make rhetorical claims.',
    scope: ['How data visualisations make arguments', 'Reading graphs and charts analytically', 'Scale, baseline, and visual distortion', 'Identifying what a visual leaves out', 'Creating honest visual arguments'],
    outOfScope: ['Graphic design software tutorials', 'Photography and art', 'Film and video production'],
    keyTerms: [
      { term: 'Visual rhetoric', def: 'The use of design choices — scale, colour, framing, labelling — to shape how an audience interprets data.' },
      { term: 'Truncated axis', def: 'A y-axis that starts above zero, making small differences appear visually larger than they are.' },
      { term: 'Chartjunk', def: 'Visual elements in a graph that add decoration without adding information — coined by Edward Tufte.' },
    ],
    knowledge: [
      'Every data visualisation makes rhetorical choices — what to show, what scale to use, what colours to assign — that shape interpretation.',
      'A truncated y-axis (starting above 0) makes small differences look dramatic — check where the y-axis starts on any graph before drawing conclusions.',
      'The source of the data matters for interpretation — an organisation measuring its own programme\'s outcomes has an incentive to present positive results.',
      'What a visual leaves out is as important as what it shows — context, baseline comparisons, and excluded data categories can completely change interpretation.',
      'Chartjunk (decorative 3D effects, unnecessary gridlines) makes data harder to read accurately.',
      'Honest data visualisation uses appropriate scales, clear labelling, and presents data that could refute as well as support the argument.',
    ],
    chapters: [
      { t: 0,   n: 'Information is beautiful' },
      { t: 180, n: 'What data visualisation can reveal' },
      { t: 420, n: 'When visuals mislead' },
      { t: 700, n: 'Designing for truth' },
    ],
    ix: [
      { id: 'u14-ix1', t: 175, type: 'refl', q: 'McCandless says information can be beautiful. Think of one data visualisation you have seen recently — in news, social media, or an academic paper. What did it make immediately visible that would have been hidden in a table of numbers?', ph: 'A visualisation that revealed something for me was…' },
      { id: 'u14-ix2', t: 415, type: 'mcq',
        q: 'A graph shows South African Grade 4 reading scores rising steadily from 2016 to 2021. The y-axis starts at 80% instead of 0%. What is the main analytical problem?',
        opts: [
          'The graph should show data from more years',
          'Starting the y-axis at 80% makes a small actual improvement look like a dramatic rise — you cannot judge the magnitude of change without seeing the full scale from 0%',
          'Reading scores are not important enough to graph',
          'The graph needs a title',
        ],
        ok: 1, fb: '✅ A truncated y-axis is one of the most common ways data visuals mislead. If scores rose from 82% to 85%, that is a 3-percentage-point improvement. On a full 0–100% scale, it looks modest. Starting at 80% makes it look like scores nearly doubled. Always check the baseline.' },
      { id: 'u14-ix3', t: 800, type: 'refl', q: 'Apply the four analytical questions from the unit reading to any data visualisation you have encountered: What is being measured? What is the scale/baseline? Who is the source? What is outside the frame?', ph: 'Visual I am analysing: … My four-question analysis: …' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 15 — How to Give Effective Feedback
  // ──────────────────────────────────────────────────────────
  unit15: {
    ctx: 'Academic feedback, peer review protocols, and what makes feedback genuinely useful for improving writing.',
    scope: ['Criterion-referenced feedback', 'Peer review protocol steps', 'Feedforward vs feedback', 'Specific vs vague feedback', 'How to receive and use feedback to revise'],
    outOfScope: ['Giving feedback in workplace settings outside academia', 'Performance reviews', 'Counselling or emotional support'],
    keyTerms: [
      { term: 'Criterion-referenced feedback', def: 'Feedback that refers to specific agreed criteria rather than general impressions — tells the writer exactly which standard is or is not met.' },
      { term: 'Feedforward', def: 'Feedback focused on what to do differently next time, not just what went wrong this time.' },
      { term: 'Hattie & Timperley framework', def: 'Three feedback questions: Where am I going? How am I going? Where to next? — feedback is only effective when it addresses all three.' },
    ],
    knowledge: [
      'Hattie and Timperley (2007) found feedback is only effective when it addresses: Where am I going? How am I going? Where to next?',
      'Vague positive feedback ("great work!") cannot be acted on and may actually reduce motivation to revise.',
      'Useful feedback names a specific location in the text, identifies which criterion is addressed, and describes what an improved version would contain.',
      'The most important gap to identify in a peer review is the single highest-priority issue — not a comprehensive list of every problem.',
      'Giving peer feedback improves your own writing because evaluating someone else\'s work against a rubric makes the criteria concrete in a way that reading the rubric alone does not.',
      'The four-part peer review protocol: (1) engage with criteria, (2) name what works specifically, (3) identify the most important gap, (4) describe what improvement looks like.',
    ],
    chapters: [
      { t: 0,   n: 'Why feedback often fails' },
      { t: 120, n: 'What makes feedback work' },
      { t: 240, n: 'The feedback sandwich problem' },
      { t: 360, n: 'Writing criterion-referenced feedback' },
    ],
    ix: [
      { id: 'u15-ix1', t: 115, type: 'refl', q: 'Think of the most useful piece of feedback you have ever received on your writing — from a teacher, peer, or anyone. What made it useful? Was it specific? Did it tell you exactly what to change?', ph: 'The most useful feedback I received was… It worked because…' },
      { id: 'u15-ix2', t: 355, type: 'mcq',
        q: 'A peer reviewer writes: "Your introduction is good but could be improved." According to the unit, what is the critical problem with this feedback?',
        opts: [
          'It is too short',
          'It does not say which specific element of the introduction is good, what criterion it meets, what "improved" would mean in practice, or what action the writer should take — it cannot be acted on',
          'It should be more positive',
          'It should compare the writer to other students',
        ],
        ok: 1, fb: '✅ "Could be improved" is one of the least useful feedback phrases in existence — every piece of writing could be improved. Useful feedback names the specific element, evaluates it against a specific criterion, and describes what improvement would look like.' },
      { id: 'u15-ix3', t: 470, type: 'refl', q: 'Write a feedforward comment for this student sentence: "Technology is changing education in many ways." Your comment should name a specific problem, reference a specific criterion (PEEL, academic register, evidence), and describe what an improved version would contain.', ph: 'My feedforward comment: …' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 16 — Prompt Engineering for Academic Work
  // ──────────────────────────────────────────────────────────
  unit16: {
    ctx: 'Prompt engineering for academic work — the CREATE framework, chain-of-thought prompting, and understanding AI hallucination.',
    scope: ['CREATE framework for academic prompts', 'Why vague prompts fail', 'Chain-of-thought prompting', 'AI hallucination and citation verification', 'What AI cannot do for academic work'],
    outOfScope: ['Technical AI development', 'Programming or API access', 'Image generation'],
    keyTerms: [
      { term: 'CREATE framework', def: 'Character, Request, Examples, Adjustments, Type, Extras — a structured prompt design framework.' },
      { term: 'Hallucination', def: 'A confident, plausible-sounding AI output that is factually wrong — most dangerously, a fabricated citation.' },
      { term: 'Chain-of-thought prompting', def: 'Asking the AI to show step-by-step reasoning before giving a conclusion — improves accuracy on complex tasks.' },
    ],
    knowledge: [
      'Broad prompts produce broad, generic responses — specificity of prompt directly determines specificity of output.',
      'The CREATE framework: Character (role), Request (task), Examples (what good looks like), Adjustments (constraints), Type (output format), Extras (additional guidance).',
      'Examples in a prompt are the most powerful element — showing what you want is more effective than describing it.',
      'AI citation hallucination: AI tools regularly generate non-existent papers in correct APA format. Always verify every AI-generated citation against Scopus or Google Scholar.',
      'Chain-of-thought prompting: "Before answering, think step by step..." improves accuracy on multi-step reasoning tasks.',
      'AI cannot know your specific assignment question, your lecturer\'s expectations, or your course\'s theoretical framework. It cannot replace reading and analytical engagement.',
    ],
    chapters: [
      { t: 0,   n: 'Why prompts matter' },
      { t: 120, n: 'Role and context setting' },
      { t: 250, n: 'Few-shot prompting (examples)' },
      { t: 380, n: 'Output format and constraints' },
    ],
    ix: [
      { id: 'u16-ix1', t: 115, type: 'refl', q: 'Think of a time you used AI for academic work and the output was not useful. What was your prompt? Based on what you have just watched, what would you change about it?', ph: 'My original prompt was… I would change it by…' },
      { id: 'u16-ix2', t: 245, type: 'mcq',
        q: 'According to the CREATE framework, which element is most often missing from student prompts but most improves AI output quality?',
        opts: ['Character (telling AI to play a role)', 'Examples (showing AI what a good output looks like)', 'Type (specifying output format)', 'Extras (adding extra instructions)'],
        ok: 1, fb: '✅ Examples (few-shot prompting) is consistently the most powerful element of prompt design. Telling AI what you want is less effective than showing it. If you want a PEEL paragraph critique, include an example of strong PEEL feedback in the prompt — the AI now has a concrete reference rather than an abstract description.' },
      { id: 'u16-ix3', t: 475, type: 'refl', q: 'Design a CREATE prompt for getting AI feedback on your Unit 12 PEEL paragraph. Write out all six elements explicitly.', ph: 'C: … R: … E: … A: … T: … X: …' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 17 — Literature Mapping & Synthesis
  // ──────────────────────────────────────────────────────────
  unit17: {
    ctx: 'Writing a literature review — from individual sources to thematic synthesis, using citation networks and synthesis matrices.',
    scope: ['Literature review structure', 'Source-by-source vs thematic synthesis', 'Building a synthesis matrix', 'Writing integrated literature review paragraphs', 'Gap statements'],
    outOfScope: ['Systematic reviews and meta-analyses', 'Statistical synthesis', 'Research methodology design'],
    keyTerms: [
      { term: 'Thematic synthesis', def: 'Organising sources by argument or theme rather than summarising each separately.' },
      { term: 'Synthesis matrix', def: 'A table mapping sources against themes — reveals patterns before you write.' },
      { term: 'Gap statement', def: 'A sentence identifying what existing research does not yet explain — justifying your research question.' },
    ],
    knowledge: [
      'A literature review is a map of a research conversation, not a list of summaries.',
      'Source-by-source writing ("Smith says... Jones says...") shows you have read sources but not synthesised them.',
      'A synthesis matrix (sources as rows, themes as columns) reveals patterns invisible in a stack of papers.',
      'Citation network tools (ResearchRabbit, Connected Papers) identify foundational papers — the most central, most-cited nodes are your mandatory starting points.',
      'Thematic paragraph structure: topic sentence states the pattern across sources, then evidence weaves multiple sources together.',
      'A gap statement establishes the rationale for your own research question by identifying what the field has not yet addressed.',
    ],
    chapters: [
      { t: 0,   n: 'What a literature review does' },
      { t: 150, n: 'Source-by-source vs thematic structure' },
      { t: 320, n: 'Building a synthesis matrix' },
      { t: 500, n: 'Writing the thematic paragraph' },
    ],
    ix: [
      { id: 'u17-ix1', t: 145, type: 'refl', q: 'Think of a reading you have done for any university course. In one sentence: what is the main argument of that reading? Now: how does it connect to or contrast with ONE other reading you have done? That connection is the beginning of synthesis.', ph: 'Source 1 argues… Source 2 argues… The connection/tension between them is…' },
      { id: 'u17-ix2', t: 315, type: 'mcq',
        q: 'A student writes: "Smith (2020) found X. Jones (2021) found Y. Patel (2022) found Z." What type of writing is this?',
        opts: ['Thematic synthesis', 'An annotated bibliography paragraph — each source is described separately with no integration', 'A gap statement', 'A methodology section'],
        ok: 1, fb: '✅ Listing what each source says separately is annotated bibliography writing, not literature review synthesis. Synthesis asks: what do these three findings mean together? Do they converge on a pattern? Contradict each other? Address the same question from different angles? The synthesis move is: "Three studies converge on X (Smith, 2020; Jones, 2021; Patel, 2022), though they diverge in their explanation of why..."' },
      { id: 'u17-ix3', t: 595, type: 'refl', q: 'You have three sources on play-based learning. Using only their titles and abstracts, write a 2-sentence thematic synthesis: what do they collectively argue, and where do they differ?', ph: 'Collectively, these studies argue… However, they differ in…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 18 — No video (reflective unit)
  // ──────────────────────────────────────────────────────────

  // ──────────────────────────────────────────────────────────
  // UNIT 19 — Literature Review (same video as unit17)
  // ──────────────────────────────────────────────────────────
  unit19: {
    ctx: 'Writing integrated, thematic literature review paragraphs — from synthesis matrix to scholarly positioning.',
    scope: ['Thematic paragraph writing', 'Integrative synthesis technique', 'Scholarly positioning', 'Gap statements', 'Completing a full literature review section'],
    outOfScope: ['Full dissertation methodology', 'Statistical analysis', 'Systematic review protocols'],
    keyTerms: [
      { term: 'Integrative synthesis', def: 'Weaving multiple sources into a single flowing argument — sources as evidence, not items to be described in turn.' },
      { term: 'Scholarly positioning', def: 'Establishing your own analytical position in relation to the literature — where you agree, disagree, and where your argument is located.' },
      { term: 'Thematic paragraph', def: 'A paragraph organised around a theme or argument, with all sources contributing to one claim stated in the topic sentence.' },
    ],
    knowledge: [
      'The strongest literature review paragraphs open with a thematic claim, not "researchers have studied X."',
      'Integrative synthesis weaves sources together: "(Smith, 2020; Jones, 2021; Patel, 2022)" after a claim, not three separate sentences.',
      'Scholarly positioning means moving from "here is what researchers say" to "here is where the field has a gap and where my argument is located."',
      'Pointing to theoretical divergence (Smith is behaviourist, Jones is constructivist) explains apparent contradictions in findings.',
      'The gap statement is the bridge from literature review to research question.',
    ],
    chapters: [
      { t: 0,   n: 'What makes a strong literature review' },
      { t: 200, n: 'Source-by-source vs thematic' },
      { t: 420, n: 'Writing the integrated paragraph' },
      { t: 600, n: 'Positioning yourself in the literature' },
    ],
    ix: [
      { id: 'u19-ix1', t: 195, type: 'refl', q: 'Take any two readings from this module. Write one sentence that synthesises them — what do they agree on? Or: where do they most productively disagree?', ph: 'Both [source 1] and [source 2] argue… However, they differ in…' },
      { id: 'u19-ix2', t: 415, type: 'mcq',
        q: 'Which opening sentence is strongest for a literature review paragraph on technology access in South African schools?',
        opts: [
          '"Many researchers have studied technology in South African schools."',
          '"This paragraph will discuss technology access."',
          '"Evidence consistently links unequal technology access to differential learning outcomes in South African schools, though studies diverge on whether infrastructure or teacher capacity is the primary mediating factor (Czerniewicz, 2020; Trucano, 2021; Isaacs, 2022)."',
          '"Technology is very important in modern education."',
        ],
        ok: 2, fb: '✅ Option C makes a specific thematic claim, names the key point of divergence in the field, and integrates three citations in a single sentence — demonstrating synthesis rather than description. It immediately tells the reader what the paragraph will establish and where the debate lies.' },
      { id: 'u19-ix3', t: 695, type: 'refl', q: 'Write a gap statement for your chosen topic: "Despite extensive research on [topic], few studies have examined [specific gap] — the question this essay/study addresses." Fill in the brackets with your specific topic and gap.', ph: 'Despite extensive research on… few studies have examined…' },
    ],
  },

  // ──────────────────────────────────────────────────────────
  // UNIT 20 — Your Academic Identity
  // ──────────────────────────────────────────────────────────
  unit20: {
    ctx: 'Reflective practice, academic identity, lifelong learning — concluding the module with honest self-assessment.',
    scope: ['Schön\'s reflection-on-action', 'Learning zone vs performance zone (Briceño)', 'Academic identity development', 'Metacognition and self-regulated learning', 'Writing an Academic Mission Statement'],
    outOfScope: ['Career planning', 'Course registration', 'Financial matters'],
    keyTerms: [
      { term: 'Learning zone', def: 'Deliberately practising at the edge of competence — uncomfortable, iterative, where growth happens.' },
      { term: 'Performance zone', def: 'Executing what you already know well — necessary but not sufficient for growth.' },
      { term: 'Reflection-on-action', def: 'Schön\'s term for examining your practice after the fact to improve future performance.' },
    ],
    knowledge: [
      'Briceño distinguishes the learning zone (deliberate practice, mistakes, feedback) from the performance zone (executing known skills).',
      'Growth requires regular, uncomfortable time in the learning zone — deliberately attempting skills at the edge of competence.',
      'Reflection-in-action: adjusting thinking while doing. Reflection-on-action: examining what you did afterwards.',
      'Academic identity is not fixed — it develops through repeated engagement with scholarly practice.',
      'A meaningful Academic Mission Statement names specific intellectual habits, not baseline compliance requirements.',
      'Metacognition — thinking about your own thinking — is the foundation of self-regulated, lifelong learning.',
    ],
    chapters: [
      { t: 0,   n: 'Learning zone vs performance zone' },
      { t: 200, n: 'Why discomfort is essential' },
      { t: 380, n: 'Alternating between zones' },
      { t: 520, n: 'Building deliberate practice habits' },
    ],
    ix: [
      { id: 'u20-ix1', t: 195, type: 'refl', q: 'Think of one skill from this module where you spent real time in the learning zone — attempting it poorly, getting feedback, trying again. What was the skill? What did it feel like? What changed?', ph: 'The skill was… It felt like… What changed was…' },
      { id: 'u20-ix2', t: 375, type: 'mcq',
        q: 'Briceño says most people stay in the performance zone too much. In an academic context, what does staying in the performance zone look like?',
        opts: [
          'Attempting difficult readings and struggling with them',
          'Only writing about topics you already know well, avoiding feedback, choosing assignments that confirm existing strengths rather than build new ones',
          'Submitting work before the deadline',
          'Reading widely across disciplines',
        ],
        ok: 1, fb: '✅ Staying in the performance zone academically means never stretching beyond what you already do well. It feels productive but produces no growth. The students who improve most dramatically in academic writing are those who deliberately attempt the skills they find hardest, accept imperfect early drafts, seek specific feedback, and revise — not those who only write on topics they already understand.' },
      { id: 'u20-ix3', t: 615, type: 'refl', q: 'Write three specific intellectual commitments for your next year of study — not "I will work harder" but concrete habits: when, how, and with what specific skill. These are your learning zone commitments.', ph: 'Commitment 1: … Commitment 2: … Commitment 3: …' },
    ],
  },

};
