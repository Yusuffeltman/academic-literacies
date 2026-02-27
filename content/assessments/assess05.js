// Assessment 5 — The Genre Translation Studio
// After Units 13–15 | Genre Chain collaboration

import { assessmentTask, registerAssessment } from '../../src/components/assessment-task.js';

const CFG = {
  id: 'a5', unitId: 'a5', badge: 'Assessment 5',
  title: 'The Genre Translation Studio',
  subtitle: 'One research finding. Five audiences. Five genres. One curriculum resource.',
  icon: '✍️', color: 'linear-gradient(135deg,#7c1d0f,#dc2626)',
  marks: 100,
  skills: ['Academic register', 'Genre awareness', 'Visual argument', 'Peer review', 'Audience adaptation'],

  scenario: `The Wits School of Education is building an open-access Professional Learning Resource Hub for South African teachers. The hub needs resources in multiple formats because different teachers engage differently: some read academic papers, some watch short explainers, some want infographics, some need community forum posts, and some need formal policy-facing summaries. Your group has been given one peer-reviewed research finding to translate across five different genres for five different audiences.`,

  brief: `Your group shares one research finding — a specific, clearly stated claim from a peer-reviewed paper, chosen from a list provided by your lecturer. Each member translates this finding into a different genre for a different audience. Each genre demands different language, structure, and visual design choices. In Week 2, you peer-review two other members' genre translations using a structured rubric. Your final submission is your own genre piece, a peer review you received, and a Genre Reflection that can only be written after you have compared all five translations.`,

  products: [
    'A single genre translation of the shared research finding — produced to professional standard in your assigned genre (see roles for specific requirements)',
    'One written peer review (300 words) of another group member\'s genre translation — applying the Unit 15 peer review protocol',
    'A 500-word Genre Reflection: what genre decisions you made, why, what the peer review revealed, and what comparing all five translations taught you about how knowledge changes shape across audiences',
    'A Reference List in APA 7th for the source paper and any additional sources cited',
  ],

  collaboration: {
    type: 'Genre Translation Chain',
    icon: '🔗',
    name: 'Parallel Genre Production with Cross-Review',
    how: 'Your group receives the same research finding but each member translates it into a different genre for a different audience. No two members produce the same type of text. In Week 2, you exchange drafts and each member peer-reviews one other member\'s work using the structured protocol from Unit 15. You then revise your own piece using the feedback received. Your Genre Reflection synthesises what you learn from comparing all five translations.',
    interdependence: 'Your Genre Reflection requires you to answer: what gets gained and lost when a research finding moves from an academic paper into your genre? What gets gained and lost in the OTHER genres? You can only answer this by comparing all five versions of the same finding. Without all five translations visible, there is nothing to reflect on comparatively.',
    groupPanelNote: 'All five genre translations are posted here for comparison. Read each one carefully. In your Genre Reflection, you must identify: (1) what each genre prioritises and sacrifices, and (2) what the finding means after travelling through all five genre transformations — is it still the same claim?',
    roles: [
      { icon: '📄', title: 'Academic Abstract Writer', description: 'Write a 250-word structured abstract of the research finding in full academic register: background, method, finding, and implications. Must follow standard abstract conventions. Audience: other researchers. No visual elements — pure prose argument.', contributes: '250-word academic abstract in standard journal format' },
      { icon: '📊', title: 'Infographic Designer', description: 'Create a single-page infographic that communicates the research finding visually for a teacher audience. Must include the finding as a headline claim, supporting evidence in visual form, source attribution, and no more than 80 words of prose. Use tools like Canva or PowerPoint. Audience: busy teachers who will share this on a PLC WhatsApp group.', contributes: 'Professional single-page infographic + 100-word design rationale' },
      { icon: '📰', title: 'Teacher Magazine Feature Writer', description: 'Write a 400-word feature article for a teacher-facing magazine like Professional Teacher SA. Engaging opener, evidence-based body, practical takeaway. Academic register adapted for a professional but non-specialist reader. No jargon without explanation. Audience: practising teachers who value evidence but do not read academic journals.', contributes: '400-word feature article with headline and subheadings' },
      { icon: '🎙️', title: 'Policy Brief Author', description: 'Write a 400-word policy brief directed at a principal or district official. Required sections: Background, Key Finding, Evidence, Recommendation. Formal register. Bullet points permitted in the Recommendation section only. Audience: school leader who must make a resource allocation decision based on this evidence.', contributes: '400-word structured policy brief with headed sections' },
      { icon: '💬', title: 'Online Community Post Writer', description: 'Write a 300-word post for an online teacher professional community (like a Facebook teacher group or a Teacha! forum post). Must be engaging, credible, and cite the source — but in a format that invites response and discussion. Audience: teacher community members who engage informally but value professional evidence.', contributes: '300-word professional community post formatted for online sharing' },
    ],
  },

  weeks: [
    {
      title: 'Research the Finding, Produce Your Genre',
      focus: 'Deep reading of the source paper + first draft of your genre translation',
      milestones: [
        { day: 1, title: 'Receive Finding and Analyse the Source Paper', desc: 'Receive the shared research finding and the full paper from your lecturer. Read the paper strategically (Unit 10 three-pass method). Identify: the exact claim being translated, the evidence behind it, the context it applies in, and any limitations the authors acknowledge. These details determine what you can and cannot claim in your genre translation.', tools: ['Three-Pass Reading (Unit 10)'], tip: 'Before you write for any audience, you must understand the finding precisely enough to know what it actually says versus what it might be made to imply.' },
        { day: '2', dayEnd: '3', title: 'Genre Analysis — Read 2 Exemplars', desc: 'Find and read two professional examples of your assigned genre. What structural conventions define it? What register does it use? How is evidence typically presented? How visual is it? Write 150 words of notes on the conventions you will follow — these become part of your Genre Reflection.', tip: 'You are not just imitating a genre — you are learning its rules well enough to make deliberate choices about which rules to follow and which to bend.' },
        { day: '4', dayEnd: '5', title: 'First Draft of Genre Translation', desc: 'Write your first complete draft. Follow the conventions you identified. Make deliberate choices about: what to include from the original finding, what to leave out, what to translate (not copy), and how to attribute the source. Your audience must be able to act on or engage with this piece without reading the original paper.', tools: ['Unit 13 register guide', 'Unit 14 visual argument (Infographic role)', 'Canva/PowerPoint (Infographic role)'] },
        { day: '6', dayEnd: '7', title: 'Self-Review and Peer Exchange', desc: 'Apply the Unit 15 peer review protocol to your own draft before sharing. Identify your strongest and weakest element. Post your draft to the Group Panel. Receive your allocated peer\'s draft in return. You will review each other\'s work in Week 2.', tools: ['Unit 15 Peer Review Protocol'] },
      ],
    },
    {
      title: 'Review, Revise, Reflect',
      focus: 'Writing the peer review, revising your piece, and comparing all five genre translations',
      milestones: [
        { day: '8', dayEnd: '9', title: 'Write 300-word Peer Review', desc: 'Apply the Unit 15 structured peer review protocol to your allocated group member\'s genre translation. Required: (1) Identify the genre conventions the piece follows and how well (2) Does the translation faithfully and accurately represent the research finding? (3) Is the register appropriate for the stated audience? (4) One specific suggestion for strengthening the piece. Be honest, specific, and constructive — not kind for its own sake.', tools: ['Unit 15 Peer Review Protocol'] },
        { day: 10, title: 'Read All 5 Translations in the Group Panel', desc: 'Read all five genre translations carefully. As you read each one, note: (1) What does this genre prioritise? (2) What does it sacrifice? (3) Is the finding still recognisably the same claim in this genre? (4) Which genre translation is most accurate? Most accessible? Most likely to change behaviour? Your answers are the raw material for your Genre Reflection.', tools: ['Group Panel'] },
        { day: '11', dayEnd: '12', title: 'Revise Your Genre Translation', desc: 'Use the peer review you received to revise your genre translation. Do not just accept all feedback uncritically — decide what you agree with and what you do not, and justify your decisions in your Genre Reflection. Your revised piece is what you submit.', tip: 'Revision is not correction. It is reconsidering your decisions in light of how a reader experienced them.' },
        { day: '13', dayEnd: '14', title: 'Write 500-word Genre Reflection and Submit', desc: 'Write your Genre Reflection. Required: (1) What genre conventions did you follow and what choices did you make — and why? (2) What did the peer review reveal about your translation that you could not see yourself? (3) Comparing all five genre translations: what happens to the research finding as it moves across genres? Does anything get lost or distorted? (4) What does this teach you about academic register and audience?', tools: ['Group Panel', 'Unit 13 & 14 notes'] },
      ],
    },
  ],

  checklist: [
    { title: 'Source paper read using three-pass method', detail: 'You understand the finding precisely enough to translate it accurately. Your Genre Reflection references specific details from the source paper.' },
    { title: 'Genre translation meets the specific requirements of your assigned role', detail: 'Check your role description for word count, format, and structural requirements. Your piece meets professional standards for its genre.' },
    { title: 'Source correctly attributed in your genre translation', detail: 'The original research is cited in a format appropriate to your genre. For an infographic: source line. For a policy brief: APA 7th. For a community post: "According to research by [Author, Year]."' },
    { title: '300-word Peer Review follows Unit 15 protocol', detail: 'Covers: genre conventions, finding accuracy, register/audience appropriateness, one specific improvement suggestion. Honest and specific — not a compliment.' },
    { title: 'Genre Reflection compares all five translations', detail: 'References specific decisions and trade-offs in multiple genre translations — not just your own. Identifies what changes when knowledge moves across genres.' },
    { title: 'Genre Reflection engages specifically with the peer review you received', detail: 'Names what feedback you accepted, what you rejected, and why. Shows genuine engagement with critique.' },
    { title: 'Self-assessment reflects honest self-evaluation of genre translation quality', detail: 'Does not just describe what you produced — evaluates how well it works as a professional genre piece.' },
  ],

  rubric: [
    { criterion: 'Genre Translation — Convention Mastery and Accuracy', levels: [
      { mark: '0–10', desc: 'Genre conventions not followed. Finding misrepresented or oversimplified. Source not attributed.' },
      { mark: '11–17', desc: 'Basic genre conventions followed. Finding broadly accurate but with unsupported claims. Attribution present.' },
      { mark: '18–24', desc: 'Genre conventions confidently applied. Finding accurately and faithfully translated. Register appropriate to audience. Source correctly attributed.' },
      { mark: '25', desc: 'Professional-level genre mastery. Finding accurately and compellingly translated. Register precisely calibrated for audience. Could be published or distributed as a real professional resource.' },
    ]},
    { criterion: 'Peer Review — Rigour and Constructive Specificity', levels: [
      { mark: '0–10', desc: 'Vague praise or criticism. Protocol not followed. No specific suggestions.' },
      { mark: '11–17', desc: 'Some protocol elements present. Some specific observations. Feedback broadly useful but underdeveloped.' },
      { mark: '18–24', desc: 'Protocol followed. Specific observations on genre, accuracy, and register. Constructive suggestion actionable.' },
      { mark: '25', desc: 'Rigorous, honest, and specific review. Every criterion addressed with evidence. Suggestion clearly actionable. Review itself models the academic feedback genre.' },
    ]},
    { criterion: 'Genre Reflection — Comparative Insight and Self-Awareness', levels: [
      { mark: '0–10', desc: 'Describes what was done rather than why. No comparison across genres. Peer review not engaged with.' },
      { mark: '11–17', desc: 'Some reflection on own choices. Limited comparison across genres. Peer review mentioned but not engaged with critically.' },
      { mark: '18–24', desc: 'Clear reflection on own choices and peer feedback. Comparative analysis of 3+ genre translations. Insight about knowledge transformation across genres.' },
      { mark: '25', desc: 'Sophisticated genre metacognition. Cross-genre comparison reveals genuine insight about how audience shapes knowledge representation. Peer feedback critically engaged with.' },
    ]},
    { criterion: 'Academic Writing — Register Control across all written components', levels: [
      { mark: '0–10', desc: 'Register inconsistency across components. Informal language in formal contexts. PEEL absent in academic components.' },
      { mark: '11–17', desc: 'Mostly appropriate register. Some slippage. Argument structure present but inconsistent.' },
      { mark: '18–24', desc: 'Each component registers correctly for its genre and audience. Argument coherent throughout.' },
      { mark: '25', desc: 'Demonstrates register range — academic precision in reflection, appropriate informality where genre demands it. All components coherent and purposeful.' },
    ]},
  ],
};

registerAssessment(CFG);

export const assess05 = {
  id: 'a5', badge: 'Assessment 5', title: 'The Genre Translation Studio',
  phase: 'Major Assessment — 2 weeks', isAssessment: true,
  html: () => {
    window._atState = window._atState || {};
    if (!window._atState['a5']) window._atState['a5'] = { milestones:{}, checklist:{}, selfScore:null, reflection:'', submitted:false };
    return assessmentTask(CFG);
  },
};
