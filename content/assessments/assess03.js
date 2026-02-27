// Assessment 3 — The Source Verification Dossier
// After Units 7–9 | Disciplinary Lens collaboration

import { assessmentTask, registerAssessment } from '../../src/components/assessment-task.js';

const CFG = {
  id: 'a3', unitId: 'a3', badge: 'Assessment 3',
  title: 'The Source Verification Dossier',
  subtitle: 'A cross-disciplinary fact-check of contested education claims',
  icon: '🔎', color: 'linear-gradient(135deg,#3b0764,#7c3aed)',
  marks: 100,
  skills: ['SIFT framework', 'Lateral reading', 'APA 7th citation', 'Analytical writing'],

  scenario: `Africa Check — South Africa's leading independent fact-checking organisation — has issued an open call for teacher researchers to help audit five widely-circulated education claims. These claims appear in school WhatsApp groups, social media, and parent meetings. Some may be accurate. Some may be misleading. Some may be outright false. A thorough fact-check requires both subject expertise and rigorous source verification. Your group has been commissioned to produce a Verification Dossier that schools can use.`,

  brief: `Each group member is assigned one contested education claim to investigate rigorously using the full SIFT framework and academic databases. You are assigned a claim related to your teaching subject area. Your individual Claim Verdict is what the group needs from you — without it, the Dossier is incomplete. Your final submission is both your Claim Verdict AND an editorial introduction to the whole Dossier that can only be written after you have read all five verdicts.`,

  products: [
    'A 500-word Claim Verdict on your assigned contested claim — structured as: Claim / SIFT Analysis / Verdict with evidence / Implications for teachers',
    'A 400-word Editorial Introduction to the full group Dossier — explaining how the five claims were selected, what they reveal about misinformation patterns in South African education, and what professional habits would protect teachers from these claims',
    'A Verification Methodology Note (150 words): your exact search process documented step by step, including every tool used, search strings entered, and sources consulted and rejected',
    'A Reference List in APA 7th — minimum 4 peer-reviewed or authoritative grey literature sources, all verified',
  ],

  collaboration: {
    type: 'Disciplinary Lens Investigation',
    icon: '🔬',
    name: 'Parallel Expert Fact-Check',
    how: 'Each group member applies their subject-area expertise and teaching context to investigate a different contested claim. A mathematics teacher investigates a numeracy claim; a language teacher investigates a literacy claim; a science teacher investigates a science education claim, and so on. In Week 2, the group shares completed Claim Verdicts. The Editorial Introduction synthesises patterns that only become visible when all five verdicts are compared.',
    interdependence: 'Your Editorial Introduction must identify misinformation patterns that cut across all five claims — patterns you can only see by reading all five verdicts. You also need to know what the other four investigators found before you can credibly claim to introduce a "Dossier." Without all five verdicts, there is nothing to introduce and no patterns to identify.',
    groupPanelNote: 'Each member submits their Claim Verdict here in Week 2. Read all five verdicts carefully. In your Editorial Introduction, you must identify: (1) what the five claims have in common structurally and (2) what professional habit would have protected a teacher from believing each one.',
    roles: [
      { icon: '🔢', title: 'Numeracy & Mathematics Claim Investigator', description: 'Investigate a contested claim about mathematics education, learning outcomes, or numeracy research in South Africa. Apply SIFT and lateral reading. Trace the claim to its upstream source.', contributes: '500-word Claim Verdict on a mathematics/numeracy education claim' },
      { icon: '📖', title: 'Literacy & Language Claim Investigator', description: 'Investigate a contested claim about reading instruction, language of learning and teaching (LoLT), or literacy outcomes. Particularly relevant to South African multilingual debates.', contributes: '500-word Claim Verdict on a literacy or language education claim' },
      { icon: '🧬', title: 'Natural Science Claim Investigator', description: 'Investigate a contested education claim related to science teaching methods, STEM outcomes, or evidence-based science pedagogy. Often a space where pseudoscience enters teaching practice.', contributes: '500-word Claim Verdict on a science education or pedagogy claim' },
      { icon: '🧠', title: 'Learning Theory & Psychology Claim Investigator', description: 'Investigate a contested claim about how children learn — learning styles, brain-based claims, motivation research, or cognitive science findings that circulate in teacher training.', contributes: '500-word Claim Verdict on a learning theory or educational psychology claim' },
      { icon: '🌍', title: 'Education Policy & Equity Claim Investigator', description: 'Investigate a contested claim about South African education policy, pass rates, inequality, or systemic outcomes. These claims frequently circulate with misleading statistics.', contributes: '500-word Claim Verdict on an education policy or equity claim' },
    ],
  },

  weeks: [
    {
      title: 'Investigate Your Claim',
      focus: 'Full SIFT analysis, upstream tracing, and evidence assembly',
      milestones: [
        { day: 1, title: 'Claim Assignment & First Impression Log', desc: 'Receive your assigned claim. Before any investigation, write 3 sentences: your gut reaction to the claim, why a teacher might believe it, and your prediction about whether it is accurate. Seal this in a document — you will compare it to your final verdict at the end.', tip: 'This first-impression record is your proof that you applied SIFT Step 1 (Stop). It is evidence of your critical process, not a mark-bearing component.' },
        { day: '2', dayEnd: '3', title: 'S & I — Stop and Investigate the Source', desc: 'Apply the first two SIFT steps rigorously. Where did this claim originate? Who made it first? What organisation or individual is the original source? Use lateral reading to investigate the source — not the claim itself yet. Document every tab you open and why.', tools: ['SIFT Framework (Unit 7)', 'Africa Check', 'Google lateral read'], tip: 'Do not read the claim carefully yet. Read what others say about whoever is making the claim. That comes first.' },
        { day: '4', dayEnd: '5', title: 'F & T — Find Better Coverage and Trace to Origin', desc: 'Now search for the best available evidence on the claim itself. Use Scopus for peer-reviewed coverage. Use Africa Check for existing fact-checks. Trace the claim upstream: find the original data, study, or statement it is based on. Often the original source says something very different from how it is being circulated.', tools: ['Scopus', 'Africa Check (africacheck.org)', 'Google Scholar'], tip: 'The most revealing thing in a fact-check is often the gap between what the original source said and how it was reported. Document that gap precisely.' },
        { day: '6', dayEnd: '7', title: 'Evidence Assessment and Verdict Draft', desc: 'Review all evidence. What does the best available evidence actually show? Write a draft verdict: True / Misleading / False / Unverifiable — with a one-paragraph justification. Share your draft verdict with your group in the Group Panel.', tools: ['Verification notes', 'Zotero'] },
      ],
    },
    {
      title: 'Write, Compare, Introduce',
      focus: 'Finalising your Claim Verdict and writing the cross-dossier Editorial Introduction',
      milestones: [
        { day: '8', dayEnd: '9', title: 'Write Full 500-word Claim Verdict', desc: 'Write your complete Claim Verdict. Required structure: (1) The Claim — exact wording, origin, and how it circulates (2) SIFT Analysis — each step documented briefly (3) Evidence — your best 3–4 sources evaluated honestly (4) Verdict — True / Misleading / False / Unverifiable with full justification (5) Implications — what a teacher should know and do. Cite all sources in APA 7th.', tools: ['Zotero', 'APA 7th', 'Unit 9'] },
        { day: 10, title: 'Read All Group Verdicts', desc: 'Read all five Claim Verdicts in the Group Panel. For each one, note: (1) What made the claim believable? (2) What was the key evidence that resolved it? (3) What would have protected a teacher from believing it? Record your notes — you need them for your Editorial Introduction.', tools: ['Group Panel'] },
        { day: '11', dayEnd: '12', title: 'Write 150-word Methodology Note', desc: 'Document your exact verification process: what you searched, in what order, using which tools, and what you rejected and why. Write this as if another researcher needs to replicate your process. Precise tool names, exact search strings, and reasoning for each decision.', tip: 'This is the most honest piece of writing in the assessment. It shows your actual process — not an idealised version of it.' },
        { day: '13', dayEnd: '14', title: 'Write 400-word Editorial Introduction', desc: 'Write the introduction that frames the entire Dossier. Required: (1) How were these five claims selected — what do they have in common? (2) What structural patterns make misinformation believable in education contexts — identify at least 2 across all five verdicts (3) What two professional habits would protect South African teachers from these claim types? Cite at least 2 sources from other group members\' verdicts.', tools: ['Group Panel verdicts', 'Unit 7 SIFT framework'] },
      ],
    },
  ],

  checklist: [
    { title: '500-word Claim Verdict follows required 5-part structure', detail: 'Each section present: Claim / SIFT Analysis / Evidence / Verdict / Implications. Verdict is unambiguous: True, Misleading, False, or Unverifiable — with justification.' },
    { title: 'Claim traced to upstream source', detail: 'You have identified where the claim originated — not just where you first encountered it. The original source is named, evaluated, and compared to how the claim is being circulated.' },
    { title: '150-word Methodology Note contains specific tools, search strings, and rejection reasoning', detail: 'Someone reading this note could replicate your investigation exactly. It is precise, not vague.' },
    { title: 'Editorial Introduction identifies patterns across all 5 verdicts', detail: 'You have read all five verdicts and identified at least 2 cross-cutting structural patterns. This section cannot be written without all five verdicts.' },
    { title: 'Editorial Introduction cites at least 2 sources from other group members\' verdicts', detail: 'You have read your colleagues\' work carefully enough to cite specific findings. Generic references to "group members" are not acceptable.' },
    { title: 'Minimum 4 sources in APA 7th — all manually verified', detail: 'Each source checked against Scopus or the original publication. Article title in sentence case, journal in italics, DOI present where available.' },
    { title: 'Self-assessment and reflection completed', detail: 'Self-score is honest. Reflection identifies one genuine weakness, not just a positive framing.' },
  ],

  rubric: [
    { criterion: 'Claim Investigation — SIFT Rigour and Upstream Tracing', levels: [
      { mark: '0–10', desc: 'SIFT steps not documented. Claim not traced to origin. Verdict not supported by specific evidence.' },
      { mark: '11–17', desc: 'Some SIFT steps applied. Source partly traced. Verdict present but evidence thin.' },
      { mark: '18–24', desc: 'All four SIFT steps documented with specific evidence. Upstream source identified. Verdict clearly justified.' },
      { mark: '25', desc: 'Rigorous SIFT application with precise documentation. Upstream source traced and compared to circulating version. Gap clearly articulated.' },
    ]},
    { criterion: 'Evidence Quality and Citation Accuracy', levels: [
      { mark: '0–10', desc: 'Sources not peer-reviewed or authoritative. Citations missing or significantly incorrect.' },
      { mark: '11–17', desc: 'Some authoritative sources. Citations mostly present but with recurring errors.' },
      { mark: '18–24', desc: 'Strong, relevant sources with clear evaluative commentary. APA 7th mostly accurate.' },
      { mark: '25', desc: 'Precisely selected authoritative sources with evaluative commentary. APA 7th error-free. Methodology Note replicable.' },
    ]},
    { criterion: 'Editorial Introduction — Cross-Dossier Synthesis', levels: [
      { mark: '0–10', desc: 'Introduction does not reference other verdicts. No patterns identified. Generic.' },
      { mark: '11–17', desc: 'References 1–2 verdicts. One pattern identified. Professional habits vague.' },
      { mark: '18–24', desc: 'References multiple verdicts with specific citations. Two patterns clearly articulated. Practical professional habits named.' },
      { mark: '25', desc: 'Sophisticated synthesis that could not exist without all five verdicts. Patterns insightful and specifically evidenced. Habits actionable.' },
    ]},
    { criterion: 'Academic Writing — Structure, Register, Analytical Depth', levels: [
      { mark: '0–10', desc: 'Informal register. Descriptive rather than analytical. Structure not followed.' },
      { mark: '11–17', desc: 'Mostly formal register. Some analysis alongside description. Structure partially followed.' },
      { mark: '18–24', desc: 'Consistent formal register throughout. Analytical rather than descriptive. Structure clear.' },
      { mark: '25', desc: 'Authoritative analytical voice. Every claim supported. Verdict Dossier reads as a credible professional document.' },
    ]},
  ],
};

registerAssessment(CFG);

export const assess03 = {
  id: 'a3', badge: 'Assessment 3', title: 'The Source Verification Dossier',
  phase: 'Major Assessment — 2 weeks', isAssessment: true,
  html: () => {
    window._atState = window._atState || {};
    if (!window._atState['a3']) window._atState['a3'] = { milestones:{}, checklist:{}, selfScore:null, reflection:'', submitted:false };
    return assessmentTask(CFG);
  },
};
