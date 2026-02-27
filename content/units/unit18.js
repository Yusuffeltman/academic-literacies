// content/units/unit18.js — Academic Integrity in the Age of AI
// Phase 4 — AI as a Scholarly Tool

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';

const RT_U18 = {
  id: 'rt-u18', unitId: 'u18', unitNum: 18,
  title: 'Academic Integrity Is Not a Rule — It Is a Practice',
  level: 'Academic Transition Level 3', wordTarget: 220,
  source: 'Adapted for Academic Literacies — drawing on Bretag, T. (Ed.) (2016). Handbook of Academic Integrity. Springer; and Perkins, M. (2023). Academic Integrity considerations of AI Large Language Models. Journal of University Teaching & Learning Practice, 20(2).',
  vocab: [
    { term: 'Academic integrity', definition: 'The commitment to honesty, fairness, trust, respect, and responsibility in all academic work — including properly attributing ideas, submitting your own work, and being transparent about the assistance you have used.', example: 'Academic integrity is not just about avoiding plagiarism. It includes disclosing AI assistance, citing paraphrased ideas, not submitting work done for one course to another, and not misrepresenting your methodology.' },
    { term: 'AI-assisted writing', definition: 'Writing in which an AI tool contributed to the content, structure, or language — in ways that range from using AI to generate a first draft (likely a breach of most policies) to using AI to check grammar (generally acceptable).', example: 'Using AI to generate your PEEL paragraph and submitting it as your own work is academic misconduct. Using AI to give feedback on your draft and then revising it yourself is generally acceptable — but check your institution\'s specific policy.' },
    { term: 'Contract cheating', definition: 'Submitting work produced by another person or entity (including AI) as your own — the most serious form of academic misconduct because it represents a fundamental deception about authorship.', example: 'Paying a writing service to produce your assignment is contract cheating. Having AI write your assignment and submitting it as your work is also a form of contract cheating under most current policies.' },
    { term: 'Disclosure norm', definition: 'An emerging academic convention that authors should declare when and how AI tools were used in producing a piece of work — following the same logic as disclosing other assistance, software, or funding sources.', example: 'Some academic journals now require authors to declare AI use: "AI tools were used to check grammar and suggest sentence restructuring. No AI-generated text appears in the final manuscript."' },
  ],
  text: `
    <h3>Academic Integrity Is Not a Rule — It Is a Practice</h3>

    <p>Academic integrity is taught as a list of prohibitions: don't plagiarise, don't cheat, don't fabricate data. This framing misses what integrity actually is. Integrity is not the absence of bad behaviour — it is the presence of honest practice. The question is not "did I break a rule?" but "does this work honestly represent my thinking, my effort, and my engagement with the ideas of others?"</p>

    <p>AI tools have made this question more complex but not fundamentally different. The core ethical question — is this work an honest representation of my own intellectual engagement? — remains the same. What has changed is the range of ways the answer can be no.</p>

    <p>Most South African universities are currently developing AI use policies, and these policies differ significantly. Some prohibit all AI use. Some require disclosure of AI assistance. Some treat AI like other tools (calculators, grammar checkers) and permit it for specific purposes. Not knowing your institution's policy is not a defence — it is a responsibility. Find the policy. Read it carefully. If it is ambiguous about a specific use, ask your lecturer before submitting, not after.</p>

    <p>Beyond institutional policy, there is a more important question: what are you actually here to learn? Every assignment you outsource to AI is a task you have not practised. Reading ability, analytical writing, source evaluation, argument construction — these are not performances you produce for assessment. They are capacities you build through the struggle of actually doing them. An essay written by AI proves nothing about what you can do and teaches you nothing. It is the educational equivalent of having someone else do your gym sessions for you and claiming you are fit.</p>

    <p>A personal AI ethics policy — not your institution's policy, but your own — is a statement of how you will use these tools in alignment with your own educational goals. What will you use AI for? What will you not? What principles guide the line between them? Writing this down forces clarity. It transforms a passive policy compliance problem into an active decision about your own learning.</p>
  `,
  questions: [
    'The text says "integrity is not the absence of bad behaviour — it is the presence of honest practice." What is the practical difference between these two framings? How would your behaviour change depending on which framing you used?',
    'The text compares using AI to do your assignments to "having someone else do your gym sessions for you." Evaluate this analogy. Where does it hold? Where does it break down? Is it a fair comparison?',
    'You use AI to help structure your essay plan, then write every sentence yourself, then use AI to check your grammar. Which of these three uses is most likely to be acceptable under most institutional policies — and why do you think so?',
  ],
  writingPrompt: `Write your Personal AI Ethics Policy — 250–300 words.

This is not a summary of your institution's policy. It is YOUR policy, grounded in your own principles about learning and honesty.

It must address:
1. What you WILL use AI for — with a specific reason (what does this use support in your learning?)
2. What you will NOT use AI for — with a specific reason (what would this use undermine?)
3. One principle that guides where you draw the line — phrased as a test you can apply to any new AI use situation
4. How you will handle AI use transparency: will you disclose it? When? To whom?

Be honest. This is not being assessed for having the "right" position — it is being assessed for genuine, reasoned self-reflection.`,
};

export const unit18 = {
  id: 'u18', badge: 'Unit 18', title: 'Academic Integrity in the Age of AI',
  phase: 'Phase 4 — AI as a Scholarly Tool',
  html: () => `
    <h1>Unit 18: Academic Integrity in the Age of AI</h1>
    <p class="lead">AI has not changed what academic integrity means — it has multiplied the ways it can be compromised and made the ethical questions harder to dodge. This unit asks you to move beyond rule-following to genuine reflection on what honest academic work looks like in your specific context.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Distinguish between permitted, disclosed, and prohibited AI use in academic contexts</li>
        <li>Apply the principle "does this honestly represent my intellectual engagement?" to any AI use scenario</li>
        <li>Locate and interpret your institution's AI policy — and identify where it is ambiguous</li>
        <li>Write a Personal AI Ethics Policy that reflects your own principles, not just institutional rules</li>
      </ul>
    </div>

    <div class="section-label">📖 Before You Read</div>
    <p>This unit has no video. Instead, before the reading activity, spend 3 minutes responding to this question in writing: <em>"If your lecturer could see every interaction you had with AI while completing your last assignment, would you be comfortable? Why or why not?"</em> Write honestly — this is for you, not for submission.</p>

    ${quiz('q18a',
      'A student uses AI to generate a first draft of their literature review, then reads and edits it, adding their own citations and changing several sentences. Is this acceptable academic practice?',
      [
        'Yes — they edited it, so it counts as their own work',
        'It depends on the institution\'s AI policy — but under most current policies, using AI to generate the substantive content of an assessed piece of work (even if edited) is either prohibited or requires explicit disclosure, and in many cases constitutes academic misconduct',
        'Yes — all that matters is the final product',
        'No — students should never use AI tools at all',
      ],
      1,
      '✅ The key issue is whether the work honestly represents the student\'s own intellectual engagement with the task. Generating a draft and editing it means the structure, argument, and many ideas originated with the AI, not the student. Most current policies treat this as academic misconduct or require specific disclosure. The only safe approach: check your institution\'s policy and disclose AI use when in doubt.'
    )}

    ${quiz('q18b',
      'Your university\'s AI policy says: "Students may use AI tools for research support but must not submit AI-generated text as their own work." You use AI to explain a difficult concept to you in simple terms, then write your own explanation in your essay. Is this permitted?',
      [
        'No — you cannot use AI at all under this policy',
        'Most likely yes — using AI to help you understand a concept (like using a tutor or dictionary) and then writing your own explanation is research support, not submitting AI-generated text. But confirm this interpretation with your lecturer if uncertain.',
        'No — you must understand everything without AI',
        'Yes — and you do not need to disclose this use',
      ],
      1,
      '✅ Using AI as a comprehension tool — to explain, clarify, or simplify — is analogous to using a tutor, a dictionary, or a YouTube explainer. Writing your own sentences after that understanding is your work. However, "most likely permitted" is not the same as "definitely permitted" — institutional policies vary, and when in doubt, ask before submitting. Some policies also require disclosure of AI use even when permitted.'
    )}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u18', RT_U18)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"Academic integrity is not about what you can get away with. It is about who you are becoming as a scholar. Every time you do the hard analytical work yourself — even imperfectly — you become a little more capable. Every time you outsource it, you remain exactly where you were."</p>
    </div>
  `,
};
