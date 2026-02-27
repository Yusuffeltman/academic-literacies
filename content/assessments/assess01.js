// Assessment 1 — The Media Intelligence Brief
// After Units 1–3 | Platform Surveillance collaboration

import { assessmentTask, registerAssessment } from '../../src/components/assessment-task.js';

const CFG = {
  id: 'a1', unitId: 'a1', badge: 'Assessment 1',
  title: 'The Media Intelligence Brief',
  subtitle: 'A 2-week collaborative investigation into information environments',
  icon: '🔭', color: 'linear-gradient(135deg,#1e3a5f,#2563eb)',
  marks: 100,
  skills: ['AI literacy', 'Filter bubbles', 'Critical thinking', 'Policy writing'],

  scenario: `A provincial Department of Education has commissioned a media literacy audit before rolling out a new digital citizenship curriculum. They need to understand how different platforms are shaping the information environment of South African teachers — what kinds of content spread, how algorithms shape what teachers see, and where misinformation enters the professional community.`,

  brief: `You are part of a small research team that has been given access to monitor a specific digital platform for two weeks. Your team covers five different environments. Each member produces an intelligence report on their assigned platform, and the team's combined findings inform a formal policy recommendation to the provincial department.`,

  products: [
    'An Observation Log — structured daily notes over 14 days (not submitted, but evidence base for your report)',
    'A 300-word Platform Intelligence Report documenting filter bubble evidence, algorithm behaviour, and information quality on your assigned platform',
    'A 700-word Media Literacy Policy Recommendation addressed to a specific school principal — citing evidence from your platform AND drawing on your group\'s cross-platform comparison',
    'A Reference List in APA 7th (minimum 3 verified sources)',
  ],

  collaboration: {
    type: 'Platform Surveillance',
    icon: '📡',
    name: 'Distributed Observation Network',
    how: 'Each member of your group monitors a different digital environment for the full two weeks, keeping a structured observation log. In Week 2, groups share their platform data in a structured format, enabling each member to write a comparative policy recommendation that could not exist without all five observations.',
    interdependence: 'Your policy recommendation must compare information quality, algorithm behaviour, and misinformation risk ACROSS all five platforms — data only you can compare because only your group observed all five simultaneously. Without every member\'s platform data, the cross-platform comparison is impossible and the recommendation becomes generic and unacceptable.',
    groupPanelNote: 'Below are the contribution slots for your group. When your group members submit their Platform Intelligence Reports, their findings will appear here. Your policy recommendation must reference at least 3 of the 5 platform reports.',
    roles: [
      { icon: '📱', title: 'TikTok/Instagram Reels Monitor', description: 'Observe education-related short video content for 14 days. Track: what gets recommended, what hashtags appear, what education claims are made, evidence of algorithm personalisation.', contributes: '300-word Platform Intelligence Report + 5 annotated screenshots' },
      { icon: '👥', title: 'Facebook/WhatsApp Education Groups Monitor', description: 'Monitor teacher-facing Facebook groups and note the types of WhatsApp forwards circulating in educator communities. Track misinformation spread and community responses.', contributes: '300-word Platform Intelligence Report + 5 annotated examples (anonymised)' },
      { icon: '🐦', title: 'Twitter/X Education Discourse Tracker', description: 'Track education-related content on Twitter/X over 14 days. Note how algorithms surface content, what trends, and how education professionals use the platform versus how it uses them.', contributes: '300-word Platform Intelligence Report + thread analysis' },
      { icon: '🔍', title: 'Google Search Algorithm Watcher', description: 'Conduct 20 structured searches on education topics over 14 days using the same terms in different contexts (incognito/non-incognito, different times). Document personalisation effects.', contributes: '300-word Platform Intelligence Report + side-by-side search result comparisons' },
      { icon: '🎓', title: 'YouTube Education Content Analyst', description: 'Follow YouTube\'s recommendation algorithm for 14 days starting from a single education video. Map where the algorithm takes you. Note what defines "education content" on the platform.', contributes: '300-word Platform Intelligence Report + recommendation pathway map' },
    ],
  },

  weeks: [
    {
      title: 'Observe, Document, Investigate',
      focus: 'Platform immersion — daily structured observation and evidence collection',
      milestones: [
        { day: 1, title: 'Orientation & Setup', desc: 'Set up your observation log template. Identify your platform\'s most common education content entry points. Bookmark your starting position. Re-read Unit 2 (filter bubbles) as your observation framework.', tools: ['Observation Log Template', 'Unit 2 Notes'], tip: 'Take a screenshot of your "default" feed on Day 1 — your comparative baseline.' },
        { day: '2', dayEnd: '5', title: 'Daily Observation Log (Days 2–5)', desc: 'Spend 20 minutes daily on your assigned platform. Complete your structured log entry for each day: what type of content appeared, evidence of personalisation, any education-related misinformation you noticed, emotional tone of content. Do NOT just scroll — observe systematically.', tools: ['Structured Log Template'], tip: 'Ask after every session: would I have seen different content if I were a different person? That gap is your filter bubble evidence.' },
        { day: '6', dayEnd: '7', title: 'Midpoint Review', desc: 'Review your first 5 days of logs. Identify 3 clear examples that illustrate filter bubble, algorithm behaviour, or misinformation risk. Write 100 words summarising your pattern so far. Share your summary with your group in the Group Panel.', tools: ['Unit 1 & 2 Notes'] },
      ],
    },
    {
      title: 'Analyse, Compare, Recommend',
      focus: 'Writing your Platform Intelligence Report and cross-platform Policy Recommendation',
      milestones: [
        { day: '8', dayEnd: '10', title: 'Continue Observation + Read Group Reports', desc: 'Continue your daily platform observation (Days 8–10). Read your group members\' midpoint summaries in the Group Panel. Note 2–3 specific differences between your platform and theirs that you will reference in your policy recommendation.', tools: ['Group Panel Contributions', 'Unit 3 Framework'] },
        { day: 11, title: 'Draft Platform Intelligence Report', desc: 'Write your 300-word Platform Intelligence Report. Structure: (1) Platform description and how its algorithm works (2) Key finding: your clearest evidence of filter bubble or misinformation risk (3) What this means specifically for a South African teacher using this platform professionally. Cite at least 2 sources.', tools: ['Zotero', 'Scopus', 'Unit 2 & 3'], tip: 'This report goes into the Group Panel so others can cite it. Write it as if it will be read and used by colleagues — it will be.' },
        { day: 12, title: 'Research Policy Brief Conventions', desc: 'Read one example policy brief from the DBE website or HSRC. Note: What sections does it have? How is evidence presented? What register does it use? Take 3 specific notes on genre conventions you will replicate.', tip: 'A policy brief is not an essay. It has headings, recommendations, and evidence. Readers want to know: what is the problem, what is the evidence, and what should we do?' },
        { day: '13', dayEnd: '14', title: 'Write & Revise Policy Recommendation', desc: 'Write your 700-word Media Literacy Policy Recommendation. It must address a specific school principal (name a fictional school) and contain: (1) A context section drawing on at least 3 of your group\'s platform reports (2) Two specific, evidence-based recommendations with cited support (3) Practical implementation suggestions for a school with limited device access. Revise once, then complete your submission checklist.', tools: ['Zotero', 'Scopus', 'Group Panel', 'APA 7th Guide'], tip: 'The word "recommendation" must appear at least twice. Each recommendation must be tied to specific evidence from your platform data.' },
      ],
    },
  ],

  checklist: [
    { title: '14-day observation log completed', detail: 'Every day has a log entry. You do not submit this, but it is the evidence base for your report. Your report should reference specific days and examples.' },
    { title: 'Platform Intelligence Report is exactly 280–320 words', detail: 'Check your word count. Includes in-text citations. Submitted to Group Panel before Day 12.' },
    { title: 'Policy Recommendation addresses a named school principal', detail: 'The recommendation is not generic — it is addressed to a specific (fictional) person in a specific school context.' },
    { title: 'Policy Recommendation references minimum 3 group platform reports', detail: 'You have read your group members\' reports and cited specific findings from at least 3 of them. You cannot write this section without their contributions.' },
    { title: 'Policy Recommendation contains 2 specific, numbered recommendations', detail: 'Each recommendation is clearly labelled, tied to evidence, and practically implementable in a SA school context.' },
    { title: 'Reference list in APA 7th with minimum 3 peer-reviewed or grey literature sources', detail: 'All references verified in Scopus or Google Scholar. Zotero used for management. Format checked manually.' },
    { title: 'Self-assessment completed honestly', detail: 'You have rated yourself against the rubric below and written a genuine reflection — not what you think the lecturer wants to hear.' },
  ],

  rubric: [
    { criterion: 'Platform Intelligence Report — Observation Quality', levels: [
      { mark: '0–10', desc: 'Little or no specific evidence from observation. Vague generalisations.' },
      { mark: '11–17', desc: 'Some specific examples but analysis remains superficial. Limited use of unit vocabulary.' },
      { mark: '18–24', desc: 'Clear specific evidence, well-described algorithm/filter bubble behaviour, unit vocabulary used correctly.' },
      { mark: '25', desc: 'Precise, well-documented observations with multiple specific examples. Insightful analysis connecting to course theory.' },
    ]},
    { criterion: 'Policy Recommendation — Cross-Platform Analysis', levels: [
      { mark: '0–10', desc: 'No reference to group data. Generic recommendations not grounded in evidence.' },
      { mark: '11–17', desc: 'References 1–2 group reports superficially. Comparison lacks depth.' },
      { mark: '18–24', desc: 'References 3+ group reports with specific findings cited. Clear comparative argument.' },
      { mark: '25', desc: 'Sophisticated comparative analysis drawing on all available group data. Argument could not exist without the collaboration.' },
    ]},
    { criterion: 'Academic Writing — Register, Genre, Citation', levels: [
      { mark: '0–10', desc: 'Informal register throughout. No awareness of policy brief conventions. Poor or absent citations.' },
      { mark: '11–17', desc: 'Uneven register — academic and informal mixed. Some awareness of genre. Citations present but errors.' },
      { mark: '18–24', desc: 'Consistent formal register. Policy brief conventions followed. APA 7th citations mostly correct.' },
      { mark: '25', desc: 'Precise, appropriate academic register. Policy brief genre mastered. APA 7th citations error-free.' },
    ]},
    { criterion: 'Critical Thinking — Specificity & Argument', levels: [
      { mark: '0–10', desc: 'Claims without evidence. No clear argument. Descriptive rather than analytical.' },
      { mark: '11–17', desc: 'Argument present but supported with vague evidence. Some analysis alongside description.' },
      { mark: '18–24', desc: 'Clear, evidence-based argument. Specific examples support each claim. Critical stance visible.' },
      { mark: '25', desc: 'Sophisticated analytical argument. Evidence precisely deployed. Counter-perspectives acknowledged.' },
    ]},
  ],
};

registerAssessment(CFG);

export const assess01 = {
  id: 'a1', badge: 'Assessment 1', title: 'The Media Intelligence Brief',
  phase: 'Major Assessment — 2 weeks',
  isAssessment: true,
  html: () => {
    if (!window._atState?.['a1']) {
      window._atState = window._atState || {};
      window._atState['a1'] = { milestones:{}, checklist:{}, selfScore:null, reflection:'', submitted:false };
    }
    return assessmentTask(CFG);
  },
};
