// Assessment 2 — The Research Archaeology Report
// After Units 4–6 | Temporal Investigation collaboration

import { assessmentTask, registerAssessment } from '../../src/components/assessment-task.js';

const CFG = {
  id: 'a2', unitId: 'a2', badge: 'Assessment 2',
  title: 'The Research Archaeology Report',
  subtitle: 'Tracing how a field of knowledge evolved across time',
  icon: '🏺', color: 'linear-gradient(135deg,#1a3a2a,#15803d)',
  marks: 100,
  skills: ['Scopus searching', 'Annotated bibliography', 'Source evaluation', 'Synthesis writing'],

  scenario: `You have been appointed as a Research Support Mentor in your school's emerging Professional Learning Community (PLC). The HOD has asked your PLC to produce a research orientation guide for newly qualified teachers who have never engaged with academic literature. The guide needs to show — using real sources — how understanding of a specific education topic has developed over time, so that new teachers can situate current practice in its research history.`,

  brief: `Each PLC member is assigned a specific time period to investigate using Scopus and Google Scholar. You search the same agreed topic but within your period only. Together, your five investigations cover the full research history of the field. Your individual product is both your period's "Decade Digest" AND a Research Orientation Guide that can only be written once all periods are visible.`,

  products: [
    'A Decade Digest — 5 annotated sources from your assigned time period with a 200-word synthesis of what the field understood during your period',
    'A 600-word Research Orientation Guide for a newly qualified teacher — must include a "Field Trajectory" section that traces the research from your group\'s earliest period to the most recent',
    'A Reference List in APA 7th (all 5 sources from your period + minimum 2 additional sources from other periods you cite in the Guide)',
  ],

  collaboration: {
    type: 'Temporal Archaeology',
    icon: '⏳',
    name: 'Parallel Time-Period Investigation',
    how: 'Your group agrees on a shared research topic (chosen from a list provided by your lecturer). Each member then independently searches Scopus and Google Scholar for that topic within their assigned time period. In Week 2, you share your Decade Digests, enabling each member to trace the full intellectual history of the field in their individual guide.',
    interdependence: 'The "Field Trajectory" section of your Research Orientation Guide requires you to describe how research on this topic evolved across all five periods. You cannot describe a trajectory without all five data points. A guide that only covers two time periods is incomplete and will not meet the assessment criteria.',
    groupPanelNote: 'When each member submits their Decade Digest, it appears here. You need all five digests to write the Field Trajectory section of your guide. Read each one carefully and note: What changed? What stayed the same? What methodologies shifted?',
    roles: [
      { icon: '📜', title: 'Historical Roots Researcher (Pre-2000)', description: 'Search for foundational scholarship on the agreed topic published before 2000. Focus on seminal works, early frameworks, and the original theoretical debates that shaped the field.', contributes: '5 annotated sources + 200-word synthesis of pre-2000 understanding' },
      { icon: '🔄', title: 'Transition Period Researcher (2000–2009)', description: 'Find 5 sources from this decade. This period often marks methodological shifts and the influence of technology. What changed from the previous decade? What new questions emerged?', contributes: '5 annotated sources + 200-word synthesis of 2000–2009 developments' },
      { icon: '📊', title: 'Growth Period Researcher (2010–2015)', description: 'Search for scholarship from 2010–2015. This period often shows a field maturing — more rigorous methods, more South African voices, more nuanced findings. Document what became settled knowledge.', contributes: '5 annotated sources + 200-word synthesis of 2010–2015 expansion' },
      { icon: '🌍', title: 'Recent Scholarship Researcher (2016–2020)', description: 'Focus on the 2016–2020 window. How did global events (COVID, #FeesMustFall, decolonisation debates) shape the scholarship? What debates remained unresolved?', contributes: '5 annotated sources + 200-word synthesis of 2016–2020 context' },
      { icon: '🚀', title: 'Current Frontiers Researcher (2021–Present + Grey Literature)', description: 'Search for the most current peer-reviewed work AND relevant grey literature (DBE reports, HSRC publications). What are the live debates? What does emerging research suggest?', contributes: '5 annotated sources (mix of peer-reviewed and grey literature) + 200-word synthesis of current state' },
    ],
  },

  weeks: [
    {
      title: 'Search, Find, Annotate',
      focus: 'Scopus deep-dive into your assigned time period — 5 verified, annotated sources',
      milestones: [
        { day: 1, title: 'Topic Confirmation & Search Strategy Design', desc: 'Confirm your agreed group topic with your lecturer. Design your Scopus search query for your time period (use the natural language query approach from Unit 6). Run 3 test searches and note which query returns the most relevant results. Record your exact search string.', tools: ['Scopus AI', 'Unit 6 Notes'], tip: 'Your search string is part of your methodology. Write it down exactly: you will reference it in your Decade Digest.' },
        { day: '2', dayEnd: '4', title: 'Source Discovery & Selection', desc: 'Search Scopus (and Google Scholar for open-access versions) within your time period. Identify at least 10 candidate sources. Narrow to your best 5 using the source hierarchy from Unit 5. For each selected source, save it to Zotero immediately. Confirm all 5 actually exist and match your topic.', tools: ['Scopus', 'Google Scholar', 'Zotero', 'Unit 5 Source Hierarchy'] },
        { day: '5', dayEnd: '7', title: 'Write 5 Annotations', desc: 'For each of your 5 sources, write a structured annotation: (1) One sentence: what the study did (method + context) (2) One sentence: what it found (3) One sentence: why it matters for a teacher new to this field. Each annotation: 50–70 words. This is your Decade Digest content.', tools: ['Zotero', 'APA 7th Guide'], tip: 'Annotations are NOT summaries of abstracts. They are evaluations. Ask: what is the evidence quality here? What does this paper assume?' },
      ],
    },
    {
      title: 'Synthesise, Compare, Write',
      focus: 'Writing your Decade Digest and constructing the full Research Orientation Guide',
      milestones: [
        { day: 8, title: 'Write 200-word Period Synthesis', desc: 'Write your 200-word synthesis that answers: What did the field know about this topic during your period? What methods were used? What was assumed? What was contested? This goes into the Group Panel for your colleagues to read.', tip: 'Write for your fellow group members, not just for marks. They need your period to make sense of their own.' },
        { day: '9', dayEnd: '10', title: 'Read All Group Digests + Map the Trajectory', desc: 'Read all five group digests in the Group Panel. On paper or digitally, sketch a timeline: What changed decade by decade? What stayed constant? Identify 2–3 clear turning points in the research. These become the backbone of your Field Trajectory section.', tools: ['Group Panel', 'Unit 10 Strategic Reading Notes'] },
        { day: '11', dayEnd: '12', title: 'Draft Research Orientation Guide', desc: 'Write your 600-word guide. Required sections: (1) Introduction: why this topic matters for SA teachers (2) Field Trajectory: 250 words tracing research evolution across all five periods, citing group members\' sources (3) What the research means for your classroom: 2 specific evidence-based implications (4) Where to read next: 3 curated recommendations. Register: professional but accessible — your reader has just completed their PGCE.', tools: ['Zotero', 'Group Panel', 'APA 7th'] },
        { day: '13', dayEnd: '14', title: 'Revise, Reference Check & Submit', desc: 'Revise your guide once. Check every in-text citation has a matching reference list entry. Verify 2 references manually against APA 7th — correct any Zotero errors. Complete your self-assessment. Submit.', tools: ['Zotero', 'APA 7th Manual'] },
      ],
    },
  ],

  checklist: [
    { title: '5 annotated sources completed — all from your assigned time period', detail: 'Each annotation: 50–70 words. Each source verified in Scopus. Each source saved correctly in Zotero.' },
    { title: '200-word Period Synthesis submitted to Group Panel', detail: 'Submitted early enough for group members to read before Day 10. Written for your colleagues, not just for marks.' },
    { title: 'Research Orientation Guide references sources from at least 3 different time periods', detail: 'Your Field Trajectory section requires citations from multiple periods. You cannot write it using only your own period\'s sources.' },
    { title: 'Field Trajectory section (approx. 250 words) traces clear evolution across all 5 periods', detail: 'Names specific changes, methodological shifts, or conceptual developments. Each period accounted for.' },
    { title: 'Two specific classroom implications stated with cited evidence', detail: 'Not vague suggestions — specific, practical, tied to a named research finding with an APA 7th citation.' },
    { title: 'Reference list in APA 7th — format manually verified', detail: 'You have checked article title capitalisation (sentence case), author format, journal name (italics), and DOI presence for every entry.' },
    { title: 'Self-assessment completed', detail: 'Score and reflection completed honestly. Reflection addresses both a strength and a genuine limitation.' },
  ],

  rubric: [
    { criterion: 'Decade Digest — Source Quality & Annotation Depth', levels: [
      { mark: '0–10', desc: 'Sources not verified or not from correct period. Annotations are summaries of abstracts, not evaluations.' },
      { mark: '11–17', desc: 'Sources mostly from correct period. Annotations describe content but do not evaluate significance.' },
      { mark: '18–24', desc: 'All sources verified and period-appropriate. Annotations evaluate each source\'s method, context, and relevance.' },
      { mark: '25', desc: 'Precise, period-specific sources with evaluative annotations that demonstrate deep reading. Search methodology documented.' },
    ]},
    { criterion: 'Field Trajectory — Use of Group Research', levels: [
      { mark: '0–10', desc: 'No reference to other periods. Trajectory not present or makes no sense as a narrative.' },
      { mark: '11–17', desc: 'References 1–2 periods beyond own. Trajectory exists but is underdeveloped.' },
      { mark: '18–24', desc: 'Clear trajectory across all 5 periods. Group sources cited correctly. Change over time clearly articulated.' },
      { mark: '25', desc: 'Sophisticated trajectory with specific turning points named and evidenced. Could not have been written without group collaboration.' },
    ]},
    { criterion: 'Research Orientation Guide — Clarity & Professional Register', levels: [
      { mark: '0–10', desc: 'Unclear structure. Register inappropriate for audience. Evidence not tied to claims.' },
      { mark: '11–17', desc: 'Structure present but inconsistent. Register mostly appropriate. Some evidence, some assertion.' },
      { mark: '18–24', desc: 'Well-structured, audience-appropriate guide. Consistent register. Classroom implications specific and evidenced.' },
      { mark: '25', desc: 'Exemplary clarity and professional register. Classroom implications specific and grounded. A genuinely useful resource.' },
    ]},
    { criterion: 'APA 7th Citation Accuracy', levels: [
      { mark: '0–10', desc: 'Significant citation errors throughout. Zotero output not checked. Missing references.' },
      { mark: '11–17', desc: 'Most citations present but with repeated format errors (capitalisation, italics, DOI).' },
      { mark: '18–24', desc: 'Mostly accurate citations. Minor errors. Zotero used and output verified.' },
      { mark: '25', desc: 'All citations accurate. Evidence of manual verification against APA 7th. No missing references.' },
    ]},
  ],
};

registerAssessment(CFG);

export const assess02 = {
  id: 'a2', badge: 'Assessment 2', title: 'The Research Archaeology Report',
  phase: 'Major Assessment — 2 weeks', isAssessment: true,
  html: () => {
    window._atState = window._atState || {};
    if (!window._atState['a2']) window._atState['a2'] = { milestones:{}, checklist:{}, selfScore:null, reflection:'', submitted:false };
    return assessmentTask(CFG);
  },
};
