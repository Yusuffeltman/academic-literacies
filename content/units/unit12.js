// content/units/unit12.js — Academic Writing: Argument & Structure
// Phase 3 | Academic Entry Level 3

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
export const VIDEO_KEY = 'unit12';

const RT_U12 = {
  id: 'rt-u12', unitId: 'u12', unitNum: 12,
  title: 'The PEEL Paragraph — Academic Writing\'s Building Block',
  level: 'Academic Entry Level 3', wordTarget: 220,
  source: 'Adapted for Academic Literacies — informed by academic writing pedagogy research and modelled on the University of Melbourne Academic Skills Unit resources',
  sourceUrl: null,
  vocab: [
    { term: 'PEEL', definition: 'A paragraph structure framework: Point (your argument), Evidence (your source), Explanation (your analysis), Link (connection back to the thesis). PEEL ensures every paragraph contributes to your overall argument.', example: 'P: Bilingual instruction supports cognitive development. E: Heugh (2015) found... E: This suggests... L: This supports the argument that...' },
    { term: 'Thesis statement', definition: 'A single sentence — usually at the end of the introduction — that states your essay\'s central argument. Every paragraph of your essay should connect back to and support this statement.', example: '"This essay argues that the underresourcing of inclusive education in South African schools reflects a systemic failure to translate policy aspiration into practice, with measurable consequences for learners with disabilities."' },
    { term: 'Analytical writing', definition: 'Writing that goes beyond describing or summarising to evaluate, interpret, and argue. Analytical writing asks "so what?" and "why does this matter?" after every piece of evidence.', example: 'Descriptive: "Freire argued that education is political." Analytical: "Freire\'s argument that education is political challenges the assumption of curriculum neutrality that underlies standardised testing in South Africa."' },
    { term: 'Topic sentence', definition: 'The first sentence of a paragraph, which states the paragraph\'s main point. A topic sentence is a mini-thesis — it makes a claim that the rest of the paragraph will support.', example: '"Play-based learning in the Foundation Phase is not a reduction in academic rigour — it is a developmentally appropriate context in which rigour is achieved differently."' },
  ],
  text: `
    <h3>The PEEL Paragraph — Academic Writing's Building Block</h3>

    <p>Academic essays are built from paragraphs. Each paragraph is a unit of argument — it makes a specific claim, supports it with evidence, explains the significance of that evidence, and connects back to the essay's central thesis. When paragraphs do these four things well, essays almost write themselves. When paragraphs fail at any of these four tasks, essays become lists of disconnected ideas that frustrate both the writer and the reader.</p>

    <p>The <strong>PEEL structure</strong> is a framework that ensures every paragraph does its job:</p>

    <p><strong>P — Point.</strong> Your first sentence states the paragraph's argument. Not a topic, not a question, not a description — an argument. "Play-based learning supports cognitive development in the Foundation Phase" is a point. "This paragraph is about play-based learning" is not.</p>

    <p><strong>E — Evidence.</strong> Your second or third sentence introduces a source that supports your point. This is where your citations appear. Good evidence is specific: not "research shows" but "Hirsh-Pasek et al. (2009) found, in a study of 3,500 children across four countries, that..."</p>

    <p><strong>E — Explanation.</strong> After presenting the evidence, you must explain what it means for your argument. This is the analytical move — the "so what?" This is where most student essays are weakest: they present evidence and assume it speaks for itself. It does not. You must interpret it.</p>

    <p><strong>L — Link.</strong> Your final sentence returns the reader to the essay's thesis. It makes explicit how this paragraph's argument contributes to your overall case. Without the link, paragraphs feel like isolated observations. With it, they build a cumulative argument.</p>

    <p>A common mistake is confusing length with depth. A long paragraph full of quotes and summaries is not necessarily a good paragraph. A 150-word PEEL paragraph with a clear point, precisely chosen evidence, genuine analytical explanation, and a strong link can be more powerful than a 500-word list of sources.</p>

    <p>Read the model PEEL paragraph below and identify each element before you attempt the writing task.</p>

    <div style="background:#f8fafc; border:1px solid var(--border); border-radius:10px; padding:20px; margin:16px 0;">
      <div style="font-family:'DM Mono',monospace; font-size:10px; color:var(--muted); text-transform:uppercase; letter-spacing:1px; margin-bottom:12px;">Model PEEL Paragraph — Annotated</div>
      <p style="margin-bottom:8px;"><span style="background:#fef3c7; padding:2px 6px; border-radius:4px; font-size:12px; font-weight:700; color:#b45309;">POINT</span> <em>Inclusive education in South African schools is undermined not by a lack of policy but by a failure of resourcing that reflects deeper structural inequalities.</em></p>
      <p style="margin-bottom:8px;"><span style="background:#dcfce7; padding:2px 6px; border-radius:4px; font-size:12px; font-weight:700; color:#15803d;">EVIDENCE</span> <em>The HSRC (2022) found that 67% of schools identified as inclusive had no trained learning support educators, and over 80% lacked the physical infrastructure — ramps, accessible toilets, appropriate seating — required for meaningful inclusion of learners with physical disabilities.</em></p>
      <p style="margin-bottom:8px;"><span style="background:#dbeafe; padding:2px 6px; border-radius:4px; font-size:12px; font-weight:700; color:#1d4ed8;">EXPLANATION</span> <em>These figures reveal that inclusion has been legislated without the resources to make it real — a pattern that Sayed and Motala (2012) describe as "policy without implementation capacity," in which progressive commitments become sources of inequality rather than remedies for it.</em></p>
      <p style="margin:0;"><span style="background:#fce7f3; padding:2px 6px; border-radius:4px; font-size:12px; font-weight:700; color:#9d174d;">LINK</span> <em>This tension between policy aspiration and structural reality is central to the argument of this essay: that transforming inclusive education in South Africa requires not new legislation but the political will to resource existing commitments.</em></p>
    </div>
  `,
  visual: null,
  questions: [
    'In the model paragraph, the Explanation does more than repeat the evidence — it introduces a second source to interpret the first. Why is this a more sophisticated analytical move than simply saying "this shows that..."?',
    'Write the Point sentence (topic sentence) for a paragraph arguing ONE of the following: (a) Mother-tongue instruction improves literacy in Foundation Phase; (b) Teachers need AI literacy training as part of initial teacher education; (c) Standardised testing disadvantages learners from rural schools. Choose ONE and write a strong, arguable, specific topic sentence.',
    'The text says the Link sentence "makes explicit how this paragraph\'s argument contributes to your overall case." Why is it not enough to simply stop after the Explanation? What does the Link accomplish that the Explanation cannot?',
  ],
  writingPrompt: `Write ONE complete PEEL paragraph (200–250 words) on this question:

"To what extent does access to technology determine the quality of learning in South African schools?"

Your paragraph must:
• Begin with a clear, arguable Point sentence (not a question, not a description — a claim)
• Include Evidence from at least one source — either one you have found in this module, or one you locate yourself. Include a full in-text citation (Author, Year, p. X).
• Provide a genuine Explanation — what does this evidence mean for your argument? Why does it matter?
• End with a Link that connects this paragraph back to the question above

After submitting, your AI tutor will give you specific feedback on each of the four PEEL elements.`,
};

export const unit12 = {
  id: 'u12', badge: 'Unit 12', title: 'Academic Writing: Argument & Structure',
  phase: 'Phase 3 — Academic Communication',
  html: () => `
    <h1>Unit 12: Academic Writing — Argument & Structure</h1>
    <p class="lead">Academic writing is not about impressing people with complex vocabulary or long sentences. It is about making a clear, well-supported argument — one paragraph, one claim, one piece of evidence, one analytical move at a time. This unit gives you the architecture.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Construct a PEEL paragraph with a clear point, specific evidence, genuine explanation, and strong link</li>
        <li>Distinguish between descriptive and analytical writing — and move deliberately from one to the other</li>
        <li>Write a thesis statement that makes a specific, arguable claim</li>
        <li>Submit a full PEEL paragraph for detailed AI feedback on all four elements</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>This Scribbr tutorial on academic essay writing covers the big picture: thesis statements, paragraph structure, and the difference between description and argument. Watch it as preparation for the PEEL deep-dive in the reading activity below.</p>
    <div id="ivp-unit12" data-video-key="unit12" class="ivp-container"></div>

    ${quiz('q12a',
      'Which of these is the strongest topic sentence for a paragraph in an essay about AI in education?',
      [
        'This paragraph will discuss AI in South African classrooms.',
        'AI is a very interesting topic in education today.',
        'The uncritical adoption of AI tools in underfunded South African schools risks amplifying existing inequalities rather than reducing them.',
        'Many researchers have studied AI in education and found different things.',
      ],
      2,
      '✅ A strong topic sentence makes a specific, arguable claim — one that requires evidence and analysis to support, and that a reasonable person could disagree with. Options A and B state topics without making claims. Option D is too vague. Option C makes a precise, contestable argument that tells the reader exactly what the paragraph will prove.'
    )}

    ${quiz('q12b',
      'A student writes: "Vygotsky (1978) said that learning is social. This is important for education." What is missing from this as an analytical explanation?',
      [
        'A page number in the citation',
        'Any analysis of WHAT it means for education, WHY it matters, or HOW it supports the essay\'s argument — the student has presented evidence and told us it is "important" without explaining what it means or why',
        'A second source to support Vygotsky',
        'Nothing — this is a valid analytical explanation',
      ],
      1,
      '✅ "This is important" is not explanation — it is an assertion that explanation is needed. Analytical explanation must say specifically: important for what? In what way? For which learners? Under what conditions? An analytical sentence might read: "Vygotsky\'s argument that cognition originates in social interaction (1978) reframes classroom talk not as a distraction from learning but as its primary vehicle — with direct implications for inclusive classroom design."'
    )}

    <h2>Reading & Writing Activity</h2>
    <p>The reading this week includes a fully annotated model PEEL paragraph, which you will analyse before writing your own. This is deliberate — seeing what a strong paragraph looks like in practice is one of the most effective ways to learn to write one.</p>
    ${readingTask('rt-u12', RT_U12)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"An academic essay is not a collection of interesting ideas. It is a sustained argument — a case built paragraph by paragraph, each one doing its job, each one pointing toward the same destination. PEEL is the engineering that makes that possible."</p>
    </div>
  `,
};
