// content/units/unit10.js
// Unit 10: Strategic Scholarly Reading
// Phase 3 — Academic Communication | Reading Level: ACADEMIC ENTRY Level 1

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';

export const VIDEO_KEY = 'unit10';

const RT_U10 = {
  id: 'rt-u10', unitId: 'u10', unitNum: 10,
  title: 'Reading an Academic Article — The Three-Pass Method in Practice',
  level: 'Academic Entry Level 1', wordTarget: 180,
  source: 'Adapted from Khumalo, S. & Mnyandu, P. (2021). Barriers to academic reading in South African higher education. South African Journal of Higher Education, 35(4), 112–129. [Illustrative adaptation — verify original]',
  sourceUrl: null,
  vocab: [
    { term: 'Abstract', definition: 'A concise summary of a research paper — usually 150–250 words — covering the research question, methodology, key findings, and conclusions. Reading the abstract first tells you whether you need to read the full paper.', example: 'A skilled researcher reads 20 abstracts to identify the 3 papers worth reading in full.' },
    { term: 'Methodology', definition: 'The research design and methods used in a study — how data was collected, who participated, and how findings were analysed. Understanding methodology helps you evaluate how much to trust the conclusions.', example: 'A study based on interviews with 8 teachers at one school has different limitations from a survey of 2,000 teachers nationally.' },
    { term: 'Theoretical framework', definition: 'The set of concepts, theories, or models a researcher uses to interpret their data. It shapes what they look for and how they make sense of what they find.', example: 'A researcher using Vygotsky\'s Zone of Proximal Development as their theoretical framework will interpret classroom data through the lens of social learning and scaffolding.' },
    { term: 'Analytical reading', definition: 'Reading not just to understand what a text says, but to evaluate how it makes its argument, what evidence it uses, what assumptions it makes, and where its reasoning is strong or weak.', example: 'An analytical reader does not just note that "the author found X." They also ask: "How did they measure X? Could X be explained differently? Does X apply in my context?"' },
  ],
  text: `
    <h3>Reading an Academic Article — The Three-Pass Method in Practice</h3>

    <p>Most first-year students read academic articles the same way they read novels — from the first word to the last, in order, hoping meaning will emerge. This approach is inefficient for academic reading and often leaves students confused and disheartened when they encounter dense methodology sections or unfamiliar theoretical vocabulary.</p>

    <p>The <strong>three-pass method</strong> — developed by academic researchers to help readers engage efficiently with scholarly literature — treats reading as a purposeful, staged process rather than a linear one.</p>

    <p><strong>Pass One: Orientation (5–10 minutes).</strong> Read the title, abstract, introduction, section headings, and conclusion only. Do not read the body yet. Your goal is to answer: What question does this paper address? What is the main finding? Is this paper relevant to my purpose? After Pass One, you decide whether the paper deserves a full reading.</p>

    <p><strong>Pass Two: Understanding (20–40 minutes).</strong> Read the full paper, but do not stop at every unfamiliar word. Read for the shape of the argument: What claim is made? What evidence is offered? What methodology was used? Take brief margin notes or highlights — not transcriptions, but single-word or one-line prompts that help you remember your thinking.</p>

    <p><strong>Pass Three: Critique (30–60 minutes).</strong> This is the pass most students skip — and it is the one that produces actual academic thinking. Re-read the paper with critical questions: What assumptions does the author make? Are the conclusions supported by the evidence, or do they go beyond it? What does the methodology not allow us to know? How does this paper relate to other things I have read? What would someone who disagrees say?</p>

    <p>Pass Three is where you stop being a consumer of knowledge and start being a scholar. It is uncomfortable — it requires holding multiple ideas in mind simultaneously and making judgements about the quality of reasoning. But it is what every literature review, every essay argument, and every piece of original research requires.</p>

    <p>For South African students reading in English as an additional language, the three-pass method offers particular relief: you are permitted to not understand everything on your first reading. Pass One gives you the map. Pass Two gives you the territory. Pass Three gives you the critical position.</p>
  `,
  visual: `
    <div class="rt-infographic">
      <div class="rt-infographic-title">The Three-Pass Method at a Glance</div>
      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:14px; margin-bottom:16px;">
        ${[
          ['1st Pass', '5–10 min', 'Orientation', '#6366f1', ['Read: Title, Abstract, Introduction, Headings, Conclusion', 'Goal: Is this paper relevant?', 'Output: Yes / No / Maybe decision'], 'Read like a scout — you are mapping the territory, not settling it.'],
          ['2nd Pass', '20–40 min', 'Understanding', '#fbbf24', ['Read: Full paper — but do not stop at every unknown word', 'Goal: Understand the argument and evidence', 'Output: Brief notes on key claims and findings'], 'Read like a journalist — get the story before you analyse it.'],
          ['3rd Pass', '30–60 min', 'Critique', '#10b981', ['Re-read: Key sections with critical questions active', 'Goal: Evaluate assumptions, evidence quality, limitations', 'Output: Your analytical position on the paper'], 'Read like a scholar — question, compare, evaluate, judge.'],
        ].map(([num, time, label, colour, items, tip]) => `
          <div style="border:2px solid ${colour}40; border-radius:12px; overflow:hidden;">
            <div style="background:${colour}; padding:14px 16px; color:#fff;">
              <div style="font-family:'DM Mono',monospace; font-size:11px; letter-spacing:1px; opacity:.8;">${time}</div>
              <div style="font-size:18px; font-weight:700; font-family:'Playfair Display',serif;">${num}</div>
              <div style="font-size:14px; font-weight:600;">${label}</div>
            </div>
            <div style="padding:14px;">
              <ul style="list-style:none; padding:0; font-size:13px; line-height:1.8;">
                ${items.map(i => `<li>• ${i}</li>`).join('')}
              </ul>
              <div style="font-size:12px; color:${colour}; font-style:italic; margin-top:8px; padding-top:8px; border-top:1px solid ${colour}20;">${tip}</div>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `,
  questions: [
    'The text says Pass Three is "where you stop being a consumer of knowledge and start being a scholar." What does this mean in practice? What is the specific difference between understanding what an author claims and taking a critical analytical position on it?',
    'The text says the three-pass method is "particularly useful" for students reading in an additional language. Explain why. What specific challenge does it address that a linear reading approach does not?',
    'Choose ONE of the critical questions from Pass Three: "What assumptions does the author make?" Apply this question to ANY reading you have done for university so far. What assumption did you find? Was it stated explicitly or implied?',
  ],
  writingPrompt: `Find a journal article abstract — from Scopus, Google Scholar, or one provided by your lecturer. Paste the title here and apply the three-pass method to the abstract only (you do not need to read the full paper for this task).

Write 6–7 sentences:
• Paper title and journal name
• Pass One result: In one sentence, what is the paper's main argument or finding?
• Pass Two observation: What evidence does the abstract say the authors used? What methodology is mentioned?
• Pass Three critique: What question does the abstract leave unanswered? What would you want to know before fully trusting this finding?
• Final decision: Would you read the full paper? Why or why not?`,
};

export const unit10 = {
  id: 'u10', badge: 'Unit 10', title: 'Strategic Scholarly Reading',
  phase: 'Phase 3 — Academic Communication',
  html: () => `
    <h1>Unit 10: Strategic Scholarly Reading</h1>
    <p class="lead">Scholarly reading is not passive. It is an active, critical, staged engagement with ideas — designed not just to understand what an author says, but to evaluate whether what they say holds up. This unit teaches you a method that makes that engagement manageable and productive.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Apply the three-pass method to any academic article efficiently and purposefully</li>
        <li>Distinguish between comprehension reading (understanding what is said) and analytical reading (evaluating how and why)</li>
        <li>Identify the argument, evidence, methodology, and assumptions in an academic text</li>
        <li>Write a structured analytical response to a journal article abstract</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>Simon Clark is a researcher who makes videos about academic life. This video on how to read a research paper has helped hundreds of thousands of students. His demonstration of moving through a paper non-linearly — starting with the abstract, jumping to the conclusion, then deciding whether to read the middle — will feel counterintuitive. Watch and resist the urge to dismiss it before trying it.</p>
    <div id="ivp-unit10" data-video-key="unit10" class="ivp-container"></div>

    ${quiz('q10a',
      'A student says: "I read every word of the article three times and I still don\'t understand it." Based on the three-pass method, what is most likely going wrong?',
      [
        'The article is too advanced for their level',
        'They are reading linearly without a clear purpose for each pass — reading for understanding and reading for critique require different mental modes and should be separated',
        'They need to read more slowly',
        'The article is probably poorly written',
      ],
      1,
      '✅ Reading the same text three times in the same way does not produce three times the understanding. The three-pass method works because each pass has a different purpose and activates different cognitive processes. The first pass tells you what you are looking for. The second pass gives you the content. The third pass gives you your analytical position.'
    )}

    ${quiz('q10b',
      'An article\'s abstract says: "This study found that learners taught using a reading circle method outperformed a control group." Before accepting this finding, which question is MOST analytically important?',
      [
        'What were the names of the learners in the study?',
        'How big were the groups, what was the "control group" doing instead, and how was "outperformed" measured — so you can evaluate whether the comparison is fair and the claim is supported',
        'Whether the authors have published other papers on reading',
        'Which university was the study conducted at',
      ],
      1,
      '✅ The most analytically important questions are always about methodology. "Outperformed" means nothing without knowing: how much better? On what measure? Compared to what exactly? With how many participants? Over what time period? These methodological details determine whether the finding is robust or fragile — and whether it applies to your context.'
    )}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u10', RT_U10)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"A text that you have only read for comprehension is a source. A text that you have read analytically and taken a critical position on is evidence. The difference between a weak essay and a strong one is almost always the difference between sources and evidence."</p>
    </div>
  `,
};
