// content/units/unit15.js — Peer Review & Academic Feedback
// Phase 3 | Academic Entry Level 6

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
import { visualTask }  from '../../src/components/visual-task.js';

const RT_U15 = {
  id: 'rt-u15', unitId: 'u15', unitNum: 15,
  title: 'The Art of Useful Feedback — Why Vague Praise Fails Everyone',
  level: 'Academic Entry Level 6', wordTarget: 200,
  source: 'Adapted for Academic Literacies — drawing on Nicol, D. & Macfarlane-Dick, D. (2006). Formative assessment and self-regulated learning. Studies in Higher Education, 31(2), 199–218; and Hattie, J. & Timperley, H. (2007). The power of feedback. Review of Educational Research, 77(1), 81–112.',
  vocab: [
    { term: 'Peer review', definition: 'A structured process in which a fellow student reads, evaluates, and provides specific written feedback on another student\'s academic work — using agreed criteria. The reviewer does not mark but identifies strengths and gaps.', example: 'A peer reviewer might write: "Your PEEL paragraph has a strong point sentence and good evidence, but the explanation does not connect the evidence to your thesis — you need to add a \'this means that...\' sentence."' },
    { term: 'Criterion-referenced feedback', definition: 'Feedback that refers to specific, pre-agreed criteria for quality — rather than general impressions. It tells the writer exactly which criterion is met, which is not, and what would constitute improvement.', example: 'Criterion: "Evidence must be cited using APA 7th." Criterion-referenced feedback: "Your evidence is relevant but the in-text citation format is incorrect — you need (Author, Year) not Author: Year." Vague feedback: "Your citation needs fixing."' },
    { term: 'Feedforward', definition: 'Feedback oriented toward future improvement rather than past performance — focused on what to do differently next time, not just what went wrong.', example: '"For your next draft, focus specifically on the Explanation step of PEEL — that is where most of the marks are lost. Before you write the explanation, ask yourself: what does this evidence actually prove, and why does it matter for this specific argument?"' },
    { term: 'Constructive critique', definition: 'Feedback that identifies a specific weakness and explains what a stronger version would look like or involve — as distinct from criticism, which identifies a weakness without indicating a path to improvement.', example: 'Criticism: "Your introduction is weak." Constructive critique: "Your introduction describes your topic but does not yet make a claim — add a thesis statement in the final sentence of the introduction that tells the reader what argument you will make."' },
  ],
  text: `
    <h3>The Art of Useful Feedback — Why Vague Praise Fails Everyone</h3>

    <p>The most common peer review comment written by first-year students is some version of "Good job! Your essay was very interesting and well-written." This comment is kind. It is also useless.</p>

    <p>Research by John Hattie and Helen Timperley (2007) — in one of the most-cited papers in education research — found that feedback is only effective when it addresses three things: <em>Where am I going?</em> (the goal), <em>How am I going?</em> (progress toward that goal), and <em>Where to next?</em> (what specifically to do to improve). Generic positive comments address none of these three questions. They leave the writer exactly where they started, plus a warm feeling that may actually reduce their motivation to revise.</p>

    <p>Effective peer feedback is hard to write because it requires that you genuinely engage with another person's work — reading it carefully enough to identify where the specific gap is, understanding the criteria well enough to know what a better version would look like, and caring enough about your colleague's growth to say something honest and useful rather than safe and vague.</p>

    <p>The protocol for a useful peer review has four components:</p>
    <p><strong>1. Engage with the criteria.</strong> Before reading the work, re-read the assessment criteria. Your review should be referenced to the criteria, not to your personal preferences.</p>
    <p><strong>2. Name what works — specifically.</strong> "Your topic sentence in paragraph two makes a precise, contestable argument" is useful. "Good topic sentence!" is not. The specificity matters because the writer needs to know what to do more of.</p>
    <p><strong>3. Identify the single most important gap.</strong> Do not list everything that could be improved — prioritise the one thing that, if addressed, would most improve the work.</p>
    <p><strong>4. Describe what improvement would look like.</strong> Do not just say "this section needs more analysis." Say what analytical move is missing and what it would contain if it were present.</p>

    <p>Peer review is also a powerful learning activity for the reviewer. Research consistently shows that students who give careful peer feedback improve their own writing — because evaluating someone else's work against a rubric makes the criteria concrete and visible in a way that only reading the rubric does not.</p>
  `,
  visual: `
    <div class="rt-infographic">
      <div class="rt-infographic-title">Vague vs. Useful Feedback — A Comparison</div>
      <div style="overflow-x:auto;">
        <table style="width:100%; border-collapse:collapse; font-size:13px;">
          <thead>
            <tr>
              <th style="background:var(--navy); color:#fff; padding:10px 14px; text-align:left;">Criterion</th>
              <th style="background:#ef4444; color:#fff; padding:10px 14px; text-align:left;">❌ Vague / Useless</th>
              <th style="background:#15803d; color:#fff; padding:10px 14px; text-align:left;">✅ Specific / Useful</th>
            </tr>
          </thead>
          <tbody>
            ${[
              ['Argument', '"Good points! Your argument was clear."', '"Your thesis statement argues a position, but paragraph 3\'s topic sentence makes a different claim than paragraph 2\'s — they don\'t accumulate toward the same conclusion."'],
              ['Evidence', '"You used lots of sources, well done."', '"You have 4 sources in this paragraph but only cite 2 in-text — the other two claims are unsupported. Which sources back up sentences 3 and 5?"'],
              ['Analysis', '"Your analysis could be deeper."', '"After your evidence sentence, you explain what the data shows — but not why it matters for YOUR argument. Add a sentence starting \'This suggests that...\' that connects it explicitly to your thesis."'],
              ['Structure', '"The structure needs work."', '"Your introduction has context and background but no thesis statement. Add a final sentence to the introduction that tells the reader what claim the essay will argue."'],
              ['Language', '"Your writing is a bit informal sometimes."', '"Three sentences use contractions (\'don\'t\', \'it\'s\', \'can\'t\') — in formal academic writing, write \'do not\', \'it is\', \'cannot\'. Check the full draft for other contractions."'],
            ].map(([crit, bad, good], i) => `
              <tr style="background:${i % 2 === 0 ? '#fff' : 'var(--cream)'};">
                <td style="padding:10px 14px; font-weight:700; color:var(--navy); border:1px solid var(--border); vertical-align:top;">${crit}</td>
                <td style="padding:10px 14px; color:#b91c1c; border:1px solid var(--border); font-style:italic; vertical-align:top;">"${bad}"</td>
                <td style="padding:10px 14px; color:#166534; border:1px solid var(--border); vertical-align:top;">"${good}"</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `,
  questions: [
    'The text cites research showing that "vague positive comments leave the writer exactly where they started, plus a warm feeling that may actually reduce their motivation to revise." Explain why a warm feeling might reduce motivation to revise — what psychological dynamic is at work here?',
    'The text says peer review is "also a powerful learning activity for the reviewer." Why does evaluating someone else\'s work against a rubric improve your own writing in ways that just reading the rubric does not?',
    'Using the comparison table from the infographic as your model, take this vague comment and rewrite it as a specific, useful piece of criterion-referenced feedback: "Your introduction could be better. You need to make your argument clearer from the start."',
  ],
  writingPrompt: `Below is a student paragraph. Apply the peer review protocol from this unit to write a 200–250 word structured peer review.

STUDENT PARAGRAPH:
"Technology has changed education. Many schools now have computers and tablets. Research shows that technology improves learning. Students who use technology do better in school. This is why teachers should use more technology in their lessons. Digital tools are important for the future. South Africa should invest more in educational technology."

Your peer review must:
• Identify one specific thing that works — with a reason (not just "this is good")
• Identify the single most important structural problem — using PEEL criteria: is the Point arguable? Is there specific Evidence with a citation? Is there genuine Explanation? Is there a Link?
• Describe specifically what an improved version of the weakest element would include
• End with one feedforward sentence: what should the writer focus on in their next draft?`,
};

const VT_U15 = {
  id: 'vt-u15', unitId: 'u15',
  title: 'Anatomy of a Peer Review — What Makes Feedback Work',
  chartType: 'annotated peer review extract',
  visualDescription: 'A 250-word peer review extract with colour-coded annotations showing where specific criteria are addressed, where feedback is criterion-referenced vs vague, and where feedforward is present',
  source: 'Academic Literacies module — synthesised from Nicol & Macfarlane-Dick (2006) and Hattie & Timperley (2007) feedback frameworks.',
  observePrompt: 'Read the annotated peer review carefully. Before answering the analyse questions, identify: which comments are colour-coded green (specific and useful), which are amber (partially useful), and which are red (vague or unhelpful).',
  observeChecklist: [
    'How many comments are specific and criterion-referenced (green)',
    'How many comments are vague or unhelpful (red)',
    'Whether the review identifies the single most important gap or lists many small issues',
    'Whether any feedforward is present (what to do next time)',
    'Whether the reviewer names the specific criterion they are addressing',
  ],
  analysePrompt: 'Now evaluate: what makes the green comments more useful than the red ones? What is the structural difference between them?',
  analyseQuestions: [
    'What is the structural difference between a comment that says "your evidence is good" and one that says "your evidence in paragraph 2 (Heugh, 2015) directly supports your point, and the citation format is correct"?',
    'The review says "your analysis needs to be deeper." Using the unit\'s framework, rewrite this as a criterion-referenced, feedforward comment.',
    'If you were the student receiving this peer review, which comment would most change how you revise your work — and why?',
  ],
  modelAnswer: `The structural difference between useful and useless feedback is specificity of reference. A vague comment like "your evidence is good" tells the writer nothing they can act on — it does not say which evidence, why it is good, or what good evidence in this context consists of. A criterion-referenced comment names the specific element, locates it in the text, evaluates it against a criterion, and either confirms it meets the standard or describes what meeting the standard would look like. The most useful peer reviews also provide feedforward — not "your introduction is weak" but "your introduction needs a thesis statement: add a final sentence to the introduction that tells the reader the specific claim your essay will argue." Feedforward is a gift to the writer because it converts feedback from a judgement into an instruction.`,
};

export const unit15 = {
  id: 'u15', badge: 'Unit 15', title: 'Peer Review & Academic Feedback',
  phase: 'Phase 3 — Academic Communication',
  html: () => `
    <h1>Unit 15: Peer Review & Academic Feedback</h1>
    <p class="lead">Giving and receiving feedback is one of the most important academic skills you will develop — and one of the most poorly taught. This unit teaches you what makes feedback genuinely useful, how to write a criterion-referenced peer review, and how to use feedback to revise rather than just to feel judged.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Distinguish between vague, unhelpful feedback and specific, criterion-referenced feedback</li>
        <li>Apply a four-part peer review protocol to any piece of academic writing</li>
        <li>Write a 250-word structured peer review that a writer can immediately act on</li>
        <li>Use feedback received to make deliberate, targeted revisions rather than cosmetic changes</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>This Crash Course video on academic writing covers a crucial point often missed by students: feedback is not about making someone feel good or bad — it is about helping them close the gap between where their work is and where it needs to be. Watch for the distinction between descriptive and evaluative feedback, and for what they call the "feedback sandwich" and why it often fails.</p>
    <div id="ivp-unit15" data-video-key="unit15" class="ivp-container"></div>

    ${quiz('q15a',
      'A peer reviewer writes: "Your essay is really interesting! I liked how you talked about AI. Maybe add more examples?" What is the fundamental problem with this feedback?',
      [
        'It is too short',
        'It does not reference any specific criterion, does not locate the issue in the text, does not say what "more examples" would accomplish, and gives no feedforward — it cannot be acted on in any specific way',
        'It is too positive',
        'It should be written more formally',
      ],
      1,
      '✅ "Add more examples" is almost never useful feedback because it does not say: more examples of what, placed where, to support which argument, cited how? Useful feedback is always actionable — it tells the writer the specific move to make and why that move would improve the work against the criteria.'
    )}

    ${quiz('q15b',
      'Hattie and Timperley found that feedback is only effective when it addresses three questions. Which response BEST represents the "Where to next?" question?',
      [
        '"Your thesis statement is well-constructed."',
        '"Your evidence section is incomplete."',
        '"For your revision, focus specifically on paragraph 3 — the explanation sentence is missing. Add one sentence after your evidence that begins: \'This finding suggests that...\' and connects the data to your thesis."',
        '"Overall this is a good attempt."',
      ],
      2,
      '✅ "Where to next?" is the feedforward question — it tells the writer what specific action to take to improve the work. It names a location (paragraph 3), a specific element (explanation sentence), and even provides a stem to start the revision with. This is the hardest part of feedback to write well, and the most valuable.'
    )}

    <h2>Visual Literacy Task</h2>
    ${visualTask(VT_U15)}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u15', RT_U15)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"Feedback that makes someone feel good is a gift to the giver. Feedback that makes someone's work better is a gift to the receiver. Good peer review is the second kind — and it takes more courage and skill."</p>
    </div>
  `,
};
