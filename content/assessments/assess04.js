// Assessment 4 — The Text Autopsy
// After Units 10–12 | Reader Role Protocol collaboration

import { assessmentTask, registerAssessment } from '../../src/components/assessment-task.js';

const CFG = {
  id: 'a4', unitId: 'a4', badge: 'Assessment 4',
  title: 'The Text Autopsy',
  subtitle: 'Five analytical lenses on one landmark research paper',
  icon: '🔬', color: 'linear-gradient(135deg,#0c1a2e,#0369a1)',
  marks: 100,
  skills: ['Strategic reading', 'Analytical writing', 'Argument construction', 'PEEL paragraphs'],

  scenario: `A new lecturer at your university is preparing a first-year academic literacy workshop. She wants a resource that shows student teachers exactly what a skilled reader does to a research paper — not just what the paper says, but how it works: its argument structure, its evidence, its assumptions, its methodology, and its real-world implications for South African classrooms. She has selected one landmark paper and needs five specialist readings of it.`,

  brief: `Your group all reads the same peer-reviewed paper — a landmark study in education research relevant to South African teaching contexts. Each member reads it playing a specific analytical role. You do not share notes beforehand. Each person arrives at a different layer of the text. In Week 2, you share your role analyses, then each member writes a full Text Autopsy Report that combines all five layers — a reading no individual could have produced alone.`,

  products: [
    'A 400-word Role Analysis — your assigned analytical lens applied rigorously to the shared paper, producing insights that only your lens would surface',
    'A 700-word Text Autopsy Report that weaves all five analytical layers into a single, coherent, multi-dimensional reading of the paper — with evidence from each group member\'s role analysis',
    'A 200-word Reading Strategy Reflection documenting which reading strategies from Units 10–11 you used, when, and how they shaped your analysis',
    'A Reference List in APA 7th for the shared paper plus any additional sources you cite',
  ],

  collaboration: {
    type: 'Reader Role Protocol',
    icon: '👓',
    name: 'Parallel Lens Reading',
    how: 'Your lecturer assigns your group one shared research paper and each member a different analytical role. Everyone reads the same paper independently — no coordination, no sharing notes — through their assigned lens. In Week 2, role analyses go into the Group Panel. Each member then writes a Text Autopsy Report that integrates all five lenses, producing a multi-dimensional reading of the paper that no single reader could achieve.',
    interdependence: 'Your Autopsy Report requires you to weave all five analytical layers. The Argument Mapper cannot identify ideological assumptions — that is the Assumption Auditor\'s contribution. The Methodology Inspector cannot assess how findings land in a classroom — that is the Practitioner Bridge\'s role. Each layer is genuinely different information. Without all five, your report describes only part of the text.',
    groupPanelNote: 'Each member posts their Role Analysis here in Week 2. You need all five analyses to write your Autopsy Report. As you read each one, note: what did this lens reveal that I would have missed? That gap is the whole point of this collaboration.',
    roles: [
      { icon: '🗺️', title: 'Argument Mapper', description: 'Your job: trace the logical architecture of the paper. What is the central claim? What sub-claims support it? How does the conclusion follow from the evidence presented? Produce a visual argument map AND a 400-word written analysis of whether the argument holds.', contributes: '400-word argument structure analysis + argument map diagram' },
      { icon: '🧪', title: 'Methodology Inspector', description: 'Your job: examine the research design. What methodology was used? What were the sample and context? What are the limitations the authors acknowledge — and the ones they do not? Is the evidence sufficient for the claims made?', contributes: '400-word methodology and evidence quality analysis' },
      { icon: '🏫', title: 'Practitioner Bridge', description: 'Your job: read the paper entirely through the lens of classroom application. What does this mean for a Grade 8 teacher in Limpopo? What would need to change for this finding to be usable in an under-resourced South African school? What does the paper assume about context?', contributes: '400-word South African classroom relevance and application analysis' },
      { icon: '🕵️', title: 'Assumption Auditor', description: 'Your job: identify what the paper takes for granted without arguing for it. What ideological, cultural, or disciplinary assumptions underlie the research? Who is implicitly imagined as the learner, the teacher, the school? What perspectives or voices are absent?', contributes: '400-word hidden assumptions and critical perspectives analysis' },
      { icon: '🌐', title: 'Conversation Locator', description: 'Your job: read the paper\'s references and literature review to map where it sits in the scholarly conversation. What debate is it responding to? Who does it agree with and challenge? What comes before it and what research does it open up? Is it current or dated?', contributes: '400-word scholarly conversation and field positioning analysis' },
    ],
  },

  weeks: [
    {
      title: 'Read Through Your Lens',
      focus: 'Deep individual reading — three-pass method applied through your assigned analytical role',
      milestones: [
        { day: 1, title: 'Paper Orientation — First Pass', desc: 'Receive the assigned paper from your lecturer. Do your first pass: read the abstract, introduction, headings, and conclusion only. In 100 words, write what you expect the paper argues and what your lens will specifically look for.', tools: ['Three-Pass Reading (Unit 10)'], tip: 'The first pass is strategic — you are building a framework before you enter the detail. Resist reading the full paper yet.' },
        { day: '2', dayEnd: '3', title: 'Second Pass — Active Reading Through Your Lens', desc: 'Read the full paper applying your role lens. Use the annotation strategy from Unit 11: mark what your lens notices, flag what surprises you, question what you do not understand. Do not try to capture everything — capture what your lens specifically sees that another reader would miss.', tools: ['Cornell Notes or Zettelkasten method (Unit 11)', 'Annotation tools'], tip: 'Underline things that would only strike your specific lens. If an Argument Mapper and an Assumption Auditor read the same sentence, they should annotate different things.' },
        { day: '4', dayEnd: '5', title: 'Third Pass — Critical Re-reading', desc: 'Now re-read specifically to challenge your first impressions. What did you get wrong in pass two? What does the paper say more carefully than you initially gave it credit for? What questions remain genuinely unanswered? Your final lens analysis must be more nuanced than your first reading.', tools: ['Unit 10 SQ3R method'] },
        { day: '6', dayEnd: '7', title: 'Write 400-word Role Analysis', desc: 'Write your Role Analysis. This is not a summary. It is your analytical lens applied precisely. Use at least 2 PEEL paragraphs (Unit 12). Quote the paper sparingly — only when the exact wording matters. Every claim you make should cite the page or section. Submit to the Group Panel by end of Day 7.', tools: ['PEEL framework (Unit 12)', 'APA 7th in-text citation', 'Zotero'] },
      ],
    },
    {
      title: 'Integrate All Five Lenses',
      focus: 'Reading all role analyses and writing the full multi-lens Text Autopsy Report',
      milestones: [
        { day: 8, title: 'Read All Five Role Analyses', desc: 'Read all five Role Analyses in the Group Panel. For each one, write 2–3 bullet points: (1) What specific insight did this lens reveal that I would have completely missed? (2) How does this interact with what my lens found? You are building the architecture of your Autopsy Report.', tools: ['Group Panel'] },
        { day: '9', dayEnd: '10', title: 'Plan Your Text Autopsy Report', desc: 'Design your report structure. Your 700 words must integrate all five lenses into a coherent argument about the paper — not five separate summaries stitched together. What is the central claim of your Autopsy? How do the five layers support, complicate, or contradict each other? Sketch an argument outline before you write.', tip: 'The Autopsy Report has one coherent argument. It uses the five lenses as evidence, not as sections.' },
        { day: '11', dayEnd: '12', title: 'Write 700-word Text Autopsy Report', desc: 'Write your Autopsy Report. Required: (1) Opening: what kind of paper this is and what your multi-lens reading reveals that a surface reading misses (2) Body: your integrated analysis drawing on all five role analyses (3) Close: what this paper contributes to the field AND what it does not do — with specific evidence. Must cite at least 3 of the 5 role analyses.', tools: ['PEEL framework', 'Unit 12 argument structure'] },
        { day: '13', dayEnd: '14', title: 'Write 200-word Reading Strategy Reflection & Submit', desc: 'Write your 200-word reflection: Which reading strategies from Units 10–11 did you use, and at which point? How did your strategy change between passes? Which strategy made the biggest difference to what you found? This must be specific — not a description of the strategies in the abstract.', tools: ['Units 10 & 11 notes'] },
      ],
    },
  ],

  checklist: [
    { title: 'Three-pass reading completed and documented', detail: 'Your Reading Strategy Reflection shows you made three distinct passes and can name what each pass was for.' },
    { title: '400-word Role Analysis is analytical, not descriptive', detail: 'Contains at least 2 PEEL paragraphs. Does not summarise what the paper says — analyses what your specific lens reveals. Uses in-text citations to the paper.' },
    { title: 'Role Analysis submitted to Group Panel by Day 7', detail: 'Your colleagues need your analysis to write their Autopsy Reports. Late submission means they cannot complete their work.' },
    { title: 'Text Autopsy Report integrates all five lenses — not five summaries', detail: 'The report has one coherent argument. All five lenses are woven into that argument as evidence. Check: does each body paragraph use material from more than one lens?' },
    { title: 'Autopsy Report cites at least 3 group role analyses specifically', detail: 'You have named and cited what specific group members found — not a generic "my group found." Specific insights cited with the member\'s name.' },
    { title: '200-word Reading Strategy Reflection is specific to your process', detail: 'Names specific strategies, specific moments when you used them, and specific effects on your analysis. Not a description of strategies in the abstract.' },
    { title: 'All APA 7th citations checked manually', detail: 'In-text citations match reference list entries. Article title in sentence case. DOI present.' },
  ],

  rubric: [
    { criterion: 'Role Analysis — Lens Specificity and Analytical Depth', levels: [
      { mark: '0–10', desc: 'Summary of the paper, not a lens analysis. PEEL paragraphs absent or broken. No evidence of assigned role applied.' },
      { mark: '11–17', desc: 'Some lens application alongside description. 1 PEEL paragraph present. Role partially applied.' },
      { mark: '18–24', desc: 'Clear lens application throughout. 2+ PEEL paragraphs. Insights specific to the role. Paper cited precisely.' },
      { mark: '25', desc: 'Sophisticated lens application revealing genuinely role-specific insights. Every claim evidenced. Would be useful to a colleague playing a different role.' },
    ]},
    { criterion: 'Text Autopsy Report — Integrative Argument', levels: [
      { mark: '0–10', desc: 'Five summaries side by side. No integrative argument. Fewer than 3 lenses referenced.' },
      { mark: '11–17', desc: 'Attempts integration but remains fragmented. 3 lenses referenced. Some argument present.' },
      { mark: '18–24', desc: 'Clear integrative argument using all five lenses as evidence. Coherent throughout. Lenses interact rather than sit separately.' },
      { mark: '25', desc: 'Multi-dimensional reading that could not exist without all five roles. Lenses genuinely interact. Reveals something about the paper no single reader would find.' },
    ]},
    { criterion: 'Reading Strategy Reflection — Specificity and Metacognition', levels: [
      { mark: '0–10', desc: 'Describes strategies in the abstract. No connection to own reading process. Generic.' },
      { mark: '11–17', desc: 'Some specific reference to own process but mostly descriptive of strategies.' },
      { mark: '18–24', desc: 'Specific strategies named at specific moments. Reflection shows genuine metacognition.' },
      { mark: '25', desc: 'Precise, honest account of own reading process including where strategies succeeded and failed. Genuine intellectual self-awareness.' },
    ]},
    { criterion: 'Academic Writing Quality across all components', levels: [
      { mark: '0–10', desc: 'Informal register. Claims without evidence. PEEL structure broken or absent throughout.' },
      { mark: '11–17', desc: 'Mostly formal register. Structure present but inconsistent. Evidence used unevenly.' },
      { mark: '18–24', desc: 'Consistent academic register. Arguments well-structured. Evidence precisely deployed.' },
      { mark: '25', desc: 'Authoritative academic voice throughout. All three components individually strong and coherent together.' },
    ]},
  ],
};

registerAssessment(CFG);

export const assess04 = {
  id: 'a4', badge: 'Assessment 4', title: 'The Text Autopsy',
  phase: 'Major Assessment — 2 weeks', isAssessment: true,
  html: () => {
    window._atState = window._atState || {};
    if (!window._atState['a4']) window._atState['a4'] = { milestones:{}, checklist:{}, selfScore:null, reflection:'', submitted:false };
    return assessmentTask(CFG);
  },
};
