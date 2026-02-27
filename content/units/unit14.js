// content/units/unit14.js — Reading & Creating Visual Arguments
// Phase 3 | Academic Entry Level 5

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
import { visualTask }  from '../../src/components/visual-task.js';

const RT_U14 = {
  id: 'rt-u14', unitId: 'u14', unitNum: 14,
  title: 'The Visual Argument — How Data Becomes Persuasion',
  level: 'Academic Entry Level 5', wordTarget: 200,
  source: 'Adapted for Academic Literacies — drawing on Cairo, A. (2016). The Truthful Art. New Riders Press; and McCandless, D. (2014). Knowledge is Beautiful. HarperCollins.',
  vocab: [
    { term: 'Visual argument', definition: 'A claim made through visual means — a graph, chart, infographic, diagram or image — that aims to persuade by showing rather than stating. Visual arguments carry rhetorical force even when they appear to be "just facts."', example: 'A bar chart that shows rising school fees in absolute figures (not inflation-adjusted) makes a visual argument about affordability that may be technically accurate but misleading in context.' },
    { term: 'Data visualisation', definition: 'The representation of data in graphical form to reveal patterns, trends, comparisons or distributions that might be invisible in raw numbers.', example: 'Florence Nightingale\'s famous rose diagram (1858) used a circular chart to show that more soldiers died from preventable disease than from wounds — persuading military leaders to improve sanitation.' },
    { term: 'Visual rhetoric', definition: 'The deliberate use of visual design choices — colour, scale, framing, labelling, emphasis — to shape how an audience interprets data or an image.', example: 'A graph with a y-axis starting at 90% instead of 0% makes a 1% difference look like a dramatic change. This is a rhetorical choice that distorts the magnitude of change.' },
    { term: 'Chartjunk', definition: 'Unnecessary visual elements in a data graphic that do not convey information and distract from or distort the data — coined by Edward Tufte. Includes decorative 3D effects, excessive gridlines, and irrelevant illustrations.', example: 'A 3D pie chart with an "exploded" slice and a decorative shadow uses chartjunk that makes it harder to judge the actual proportions.' },
  ],
  text: `
    <h3>The Visual Argument — How Data Becomes Persuasion</h3>

    <p>A graph is never just a graph. It is an argument about what matters, what should be compared, and what the data means. Every visual choice — what to show, what to exclude, where to start the y-axis, which colours to use, what to label — is a rhetorical decision. Reading a data visualisation analytically means seeing both what it shows and what it argues.</p>

    <p>The most important principle in visual literacy is this: <strong>always ask what has been left out.</strong> A graph that shows rising literacy test scores over five years tells you the scores went up. It does not tell you whether the test changed, whether the demographics of test-takers changed, whether some schools were excluded, or whether the improvement represents genuine learning or improved test preparation. The data shown is always a selection from a larger reality.</p>

    <p>Academic sources increasingly present findings visually — particularly in education research, public health, economics, and policy. Being able to read a table, interpret a bar chart, and assess the claims an infographic makes is a core scholarly skill, as essential as reading a paragraph of academic prose.</p>

    <p>Four analytical questions to ask every data visualisation:</p>
    <p><strong>1. What is being measured, and how?</strong> "Student achievement" could mean hundreds of different things measured in dozens of different ways. If the measure is not defined, the visual has no clear meaning.</p>
    <p><strong>2. What is the baseline and the scale?</strong> A y-axis that starts at 60% instead of 0% makes a small difference look dramatic. Always check where the axes start and what scale is being used.</p>
    <p><strong>3. What is the source of the data?</strong> Who collected it, when, from whom, and for what purpose? A graph published by an organisation advocating for a particular policy is not automatically wrong — but its provenance matters for how you evaluate its claims.</p>
    <p><strong>4. What story is the visual telling — and what story is it not telling?</strong> Every graph has a frame. The frame shows you one thing. What is outside the frame?</p>

    <p>Creating visual arguments for academic work — whether in a policy brief, an infographic, or a presentation — requires the same rigour. The visual must be honest about its data, clear about its source, appropriately scaled, and designed to clarify rather than to mislead.</p>
  `,
  visual: `
    <div class="rt-infographic">
      <div class="rt-infographic-title">Four Moves for Reading Any Data Visual</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px;">
        ${[
          ['🔍', 'What is being measured?', '#6366f1', 'Ask: How is the key variable defined? Is "student achievement" one test, a composite score, a teacher rating? An undefined measure has no clear meaning.'],
          ['📏', 'What is the scale and baseline?', '#f59e0b', 'Ask: Where does the y-axis start? Does the scale distort magnitude? A chart starting at 90% makes a 2% change look catastrophic.'],
          ['📋', 'What is the data source?', '#10b981', 'Ask: Who collected this data, when, and for what purpose? Official government data and advocacy organisation data may tell very different stories.'],
          ['🖼️', 'What is outside the frame?', '#ef4444', 'Ask: What context is missing? What would change the interpretation if you knew it? A trend line without its starting conditions is incomplete.'],
        ].map(([icon, title, colour, desc]) => `
          <div style="border:1px solid ${colour}40; border-radius:12px; padding:18px; background:#fff;">
            <div style="font-size:24px; margin-bottom:8px;">${icon}</div>
            <div style="font-weight:700; font-size:14px; color:${colour}; margin-bottom:8px;">${title}</div>
            <p style="font-size:13px; line-height:1.6; color:var(--muted); margin:0;">${desc}</p>
          </div>
        `).join('')}
      </div>
    </div>
  `,
  questions: [
    'The text says "A graph is never just a graph — it is an argument." Find one graph or data visualisation in any newspaper, social media post, or academic source this week. Apply the four analytical questions from the infographic. What does the visual argue? What has it left out?',
    'Explain the difference between a graph that is technically accurate and a graph that is misleading. Can something be both? Give an example of a visual technique that distorts magnitude without changing the underlying data.',
    'The text says "every visual choice is a rhetorical decision." Give three specific visual design choices — from colour, scale, labelling, or chart type — and explain how each one shapes the reader\'s interpretation of the data.',
  ],
  writingPrompt: `Find one data visualisation published in either: (a) a South African newspaper (Daily Maverick, Mail & Guardian, News24), or (b) a government or NGO report on education in South Africa.

Paste the URL or describe the visual clearly. Then write 180–220 words applying the four analytical questions:
• What is being measured and how is it defined?
• What is the scale and baseline — does the visual distort magnitude?
• Who produced this data, when, and for what purpose — and how does that affect your interpretation?
• What is the most important thing missing from the frame of this visual — what context would significantly change how a reader understands it?

End with a one-sentence verdict: Is this visualisation honest and well-designed, or does it mislead in ways that a careful reader should flag?`,
};

const VT_U14 = {
  id: 'vt-u14', unitId: 'u14',
  title: 'Unpacking a Real Education Data Visualisation',
  chartType: 'bar chart with annotation',
  visualDescription: 'A bar chart comparing South African learner reading proficiency rates at Grade 4 level across provinces, with a national average line — data from PIRLS 2021',
  source: 'Adapted for Academic Literacies — based on PIRLS 2021 South Africa national report data. PIRLS = Progress in International Reading Literacy Study.',
  observePrompt: 'Before answering, study the visual carefully. Note: what is on each axis? What does each bar represent? Where does the y-axis start? Is there a baseline or average shown?',
  observeChecklist: [
    'What each bar represents (which province or category)',
    'Where the y-axis starts and what the full scale is',
    'Whether a national or international average is shown',
    'What the title and labels say the data measures',
    'Whether any provinces or categories are missing',
  ],
  analysePrompt: 'Now apply the four analytical questions from the unit reading. What is being argued by this visual — beyond just "these are the scores"?',
  analyseQuestions: [
    'What exactly is being measured — and what does "reading proficiency at Grade 4" include and exclude?',
    'Does the scale of the chart make differences between provinces look larger or smaller than they actually are?',
    'What does the gap between the highest and lowest performing provinces tell you — and what might explain it that the visual does not show?',
    'What is the most important piece of context that would change how a teacher or policymaker interprets this chart?',
  ],
  modelAnswer: `A rigorous reading of this visualisation moves well beyond the bar heights. First, the measurement: PIRLS tests a specific set of reading skills in a standardised format — proficiency here is not a holistic measure of reading ability but performance on a particular international benchmark. Second, the scale matters enormously: if the y-axis starts at 30% rather than 0%, the visual amplifies the visual distance between provinces without changing the underlying data. Third, the inter-provincial gap is visible data — but the explanation is outside the frame: resource allocation, class sizes, language-of-learning policy, poverty indices, and teacher supply all mediate these scores but are not shown. Fourth, the most important absent context is socioeconomic: provinces with higher reading proficiency tend to have more urban, better-resourced schools. The visual makes the gap visible but does not make its cause visible — and a policymaker who sees only the bars might draw the wrong conclusion about what intervention is needed.`,
};

export const unit14 = {
  id: 'u14', badge: 'Unit 14', title: 'Reading & Creating Visual Arguments',
  phase: 'Phase 3 — Academic Communication',
  html: () => `
    <h1>Unit 14: Reading & Creating Visual Arguments</h1>
    <p class="lead">Data visualisations appear everywhere in academic research, policy documents, news media, and assignment briefs. Being able to read them critically — and to create honest, well-designed ones yourself — is an increasingly essential scholarly skill. This unit gives you the analytical vocabulary.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Apply four analytical questions to any data visualisation to evaluate what it argues and what it omits</li>
        <li>Identify specific visual rhetoric techniques — scale distortion, selective framing, chartjunk — and explain their effect</li>
        <li>Describe a visual argument in precise academic language, distinguishing what the data shows from what it implies</li>
        <li>Evaluate a real South African education data visual in a structured written response</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>David McCandless is a data journalist who has spent his career thinking about how information becomes beautiful — and how beauty can be weaponised to mislead. His TED talk introduced millions of people to the idea that every visualisation is an argument. Watch for how he moves from "interesting" to "what does this actually claim?"</p>
    <div id="ivp-unit14" data-video-key="unit14" class="ivp-container"></div>

    ${quiz('q14a',
      'A graph about school dropout rates shows a sharp upward spike from 2019 to 2020. The y-axis starts at 85%, not 0%. What is the most important analytical question to ask?',
      [
        'Which school did this data come from?',
        'The y-axis starting at 85% makes a small percentage-point change look massive — you need to see the actual scale of the increase before drawing any conclusions about its significance',
        'Whether the graph uses the correct colours',
        'Whether dropout rates in 2020 were higher than in 2015',
      ],
      1,
      '✅ A truncated y-axis is one of the most common forms of visual misleading in data journalism and policy documents. Starting at 85% instead of 0% can make a 2-percentage-point change look like a tripling. Always check where the y-axis starts before reading the magnitude of any trend.'
    )}

    ${quiz('q14b',
      'An NGO publishes a bar chart showing that schools in their programme improved learner test scores by 15%. What question about the SOURCE of this data is most analytically important?',
      [
        'What font they used in the chart',
        'Whether the NGO measured their own programme\'s outcomes — and if so, what test was used, whether there was a control group of non-programme schools, and whether the NGO had a financial interest in showing improvement',
        'How many colours are in the chart',
        'Whether the chart was published in a journal',
      ],
      1,
      '✅ When an organisation measures the impact of its own programme, there is an inherent risk of confirmation bias — consciously or not, they may design measurement tools, select comparison points, or present data in ways that favour positive results. This does not make the data wrong, but it means you should look for independent replication before treating the finding as robust.'
    )}

    <h2>Visual Literacy Task</h2>
    ${visualTask(VT_U14)}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u14', RT_U14)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"The goal of a good data visualisation is not to make data beautiful. It is to make the truth visible. The goal of a bad one is to make a particular truth invisible while appearing to show everything."</p>
    </div>
  `,
};
