// content/units/unit02.js
// Unit 2: The Information Ecosystem
// Phase 1 — Understanding the Landscape
// Reading Level: ACCESS Level 2

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';

const RT_CONFIG = {
  id: 'rt-u2', unitId: 'u2', unitNum: 2,
  title: "Who Decides What You Know?",
  level: 'Access Level 2', wordTarget: 80,
  source: 'Adapted for Academic Literacies — based on Reuters Institute Digital News Report (South Africa) and UNESCO Media & Information Literacy curriculum',
  sourceUrl: null,

  vocab: [
    { term: 'Algorithm', definition: 'A set of rules a computer follows to make decisions — like deciding which posts you see first on social media or which search results appear at the top.', example: 'When Instagram shows you more cat videos after you watch one, that is an algorithm at work.' },
    { term: 'Filter bubble', definition: 'The situation that results when algorithms only show you content that matches your existing interests and views — gradually hiding different perspectives from you.', example: 'If you only ever read articles that agree with your political views, you may be inside a filter bubble.' },
    { term: 'Misinformation', definition: 'False or inaccurate information that is shared — even if the person sharing it believes it is true.', example: 'Sharing a WhatsApp message about a false "cure" for a disease is spreading misinformation, even if you meant to help.' },
    { term: 'Credible source', definition: 'A source of information that is trustworthy because it is accurate, transparent about who produced it, and based on evidence.', example: 'A peer-reviewed journal article is generally more credible than an anonymous social media post.' },
  ],

  text: `
    <h3>Who Decides What You Know?</h3>
    <p>Imagine you wake up tomorrow and someone has arranged your entire learning environment for you. They have chosen which books are on your desk, which news headlines you read, which voices you hear — all based on what you liked yesterday. You did not choose any of it. You do not even know it is happening.</p>
    <p>This is not a thought experiment. It is your daily experience online.</p>
    <p>Every time you use social media, a search engine, or a news app, powerful algorithms are making decisions about what you see. These systems are designed not to show you what is <em>most important</em> — they are designed to show you what will keep you on the platform the longest. That usually means content that confirms what you already believe, content that makes you feel strong emotions, and content that is simple rather than complex.</p>
    <p>For a learner or teacher, this is a serious problem. Academic thinking requires you to encounter ideas that challenge you. It requires exposure to evidence you did not expect. It requires sitting with complexity. Algorithms are designed to do the opposite.</p>
    <p>Research by the Reuters Institute found that many South African news consumers get most of their information from WhatsApp and Facebook — platforms where information is shared person to person, with very little fact-checking. A study at a South African university found that many first-year students could not reliably distinguish between a peer-reviewed source and a social media post.</p>
    <p>This is not a failure of intelligence. It is a failure of the information environment we have all inherited.</p>
    <p>The good news: information literacy is a learnable skill. Understanding <em>why</em> algorithms work the way they do is the first step to being able to see beyond them — and to help your future learners do the same.</p>
  `,

  visual: `
    <div class="rt-infographic">
      <div class="rt-infographic-title">Where Do South African University Students Get News & Information? (Illustrative, 2023)</div>
      <div class="rt-bar-chart">
        <div class="rt-bar-row"><div class="rt-bar-label">WhatsApp / Messaging</div><div class="rt-bar-track"><div class="rt-bar-fill-bar" style="width:78%;background:#ef4444;">78%</div></div></div>
        <div class="rt-bar-row"><div class="rt-bar-label">Facebook / Instagram</div><div class="rt-bar-track"><div class="rt-bar-fill-bar" style="width:71%;background:#f97316;">71%</div></div></div>
        <div class="rt-bar-row"><div class="rt-bar-label">TikTok / YouTube</div><div class="rt-bar-track"><div class="rt-bar-fill-bar" style="width:65%;background:#eab308;">65%</div></div></div>
        <div class="rt-bar-row"><div class="rt-bar-label">Online News Sites</div><div class="rt-bar-track"><div class="rt-bar-fill-bar" style="width:44%;background:#22c55e;">44%</div></div></div>
        <div class="rt-bar-row"><div class="rt-bar-label">Academic Databases</div><div class="rt-bar-track"><div class="rt-bar-fill-bar" style="width:12%;background:#6366f1;">12%</div></div></div>
      </div>
      <div class="rt-chart-question"><strong>Study this chart carefully. Think about:</strong><ul><li>Which sources have the highest fact-checking standards?</li><li>Which sources use algorithms most heavily?</li><li>What does it mean that only 12% of students regularly use academic databases?</li></ul></div>
      <div class="rt-infographic-caption">Illustrative data based on Reuters Institute Digital News Report trends for South Africa (2022–2023). Exact percentages are estimates for educational illustration.</div>
    </div>
  `,

  questions: [
    'The text says algorithms are designed to keep you on a platform — not to show you what is most important. Explain in your own words what this means and why it matters for a university student.',
    'Look at the bar chart carefully. Write 2 sentences describing what the chart shows and what concerns you about it as a future educator.',
    'The text says "this is not a failure of intelligence — it is a failure of the information environment." Do you agree? Give a specific reason from your own experience.',
  ],

  writingPrompt: `Write a paragraph of about 80 words comparing two ways you find information: one from your daily life (social media, WhatsApp, YouTube) and one from an academic context (a textbook, a library, a database).

Structure your paragraph like this:
First sentence: Name the two sources you are comparing.
Middle sentences: Describe one key difference — think about who controls what you see, how information is checked, and how reliable it is.
Final sentence: Explain which you would use for academic research, and why.

Include at least one specific example. Write in your own words.`,
};

export const unit02 = {
  id: 'u2', badge: 'Unit 2',
  title: 'The Information Ecosystem',
  phase: 'Phase 1 — Understanding the Landscape',

  html: () => `
    <h1>Unit 2: The Information Ecosystem</h1>
    <p class="lead">Information has never been more abundant — or more unreliable. This unit maps how information flows in the digital world, who controls it, and how algorithms shape what you know without you noticing.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Explain what an algorithm is and how it shapes the information you encounter</li>
        <li>Define "filter bubble" and describe its consequences for academic thinking</li>
        <li>Read and interpret a bar chart and extract an argument from it</li>
        <li>Write a structured comparative paragraph with a specific personal example</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>In 2011, internet activist Eli Pariser gave a TED talk that predicted exactly the world we now live in. He coined the term "filter bubble." Watch critically — consider whether his prediction came true, and what it means for your future classroom.</p>
    <div id="ivp-unit2" data-video-key="unit2" class="ivp-container"></div>

    ${quiz('q2a',
      'Pariser argues the internet shows us less of what we need and more of what we want. For a student writing an academic essay, why is this a serious problem?',
      [
        'It makes searching for sources slower and less efficient',
        'You may only encounter evidence that confirms your existing views, weakening your academic argument',
        'It results in too many search results to sort through',
        'It prevents you from accessing academic databases directly',
      ], 1,
      '✅ Academic writing requires engaging with the full range of evidence — including evidence that challenges your position. If your information environment only confirms your existing views, your arguments will be one-sided. This is what Pariser warned about in 2011 — and it has intensified significantly since then.'
    )}

    ${quiz('q2b',
      'A student researches "the benefits of AI in education" using only Google and YouTube. After two days she concludes "all evidence shows AI is great for education." What has most likely happened?',
      [
        'She has done thorough research and found a clear answer',
        'She has been inside a filter bubble — algorithms prioritised content that matched her search terms, hiding critical perspectives',
        'AI in education genuinely has no critics, so her research is complete',
        'Google and YouTube are not valid research tools so her work is entirely invalid',
      ], 1,
      '✅ This is a classic filter bubble effect. By searching for "benefits" rather than simply "AI in education", she signalled to the algorithm what kind of content she wanted — and it delivered. Academic research requires deliberately seeking out critical perspectives and counterarguments. This is called seeking disconfirming evidence, and it is a hallmark of scholarly thinking.'
    )}

    <h2>The Architecture of Your Information World</h2>
    <p>Every major platform — Google, Meta, TikTok, YouTube — runs on an engagement algorithm. The goal is simple: maximise the time you spend on the platform, because more time means more advertising revenue. Notice what this system does <em>not</em> optimise for: accuracy, balance, complexity, or importance. These are precisely the qualities academic information requires.</p>

    <div class="info-flow-diagram">
      <div class="ifd-step"><div class="ifd-icon">👁️</div><div class="ifd-label">You view content</div></div>
      <div class="ifd-arrow">→</div>
      <div class="ifd-step"><div class="ifd-icon">📊</div><div class="ifd-label">Algorithm records your reaction</div></div>
      <div class="ifd-arrow">→</div>
      <div class="ifd-step"><div class="ifd-icon">🔁</div><div class="ifd-label">Shows you more of the same</div></div>
      <div class="ifd-arrow">→</div>
      <div class="ifd-step"><div class="ifd-icon">🫧</div><div class="ifd-label">Your bubble quietly tightens</div></div>
    </div>

    <h2>What This Means for Your Future Classroom</h2>
    <p>Your future learners will grow up entirely inside algorithmically curated information environments. Many will never have encountered the idea that what they see online is <em>chosen for them</em> — not a neutral window onto reality. Teaching them to recognise and question this is one of the most important critical thinking skills an educator can develop.</p>

    <div class="concept-card">
      <div class="concept-card-label">Your Professional Context</div>
      <p>UNESCO defines Media and Information Literacy (MIL) as a core competency for all citizens. South Africa's CAPS curriculum includes critical literacy as a fundamental outcome. This is not an extra — it is core to your professional identity as an educator.</p>
      <p>The question is not whether your learners will encounter misinformation. They already do, every day. The question is whether they will have the tools to recognise it.</p>
    </div>

    <h2>Reading & Writing Activity</h2>
    <p>This activity uses a reading text and a bar chart together. Read the text carefully first, then study the chart as a second source of evidence. Both will support your comprehension answers and writing task.</p>

    ${readingTask('rt-u2', RT_CONFIG)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"The internet was supposed to give us access to everything. Instead, for many of us, it has given us a very well-curated version of what we already believe. The scholar's job — and the teacher's job — is to escape that bubble, and to help others do the same."</p>
    </div>
  `,
};
