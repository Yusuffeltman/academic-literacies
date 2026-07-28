// Assessment 3 — The Source Verification Dossier
// After Units 7–9 | Individual verification dossier (2 weeks)

import { assessmentTask, registerAssessment } from '../../src/components/assessment-task.js';

const CFG = {
  id: 'a3', unitId: 'a3', badge: 'Assessment 3',
  title: 'The Source Verification Dossier',
  subtitle: 'An individual, cross-disciplinary fact-check of contested education claims',
  icon: '🔎', color: 'linear-gradient(135deg,#3b0764,#7c3aed)',
  marks: 100,
  deadline: '2026-08-11T23:59:59Z', // Individual assessment — due Tue 11 Aug 2026
  skills: ['SIFT framework', 'Lateral reading', 'APA 7th citation', 'Analytical writing'],
  courseOutcomes: [
    'Apply the full SIFT framework and lateral reading practices to investigate contested educational claims rigorously.',
    'Trace claims to upstream sources and evaluate the credibility, limitations, and relevance of available evidence.',
    'Construct justified analytical verdicts and explain their implications for teachers in South African education contexts.',
    'Synthesize your own multiple investigations into a coherent professional dossier using accurate APA 7th citation and evidence-based reasoning.',
  ],

  scenario: `Africa Check — South Africa's leading independent fact-checking organisation — has issued an open call for teacher researchers to help audit widely-circulated education claims. These claims appear in school WhatsApp groups, social media, and parent meetings. Some may be accurate. Some may be misleading. Some may be outright false. A thorough fact-check requires both subject expertise and rigorous source verification. You have been commissioned to produce, on your own, a Verification Dossier that audits three contested education claims and that schools can use.`,

  brief: `Working individually, you will investigate three contested education claims using the full SIFT framework and academic databases. Choose three claims from different areas — for example numeracy/mathematics, literacy/language, natural science, learning theory, or education policy — with at least one connected to your teaching subject. For each claim you produce a Claim Verdict. You then write an Integrative Introduction that synthesises the patterns running across your own three investigations — patterns that only become visible once you compare your three verdicts side by side. The complete dossier is your individual submission.`,

  products: [
    'Three 350-word Claim Verdicts — one per contested claim — each structured as: Claim / SIFT Analysis / Verdict with evidence / Implications for teachers',
    'A 400-word Integrative Introduction to your Dossier — explaining how you selected the three claims, what structural patterns of misinformation they reveal across South African education, and what professional habits would protect teachers from these claims (synthesising across your own three verdicts)',
    'A Verification Methodology Note (150 words): your exact search process documented step by step, including every tool used, search strings entered, and sources consulted and rejected',
    'A Reference List in APA 7th — minimum 6 peer-reviewed or authoritative grey literature sources (roughly two per claim), all verified',
  ],

  weeks: [
    {
      title: 'Investigate Your Three Claims',
      focus: 'Full SIFT analysis, upstream tracing, and evidence assembly across three contested claims',
      milestones: [
        { day: 1, title: 'Claim Selection & First-Impression Log', desc: 'Select your three contested education claims from different areas (at least one linked to your teaching subject). Before any investigation, write 3 sentences per claim: your gut reaction, why a teacher might believe it, and your prediction about whether it is accurate. Seal these — you will compare them to your final verdicts.', tip: 'This first-impression record is your proof that you applied SIFT Step 1 (Stop). It is evidence of your critical process, not a mark-bearing component.' },
        { day: '2', dayEnd: '3', title: 'Claim 1 — SIFT & Upstream Trace', desc: 'Apply the full SIFT framework to your first claim. Where did it originate? Who made it first? Use lateral reading to investigate the source, then find the best available evidence and trace the claim upstream to its original data, study, or statement. Document every tab you open and why.', tools: ['SIFT Framework (Unit 7)', 'Africa Check', 'Scopus'], tip: 'Read what others say about whoever is making the claim before you read the claim carefully. The source comes first.' },
        { day: '4', dayEnd: '5', title: 'Claim 2 — SIFT & Upstream Trace', desc: 'Repeat the full verification process for your second claim. Look especially for the gap between what the original source actually said and how the claim is being circulated. Document that gap precisely.', tools: ['Scopus', 'Africa Check (africacheck.org)', 'Google Scholar'], tip: 'The most revealing thing in a fact-check is often the distance between the original source and the circulating version.' },
        { day: '6', dayEnd: '7', title: 'Claim 3 & Draft Verdicts', desc: 'Complete SIFT and upstream tracing for your third claim. Then, for all three claims, write a draft verdict — True / Misleading / False / Unverifiable — each with a one-paragraph justification grounded in your best evidence.', tools: ['Verification notes', 'Zotero'] },
      ],
    },
    {
      title: 'Write, Compare, Introduce',
      focus: 'Finalising your three Claim Verdicts and writing the integrative introduction',
      milestones: [
        { day: '8', dayEnd: '9', title: 'Write Three Full 350-word Claim Verdicts', desc: 'Write each complete Claim Verdict. Required structure per verdict: (1) The Claim — exact wording, origin, and how it circulates (2) SIFT Analysis — each step documented briefly (3) Evidence — your best 2–3 sources evaluated honestly (4) Verdict — True / Misleading / False / Unverifiable with full justification (5) Implications — what a teacher should know and do. Cite all sources in APA 7th.', tools: ['Zotero', 'APA 7th', 'Unit 9'] },
        { day: 10, title: 'Compare Across Your Verdicts', desc: 'Read your three completed verdicts side by side. For each, note: (1) What made the claim believable? (2) What was the key evidence that resolved it? (3) What would have protected a teacher from believing it? Record these notes — you need them for your Integrative Introduction.', tools: ['Your three verdicts'] },
        { day: '11', dayEnd: '12', title: 'Write 150-word Methodology Note', desc: 'Document your exact verification process: what you searched, in what order, using which tools, and what you rejected and why. Write this as if another researcher needs to replicate your process. Precise tool names, exact search strings, and reasoning for each decision.', tip: 'This is the most honest piece of writing in the assessment. It shows your actual process — not an idealised version of it.' },
        { day: '13', dayEnd: '14', title: 'Write 400-word Integrative Introduction & Submit', desc: 'Write the introduction that frames your entire Dossier. Required: (1) How were these three claims selected — what do they have in common? (2) What structural patterns make misinformation believable in education contexts — identify at least 2 across your three verdicts (3) What two professional habits would protect South African teachers from these claim types? Finalise your APA 7th reference list and submit.', tools: ['Your three verdicts', 'Unit 7 SIFT framework'] },
      ],
    },
  ],

  checklist: [
    { title: 'Three 350-word Claim Verdicts each follow the required 5-part structure', detail: 'Each verdict contains: Claim / SIFT Analysis / Evidence / Verdict / Implications. Every verdict is unambiguous: True, Misleading, False, or Unverifiable — with justification.' },
    { title: 'Each claim traced to its upstream source', detail: 'For every claim you have identified where it originated — not just where you first encountered it. The original source is named, evaluated, and compared to how the claim is being circulated.' },
    { title: '150-word Methodology Note contains specific tools, search strings, and rejection reasoning', detail: 'Someone reading this note could replicate your investigations exactly. It is precise, not vague.' },
    { title: 'Integrative Introduction identifies patterns across all three verdicts', detail: 'You have compared your three verdicts and identified at least 2 cross-cutting structural patterns, plus two protective professional habits.' },
    { title: 'Minimum 6 sources in APA 7th — all manually verified', detail: 'Each source checked against Scopus or the original publication. Article title in sentence case, journal in italics, DOI present where available.' },
    { title: 'Self-assessment and reflection completed', detail: 'Self-score is honest. Reflection identifies one genuine weakness, not just a positive framing.' },
  ],

  rubric: [
    { criterion: 'Claim Investigation — SIFT Rigour and Upstream Tracing', levels: [
      { mark: '0–10', desc: 'SIFT steps not documented. Claims not traced to origin. Verdicts not supported by specific evidence.' },
      { mark: '11–17', desc: 'Some SIFT steps applied. Sources partly traced. Verdicts present but evidence thin.' },
      { mark: '18–24', desc: 'All four SIFT steps documented with specific evidence across the three claims. Upstream sources identified. Verdicts clearly justified.' },
      { mark: '25', desc: 'Rigorous SIFT application with precise documentation across all three claims. Upstream sources traced and compared to circulating versions. Gaps clearly articulated.' },
    ]},
    { criterion: 'Evidence Quality and Citation Accuracy', levels: [
      { mark: '0–10', desc: 'Sources not peer-reviewed or authoritative. Citations missing or significantly incorrect.' },
      { mark: '11–17', desc: 'Some authoritative sources. Citations mostly present but with recurring errors.' },
      { mark: '18–24', desc: 'Strong, relevant sources with clear evaluative commentary. APA 7th mostly accurate.' },
      { mark: '25', desc: 'Precisely selected authoritative sources with evaluative commentary. APA 7th error-free. Methodology Note replicable.' },
    ]},
    { criterion: 'Integrative Introduction — Synthesis Across Your Investigations', levels: [
      { mark: '0–10', desc: 'Introduction does not reference the three verdicts. No patterns identified. Generic.' },
      { mark: '11–17', desc: 'References 1–2 verdicts. One pattern identified. Professional habits vague.' },
      { mark: '18–24', desc: 'References all three verdicts with specific detail. Two patterns clearly articulated. Practical professional habits named.' },
      { mark: '25', desc: 'Sophisticated synthesis that could not exist without all three investigations. Patterns insightful and specifically evidenced. Habits actionable.' },
    ]},
    { criterion: 'Academic Writing — Structure, Register, Analytical Depth', levels: [
      { mark: '0–10', desc: 'Informal register. Descriptive rather than analytical. Structure not followed.' },
      { mark: '11–17', desc: 'Mostly formal register. Some analysis alongside description. Structure partially followed.' },
      { mark: '18–24', desc: 'Consistent formal register throughout. Analytical rather than descriptive. Structure clear.' },
      { mark: '25', desc: 'Authoritative analytical voice. Every claim supported. The Dossier reads as a credible professional document.' },
    ]},
  ],
};

registerAssessment(CFG);

export const assess03 = {
  id: 'a3', badge: 'Assessment 3', title: 'The Source Verification Dossier',
  phase: 'Major Assessment — 2 weeks (individual)', isAssessment: true,
  html: () => {
    window._atState = window._atState || {};
    if (!window._atState['a3']) window._atState['a3'] = { milestones:{}, checklist:{}, selfScore:null, reflection:'', submitted:false };
    return assessmentTask(CFG);
  },
};
