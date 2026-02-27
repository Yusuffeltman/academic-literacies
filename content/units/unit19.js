// content/units/unit19.js — The Literature Review: Synthesis in Practice
// Phase 5 — The Future Scholar

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';

const RT_U19 = {
  id: 'rt-u19', unitId: 'u19', unitNum: 19,
  title: 'Writing the Literature Review — From Matrix to Paragraph',
  level: 'Academic Mastery Level 1', wordTarget: 280,
  source: 'Adapted for Academic Literacies — drawing on Ridley, D. (2012). The Literature Review: A Step-by-Step Guide for Students. SAGE; and Boote, D. & Beile, P. (2005). Scholars before researchers. Educational Researcher, 34(6), 3–15.',
  vocab: [
    { term: 'Thematic paragraph', definition: 'A literature review paragraph organised around a theme or argument — not around a source. All sources in the paragraph contribute to the same theme, which is stated in the topic sentence.', example: 'Theme-topic sentence: "Research consistently links early language exposure to long-term literacy outcomes, though the mechanism through which this occurs remains debated." Then 3–4 sources are synthesised around this theme, not summarised separately.' },
    { term: 'Integrative synthesis', definition: 'Writing that weaves multiple sources into a single flowing argument — using sources as evidence for the paragraph\'s claim rather than as separate items to be described in turn.', example: 'Integrative: "The field broadly agrees that classroom talk supports learning (Mercer, 2000; Wells, 1999), though Alexander (2017) argues that the quality of dialogue — not its quantity — is the operative variable." Compare: "Mercer (2000) says... Wells (1999) says... Alexander (2017) says..."' },
    { term: 'Scholarly positioning', definition: 'Establishing your own analytical position in relation to the literature — not just describing what others say, but indicating where you agree, where you disagree, and where your own argument is located.', example: '"While Smith (2020) and Jones (2021) both find evidence for X, neither addresses the specific context of under-resourced rural schools — the gap this essay seeks to address."' },
    { term: 'Gap statement', definition: 'A sentence or passage in a literature review that identifies what the existing research does not yet explain, address, or adequately account for — establishing the rationale for your own research question or argument.', example: '"Despite extensive research on inclusive education policy in South Africa, few studies examine implementation at school level in contexts where schools lack trained learning support educators — the gap this study addresses."' },
  ],
  text: `
    <h3>Writing the Literature Review — From Matrix to Paragraph</h3>

    <p>Everything in this module has been building toward this skill: the ability to move from a field of sources to a coherent, integrated, argument-driven literature review. The synthesis matrix (Unit 17) gave you the structure. The PEEL framework (Unit 12) gave you the paragraph architecture. The hedging and register skills (Unit 13) gave you the academic voice. Now these components converge.</p>

    <p>A literature review paragraph has a different logic from a standard PEEL paragraph, though it shares the same skeleton. The Point is a thematic claim about what the literature shows. The Evidence is drawn from multiple sources, woven together rather than separated. The Explanation analyses the significance of the pattern across sources, not just within one. The Link connects the theme to your research question or essay argument.</p>

    <p>The hardest move to learn is integrative synthesis — weaving sources together rather than describing them separately. Compare these two versions of the same content:</p>

    <p><strong>Source-by-source (weak):</strong> "Smith (2020) found that play-based learning improved numeracy outcomes. Jones (2021) also found positive effects of play. Patel (2022) studied play in Foundation Phase classrooms and found similar results."</p>

    <p><strong>Integrated synthesis (strong):</strong> "A convergent body of evidence supports play-based approaches in Foundation Phase numeracy (Smith, 2020; Jones, 2021; Patel, 2022), though these studies differ in their theoretical accounts of why play produces these outcomes — Smith grounds her explanation in Piagetian developmental theory, while Jones and Patel draw on Vygotskian sociocultural frameworks."</p>

    <p>The second version does four things the first cannot: it establishes a pattern across sources, acknowledges agreement and tension simultaneously, names the theoretical divergence that explains an apparent contradiction, and advances understanding rather than merely reporting it.</p>

    <p>Scholarly positioning — establishing your own analytical perspective in relation to the literature — is the final, highest-order skill in literature review writing. It moves from "here is what researchers say" to "here is where the field has not yet gone, and here is where my argument is located." It is the move from student to scholar.</p>
  `,
  questions: [
    'The text gives two versions of the same literature review content — one source-by-source, one integrated. Analyse the specific moves the integrated version makes that the source-by-source version does not. List at least three.',
    'The text says the integrated version "advances understanding rather than merely reporting it." What is the difference between advancing understanding and reporting? What does advancing understanding require the writer to do?',
    'What is a "gap statement" and why is it important in a literature review? How does it connect the literature review to the essay\'s own research question or argument?',
  ],
  writingPrompt: `Using the three sources you found for Unit 17 (or three new ones on your chosen topic), write ONE integrated literature review paragraph of 280–350 words.

Your paragraph must:
• Open with a thematic topic sentence — NOT "researchers have studied X" but a claim about what the field has found
• Weave all three sources into the paragraph (do not write a separate sentence about each one)
• Identify at least one point of agreement AND one point of disagreement or nuance across the sources
• Include a gap statement in your final sentence — what question does the existing research leave open?
• Use appropriate hedging language (suggests, tends to, appears to)
• Include APA 7th in-text citations for all three sources

After submitting, your AI tutor will evaluate: thematic organisation, integration quality, presence of genuine synthesis (vs separate summaries), and the strength of the gap statement.`,
};

export const unit19 = {
  id: 'u19', badge: 'Unit 19', title: 'The Literature Review: Synthesis in Practice',
  phase: 'Phase 5 — The Future Scholar',
  html: () => `
    <h1>Unit 19: The Literature Review — Synthesis in Practice</h1>
    <p class="lead">This is where the module converges. Every reading skill, every writing skill, every source evaluation skill comes together in the literature review — the central genre of academic knowledge-making. This unit takes you from matrix to paragraph.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Write thematic literature review paragraphs that integrate multiple sources rather than summarising them separately</li>
        <li>Identify points of agreement, tension, and divergence across a set of sources and articulate them analytically</li>
        <li>Write a gap statement that positions your own research question within the existing literature</li>
        <li>Submit a 280–350 word integrated literature review paragraph for AI feedback</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>This Scribbr tutorial on writing a literature review walks through the full process from search to synthesis, with particular emphasis on the difference between a source-by-source structure and a thematic structure. Pay close attention to the section on "finding themes" — this is the analytical move that transforms a pile of papers into a literature review.</p>
    <div id="ivp-unit19" data-video-key="unit19" class="ivp-container"></div>

    ${quiz('q19a',
      'A literature review paragraph begins: "Vygotsky (1978) developed the Zone of Proximal Development. Bruner (1986) built on this with scaffolding. Wood et al. (1976) operationalised scaffolding in classroom studies." What is wrong with this opening?',
      [
        'Too many sources for one paragraph',
        'This is a chronological list of theorists, not a thematic claim — there is no topic sentence that tells the reader what pattern or argument these sources collectively establish',
        'The citations are in the wrong format',
        'Vygotsky should be discussed in a separate paragraph from Bruner',
      ],
      1,
      '✅ A literature review paragraph must open with a thematic claim — a statement about what the literature shows, not a list of who said what. A stronger opening: "Sociocultural theory provides the foundational framework for understanding how classroom dialogue supports learning (Vygotsky, 1978; Bruner, 1986; Wood et al., 1976), with each theorist contributing a distinct element: ZPD, scaffolding as concept, and scaffolding as measurable practice."'
    )}

    ${quiz('q19b',
      'A student writes: "There is much research on AI in education. Many studies have been done. Researchers agree this is an important topic." What critical element of a literature review is this paragraph missing?',
      [
        'More sources',
        'Any actual claim about what the research finds — every sentence describes the existence of research without saying what it shows, what patterns exist, or where researchers agree or disagree',
        'A longer introduction',
        'A definition of AI',
      ],
      1,
      '✅ "Research exists" is not a finding. "Researchers agree this is important" is not synthesis. A literature review paragraph must make specific claims about what the research shows: what patterns emerge, where consensus exists, where debate continues, what the field cannot yet explain. Describing that research exists is the lowest possible level of engagement with it.'
    )}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u19', RT_U19)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"The literature review is not the part of the essay before your argument. It IS the argument — or the beginning of it. A scholar who can synthesise a field of sources into a coherent, positioned account of what we know and don't know is already doing original intellectual work."</p>
    </div>
  `,
};
