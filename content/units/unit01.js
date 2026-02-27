// content/units/unit01.js
// ─────────────────────────────────────────────
// Unit 1: The AI-Powered World
// Phase 1 — Understanding the Landscape
// Reading Level: ACCESS (plain language, education context)
// ─────────────────────────────────────────────

import { quiz }          from '../../src/components/activities.js';
import { readingTask }   from '../../src/components/reading-task.js';

// ── Video interaction points ──────────────────
// Video: Sal Khan (TED 2023) — "How AI could save (not destroy) education"
// YouTube ID: hJP5GqnTrNo  ← verify this ID on YouTube before deploying
export const VIDEO_KEY = 'unit1';

// ── Reading task config ───────────────────────
const RT_CONFIG = {
  id:           'rt-u1',
  unitId:       'u1',
  unitNum:      1,
  title:        'The Teacher\'s New Question',
  level:        'Access Level',
  wordTarget:   70,
  source:       'Adapted for Academic Literacies — inspired by TeachThought & GroundUp Education',
  sourceUrl:    null,

  vocab: [
    {
      term:       'Artificial Intelligence (AI)',
      definition: 'Technology that can perform tasks that normally require human thinking — such as writing, translating, or answering questions.',
      example:    'ChatGPT is an AI tool that generates text based on your question.',
    },
    {
      term:       'Generative AI',
      definition: 'A type of AI that creates new content — text, images, or audio — by recognising patterns in large amounts of data it has processed.',
      example:    'When you type a prompt and AI writes a paragraph, that is generative AI.',
    },
    {
      term:       'Digital literacy',
      definition: 'The ability to use, understand, and evaluate digital technologies critically and responsibly.',
      example:    'Knowing when to trust an AI response — and when to verify it — is a digital literacy skill.',
    },
    {
      term:       'Hallucination (AI)',
      definition: 'When an AI tool produces a confident-sounding answer that is actually incorrect or made up.',
      example:    'An AI might name a book that does not exist, with full author and publication details — this is a hallucination.',
    },
  ],

  text: `
    <h3>The Teacher's New Question</h3>

    <p>Teachers across South Africa — and around the world — are asking a question that would have seemed strange just three years ago: <em>"If my learner can ask an AI to write their essay in thirty seconds, what am I actually teaching them?"</em></p>

    <p>This is not really a question about technology. It is a question about what education is <em>for</em>.</p>

    <p>Artificial intelligence tools like ChatGPT, Gemini, and Microsoft Copilot can now write paragraphs, solve problems, generate lesson plans, and summarise textbooks — in seconds. These tools are already in your learners' pockets. By the time you finish reading this, several of your future learners will have used one today.</p>

    <p>But here is what AI cannot do: it cannot think <em>for</em> you. It produces words based on patterns in text it has processed. It does not understand. It does not experience. It does not know your classroom, your community, or your context. And — crucially — it sometimes produces information that sounds completely correct but is entirely wrong.</p>

    <p>A teacher in Limpopo recently asked her Grade 9 class to use AI to research the history of their own town. The AI confidently produced a detailed, well-written account — much of which was factually incorrect. It had "hallucinated" a history that never happened. Her learners, who knew the real stories of their community, immediately spotted the errors. Without that lived knowledge, they would not have.</p>

    <p>As a future educator, your challenge is not to ban these tools or to ignore them. Your challenge is to understand them well enough to use them wisely — and to teach your learners to do the same.</p>

    <p>That is what this module is about.</p>
  `,

  visual: `
    <div class="rt-infographic">
      <div class="rt-infographic-title">AI in Education — What's True?</div>
      <div class="rt-infographic-cols">
        <div class="rt-infographic-col col-green">
          <div class="rt-infographic-col-head">✓ AI CAN</div>
          <ul>
            <li>Write and summarise text instantly</li>
            <li>Generate ideas and lesson outlines</li>
            <li>Translate between languages</li>
            <li>Give quick feedback on writing</li>
            <li>Explain concepts in simple language</li>
          </ul>
        </div>
        <div class="rt-infographic-col col-red">
          <div class="rt-infographic-col-head">✗ AI CANNOT</div>
          <ul>
            <li>Understand what it writes</li>
            <li>Know your learners or context</li>
            <li>Guarantee that information is correct</li>
            <li>Build real relationships</li>
            <li>Replace your professional judgement</li>
          </ul>
        </div>
      </div>
      <div class="rt-infographic-caption">
        Based on Luckin et al. (2022). <em>Intelligence Unleashed: An argument for AI in Education.</em> UCL Knowledge Lab & Pearson.
      </div>
    </div>
  `,

  questions: [
    'According to the text, what is the question that teachers around the world are now asking about AI? Write it in your own words — do not copy the sentence from the text.',
    'The text says there are things AI cannot do. Name two of them and explain why you think each one matters for a teacher.',
    'The story about the teacher in Limpopo teaches us something important about AI. What lesson do you take from that story? Why is lived knowledge important?',
  ],

  writingPrompt: `Write 3–4 sentences about AI and your future teaching career.
Your first sentence: One thing you learned from this reading that surprised or interested you.
Your second sentence: One concern or question you still have about AI in education.
Your third sentence: One specific way you think AI might affect your future classroom — either positively or negatively.
If you have a fourth sentence, use it to say what you think the most important skill for an AI-era teacher is.`,
};

// ── Unit definition ───────────────────────────
export const unit01 = {
  id:    'u1',
  badge: 'Unit 1',
  title: 'The AI-Powered World',
  phase: 'Phase 1 — Understanding the Landscape',

  html: () => `
    <h1>Unit 1: The AI-Powered World</h1>
    <p class="lead">Before we can use AI as a scholarly tool, we must understand what it is — and, crucially, what it is not. This unit sets the foundation for everything that follows.</p>

    <!-- Learning Outcomes -->
    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Define AI literacy and explain why it matters for educators in South Africa</li>
        <li>Identify what AI tools can and cannot do — and why the distinction matters</li>
        <li>Explain what an AI "hallucination" is and give an example</li>
        <li>Write a short personal reflection using your own voice and specific examples</li>
      </ul>
    </div>

    <!-- Video -->
    <div class="section-label">🎬 Watch First</div>
    <p>Sal Khan — founder of Khan Academy — gave this TED talk in 2023. He argues that AI does not have to destroy education; it can strengthen it. But only if educators understand how to use it wisely. Watch and think critically — do you agree with him?</p>
    <div id="ivp-unit1" data-video-key="unit1" class="ivp-container"></div>

    <!-- Video reflection -->
    ${quiz(
      'q1a',
      'Sal Khan suggests AI could act like a personal tutor for every learner. What is the biggest risk of this idea for a South African classroom context?',
      [
        'Learners will become too dependent on AI for answers',
        'Not all learners have equal access to devices and the internet',
        'AI tutors will replace teachers and reduce employment',
        'The AI will not speak all 11 official languages',
      ],
      1,
      '✅ Access inequality is one of the most important issues in South African education technology. Any AI-based tool must be evaluated against the reality that many learners do not have reliable internet or devices. This is a critical lens every South African educator needs.'
    )}

    ${quiz(
      'q1b',
      'An AI tool confidently tells you that a particular educational policy was introduced in South Africa in 2019. What should you do first?',
      [
        'Use the information — AI is usually accurate',
        'Check the date the AI model was last updated',
        'Verify the information against an official government or academic source',
        'Ask the AI to give you more details to confirm',
      ],
      2,
      '✅ Always verify AI-generated factual claims against authoritative sources. AI can produce confident-sounding information that is incorrect — this is called "hallucination". Asking the same AI for "more details" does not help — it will confidently expand on incorrect information.'
    )}

    <!-- What is AI? Explainer -->
    <h2>So What Exactly Is AI?</h2>
    <p>The AI tools you encounter today — ChatGPT, Gemini, Copilot, and others — are built on <strong>Large Language Models (LLMs)</strong>. These are trained on enormous amounts of text from the internet, books, and other sources. They learn to predict what word or phrase should come next in a sequence.</p>

    <div class="concept-card">
      <div class="concept-card-label">Analogy for your classroom</div>
      <p>Imagine a student who has read every textbook ever written — but has never had a single experience, conversation, or feeling. They can produce remarkably convincing text. But they do not <em>understand</em> any of it. That student is an LLM.</p>
      <p style="margin:0; font-size:13px; color:var(--muted);">This analogy comes from the "Stochastic Parrots" paper (Bender et al., 2021) — a paper you will read in detail later in this module.</p>
    </div>

    <h2>Why Does This Matter for You as a Future Educator?</h2>
    <p>South Africa's Department of Basic Education is actively developing AI policy for schools. As a teacher, you will be expected to guide learners who already use AI tools, navigate school policies, and make professional judgements about when AI use is appropriate. None of this is possible without understanding what AI actually is.</p>

    <!-- Reading & Writing Activity -->
    <h2>Reading & Writing Activity</h2>
    <p>This activity has five steps: vocabulary preparation, reading, comprehension questions, a writing task, and AI-powered feedback. Complete all five steps — your writing is submitted for tutor feedback.</p>

    ${readingTask('rt-u1', RT_CONFIG)}

    <!-- Closing Reflection -->
    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"The question is not whether AI will change education in South Africa. It already has. The question is whether you, as an educator, will shape that change — or be shaped by it."</p>
    </div>
  `,
};
