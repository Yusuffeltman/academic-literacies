// Assessment 6 — The AI Ethics Tribunal
// After Units 16–18 | Stakeholder Tribunal collaboration

import { assessmentTask, registerAssessment } from '../../src/components/assessment-task.js';

const CFG = {
  id: 'a6', unitId: 'a6', badge: 'Assessment 6',
  title: 'The AI Ethics Tribunal',
  subtitle: 'A structured deliberation on AI use in South African higher education',
  icon: '⚖️', color: 'linear-gradient(135deg,#1c1917,#92400e)',
  marks: 100,
  skills: ['Prompt engineering', 'AI ethics', 'Persuasive academic writing', 'Evidence synthesis', 'Position paper'],

  scenario: `The Senate of a South African university is deliberating on a new AI Use Policy — one that will govern how students, lecturers, and administrators can use generative AI tools in assessment, teaching, and research. The policy will set the standard for other institutions. The Senate has convened an AI Ethics Tribunal and invited five stakeholder representatives to submit formal Position Papers and attend a structured deliberation. The policy will draw on all five positions.`,

  brief: `Each group member represents a different stakeholder in the AI in education debate. You are assigned one position — not necessarily your personal view. Over two weeks, you research and construct the strongest possible version of your stakeholder's argument using peer-reviewed evidence and real policy examples. In Week 2, positions are shared, and each member writes a final Synthesis Recommendation that could only be written by someone who had read all five positions.`,

  products: [
    'A 600-word Stakeholder Position Paper — the strongest evidence-based argument for your assigned stakeholder\'s position on AI use in higher education',
    'A 150-word Rebuttal Note — after reading all five positions, identify the single strongest counter-argument to your position and respond to it with evidence',
    'A 600-word Synthesis Recommendation to the Senate — drawing on all five positions, recommend a specific, nuanced AI Use Policy with three concrete provisions, each supported by evidence from at least two different stakeholder positions',
    'A Reference List in APA 7th — minimum 5 peer-reviewed or authoritative policy sources across your Position Paper and Synthesis Recommendation',
  ],

  collaboration: {
    type: 'Stakeholder Tribunal',
    icon: '⚖️',
    name: 'Structured Adversarial Deliberation',
    how: 'Each group member is assigned a stakeholder role and must argue that position as compellingly as possible, regardless of personal views. This is not debate for its own sake — it is the deliberative structure that real policy decisions use. In Week 2, all five Position Papers go into the Group Panel and the group reads each other\'s work. The Synthesis Recommendation must show genuine engagement with all five positions, crafting a policy that acknowledges all legitimate concerns.',
    interdependence: 'Your Synthesis Recommendation must propose a nuanced policy that only makes sense if you understand all five stakeholder positions — their evidence, their concerns, and their limits. A recommendation written without reading the lecturer or student position is missing essential information. The Rebuttal Note requires you to know which counter-argument is the strongest — you can only identify that after reading all five positions.',
    groupPanelNote: 'All five Position Papers appear here. Read each one as if you were on the Senate committee — you need to understand each stakeholder\'s best argument before you can recommend a policy that works for everyone. In your Synthesis Recommendation, you must reference all five positions explicitly.',
    roles: [
      { icon: '🎓', title: 'Student Academic Integrity Advocate', description: 'Argue from the perspective of students who are concerned that AI tools undermine their learning, devalue their qualifications, and create an unfair advantage for those with access to premium tools. Use research on academic integrity, learning transfer, and equity.', contributes: '600-word Position Paper arguing for stronger restrictions on AI in assessment contexts' },
      { icon: '👩‍🏫', title: 'Progressive Pedagogy Lecturer', description: 'Argue from the perspective of a lecturer who believes AI tools, properly integrated, develop higher-order thinking and prepare students for a workplace that already uses AI. Use research on pedagogy, assessment design, and digital literacy.', contributes: '600-word Position Paper arguing for regulated but expansive AI integration in teaching and learning' },
      { icon: '🔬', title: 'Research Integrity Scholar', description: 'Argue from the perspective of a researcher who is primarily concerned with the integrity of academic knowledge production — hallucinated citations, AI-generated literature reviews, and the reliability of peer review in an AI-saturated environment.', contributes: '600-word Position Paper arguing for strict separation of AI from research processes with specific exceptions' },
      { icon: '♿', title: 'Access and Equity Advocate', description: 'Argue from the perspective of a disability support specialist and equity researcher who sees AI as a potential equaliser for students with learning differences, students studying in a second or third language, and students from disadvantaged schooling backgrounds.', contributes: '600-word Position Paper arguing for equitable AI access as a matter of educational justice' },
      { icon: '🏛️', title: 'Institutional Risk and Accreditation Officer', description: 'Argue from the perspective of a university official responsible for HEQC accreditation, employer trust in qualifications, and institutional reputation. Focus on the risks of unchecked AI use to the credibility of degrees and the trust of the labour market.', contributes: '600-word Position Paper arguing for a risk-managed, transparent AI policy with clear audit trails' },
    ],
  },

  weeks: [
    {
      title: 'Research and Build Your Position',
      focus: 'Evidence assembly, prompt-engineered research, and Position Paper draft',
      milestones: [
        { day: 1, title: 'Stakeholder Immersion — Who Are You Representing?', desc: 'Before searching for evidence, write 200 words from inside your stakeholder\'s perspective. Who are they? What do they most fear? What do they most want? What evidence would convince them? This is your interpretive frame — keep it visible throughout the two weeks.', tip: 'The best position papers are written by people who genuinely understand what is at stake for their stakeholder — even if they personally disagree.' },
        { day: '2', dayEnd: '3', title: 'Evidence Search using AI-Assisted + Verified Research', desc: 'Use the Unit 16 CREATE prompt framework to design Scopus and Elicit searches that surface the best evidence for your position. Then use Scopus to verify every promising source. Document your prompts and your search decisions — this is part of your intellectual process.', tools: ['CREATE Prompt Framework (Unit 16)', 'Scopus', 'Elicit', 'Zotero'], tip: 'Use AI to brainstorm search angles you had not considered — then verify every source it suggests in Scopus before using it.' },
        { day: '4', dayEnd: '5', title: 'Policy Landscape Research', desc: 'Find 2–3 real AI use policies from higher education institutions — internationally and/or in South Africa. Analyse them for how they handle your stakeholder\'s concerns. These are your real-world precedents. Cite them in your Position Paper.', tools: ['University AI policy documents', 'Google Scholar grey literature search'] },
        { day: '6', dayEnd: '7', title: 'Draft 600-word Position Paper', desc: 'Write your Position Paper. Required structure: (1) Opening: state your position unambiguously in one sentence (2) Context: what is at stake for your stakeholder and why now (3) Evidence: 3–4 specific, evidenced reasons supporting your position (4) Acknowledgement: one sentence that acknowledges the strongest concern from the opposing side — then explains why your position still holds (5) Recommendation: 2 specific policy provisions. Submit to Group Panel by Day 7.', tools: ['Zotero', 'APA 7th', 'Unit 18 AI ethics framework'] },
      ],
    },
    {
      title: 'Deliberate, Rebut, Synthesise',
      focus: 'Reading all five positions, writing your rebuttal, and crafting the Synthesis Recommendation',
      milestones: [
        { day: 8, title: 'Read All Five Position Papers', desc: 'Read all five Position Papers carefully. For each one, note: (1) What is their single strongest piece of evidence? (2) What would your stakeholder say in response? (3) What in their argument is actually compatible with yours? Take structured notes — you need these for both the Rebuttal and the Synthesis.', tools: ['Group Panel'] },
        { day: 9, title: 'Write 150-word Rebuttal Note', desc: 'Identify the single strongest counter-argument to your position from the other four papers. Write a precise 150-word rebuttal: restate the counter-argument accurately (do not strawman it), then respond with specific evidence that explains why your position still holds. This is the hardest piece of writing in the assessment — it requires intellectual honesty.', tip: 'Engaging seriously with the strongest counter-argument is what separates a position paper from a polemic. Show you have genuinely reckoned with the opposition.' },
        { day: '10', dayEnd: '11', title: 'Design Your Synthesis Policy', desc: 'Before writing, design your policy on paper: three specific provisions, each one addressing concerns from at least two different stakeholder positions. For each provision, identify which stakeholders it satisfies and what trade-offs it accepts. A good synthesis policy should leave every stakeholder partly satisfied and partly uncomfortable — that is what real policy looks like.', tools: ['All 5 Group Panel Position Papers'] },
        { day: '12', dayEnd: '14', title: 'Write 600-word Synthesis Recommendation and Submit', desc: 'Write your Synthesis Recommendation. Addressed to the University Senate. Required: (1) Brief framing of the deliberation and the five stakeholder positions (2) Three numbered policy provisions, each with: what it does, why it responds to the legitimate concerns of named stakeholders, and what evidence supports it (3) Closing: what monitoring and review mechanism you recommend and why. Must cite evidence from at least 3 different stakeholder Position Papers by name.', tools: ['Group Panel', 'Zotero', 'APA 7th', 'Units 16–18'] },
      ],
    },
  ],

  checklist: [
    { title: 'Position Paper argues a clear, unambiguous position in the opening sentence', detail: 'Someone reading only your first sentence knows exactly what you are arguing. No hedging, no "on the one hand."' },
    { title: 'Position Paper contains 3–4 specific evidenced claims with APA 7th citations', detail: 'Every major claim cites a peer-reviewed or authoritative grey literature source. Zotero used and references manually verified.' },
    { title: 'Position Paper acknowledges the strongest counter-argument honestly', detail: 'The acknowledgement accurately represents the opposing view — it does not create a strawman. The response to it uses evidence, not just assertion.' },
    { title: '150-word Rebuttal Note engages the strongest — not easiest — counter-argument', detail: 'You have chosen the counter-argument that most challenges your position, not the weakest one. The rebuttal uses specific evidence.' },
    { title: 'Synthesis Recommendation contains exactly 3 numbered policy provisions', detail: 'Each provision is specific enough to be implemented. Each provision references at least 2 stakeholder positions by name.' },
    { title: 'Synthesis Recommendation cites evidence from at least 3 different Position Papers', detail: 'You have read your colleagues\' work carefully enough to use their evidence in your policy recommendation.' },
    { title: 'Minimum 5 sources across both papers — all peer-reviewed or authoritative policy documents, all verified in APA 7th', detail: 'No AI-generated citations. All DOIs present where available. Reference list entries manually checked.' },
  ],

  rubric: [
    { criterion: 'Position Paper — Argument Strength and Evidence Quality', levels: [
      { mark: '0–10', desc: 'Position unclear or absent. Claims without evidence. Counter-argument not acknowledged.' },
      { mark: '11–17', desc: 'Position stated. Some evidence present. Counter-argument mentioned but not engaged with honestly.' },
      { mark: '18–24', desc: 'Clear, specific position. 3+ evidenced claims. Counter-argument acknowledged and responded to with evidence.' },
      { mark: '25', desc: 'Compelling, precisely argued position. All claims precisely evidenced. Counter-argument engaged with intellectual honesty. Would convince a sceptical reader.' },
    ]},
    { criterion: 'Rebuttal Note — Intellectual Honesty and Precision', levels: [
      { mark: '0–5', desc: 'Strawmans the counter-argument. No evidence in response.' },
      { mark: '6–10', desc: 'Counter-argument partially accurate. Response present but weakly evidenced.' },
      { mark: '11–14', desc: 'Counter-argument accurately represented. Response uses specific evidence.' },
      { mark: '15', desc: 'Most challenging counter-argument chosen and accurately represented. Response uses specific evidence and shows genuine intellectual reckoning.' },
    ]},
    { criterion: 'Synthesis Recommendation — Policy Nuance and Stakeholder Integration', levels: [
      { mark: '0–10', desc: 'Recommendation simply restates own position. No engagement with other stakeholders. Provisions vague.' },
      { mark: '11–17', desc: 'Some engagement with 1–2 other positions. Provisions present but generic.' },
      { mark: '18–24', desc: 'All five positions engaged. Three specific provisions that address multiple stakeholder concerns. Could function as real policy.' },
      { mark: '25', desc: 'Sophisticated policy that genuinely synthesises competing concerns. Provisions specific and implementable. Evidence from multiple positions used to justify trade-offs explicitly.' },
    ]},
    { criterion: 'Academic Writing — Persuasive Register and APA 7th Accuracy', levels: [
      { mark: '0–10', desc: 'Informal or inconsistent register. Position paper reads as personal opinion. Citations absent or significantly incorrect.' },
      { mark: '11–17', desc: 'Mostly formal register. Some persuasive language. Citations mostly present with errors.' },
      { mark: '18–24', desc: 'Authoritative persuasive academic register throughout. APA 7th mostly accurate. Synthesis reads as credible policy document.' },
      { mark: '25', desc: 'Precise, authoritative, and strategically persuasive register. APA 7th error-free. Synthesis Recommendation reads as a document the Senate could actually adopt.' },
    ]},
  ],
};

registerAssessment(CFG);

export const assess06 = {
  id: 'a6', badge: 'Assessment 6', title: 'The AI Ethics Tribunal',
  phase: 'Major Assessment — 2 weeks', isAssessment: true,
  html: () => {
    window._atState = window._atState || {};
    if (!window._atState['a6']) window._atState['a6'] = { milestones:{}, checklist:{}, selfScore:null, reflection:'', submitted:false };
    return assessmentTask(CFG);
  },
};
