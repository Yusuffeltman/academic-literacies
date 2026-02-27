// content/units/unit16.js — Prompt Engineering for Academic Work
// Phase 4 — AI as a Scholarly Tool

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';

import { promptSandbox } from '../../src/components/prompt-sandbox.js';

const RT_U16 = {
  id: 'rt-u16', unitId: 'u16', unitNum: 16,
  title: 'The Academic Prompt — Why "Tell Me About X" Always Fails',
  level: 'Academic Transition Level 1', wordTarget: 220,
  source: 'Adapted for Academic Literacies — synthesised from White, J. (2023). A Prompt Pattern Catalog to Enhance Prompt Engineering with ChatGPT. arXiv:2302.11382; and Mollick, E. (2023). One Useful Thing. Substack.',
  vocab: [
    { term: 'Prompt engineering', definition: 'The deliberate craft of designing instructions for an AI model to produce outputs that are specific, useful, and appropriate for your purpose. Poorly designed prompts produce generic, hallucinated, or useless outputs.', example: '"Summarise AI in education" → generic paragraph. "Summarise the three main arguments Sal Khan makes in his 2023 TED talk about AI tutors, in language appropriate for a first-year education student" → specific, bounded, usable.' },
    { term: 'CREATE framework', definition: 'A structured prompt framework: Character (role for the AI), Request (specific task), Examples (what good looks like), Adjustments (constraints), Type (output format), Extras (additional guidance). Each element sharpens the output.', example: 'C: "You are an academic writing coach." R: "Review my PEEL paragraph." E: "A strong PEEL paragraph has a contestable point, a specifically cited piece of evidence, an analytical explanation, and a link to the thesis." A: "Focus on the Explanation element only." T: "Give feedback as 3 bullet points." E: "Be direct — no praise padding."' },
    { term: 'Hallucination', definition: 'A confident, plausible-sounding AI output that is factually wrong — an invented citation, a fabricated statistic, a non-existent researcher. Hallucinations look exactly like accurate outputs. You cannot detect them without verification.', example: 'An AI asked "What does Vygotsky say about literacy?" may produce a coherent-sounding quote that Vygotsky never wrote. The quote will have the right vocabulary and style. It will be fabricated.' },
    { term: 'Chain-of-thought prompting', definition: 'A technique that asks the AI to show its reasoning step by step before giving a conclusion — improving accuracy on complex tasks by forcing explicit intermediate reasoning.', example: '"Before answering, think through this step by step: What is the claim? What evidence exists for and against it? What are the key uncertainties? Then give your verdict."' },
  ],
  text: `
    <h3>The Academic Prompt — Why "Tell Me About X" Always Fails</h3>

    <p>Every student who uses an AI tool for academic work has had this experience: they type a broad question, receive a fluent, confident-sounding paragraph, submit it or use it as a starting point — and later discover it contains an invented citation, a subtly wrong fact, or an argument that sounds plausible but doesn't hold up to scrutiny. The problem is almost never the AI tool. The problem is the prompt.</p>

    <p>A broad prompt produces a broad response. "Tell me about inclusive education in South Africa" will generate something that sounds authoritative and covers many topics, but will be generic, may hallucinate specific statistics, and will tell you nothing that is specifically useful for your essay question. The AI is pattern-matching to produce what looks like an answer to a broad question. It has no way of knowing what specific aspect is relevant to your argument, what level of detail you need, or what sources it should and should not use.</p>

    <p>Effective AI prompting for academic work requires the same analytical precision that effective academic writing requires: specificity, purpose, and awareness of your own role. The <strong>CREATE framework</strong> structures a prompt around six elements — Character, Request, Examples, Adjustments, Type, and Extras — each of which reduces ambiguity and sharpens the output.</p>

    <p>The most important element is often the least used: <strong>Examples</strong>. Showing the AI what a good output looks like is vastly more effective than describing it. If you want feedback on your PEEL paragraph, include an example of a strong PEEL paragraph in your prompt — the AI now has a concrete reference point rather than an abstract description.</p>

    <p>Equally important is understanding what AI cannot do in academic contexts. It cannot give you accurate citations without verification — always check every reference against the actual source. It cannot know your specific assignment question, your lecturer's particular expectations, or the specific theoretical framework your course uses. It cannot replace the analytical work that comes from genuinely engaging with difficult texts. It is a thinking partner that is both powerful and unreliable — and knowing which is which is the core skill of academic AI literacy.</p>
  `,
  questions: [
    'The text says "the problem is almost never the AI tool — the problem is the prompt." Explain what this means. What does a poorly designed prompt cause the AI to do, and why?',
    'The CREATE framework has six elements. Which element does the text say is "most important" and "least used"? Explain why showing an example is more effective than describing what you want.',
    'What are two things the text says AI genuinely cannot do for you in academic work — and why can it not do them, regardless of how well you prompt it?',
  ],
  writingPrompt: `Design a CREATE-framework prompt for ONE of the following academic tasks. Write out all six elements explicitly — Character, Request, Examples, Adjustments, Type, Extras.

Choose one:
(a) Getting feedback on your PEEL paragraph from Unit 12
(b) Getting help identifying the main argument in a journal article abstract
(c) Getting a plain-language explanation of a complex theoretical concept for your subject area

Then write one paragraph (100–130 words) reflecting: What would a vague prompt for this same task look like? What would it produce that your CREATE prompt avoids? What would you still need to verify or check even with a well-designed prompt?`,
};

export const unit16 = {
  id: 'u16', badge: 'Unit 16', title: 'Prompt Engineering for Academic Work',
  phase: 'Phase 4 — AI as a Scholarly Tool',
  html: () => `
    <h1>Unit 16: Prompt Engineering for Academic Work</h1>
    <p class="lead">AI tools are only as useful as the instructions you give them. This unit teaches you how to design prompts that produce specific, verifiable, academically useful outputs — and what to do when AI gets it wrong, which it will.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Explain why vague prompts produce generic, unreliable AI outputs</li>
        <li>Apply the CREATE framework to design structured academic prompts</li>
        <li>Use chain-of-thought prompting for complex analytical tasks</li>
        <li>Identify three things AI cannot do for you academically — regardless of prompt quality</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>Google's introduction to prompt engineering covers the fundamentals: why specificity matters, how role-setting changes outputs, and why examples outperform descriptions. It's designed for developers but the principles apply directly to academic use. Watch specifically for the section on "few-shot prompting" — giving examples — which maps directly onto the CREATE framework's E element.</p>
    <div id="ivp-unit16" data-video-key="unit16" class="ivp-container"></div>

    ${quiz('q16a',
      'A student prompts an AI: "Write me a paragraph about Vygotsky for my education essay." What is the core problem with this prompt?',
      [
        'It mentions Vygotsky who is too complex for AI',
        'It gives the AI no information about which aspect of Vygotsky, which essay question, what level of detail is needed, what evidence to use, or what the paragraph should argue — the output will be generic and potentially hallucinated',
        'The student should ask for two paragraphs, not one',
        'AI cannot write about educational theorists',
      ],
      1,
      '✅ A prompt is a specification. "Write me a paragraph about Vygotsky" specifies almost nothing: not the argument, not the essay question, not which Vygotsky concept, not the required evidence, not the word count, not the format. The AI will produce something plausible and general — and may invent quotes, page numbers, or papers that do not exist.'
    )}

    ${quiz('q16b',
      'You use AI to help find sources for your essay and it suggests three academic papers with full APA citations. What should you do BEFORE including these in your reference list?',
      [
        'Nothing — AI citations are always accurate',
        'Check that each paper actually exists by searching for it in Scopus or Google Scholar, because AI tools regularly hallucinate plausible-looking but non-existent citations',
        'Ask the AI to double-check its own citations',
        'Only use the citations if they look like real journal names',
      ],
      1,
      '✅ Citation hallucination is one of the most consistent and dangerous AI behaviours in academic contexts. An AI will generate a citation in perfect APA format, with a real-sounding author, journal, volume, and page numbers — for a paper that does not exist. Always verify every AI-generated citation against an actual academic database before using it.'
    )}

    <h2>Interactive Sandbox: Fix the Prompt</h2>
    <p>Below is a "bad" prompt. It is too vague and will likely result in a generic, unhelpful answer. Try running it first to see what happens. Then, rewrite the prompt using the <strong>CREATE framework</strong> (Character, Request, Examples, Adjustments, Type, Extras) to get a much better, academic result.</p>

    ${promptSandbox(
      'sb-u16-1',
      'Prompt Refinement Exercise',
      'Rewrite the initial prompt to give the AI context, constraints, and clear criteria.',
      'Help me study Vygotsky for my test tomorrow.'
    )}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u16', RT_U16)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"Using AI well in academic work requires the same skill as using any other tool well: knowing what it can do, knowing what it cannot, and never confusing a fluent output for an accurate one. Fluency is not truth."</p>
    </div>
  `,
};
