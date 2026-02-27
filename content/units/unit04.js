// content/units/unit04.js
// Unit 4: The Attention Economy & Deep Work
// Phase 1 — Understanding the Landscape
// Reading Level: ACCESS Level 4 — moving toward Foundation

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';

const RT_CONFIG = {
  id: 'rt-u4', unitId: 'u4', unitNum: 4,
  title: 'The Battle for Your Brain',
  level: 'Access Level 4 (transitioning to Foundation)',
  wordTarget: 120,
  source: 'Adapted for Academic Literacies — based on Cal Newport "Deep Work" (2016), Johann Hari "Stolen Focus" (2022), and the South African Journal of Education studies on student attention.',
  sourceUrl: null,

  vocab: [
    { term: 'Attention economy', definition: 'An economic system in which human attention is treated as a scarce and valuable resource that technology companies compete to capture and sell to advertisers.', example: 'When an app sends you notifications throughout the day, it is not trying to help you — it is trying to capture more of your attention to sell to advertisers.' },
    { term: 'Deep work', definition: 'Professional and academic activities performed in a state of distraction-free concentration that push your cognitive capabilities to their limit. Coined by Cal Newport.', example: 'Writing a 2,000-word essay with no notifications, no phone, and genuine focus for two uninterrupted hours is an example of deep work.' },
    { term: 'Cognitive capacity', definition: 'The mental resources — attention, working memory, concentration — available to you at any given time. These resources are limited and can be depleted.', example: 'After three hours of switching between social media and studying, your cognitive capacity may be too depleted to write a complex academic paragraph.' },
    { term: 'Shallow work', definition: 'Tasks that are logistically easy, often performed while distracted — such as answering messages, scrolling feeds, or reorganising notes. These tasks rarely produce new value or develop your thinking.', example: 'Responding to 40 WhatsApp messages may feel productive but is typically shallow work — it consumes time and attention without building knowledge or skill.' },
  ],

  text: `
    <h3>The Battle for Your Brain</h3>

    <p>There is a fact about modern technology that its designers rarely advertise: the apps on your phone were built by teams of engineers whose entire job was to make you use those apps as much as possible. They studied psychology, habit formation, and neurological reward systems. They ran thousands of experiments to find the exact shade of red for a notification icon, the precise timing of likes appearing, the ideal scroll speed to create a sense of flow. Every design choice was made to capture more of your attention.</p>

    <p>This is the attention economy — a global industry worth trillions of rands, built on the premise that your attention can be converted into advertising revenue.</p>

    <p>For a university student, this creates a serious problem. Academic learning requires a type of thinking that is almost the opposite of what these technologies produce. Reading a journal article demands sustained focus for 20–40 minutes. Writing an academic argument requires holding multiple complex ideas in your mind simultaneously. Understanding a difficult concept requires the patience to sit with confusion — not to scroll past it.</p>

    <p>Cal Newport, a computer scientist and author, calls this kind of thinking "deep work." In his research, he found that the ability to concentrate deeply and produce high-quality cognitive output is becoming increasingly rare in the modern world — and increasingly valuable. The students who develop this ability gain a significant academic and professional advantage.</p>

    <p>The challenge is that deep work is uncomfortable — at least at first. When we sit down to study without our phones, the first minutes often feel unbearable. We feel restless, bored, and anxious. This is not weakness; it is withdrawal. Our brains have been trained to expect constant stimulation. The discomfort passes — usually within 10–15 minutes — if we resist the urge to reach for a device.</p>

    <p>A study of South African university students found that the average uninterrupted study period was 19 minutes before a student checked a device. The students who scored highest on academic assessments had average uninterrupted study periods of over 45 minutes. The relationship between deep focus and academic performance is not a coincidence.</p>

    <p>The good news: this is a trainable skill. Like physical fitness, the capacity for deep focus improves with deliberate practice. And unlike many academic skills, the improvement is rapid — most students report significant gains within two to three weeks of consistent practice.</p>
  `,

  visual: `
    <div class="rt-infographic">
      <div class="rt-infographic-title">Deep Work vs Shallow Work — The Academic Impact</div>
      <div style="overflow-x:auto;">
        <table class="rt-comparison-table">
          <thead>
            <tr>
              <th></th>
              <th style="background:#dcfce7;color:#15803d;">Deep Work</th>
              <th style="background:#fee2e2;color:#991b1b;">Shallow Work</th>
            </tr>
          </thead>
          <tbody>
            <tr><td><strong>Focus level</strong></td><td>Distraction-free, 45+ minutes</td><td>Interrupted, &lt;20 minutes</td></tr>
            <tr><td><strong>Examples</strong></td><td>Writing an essay, reading a journal article, solving a complex problem</td><td>Answering messages, scrolling social media, recopying notes</td></tr>
            <tr><td><strong>What it builds</strong></td><td>Deep understanding, original thinking, complex skills</td><td>Task completion, social connection, surface familiarity</td></tr>
            <tr><td><strong>Academic value</strong></td><td>High — this is where learning happens</td><td>Low — necessary but not sufficient</td></tr>
            <tr><td><strong>How it feels</strong></td><td>Initially uncomfortable, then deeply satisfying</td><td>Easy, stimulating — but often leaves you feeling empty</td></tr>
          </tbody>
        </table>
      </div>
      <div class="rt-chart-question"><strong>Reflect on your own study habits:</strong><ul><li>What percentage of your study time is genuinely "deep work" by this definition?</li><li>What is your biggest source of shallow-work distraction during study sessions?</li><li>What would change in your academic performance if you doubled your deep work time?</li></ul></div>
      <div class="rt-infographic-caption">Based on Newport, C. (2016). <em>Deep Work: Rules for Focused Success in a Distracted World</em>. Grand Central Publishing. Table adapted for educational illustration.</div>
    </div>
  `,

  questions: [
    'The text says technology apps were designed deliberately to capture your attention. Does knowing this change how you feel about using them? Explain your answer — be honest and specific about your own experience.',
    'Look at the comparison table. In your own words, explain the difference between deep work and shallow work. Give one specific example of each from your current studies at university.',
    'The text says the discomfort of sitting without your phone "passes within 10–15 minutes." Have you ever experienced this? Describe what happens in your body and mind when you try to study without checking your phone.',
  ],

  writingPrompt: `Write a personal reflection of about 120 words.

Describe your current study environment honestly:
• Where do you usually study? What devices and apps are present?
• What are your two biggest sources of distraction during a study session?
• Describe one specific time when distraction affected the quality of your academic work
• Propose ONE concrete, specific change you could make to your study environment or habits this week — not a general idea, but something you could actually do tomorrow

This reflection must come from your own experience. It cannot be written by AI because it asks for specific personal details only you know. Write in the first person ("I study in...", "My biggest distraction is...", "Last week I...").`,
};

export const unit04 = {
  id: 'u4', badge: 'Unit 4',
  title: 'The Attention Economy & Deep Work',
  phase: 'Phase 1 — Understanding the Landscape',

  html: () => `
    <h1>Unit 4: The Attention Economy & Deep Work</h1>
    <p class="lead">Your attention is the most valuable resource you have as a student — and there is a trillion-rand industry designed to extract it from you. This unit is about understanding that system and building the capacity to think deeply despite it.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Explain how the attention economy works and why it affects academic learning</li>
        <li>Distinguish between deep work and shallow work with concrete examples</li>
        <li>Read and interpret a comparison table as an academic source</li>
        <li>Write a personal reflection that is specific, honest, and uses first-person academic voice</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>Cal Newport is a computer scientist who studies productivity and deep thinking. In this TEDx talk he makes a radical argument — one that will feel uncomfortable if you are attached to social media. Watch with an open mind and consider where you agree and disagree.</p>
    <div id="ivp-unit4" data-video-key="unit4" class="ivp-container"></div>

    ${quiz('q4a',
      'Newport argues that "deep work" — focused, distraction-free thinking — is becoming rarer and more valuable at the same time. What does this mean for your career as an educator?',
      [
        'Teachers do not need deep work skills because teaching is a social profession',
        'The ability to think deeply and produce high-quality work will distinguish excellent teachers from average ones',
        'Technology will eventually replace the need for deep thinking in education',
        'Deep work only matters for researchers, not for classroom teachers',
      ], 1,
      '✅ Teaching looks like a social profession — and it is. But behind every excellent lesson is deep preparation work: designing learning activities, studying content deeply, giving thoughtful written feedback, reading research. These all require sustained, focused thought. Teachers who cannot do deep work produce shallow lessons. Newport would say your capacity for deep focus is one of the most important professional skills you can develop.'
    )}

    ${quiz('q4b',
      'A student says: "I study better with music and my phone nearby — I check it quickly when I feel stuck and it helps me refocus." Based on what you have learned, what is most likely happening?',
      [
        'She has found her ideal study method and should continue it',
        'The phone checks feel helpful but are actually fragmenting her attention and preventing deep focus',
        'Background music always improves academic performance',
        'Checking the phone is a valid study strategy if done quickly',
      ], 1,
      '✅ This is one of the most common study myths. Research consistently shows that even very brief interruptions — under 30 seconds — break the state of deep focus and require 15–20 minutes to fully rebuild. The phone checks feel helpful because they relieve the discomfort of concentration — but that discomfort is actually the sign that learning is happening. The relief of checking your phone is the relief of stopping learning.'
    )}

    <h2>The Neuroscience of Distraction</h2>
    <p>When you switch from studying to checking a notification, your brain does not simply pause and restart. It carries a "residue" of the previous task into the next one, and vice versa. This residue degrades your performance on both tasks. Researchers call this "attention residue" — and it explains why students who study in 20-minute bursts with regular phone checks perform significantly worse than those who study for 60 uninterrupted minutes, even if their total study time is the same.</p>

    <div class="concept-card">
      <div class="concept-card-label">The 4-Step Deep Work Practice</div>
      <p><strong>1. Location:</strong> Choose a space associated only with study — not your bed, not your usual social space.</p>
      <p><strong>2. Duration:</strong> Commit to a specific time block — start with 30 minutes, build to 90 minutes over several weeks.</p>
      <p><strong>3. Rules:</strong> Phone off or in another room. One tab open. One task defined before you start.</p>
      <p><strong>4. Recovery:</strong> After each deep work block, take a genuine break — walk, eat, rest. Do not fill it with social media. Your brain needs real recovery, not more stimulation.</p>
    </div>

    <h2>For Your Future Classroom</h2>
    <p>The learners you will teach are growing up in an attention economy designed for adults. Children's brains — still developing executive function — are especially vulnerable to its effects. Research from the HSRC shows that South African learners show declining sustained attention spans in reading assessments over the past decade, correlating with increased smartphone access.</p>
    <p>As a teacher, you cannot solve this alone. But you can model deep attention, design learning that requires sustained focus, and explicitly teach your learners about the system that is competing for their minds.</p>

    <h2>Reading & Writing Activity</h2>
    <p>This unit's reading is the most directly personal so far — it asks you to reflect honestly on your own study habits. The writing task cannot be completed by AI because it requires specific personal details only you know.</p>

    ${readingTask('rt-u4', RT_CONFIG)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"The ability to perform deep work is becoming increasingly rare — at exactly the same time it is becoming increasingly valuable. The few who cultivate this skill will thrive. This is not an accident. And it is not too late to become one of them."<br><span style="font-size:13px;opacity:.6;">— Cal Newport, Deep Work (2016)</span></p>
    </div>
  `,
};
