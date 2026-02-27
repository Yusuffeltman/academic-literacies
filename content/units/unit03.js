// content/units/unit03.js
// Unit 3: Critical Thinking in the Digital Age
// Phase 1 — Understanding the Landscape
// Reading Level: ACCESS Level 3 — two paragraphs with discipline vocabulary

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';

const RT_CONFIG = {
  id: 'rt-u3', unitId: 'u3', unitNum: 3,
  title: 'Not Everything Is What It Seems',
  level: 'Access Level 3', wordTarget: 100,
  source: 'Adapted for Academic Literacies — based on First Draft News (firstdraftnews.org) and UNESCO Media & Information Literacy guidelines',
  sourceUrl: null,

  vocab: [
    { term: 'Critical thinking', definition: 'The ability to analyse information carefully, question assumptions, and reach a well-reasoned conclusion rather than accepting the first thing you read or hear.', example: 'A critical thinker does not share a news story just because a friend sent it — they first ask: who wrote this, what evidence is given, and can I verify it elsewhere?' },
    { term: 'Confirmation bias', definition: 'The human tendency to search for, remember, and favour information that confirms what we already believe — and to ignore or dismiss information that challenges us.', example: 'A teacher who believes all technology is harmful in classrooms may unconsciously notice only the studies that support this view and overlook studies showing benefits.' },
    { term: 'Disinformation', definition: 'False information that is created and shared deliberately, with the intent to deceive or mislead.', example: 'A political group deliberately creating fake news stories to influence voters is spreading disinformation.' },
    { term: 'Cognitive bias', definition: 'A pattern of thinking that causes us to make errors in judgement — often without realising it. We all have cognitive biases; awareness is the first step to managing them.', example: 'The "bandwagon effect" is a cognitive bias — believing something is true because many people believe it, regardless of the evidence.' },
  ],

  text: `
    <h3>Not Everything Is What It Seems</h3>

    <p>In 2020, a video circulated widely on South African WhatsApp groups showing a man allegedly curing COVID-19 with steam inhalation. The video was shared millions of times — by educated people, by community leaders, and even by a few teachers. Within days, medical professionals were treating patients who had burned their lungs trying the "cure." The video was false. The sharing was not.</p>

    <p>How does this happen? How do intelligent, caring people spread dangerous misinformation?</p>

    <p>The answer lies partly in how our brains are built. Human beings are not naturally rational — we are naturally <em>social</em>. We trust information that comes from people we know. We believe things that confirm what we already think. We are more moved by a single story than by statistics. These are not flaws — for most of human history, they were survival advantages. But in an information environment flooded with content designed to exploit these tendencies, they become vulnerabilities.</p>

    <p>Researchers distinguish between three types of false information. <strong>Misinformation</strong> is false information shared without intent to deceive — the person spreading it may genuinely believe it is true. <strong>Disinformation</strong> is false information created and spread deliberately to mislead. <strong>Malinformation</strong> is true information used harmfully — for example, sharing someone's private medical information to damage their reputation.</p>

    <p>For an educator, understanding these distinctions matters deeply. When a learner shares false information in class, the appropriate response depends entirely on whether they believed it (misinformation) or whether they knew it was false (disinformation). The first calls for education; the second calls for a different kind of conversation.</p>

    <p>Critical thinking is not about being suspicious of everything. It is about asking the right questions at the right moment: <em>Who made this? What do they want me to believe? What evidence is provided? What do other credible sources say?</em> These four questions will serve you — and your learners — in every information environment you will ever encounter.</p>
  `,

  visual: `
    <div class="rt-infographic">
      <div class="rt-infographic-title">The Information Disorder: Three Types of False & Harmful Content</div>
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:14px;margin:16px 0;">
        <div style="background:#fef3c7;border:1px solid #fde68a;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">⚠️</div>
          <div style="font-weight:700;font-size:14px;color:#92400e;margin-bottom:8px;">MISINFORMATION</div>
          <div style="font-size:13px;color:#78350f;line-height:1.5;">False information shared <strong>without intent to deceive</strong>. The sharer believes it is true.</div>
          <div style="margin-top:10px;padding:8px;background:rgba(255,255,255,.6);border-radius:8px;font-size:12px;font-style:italic;">"I thought the WhatsApp message was true."</div>
        </div>
        <div style="background:#fee2e2;border:1px solid #fca5a5;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">🎯</div>
          <div style="font-weight:700;font-size:14px;color:#991b1b;margin-bottom:8px;">DISINFORMATION</div>
          <div style="font-size:13px;color:#7f1d1d;line-height:1.5;">False information created and spread <strong>deliberately to mislead</strong>.</div>
          <div style="margin-top:10px;padding:8px;background:rgba(255,255,255,.6);border-radius:8px;font-size:12px;font-style:italic;">"We created fake statistics to win the argument."</div>
        </div>
        <div style="background:#ede9fe;border:1px solid #c4b5fd;border-radius:12px;padding:18px;text-align:center;">
          <div style="font-size:28px;margin-bottom:8px;">🔪</div>
          <div style="font-weight:700;font-size:14px;color:#5b21b6;margin-bottom:8px;">MALINFORMATION</div>
          <div style="font-size:13px;color:#4c1d95;line-height:1.5;"><strong>True information</strong> used in a harmful way — to damage, humiliate, or manipulate.</div>
          <div style="margin-top:10px;padding:8px;background:rgba(255,255,255,.6);border-radius:8px;font-size:12px;font-style:italic;">"The information was real — but sharing it was wrong."</div>
        </div>
      </div>
      <div class="rt-chart-question"><strong>Think about this framework as a future educator:</strong><ul><li>When a learner shares false information in class, which type is it most likely to be?</li><li>How would you respond differently to each type?</li><li>Can you think of a real example of each from the South African context?</li></ul></div>
      <div class="rt-infographic-caption">Framework adapted from First Draft News / UNESCO (2017). "Information Disorder: Toward an Interdisciplinary Framework." Claire Wardle & Hossein Derakhshan.</div>
    </div>
  `,

  questions: [
    'The text describes the COVID-19 steam video story. Using your own words, explain why intelligent and caring people share misinformation. What does this tell us about human nature?',
    'Look at the visual. In your own words, what is the key difference between misinformation and disinformation? Give one example of each from a South African educational context.',
    'The text gives four critical thinking questions: Who made this? What do they want me to believe? What evidence is provided? What do other credible sources say? Choose ONE of these questions and explain why you think it is the most important one for a teacher to model for learners.',
  ],

  writingPrompt: `Write a definition paragraph of about 100 words.

Your task: Define "critical thinking" in your own words — based on what you have learned in this reading and this unit so far. Do NOT copy a definition from the text.

Your paragraph must include:
• Your own definition of critical thinking (2 sentences)
• One specific example of what critical thinking looks like in an educational context — either in a classroom or when a teacher is doing research
• One sentence explaining why this skill matters more now than it did 20 years ago

Write in formal English. Avoid starting sentences with "I think" or "I believe" — instead try: "Critical thinking involves...", "For example...", "In an era of..."`,
};

export const unit03 = {
  id: 'u3', badge: 'Unit 3',
  title: 'Critical Thinking in the Digital Age',
  phase: 'Phase 1 — Understanding the Landscape',

  html: () => `
    <h1>Unit 3: Critical Thinking in the Digital Age</h1>
    <p class="lead">Not everything you encounter online is false. Not everything that sounds false is false. The skill we need is not scepticism of everything — it is a disciplined framework for asking the right questions.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Explain what cognitive bias is and identify confirmation bias in your own thinking</li>
        <li>Distinguish between misinformation, disinformation, and malinformation with examples</li>
        <li>Apply four critical thinking questions to any piece of digital content</li>
        <li>Write a definition paragraph using formal academic language</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>CGP Grey's "This Video Will Make You Angry" is one of the most watched explanations of how outrage spreads online — and why we are all susceptible to it, regardless of our intelligence or education. It is short, sharp, and uncomfortable. Good.</p>
    <div id="ivp-unit3" data-video-key="unit3" class="ivp-container"></div>

    ${quiz('q3a',
      'CGP Grey argues that "thought germs" spread most effectively when they produce anger or outrage. For an educator, what is the most important implication of this?',
      [
        'Teachers should avoid discussing controversial topics in class',
        'Emotional content spreads faster than accurate content — so we need to teach learners to pause before sharing',
        'Social media platforms should be banned in educational settings',
        'Students who share outrage content are less intelligent than those who do not',
      ], 1,
      '✅ The insight here is not that emotions are bad — it is that our emotional responses are routinely exploited by content designed to spread. Teaching learners to pause, identify their emotional reaction, and then ask critical questions is one of the most powerful interventions an educator can make. This is sometimes called "emotional regulation" in media literacy — recognising that a strong emotional response is often a signal to slow down, not to share.'
    )}

    ${quiz('q3b',
      'Confirmation bias means we tend to believe information that confirms what we already think. Which of the following is the BEST academic strategy to counteract confirmation bias when researching a topic?',
      [
        'Use AI to summarise all the information so you do not have to read everything yourself',
        'Only read sources from one trusted organisation',
        'Deliberately search for sources that challenge or disagree with your initial position',
        'Read more sources until you find one that confirms your view',
      ], 2,
      '✅ Actively seeking disconfirming evidence — sources that challenge your position — is the single most effective academic strategy against confirmation bias. This is why good academic writing always engages with counterarguments. It is not weakness; it is intellectual honesty, and it makes your final argument much stronger.'
    )}

    <h2>Why Critical Thinking Is Hard — And Why That Matters</h2>
    <p>A common misconception is that critical thinking is something clever people do naturally and less intelligent people struggle with. Research in cognitive psychology shows this is completely false. Confirmation bias, the bandwagon effect, and emotional reasoning affect everyone — including academics, scientists, and educators. The difference is not intelligence; it is <em>practice</em> and <em>awareness</em>.</p>

    <div class="bias-grid">
      <div class="bias-card">
        <div class="bias-name">Confirmation Bias</div>
        <div class="bias-desc">We seek and remember information that confirms what we already believe.</div>
        <div class="bias-fix">Fix: Actively search for counterarguments before concluding.</div>
      </div>
      <div class="bias-card">
        <div class="bias-name">Bandwagon Effect</div>
        <div class="bias-desc">We believe something is true because many people believe it.</div>
        <div class="bias-fix">Fix: Ask for evidence, not just consensus.</div>
      </div>
      <div class="bias-card">
        <div class="bias-name">Authority Bias</div>
        <div class="bias-desc">We accept information from authority figures without question.</div>
        <div class="bias-fix">Fix: Even experts can be wrong — check their evidence.</div>
      </div>
      <div class="bias-card">
        <div class="bias-name">Availability Heuristic</div>
        <div class="bias-desc">We judge how common or true something is based on how easily an example comes to mind.</div>
        <div class="bias-fix">Fix: Ask for data, not just memorable examples.</div>
      </div>
    </div>

    <h2>The Four Questions Every Critical Thinker Asks</h2>
    <p>These four questions work for any piece of information — a WhatsApp message, a journal article, a government policy document, or an AI-generated summary:</p>

    <div class="four-questions">
      <div class="fq-item"><span class="fq-num">1</span><div><strong>Who made this?</strong> What is their identity, their institution, their funding source, their track record?</div></div>
      <div class="fq-item"><span class="fq-num">2</span><div><strong>What do they want me to believe or do?</strong> Is there a clear argument or call to action?</div></div>
      <div class="fq-item"><span class="fq-num">3</span><div><strong>What evidence is provided?</strong> Is it specific, verifiable, and relevant? Or is it vague, anecdotal, or emotional?</div></div>
      <div class="fq-item"><span class="fq-num">4</span><div><strong>What do other credible sources say?</strong> Does this claim appear in peer-reviewed research, reputable journalism, or official sources?</div></div>
    </div>

    <h2>Reading & Writing Activity</h2>
    <p>The reading this week includes a real South African case study — the COVID-19 steam video — that illustrates how misinformation spreads. Read carefully and pay attention to the framework in the visual.</p>

    ${readingTask('rt-u3', RT_CONFIG)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"The goal of education is not to produce people who know facts. It is to produce people who can tell the difference between a fact and an opinion, between evidence and assertion, between a credible source and a convincing one. That has always been true. In 2025, it is urgent."</p>
    </div>
  `,
};
