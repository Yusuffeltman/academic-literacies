// content/sessions/sessions.js
// ─────────────────────────────────────────────
// All session plans: 9 contact (90 min) + 9 tutorial (45 min)
// Tied to Units 1–9 and their pre-work.
// Flipped classroom: module content done BEFORE the session.
// ─────────────────────────────────────────────

export const SESSIONS = {

  // ════════════════════════════════════════════
  // PHASE 1 — CONTACT SESSIONS
  // ════════════════════════════════════════════

  c1: {
    id: 'c1', type: 'contact', unit: 'u1',
    phase: 'Phase 1 — Unit 1',
    title: 'AI in Education: What Does It Mean for Me?',
    subtitle: 'From watching to thinking — examining AI through the lens of South African teaching',
    tags: ['Think–Pair–Share', 'Process Writing', 'Pomodoro', 'Gallery Walk'],
    goal: 'Students move beyond passive reception of the Sal Khan TED talk to actively positioning themselves in relation to AI as future teachers. They leave with a drafted personal AI policy grounded in their own context.',

    preWork: [
      { item: 'Unit 1 Module', detail: 'Full completion — video (with AI chat), reading task, vocabulary activities, and all three interactive pause questions' },
      { item: 'Sal Khan TED talk', detail: 'Watch the full video, not just skimming. Students should be able to name one specific argument Sal Khan makes' },
      { item: 'Unit 1 writing task', detail: 'First attempt at the writing prompt submitted — does not need to be polished' },
    ],
    preWorkNote: 'If a student has not done the pre-work, do NOT re-teach the content in the session. Ask them to sit with a peer who has done it and catch up during the first Think-Pair-Share.',

    blocks: [
      {
        time: '0:00', duration: 5, type: 'activation',
        title: 'Silent Arrival Writing',
        description: 'Students enter and immediately write — no discussion, no instructions needed yet. The prompt is visible on the board.',
        facilitatorScript: 'Write one sentence: "The idea from this week\'s module that I\'m still thinking about is…" No talking yet. Just write.',
        materials: ['Sticky notes or scrap paper', 'Board/projector with prompt'],
      },
      {
        time: '0:05', duration: 15, type: 'think-pair',
        title: 'AI as a Teacher — Three Angles',
        description: 'Think-Pair-Share structured around three positions: AI as a tool, as a colleague, as a risk.',
        steps: [
          'Think (3 min): Each student identifies one opportunity and one risk of AI in their specific teaching subject area',
          'Pair (5 min): Find a partner from a different subject specialisation. Compare — what does AI mean differently across subjects?',
          'Share (7 min): Four pairs share. Facilitator collects tensions on the board — do not resolve them yet',
        ],
        facilitatorScript: 'We are not debating whether AI is good or bad. We are noticing that the same tool means different things in a mathematics classroom, a language classroom, and a life skills classroom.',
      },
      {
        time: '0:20', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Draft Your Personal AI Policy',
        description: 'A focused 25-minute Pomodoro writing block. Students write a structured personal AI policy — not a generic one, but one grounded in their specific subject and school context.',
        steps: [
          'Write 3 things you WILL use AI for as a student-teacher (with a reason for each)',
          'Write 3 things you will NOT use AI for (with a reason for each)',
          'Write one sentence explaining what principle guides the difference between the two lists',
        ],
        facilitatorScript: 'Set the Pomodoro. No phones, no browsing, no discussion. Just writing. This is your first experience of deep work in this module — notice what happens in your mind.',
        materials: ['Pomodoro timer (class display)', 'Writing prompt on board'],
      },
      {
        time: '0:50', duration: 5, type: 'break',
        title: 'Break + Gallery Walk Setup',
        description: 'Students post their AI policies on the wall (or shared digital space). Facilitator scans for interesting contrasts before discussion.',
      },
      {
        time: '0:55', duration: 20, type: 'gallery-walk',
        title: 'Gallery Walk — Policy Wall',
        description: 'Students circulate, read two other policies, and leave one sticky note comment on each: something they agree with strongly, or a question the policy raises.',
        steps: [
          'Each student reads at least 3 other policies (7 min)',
          'Leave one sticky comment on each: "I hadn\'t thought of..." or "This made me wonder..."',
          'Return to your own policy and read the comments you received (3 min)',
          'Whole class: facilitator picks 3 contrasting policies — "These two policies disagree about X. Let\'s understand why."',
        ],
        materials: ['Posted policies (wall or Jamboard)', 'Sticky notes in 2 colours', 'Markers'],
      },
      {
        time: '1:15', duration: 10, type: 'discussion',
        title: 'Synthesis — The Non-Negotiables',
        description: 'Whole-class synthesis. What principles emerged across the policies? What would a class-agreed AI policy look like?',
        facilitatorScript: 'We are not trying to agree on everything. We are trying to name the principles where there IS broad agreement — and the questions where there isn\'t. Both are valuable.',
      },
      {
        time: '1:25', duration: 5, type: 'process-write',
        title: 'Exit Ticket',
        description: 'Individual written exit. Students revise one element of their AI policy based on what they heard in the gallery walk.',
      },
    ],

    processWritingStages: [
      { icon: '💭', title: 'Pre-write', description: 'Activation and idea generation before committing to a draft. No pressure on quality — capture thinking.', time: '5 min', prompts: ['What do I already know about this?', 'What am I uncertain about?', 'Who am I writing for and what do they need?'] },
      { icon: '✍️', title: 'First Draft', description: 'Pomodoro block — continuous writing without editing. Get ideas down. Quality comes later.', time: '25 min (Pomodoro)', prompts: ['Just write — don\'t stop to edit', 'Write what you think, even if you\'re not sure it\'s right', 'You can always change it in the revision stage'] },
      { icon: '🤝', title: 'Peer Feedback', description: 'Structured exchange using sentence starters. Feedback is specific, not vague.', time: '10 min', feedbackStems: ['The strongest idea in this piece is…', 'I was unclear about…', 'The one thing I would add is…', 'You haven\'t yet addressed…'] },
      { icon: '🔄', title: 'Revision', description: 'Deliberate revision using feedback received. Not proofreading — reconsidering ideas and structure.', time: '10–15 min', prompts: ['What am I going to change and why?', 'What feedback do I disagree with — and why?', 'What does my writing say that I didn\'t intend?'] },
      { icon: '🪞', title: 'Reflect', description: 'Metacognitive reflection on the writing process itself.', time: '5 min', prompts: ['What changed between my draft and revision?', 'What strategy worked best for me today?', 'What do I want to do differently next time?'] },
    ],

    resources: [
      { icon: '🖥️', name: 'Sal Khan TED 2023 — pre-watched', note: 'Students should be able to discuss specific arguments, not just general impressions' },
      { icon: '📋', name: 'AI Policy template (optional)', note: 'Provide a loose structure — 3 will / 3 won\'t / 1 principle — but not a fill-in form' },
      { icon: '🍅', name: 'Class Pomodoro display', note: 'Project the timer on the screen so all students work to the same clock' },
      { icon: '🗒️', name: 'Sticky notes (2 colours)', note: 'One colour for agreements, one for questions' },
    ],

    exitTicket: {
      prompt: 'Students submit one revised sentence from their AI policy that changed as a result of what they heard in the gallery walk — and one sentence explaining why they changed it.',
      stems: ['I changed my policy to say… because…', 'I heard something today that made me reconsider…'],
      time: '5 minutes',
      collect: 'On exit (paper slip or typed). Read before the tutorial session to identify who needs targeted support.',
    },

    facilitatorNotes: [
      'The goal is NOT consensus. A room with genuine disagreement about AI policy is more educationally productive than a room that has been nudged toward one answer.',
      'If a student says "AI is just a tool like a calculator" — probe: What can the calculator not do? What can it do that the teacher cannot? Does that change the analogy?',
      'South African context matters here: rural students, students in load-shedding areas, students without reliable internet — these constraints should appear in the policies, not be ignored.',
      'Assessment 1 link: remind students that their platforms observation log starts now. They are beginning to be researchers.',
    ],

    differentiations: [
      { for: 'Students with limited English proficiency', action: 'Allow AI policy to be drafted in home language first, then translated. The thinking is what matters — not the language of the draft.' },
      { for: 'Advanced students who finish early', action: 'Write a second, more challenging scenario: You discover a student has used ChatGPT to complete a major assignment. Your school has no AI policy. What do you do?' },
      { for: 'Students who didn\'t complete pre-work', action: 'Pair with a pre-work-complete student. Do NOT re-teach the content — it rewards not doing the work and penalises those who did.' },
    ],
  },

  c2: {
    id: 'c2', type: 'contact', unit: 'u2',
    phase: 'Phase 1 — Unit 2',
    title: 'Your Algorithm Is Watching You',
    subtitle: 'A live filter bubble audit — investigating your own personalised information environment',
    tags: ['Live Algorithm Audit', 'Process Writing', 'Pomodoro', 'Peer Feedback'],
    goal: 'Students investigate their own real digital information environment, generating primary data from their own devices that they then process through a structured writing protocol. They leave with a drafted observation paragraph and a clear personal change commitment.',

    preWork: [
      { item: 'Unit 2 Module', detail: 'Eli Pariser TED + reading task + filter bubble infographic visual activity' },
      { item: 'Vocabulary terms', detail: 'Students can explain: algorithm, filter bubble, curation, confirmation bias without looking them up' },
      { item: 'Writing task draft', detail: 'At least one paragraph written — even if rough' },
    ],

    blocks: [
      {
        time: '0:00', duration: 8, type: 'activation',
        title: 'Two-Minute Search Comparison',
        description: 'Whole class searches the same term simultaneously. Results are compared in real time — illustrating personalisation before any theory.',
        steps: [
          'Facilitator says: "Everyone search: South African education news"',
          'Students photograph or note their first 5 results',
          'Quick show of hands: who got a result about universities? Basic education? Teacher unions? Exam results?',
          'Ask: Why are we all getting different results for the same search?',
        ],
        facilitatorScript: 'Don\'t explain what\'s happening yet. Let the class name it. Someone will say "algorithm" — then ask: so what does the algorithm think YOU care about? How do you know?',
        materials: ['Students\' phones or laptops', 'Projector (optional: show facilitator\'s own results)'],
      },
      {
        time: '0:08', duration: 15, type: 'live-demo',
        title: 'Live Algorithm Audit',
        description: 'Structured 10-minute personal audit. Students investigate their own phones/devices systematically using a provided observation framework.',
        steps: [
          'Open YouTube: what appears on your home page without searching? Note 3 categories.',
          'Open Google News or your news app: what topics appear first? What is absent?',
          'Check your last 5 social media opens: what was the first piece of content you saw?',
          'Key question: Would a teacher from a different province, different age, different race see the same content? How do you know?',
        ],
        materials: ['Observation audit worksheet (structured grid)', 'Students\' own devices'],
        facilitatorScript: 'You are doing primary research on yourself right now. What you find is data — your data. Write it down as an observer, not as a judge.',
      },
      {
        time: '0:23', duration: 27, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Draft Your Filter Bubble Observation',
        description: '25-minute Pomodoro: transform your audit data into a structured academic observation paragraph.',
        steps: [
          'Opening sentence: state your platform and your finding directly',
          'Evidence: give 2–3 specific examples from your audit (exact content you saw)',
          'Interpretation: what does this pattern suggest about what the algorithm has learned about you?',
          'Implication: what professional risk does this create for a teacher who only uses this platform for news?',
        ],
        facilitatorScript: 'This is process writing Stage 2 — first draft. Get it down. Don\'t edit as you go. You have 25 minutes. The clock is running.',
        materials: ['Audit data from previous activity', 'Pomodoro timer'],
      },
      {
        time: '0:50', duration: 20, type: 'peer-feedback',
        title: 'Structured Peer Feedback Exchange',
        description: 'Pairs exchange drafts. Feedback uses specific sentence starters — no vague "it\'s good" or "needs work."',
        steps: [
          'Exchange drafts with a peer (not your closest friend — someone who will push you)',
          'Reader reads once for overall impression, once for specific feedback (3 min)',
          'Give feedback using only the provided sentence starters (5 min)',
          'Receiver listens without defending. Takes notes. Asks one clarifying question only (2 min)',
          'Reverse — repeat (10 min)',
        ],
        materials: ['Sentence starter cards (printed or on board)', 'Peer drafts'],
        facilitatorScript: 'Your job as a reader is to tell your partner what you noticed, not what they should do. Say "I was confused at line 3 because..." not "you should rewrite line 3."',
      },
      {
        time: '1:10', duration: 10, type: 'revision',
        title: 'Five-Minute Targeted Revision',
        description: 'Students make ONE specific change to their paragraph based on the most useful feedback they received. Not a rewrite — a deliberate revision.',
        facilitatorScript: 'You have 10 minutes. Make one change that will make this paragraph more honest, more specific, or more analytical. Not more words — better words.',
      },
      {
        time: '1:20', duration: 10, type: 'discussion',
        title: 'Class Synthesis — The Teacher\'s Filter Bubble Problem',
        description: 'Discussion connecting personal filter bubble to professional responsibility.',
        facilitatorScript: 'If your news comes from an algorithm that only shows you content you already agree with, what happens to your professional judgement as a teacher? What current events would you miss? What might your learners be seeing that you are not?',
      },
    ],

    processWritingStages: [
      { icon: '🔍', title: 'Observe (Primary Research)', description: 'Collect your own data first. Your device is a primary source.', time: '10 min', prompts: ['What specific content am I seeing?', 'What is absent — what am I NOT seeing?', 'What does this pattern suggest?'] },
      { icon: '✍️', title: 'First Draft (Pomodoro)', description: 'Uninterrupted writing from your observation data to an academic paragraph.', time: '25 min', prompts: ['Start with what you found, not with what Pariser said', 'Evidence before interpretation', 'Be specific — name the actual content you saw'] },
      { icon: '🤝', title: 'Peer Feedback', description: 'Your peer reads your paragraph as your first real academic reader.', time: '10 min', feedbackStems: ['Your strongest specific evidence is…', 'I was confused by…', 'You claim X but your evidence shows Y — there\'s a gap here…', 'The implication for teaching is not yet clear because…'] },
      { icon: '🔄', title: 'Targeted Revision', description: 'One deliberate change. Not a rewrite — a precise intervention.', time: '10 min', prompts: ['What is the weakest sentence?', 'Where am I most vague?', 'What would make this paragraph publishable in a student journal?'] },
      { icon: '🪞', title: 'Metacognitive Close', description: 'What did you learn about your own filter bubble — and about academic writing?', time: '5 min', aiPrompt: 'You are an academic writing tutor. A first-year education student has written a paragraph about their own social media filter bubble. Evaluate their observation specificity (do they use concrete examples?), their analytical depth (do they interpret, not just describe?), and their academic register. Be specific and honest. Quote their words.' },
    ],

    resources: [
      { icon: '📱', name: 'Students\' own devices', note: 'This session requires phones/laptops — the data is personal and live' },
      { icon: '📋', name: 'Algorithm audit worksheet', note: 'A grid with columns: Platform / Content I saw / What was absent / What algorithm assumption does this reveal?' },
      { icon: '🗒️', name: 'Peer feedback sentence starters (printed cards)', note: 'Laminate these and use them across the module' },
      { icon: '🍅', name: 'Class Pomodoro display', note: '25 minutes continuous writing — class timer' },
    ],

    exitTicket: {
      prompt: 'Students write one sentence: "The one thing I will change about how I search for professional information is… because…"',
      stems: ['The one change I will make is…', 'I now understand that my algorithm…'],
      time: '3 minutes',
      collect: 'Paper slip. Look for vague versus specific commitments — use in tutorial to target follow-up.',
    },

    facilitatorNotes: [
      'The audit is the most powerful part of this session. Students who see their own filter bubble are more convinced than any amount of theory.',
      'Some students may feel defensive about their social media use. Don\'t pathologise it — redirect to professional consequences: "As a teacher, what information do you need that this algorithm won\'t give you?"',
      'The peer feedback works best when pairs are from different backgrounds or subject areas — different filters produce different gaps.',
      'Assessment 1 link: students are now actively observing their platforms. Their audit data today is the beginning of their observation log.',
    ],

    differentiations: [
      { for: 'Students without smartphones or data', action: 'Pair with a data-sharing student, or use the computer lab. The audit can be done on any device — the principle is the same.' },
      { for: 'Students who struggle with paragraph structure', action: 'Provide the TEEL frame explicitly: Topic sentence / Evidence / Explanation / Link. They fill in their data.' },
      { for: 'Advanced students', action: 'Require their paragraph to identify the specific algorithm mechanism that produced their filter bubble — not just that it exists, but how it works.' },
    ],
  },

  c3: {
    id: 'c3', type: 'contact', unit: 'u3',
    phase: 'Phase 1 — Unit 3',
    title: 'Thinking About Your Thinking',
    subtitle: 'System 1 in action — experiencing cognitive bias and designing around it',
    tags: ['Bias Games', 'SIFT Practice', 'Process Writing', 'Assessment 1 Prep'],
    goal: 'Students experience System 1 thinking failures in real time, then practise the discipline of activating System 2 through the SIFT framework. They produce a first draft SIFT analysis that feeds directly into Assessment 1.',

    preWork: [
      { item: 'Unit 3 Module', detail: 'Veritasium System 1/2 video + reading task + three-questions visual task on misinformation types' },
      { item: 'SIFT framework', detail: 'Students can explain all four steps without referring to notes' },
      { item: 'Personal claim', detail: 'Students should arrive with one false or misleading claim they have personally encountered (social media, WhatsApp, family conversation)' },
    ],

    blocks: [
      {
        time: '0:00', duration: 12, type: 'activation',
        title: 'Cognitive Bias Games',
        description: 'Fast-paced System 1 traps experienced live. Facilitator presents four classic bias tests. Students respond, then are shown the correct answers.',
        steps: [
          'Bat and ball problem: "A bat and ball cost $1.10 total. The bat costs $1 more than the ball. What does the ball cost?" Hands up for 10 cents. Reveal: 5 cents. Discuss why.',
          'Stroop test: show colour words written in the wrong colour — read the colour of the ink, not the word. Time how long it takes.',
          'Three education claims: show three claims (1 true, 2 misleading). Students react with thumbs up/down. Reveal correct answers.',
          'After each: "What made that feel true? What should have slowed you down?"',
        ],
        facilitatorScript: 'I am not testing your intelligence. I am showing you that the same thinking system that got humans through 200,000 years of survival also makes us share fake news. Every person in this room is vulnerable to this. Including me.',
        materials: ['Slides with bias tests', 'Response cards or hands-up'],
      },
      {
        time: '0:12', duration: 18, type: 'live-demo',
        title: 'Live SIFT Demonstration',
        description: 'Facilitator models a complete SIFT analysis live, narrating every decision — including the moments of uncertainty.',
        steps: [
          'Choose a real, recent education claim that circulated on South African social media (confirm in advance)',
          'Model S: "My first reaction is X. Now I\'m going to stop that reaction deliberately."',
          'Model I: Open a new tab, lateral read the source. Narrate what you find and what it means.',
          'Model F: "Now I\'m looking for the best coverage — not just any coverage."',
          'Model T: "Now I\'m tracing backwards — where did this claim actually originate?"',
          'Reveal the verdict. Ask: what surprised you about this process?',
        ],
        facilitatorScript: 'I am going to think out loud. Every decision, every moment of not knowing, every tab I open. You are learning the process, not just the result.',
        materials: ['Projector with browser', 'Pre-selected claim (tested in advance)'],
      },
      {
        time: '0:30', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Your SIFT Analysis — First Draft',
        description: '25-minute Pomodoro: students apply the full SIFT framework to the claim they brought from their own experience.',
        steps: [
          'S: Write your first reaction. Now deliberately pause it.',
          'I: Open a tab. Lateral read the source. Write what you found.',
          'F: Find 2 better coverage sources. Write what they say.',
          'T: Trace to origin. Write where the claim actually came from.',
          'Verdict: True / Misleading / False / Unverifiable — with one sentence of justification.',
        ],
        materials: ['SIFT worksheet (optional structure)', 'Students\' devices', 'Pomodoro timer'],
      },
      {
        time: '1:00', duration: 15, type: 'peer-feedback',
        title: 'SIFT Analysis Peer Exchange',
        description: 'Partners swap SIFT analyses. Feedback focuses on one key question: "Did they actually trace to the upstream source, or did they stop one step too early?"',
        steps: [
          'Exchange analyses. Read carefully — this takes 5 minutes minimum.',
          'Give one specific comment: "Your strongest SIFT step was... because..." and "You stopped too early at... because..."',
          'Return analyses. 3-minute individual revision.',
        ],
        facilitatorScript: 'The most common mistake in SIFT is stopping at F — finding coverage — without ever doing T — tracing to origin. Ask yourself and your partner: do we actually know where this started?',
      },
      {
        time: '1:15', duration: 10, type: 'workshop',
        title: 'Assessment 1 Connection',
        description: 'Brief facilitator-led connection between today\'s SIFT practice and the Assessment 1 brief. Students leave knowing exactly how today\'s work feeds into the assessment.',
        facilitatorScript: 'The SIFT analysis you just drafted is the core skill of Assessment 1\'s Claim Verdict — but applied to a platform rather than a single claim. Hold onto today\'s work. You will use it.',
      },
      {
        time: '1:25', duration: 5, type: 'process-write',
        title: 'Exit Ticket',
        description: 'One sentence: the SIFT step I executed least well today was... because... My plan to improve it is...',
      },
    ],

    processWritingStages: [
      { icon: '⏸️', title: 'Stop (Pre-write)', description: 'Before writing anything, document your gut reaction. This is your System 1 on record.', time: '2 min', prompts: ['What is my first instinct about this claim?', 'What emotion does it trigger?', 'Why might someone share this without checking?'] },
      { icon: '🔍', title: 'Investigate & Find (Research)', description: 'Your writing comes AFTER your research. Never the reverse.', time: '15 min', prompts: ['What did lateral reading reveal about the source?', 'What does better coverage say?', 'Where did this actually originate?'] },
      { icon: '✍️', title: 'Draft Verdict (Pomodoro)', description: 'Write your verdict with evidence. The verdict comes last — after the evidence, never before.', time: '10 min', prompts: ['What is my verdict?', 'What is my strongest piece of evidence?', 'What would change my verdict?'] },
      { icon: '🤝', title: 'Peer Challenge', description: 'Your partner tries to find a flaw in your SIFT process — not in your verdict, in how you got there.', time: '8 min', feedbackStems: ['You stopped the trace too early because…', 'The source you used for "Find better coverage" is not actually better because…', 'Your verdict would change if you saw…'] },
      { icon: '🔄', title: 'Final Revision', description: 'One targeted revision addressing the specific gap your partner identified.', time: '5 min', aiPrompt: 'You are a media literacy tutor. A first-year education student has written a SIFT analysis. Evaluate: Did they document all four SIFT steps? Did they actually trace to the upstream source or stop early? Is their verdict supported by the evidence they found, or does it outrun the evidence? Be specific. Quote their analysis.' },
    ],

    resources: [
      { icon: '🎯', name: 'Bias game slides', note: 'Prepare in advance. Include: bat/ball problem, Stroop test, 3 education claims (1 true, 2 misleading). Test the claims yourself first.' },
      { icon: '📰', name: 'Pre-selected SA education claim for live demo', note: 'Choose from Africa Check archive — something recent, relevant to SA teachers, with a clear traceable origin.' },
      { icon: '📋', name: 'SIFT worksheet (optional)', note: 'Four sections, one per step. Not a form — a scaffold. Students should outgrow it by Unit 7.' },
      { icon: '🌐', name: 'Africa Check (africacheck.org)', note: 'Most important SA fact-checking resource. Demonstrate how to use it in the live demo.' },
    ],

    exitTicket: {
      prompt: 'The SIFT step I executed least well today was... because... My specific plan to improve it before the next session is...',
      stems: ['The step I struggle with is T because…', 'Next time I will improve by…'],
      time: '5 minutes',
      collect: 'These exit tickets should be sorted by which step students struggle with — use in Tutorial 3 to target specific practice.',
    },

    facilitatorNotes: [
      'The bias games only work if you move fast. Don\'t let students argue about the correct answer before you reveal it — the reveal is more powerful than the anticipation.',
      'The live demo is the heart of this session. Narrate every uncertain moment, every dead end, every tab. The process is the lesson, not the verdict.',
      'Expect some students to feel that SIFT is "too much work." Acknowledge it — then ask: what is the cost of NOT doing it when you are a teacher?',
      'Assessment 1 connection: if you have not given students their role assignments for Assessment 1 yet, this is the session to do it.',
    ],

    differentiations: [
      { for: 'Students who struggle to find a personal claim', action: 'Provide 3 optional claims from Africa Check\'s archive — real, recent, SA-relevant.' },
      { for: 'Students who finish the SIFT analysis early', action: 'Challenge: Find the MOMENT when the claim first appeared online. Not just the source — the timestamp of the first appearance.' },
      { for: 'Students who find the live demo too fast', action: 'Record the live demo (with permission). Make the recording available for tutorial review.' },
    ],
  },

  // ════════════════════════════════════════════
  // PHASE 2a — CONTACT SESSIONS (Units 4–6)
  // ════════════════════════════════════════════

  c4: {
    id: 'c4', type: 'contact', unit: 'u4',
    phase: 'Phase 2a — Unit 4',
    title: 'Deep Work in a Distracted World',
    subtitle: 'Experience focus, design your environment, build a study system',
    tags: ['Attention Experiment', 'Deep Work Design', 'Process Writing', 'Peer Coaching'],
    goal: 'Students experience the difference between deep and fragmented work in a controlled experiment, then design a personalised deep work protocol grounded in their actual study context.',

    preWork: [
      { item: 'Unit 4 Module', detail: 'Cal Newport TED + reading task + attention economy infographic visual task' },
      { item: 'Vocabulary', detail: 'Students can explain: attention residue, deep work, shallow work, cognitive residue' },
      { item: 'Study environment audit', detail: 'Students should have observed their own study environment and noted their 3 most common distractions' },
    ],

    blocks: [
      {
        time: '0:00', duration: 20, type: 'live-demo',
        title: 'The Attention Experiment — Deep vs Fragmented',
        description: 'A controlled two-condition experiment. Students complete the same cognitive task under two conditions and compare their own output.',
        steps: [
          'Condition A (10 min): Pomodoro silent reading — read a dense 2-page education text. Phones face-down, no social media. Count how many paragraphs you retained.',
          'Brief break (2 min). Then: Condition B (8 min): Same difficulty text — but with permission to check phones every 2 minutes.',
          'Compare: How many paragraphs retained? How did it feel? Was the second text "easier" to read?',
          'Data collection: what was the retention difference for the class?',
        ],
        materials: ['Two 2-page education texts (same difficulty level, different content)', 'Phones', 'Retention count worksheet'],
        facilitatorScript: 'We are not making a moral judgement about phone use. We are measuring its cognitive cost. Let the data speak.',
      },
      {
        time: '0:20', duration: 25, type: 'pomodoro',
        pomMinutes: 20,
        title: 'Deep Work Design Sprint',
        description: '20-minute Pomodoro: each student designs their personal deep work protocol — specific, honest, grounded in their actual constraints.',
        steps: [
          'Where will you study? Be specific — not "at home" but which room, which chair, which time.',
          'What is your biggest attentional enemy? What specifically will you change?',
          'Design a 90-minute study block: what will you do in each 25-minute Pomodoro? What is the break activity?',
          'What is one social media rule you will commit to for the next two weeks?',
        ],
        facilitatorScript: 'Be honest with yourself. "I\'ll study in a silent room with no phone" is not a plan — it\'s a wish. What will you actually do when you\'re in your real environment with real distractions?',
      },
      {
        time: '0:45', duration: 15, type: 'peer-feedback',
        title: 'Peer Protocol Review',
        description: 'Students share their deep work protocols with a partner who knows their living situation. Peer acts as a "reality checker."',
        steps: [
          'Exchange protocols. Read critically: is this achievable in your partner\'s actual context?',
          'Give one "this will work because..." and one "this might fail because..." with a specific suggestion',
          'Revise: make one specific change to make the protocol more realistic',
        ],
        facilitatorScript: 'The best accountability partner is someone who knows your actual life — not an idealised version of it.',
      },
      {
        time: '1:00', duration: 20, type: 'discussion',
        title: 'The SA Context Question',
        description: 'Structured discussion: How does deep work work when you live in a shared space, have load-shedding, don\'t have reliable WiFi, have family obligations?',
        facilitatorScript: 'Newport\'s advice is written for a Georgetown professor with an office door. What does it look like for a student in a shared flat in Johannesburg with load-shedding? What stays the same? What must change?',
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Commitment Letter',
        description: 'Students write a brief commitment letter to themselves. Not submitted — kept personally.',
        facilitatorScript: 'This is for you, not for marks. Write what you actually intend to do. You\'ll revisit it at the start of the next session.',
      },
    ],

    processWritingStages: [
      { icon: '📊', title: 'Data Collection', description: 'Observe your own attention — measure it, don\'t just feel it.', time: '10 min', prompts: ['What did the experiment show?', 'What is my actual biggest distraction (not the one I\'m embarrassed by)?'] },
      { icon: '🎯', title: 'Protocol Design', description: 'Write a system, not an aspiration.', time: '20 min (Pomodoro)', prompts: ['What specifically will change?', 'What will I do when the distraction arrives?', 'What is the minimum viable deep work session I can commit to?'] },
      { icon: '🤝', title: 'Reality Check (Peer)', description: 'Your partner stress-tests your protocol against your real life.', time: '10 min', feedbackStems: ['This is realistic because…', 'This will break down when…', 'One thing you haven\'t accounted for is…'] },
      { icon: '📝', title: 'Commitment Draft', description: 'Write what you will actually do — not what sounds good in a session.', time: '8 min', prompts: ['What am I committing to for the next 14 days?', 'How will I measure whether it worked?'] },
    ],

    resources: [
      { icon: '📄', name: 'Two matched reading texts (equal difficulty)', note: 'Use extracts from education research — relevant and challenging. Prepare before the session.' },
      { icon: '📊', name: 'Retention count worksheet', note: 'Simple grid: how many paragraphs did you recall in Condition A vs B?' },
      { icon: '🍅', name: 'Pomodoro timer', note: 'The Pomodoro is the deep work tool — model it throughout the session' },
    ],

    exitTicket: {
      prompt: 'Name one thing you will change about your study environment before the next session. Then name the specific date and time when you will try your new deep work protocol for the first time.',
      stems: ['The change I\'m making is…', 'I will first try this on…'],
      time: '3 minutes',
      collect: 'Collect and return at the tutorial — ask: did you try it? What happened?',
    },

    facilitatorNotes: [
      'The attention experiment is worth doing even if results are mixed. Inconclusive data is still data — ask: why might the results vary? What does that tell us about attention?',
      'Be careful not to shame students who struggle with focus. The message is: this is hard for everyone; the question is what system you build around it.',
      'Load-shedding is a genuine constraint that Newport does not address. Acknowledge it directly and ask the class to generate solutions — this validates their experience and produces more useful insights.',
    ],

    differentiations: [
      { for: 'Students who find the experiment humiliating (e.g. very low retention)', action: 'Frame the data as a class average, not individual — protect dignity while making the point.' },
      { for: 'Students in high-distraction living situations', action: 'Focus on "distraction-reduced" rather than "distraction-free" as the achievable standard.' },
    ],
  },

  c5: {
    id: 'c5', type: 'contact', unit: 'u5',
    phase: 'Phase 2a — Unit 5',
    title: 'Finding What Actually Exists',
    subtitle: 'Live Scopus search practice — from zero to a verified, annotated source list',
    tags: ['Live Scopus', 'Source Annotation', 'Gallery Walk', 'Assessment 2 Prep'],
    goal: 'Students execute a complete Scopus search live, evaluate three sources against the hierarchy, write one structured annotation, and leave with a starting source list for Assessment 2.',

    preWork: [
      { item: 'Unit 5 Module', detail: 'Peer review video + source hierarchy reading + comparison table visual task' },
      { item: 'University library access', detail: 'Students must have their institutional Scopus login working BEFORE the session — test this in advance' },
      { item: 'Assessment 2 topic', detail: 'Students should have a preliminary topic in mind. It does not need to be final.' },
    ],
    preWorkNote: 'Scopus access is non-negotiable for this session. If institutional access is not available, use JSTOR or Google Scholar with academic domain filters as alternatives. Test this before the session.',

    blocks: [
      {
        time: '0:00', duration: 8, type: 'live-demo',
        title: 'The Bad Search vs The Good Search',
        description: 'Facilitator demonstrates two searches on the same topic — one poorly designed, one well-designed — and shows the difference in results.',
        steps: [
          'Bad search: "teaching and learning in South Africa" — show the result count and quality',
          'Good search: "formative assessment secondary school South Africa 2018–2024" — show the result count and quality',
          'Ask: what specifically made the difference? What did I add?',
          'Key principle: specificity is everything. Context + population + variable + time range.',
        ],
        facilitatorScript: 'Both searches took the same amount of time. One produced unusable noise. One produced 47 peer-reviewed, relevant papers. The difference is how I thought BEFORE I searched.',
      },
      {
        time: '0:08', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Live Scopus Search — Find Your 3',
        description: '25-minute Pomodoro: students execute a real Scopus search for their Assessment 2 topic and identify 3 peer-reviewed sources.',
        steps: [
          'Design your search query using the formula: [Topic] + [Context] + [Population] + [Year range]',
          'Run the search. If >200 results, add one more filter. If <10, broaden one filter.',
          'Evaluate your top 5 results against the source hierarchy (Unit 5). Select the 3 strongest.',
          'For each: note the citation, abstract, and why you chose it over the others.',
          'Save all 3 to Zotero.',
        ],
        materials: ['Scopus access', 'Zotero installed', 'Assessment 2 topic (provisional)'],
        facilitatorScript: 'You are finding REAL sources that you WILL use in Assessment 2. This is not an exercise. The 25 minutes counts.',
      },
      {
        time: '0:38', duration: 20, type: 'process-write',
        title: 'Write One Structured Annotation',
        description: 'Students write one formal annotation for their strongest source using the three-sentence structure.',
        steps: [
          'Sentence 1: What the study did — method, sample, context (where and who)',
          'Sentence 2: What it found — the specific finding, not a vague summary',
          'Sentence 3: Why it matters — what it contributes specifically to a teacher in a SA classroom',
          'Word target: 60–80 words. Not a summary — an evaluation.',
        ],
        facilitatorScript: 'This is the hardest sentence to write: "This study matters because..." Don\'t write "it is useful for my research." Write WHY it is useful — what specific question it answers.',
      },
      {
        time: '0:58', duration: 15, type: 'gallery-walk',
        title: 'Annotation Gallery',
        description: 'Annotations are posted (digital or physical). Students read 3 others and leave comments on what makes an annotation strong.',
        steps: [
          'Post your annotation. Walk and read 3 others.',
          'Comment on each: one observation about what makes it work, or one specific question it raises',
          'Return to yours. Read comments.',
        ],
      },
      {
        time: '1:13', duration: 12, type: 'workshop',
        title: 'Assessment 2 Search Strategy Conference',
        description: 'Quick whole-class and small-group check: who has a viable search strategy? Who is stuck?',
        facilitatorScript: 'If you have 3 good sources, you are ahead. If you have zero, tell me now — we will fix it together. There is no judgement here. There is only: do we need more time on this?',
      },
    ],

    processWritingStages: [
      { icon: '🔍', title: 'Search Design', description: 'Think before you type. Your search query is a hypothesis about where knowledge lives.', time: '5 min', prompts: ['What is my topic?', 'What is the context (SA, secondary, STEM)?', 'What time range is relevant?'] },
      { icon: '📋', title: 'Source Evaluation', description: 'Every source is a decision. Why this one, not the others?', time: '10 min', prompts: ['Is this peer-reviewed?', 'Is it from the right context?', 'Is the methodology sound?', 'Is the finding specific enough to be useful?'] },
      { icon: '✍️', title: 'Annotation (Three Sentences)', description: 'Write the three sentences of a professional annotation.', time: '15 min', prompts: ['Sentence 1: What did they do?', 'Sentence 2: What did they find?', 'Sentence 3: Why does it matter for a SA teacher?'], aiPrompt: 'You are an academic librarian reviewing a student\'s source annotation. Evaluate: Does Sentence 1 describe the method and context specifically? Does Sentence 2 give the actual finding (not just "this study is about...")? Does Sentence 3 explain relevance rather than just stating it? Be honest — quote their exact wording where you identify a problem.' },
    ],

    resources: [
      { icon: '🖥️', name: 'Scopus / Google Scholar (institutional access)', note: 'Test student logins BEFORE this session — access issues ruin the whole plan' },
      { icon: '🗂️', name: 'Zotero (installed)', note: 'If students have not installed Zotero yet, build in 5 minutes at the start' },
      { icon: '📋', name: 'Annotation structure card', note: '3 sentences / 60–80 words / method+finding+relevance' },
    ],

    exitTicket: {
      prompt: 'Submit your 3 Zotero citations and your 1 annotation before leaving. If your 3 citations are not in Zotero, stay until they are.',
      stems: ['My search query was…', 'The filter I used to narrow results was…'],
      time: '5 minutes',
      collect: 'Count how many students have 3 Scopus-verified sources. Use in tutorial to target those who do not.',
    },

    facilitatorNotes: [
      'The most common problem: students find a Google Scholar result and think they have a Scopus source. Check explicitly — is it in Scopus? Is it peer-reviewed? Does it have a DOI?',
      'Some students will find no sources because their topic is too specific or too narrow. This is valuable feedback — use it to teach the difference between broadening and abandoning a research question.',
      'Assessment 2 parallel: if students are doing temporal archaeology, this is also the session where you assign time periods. Do it after the Pomodoro search block so students know what they are searching for.',
    ],

    differentiations: [
      { for: 'Students with no Scopus access', action: 'Use Google Scholar with the filter site:.ac.za or filetype:pdf + "peer reviewed". Not ideal, but workable.' },
      { for: 'Students who find sources easily and have time', action: 'Find the MOST CITED paper in their search results. Read the first 3 references of that paper. This is how researchers find sources — by following the citation trail.' },
    ],
  },

  c6: {
    id: 'c6', type: 'contact', unit: 'u6',
    phase: 'Phase 2a — Unit 6',
    title: 'The Research Detective',
    subtitle: 'Advanced search strategies — building your Assessment 2 literature foundation',
    tags: ['Jigsaw Search', 'Scopus Filters', 'Assessment 2 Artefact', 'Peer Strategy Review'],
    goal: 'Students master Scopus filtering through a jigsaw classroom activity, then apply combined skills to build a defensible literature search for their Assessment 2 Decade Digest.',

    preWork: [
      { item: 'Unit 6 Module', detail: 'Scopus tutorial video + research tool comparison reading + tool comparison table visual task' },
      { item: '3 Scopus sources from C5', detail: 'Students should have their 3 sources from the previous session — saved in Zotero' },
      { item: 'Assessment 2 topic confirmed', detail: 'Students must know their Assessment 2 topic and their assigned time period' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'activation',
        title: 'Common Search Mistake Parade',
        description: 'Quick display of 3 anonymised bad searches from the previous session (with permission). Class diagnoses what went wrong.',
        facilitatorScript: 'These are real searches from our last session. Nobody is being named. We\'re looking at the search, not the searcher. What went wrong? And more importantly — why did it produce bad results?',
      },
      {
        time: '0:05', duration: 25, type: 'jigsaw',
        title: 'Scopus Filter Jigsaw',
        description: 'Five expert groups each master one Scopus filter type, then re-group to teach each other. Every student leaves knowing all five.',
        steps: [
          'Expert groups (5 min): Each group of 4–5 becomes expert in ONE filter: (A) Date range, (B) Subject area, (C) Document type, (D) Country/territory, (E) Access type (open access)',
          'Exploration (10 min): Each group runs test searches using their filter and notes what changes. What does this filter do? When would you use it? When would it mislead you?',
          'Teaching groups (10 min): Regroup so each new group has one expert per filter. Experts teach their filter — show don\'t just tell.',
        ],
        materials: ['Scopus access', 'Jigsaw role cards (one per filter)', 'Demo search topic (same for all groups)'],
        facilitatorScript: 'You are not just learning a technique. You are learning how to teach a technique — which is what you\'ll be doing in schools for the rest of your careers.',
      },
      {
        time: '0:30', duration: 30, type: 'workshop',
        title: 'Assessment 2 Literature Search Artefact',
        description: 'Students apply all five filter skills to build their actual Assessment 2 search. This is not practice — it is the real artefact.',
        steps: [
          'Design: Write your exact search query for your time period (show to facilitator before running)',
          'Execute: Run the search. Apply at least 2 filters. Document your decisions.',
          'Evaluate: From your results, identify your 5 best candidates. Add them to Zotero.',
          'Note: record your exact search string, filters applied, and why you selected these 5 over others — this is your Methodology Note for Assessment 2.',
        ],
        materials: ['Scopus', 'Zotero', 'Assessment 2 brief'],
        facilitatorScript: 'Your search methodology is part of your assessment mark. Write it down exactly — what you searched, what you filtered, what you rejected and why. A researcher documents their process.',
      },
      {
        time: '1:00', duration: 20, type: 'peer-feedback',
        title: 'Search Strategy Peer Review',
        description: 'Students exchange search strategies (query + filters + results). Peer provides specific feedback on the strategy, not just the results.',
        steps: [
          'Share your search query and the 5 candidates you found',
          'Peer questions: "Did you check this is actually from your time period?" / "Is this peer-reviewed?" / "Have you got the most cited paper in this time period?"',
          'Revise: change one thing about your strategy based on peer feedback',
        ],
        facilitatorScript: 'The most important question your peer can ask: "Can I find a better source on this topic that you missed?" If yes — why did you miss it?',
      },
      {
        time: '1:20', duration: 10, type: 'workshop',
        title: 'Assessment 2 Checkpoint',
        description: 'Quick status check: who has 5 viable sources for their Decade Digest? What blockers remain?',
      },
    ],

    processWritingStages: [
      { icon: '🧩', title: 'Teach to Learn', description: 'The Scopus filter you teach in the jigsaw is the one you will remember.', time: '10 min', prompts: ['Can I explain this filter to a person who has never used Scopus?', 'When would this filter produce misleading results?'] },
      { icon: '🔬', title: 'Search Documentation', description: 'Your search is a methodological decision — document it as a researcher would.', time: '5 min', prompts: ['What exact query did I use?', 'What filters did I apply and why?', 'What did I reject and why?'] },
      { icon: '✍️', title: 'Assessment Artefact', description: 'This writing IS your Assessment 2 Methodology Note.', time: '25 min', aiPrompt: 'A student has written their search methodology note for a research assignment. Evaluate: Is the search query specific enough? Are the filters appropriate for their stated time period? Does the note explain WHY they chose these sources over others they found? Is the language precise and methodological, not vague?' },
    ],

    resources: [
      { icon: '🧩', name: 'Jigsaw role cards (5 types)', note: 'Date range / Subject area / Document type / Country / Access type. One card per expert.' },
      { icon: '🖥️', name: 'Scopus (institutional access)', note: '' },
      { icon: '📋', name: 'Assessment 2 brief (paper copy)', note: 'Students need the brief in hand during the search artefact block' },
    ],

    exitTicket: {
      prompt: 'Submit your search methodology note before leaving: your exact query, filters applied, and 5 sources added to Zotero.',
      stems: ['My search query was…', 'I filtered by… because…', 'I rejected… because…'],
      time: '5 minutes',
      collect: 'This is a formative artefact. Review for quality of methodological thinking, not just whether sources exist.',
    },

    facilitatorNotes: [
      'The jigsaw works best when the filter experts genuinely discover something surprising in their exploration — not just describe what the filter does. Give them a search that produces counter-intuitive results with each filter.',
      'By the end of this session, every student should have 5 viable Scopus sources for their Decade Digest. If they don\'t, the tutorial session is the recovery point.',
    ],

    differentiations: [
      { for: 'Students who already have strong search skills', action: 'Act as a "search consultant" for struggling peers during the jigsaw — builds metacognition about what they know.' },
      { for: 'Students who struggle with Scopus navigation', action: 'Pair them with an expert-group peer. Better to be supported and produce a good search than to struggle alone and produce nothing.' },
    ],
  },

  // ════════════════════════════════════════════
  // PHASE 2b — CONTACT SESSIONS (Units 7–9)
  // ════════════════════════════════════════════

  c7: {
    id: 'c7', type: 'contact', unit: 'u7',
    phase: 'Phase 2b — Unit 7',
    title: 'The Live Lateral Reading Lab',
    subtitle: 'Real-time source investigation — whole class as a fact-checking newsroom',
    tags: ['Lateral Reading Live', 'SIFT Practice', 'Assessment 3 Prep', 'Collaborative Investigation'],
    goal: 'Students practise lateral reading as a live, collaborative skill — moving from individual practice in the module to newsroom-style group investigation. They leave with a practised SIFT toolkit and a clear brief for Assessment 3.',

    preWork: [
      { item: 'Unit 7 Module', detail: 'SIFT video + reading task + infographic credibility visual task' },
      { item: 'Unit 3 SIFT analysis', detail: 'Students should bring their SIFT analysis from Contact Session 3 — they will extend it' },
      { item: 'Assessment 3 claim', detail: 'Students should know their assigned claim and subject area' },
    ],

    blocks: [
      {
        time: '0:00', duration: 20, type: 'live-demo',
        title: 'Newsroom Investigation — Whole Class',
        description: 'The facilitator presents a contested education claim and the class investigates it together as a newsroom, with different students taking different roles simultaneously.',
        steps: [
          'Assign roles: Source Investigator, Coverage Finder, Origin Tracer, Evidence Evaluator',
          'Each role opens their tools and investigates simultaneously — 10 minutes',
          'Roles report back to the "newsroom": what did you find?',
          'Whole class verdict: what do we know, what can\'t we determine, and what would change our verdict?',
        ],
        facilitatorScript: 'This is how professional fact-checkers work — not one person doing everything, but specialists working in parallel and comparing findings. Notice how much more you found in 10 minutes as a team than one person could find alone.',
      },
      {
        time: '0:20', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Your Assessment 3 Claim — First Investigation',
        description: '25-minute Pomodoro: students begin their Assessment 3 claim investigation using full SIFT. This is their formative work for the assessment.',
        steps: [
          'Document your first reaction (Stop)',
          'Lateral read the source — spend minimum 5 of your 25 minutes on this step before looking at the claim',
          'Find two better coverage sources',
          'Trace to origin — where did this claim actually start?',
          'Provisional verdict (can change)',
        ],
        facilitatorScript: 'You are beginning your Assessment 3 submission right now. What you produce in this Pomodoro is formative — but the process you follow is the same process you will submit.',
      },
      {
        time: '0:50', duration: 25, type: 'peer-feedback',
        title: 'Investigation Peer Conference',
        description: 'Students from different subject areas conference with each other. Cross-disciplinary pairs: a literacy claim investigator and a STEM claim investigator compare their processes.',
        steps: [
          'Share your provisional verdict and the evidence trail that got you there',
          'Peer challenge: "Have you actually traced to origin, or just to a secondary report?"',
          'Peer contribution: "In my subject area, I found a resource that might help your investigation..."',
          'Exchange one useful source or strategy',
        ],
        facilitatorScript: 'You are investigating different claims, but the SIFT process is the same. What your partner does well in their investigation, you can import into yours.',
      },
      {
        time: '1:15', duration: 15, type: 'workshop',
        title: 'Assessment 3 Methodology Workshop',
        description: 'Facilitator-led session on writing the Methodology Note — the hardest component of Assessment 3 for most students.',
        facilitatorScript: '"I googled it" is not a methodology note. "I searched africacheck.org for the term X and found no existing fact-check, then searched Scopus for [query] which returned Y peer-reviewed results, of which I selected Z because..." — that is a methodology note.',
      },
    ],

    processWritingStages: [
      { icon: '🔭', title: 'Lateral Reading First', description: 'Before reading the claim itself, read what others say about the SOURCE.', time: '5 min', prompts: ['Who is making this claim?', 'What do others say about this source?', 'What is the source\'s track record?'] },
      { icon: '🔍', title: 'Evidence Trail', description: 'Document every step of your investigation as you go — not afterwards.', time: '15 min', prompts: ['What did I find at each SIFT step?', 'What surprised me?', 'What dead ends did I hit?'] },
      { icon: '⚖️', title: 'Verdict Writing', description: 'A verdict is not a feeling — it is the logical conclusion of your evidence.', time: '10 min', prompts: ['What is the strongest evidence?', 'What would change my verdict?', 'Is my verdict proportionate to my evidence?'], aiPrompt: 'A student has written a SIFT analysis with a verdict. Evaluate: Is the verdict (True/Misleading/False/Unverifiable) supported by the evidence they present? Does the evidence actually trace to an upstream source, or does it stop at a secondary report? Is the analysis specific or generic? Be direct — quote their analysis where relevant.' },
    ],

    resources: [
      { icon: '📰', name: 'Pre-selected contested claim (tested in advance)', note: 'Must be: SA-relevant, education-related, traceable, not too politically charged for a first live investigation' },
      { icon: '🌐', name: 'Africa Check (africacheck.org)', note: 'The primary SA fact-checking resource. All students should have this bookmarked.' },
      { icon: '🎭', name: 'Newsroom role cards', note: 'Source Investigator / Coverage Finder / Origin Tracer / Evidence Evaluator' },
    ],

    exitTicket: {
      prompt: 'What is your provisional verdict on your Assessment 3 claim? What is the single piece of evidence that most supports your verdict? What would change it?',
      stems: ['My provisional verdict is… because…', 'This would change if I found…'],
      time: '5 minutes',
      collect: 'Review for quality of evidential reasoning. Flag students who have a verdict but no traceable upstream source.',
    },

    facilitatorNotes: [
      'The newsroom simulation is powerful because it makes visible that fact-checking is a collaborative, iterative process — not a solo act of brilliant deduction.',
      'Some students will have Assessment 3 claims that are difficult to trace. This is a learning opportunity: "Unverifiable" is a valid verdict if it is justified.',
    ],

    differentiations: [
      { for: 'Students who have already traced their claim', action: 'Investigate a second claim voluntarily, or help a struggling peer.' },
      { for: 'Students with claims that are hard to find coverage for', action: 'Widen the search: look for the type of claim, not just this specific instance.' },
    ],
  },

  c8: {
    id: 'c8', type: 'contact', unit: 'u8',
    phase: 'Phase 2b — Unit 8',
    title: 'The Hallucination Hunt',
    subtitle: 'Verify AI-generated citations live — build your verification workflow',
    tags: ['AI Citation Audit', 'Verification Workflow', 'Zotero Practice', 'Assessment Task Workshop'],
    goal: 'Students develop automatic verification habits by conducting a live hallucination audit on a provided set of AI-generated citations. They leave with a personal verification workflow and a verified source list for their current assessment.',

    preWork: [
      { item: 'Unit 8 Module', detail: 'AI research tools video + reading task + bar chart visual task' },
      { item: 'Zotero installed and working', detail: 'Students must be able to save a source to Zotero before arriving' },
      { item: 'Any AI-generated sources they have used', detail: 'Bring any citations previously generated by ChatGPT, Gemini, etc. — real or practice' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'The Citation Mystery Box',
        description: 'Facilitator reveals a set of 8 academic citations — some real, some hallucinated. Students vote on which are genuine.',
        facilitatorScript: 'I have 8 citations here. Some are real papers you can find in Scopus right now. Some are fabrications produced by an AI chatbot. They all look identical. Your job for the next 5 minutes: vote on which are fake. No searching yet — just gut reaction.',
        materials: ['8 citations printed or on screen (3 real + 5 hallucinated from a real AI session)'],
      },
      {
        time: '0:10', duration: 20, type: 'live-demo',
        title: 'Live Verification — One by One',
        description: 'Class verifies each citation together. Facilitator searches Scopus live. Reveals which are real and which are fabricated. Discusses what made the hallucinations convincing.',
        steps: [
          'For each citation: search the exact title in Scopus. Does it exist?',
          'If yes: do the author, journal, year, and DOI match? (Sometimes it exists but the details are wrong)',
          'If no: it is a hallucination. What made it look real?',
          'Final count: how many were hallucinated? Reveal the actual AI session that produced them.',
        ],
        facilitatorScript: 'Notice what made the hallucinations convincing: real author names on different papers, plausible journal titles, correct DOI format. The AI is not guessing randomly — it is producing plausible-sounding content that has never existed.',
      },
      {
        time: '0:30', duration: 30, type: 'workshop',
        title: 'Your Verification Workflow — Build and Apply',
        description: 'Students design their personal 5-step verification workflow, then immediately apply it to a real task: verifying the sources in their current assessment work.',
        steps: [
          'Step 1: Write your 5-step verification workflow (10 min)',
          'Step 2: Apply it to minimum 3 sources in your current assessment work — verify each one in Scopus (20 min)',
          'For each source: record what you checked and what you found. One surprise is expected.',
        ],
        materials: ['Scopus', 'Zotero', 'Current assessment source lists'],
        facilitatorScript: 'If you find that one of your assessment sources does not exist — do not panic. That is what this session is for. You have 20 minutes to find a real replacement.',
      },
      {
        time: '1:00', duration: 20, type: 'peer-feedback',
        title: 'Workflow Exchange',
        description: 'Pairs share their verification workflows. Each person finds one gap or improvement in the other\'s workflow.',
        facilitatorScript: 'Your workflow should be specific enough that a colleague could follow it without asking you questions. "Check if it exists" is not a workflow step. "Search the exact title in Scopus and verify author, journal, year, and DOI" is.',
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Document and Commit',
        description: 'Students write their final verified workflow as a card they will keep. This becomes their permanent research practice protocol.',
      },
    ],

    processWritingStages: [
      { icon: '🔍', title: 'Systematic Verification', description: 'A workflow is a checklist, not a feeling.', time: '10 min', prompts: ['Step 1: Does the paper exist at all?', 'Step 2: Do all details match?', 'Step 3: Does it say what the citation claims it says?'] },
      { icon: '🚨', title: 'Hallucination Documentation', description: 'When you find a hallucination, document it — this is valuable data.', time: '5 min', prompts: ['What made this look real?', 'What gave it away?', 'What would I search to find a real alternative?'] },
      { icon: '✍️', title: 'Workflow Writing', description: 'Write your workflow precisely enough that it becomes automatic.', time: '10 min', aiPrompt: 'A student has written their academic citation verification workflow. Evaluate: Is each step specific and actionable (not vague like "check it is real")? Does the workflow include what to do when a source fails verification? Would this workflow catch a hallucination that looks very convincing? Be specific in your feedback.' },
    ],

    resources: [
      { icon: '🎯', name: '8 mystery citations (3 real + 5 hallucinated)', note: 'Generate these yourself using ChatGPT or Gemini BEFORE the session. Verify in Scopus first. Keep the AI session log to show students.' },
      { icon: '🖥️', name: 'Scopus', note: '' },
      { icon: '🗂️', name: 'Zotero', note: '' },
    ],

    exitTicket: {
      prompt: 'Name one source in your current assessment that you have now verified in Scopus. Describe what you checked and what you found.',
      stems: ['I verified… by searching…', 'The detail that did/didn\'t match was…'],
      time: '5 minutes',
      collect: 'Students who cannot name a verified source need tutorial support before they submit their assessment.',
    },

    facilitatorNotes: [
      'The hallucination hunt is more convincing when the hallucinations are from a REAL AI session you ran yourself — screenshot the session to show students. Fabricated examples are less impactful.',
      'Some students will be alarmed if they find a hallucination in their own assessment work. Acknowledge this calmly: "This is exactly why we check. Now you know. Now you fix it."',
    ],

    differentiations: [
      { for: 'Students who have not used AI for citations yet', action: 'Generate a small set of AI citations for a practice topic and verify those instead.' },
      { for: 'Students who already verify religiously', action: 'Challenge: find a source in Scopus where the Zotero auto-import contains an error. Document the specific error type.' },
    ],
  },

  c9: {
    id: 'c9', type: 'contact', unit: 'u9',
    phase: 'Phase 2b — Unit 9',
    title: 'Zotero Clinic + Citation Architecture',
    subtitle: 'Everyone leaves with a working Zotero library and one error-free reference list',
    tags: ['Zotero Setup', 'APA 7th Verification', 'Process Writing', 'Assessment Submission Prep'],
    goal: 'Every student leaves this session with a functioning Zotero library, at least 5 sources saved, and one reference list entry manually verified against APA 7th. The session is practical, workshop-style, and directly feeds assessment submission.',

    preWork: [
      { item: 'Unit 9 Module', detail: 'Zotero video + citation ethics reading + APA anatomy visual task' },
      { item: 'Zotero installed + browser connector', detail: 'Non-negotiable. Test this at home before arriving.' },
      { item: 'Sources from previous sessions', detail: 'Bring all sources collected so far — these are what you will import today' },
    ],
    preWorkNote: 'If Zotero is not installed, the student will spend most of the session installing it rather than using it. Send a reminder 48 hours before with the installation link.',

    blocks: [
      {
        time: '0:00', duration: 10, type: 'live-demo',
        title: 'Zotero Speed Tour — 5 Things You Must Know',
        description: 'Facilitator demonstrates 5 essential Zotero skills live, on the projector, in 10 minutes.',
        steps: [
          'Save from Scopus with one click (browser connector)',
          'Create a collection and organise by assessment',
          'Generate a reference list in APA 7th — in Word',
          'Insert an in-text citation while writing',
          'Check the generated reference for the two most common errors (title capitalisation + DOI)',
        ],
        facilitatorScript: 'I am showing you this once, live, and then you are doing it yourselves. The questions I get most from students are all about these 5 things.',
      },
      {
        time: '0:10', duration: 35, type: 'workshop',
        pomMinutes: 30,
        title: 'Zotero Workshop — Build Your Library',
        description: 'Students build their Zotero library with their actual assessment sources. Facilitator and tutor circulate — this is a practical clinic.',
        steps: [
          'Create a Zotero collection named after your current assessment',
          'Import ALL sources you plan to use — minimum 5',
          'Generate a reference list in APA 7th',
          'Manually check the FIRST entry: title capitalisation (sentence case?), journal name (italics, title case?), DOI present?',
          'Fix any errors you find. Note what you fixed.',
        ],
        materials: ['Zotero', 'Assessment source lists', 'APA 7th quick reference card'],
        facilitatorScript: 'This is real work on your real assessment. I am available for questions. Use me.',
      },
      {
        time: '0:45', duration: 20, type: 'peer-feedback',
        title: 'Reference List Audit Pairs',
        description: 'Pairs exchange their generated reference lists and apply APA 7th verification to two entries each.',
        steps: [
          'Swap reference lists',
          'Check entries 1 and 2 for: sentence case title, journal in italics, correct author format, DOI present',
          'Mark errors with specific annotation: "Title needs sentence case — change X to x"',
          'Return. Student corrects errors in Zotero (not just in the document — in the source record).',
        ],
        facilitatorScript: 'When your partner finds an error, fix it in ZOTERO, not just in the Word document. If you only fix it in the document, it will come back wrong the next time you generate the list.',
      },
      {
        time: '1:05', duration: 15, type: 'process-write',
        title: 'Paraphrase Practice — The Hardest Sentence',
        description: 'Students practise paraphrasing the most complex finding from their research. Paraphrase is a skill, not a synonym swap.',
        steps: [
          'Choose one sentence from one of your assessment sources that expresses a finding you want to cite',
          'Close the source. Write the idea in your own words without looking at the original.',
          'Reopen and compare: Does your version preserve the meaning? Does it sound like your voice?',
          'Add an in-text citation.',
        ],
        facilitatorScript: 'If you can\'t write it without looking at the original, you don\'t understand it yet. Understanding comes before paraphrasing. Read it again.',
      },
      {
        time: '1:20', duration: 10, type: 'workshop',
        title: 'Assessment Submission Checklist',
        description: 'Facilitator walks through the assessment submission checklist. Students tick what they have done and identify what remains.',
      },
    ],

    processWritingStages: [
      { icon: '🗂️', title: 'Library Organisation', description: 'A Zotero library is only useful if it is organised. Name your collections after your assessments.', time: '10 min', prompts: ['Are all my sources saved?', 'Are they in the right collection?', 'Do I have the full record (author, year, journal, DOI)?'] },
      { icon: '✍️', title: 'Paraphrase (The Hard Way)', description: 'Close the source. Write from understanding. Then compare.', time: '10 min', prompts: ['What is the core idea?', 'What are the key terms that must stay?', 'What is MY way of saying this?'] },
      { icon: '🔍', title: 'APA 7th Audit', description: 'Checking your reference list is not optional — it is part of the submission.', time: '10 min', prompts: ['Title: sentence case?', 'Journal: italics + title case?', 'Author: surname, initial(s)?', 'DOI: present and formatted correctly?'], aiPrompt: 'You are an APA 7th citation expert. A student has provided a reference list entry. Identify every error against APA 7th format. Be specific: quote the exact element that is wrong and state what the correct format should be. Common errors: title capitalisation (should be sentence case), missing DOI, journal name not italicised, wrong author format.' },
    ],

    resources: [
      { icon: '🗂️', name: 'Zotero (installed + browser connector)', note: 'Send installation link 48 hours before. Expect 10% of students to need installation at the start — budget time.' },
      { icon: '📋', name: 'APA 7th quick reference card', note: 'Journal article + book + website + government document. Laminate and keep.' },
      { icon: '📝', name: 'Assessment submission checklist (printed)', note: 'One per student. They take it home.' },
    ],

    exitTicket: {
      prompt: 'Submit your Zotero library screenshot (at least 5 sources in a named collection) + one reference list entry that you have manually verified as APA 7th correct.',
      stems: ['The error I found in my auto-generated reference was…', 'I corrected it by…'],
      time: '5 minutes',
      collect: 'This is a formative submission artefact. Students who cannot produce it need individual support before the assessment deadline.',
    },

    facilitatorNotes: [
      'The most common error: students generate a reference list but do not check it. Dedicate the peer audit specifically to this — make checking feel normal, not exceptional.',
      'Paraphrase practice often reveals understanding gaps. A student who cannot paraphrase a finding has not yet understood it. This is useful diagnostic information.',
      'Send students home with the APA 7th quick reference card. It belongs on their desk, not in their bag.',
    ],

    differentiations: [
      { for: 'Students struggling with Zotero', action: 'Pair with a confident Zotero user. The student teaches their peer what they\'ve done; the peer helps troubleshoot.' },
      { for: 'Advanced students who finish early', action: 'Set up the Word/Google Docs citation plugin and demonstrate in-text citation insertion — a skill that will save them hours in the assessments.' },
    ],
  },

  // ════════════════════════════════════════════
  // TUTORIAL SESSIONS
  // ════════════════════════════════════════════

  t1: {
    id: 't1', type: 'tutorial', unit: 'u1',
    phase: 'Phase 1 — Unit 1 Tutorial',
    title: 'Individual Support: AI Vocabulary & First Writing',
    subtitle: 'Targeted diagnostic — address Unit 1 gaps, orient students to Assessment 1',
    tags: ['Diagnostic', 'Vocabulary', 'Assessment 1 Orientation', 'Exit Ticket Review'],
    goal: 'Identify and address specific gaps from Unit 1 and Contact Session 1. Orient every student to Assessment 1 so they leave knowing exactly what is expected.',

    preWork: [
      { item: 'Contact Session 1 exit tickets', detail: 'Tutor reviews exit tickets before the tutorial — sorts by gap type' },
      { item: 'Unit 1 reading task attempt', detail: 'Students should have submitted their first draft' },
    ],

    blocks: [
      {
        time: '0:00', duration: 8, type: 'diagnostic',
        title: 'Anonymous Gap Survey',
        description: 'Quick low-stakes survey to identify where students are stuck. Not graded. Not named.',
        steps: [
          'Display 5 statements. Students rate agreement 1–5 on paper:',
          '"I can explain what Khanmigo does without looking at my notes."',
          '"I understand the difference between AI generating content and AI retrieving content."',
          '"I can define: algorithm, filter bubble, curation, confirmation bias."',
          '"My Unit 1 writing task felt easy/medium/hard."',
          '"I understand what Assessment 1 is asking me to do."',
          'Tutor scans responses. Identifies top 2 struggles.',
        ],
      },
      {
        time: '0:08', duration: 15, type: 'mini-lesson',
        title: 'Targeted Mini-Lesson — Top 2 Gaps',
        description: 'Tutor delivers a focused 15-minute lesson on the two most common gaps identified in the survey. Not a re-teach of the whole unit — a targeted re-entry.',
        facilitatorScript: 'I am only going to address what most of you found difficult. If your challenge was something else, I will see you individually at the end.',
        materials: ['Unit 1 module (open for reference)', 'Whiteboard for key distinctions'],
      },
      {
        time: '0:23', duration: 15, type: 'workshop',
        title: 'Reading Task Feedback + Revision',
        description: 'Tutor selects 2–3 anonymised reading task examples (with permission). Class evaluates them against the rubric, then each student makes one specific revision to their own task.',
        steps: [
          'Show example 1: what level is this? What would move it one level up?',
          'Show example 2: same questions',
          '5-minute individual revision: each student makes ONE specific change to their own task',
        ],
      },
      {
        time: '0:38', duration: 5, type: 'workshop',
        title: 'Assessment 1 Orientation',
        description: 'Tutor walks through the Assessment 1 brief clearly. Answers specific questions only — not a re-read of the brief.',
        facilitatorScript: 'Assessment 1 brief is open. I will answer specific questions. "What do we have to do?" is not a specific question — read the brief. "What exactly does a Platform Intelligence Report need to include?" is specific.',
      },
      {
        time: '0:43', duration: 2, type: 'process-write',
        title: 'Exit Ticket',
        description: 'One sentence: the one thing I will do before the next session to improve my Assessment 1 preparation.',
      },
    ],

    processWritingStages: [
      { icon: '🔄', title: 'Targeted Revision', description: 'One specific change, not a rewrite.', time: '5 min', prompts: ['What is the weakest sentence in my writing task?', 'Where am I vague when I should be specific?'] },
    ],

    resources: [
      { icon: '📋', name: 'Unit 1 exit tickets (pre-reviewed)', note: 'Tutor should have read all exit tickets and sorted by gap type before arriving' },
      { icon: '📄', name: 'Assessment 1 brief', note: '' },
      { icon: '🖥️', name: 'Unit 1 module (open for reference)', note: '' },
    ],

    exitTicket: {
      prompt: 'What is one specific thing you will do this week to advance your Assessment 1 preparation?',
      stems: ['By the next session I will…', 'My specific next step is…'],
      time: '2 minutes',
      collect: 'These goals feed into the next tutorial check-in.',
    },

    facilitatorNotes: [
      'The tutorial is NOT a content re-delivery session. If a student needs content re-delivery, refer them back to the module. The tutorial is for application, feedback, and individual support.',
      'Students who have not done the pre-work get less benefit here. Note which students this is — pattern over multiple tutorials is important data.',
    ],

    differentiations: [
      { for: 'Students significantly behind', action: 'Individual 5-minute check-in at the end of the tutorial. Set a very specific achievable goal for the week.' },
      { for: 'Students who are ahead', action: 'Assign them as the "platform analyst" for their group — they begin their observation log today.' },
    ],
  },

  t2: {
    id: 't2', type: 'tutorial', unit: 'u2',
    phase: 'Phase 1 — Unit 2 Tutorial',
    title: 'Writing Observation Paragraphs That Analyse',
    subtitle: 'From description to analysis — the most important shift in academic writing',
    tags: ['Process Writing', 'Paragraph Analysis', 'Peer Review', 'Model Texts'],
    goal: 'Address the most common gap from the C2 session: students can describe their filter bubble but cannot yet analyse it. Every student leaves with a revised paragraph that has moved from descriptive to analytical.',

    preWork: [
      { item: 'C2 observation paragraph (draft)', detail: 'Students bring their best draft — revised or not' },
      { item: 'C2 peer feedback received', detail: 'Students should have their peer\'s written feedback from C2' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'mini-lesson',
        title: 'The Descriptive/Analytical Difference — One Example',
        description: 'Tutor presents two versions of the same sentence: one descriptive, one analytical. Students identify the difference.',
        steps: [
          'Version A: "My YouTube home page showed videos about education and music."',
          'Version B: "My YouTube home page systematically surfaced education content and excluded political news — suggesting the algorithm has inferred a professional identity that conflicts with my actual interests as a citizen."',
          'Ask: What was added? What specific moves turned description into analysis?',
        ],
        facilitatorScript: 'Description says what. Analysis says what it means and why it matters. Every sentence you write should be pushing toward the second.',
      },
      {
        time: '0:05', duration: 10, type: 'close-read',
        title: 'Close Reading — Model Paragraph',
        description: 'Students annotate a model academic observation paragraph together. Tutor guides annotation.',
        steps: [
          'Read once for overall impression',
          'Second read: underline every claim. Circle every piece of evidence. Box every analytical move.',
          'Count: how many claims? How many pieces of evidence? How many analytical interpretations?',
          'Key ratio: every claim needs evidence; every piece of evidence needs interpretation.',
        ],
        materials: ['Model paragraph printed or projected'],
      },
      {
        time: '0:15', duration: 15, type: 'pomodoro',
        pomMinutes: 12,
        title: 'Revision Sprint — One Paragraph',
        description: '12-minute focused revision. Students make their observation paragraph more analytical using the moves identified in the close reading.',
        steps: [
          'Open your draft and your peer\'s feedback',
          'Identify your most descriptive sentence',
          'Rewrite it using the analytical move you observed in the model: claim + evidence + interpretation',
          'Read it aloud. Does it sound like analysis or description?',
        ],
        facilitatorScript: 'You have 12 minutes. The goal is not to rewrite the paragraph — it is to make one sentence significantly more analytical. One sentence, done well, is worth 20 sentences mediocrely revised.',
      },
      {
        time: '0:30', duration: 10, type: 'peer-feedback',
        title: 'Rapid Swap',
        description: 'Pairs swap the single revised sentence and give one specific written comment.',
        steps: [
          'Show only the revised sentence — not the whole paragraph',
          'Partner writes one comment: "This is now analytical because..." OR "This is still descriptive because..."',
          'Return. 3-minute final revision if needed.',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Exit + Assessment 1 Bridge',
        description: 'Quick connection: how does this analytical sentence move apply to the Platform Intelligence Report in Assessment 1?',
        facilitatorScript: 'Your Assessment 1 Platform Intelligence Report will be full of sentences like the one you just revised. Every observation needs analysis. Every data point needs interpretation. You have just practised the core skill.',
      },
    ],

    processWritingStages: [
      { icon: '🔍', title: 'Close Reading for Moves', description: 'Read analytically for the techniques, not just the content.', time: '10 min', prompts: ['What is the claim?', 'What is the evidence?', 'What is the interpretive move?'] },
      { icon: '🔄', title: 'Targeted Revision', description: 'Change one sentence from description to analysis.', time: '12 min', prompts: ['What does this data MEAN?', 'Why does this pattern exist?', 'What professional implication does this have?'], aiPrompt: 'A first-year education student has written an observation paragraph about their social media filter bubble. Your task: identify every sentence that is purely descriptive (says WHAT happened) and has not yet made an analytical move (said WHAT IT MEANS). Quote each descriptive sentence and suggest what analytical move would transform it.' },
    ],

    resources: [
      { icon: '📄', name: 'Model observation paragraph (printed)', note: 'Choose from previous year\'s good work, academic article, or write one yourself. Must be genuinely analytical.' },
      { icon: '🍅', name: 'Pomodoro (12 min)', note: 'Shorter Pomodoro for focused revision — 12 minutes is enough for one targeted sentence' },
    ],

    exitTicket: {
      prompt: 'Submit your revised sentence and one sentence explaining what you changed and why it is now more analytical.',
      stems: ['I changed… to…', 'The difference is that the revision now…'],
      time: '3 minutes',
      collect: 'Sort into: successfully analytical / partially analytical / still descriptive. Use data in next tutorial.',
    },

    facilitatorNotes: [
      'The resistance to analysis often comes from insecurity: "I don\'t know enough to interpret this." Acknowledge this and reframe: your interpretation is a hypothesis, not a fact. Academic writing permits uncertainty if it is stated explicitly.',
      'Students who write in their home language first and then translate often produce more analytical writing. Encourage this as a legitimate strategy.',
    ],
  },

  t3: {
    id: 't3', type: 'tutorial', unit: 'u3',
    phase: 'Phase 1 — Unit 3 Tutorial',
    title: 'Assessment 1 Launch: SIFT + Platform + Brief',
    subtitle: 'Orientation, role clarification, and first artefact production',
    tags: ['Assessment 1 Briefing', 'SIFT Practice', 'Roles', 'Observation Log'],
    goal: 'Every student leaves this tutorial with: their Assessment 1 role confirmed, their observation log started, and their first SIFT-based platform claim documented. No student is confused about what Assessment 1 requires.',

    preWork: [
      { item: 'Assessment 1 brief (read)', detail: 'Students must have read the full assessment brief' },
      { item: 'SIFT from Contact Session 3', detail: 'Students bring their C3 SIFT analysis' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Assessment 1 Quick Comprehension Check',
        description: 'Five True/False questions about Assessment 1 requirements. Identifies specific misunderstandings.',
        steps: [
          '"The observation log is submitted with the assessment." (False — not submitted)',
          '"The Platform Intelligence Report must include in-text citations." (True)',
          '"I can choose any platform I want." (False — assigned by lecturer)',
          '"The Policy Recommendation is addressed to the Department of Basic Education." (False — to a specific school principal)',
          '"I can write my policy recommendation without reading my group\'s platform reports." (False — that\'s the whole point)',
        ],
      },
      {
        time: '0:05', duration: 10, type: 'mini-lesson',
        title: 'Clearing Up the Top 3 Misconceptions',
        description: 'Tutor addresses only the misconceptions revealed by the check. Does not re-read the brief.',
      },
      {
        time: '0:15', duration: 15, type: 'workshop',
        title: 'Observation Log Launch',
        description: 'Students set up their observation log and make their Day 1 entry. The log template is modelled by the tutor.',
        steps: [
          'Show the observation log template: Date / Platform entry point / Content categories observed / Algorithm behaviour noted / Misinformation risk noted',
          'Students complete Day 1 entry live (their platform, today)',
          'Question: What will be hard about sustaining this for 14 days? One honest answer each.',
        ],
        materials: ['Observation log template (provided by tutor)'],
        facilitatorScript: 'This log is not submitted. It is your evidence base. Your Platform Intelligence Report will reference specific days and specific content. Without the log, you are writing from memory — which is unreliable.',
      },
      {
        time: '0:30', duration: 10, type: 'pomodoro',
        pomMinutes: 8,
        title: 'Platform Claim SIFT Sprint',
        description: '8-minute focused SIFT on one specific claim from their assigned platform. Students identify their first candidate claim.',
        facilitatorScript: 'Find ONE piece of content on your platform right now that makes a specific education claim. Apply SIFT quickly — you have 8 minutes. Provisional verdict only.',
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Exit + Week 1 Goal',
        description: 'Students write their specific Day 2–5 observation plan. What time each day? What will they look for?',
        facilitatorScript: 'Don\'t say "I\'ll check my phone every day." Say: "At 7:30am each morning, I will spend 15 minutes on TikTok with my log open, looking specifically for education-related content and algorithm patterns."',
      },
    ],

    processWritingStages: [
      { icon: '📓', title: 'Observation Log', description: 'Daily structured data collection. The foundation of your Platform Intelligence Report.', time: '10 min daily', prompts: ['What type of content appeared?', 'What was absent?', 'What does this suggest about the algorithm?'] },
    ],

    resources: [
      { icon: '📋', name: 'Observation log template', note: 'Print or digital — whichever students will actually use' },
      { icon: '📋', name: 'Assessment 1 brief (paper copy)', note: '' },
    ],

    exitTicket: {
      prompt: 'Your name, your assigned platform, and your specific daily observation time for Week 1.',
      stems: ['My platform is…', 'I will observe at… each day…'],
      time: '2 minutes',
      collect: 'Check that every student has a confirmed platform. If not, assign immediately.',
    },
  },

  t4: {
    id: 't4', type: 'tutorial', unit: 'u4',
    phase: 'Phase 2a — Unit 4 Tutorial',
    title: 'Deep Work in Practice — Week 2 Check-In',
    subtitle: 'Did the protocol work? Data, debrief, and adjustment',
    tags: ['Protocol Review', 'Accountability', 'Adjustment', 'Assessment 2 Prep'],
    goal: 'Students report back on their deep work protocol experiment. Identify what worked, what failed, and make evidence-based adjustments. Connect to Assessment 2 research preparation.',

    preWork: [
      { item: 'Deep work protocol (from C4)', detail: 'Students should have attempted their protocol at least once since the contact session' },
      { item: 'Commitment letter', detail: 'Students bring their C4 commitment letter for review' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'diagnostic',
        title: 'Protocol Experiment Report-Back',
        description: 'Students report on their deep work protocol attempt. Not a judgment exercise — an empirical one.',
        steps: [
          'Show of hands: who attempted the protocol at least once?',
          'Three questions on paper: What worked? What failed? What surprised you?',
          'Quick share: 3–4 students share one specific observation.',
        ],
        facilitatorScript: 'I am not asking whether you did it. I am asking what you found when you tried. Failure data is valuable. "It didn\'t work because..." is as useful as "it worked because..."',
      },
      {
        time: '0:10', duration: 12, type: 'mini-lesson',
        title: 'Protocol Refinement — Based on Class Data',
        description: 'Tutor aggregates the class failures and addresses the most common ones with specific, practical adjustments.',
        facilitatorScript: 'If three people said "I couldn\'t stop checking WhatsApp," then we need a specific strategy for WhatsApp — not a reminder to focus harder. What specifically can you DO to remove the temptation, not resist it?',
      },
      {
        time: '0:22', duration: 12, type: 'pomodoro',
        pomMinutes: 10,
        title: 'Live Pomodoro — Assessment 2 Research',
        description: '10-minute Pomodoro applying the refined protocol to real Assessment 2 research. Data for the protocol experiment.',
        facilitatorScript: 'Run the Pomodoro. No phones. After 10 minutes: how much did you get done? Compare to a typical 10-minute period at home. That difference is your productivity data.',
      },
      {
        time: '0:32', duration: 10, type: 'process-write',
        title: 'Revised Protocol + Assessment 2 Study Plan',
        description: 'Students write a revised deep work protocol specifically for Assessment 2 completion — specific time blocks, specific tasks per block.',
        facilitatorScript: 'Assessment 2 has 14 days and specific deliverables. Plan them into Pomodoro blocks now. What will you do in each block? How many blocks do you need?',
      },
      {
        time: '0:42', duration: 3, type: 'process-write',
        title: 'Exit',
        description: 'One revised protocol commitment for the coming week.',
      },
    ],

    processWritingStages: [
      { icon: '📊', title: 'Evidence Review', description: 'Treat your protocol experiment as data.', time: '5 min', prompts: ['What was the specific result?', 'What variable made the difference?', 'What would I change in the next trial?'] },
    ],

    resources: [
      { icon: '🍅', name: 'Pomodoro timer', note: '' },
      { icon: '📋', name: 'Assessment 2 brief', note: 'Students need to plan specific Pomodoro blocks for each Assessment 2 milestone' },
    ],

    exitTicket: {
      prompt: 'One specific adjustment to your deep work protocol based on today\'s discussion — and the exact time you will next use it.',
      stems: ['I\'m adjusting… because…', 'My next Pomodoro session will be at…'],
      time: '3 minutes',
      collect: '',
    },
  },

  t5: {
    id: 't5', type: 'tutorial', unit: 'u5',
    phase: 'Phase 2a — Unit 5 Tutorial',
    title: 'Annotation Clinic — Evaluating Your Sources',
    subtitle: 'Moving from "I found a source" to "I have evaluated a source"',
    tags: ['Source Evaluation', 'Annotation Practice', 'APA 7th', 'Assessment 2 Decade Digest'],
    goal: 'Students improve the quality of their source annotations — moving from description to evaluation. Every student leaves with at least 3 reviewed, evaluated annotations ready for Assessment 2.',

    preWork: [
      { item: '5 sources from C5 and C6', detail: 'Sources must be saved in Zotero. Not just bookmarked.' },
      { item: 'Draft annotations (at least 3)', detail: 'Students have written first attempts at annotations' },
    ],

    blocks: [
      {
        time: '0:00', duration: 8, type: 'mini-lesson',
        title: 'The Three Annotation Errors — Show and Tell',
        description: 'Tutor shows 3 anonymised annotations with the most common errors. Class diagnoses each error.',
        steps: [
          'Error 1: Copying the abstract verbatim',
          'Error 2: Saying "this article is about X" instead of "this study found X"',
          'Error 3: Relevance claim is generic ("useful for my research") not specific',
        ],
        facilitatorScript: '"Useful for my research" tells me nothing. "This study\'s finding that X directly addresses my Assignment 2 question about Y because..." tells me everything.',
      },
      {
        time: '0:08', duration: 20, type: 'workshop',
        title: 'Annotation Revision Workshop',
        description: 'Students revise their 3 weakest annotations based on the mini-lesson.',
        steps: [
          'Rank your 3 annotations from weakest to strongest',
          'Revise the weakest one first — apply all three error checks',
          'Revise the second weakest',
          'Keep the strongest as a model for the others',
        ],
      },
      {
        time: '0:28', duration: 12, type: 'peer-feedback',
        title: 'Annotation Trio Exchange',
        description: 'Groups of 3 exchange their best annotation and give specific written feedback.',
        steps: [
          'Pass your best annotation to the person on your left',
          'That person applies the three error checks and writes one improvement suggestion',
          'After 5 minutes, pass again (so each person reviews 2 annotations)',
          'Return. Read your 2 pieces of feedback. Make one final change.',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Exit + Period Synthesis Preview',
        description: 'Brief orientation: what is the 200-word Period Synthesis and how do your annotations feed into it?',
        facilitatorScript: 'Your 5 annotations are raw data. Your 200-word Period Synthesis is the interpretation of that data: what do these 5 studies, taken together, tell us about what the field understood in your time period?',
      },
    ],

    processWritingStages: [
      { icon: '🔍', title: 'Annotation Quality Check', description: '3 errors to diagnose before you can fix.', time: '5 min', prompts: ['Have I copied from the abstract?', 'Am I describing or evaluating?', 'Is my relevance claim specific?'], aiPrompt: 'A student has written a source annotation. Apply these three checks: (1) Did they copy from the abstract rather than write in their own words? (2) Do they evaluate the source (assess method, context, quality) rather than just describe it? (3) Is the relevance claim specific to their research question or generic? Quote exact phrases where you identify each error.' },
    ],

    resources: [
      { icon: '📄', name: '3 anonymised bad annotations (prepared in advance)', note: 'Show errors without shaming. Use from a previous cohort or write your own.' },
    ],

    exitTicket: {
      prompt: 'Submit your 3 revised annotations. Each must have: method in Sentence 1, specific finding in Sentence 2, specific relevance in Sentence 3.',
      stems: [],
      time: '5 minutes',
      collect: 'This is the pre-submission check for the Decade Digest component.',
    },
  },

  t6: {
    id: 't6', type: 'tutorial', unit: 'u6',
    phase: 'Phase 2a — Unit 6 Tutorial',
    title: 'Period Synthesis Writing',
    subtitle: 'From 5 annotations to a 200-word scholarly synthesis',
    tags: ['Synthesis Writing', 'Pomodoro', 'Assessment 2 Artefact', 'Group Panel Prep'],
    goal: 'Students write their Assessment 2 Period Synthesis (200 words) in the tutorial session, with structured writing support and immediate formative feedback.',

    preWork: [
      { item: '5 reviewed annotations', detail: 'All 5 sources annotated and revised' },
      { item: 'Period synthesis question', detail: '"What did the field know about this topic during my period?" — students should have thought about this' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'mini-lesson',
        title: 'What Is a Synthesis?',
        description: 'One-minute definition + one strong example. Synthesis is not summary — it is what five sources, taken together, reveal.',
        facilitatorScript: 'If I can read your synthesis and not know it is based on 5 different studies — you\'ve summarised, not synthesised. A synthesis says: "Across these studies, a pattern emerges..." not "Study A says... Study B says..."',
      },
      {
        time: '0:05', duration: 25, type: 'pomodoro',
        pomMinutes: 20,
        title: 'Write Your Period Synthesis — 200 Words',
        description: '20-minute Pomodoro: write the Period Synthesis as a complete 200-word analytical paragraph.',
        steps: [
          'Opening sentence: name your time period and the dominant understanding in the field',
          'Body: 3 sentences synthesising patterns across your 5 sources (not source-by-source)',
          'Closing: name one question that was unresolved in your period — this leads to the NEXT period',
          'Word count: 180–220 words. Use your 5 in-text citations.',
        ],
        facilitatorScript: 'Write from your notes, not from your sources. If you need to look up a source to write about it, you don\'t know it well enough yet. Read it again first.',
      },
      {
        time: '0:30', duration: 10, type: 'peer-feedback',
        title: 'Synthesis Quality Check',
        description: 'Partners swap and apply two checks: (1) Is this synthesis or summary? (2) Does it serve a reader who needs to understand a whole decade?',
        steps: [
          'Test: Can you replace the synthesis with individual summaries of each source? If yes, it is summary not synthesis.',
          'Write one specific improvement: "The pattern across your sources is actually... — this would make your synthesis stronger."',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'workshop',
        title: 'Group Panel Submission Prep',
        description: 'Students prepare their Period Synthesis for the Group Panel. Format check and deadline confirmation.',
        facilitatorScript: 'Your Group Panel submission is not just for marks. Your group members are depending on it to write their Field Trajectory sections. If you submit late, you affect everyone\'s ability to complete their work.',
      },
    ],

    processWritingStages: [
      { icon: '🔗', title: 'Synthesis (Not Summary)', description: 'Find the pattern, not the sum.', time: '20 min', prompts: ['What theme appears across 3 or more sources?', 'What changed from early to late in this period?', 'What was assumed without being argued?'], aiPrompt: 'A student has written a 200-word period synthesis about what the research field understood about a topic during a specific decade. Evaluate: Is this a synthesis (identifying patterns across multiple sources) or a summary (describing each source separately)? Does the synthesis make a claim about what the FIELD knew, or just what individual studies found? Does it reference at least 3 sources? Is there a closing sentence that opens toward the next period?' },
    ],

    resources: [
      { icon: '📄', name: 'Model synthesis paragraph', note: 'One example of a strong 200-word period synthesis — not from this module\'s topic' },
      { icon: '🍅', name: 'Pomodoro (20 min)', note: '' },
    ],

    exitTicket: {
      prompt: 'Submit your Period Synthesis (180–220 words, minimum 3 in-text citations). This is the Group Panel submission.',
      stems: [],
      time: '5 minutes',
      collect: 'The Group Panel submission artefact. Count: how many students have submitted 200 words with citations? Report to lecturer.',
    },
  },

  t7: {
    id: 't7', type: 'tutorial', unit: 'u7',
    phase: 'Phase 2b — Unit 7 Tutorial',
    title: 'SIFT Analysis — Upstream Tracing Clinic',
    subtitle: 'The T step is the hardest — targeted practice on tracing to origin',
    tags: ['SIFT T-step', 'Assessment 3 Progress', 'Upstream Tracing', 'Evidence Check'],
    goal: 'Specifically target the most common Assessment 3 weakness: stopping the trace too early. Students practise upstream tracing with direct tutor coaching.',

    preWork: [
      { item: 'Assessment 3 SIFT analysis draft', detail: 'Students bring whatever they have so far' },
      { item: 'Provisional verdict', detail: 'Students should have a verdict — even if uncertain' },
    ],

    blocks: [
      {
        time: '0:00', duration: 8, type: 'diagnostic',
        title: 'Trace Depth Check',
        description: 'Students describe their SIFT T-step in one sentence. Tutor asks: "Is that the origin, or is there a step further back?"',
        steps: [
          'Each student reads their T-step sentence aloud (or shows it)',
          'Tutor asks: "What is the source of THAT source?"',
          'Class identifies: who has genuinely reached the origin? Who has stopped one step early?',
        ],
        facilitatorScript: 'I am looking for: "The claim originated in a 2019 DBE report, page 14, which stated X. The social media post misrepresents this by claiming Y." Not: "I found it on a website that got it from another website."',
      },
      {
        time: '0:08', duration: 18, type: 'workshop',
        title: 'Upstream Tracing Live Clinic',
        description: 'Tutor works with 2–3 students live, in front of the group, tracing their claims further back.',
        steps: [
          'Student 1 shows their current T-step. Group watches tutor trace further.',
          'Student 2 — same.',
          'After each: what additional step was possible? Why did we stop early?',
        ],
        facilitatorScript: 'I am not criticising. I am demonstrating that there is almost always one more step back. The question is whether that step changes your verdict.',
      },
      {
        time: '0:26', duration: 14, type: 'workshop',
        title: 'Individual Tracing Sprint',
        description: 'Students re-do their T-step with the goal of going one step further back.',
        facilitatorScript: 'Every trace has an end — a primary source, a first publication, an original statement. You are looking for that. The marker of reaching it is: there is no further step to take.',
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Revised Verdict Check',
        description: 'Students update their verdict if the deeper trace changed it. Note: it is acceptable for the verdict not to change. The value is in the accuracy of the process.',
      },
    ],

    processWritingStages: [
      { icon: '🔭', title: 'Upstream Tracing', description: 'Go back further. Always one more step.', time: '14 min', prompts: ['Where did THIS source get it from?', 'Is there a primary document — a study, a government report, a statement?', 'Does reaching the origin change my verdict?'] },
    ],

    resources: [
      { icon: '🌐', name: 'Africa Check + Google + Scopus', note: '' },
      { icon: '📋', name: 'Students\' own Assessment 3 drafts', note: '' },
    ],

    exitTicket: {
      prompt: 'Describe your T-step: "The origin of this claim is... (name specific document/source/statement). I know this is the origin because..."',
      stems: ['The origin is…', 'I know this is the origin because…'],
      time: '3 minutes',
      collect: '',
    },
  },

  t8: {
    id: 't8', type: 'tutorial', unit: 'u8',
    phase: 'Phase 2b — Unit 8 Tutorial',
    title: 'Citation Verification Clinic',
    subtitle: 'Individual source verification — no student submits an unverified citation',
    tags: ['Citation Audit', 'APA 7th', 'Assessment 3 Submission Prep', 'Zotero Check'],
    goal: 'Every student who attends this tutorial has their Assessment 3 sources verified before the session ends. No student submits an assessment with unverified citations.',

    preWork: [
      { item: 'Assessment 3 draft reference list', detail: 'Must be in Zotero or ready to be checked' },
      { item: 'Any AI-generated sources', detail: 'Flag any source that came from an AI tool' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Source Provenance Check',
        description: 'Quick status: how many sources do you have? How many are from AI tools? How many have you verified in Scopus?',
        facilitatorScript: 'I am not checking whether your sources are good. I am checking whether they EXIST. Those are different questions.',
      },
      {
        time: '0:05', duration: 20, type: 'workshop',
        title: 'Live Verification — Every Source',
        description: 'Students verify each source in Scopus while tutor circulates and trouble-shoots.',
        steps: [
          'For each source: search exact title in Scopus',
          'Confirm: author matches, journal matches, year matches, DOI matches',
          'Flag any that do not match: AI hallucination or data entry error?',
          'For flagged sources: find a real replacement or decide to cut',
        ],
        facilitatorScript: 'If a source fails verification, you have two options: find the real version (it sometimes exists with different details) or replace it with a real source on the same topic. You cannot submit a source that does not exist.',
      },
      {
        time: '0:25', duration: 10, type: 'workshop',
        title: 'APA 7th Quick Audit',
        description: 'Students check 2 of their reference list entries against the APA 7th anatomy from Unit 9.',
        steps: [
          'Check entry 1: title (sentence case?), journal (italics?), DOI (present and formatted?)',
          'Check entry 2: same checks',
          'Fix in Zotero source record, not just in the Word document',
        ],
      },
      {
        time: '0:35', duration: 8, type: 'peer-feedback',
        title: 'Reference Swap',
        description: 'Pairs swap reference lists. Each person finds one error the other missed.',
      },
      {
        time: '0:43', duration: 2, type: 'process-write',
        title: 'Exit — Submission Ready Status',
        description: 'Students declare: "My Assessment 3 citations are / are not verified and ready." If not: name the specific outstanding item.',
      },
    ],

    processWritingStages: [],

    resources: [
      { icon: '🖥️', name: 'Scopus', note: '' },
      { icon: '🗂️', name: 'Zotero', note: '' },
      { icon: '📋', name: 'APA 7th anatomy diagram (from Unit 9)', note: '' },
    ],

    exitTicket: {
      prompt: 'Exit check: name every source that has been verified in Scopus. If any are not verified, name them and state what you will do before the submission deadline.',
      stems: ['Verified sources:', 'Outstanding:', 'I will fix… by…'],
      time: '2 minutes',
      collect: 'Keep these exit tickets. Students who list outstanding items need a follow-up before the deadline.',
    },
  },

  t9: {
    id: 't9', type: 'tutorial', unit: 'u9',
    phase: 'Phase 2b — Unit 9 Tutorial',
    title: 'Final Artefact Review — Assessment 3 Submission',
    subtitle: 'Pre-submission checklist, editorial introduction, and final polish',
    tags: ['Submission Prep', 'Editorial Introduction', 'Final Review', 'Peer Audit'],
    goal: 'Students complete a structured pre-submission review of Assessment 3. Every student leaves with a submission-ready or clearly identified near-submission-ready artefact.',

    preWork: [
      { item: 'Assessment 3 full draft', detail: 'Claim Verdict + Methodology Note + Editorial Introduction draft (however rough)' },
      { item: 'Assessment 3 submission checklist', detail: 'Students should have reviewed the checklist themselves before attending' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Traffic Light Status',
        description: 'Students self-assess their submission readiness: Green (ready to submit), Amber (1–2 things to fix), Red (significant work remaining).',
        facilitatorScript: 'Be honest with yourself. A false "green" harms you, not me.',
      },
      {
        time: '0:05', duration: 15, type: 'workshop',
        title: 'Editorial Introduction Workshop',
        description: 'The editorial introduction is the component most students have left to last. Intensive workshop on writing it from the Group Panel data.',
        steps: [
          'Open all 5 Group Panel verdicts.',
          'List: what do the 5 claims have in common structurally? Not topically — structurally (how do they mislead?).',
          'Write the opening sentence of your editorial introduction: "The five claims in this Dossier share a structural pattern: they exploit [X] to seem credible."',
          'Then write: two professional habits that would protect a teacher from all five claims.',
        ],
        facilitatorScript: 'The editorial introduction is not about the content of the claims. It is about the PATTERN of how they work. A teacher who understands the pattern is protected from the next claim, not just these five.',
      },
      {
        time: '0:20', duration: 15, type: 'peer-feedback',
        title: 'Structured Submission Review',
        description: 'Pairs exchange full drafts. Each partner completes the submission checklist on behalf of the other.',
        steps: [
          'Work through the Assessment 3 checklist item by item for your partner\'s submission',
          'Tick what is present and correct. Mark what is missing or incomplete.',
          'Write one specific: "The most important thing to fix before submitting is..."',
        ],
        materials: ['Assessment 3 submission checklist (printed)'],
      },
      {
        time: '0:35', duration: 8, type: 'workshop',
        title: 'Fix Time',
        description: 'Students address the ONE most important item identified by their peer reviewer.',
        facilitatorScript: 'You have 8 minutes. One fix. Make it count.',
      },
      {
        time: '0:43', duration: 2, type: 'process-write',
        title: 'Submission Declaration',
        description: 'Students write their honest submission status and their one final outstanding action if any.',
      },
    ],

    processWritingStages: [
      { icon: '📋', title: 'Checklist Review', description: 'A checklist is not a formality — it is a contract with yourself.', time: '10 min', prompts: ['Have I done this — or have I done something that looks like this?', 'Would a stranger reading my submission know what was required?'] },
      { icon: '✍️', title: 'Editorial Introduction Sprint', description: 'Patterns first. Claims second.', time: '15 min', aiPrompt: 'A student has written an editorial introduction to a 5-claim source verification dossier. Evaluate: Does the introduction identify a STRUCTURAL pattern across all 5 claims (how they mislead), or just describe their content? Does it identify 2 specific professional habits that would protect a teacher? Does it cite findings from at least 2 other group verdicts? Is the register appropriate for a professional dossier?' },
    ],

    resources: [
      { icon: '📋', name: 'Assessment 3 submission checklist (printed)', note: 'One per student' },
      { icon: '🖥️', name: 'Group Panel (all 5 verdicts)', note: '' },
    ],

    exitTicket: {
      prompt: 'Submission status: Green/Amber/Red + the ONE thing remaining if Amber/Red + the deadline you have set for yourself.',
      stems: ['Status:', 'Outstanding:', 'I will complete this by…'],
      time: '2 minutes',
      collect: 'Tutor keeps Red and Amber cards. Follow up individually before the submission deadline.',
    },
  },
};

// Metadata index for navigation
export const SESSION_META = {
  contact: [
    // Phase 1 — Understanding the Landscape
    { id: 'c1',  unit: 'u1',  phase: 'Phase 1', label: 'C1 — AI in Education' },
    { id: 'c2',  unit: 'u2',  phase: 'Phase 1', label: 'C2 — Filter Bubbles Audit' },
    { id: 'c3',  unit: 'u3',  phase: 'Phase 1', label: 'C3 — Cognitive Bias + SIFT' },
    // Phase 2 — Finding & Evaluating Knowledge
    { id: 'c4',  unit: 'u4',  phase: 'Phase 2', label: 'C4 — Deep Work Design' },
    { id: 'c5',  unit: 'u5',  phase: 'Phase 2', label: 'C5 — Live Scopus Search' },
    { id: 'c6',  unit: 'u6',  phase: 'Phase 2', label: 'C6 — Research Detective' },
    { id: 'c7',  unit: 'u7',  phase: 'Phase 2', label: 'C7 — Lateral Reading Lab' },
    { id: 'c8',  unit: 'u8',  phase: 'Phase 2', label: 'C8 — Hallucination Hunt' },
    { id: 'c9',  unit: 'u9',  phase: 'Phase 2', label: 'C9 — Zotero Clinic' },
    // Phase 3 — Academic Communication
    { id: 'c10', unit: 'u10', phase: 'Phase 3', label: 'C10 — Strategic Reading Lab' },
    { id: 'c11', unit: 'u11', phase: 'Phase 3', label: 'C11 — Note-Taking Systems' },
    { id: 'c12', unit: 'u12', phase: 'Phase 3', label: 'C12 — PEEL Construction' },
    { id: 'c13', unit: 'u13', phase: 'Phase 3', label: 'C13 — Academic Voice Clinic' },
    { id: 'c14', unit: 'u14', phase: 'Phase 3', label: 'C14 — Visual Argument Clinic' },
    { id: 'c15', unit: 'u15', phase: 'Phase 3', label: 'C15 — Peer Review Workshop' },
    // Phase 4 — AI as a Scholarly Tool
    { id: 'c16', unit: 'u16', phase: 'Phase 4', label: 'C16 — Prompt Engineering Lab' },
    { id: 'c17', unit: 'u17', phase: 'Phase 4', label: 'C17 — Literature Mapping' },
    { id: 'c18', unit: 'u18', phase: 'Phase 4', label: 'C18 — AI Ethics Tribunal' },
    // Phase 5 — The Future Scholar
    { id: 'c19', unit: 'u19', phase: 'Phase 5', label: 'C19 — Literature Review Workshop' },
    { id: 'c20', unit: 'u20', phase: 'Phase 5', label: 'C20 — Scholar\'s Showcase' },
  ],
  tutorial: [
    // Phase 1
    { id: 't1',  unit: 'u1',  phase: 'Phase 1', label: 'T1 — AI Vocabulary + A1 Orientation' },
    { id: 't2',  unit: 'u2',  phase: 'Phase 1', label: 'T2 — Observation Paragraphs' },
    { id: 't3',  unit: 'u3',  phase: 'Phase 1', label: 'T3 — Assessment 1 Launch' },
    // Phase 2
    { id: 't4',  unit: 'u4',  phase: 'Phase 2', label: 'T4 — Deep Work Check-In' },
    { id: 't5',  unit: 'u5',  phase: 'Phase 2', label: 'T5 — Annotation Clinic' },
    { id: 't6',  unit: 'u6',  phase: 'Phase 2', label: 'T6 — Period Synthesis Writing' },
    { id: 't7',  unit: 'u7',  phase: 'Phase 2', label: 'T7 — Upstream Tracing Clinic' },
    { id: 't8',  unit: 'u8',  phase: 'Phase 2', label: 'T8 — Citation Verification' },
    { id: 't9',  unit: 'u9',  phase: 'Phase 2', label: 'T9 — Assessment 3 Submission Prep' },
    // Phase 3
    { id: 't10', unit: 'u10', phase: 'Phase 3', label: 'T10 — Three-Pass Reading Practice' },
    { id: 't11', unit: 'u11', phase: 'Phase 3', label: 'T11 — Notes Transformation' },
    { id: 't12', unit: 'u12', phase: 'Phase 3', label: 'T12 — PEEL Revision Clinic' },
    { id: 't13', unit: 'u13', phase: 'Phase 3', label: 'T13 — Register Transformation' },
    { id: 't14', unit: 'u14', phase: 'Phase 3', label: 'T14 — Data Visualisation Deconstruction' },
    { id: 't15', unit: 'u15', phase: 'Phase 3', label: 'T15 — Assessment 4 Peer Review Clinic' },
    // Phase 4
    { id: 't16', unit: 'u16', phase: 'Phase 4', label: 'T16 — Prompt Design Workshop' },
    { id: 't17', unit: 'u17', phase: 'Phase 4', label: 'T17 — Synthesis Matrix to Paragraph' },
    { id: 't18', unit: 'u18', phase: 'Phase 4', label: 'T18 — AI Ethics Policy + Tribunal Prep' },
    // Phase 5
    { id: 't19', unit: 'u19', phase: 'Phase 5', label: 'T19 — Literature Review Revision Clinic' },
    { id: 't20', unit: 'u20', phase: 'Phase 5', label: 'T20 — Mission Statement + Module Close' },
  ],
};

// ── Phase 3 Contact Sessions ─────────────────────────────────────────────────
Object.assign(SESSIONS, {

  c10: {
    id: 'c10', type: 'contact', unit: 'u10',
    phase: 'Phase 3 — Unit 10',
    title: 'Strategic Reading Lab',
    subtitle: 'Apply the three-pass method to a real journal article in real time',
    tags: ['Three-Pass Reading', 'Analytical Reading', 'Critical Questions', 'Pass 3 Practice'],
    goal: 'Every student completes a full three-pass reading of the same article and produces a written analytical position on it — not a summary, a position.',

    preWork: [
      { item: 'Unit 10 Module', detail: 'Three-pass method video + scholarly reading text + reflection questions' },
      { item: 'Scopus account active', detail: 'You will need to access a journal article in session' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Reading Confession',
        description: 'Students write for 3 minutes: "My honest description of how I read academic articles right now." Then two volunteers share. No judgement — this is a diagnostic.',
        facilitatorScript: 'No right answers. I need to know where we actually are before I show you where we are going.',
      },
      {
        time: '0:10', duration: 15, type: 'live-demo',
        title: 'Pass One: Live Orientation — 10 Minutes',
        description: 'Facilitator demonstrates Pass One on a projected article: title, abstract, headings, conclusion ONLY. Timer running. Models the decision: read this in full? Yes/No/Maybe.',
        steps: [
          'Project article on screen',
          'Read title aloud — what does this claim to be about?',
          'Read abstract — what is the research question and main finding?',
          'Scan section headings — what structure does this argument have?',
          'Read conclusion — what do they claim to have shown?',
          'Verdict: worth reading in full for what purpose?',
        ],
        facilitatorScript: 'I am not reading this thoroughly. I am mapping it. I want to know in 8 minutes whether this article is worth 40 minutes of my time.',
      },
      {
        time: '0:25', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Pass Two + Three — Solo Deep Read',
        description: 'Students read the full article, making brief margin-style notes. Then Pass Three: apply the six critical questions.',
        steps: [
          'Read full article — do not stop at every unknown word',
          'Note: main claim? Evidence type? Methodology? Key finding?',
          'PASS THREE: What assumptions does the author make?',
          'PASS THREE: Are the conclusions supported by the evidence?',
          'PASS THREE: What does the methodology not allow us to know?',
          'PASS THREE: How does this connect to or contradict other readings?',
        ],
        materials: ['Shared article (distributed by facilitator)', 'Annotation tool or printed copy'],
        facilitatorScript: 'Pass Three is where you become a reader, not a student. I want to see argument on paper, not summary.',
      },
      {
        time: '0:55', duration: 20, type: 'think-pair',
        title: 'Analytical Position Exchange',
        description: 'Pairs share their Pass Three positions. Not summaries — positions. What do you think about this article?',
        steps: [
          'Partner A: state your analytical position in 2 sentences. No summary allowed.',
          'Partner B: respond — agree, challenge, or add a dimension A missed.',
          'Together: What is the single most important limitation of this paper?',
          'Pairs share out: one finding from their Pass Three that the class should hear.',
        ],
      },
      {
        time: '1:15', duration: 15, type: 'process-write',
        title: 'Abstract → Analytical Summary',
        description: 'Students write a 120-word analytical summary — not a report, an evaluation.',
        steps: [
          'Sentence 1: The paper\'s main argument in your own words',
          'Sentence 2–3: The evidence they use and its type (qualitative/quantitative/review)',
          'Sentence 4–5: Your critical position — what the paper establishes AND what it leaves open',
          'Do not use direct quotes. Everything in your own words.',
        ],
      },
    ],

    processWritingStages: [
      { icon: '🗺️', title: 'Pass One — Orient', description: 'Read for shape, not content. Decide whether to read fully.', time: '5–10 min', prompts: ['What is the research question?', 'What is the main finding?', 'Is this worth reading in full?'] },
      { icon: '📖', title: 'Pass Two — Understand', description: 'Read for the argument. Take brief notes, not transcription.', time: '20–40 min', prompts: ['What claim is being made?', 'What evidence supports it?', 'What methodology was used?'] },
      { icon: '🔬', title: 'Pass Three — Critique', description: 'Evaluate assumptions, evidence quality, and limitations.', time: '30–60 min', prompts: ['What does the author assume without stating?', 'Does the evidence support the conclusion?', 'What can\'t this methodology tell us?'], aiPrompt: 'A student has read this academic abstract and written a Pass Three critical response. Evaluate their response: Does it go beyond summary to genuine analytical critique? Does it identify assumptions? Does it evaluate the evidence quality? Does it identify methodological limitations? Give specific, actionable feedback.' },
      { icon: '✍️', title: 'Analytical Summary', description: 'Write 120 words: argument + evidence type + critical position.', time: '10 min', prompts: ['What does this paper establish?', 'What does it leave open?', 'What is YOUR analytical position on it?'] },
    ],

    resources: [
      { icon: '📄', name: 'Shared article (distributed in session)', note: '' },
      { icon: '🔗', name: 'Three-pass method reference card', note: '' },
    ],

    exitTicket: {
      prompt: 'What is the difference between a summary and an analytical position? Write one sentence defining each.',
      stems: ['A summary is…', 'An analytical position is…'],
      time: '3 minutes',
      collect: 'Spot-check: look for students who write two summaries. These students need targeted support in the next session.',
    },
  },

  c11: {
    id: 'c11', type: 'contact', unit: 'u11',
    phase: 'Phase 3 — Unit 11',
    title: 'Note-Taking Systems Workshop',
    subtitle: 'Build notes that think — Cornell, Zettelkasten, and synthesis across sources',
    tags: ['Cornell Notes', 'Atomic Notes', 'Synthesis', 'Cross-Source Connections'],
    goal: 'Every student leaves with a functional Cornell note template for their subject, a demonstration of atomic note-writing in their own words, and one explicit connection drawn between two different sources.',

    preWork: [
      { item: 'Unit 11 Module', detail: 'Cornell note-taking video + notes-that-think reading + reflection' },
      { item: 'Any recent lecture notes', detail: 'Bring your actual notes — we will audit them' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Notes Audit',
        description: 'Students look at their own notes from a recent lecture or reading. Answer: What percentage of these notes could another person understand without having attended the lecture? What percentage is YOUR thinking vs someone else\'s words?',
        facilitatorScript: 'I am not grading this. I am asking you to see what you actually have.',
      },
      {
        time: '0:10', duration: 20, type: 'workshop',
        title: 'Cornell Template Setup + Live Rewrite',
        description: 'Students set up the Cornell layout and rewrite 15 minutes of notes from their audit into Cornell format.',
        steps: [
          'Draw Cornell layout: wide right column, narrow left column, summary box at bottom',
          'Main notes go in the right column — paraphrase, don\'t transcribe',
          'After writing, fill left column with cue words and questions — these are for active recall',
          'Write 2-sentence summary at the bottom',
          'Test: cover the right column and see if you can reconstruct the key ideas from the cues alone',
        ],
        materials: ['A4 paper or Cornell template printout', 'Existing lecture notes to rewrite'],
        facilitatorScript: 'The cue column is not optional. It is the part of the note that makes it a revision tool rather than a record.',
      },
      {
        time: '0:30', duration: 25, type: 'pomodoro',
        pomMinutes: 20,
        title: 'Atomic Note Practice',
        description: 'Students practice writing atomic notes from a shared reading — one idea per note, in their own words, with a connection to another note.',
        steps: [
          'Read the first two paragraphs of the shared reading',
          'Write ONE atomic note: one idea, in your own words, in a full sentence',
          'Write a second atomic note from the next two paragraphs',
          'Write a third note that explicitly CONNECTS the first two: "This connects to [note 1] because…" or "This contradicts [note 1] because…"',
          'The connection note is the hardest — and the most valuable',
        ],
        facilitatorScript: 'An atomic note is not a bullet point. It is a complete thought, in your words, that could stand alone. If it cannot stand alone, it is not atomic.',
      },
      {
        time: '0:55', duration: 20, type: 'think-pair',
        title: 'Cross-Source Synthesis Practice',
        description: 'Pairs use their notes from this session AND a reading from a previous unit to find one connection or contradiction.',
        steps: [
          'Partner A: share your atomic note on the shared reading',
          'Partner B: find a connection to any other reading from units 1–10',
          'Together: write one sentence that synthesises the two ideas: "Both X and Y argue… However, they differ in…"',
          'Share with the class: what connection did you find?',
        ],
        facilitatorScript: 'This is the skill that turns notes into literature review paragraphs. Connection-finding is not accidental — it is deliberate.',
      },
      {
        time: '1:15', duration: 15, type: 'process-write',
        title: 'Note Reflection: Before and After',
        description: 'Students write a short before/after reflection: what their note-taking looked like before this session and what specific changes they will make.',
        prompts: ['Before this session, my notes were…', 'The specific change I will make immediately is…', 'The connection I found between sources today suggests…'],
      },
    ],

    processWritingStages: [
      { icon: '📋', title: 'Cornell Setup', description: 'Layout first. The structure itself is the thinking tool.', time: '5 min', prompts: ['Have I left space for the cue column?', 'Is the summary box at the bottom?', 'Am I paraphrasing, not transcribing?'] },
      { icon: '⚛️', title: 'Atomic Notes', description: 'One idea per note. In your own words. Complete sentence.', time: '15 min', prompts: ['Is this a single idea or multiple ideas?', 'Could this note stand alone?', 'Have I written it in my own words or copied?'] },
      { icon: '🔗', title: 'Connection Notes', description: 'Find the link between two notes. This is where synthesis begins.', time: '10 min', prompts: ['What does this connect to?', 'Where does this agree or contradict?', 'What new insight does the connection reveal?'], aiPrompt: 'A student has written an atomic note about an academic concept. Evaluate: Is it a single, complete idea? Is it in the student\'s own words or a paraphrase that\'s too close to the original? Does it have enough context to stand alone? Give 2 specific improvement suggestions.' },
    ],

    resources: [
      { icon: '📋', name: 'Cornell template (printed or digital)', note: 'One per student' },
      { icon: '📄', name: 'Shared reading for atomic note practice', note: '' },
    ],

    exitTicket: {
      prompt: 'Write one atomic note from today\'s session and one connection to a previous unit\'s reading.',
      stems: ['Atomic note: …', 'Connection to [Unit X] reading: …'],
      time: '3 minutes',
      collect: 'Look for connections that are superficial ("both mention learning") vs substantive ("both argue that…, but they differ in…").',
    },
  },

  c12: {
    id: 'c12', type: 'contact', unit: 'u12',
    phase: 'Phase 3 — Unit 12',
    title: 'PEEL Construction Workshop',
    subtitle: 'From thesis to linked paragraph — build it live, get feedback',
    tags: ['PEEL Structure', 'Thesis Statements', 'Analytical Writing', 'Evidence Integration'],
    goal: 'Every student writes a complete PEEL paragraph with a contestable point, specific cited evidence, genuine analytical explanation, and a strong link — and receives criterion-referenced peer feedback on all four elements.',

    preWork: [
      { item: 'Unit 12 Module', detail: 'Academic essay writing video + PEEL reading + model paragraph analysis' },
      { item: 'One peer-reviewed source on your teaching subject', detail: 'APA citation ready — you will use it as evidence today' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Topic Sentence Sort',
        description: 'Facilitator displays 6 "topic sentences" — 2 are genuine arguments, 4 are topics/questions/descriptions. Students vote and explain why.',
        facilitatorScript: 'A topic sentence is not a topic. It is a claim. The test: can a reasonable person disagree with it? If no one would disagree, it is not an argument.',
      },
      {
        time: '0:10', duration: 15, type: 'workshop',
        title: 'Point Sentence Forge',
        description: 'Students write 3 candidate point sentences for their teaching subject topic. Pairs evaluate each using the "can a reasonable person disagree?" test.',
        steps: [
          'Choose a broad topic relevant to your teaching subject (e.g., technology in classrooms, play-based learning, inclusive education)',
          'Write THREE potential point sentences — try to make each progressively more specific and contestable',
          'Mark each as: A) Too broad B) Better C) Specific and arguable',
          'Share your best one with a partner — can they disagree? Good.',
        ],
        facilitatorScript: 'Broad claim: "Technology affects learning." Specific claim: "Unequal access to educational technology deepens existing inequalities in South African schooling." One of these is a topic, one is an argument. Only one can be the first sentence of an academic paragraph.',
      },
      {
        time: '0:25', duration: 35, type: 'pomodoro',
        pomMinutes: 30,
        title: 'Full PEEL Construction — Timed',
        description: 'Students write a complete PEEL paragraph (180–220 words) using their best Point sentence and their prepared source as Evidence.',
        steps: [
          'Point: your best topic sentence from the previous activity',
          'Evidence: introduce your source with author and year. Be specific — which finding exactly?',
          'Explanation: "This suggests that…" — analytical move. What does this evidence prove? Why does it matter for YOUR argument?',
          'Link: "This supports the argument that…" — connect back to your point',
          'Check: Is the Point arguable? Is the Evidence specific and cited? Is the Explanation analytical? Does the Link close the loop?',
        ],
        materials: ['Prepared peer-reviewed source', 'APA 7th quick reference'],
        facilitatorScript: 'Twenty-five minutes to write one paragraph. This is not a long time — it is exactly how long a focused writer takes. Use all of it.',
      },
      {
        time: '1:00', duration: 20, type: 'peer-feedback',
        title: 'PEEL Peer Review',
        description: 'Structured peer review: each reviewer evaluates all four PEEL elements with specific, criterion-referenced comments.',
        steps: [
          'Reviewer reads paragraph once all the way through',
          'Point: Is the first sentence a specific, contestable argument? Write one sentence evaluating it.',
          'Evidence: Is there a specific source cited with author and year? Is the evidence precise or vague?',
          'Explanation: Does the writer say what the evidence MEANS for the argument? Or do they just repeat the evidence?',
          'Link: Does the final sentence connect back to the Point?',
          'Overall: What is the ONE highest-priority revision this paragraph needs?',
        ],
        facilitatorScript: 'The most common weakness in student PEEL paragraphs is the Explanation. "This shows that learning is important" is not explanation — it is a placeholder. Point to where explanation is needed.',
      },
      {
        time: '1:20', duration: 10, type: 'workshop',
        title: 'Revision Sprint',
        description: 'Students make targeted revisions to the most important element identified in peer review.',
      },
    ],

    processWritingStages: [
      { icon: '🎯', title: 'Point', description: 'Write a specific, contestable claim. Test: can a reasonable person disagree?', time: '5 min', prompts: ['Is this a topic or an argument?', 'Can someone disagree with this?', 'Is it specific enough to prove in one paragraph?'] },
      { icon: '📚', title: 'Evidence', description: 'Introduce your source precisely. Which finding? Which page?', time: '5 min', prompts: ['Have I named the author and year?', 'Is this a specific finding or a vague gesture?', 'Have I used the exact, relevant piece of evidence?'] },
      { icon: '🔍', title: 'Explanation', description: 'What does this evidence mean for YOUR argument? The "so what" move.', time: '10 min', prompts: ['What does this prove?', 'Why does this matter for my specific argument?', 'Have I said "This suggests that…" or equivalent?'], aiPrompt: 'A student has written a PEEL paragraph. Evaluate each element: Point (is it a specific, contestable argument?), Evidence (is it specifically cited and precise?), Explanation (does it genuinely analyse what the evidence means for the argument, or does it just repeat the evidence?), Link (does it connect back to the Point?). Be direct and specific about which element needs the most work.' },
      { icon: '🔗', title: 'Link', description: 'Close the loop. Return the reader to the essay\'s thesis.', time: '5 min', prompts: ['Does this sentence name the essay\'s larger argument?', 'Does it make explicit what this paragraph has proven?'] },
    ],

    resources: [
      { icon: '📄', name: 'Model PEEL paragraph (annotated)', note: 'From Unit 12 reading' },
      { icon: '📋', name: 'PEEL peer review rubric', note: 'One per student pair' },
    ],

    exitTicket: {
      prompt: 'Which PEEL element do you find hardest to write and why? What will you do differently in your next draft?',
      stems: ['The hardest element for me is… because…', 'In my next draft I will…'],
      time: '3 minutes',
      collect: 'Most common response will be Explanation. Use this to plan support for the next session.',
    },
  },

  c13: {
    id: 'c13', type: 'contact', unit: 'u13',
    phase: 'Phase 3 — Unit 13',
    title: 'Academic Voice Clinic',
    subtitle: 'Register transformation, hedging practice, and revision for academic prose',
    tags: ['Academic Register', 'Hedging Language', 'Revision', 'Voice Development'],
    goal: 'Every student revises an informal piece of writing into academic register and leaves able to identify the specific linguistic features that distinguish formal from informal academic prose.',

    preWork: [
      { item: 'Unit 13 Module', detail: 'Academic register video + hedging reading + informal→formal revision task' },
      { item: 'An informal piece of writing', detail: 'Could be a WhatsApp message, a casual explanation, or a rough first draft — something to transform' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Register Radar',
        description: 'Facilitator reads three sentences aloud. Students rate each 1–5 for academic register and explain WHY — naming the specific features.',
        facilitatorScript: 'I don\'t want "this sounds informal." I want the linguistic feature: contraction, first person informality, hedge missing, overclaim. Name the thing.',
      },
      {
        time: '0:10', duration: 20, type: 'workshop',
        title: 'Sentence Surgery',
        description: 'Students receive 6 informal sentences and must transform each to academic register. Works in pairs, compares transformations.',
        steps: [
          'Sentence 1: Remove contractions',
          'Sentence 2: Replace informal intensifiers (really, very, totally) with precise language or evidence',
          'Sentence 3: Add a hedge to an overclaimed statement',
          'Sentence 4: Remove "obviously," "clearly," "everyone knows"',
          'Sentence 5: Convert first-person casual ("I think") to appropriate academic framing',
          'Sentence 6: Transform the whole: informal + no evidence → formal + hedged + evidence reference',
        ],
        facilitatorScript: 'Informal writing is not bad thinking. Academic writing is a different register for a different context — like the difference between how you speak to your students and how you write a lesson plan for an inspector.',
      },
      {
        time: '0:30', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Hedging Paragraph Workshop',
        description: 'Students write a 150-word paragraph on a teaching-related claim using EVERY hedging technique from the unit reading.',
        steps: [
          'Choose one empirical claim you want to make about learning or teaching',
          'Write the overclaimed version first: definite, universal, unhedged',
          'Rewrite: replace definite with hedged (may, appears to, suggests, tends to)',
          'Add a source: who supports this claim?',
          'Add a limitation: "though this evidence is drawn from… and may not apply to…"',
          'Final check: Does every claim have appropriate epistemic humility?',
        ],
        facilitatorScript: 'Hedging is not weakness. It is accuracy. When researchers say "this study suggests…" they are being MORE honest than a confident but unsupported claim.',
      },
      {
        time: '1:00', duration: 20, type: 'peer-feedback',
        title: 'Register Audit — Pair Reading',
        description: 'Pairs exchange hedging paragraphs and apply a 5-point register audit: contractions, intensifiers, hedges present, evidence cited, claims appropriate.',
        steps: [
          'Scan for contractions: circle each one',
          'Scan for informal intensifiers: underline each one',
          'Check each empirical claim: is there a hedge? Circle claims with no hedge.',
          'Check for evidence: at least one source referenced?',
          'Overall register score: 1–5 with one sentence of justification',
          'Return with written comments, not verbal only',
        ],
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Personal Register Audit',
        description: 'Students audit their own PEEL paragraph from c12. What register issues remain?',
      },
    ],

    processWritingStages: [
      { icon: '🎭', title: 'Register Awareness', description: 'Identify your current register. Name the informal features.', time: '5 min', prompts: ['Contractions?', 'Informal intensifiers?', 'Overclaims without evidence?', '"Obviously" or "clearly"?'] },
      { icon: '🔧', title: 'Transformation', description: 'Systematic replacement: feature by feature.', time: '10 min', prompts: ['What\'s the formal equivalent of this word?', 'Have I removed all contractions?', 'Is every definite claim now hedged?'] },
      { icon: '🌱', title: 'Hedging', description: 'Add epistemic appropriateness. Claims match evidence strength.', time: '10 min', prompts: ['Should this be "suggests" not "proves"?', 'Should this be "may" not "does"?', 'Does my claim go beyond what my evidence supports?'], aiPrompt: 'A student has written a paragraph in an attempt to use academic register and hedging. Identify: (1) Any remaining contractions or informal language. (2) Any overclaimed statements that need hedging. (3) Any missing evidence references. (4) One sentence that is closest to correct academic register and explain why it works.' },
    ],

    resources: [
      { icon: '📋', name: 'Informal → academic sentence set (6 sentences)', note: '' },
      { icon: '📋', name: 'Register audit checklist', note: 'Contractions / Intensifiers / Hedges / Evidence / Overclaims' },
    ],

    exitTicket: {
      prompt: 'Write the sentence from your paragraph that you are most confident is in correct academic register. Then write the one that still needs work.',
      stems: ['Best sentence: …', 'Needs work: …', 'I will fix it by…'],
      time: '3 minutes',
      collect: 'Track the "needs work" sentences — these are the most useful data for next session planning.',
    },
  },

  c14: {
    id: 'c14', type: 'contact', unit: 'u14',
    phase: 'Phase 3 — Unit 14',
    title: 'Visual Argument Clinic',
    subtitle: 'Interrogate, decode, and describe data visualisations analytically',
    tags: ['Visual Literacy', 'Data Analysis', 'Critical Reading of Graphs', 'Visual Rhetoric'],
    goal: 'Every student applies the four analytical questions to two real data visualisations and writes a precise academic description of one — distinguishing what the visual shows from what it argues.',

    preWork: [
      { item: 'Unit 14 Module', detail: 'McCandless TED talk + visual argument reading + four-question framework + visual literacy task' },
      { item: 'One data visualisation from any source', detail: 'From a news article, government report, or academic paper — bring the URL or a screenshot' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Which Graph Misleads?',
        description: 'Facilitator shows pairs of bar charts: identical data, different y-axis start points. Students vote: which tells the truth? Answer: both do, technically — but both also argue different things.',
        facilitatorScript: 'Both charts are using real data. Both charts are also making choices that shape interpretation. Your job is to see both the data AND the argument.',
      },
      {
        time: '0:10', duration: 20, type: 'workshop',
        title: 'Four-Question Framework — Live Application',
        description: 'Class works through the four analytical questions on a shared data visualisation projected on screen.',
        steps: [
          'Q1 — What is being measured, and how? (Define the variable precisely)',
          'Q2 — What is the baseline and scale? (Check the y-axis. Check the comparison group.)',
          'Q3 — What is the source? (Who produced this? When? For what purpose?)',
          'Q4 — What is outside the frame? (What context would change the interpretation?)',
        ],
        facilitatorScript: 'Work through each question aloud. I am modelling the internal monologue of a critical reader, not a test question.',
      },
      {
        time: '0:30', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Student Visualisation Analysis',
        description: 'Students apply the four-question framework to their own brought visualisation and write a 150-word analytical description.',
        steps: [
          'Apply all four analytical questions — write your answers',
          'Write a 150-word analytical description: what does this visual show AND what does it argue?',
          'Include: what is being measured, scale issues (if any), data source, and ONE thing outside the frame',
          'Final sentence: Is this visualisation honest and well-designed? Why or why not?',
        ],
      },
      {
        time: '1:00', duration: 20, type: 'gallery-walk',
        title: 'Visualisation Gallery',
        description: 'Students share their visualisations on screens or printed. Gallery walk: sticky note comments on each using the four-question framework.',
        steps: [
          'Post your visualisation (projected or printed)',
          'Walk the gallery — 3 minutes per visualisation',
          'Leave one sticky note identifying something the analyst noticed AND one they may have missed',
          'Return to your own: read the sticky notes. Add any missed points to your analysis.',
        ],
        facilitatorScript: 'The goal is not to find every flaw — it is to practice the habit of asking these questions automatically, with every visual you encounter.',
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Verdict Sentences',
        description: 'Students write a one-sentence academic verdict on their visualisation, using appropriate hedging language.',
      },
    ],

    processWritingStages: [
      { icon: '🔍', title: 'Observation', description: 'What is literally shown? Name every element.', time: '5 min', prompts: ['What is on the x-axis?', 'Where does the y-axis start?', 'What do the colours/sizes represent?'] },
      { icon: '❓', title: 'Four Questions', description: 'Apply the framework systematically.', time: '10 min', prompts: ['What exactly is being measured?', 'Does the scale distort magnitude?', 'Who produced this and why?', 'What is missing from the frame?'] },
      { icon: '🎯', title: 'Argument Identification', description: 'What is this visual arguing beyond its literal data?', time: '10 min', prompts: ['What does the designer want me to conclude?', 'What would change if the scale were different?', 'What alternative interpretation is suppressed?'], aiPrompt: 'A student has described a data visualisation using the four analytical questions framework. Evaluate: (1) Did they identify the specific measurement, not just the broad topic? (2) Did they check scale and baseline? (3) Did they consider the data source and its implications? (4) Did they identify what is outside the frame? What is the most important analytical move they missed?' },
    ],

    resources: [
      { icon: '📊', name: 'Pair of comparative bar charts (same data, different y-axis)', note: '' },
      { icon: '🖥️', name: 'Shared projected visualisation', note: 'Facilitator selects from SA education or policy data' },
    ],

    exitTicket: {
      prompt: 'Write one sentence that begins: "This visualisation argues that… but what it does not show is…"',
      stems: ['This visualisation argues that…', 'What it does not show is…'],
      time: '2 minutes',
      collect: 'Check that students are completing both halves — the argument AND the omission.',
    },
  },

  c15: {
    id: 'c15', type: 'contact', unit: 'u15',
    phase: 'Phase 3 — Unit 15',
    title: 'Peer Review Workshop — Assessment 4 Focus',
    subtitle: 'Give criterion-referenced feedback that writers can actually use',
    tags: ['Peer Review', 'Criterion-Referenced Feedback', 'Feedforward', 'Assessment 4 Prep'],
    goal: 'Every student writes a 250-word peer review of a fellow student\'s Assessment 4 draft — specific, criterion-referenced, with at least one genuine feedforward statement. Every student receives actionable feedback they can use to revise.',

    preWork: [
      { item: 'Unit 15 Module', detail: 'Feedback video + peer review protocol reading + vague vs useful comparison table' },
      { item: 'Assessment 4 draft (any stage)', detail: 'At minimum a paragraph — something for others to respond to' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Feedback Graveyard',
        description: 'Facilitator reads out five real examples of useless feedback (anonymised). Students identify exactly what makes each one unusable.',
        facilitatorScript: '"Good job!" — what\'s wrong with this? It\'s not about positivity — it\'s about actionability. What does the writer do next? Nothing. That\'s the problem.',
      },
      {
        time: '0:10', duration: 15, type: 'workshop',
        title: 'Feedback Transformation',
        description: 'Pairs receive vague feedback statements and must transform them into criterion-referenced, feedforward comments.',
        steps: [
          '"Your introduction is weak" → Name the specific element missing, what it would contain, and where to put it',
          '"Add more analysis" → Name which sentence needs analysis, what analytical move is missing, what "more analysis" would say',
          '"Good evidence" → Name which evidence, why it is good, and what to do more of',
          '"The structure is confusing" → Name the specific structural problem and what the correct sequence would be',
        ],
      },
      {
        time: '0:25', duration: 35, type: 'pomodoro',
        pomMinutes: 30,
        title: 'Assessment 4 Peer Review',
        description: 'Students write their peer reviews of a classmate\'s Assessment 4 draft using the four-part protocol.',
        steps: [
          'Read the draft once all the way through without writing anything',
          'Re-read against the Assessment 4 criteria: which criteria are met? Which are not?',
          'Name one specific thing that works — with the criterion it meets',
          'Identify the single most important gap — with the criterion it falls short of',
          'Describe what improvement would look like — specific, actionable, kind',
          'Write one feedforward sentence: what should the writer focus on in revision?',
        ],
        materials: ['Assessment 4 criteria sheet', 'Peer review protocol reference card'],
        facilitatorScript: 'You have thirty minutes. This is a real piece of feedback for a real person. Make it useful.',
      },
      {
        time: '1:00', duration: 15, type: 'think-pair',
        title: 'Reading Your Feedback',
        description: 'Writers read their received feedback silently, then discuss with a new partner: what will you do with this? What is the most actionable comment?',
        steps: [
          'Read all received feedback silently (5 minutes)',
          'Identify the single most actionable comment',
          'Tell your partner: what specific revision will you make as a result?',
          'Discuss: what feedback was most useful and why?',
        ],
      },
      {
        time: '1:15', duration: 15, type: 'process-write',
        title: 'Revision Planning',
        description: 'Based on feedback received, students write a concrete revision plan: which element, what change, in what order.',
      },
    ],

    processWritingStages: [
      { icon: '📋', title: 'Criteria Engagement', description: 'Read the rubric before reading the work. Know what you are looking for.', time: '5 min', prompts: ['What are the assessment criteria?', 'Which criterion am I most qualified to evaluate?', 'What does "meeting the standard" look like for each criterion?'] },
      { icon: '🔍', title: 'Specific Identification', description: 'Name the element, locate it in the text, evaluate it against the criterion.', time: '10 min', prompts: ['Where exactly in the text is this problem?', 'Which specific criterion does this fall short of?', 'What would meeting the criterion look like here?'] },
      { icon: '🚀', title: 'Feedforward', description: 'What should the writer do differently in revision?', time: '10 min', prompts: ['What is the single most important revision?', 'What would I do if this were my paragraph?', 'What would the improved version contain?'], aiPrompt: 'A student has written a peer review of an academic paragraph. Evaluate the quality of the feedback: Is it criterion-referenced (does it name which standard is or is not met)? Is it specific (does it locate the issue in the text)? Does it include feedforward (does it say what to do, not just what is wrong)? What is the most important improvement the reviewer should make to give better feedback?' },
    ],

    resources: [
      { icon: '📋', name: 'Assessment 4 criteria sheet', note: 'One per student' },
      { icon: '📋', name: 'Peer review protocol card', note: 'Four-part protocol' },
    ],

    exitTicket: {
      prompt: 'What is the revision you will make to your Assessment 4 draft as a direct result of the feedback you received today?',
      stems: ['Based on the feedback, I will change…', 'The specific thing I am adding is…', 'The criterion this addresses is…'],
      time: '3 minutes',
      collect: 'Students who say "I will make it better" have not engaged with the feedback. Check for specificity.',
    },
  },

  c16: {
    id: 'c16', type: 'contact', unit: 'u16',
    phase: 'Phase 4 — Unit 16',
    title: 'Prompt Engineering Lab',
    subtitle: 'Design and test CREATE prompts for real academic tasks',
    tags: ['Prompt Engineering', 'CREATE Framework', 'AI Hallucination', 'Academic AI Use'],
    goal: 'Every student designs and tests a CREATE-framework prompt for a real academic task, compares it to a vague prompt, and documents the difference in output quality.',

    preWork: [
      { item: 'Unit 16 Module', detail: 'Prompt engineering video + CREATE framework reading + hallucination examples' },
      { item: 'One real academic task in progress', detail: 'Essay question, paragraph to review, concept to understand — you need a real use case' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Vague vs Specific — Live Demo',
        description: 'Facilitator sends two prompts to an AI tool on the projector: a vague one and a CREATE-structured one for the same task. Class observes and analyses the output differences.',
        facilitatorScript: 'I am not telling you what you will see. I am showing you. Watch the outputs. Then we will talk about what made them different.',
      },
      {
        time: '0:10', duration: 20, type: 'workshop',
        title: 'CREATE Framework Practice',
        description: 'Pairs build a CREATE prompt for a shared task: getting feedback on a PEEL paragraph. Six elements, written explicitly.',
        steps: [
          'C — Character: "You are an academic writing coach who specialises in PEEL paragraph structure."',
          'R — Request: "Review this paragraph and evaluate each of the four PEEL elements."',
          'E — Examples: include the model PEEL paragraph from Unit 12 as a reference',
          'A — Adjustments: "Focus on the Explanation element. Do not give general praise."',
          'T — Type: "Give feedback as four bullet points, one per PEEL element."',
          'X — Extras: "Be direct. State clearly which element is strongest and which needs most work."',
        ],
        facilitatorScript: 'Write all six elements on paper first. Then combine them into the prompt. Do not skip the Examples element — it is the one that most improves output quality.',
      },
      {
        time: '0:30', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Personal Prompt Design + Testing',
        description: 'Students design a CREATE prompt for their own real academic task, test it, and compare to a vague prompt for the same task.',
        steps: [
          'Identify your real academic task (PEEL feedback / concept explanation / source analysis)',
          'Write the vague version first: what would you have typed before this session?',
          'Build the CREATE prompt: all six elements, written explicitly',
          'Test both prompts (facilitator provides AI access if needed)',
          'Document: what was different about the outputs? What did the CREATE prompt produce that the vague one did not?',
          'Note: what would you still need to verify or check in either output?',
        ],
        materials: ['Access to AI tool (Claude, ChatGPT, or similar)', 'CREATE framework reference card'],
      },
      {
        time: '1:00', duration: 15, type: 'think-pair',
        title: 'Hallucination Check Protocol',
        description: 'Pairs receive an AI-generated response containing one hallucinated citation. Task: identify and verify.',
        steps: [
          'Read the AI response — does everything look plausible?',
          'Take every citation: search for it in Scopus or Google Scholar',
          'Which citation does not exist? How did you discover it?',
          'What would have happened if you had submitted this without checking?',
        ],
        facilitatorScript: 'The hallucination looked completely real. Perfect APA format. Real-sounding journal. Author name that could exist. This is why we check every citation.',
      },
      {
        time: '1:15', duration: 15, type: 'process-write',
        title: 'AI Use Protocol — Personal Policy Draft',
        description: 'Students draft their personal AI use policy for academic work (preparation for Unit 18).',
        prompts: ['I will use AI for…', 'I will not use AI for… because…', 'Every time I use AI, I will check…'],
      },
    ],

    processWritingStages: [
      { icon: '🎯', title: 'Task Specification', description: 'Be clear about what you actually need before designing the prompt.', time: '5 min', prompts: ['What specifically do I need from this AI interaction?', 'What output format will be most useful?', 'What does a good output look like?'] },
      { icon: '🔧', title: 'CREATE Build', description: 'All six elements, written explicitly.', time: '10 min', prompts: ['Who is the AI playing? (Character)', 'What exactly am I asking? (Request)', 'What does a good version look like? (Examples)', 'What constraints apply? (Adjustments)', 'What format do I want? (Type)', 'What else matters? (Extras)'] },
      { icon: '🔍', title: 'Output Verification', description: 'Check every factual claim. Check every citation.', time: '10 min', prompts: ['Is every citation verified in a real database?', 'Does every fact check against a real source?', 'What has the AI added that I did not ask for — is it accurate?'], aiPrompt: 'A student has designed a CREATE-framework prompt for an academic task. Evaluate: Does the Character role match the task? Is the Request specific enough to avoid a generic response? Is there an Example that shows what good output looks like? Are the Adjustments (constraints) clear? Is the output Type specified? Are there any Extras that would help? What single change would most improve this prompt?' },
    ],

    resources: [
      { icon: '📋', name: 'CREATE framework reference card', note: '' },
      { icon: '🖥️', name: 'AI tool access for testing', note: 'Facilitator to arrange' },
      { icon: '📋', name: 'Sample AI response with planted hallucination', note: '' },
    ],

    exitTicket: {
      prompt: 'What did your CREATE prompt produce that your vague prompt did not? And what did you still have to verify?',
      stems: ['The CREATE prompt produced…', 'The vague prompt produced…', 'I still had to verify…'],
      time: '3 minutes',
      collect: 'Watch for students who think the CREATE output requires no verification.',
    },
  },

  c17: {
    id: 'c17', type: 'contact', unit: 'u17',
    phase: 'Phase 4 — Unit 17',
    title: 'Literature Mapping Workshop',
    subtitle: 'Citation networks, synthesis matrices, and the move to thematic paragraphs',
    tags: ['Citation Networks', 'Synthesis Matrix', 'Thematic Synthesis', 'Literature Review'],
    goal: 'Every student maps a small citation network around one landmark paper, builds a synthesis matrix for three sources, and drafts one sentence of integrated thematic synthesis.',

    preWork: [
      { item: 'Unit 17 Module', detail: 'Literature review video + mapping reading + synthesis matrix introduction' },
      { item: 'One landmark paper on your essay topic', detail: 'Found via Scopus or ResearchRabbit — the most-cited paper in your area' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'live-demo',
        title: 'Citation Network Live Mapping',
        description: 'Facilitator demonstrates ResearchRabbit or Connected Papers on the projector, using a shared starting paper.',
        steps: [
          'Enter landmark paper into ResearchRabbit',
          'Identify the 3 most-cited papers in the network (largest nodes)',
          'Identify which papers connect multiple clusters',
          'Note publication years — which papers are foundational? Which are recent?',
          'Decision: which of these 5–6 papers are mandatory reading for this topic?',
        ],
        facilitatorScript: 'I am not reading all of these. I am finding the shape of the conversation — who are the key voices, and how do they relate to each other.',
      },
      {
        time: '0:10', duration: 25, type: 'workshop',
        title: 'Personal Citation Map',
        description: 'Students use ResearchRabbit or Scopus citation tools to map 5–6 papers around their own landmark paper.',
        steps: [
          'Enter your landmark paper into ResearchRabbit or Scopus "cited by" function',
          'Find the 5 most-cited papers in the network',
          'For each: read the abstract only (Pass One)',
          'Create a quick map: which papers cite each other? Who is central?',
          'Identify your 3 highest-priority papers to read in depth',
        ],
        materials: ['Laptop with Scopus or ResearchRabbit access'],
      },
      {
        time: '0:35', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Synthesis Matrix Construction',
        description: 'Students build a synthesis matrix for their 3 priority papers.',
        steps: [
          'Create a table: rows = sources (3 papers), columns = key aspects',
          'Columns: Author/Year | Main argument | Evidence type | SA context? | Key finding | Limitation | Relevant to my argument?',
          'Fill in as much as you can from abstracts + Pass Two reading',
          'After filling: look across the columns. What patterns do you see?',
          'Write 2 sentences: what do these 3 papers collectively show? Where do they differ?',
        ],
        facilitatorScript: 'This is the table you should fill in for every literature review, for every assignment, for the rest of your academic career. It transforms a pile of papers into an argument waiting to be written.',
      },
      {
        time: '1:05', duration: 15, type: 'think-pair',
        title: 'Synthesis Sentence Workshop',
        description: 'Pairs transform their two-sentence pattern observations into one integrated synthesis sentence.',
        steps: [
          'Share your matrix pattern observations with your partner',
          'Together, draft one sentence that integrates all 3 sources: "[Pattern] (Author1, Year; Author2, Year; Author3, Year), though [point of divergence]."',
          'Check: does this sentence cite all sources? Does it name both agreement AND difference?',
          'Share: who found the most substantive point of divergence?',
        ],
      },
      {
        time: '1:20', duration: 10, type: 'workshop',
        title: 'Gap Statement Draft',
        description: 'Students draft one gap statement connecting their mapped literature to their essay question.',
        facilitatorScript: 'The gap is not a criticism of the researchers. It is a description of where the field has not yet gone — and that gap is where your argument lives.',
      },
    ],

    processWritingStages: [
      { icon: '🗺️', title: 'Network Mapping', description: 'Find the landmark papers. See the shape before reading the content.', time: '10 min', prompts: ['Which papers are most central?', 'Which are the most cited?', 'Which papers bridge clusters?'] },
      { icon: '📊', title: 'Synthesis Matrix', description: 'Fill the table. Let the patterns find you.', time: '20 min', prompts: ['What do they all agree on?', 'Where do they diverge?', 'Which limitation keeps appearing?'] },
      { icon: '🔗', title: 'Integration', description: 'Write the sentence that weaves them together.', time: '10 min', prompts: ['Can I cite all three in one sentence?', 'Have I named the agreement AND the divergence?', 'Does this sentence advance understanding or just report?'], aiPrompt: 'A student has built a synthesis matrix with three academic sources and written a sentence attempting to integrate them. Evaluate: Does the sentence make a thematic claim about what the sources collectively establish? Does it cite all relevant sources? Does it identify any point of agreement AND disagreement? Or is it still listing what each source says separately? Give one specific suggestion for making it more genuinely synthetic.' },
    ],

    resources: [
      { icon: '🔗', name: 'ResearchRabbit (researchrabbit.ai)', note: 'Free, no sign-in required for basic use' },
      { icon: '📊', name: 'Synthesis matrix template', note: 'Printed or digital' },
    ],

    exitTicket: {
      prompt: 'Write your integrated synthesis sentence (citing 3 sources) and your gap statement.',
      stems: ['Synthesis: …(AuthorA, Year; AuthorB, Year; AuthorC, Year)… though…', 'Gap: Despite research on [topic], few studies examine…'],
      time: '3 minutes',
      collect: 'Check: synthesis sentences should have all 3 citations in one sentence, not three separate sentences.',
    },
  },

  c18: {
    id: 'c18', type: 'contact', unit: 'u18',
    phase: 'Phase 4 — Unit 18',
    title: 'AI Ethics Tribunal — Assessment 6 Launch',
    subtitle: 'Debate AI use cases, write your personal policy, launch the capstone assessment',
    tags: ['Academic Integrity', 'AI Ethics', 'Personal Policy', 'Assessment 6 Launch'],
    goal: 'Every student leaves with a clear, principled understanding of where the line is between permitted and prohibited AI use in their context, and a first draft of their Personal AI Ethics Policy.',

    preWork: [
      { item: 'Unit 18 Module', detail: 'Academic integrity reading + policy scenarios + personal reflection prompt' },
      { item: 'Your institution\'s AI use policy', detail: 'Find it before you arrive. If it does not exist, note that — it is itself a data point.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 15, type: 'think-pair',
        title: 'AI Use Case Tribunal',
        description: 'Groups of 3 receive one AI use scenario each. They have 8 minutes to argue whether it is: A) Clearly acceptable B) Requires disclosure C) Academic misconduct.',
        steps: [
          'Scenario examples: AI generates essay plan. AI explains concept. AI writes paragraph. AI checks grammar. AI generates references. AI gives feedback on draft.',
          'Groups argue their verdict with reasons',
          'Class votes on each scenario after the argument',
          'Facilitator reveals the consensus position — and names where policies differ',
        ],
        facilitatorScript: 'There is not always a clear answer. That is the point. You need a principle that guides decisions in ambiguous cases — not a list of "allowed" and "not allowed" that breaks down the moment you encounter a new scenario.',
      },
      {
        time: '0:15', duration: 20, type: 'workshop',
        title: 'Policy Analysis — What Does Your Institution Actually Say?',
        description: 'Students share and compare what they found in their institution\'s AI policy. What is clear? What is ambiguous? What is missing?',
        steps: [
          'Share: what does your policy say about AI-generated content?',
          'Share: what does it say about disclosure requirements?',
          'Identify the three most ambiguous areas — where is the policy unclear?',
          'What would a student need to do to be absolutely safe under this policy?',
          'What question would you ask your lecturer before submitting any AI-assisted work?',
        ],
        facilitatorScript: 'Not knowing the policy is your risk, not your defence. The question is not "did I know?" — it is "should I have known?"',
      },
      {
        time: '0:35', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Personal AI Ethics Policy — First Draft',
        description: 'Students write their Personal AI Ethics Policy: what they will use AI for, what they will not, and the principle that guides their line.',
        steps: [
          'Section 1: What I will use AI for — with specific reasons why this supports my learning',
          'Section 2: What I will not use AI for — with specific reasons why this would undermine my learning',
          'Section 3: My governing principle — a test I can apply to any new AI situation',
          'Section 4: Transparency — how and when I will disclose AI use',
          'This should be honest, not what you think you should write',
        ],
        facilitatorScript: 'I will not be reading this to check whether you agree with me. I am reading it to see whether you have genuinely thought about it. "I will not use AI for anything" is not a policy — it is avoidance. "I will use AI for everything" is not a policy — it is abdication.',
      },
      {
        time: '1:05', duration: 15, type: 'workshop',
        title: 'Assessment 6 Launch — AI Ethics Tribunal',
        description: 'Facilitator introduces Assessment 6: students will argue a position in a structured AI ethics tribunal. Roles, criteria, timeline.',
        steps: [
          'Read Assessment 6 brief together',
          'Each student draws their tribunal position: Pro-AI, Measured-AI, Anti-AI, Evidence-Assessor, Policy-Drafter',
          'Review the evidence package (provided with the assessment)',
          'Timeline: when is the tribunal? What needs to be prepared?',
        ],
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Tribunal Position Preparation',
        description: 'Students begin preparing their tribunal position argument based on their assigned role.',
      },
    ],

    processWritingStages: [
      { icon: '⚖️', title: 'Scenario Analysis', description: 'Apply the principle, not the rule. What does this use do to your learning?', time: '5 min', prompts: ['Does this represent my thinking or someone else\'s?', 'Could I do this without AI — and if so, why am I not?', 'Would I be comfortable if my lecturer saw this interaction?'] },
      { icon: '📝', title: 'Policy Drafting', description: 'Your policy, in your words. Principled, honest, specific.', time: '15 min', prompts: ['What is the principle behind where I draw the line?', 'Is this about rules or about learning?', 'What will I do when I encounter a case my policy does not cover?'] },
      { icon: '🎤', title: 'Tribunal Preparation', description: 'Prepare your position argument with evidence.', time: '10 min', prompts: ['What is my strongest argument?', 'What is the strongest objection to my position?', 'What evidence supports my case?'], aiPrompt: 'A student has written a Personal AI Ethics Policy for academic work. Evaluate: Does it distinguish between permitted use (AI as a learning tool) and prohibited use (AI as a replacement for their own thinking)? Is there a clear governing principle — a test they can apply to new situations? Does it address disclosure? Is it honest, or does it read like what they think they should write? Give one specific challenge to their principle — a scenario where it might be hard to apply.' },
    ],

    resources: [
      { icon: '📋', name: 'AI use case scenarios (6 cards)', note: 'One per group for tribunal opening' },
      { icon: '📋', name: 'Assessment 6 brief', note: 'One per student' },
      { icon: '📋', name: 'Assessment 6 evidence package', note: 'Distributed with brief' },
    ],

    exitTicket: {
      prompt: 'State your governing principle in one sentence: the test you will apply to any new AI use situation.',
      stems: ['My governing principle is: I will use AI when…', 'I will not use AI when…'],
      time: '2 minutes',
      collect: 'Principles that reference learning and thinking are stronger than principles that reference detection or rules.',
    },
  },

  c19: {
    id: 'c19', type: 'contact', unit: 'u19',
    phase: 'Phase 5 — Unit 19',
    title: 'Literature Review Construction Workshop',
    subtitle: 'From synthesis matrix to integrated, scholarly-positioned paragraphs',
    tags: ['Literature Review', 'Thematic Integration', 'Scholarly Positioning', 'Gap Statements'],
    goal: 'Every student writes one complete, integrated literature review paragraph — thematic topic sentence, woven sources, named divergence, gap statement — ready for Assessment 5 or final submission.',

    preWork: [
      { item: 'Unit 19 Module', detail: 'Literature review video + synthesis-in-practice reading + matrix built in Unit 17 session' },
      { item: 'Synthesis matrix from c17', detail: 'Three sources, themes mapped — this is your writing input today' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Source-by-Source vs Thematic — Blind Sort',
        description: 'Facilitator distributes two literature review excerpts on the same topic — one source-by-source, one thematic. Students identify which is which and explain.',
        facilitatorScript: 'One of these tells me the writer has read three papers. The other tells me the writer has thought about them. I want you to see the difference immediately.',
      },
      {
        time: '0:10', duration: 20, type: 'workshop',
        title: 'Thematic Topic Sentence Workshop',
        description: 'Students draft and improve topic sentences that make thematic claims rather than announcing topics.',
        steps: [
          'Bad: "Researchers have studied play-based learning in South Africa."',
          'Better: "Several studies have found positive effects of play-based learning."',
          'Best: "Evidence consistently links play-based approaches to improved numeracy outcomes in Foundation Phase contexts (Smith, 2020; Jones, 2021; Patel, 2022), though studies diverge in their theoretical accounts of why."',
          'Key: your topic sentence should tell the reader what pattern the paragraph will establish AND where the debate lies',
          'Draft your own topic sentence for your three sources. Compare with a partner.',
        ],
        facilitatorScript: 'Your topic sentence is a promise to the reader: this is what I will prove. Make the promise specific, make it arguable, and keep it.',
      },
      {
        time: '0:30', duration: 35, type: 'pomodoro',
        pomMinutes: 30,
        title: 'Full Literature Review Paragraph',
        description: 'Students write one complete integrated literature review paragraph (280–320 words) using their synthesis matrix.',
        steps: [
          'Topic sentence: thematic claim citing all 3 sources in one sentence',
          'Body: weave sources together — show agreement AND divergence',
          'Name a theoretical difference if you found one in your matrix',
          'Penultimate sentence: what do these sources collectively NOT address?',
          'Gap statement: "Despite [pattern], few studies examine [specific gap]."',
          'Check: does this paragraph read as synthesis or as three separate summaries?',
        ],
        materials: ['Synthesis matrix from c17', 'APA 7th reference for all three sources'],
        facilitatorScript: 'If you find yourself writing "Smith (2020) says… Jones (2021) says… Patel (2022) says…" — stop. That is not synthesis. Weave them together: "(Smith, 2020; Jones, 2021; Patel, 2022) collectively argue that…"',
      },
      {
        time: '1:05', duration: 20, type: 'peer-feedback',
        title: 'Synthesis Quality Review',
        description: 'Pairs review each other\'s paragraphs for integration quality.',
        steps: [
          'Check: Is the topic sentence a thematic CLAIM (not a topic)?',
          'Check: Are all three sources cited — are any isolated to one sentence?',
          'Check: Is there both agreement AND divergence identified?',
          'Check: Is there a gap statement at the end?',
          'Most important: circle any sentence that reads as summary rather than synthesis. Write: "What is the pattern across sources here?"',
        ],
      },
      {
        time: '1:25', duration: 5, type: 'process-write',
        title: 'Revision Note',
        description: 'Students write one sentence: the revision they will make before submitting this paragraph.',
      },
    ],

    processWritingStages: [
      { icon: '🎯', title: 'Thematic Claim', description: 'What does the literature collectively establish? Say it in one sentence.', time: '5 min', prompts: ['What is the pattern across my sources?', 'Where do they agree?', 'What is the most important point of divergence?'] },
      { icon: '🔗', title: 'Integration', description: 'Weave sources together. Avoid "Smith says… Jones says…"', time: '20 min', prompts: ['Can I cite 2–3 sources in one sentence?', 'Have I woven the agreement before naming the divergence?', 'Does each sentence advance the argument or just report?'] },
      { icon: '🚪', title: 'Gap Statement', description: 'Where has the field not yet gone? That is where your argument lives.', time: '5 min', prompts: ['What does this body of research leave unanswered?', 'What context is missing from the existing studies?', 'How does this gap connect to my essay question?'], aiPrompt: 'A student has written a literature review paragraph attempting to synthesise three sources. Evaluate: (1) Does the topic sentence make a thematic claim or just announce a topic? (2) Are sources woven together (integrated citation) or described separately? (3) Is there both agreement AND divergence identified? (4) Is there a gap statement? (5) What is the single most important revision this paragraph needs to become genuine synthesis rather than summary?' },
    ],

    resources: [
      { icon: '📊', name: 'Synthesis matrix (from Unit 17 session)', note: '' },
      { icon: '📄', name: 'Source-by-source vs thematic excerpt pair', note: '' },
    ],

    exitTicket: {
      prompt: 'Read your topic sentence aloud to yourself. Does it make a claim about what the literature shows — or does it describe what the paragraph will be about?',
      stems: ['My topic sentence claims…', 'I know it is a thematic claim because…', 'If it is not yet a claim, I will change it to…'],
      time: '2 minutes',
      collect: 'Students who are still writing topic sentences that describe topics (not make claims) need one-on-one support.',
    },
  },

  c20: {
    id: 'c20', type: 'contact', unit: 'u20',
    phase: 'Phase 5 — Unit 20',
    title: 'Scholar\'s Showcase + Module Reflection',
    subtitle: 'Present your best work, write your Academic Mission Statement, close the module',
    tags: ['Reflective Practice', 'Academic Identity', 'Portfolio Review', 'Academic Mission Statement'],
    goal: 'Every student shares one piece of work they are proud of, completes a structured reflection on their development as a reader and writer, and writes a final Academic Mission Statement.',

    preWork: [
      { item: 'Unit 20 Module', detail: 'Briceño TED talk + reflective practice reading + pre-session reflection writing' },
      { item: 'One piece of work you are proud of', detail: 'From any point in the module — a paragraph, a peer review, a reading response, an annotation' },
    ],

    blocks: [
      {
        time: '0:00', duration: 15, type: 'gallery-walk',
        title: 'Scholar\'s Showcase',
        description: 'Students display or share their chosen piece of work. Brief gallery walk — each student explains in 60 seconds why they chose this piece.',
        facilitatorScript: 'I am not asking for your best grade. I am asking for the piece that most represents who you have become as a thinker. Those are not the same thing.',
      },
      {
        time: '0:15', duration: 20, type: 'think-pair',
        title: 'Before and After — Development Mapping',
        description: 'Pairs interview each other: what was your reading/writing practice before this module? What is it now? What is the single most significant change?',
        steps: [
          'Partner A answers: "Before this module, when I read an academic article, I would…"',
          'Partner A answers: "Now, I…"',
          'Partner B: "What is the most significant change in how you think, not just what you do?"',
          'Switch roles',
          'Together: what is the one skill you both found hardest — and did you both get there?',
        ],
      },
      {
        time: '0:35', duration: 30, type: 'pomodoro',
        pomMinutes: 25,
        title: 'Academic Mission Statement — Final Draft',
        description: 'Students write their Academic Mission Statement: growth, identity, commitments.',
        steps: [
          'Section 1 — GROWTH: What is the single most significant change? Be specific.',
          'Section 2 — IDENTITY: How do you see yourself as a scholar now? What still feels foreign?',
          'Section 3 — COMMITMENTS: Three specific intellectual habits for your next year',
          'Habits must be concrete: not "read more" but "apply the three-pass method to every required reading before tutorials"',
          'This is for you. Be honest rather than impressive.',
        ],
        facilitatorScript: 'A mission statement you actually believe will serve you differently from one you wrote to please a marker. Write for yourself.',
      },
      {
        time: '1:05', duration: 15, type: 'peer-feedback',
        title: 'Mission Statement Exchange',
        description: 'Pairs share mission statements. Reader\'s task: identify the most honest sentence and the most ambitious commitment.',
        steps: [
          'Read partner\'s statement silently',
          'Underline the most honest sentence — the one that sounds most like them',
          'Circle the commitment that will be hardest to keep — but most valuable if kept',
          'Return with one question: "What will you do when [most ambitious commitment] gets hard?"',
        ],
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Closing Letter',
        description: 'Students write a 100-word letter to next year\'s first-year students. What do you wish you had known before starting this module?',
        facilitatorScript: 'This is the last thing you write in this module. Make it true.',
      },
    ],

    processWritingStages: [
      { icon: '🪞', title: 'Honest Reflection', description: 'What actually changed? Be specific about before and after.', time: '10 min', prompts: ['What did I do before that I no longer do?', 'What can I do now that I could not do before?', 'What was the hardest moment — and what did it produce?'] },
      { icon: '🌱', title: 'Identity', description: 'Who are you becoming as a scholar? What feels like yours now?', time: '10 min', prompts: ['What does "being academic" mean to me now compared to before?', 'What scholarly habits feel natural — not forced?', 'What still feels foreign or uncomfortable?'] },
      { icon: '🚀', title: 'Commitments', description: 'Three specific, concrete intellectual habits. Write them like promises.', time: '10 min', prompts: ['Are these habits or aspirations?', 'Are they specific enough that I will know if I am keeping them?', 'When will I first apply each one?'], aiPrompt: 'A student has written an Academic Mission Statement covering growth, identity, and three intellectual commitments. Evaluate: Are the growth observations specific (naming a skill and how it changed) or vague ("I learned a lot")? Are the commitments concrete habits (specifying when, how, and what) or general intentions? Is the identity section honest about both progress and remaining challenges? What one question would you ask this student to push them toward deeper self-knowledge?' },
    ],

    resources: [
      { icon: '📋', name: 'Academic Mission Statement template', note: '' },
      { icon: '📝', name: 'Module reflection prompts (full set)', note: '' },
    ],

    exitTicket: {
      prompt: 'Your first commitment — in one sentence: what will you do differently next week because of this module?',
      stems: ['Next week, I will…', 'I know I am keeping this commitment because I will be able to…'],
      time: '2 minutes',
      collect: 'Keep these. Read them to the class at the start of semester 2.',
    },
  },

});

// ── Phase 3–5 Tutorial Sessions ─────────────────────────────────────────────
Object.assign(SESSIONS, {

  t10: {
    id: 't10', type: 'tutorial', unit: 'u10',
    phase: 'Phase 3 — Unit 10 Tutorial',
    title: 'Three-Pass Reading in Practice',
    subtitle: 'Apply the method to your own sources — diagnostic and guided practice',
    tags: ['Three-Pass Method', 'Analytical Reading', 'Pass Three Questions', 'Article Evaluation'],
    goal: 'Every student applies all three passes to a real article from their topic area and produces a written analytical position — not a summary.',

    preWork: [
      { item: 'Unit 10 Module', detail: 'All reading and video complete before tutorial' },
      { item: 'One journal article on your teaching subject topic', detail: 'Found in Scopus — bring the full article' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Reading Method Check',
        description: 'Tutor asks: which pass did you find hardest in the unit? Hands up: Pass One (staying strategic), Pass Two (not getting lost), Pass Three (actually critiquing). Calibrates session focus.',
      },
      {
        time: '0:05', duration: 15, type: 'workshop',
        title: 'Pass One Speed Round',
        description: 'Students apply Pass One to their own article in 8 minutes. Tutor times and calls out the transition.',
        steps: [
          'Read title only (30 seconds): what does this claim to be about?',
          'Read abstract (2 minutes): research question + main finding',
          'Scan headings (1 minute): what is the shape of this argument?',
          'Read conclusion (2 minutes): what do they claim to have shown?',
          'DECISION (30 seconds): worth reading in full for what purpose?',
        ],
        facilitatorScript: 'Eight minutes. You are not reading — you are mapping.',
      },
      {
        time: '0:20', duration: 15, type: 'pomodoro',
        pomMinutes: 12,
        title: 'Pass Three Questions — Written',
        description: 'Students write Pass Three responses to four critical questions.',
        steps: [
          'Q1: What assumption does the author make that is not stated? (One specific example)',
          'Q2: Does the conclusion go beyond what the evidence supports? Where?',
          'Q3: What can\'t this methodology tell us?',
          'Q4: How does this connect to or contradict one other reading you have done?',
        ],
        facilitatorScript: 'Four questions. One specific answer each. Not "the author assumes things" — which assumption, specifically.',
      },
      {
        time: '0:35', duration: 10, type: 'think-pair',
        title: 'Analytical Position Exchange',
        description: 'Pairs share their Pass Three positions in 2 sentences. No summary allowed. Challenge each other.',
      },
    ],

    exitTicket: {
      prompt: 'What is your analytical POSITION on this article — not what it says, but what you think about it?',
      stems: ['This article establishes…', 'However, I am not convinced that… because…'],
      time: '2 minutes',
      collect: 'Distinguish positions from summaries.',
    },
  },

  t11: {
    id: 't11', type: 'tutorial', unit: 'u11',
    phase: 'Phase 3 — Unit 11 Tutorial',
    title: 'Notes Transformation Workshop',
    subtitle: 'Rewrite your existing notes into Cornell format and find one connection',
    tags: ['Cornell Notes', 'Atomic Notes', 'Connection-Finding', 'Synthesis Preparation'],
    goal: 'Every student leaves with a set of Cornell notes from a real lecture or reading AND one explicitly written connection between two different source ideas.',

    preWork: [
      { item: 'Unit 11 Module', detail: 'Cornell video + notes-that-think reading complete' },
      { item: 'Existing lecture or reading notes', detail: 'Any subject — the worse they currently are, the better for this session' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Notes Audit — Traffic Light',
        description: 'Students rate their current notes Green (organised, paraphrased, useful), Amber (transcription, some own words), Red (chaos or nothing). Tutor notes the room — calibrates support.',
      },
      {
        time: '0:05', duration: 15, type: 'workshop',
        title: 'Cornell Rewrite',
        description: 'Students rewrite 15 minutes of their own notes into Cornell format.',
        steps: [
          'Setup: draw Cornell layout on a fresh page',
          'Move key ideas to the right column — paraphrase, do not copy',
          'After completing a section, fill the left cue column with one-word prompts and questions',
          'Write a 2-sentence summary at the bottom',
          'Test: cover the right column and reconstruct from cues only',
        ],
        facilitatorScript: 'If you cannot reconstruct the idea from the cue, the cue is too weak. Try again.',
      },
      {
        time: '0:20', duration: 15, type: 'pomodoro',
        pomMinutes: 10,
        title: 'Atomic Note + Connection',
        description: 'Write one atomic note from today\'s material. Then write one explicit connection to a Unit 10 idea.',
        steps: [
          'Atomic note: one idea, your words, complete sentence, can stand alone',
          'Connection note: "[Atomic note] connects to [Unit 10 idea about analytical reading] because…" OR "This contradicts [Unit 10 idea] because…"',
          'The connection does not have to be obvious — exploratory connections are valid',
        ],
      },
      {
        time: '0:35', duration: 10, type: 'think-pair',
        title: 'Connection Sharing',
        description: 'Pairs share their connections. Which is most interesting? Most surprising? Most useful for an essay?',
      },
    ],

    exitTicket: {
      prompt: 'Write your connection note here. In one sentence: what does today\'s idea connect to — and why does that connection matter?',
      stems: ['This connects to…', 'The connection matters because…'],
      time: '2 minutes',
      collect: '',
    },
  },

  t12: {
    id: 't12', type: 'tutorial', unit: 'u12',
    phase: 'Phase 3 — Unit 12 Tutorial',
    title: 'PEEL Revision Clinic',
    subtitle: 'One paragraph, two revisions — targeted support for the hardest element',
    tags: ['PEEL Revision', 'Explanation Writing', 'Peer Feedback', 'Assessment 4 Preparation'],
    goal: 'Every student revises their PEEL paragraph twice — once targeting the Explanation, once targeting the Link — and receives tutor feedback on the most common failure point.',

    preWork: [
      { item: 'Unit 12 Module + c12 session work', detail: 'Bring your PEEL paragraph from the contact session' },
      { item: 'Feedback received from peer review (c12)', detail: 'Know your highest-priority revision' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'PEEL Element Vote',
        description: 'Which element do you find hardest? Hands up for P / E / E / L. Tutor notes dominant — this runs the session.',
      },
      {
        time: '0:05', duration: 15, type: 'mini-lesson',
        title: 'Explanation Deep Dive',
        description: 'Tutor models three versions of the same Explanation sentence — weak, adequate, strong — and asks students to identify what makes the difference.',
        steps: [
          'Version 1: "This shows that learning is important." (placeholder)',
          'Version 2: "This suggests that social learning improves outcomes." (vague but hedged)',
          'Version 3: "Vygotsky\'s evidence suggests that peer interaction does not merely support learning but constitutes its mechanism — which has direct implications for how inclusive classrooms should be designed, not just staffed." (analytical)',
          'What is the difference? Name the move.',
        ],
        facilitatorScript: 'The strong Explanation does three things: states what the evidence means, names the implication for the argument, and extends rather than repeats. Can you do all three?',
      },
      {
        time: '0:20', duration: 20, type: 'revision',
        title: 'Two-Pass Revision Sprint',
        description: 'Students revise their paragraph twice: first targeting Explanation, then targeting Link.',
        steps: [
          'Revision 1 — Explanation only: circle your Explanation sentence. Does it say what the evidence means for YOUR argument? Rewrite it.',
          'Revision 2 — Link only: read your Link sentence. Does it name the essay\'s larger argument? Does it make explicit what this paragraph has proven? Rewrite it.',
          'Compare original and two revisions: which is strongest?',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'think-pair',
        title: 'Best Version Share',
        description: 'Pairs share their best Explanation sentence. Class votes on the most analytical one.',
      },
    ],

    exitTicket: {
      prompt: 'Write your revised Explanation sentence here.',
      stems: ['Revised Explanation: …', 'What I changed was…', 'What makes this more analytical than the original is…'],
      time: '2 minutes',
      collect: 'Tutor reads all Explanation sentences — these are the data for next session.',
    },
  },

  t13: {
    id: 't13', type: 'tutorial', unit: 'u13',
    phase: 'Phase 3 — Unit 13 Tutorial',
    title: 'Register Transformation Clinic',
    subtitle: 'Diagnose your register habits and revise systematically',
    tags: ['Academic Register', 'Hedging Practice', 'Revision', 'Voice Workshop'],
    goal: 'Every student applies a systematic register audit to their own writing, identifies their two most common register errors, and revises a paragraph to meet academic voice standards.',

    preWork: [
      { item: 'Unit 13 Module', detail: 'Register video + hedging reading complete' },
      { item: 'A paragraph you have written recently', detail: 'Any subject — your own informal draft or a writing task' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Register Error Frequency Count',
        description: 'Students scan their paragraph and count: contractions (circle), informal intensifiers (underline), overclaims with no hedge (box). Three tallies written on a Post-it.',
      },
      {
        time: '0:05', duration: 15, type: 'mini-lesson',
        title: 'Hedging Language Menu',
        description: 'Tutor presents a hedging language menu — modal verbs, adverbs of frequency, attribution phrases — and students practise applying each type.',
        steps: [
          'Modal verbs: may, might, could, should — replace "is" and "will"',
          'Epistemic adverbs: generally, typically, often, tends to — replace "always" and "never"',
          'Attribution: "Research suggests that…" / "Evidence indicates that…" — replace "It is clear that…"',
          'Limitation: "though this may not apply to…" / "in contexts where…" — add the boundary',
          'Practice: rewrite three overclaimed sentences using different hedging types',
        ],
      },
      {
        time: '0:20', duration: 20, type: 'revision',
        title: 'Systematic Register Revision',
        description: 'Students revise their paragraph using the register audit checklist.',
        steps: [
          'Fix all contractions (do not → do not, it\'s → it is)',
          'Replace informal intensifiers (very → significantly, really → substantially, or delete)',
          'Hedge every universal claim (always → typically, never → rarely)',
          'Add evidence reference to at least one claim per paragraph',
          'Remove "obviously," "clearly," "everyone knows"',
          'Count again: is the tally lower?',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'think-pair',
        title: 'Most Improved Sentence',
        description: 'Pairs share their most dramatically improved sentence — before and after. Class votes.',
      },
    ],

    exitTicket: {
      prompt: 'Write your most common register error and one sentence demonstrating you have fixed it.',
      stems: ['My most common error is…', 'Before: …', 'After: …'],
      time: '2 minutes',
      collect: '',
    },
  },

  t14: {
    id: 't14', type: 'tutorial', unit: 'u14',
    phase: 'Phase 3 — Unit 14 Tutorial',
    title: 'Data Visualisation Deconstruction',
    subtitle: 'Apply the four-question framework to SA education data',
    tags: ['Visual Literacy', 'Four-Question Framework', 'SA Data', 'Academic Description'],
    goal: 'Every student writes a full academic description of a real South African education data visualisation — applying all four analytical questions and producing a one-sentence verdict.',

    preWork: [
      { item: 'Unit 14 Module', detail: 'McCandless talk + visual argument reading + four-question framework complete' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'What Question Do You Always Forget?',
        description: 'Tutor asks: of the four analytical questions, which do you most often skip? Hands up for Q1/Q2/Q3/Q4. Tutor calibrates — spends extra time on dominant answer.',
      },
      {
        time: '0:05', duration: 10, type: 'mini-lesson',
        title: 'Q4 — Outside the Frame (Most Missed)',
        description: 'Tutor models the "what is outside the frame?" question with two examples: what context would change the interpretation?',
        facilitatorScript: 'Q4 is not about finding something wrong with the visual. It is about recognising that every visual is a selection — and the selection is a choice with implications.',
      },
      {
        time: '0:15', duration: 25, type: 'pomodoro',
        pomMinutes: 20,
        title: 'SA Education Data Analysis',
        description: 'Students apply all four questions to a provided South African education data visualisation and write a 150-word analytical description.',
        steps: [
          'Q1: What exactly is being measured? Define the variable precisely.',
          'Q2: Check the baseline. Does the scale distort magnitude?',
          'Q3: Source — who collected this, when, for what purpose?',
          'Q4: What is the most important missing context?',
          'Write: 150-word academic description — what this visual shows AND argues',
          'Final sentence: Is this visualisation honest and well-designed? Why or why not? Hedge appropriately.',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'think-pair',
        title: 'Verdict Comparison',
        description: 'Pairs compare verdicts — do you agree? What made you disagree if you did?',
      },
    ],

    exitTicket: {
      prompt: 'Write your one-sentence academic verdict on the visualisation, using appropriate hedging language.',
      stems: ['This visualisation suggests that… though…', 'The most significant analytical concern is…'],
      time: '2 minutes',
      collect: '',
    },
  },

  t15: {
    id: 't15', type: 'tutorial', unit: 'u15',
    phase: 'Phase 3 — Unit 15 Tutorial',
    title: 'Assessment 4 Peer Review Clinic',
    subtitle: 'Full peer review using assessment criteria — for Assessment 4 submission',
    tags: ['Peer Review', 'Assessment 4', 'Criterion-Referenced Feedback', 'Feedforward'],
    goal: 'Every student both gives and receives one full peer review of an Assessment 4 draft — specific, criterion-referenced, with a feedforward statement — and leaves with a clear revision plan.',

    preWork: [
      { item: 'Unit 15 Module + c15 peer review experience', detail: 'Protocol fresh in mind' },
      { item: 'Assessment 4 draft', detail: 'Full draft for review — the further along the better' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Assessment 4 Status',
        description: 'Traffic light: Green (ready for final polish), Amber (1–2 major revisions needed), Red (significant structural issues). Tutor allocates extra time to Red students during the session.',
      },
      {
        time: '0:05', duration: 5, type: 'mini-lesson',
        title: 'Reviewing Against Criteria — 5 Minutes',
        description: 'Tutor reads the Assessment 4 criteria aloud and asks: which criterion is hardest to evaluate in a peer review? Focus on that one in the session.',
      },
      {
        time: '0:10', duration: 25, type: 'revision',
        title: 'Full Peer Review — Assessment 4',
        description: 'Students write a full 200-word peer review of their partner\'s Assessment 4 draft.',
        steps: [
          'Read the full draft without commenting',
          'Re-read against the criteria: which is met, which is not?',
          'Write: one specific thing that works (name the criterion)',
          'Write: the single most important gap (name the criterion)',
          'Write: what improvement would look like specifically',
          'Write: one feedforward sentence for the revision',
          'Check: can your partner act on every single comment you have written?',
        ],
      },
      {
        time: '0:35', duration: 10, type: 'workshop',
        title: 'Reading Feedback + Revision Planning',
        description: 'Writers read their feedback and write a concrete revision plan. Tutor circulates for Red students.',
        steps: [
          'Read all feedback silently',
          'Identify the single most important comment',
          'Write your revision plan: what exactly will you change, where, and when?',
        ],
      },
    ],

    exitTicket: {
      prompt: 'The ONE revision you will make to Assessment 4 before submitting.',
      stems: ['I will change…', 'In the section that covers…', 'I will submit the revision by…'],
      time: '2 minutes',
      collect: 'Tutor follows up with Red students individually.',
    },
  },

  t16: {
    id: 't16', type: 'tutorial', unit: 'u16',
    phase: 'Phase 4 — Unit 16 Tutorial',
    title: 'Prompt Design Workshop',
    subtitle: 'Build and test CREATE prompts for your own assessment task',
    tags: ['CREATE Framework', 'Prompt Testing', 'AI Output Verification', 'Assessment Support'],
    goal: 'Every student leaves with a tested CREATE prompt for a current assessment task and a verification protocol for any AI output they receive.',

    preWork: [
      { item: 'Unit 16 Module', detail: 'Prompt engineering video + CREATE reading complete' },
      { item: 'A current assessment task', detail: 'Essay question, literature review section, paragraph to review — any real task' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Current AI Use Audit',
        description: 'Tutor asks 4 questions with hands up: How many used AI for their last assignment? How many got a useful output? How many verified citations? How many disclosed AI use to their lecturer? Data guides session.',
      },
      {
        time: '0:05', duration: 15, type: 'workshop',
        title: 'CREATE Prompt Build',
        description: 'Students build their CREATE prompt for their own assessment task. All six elements, written explicitly. Tutor circulates.',
        steps: [
          'C — Character: who should the AI be for this task?',
          'R — Request: exactly what am I asking?',
          'E — Example: what does a good version look like? (Include it in the prompt)',
          'A — Adjustments: what constraints matter?',
          'T — Type: what format do I want?',
          'X — Extras: what else matters?',
        ],
        facilitatorScript: 'If you cannot fill in the Examples element, you do not know what you want. Think harder before testing.',
      },
      {
        time: '0:20', duration: 20, type: 'pomodoro',
        pomMinutes: 15,
        title: 'Test and Verify',
        description: 'Students test their CREATE prompt and verify the output.',
        steps: [
          'Submit the CREATE prompt to an AI tool',
          'Read the output critically: is this specific to your task or generic?',
          'Check every factual claim: is it accurate?',
          'Check every citation (if any): search in Scopus or Google Scholar',
          'Document: what did the CREATE prompt produce that a vague prompt would not have?',
          'Document: what still required verification?',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'think-pair',
        title: 'What Did Verification Find?',
        description: 'Pairs share: did anyone find a hallucination? What did verification reveal?',
      },
    ],

    exitTicket: {
      prompt: 'Write your governing principle for AI use in one sentence. Then write: what you verified in today\'s AI output.',
      stems: ['My AI use principle: …', 'I verified that…', 'I found (correct / error):…'],
      time: '2 minutes',
      collect: '',
    },
  },

  t17: {
    id: 't17', type: 'tutorial', unit: 'u17',
    phase: 'Phase 4 — Unit 17 Tutorial',
    title: 'Synthesis Matrix to Paragraph',
    subtitle: 'Complete your matrix and draft your first integrated literature review sentence',
    tags: ['Synthesis Matrix', 'Thematic Synthesis', 'Literature Review', 'Integration Practice'],
    goal: 'Every student completes their synthesis matrix for their assessment topic and writes one integrated thematic sentence citing at least two sources.',

    preWork: [
      { item: 'Unit 17 Module + c17 work', detail: 'Synthesis matrix started — bring it' },
      { item: 'Three sources identified for your topic', detail: 'Abstracts read at minimum' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Matrix Completion Status',
        description: 'How many rows of your matrix are filled in? 0–1, 2, 3? Tutor allocates targeted support.',
      },
      {
        time: '0:05', duration: 15, type: 'workshop',
        title: 'Matrix Completion Sprint',
        description: 'Students complete or refine their synthesis matrix. Tutor circulates — focus on the "relevant to my argument?" column.',
        steps: [
          'Fill in any empty cells using abstracts',
          'The "key limitation" column is often skipped — fill it in',
          'The "relevant to my argument?" column forces the connection to your essay question',
          'After filling: look across each column. What pattern appears?',
          'Write one sentence below the matrix: what do these sources collectively show?',
        ],
      },
      {
        time: '0:20', duration: 20, type: 'pomodoro',
        pomMinutes: 15,
        title: 'First Integrated Sentence',
        description: 'Students write one integrated synthesis sentence — all three sources, one sentence, thematic claim plus divergence.',
        steps: [
          'Draft: "[Thematic pattern] (Source1, Year; Source2, Year; Source3, Year), though [divergence]."',
          'Check: does this sentence make a claim or just list sources?',
          'Check: is there agreement AND divergence in one sentence?',
          'Revise until both are present',
        ],
        facilitatorScript: 'This one sentence is harder to write than an entire source-by-source paragraph. It is also worth more academically. Take the time.',
      },
      {
        time: '0:40', duration: 5, type: 'think-pair',
        title: 'Sentence Exchange',
        description: 'Pairs read each other\'s synthesis sentences. Does it cite 2–3 sources? Does it name a divergence? Is it a claim or a description?',
      },
    ],

    exitTicket: {
      prompt: 'Your integrated synthesis sentence.',
      stems: ['[Thematic pattern] (Source1; Source2; Source3), though [divergence].'],
      time: '2 minutes',
      collect: 'Check: three citations in one sentence, plus a named point of divergence.',
    },
  },

  t18: {
    id: 't18', type: 'tutorial', unit: 'u18',
    phase: 'Phase 4 — Unit 18 Tutorial',
    title: 'AI Ethics Policy Peer Review + Assessment 6 Preparation',
    subtitle: 'Sharpen your policy, rehearse your tribunal argument',
    tags: ['AI Ethics', 'Personal Policy', 'Assessment 6', 'Tribunal Preparation'],
    goal: 'Every student has a polished Personal AI Ethics Policy and a prepared argument for their Assessment 6 tribunal position.',

    preWork: [
      { item: 'Unit 18 Module + c18 session', detail: 'Personal AI Ethics Policy first draft' },
      { item: 'Assessment 6 brief and evidence package', detail: 'Know your tribunal role' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Policy Confidence Check',
        description: 'Tutor asks: who feels confident they could defend their governing principle under challenge? Who is still unsure where the line is? Calibrates session focus.',
      },
      {
        time: '0:05', duration: 15, type: 'peer-feedback',
        title: 'Policy Peer Challenge',
        description: 'Pairs exchange policies. Reader\'s task: find one scenario that the policy cannot clearly handle and challenge the writer with it.',
        steps: [
          'Read your partner\'s policy',
          'Find ONE edge case: "What if [this scenario]? Does your principle say yes or no?"',
          'Writer must answer using their governing principle — not ad hoc',
          'Did the principle hold? If not, how should it be refined?',
        ],
        facilitatorScript: 'A policy that breaks down on the first edge case is not a policy — it is a list of cases. A governing principle holds across novel situations.',
      },
      {
        time: '0:20', duration: 20, type: 'workshop',
        title: 'Policy Revision + Assessment 6 Position',
        description: 'Students revise their policy based on the peer challenge, then prepare their tribunal argument.',
        steps: [
          'Revise: refine your governing principle to handle the edge case',
          'Tribunal prep: write your 3 strongest arguments for your assigned position',
          'For each argument: what evidence supports it?',
          'Prepare for the strongest counter-argument you will face: how will you respond?',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'think-pair',
        title: 'Rehearsal Round',
        description: 'Partners take opposite positions and exchange one argument each. 2 minutes each.',
      },
    ],

    exitTicket: {
      prompt: 'Your refined governing principle (one sentence) and your strongest tribunal argument (one sentence).',
      stems: ['Governing principle: …', 'Strongest argument: …'],
      time: '2 minutes',
      collect: '',
    },
  },

  t19: {
    id: 't19', type: 'tutorial', unit: 'u19',
    phase: 'Phase 5 — Unit 19 Tutorial',
    title: 'Literature Review Revision Clinic',
    subtitle: 'From source-by-source to integrated — targeted revision with tutor support',
    tags: ['Literature Review', 'Integration Revision', 'Assessment 5', 'Scholarly Positioning'],
    goal: 'Every student identifies the most "source-by-source" passage in their literature review draft and revises it into genuine thematic integration.',

    preWork: [
      { item: 'Unit 19 Module + c19 paragraph draft', detail: 'Bring your literature review paragraph' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Integration Self-Audit',
        description: 'Students count: how many "Smith (Year) says… Jones (Year) says…" sentences are in their draft? Students with 2+ will get targeted support.',
      },
      {
        time: '0:05', duration: 10, type: 'mini-lesson',
        title: 'The Integration Move — Three Examples',
        description: 'Tutor shows three levels of integration for the same three sources: sequential / partial / full. Students identify what makes the difference.',
        facilitatorScript: 'Level 3 integration names the pattern, weaves the sources, names the divergence, and advances understanding — in one to three sentences. That is the target.',
      },
      {
        time: '0:15', duration: 25, type: 'revision',
        title: 'Targeted Integration Revision',
        description: 'Students identify their most source-by-source passage and revise it to Level 3 integration.',
        steps: [
          'Find the most source-by-source passage in your paragraph',
          'Identify the pattern: what do these sources collectively establish?',
          'Write an integrated version: pattern + all sources cited together + divergence named',
          'Check: is the topic sentence still accurate after the revision?',
          'If you have a gap statement — does it connect to your essay question specifically?',
        ],
        facilitatorScript: 'You are not rewriting everything. You are finding the one passage where sources are most isolated and making it integrated. Then work outward.',
      },
      {
        time: '0:40', duration: 5, type: 'think-pair',
        title: 'Before/After Exchange',
        description: 'Pairs share original and revised passage. Reader says: which reads as synthesis vs summary?',
      },
    ],

    exitTicket: {
      prompt: 'Your revised integrated passage — original (1 sentence) and revised (1 sentence).',
      stems: ['Before: …', 'After: …', 'What I changed was…'],
      time: '2 minutes',
      collect: '',
    },
  },

  t20: {
    id: 't20', type: 'tutorial', unit: 'u20',
    phase: 'Phase 5 — Unit 20 Tutorial',
    title: 'Academic Mission Statement + Module Celebration',
    subtitle: 'Final reflection, Mission Statement polish, and module close',
    tags: ['Academic Mission Statement', 'Reflective Practice', 'Module Close', 'Identity'],
    goal: 'Every student leaves with a polished Academic Mission Statement they actually believe, and a named commitment they will take into their second year.',

    preWork: [
      { item: 'Unit 20 Module', detail: 'Briceño talk + reflective practice reading complete' },
      { item: 'Academic Mission Statement first draft', detail: 'From c20 — bring it for revision' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'think-pair',
        title: 'Mission Statement Peer Challenge',
        description: 'Pairs read each other\'s Mission Statements and ask the hardest question: "Which commitment will be hardest to keep — and what will you do when it gets hard?"',
      },
      {
        time: '0:10', duration: 20, type: 'revision',
        title: 'Mission Statement Polish',
        description: 'Students revise their Mission Statement based on the challenge question.',
        steps: [
          'Growth section: is it specific? Name the skill and the before/after.',
          'Identity section: is it honest about both progress AND remaining challenges?',
          'Commitments: are they habits (specific, concrete) or aspirations (vague)?',
          'Revise the hardest commitment — make it harder to wriggle out of',
        ],
      },
      {
        time: '0:30', duration: 10, type: 'workshop',
        title: 'Closing Letter Exchange',
        description: 'Students share their closing letters to next year\'s first-years. Three volunteers read theirs aloud.',
        facilitatorScript: 'These letters contain the most honest observations of the semester. Hear them.',
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'The One Sentence',
        description: 'Each student writes their one-sentence academic identity statement: "I am a scholar who…"',
        facilitatorScript: 'Not what you want to become. Not what you aspire to. What you are, right now, as a result of this module.',
      },
    ],

    exitTicket: {
      prompt: '"I am a scholar who…" — complete this sentence honestly.',
      stems: ['I am a scholar who…'],
      time: '1 minute',
      collect: 'Read these at the start of next semester to the class. They are earned.',
    },
  },

});

Object.assign(SESSIONS, {

// ══════════════════════════════════════════════════════════════════
// PHASE 3 CONTACT SESSIONS — Units 10–15: Academic Communication
// ══════════════════════════════════════════════════════════════════

  c10: {
    id: 'c10', type: 'contact', unit: 'u10',
    phase: 'Phase 3 — Unit 10',
    title: 'Three-Pass Reading Lab',
    subtitle: 'From passive consumption to active scholarly engagement — with a real paper, live',
    tags: ['Three-Pass Method', 'Analytical Reading', 'Pomodoro', 'Pair Annotation'],
    goal: 'Every student applies the three-pass method to a real journal article — not as a hypothetical, but as a live experience. They leave with a demonstrated ability to orient, understand, and critically interrogate a scholarly text.',

    preWork: [
      { item: 'Unit 10 Module', detail: 'Full completion — video (Simon Clark), reading task, three-pass method reading, and writing response submitted' },
      { item: 'One journal article abstract', detail: 'Students bring an abstract from Scopus related to their teaching specialisation — already sourced for the Unit 10 writing prompt' },
    ],
    preWorkNote: 'Students who have not done the pre-work will not have an abstract to work with. Have 5 printed backup abstracts available from different education sub-fields.',

    blocks: [
      {
        time: '0:00', duration: 8, type: 'activation',
        title: 'How Do You Actually Read?',
        description: 'Quick honest poll + discussion: how do students currently read academic articles?',
        steps: [
          'Show of hands: Who reads from first word to last, in order?',
          'Who skips to the conclusion first?',
          'Who reads the abstract and decides whether to continue?',
          'Brief pair discussion: what problems does your current method cause when writing?',
        ],
        facilitatorScript: 'There is no right answer here — we are diagnosing. Most first-year students read the way they read fiction. That is the problem we are solving today.',
      },
      {
        time: '0:08', duration: 12, type: 'live-demo',
        title: 'Pass One Live — 10 Minutes with a Paper',
        description: 'Facilitator models Pass One in real time, thinking aloud through a projected journal article.',
        steps: [
          'Show a real education journal article — full text visible on projector',
          'Read ONLY: title, abstract, section headings, conclusion (8 min)',
          'Narrate aloud: "I\'m skipping the methods section for now. I\'m asking: is this relevant? What is the core claim?"',
          'Outcome: "Yes / No / Maybe" decision + one sentence summary',
        ],
        facilitatorScript: 'I am deliberately not reading the whole paper. Watch where my eyes go and where they don\'t. This is a reading strategy, not laziness.',
        materials: ['Projected journal article (education, recent, accessible)', 'Timer visible'],
      },
      {
        time: '0:20', duration: 35, type: 'workshop',
        pomMinutes: 30,
        title: 'Three-Pass Practice — Your Own Paper',
        description: 'Students apply all three passes to their own article. Pomodoro structures Pass Two. Pass Three is the hardest — facilitated explicitly.',
        steps: [
          'Pass One (5 min): Title, abstract, headings, conclusion. Decision: does this paper deserve a full reading?',
          'Pass Two — Pomodoro 25 min: Read for the argument. Note key claims in the margin. Do not stop at every unknown word.',
          'Pass Three prompt card: "What assumptions does the author make? What does the methodology not allow us to know? What would a sceptical reader say?"',
          'Write one Pass Three analytical position sentence: "This paper argues X, but I notice Y"',
        ],
        facilitatorScript: 'Pass Two is for understanding. Pass Three is for disagreement. You are allowed to disagree with a published researcher. In fact, scholarship requires it.',
        materials: ['Students\' own journal articles or printed backup abstracts', 'Pass Three prompt card', 'Pomodoro timer'],
      },
      {
        time: '0:55', duration: 5, type: 'break',
        title: 'Break',
        description: 'Short break. Students stretch, refill water.',
      },
      {
        time: '1:00', duration: 20, type: 'peer-feedback',
        title: 'Pair Annotation Exchange',
        description: 'Pairs share their Pass Three position sentences and test each other\'s critical reading.',
        steps: [
          'Each student reads their partner\'s Pass Three sentence aloud',
          'Partner asks ONE of: "What evidence in the paper supports that critique?" or "What would the author say in response?"',
          'Switch roles',
          'Whole class: 3 strong Pass Three sentences shared. Discuss: what makes a critique analytical vs just negative?',
        ],
        facilitatorScript: 'A critique is not "I didn\'t like this paper." It is: "This paper\'s methodology prevents it from claiming X because Y." That specificity is what makes it scholarly.',
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Exit + Self-Assessment',
        description: 'Students write a 4-sentence analytical response to their article using the Pass Three position.',
      },
    ],

    processWritingStages: [
      { icon: '🗺️', title: 'Pass One — Orientation', description: 'Read structure only. Decide whether to continue. This pass takes under 10 minutes.', time: '5–10 min', prompts: ['What is the paper\'s main claim?', 'Does this paper address my question?', 'Read/Don\'t Read decision?'] },
      { icon: '📖', title: 'Pass Two — Understanding', description: 'Read full paper without stopping to look up every word. Note key claims.', time: '20–40 min (Pomodoro)', prompts: ['What is the main argument?', 'What evidence is used?', 'What methodology?'] },
      { icon: '🔬', title: 'Pass Three — Critique', description: 'The hardest and most valuable pass. Re-read with critical questions active.', time: '20–40 min', prompts: ['What assumptions does the author make?', 'What does the methodology not allow us to know?', 'How does this connect to other things I\'ve read?'], aiPrompt: 'You are an academic reading coach. A student has written a Pass Three analytical response to a journal article. Evaluate: Does it make a specific analytical claim? Does it question assumptions or methodology? Does it avoid vague criticism ("I disagree") in favour of reasoned critique ("This paper cannot claim X because Y")? Give 2–3 sentences of specific, actionable feedback.' },
      { icon: '✍️', title: 'Analytical Response', description: 'Write your critical position in 4–6 sentences: what the paper argues, what you accept, what you question, why.', time: '10 min', prompts: ['This paper argues...', 'The strongest evidence is...', 'However, this claim assumes...', 'What this methodology cannot tell us is...'] },
    ],

    resources: [
      { icon: '📄', name: 'Backup journal articles (printed)', note: '5 different education sub-fields: early childhood, curriculum, inclusive ed, technology in education, teacher development' },
      { icon: '📋', name: 'Pass Three prompt card', note: 'Laminated. One per pair. Students keep these — they are used in every future session.' },
    ],

    exitTicket: {
      prompt: 'Submit your Pass Three analytical position sentence + one methodological question you would ask the author.',
      stems: ['This paper argues… but I notice…', 'The methodology prevents this paper from claiming… because…'],
      time: '5 minutes',
      collect: 'These exit tickets show whether students can distinguish between comprehension and critique. Flag students who write only descriptions (Pass Two) without any critical position (Pass Three).',
    },

    facilitatorNotes: [
      'Pass Three is where most students stall. They write "I agree with everything" or "This was interesting." Push for specificity: what assumption? What methodological limitation? Name it.',
      'The live Pass One demonstration is essential — students need to see a scholar deliberately skipping text without guilt. Model the behaviour explicitly.',
      'Some students will feel they need to read every word before forming an opinion. This session directly challenges that belief. Name the challenge.',
    ],
  },

  c11: {
    id: 'c11', type: 'contact', unit: 'u11',
    phase: 'Phase 3 — Unit 11',
    title: 'Notes That Think — Cornell + Synthesis Practice',
    subtitle: 'Building a note system that generates ideas, not just records them',
    tags: ['Cornell Method', 'Zettelkasten', 'Synthesis', 'Active Recall'],
    goal: 'Students leave with a functioning Cornell note-taking system applied to a real reading, and have practised the synthesis move — finding connections between two sources — that makes notes useful for essay writing.',

    preWork: [
      { item: 'Unit 11 Module', detail: 'Cornell method video + note-taking reading + writing response. Students should arrive with notes they actually took this week on any university reading.' },
      { item: 'Any notes from this week', detail: 'Whatever system they currently use — bring it. This session compares systems.' },
    ],
    preWorkNote: 'Students should physically bring their notes — paper, laptop, phone. The opening audit requires them.',

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Notes Audit — What Are Your Notes For?',
        description: 'Students examine their own notes. Quick diagnosis of current practice.',
        steps: [
          'Look at your notes from any reading this week. Count: how many sentences did you write that are NOT a direct quote or paraphrase from the source?',
          'Show hands: 0–2 original sentences / 3–5 / more than 5',
          'That count is a rough measure of how much thinking your notes contain vs how much recording',
        ],
        facilitatorScript: 'Notes that are 100% quotation are a transcript. We are building notes that are at least 30% your own thinking — connections, questions, reactions, implications.',
      },
      {
        time: '0:10', duration: 15, type: 'live-demo',
        title: 'Cornell Layout Demo — Live',
        description: 'Facilitator creates a Cornell page live, on the board or projector, using a real text.',
        steps: [
          'Draw the Cornell layout: wide right column, narrow left column, summary at bottom',
          'Read first paragraph of a shared text — take notes in right column only (5 min)',
          'Close the text. Fill in the left cue column: key words, questions, prompts',
          'Write a 2-sentence summary at the bottom',
          'Show: how to use the left column for active recall — cover right column, recall from cue',
        ],
        facilitatorScript: 'The cue column is filled in AFTER — not during. That is the critical part. It turns notes into a revision tool.',
      },
      {
        time: '0:25', duration: 30, type: 'workshop',
        pomMinutes: 25,
        title: 'Cornell Practice — Real Text, Your Notes',
        description: 'Pomodoro block: students create Cornell notes on a shared reading. Then synthesis exercise.',
        steps: [
          'Pomodoro 25 min: Create Cornell notes for the shared text. Right column notes, then cue column.',
          'Summary: 2 sentences ONLY — what is the core argument?',
          'Synthesis prompt: Compare this text to ONE other reading from this module. Write 2 sentences: "Both texts argue… However, they differ in…"',
        ],
        materials: ['Shared text (printed or projected)', 'Cornell template (blank paper with lines, or printed template)', 'Pomodoro timer'],
        facilitatorScript: 'The synthesis prompt at the end is the hardest part. That is also the most valuable. If your two sentences feel uncertain — good. That is thinking.',
      },
      {
        time: '0:55', duration: 5, type: 'break',
        title: 'Break',
      },
      {
        time: '1:00', duration: 15, type: 'discussion',
        title: 'Synthesis Share + Atomic Note Intro',
        description: 'Students share their synthesis sentences. Then introduction to atomic notes as a complement to Cornell.',
        steps: [
          'Three students share their synthesis sentence. Group responds: does it identify a genuine connection or contrast?',
          'Brief intro to atomic notes: one idea per note, in your own words, linkable to other notes',
          'Quick demo: how a Zettelkasten-style atomic note on Vygotsky might link to notes on scaffolding and inclusive education',
        ],
        facilitatorScript: 'Cornell is for session-level notes. Atomic notes are for idea-level connections. For literature reviews, atomic notes are often more useful than chronological lecture notes.',
      },
      {
        time: '1:15', duration: 15, type: 'peer-feedback',
        title: 'Cue Column Exchange',
        description: 'Pairs test each other\'s cue column — cover the right column, can you recall from the cues alone?',
        steps: [
          'Swap Cornell notes with a partner',
          'Cover partner\'s right column. Can you recall what each cue refers to, based on the cue alone?',
          'If a cue is too vague (just a topic word), suggest a better version — a question or a more specific prompt',
          'Partner revises 2–3 cues',
        ],
      },
    ],

    processWritingStages: [
      { icon: '🗺️', title: 'Cue Column First Draft', description: 'Fill in the left cue column after notes — key words, questions, prompts that will help you recall without re-reading.', time: '5 min', prompts: ['What is the key term here?', 'What question would this answer?', 'What does this connect to?'] },
      { icon: '📝', title: 'Summary Sentence', description: 'Write a 2-sentence summary at the bottom of the page. What is the core argument of this reading?', time: '3 min', prompts: ['The core argument is…', 'The most important implication is…'] },
      { icon: '🔗', title: 'Synthesis', description: 'Connect to one other source. Write 2 sentences: where do the sources agree? Where do they differ?', time: '5 min', prompts: ['Both texts argue…', 'However, they differ in…', 'This tension suggests…'] },
    ],

    resources: [
      { icon: '📄', name: 'Shared reading for Cornell practice', note: 'Choose a 2-page academic text relevant to education. Photocopy or project. Should be genuinely interesting, not just academically important.' },
      { icon: '📋', name: 'Cornell template (blank)', note: 'One per student — or draw on any page. The template is secondary; the discipline is primary.' },
    ],

    exitTicket: {
      prompt: 'Submit your Cornell page: right column notes + cue column + 2-sentence summary + 2-sentence synthesis connecting to one other module reading.',
      stems: ['The most useful cue I wrote was… because…', 'My synthesis connects this reading to [source] because both argue…'],
      time: '5 minutes',
      collect: 'The synthesis sentence is the key diagnostic. Students who write only "both are about education" have not done the analytical work. Students who write a genuine conceptual connection are ready for literature review writing.',
    },

    facilitatorNotes: [
      'The cue column exercise usually produces very weak first drafts — single words rather than questions. That is expected. The peer exchange improves them. Plan for resistance: "I already have a system." Acknowledge it and challenge: "Does your system produce synthesis? Let\'s test."',
      'Some students will resist Cornell because it is unfamiliar. Acknowledge the discomfort. Commit to trying it for two weeks before judging it.',
    ],
  },

  c12: {
    id: 'c12', type: 'contact', unit: 'u12',
    phase: 'Phase 3 — Unit 12',
    title: 'PEEL Writing Clinic — From Description to Argument',
    subtitle: 'Every student writes one complete PEEL paragraph and receives criterion-referenced feedback',
    tags: ['PEEL Paragraph', 'Academic Writing', 'Peer Feedback', 'Analytical Explanation'],
    goal: 'Every student completes a full PEEL paragraph — not an outline, a full paragraph — and receives specific written feedback on all four elements. The session diagnoses where the analytical explanation is weakest and targets it.',

    preWork: [
      { item: 'Unit 12 Module', detail: 'PEEL reading + annotated model paragraph + writing prompt attempt submitted' },
      { item: 'First PEEL attempt', detail: 'Bring your Unit 12 writing response — however rough. This is the raw material for today.' },
    ],
    preWorkNote: 'Students who have not attempted the writing prompt will have nothing to workshop. They will write from scratch today — a legitimate option, but they should know they are starting behind.',

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'PEEL Element Hunt',
        description: 'Students identify PEEL elements in the model paragraph from Unit 12 — quickly, as a class.',
        steps: [
          'Project the model PEEL paragraph from Unit 12 (annotated diagram)',
          'Students call out: where is the Point? The Evidence? The Explanation? The Link?',
          'Key question: "What does the Explanation do that Evidence cannot?" — make students name the analytical move',
        ],
        facilitatorScript: 'I am not teaching PEEL again — you did that in the module. I am calibrating: do you know it well enough to identify it, or just name it?',
        materials: ['Projected model PEEL paragraph from Unit 12'],
      },
      {
        time: '0:10', duration: 35, type: 'pomodoro',
        pomMinutes: 30,
        title: 'PEEL Draft — Full Paragraph, Full Pomodoro',
        description: '30-minute focused writing block. Students write a complete PEEL paragraph — or revise their Unit 12 attempt significantly.',
        steps: [
          'Write Point sentence first — a specific, arguable claim (not a description)',
          'Evidence: at least one source, with full APA 7th in-text citation',
          'Explanation: the analytical move. Ask: "So what? Why does this evidence matter for my argument?"',
          'Link: return to the question. What does this paragraph contribute to the overall answer?',
        ],
        facilitatorScript: 'The Explanation is where most marks are won or lost. Write it last, after you have written the Evidence. Then ask yourself: "Did I just repeat the evidence in different words, or did I tell the reader what it means?"',
        materials: ['Pomodoro timer', 'Essay question on board: "To what extent does access to technology determine the quality of learning in South African schools?"'],
      },
      {
        time: '0:45', duration: 5, type: 'break',
        title: 'Break + Swap Setup',
        description: 'Students finish their paragraph and pass to the person on their left.',
      },
      {
        time: '0:50', duration: 20, type: 'peer-feedback',
        title: 'Structured PEEL Peer Review',
        description: 'Criterion-referenced peer feedback using the four-element rubric.',
        steps: [
          'Read the paragraph once straight through',
          'Label each element: write P, E, Ex, L in the margin next to the relevant sentence(s)',
          'Write one specific comment on the EXPLANATION element only — is it genuinely analytical or does it just repeat the evidence?',
          'Write one feedforward: "For your revision, focus on…"',
        ],
        facilitatorScript: 'You are only commenting on the Explanation element. That is deliberate. It is the hardest element and the most important. Vague feedback is not acceptable: "Good" or "Needs work" without specifics earns no credit.',
      },
      {
        time: '1:10', duration: 15, type: 'process-write',
        title: 'Targeted Revision',
        description: 'Students read their feedback and make one specific revision — not cosmetic, but structural.',
        steps: [
          'Read your peer feedback',
          'Identify the single most important change to make',
          'Rewrite the Explanation sentence(s) only — make the analytical move explicit',
          'Compare before and after: what changed?',
        ],
        facilitatorScript: 'Revision is not proofreading. Revision is reconsidering what you have argued. Change the Explanation — not the word order, the idea.',
      },
    ],

    processWritingStages: [
      { icon: '💭', title: 'Point First', description: 'Write only the Point sentence first. If you cannot write an arguable claim in one sentence, you are not ready to write the paragraph.', time: '3 min', prompts: ['Am I making a claim or stating a topic?', 'Could a reasonable person disagree?', 'Is this specific enough to be proven?'] },
      { icon: '📎', title: 'Evidence + Citation', description: 'Choose your most specific, relevant evidence. Cite it fully: (Author, Year, p. X) or Author (Year, p. X).', time: '5 min', prompts: ['Is this the most specific evidence available?', 'Is the citation in correct APA 7th format?', 'Does this evidence directly support the Point?'] },
      { icon: '🔬', title: 'Explanation — The Hard Part', description: 'This sentence is the argument. Not: "This shows that education is important." But: "This finding challenges the assumption that…" or "This data reveals a structural inequality in…"', time: '5 min', prompts: ['So what does this evidence actually prove?', 'Why does this matter for THIS argument?', 'What assumption does this evidence challenge or confirm?'], aiPrompt: 'You are an academic writing coach evaluating a PEEL paragraph. Focus ONLY on the Explanation element. Criteria: Does it make an analytical claim? Does it move beyond repeating the evidence? Does it connect the evidence to the paragraph\'s central argument? Give 2–3 sentences of specific feedback naming what the explanation does and what it needs to do. Provide one model sentence showing what a stronger explanation would say.' },
      { icon: '🔗', title: 'Link Back', description: 'The final sentence returns to the essay question. It should not introduce new information — it should show how this paragraph advances the overall argument.', time: '2 min', prompts: ['How does this paragraph contribute to answering the question?', 'What has been established that was not established before?'] },
    ],

    resources: [
      { icon: '📝', name: 'PEEL peer review rubric', note: 'Four rows: Point (arguable claim?), Evidence (specific, cited?), Explanation (analytical, not repetitive?), Link (returns to question?). Criterion-referenced feedback only.' },
    ],

    exitTicket: {
      prompt: 'Submit: (1) Your original PEEL paragraph. (2) Your peer\'s written feedback. (3) Your revised Explanation sentence — and one sentence explaining what you changed and why.',
      stems: ['I changed the Explanation because…', 'The original said… The revised version says… The difference is…'],
      time: '5 minutes',
      collect: 'Three-piece exit gives insight into: quality of original, quality of feedback given and received, and whether revision was substantive or cosmetic.',
    },

    facilitatorNotes: [
      'The most common Explanation error: "This shows that technology is important for education." This restates the general claim without analytical movement. Challenge it: "What specifically does this data reveal about the relationship between access and quality? What assumption does it challenge?"',
      'Watch for students writing their Link as "In conclusion, technology is important." This misunderstands what a Link does. It should be a mini-argument: "This finding therefore challenges the policy assumption that digital access alone improves outcomes."',
    ],
  },

  c13: {
    id: 'c13', type: 'contact', unit: 'u13',
    phase: 'Phase 3 — Unit 13',
    title: 'Academic Voice Workshop — Register Transformation',
    subtitle: 'Taking informal writing and deliberately constructing academic prose from it',
    tags: ['Academic Register', 'Hedging Language', 'Sentence-Level Revision', 'Peer Editing'],
    goal: 'Students can identify informal writing features and systematically transform informal sentences into academic prose — not by replacing words, but by reconstructing the sentence logic to make implicit claims explicit and add appropriate attribution.',

    preWork: [
      { item: 'Unit 13 Module', detail: 'Video + reading on academic voice + writing response submitted' },
      { item: 'Any piece of informal writing', detail: 'A text message, social media post, or WhatsApp message about an education topic. Genuinely informal — this is the raw material.' },
    ],
    preWorkNote: 'Students may be embarrassed to share informal writing. Normalise this explicitly: everyone writes informally. The skill is knowing when to shift registers.',

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Informal Writing Audit',
        description: 'Students annotate a short informal paragraph for features to transform.',
        steps: [
          'Project: an informal paragraph about technology in South African schools (written at conversational register)',
          'Students annotate in 3 minutes: circle contractions / underline vague intensifiers (very, really, obviously) / box unsupported claims',
          'Count: how many items did you find?',
          'This count is your "transformation task list"',
        ],
        facilitatorScript: 'We are not judging this writing — it is good conversational writing. The question is: what has to change for it to function in an academic essay?',
        materials: ['Projected informal paragraph'],
      },
      {
        time: '0:10', duration: 20, type: 'workshop',
        title: 'Register Transformation — Facilitated',
        description: 'Whole-class live transformation exercise. Facilitator takes suggestions from students to transform the informal paragraph.',
        steps: [
          'Take the annotated informal paragraph',
          'One sentence at a time: students suggest transformations, facilitator evaluates them',
          'Key moves: remove contractions / replace intensifiers with evidence / add hedging where needed / attribute claims to sources',
          'Compare before and after — is the meaning preserved? Has anything been lost?',
        ],
        facilitatorScript: 'The goal is not to make the writing harder to read. The goal is to make the claims more precise, more supported, and more honest about uncertainty. Sometimes formal register actually improves clarity.',
      },
      {
        time: '0:30', duration: 25, type: 'pomodoro',
        pomMinutes: 20,
        title: 'Transform Your Own Informal Writing',
        description: 'Students transform their own informal text into academic prose. Pomodoro structures the work.',
        steps: [
          'Annotate your own informal writing: contractions, vague intensifiers, unsupported claims',
          'Rewrite sentence by sentence — not word substitution but sentence reconstruction',
          'Add hedging where a claim is not supported by evidence you have',
          'Add APA 7th attribution where a claim should be supported by a source',
        ],
        facilitatorScript: 'Write first, then check. Do not stop every sentence to correct — get the transformation done, then audit.',
        materials: ['Students\' own informal writing'],
      },
      {
        time: '0:55', duration: 5, type: 'break',
        title: 'Break',
      },
      {
        time: '1:00', duration: 20, type: 'peer-feedback',
        title: 'Register Audit Pairs',
        description: 'Partners read each other\'s transformed academic versions and apply a register audit.',
        steps: [
          'Read partner\'s academic version aloud — find any remaining informal features',
          'Identify: one sentence that successfully achieves academic register (with explanation of why)',
          'Identify: one sentence where the transformation is incomplete or where hedging was needed but missing',
          'Write one feedforward: what should they work on in their own writing?',
        ],
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Hedging Practice — Three Claims',
        description: 'Students write three claims about their teaching subject: one overclaimed, one appropriately hedged, one under-hedged — then identify which is which.',
      },
    ],

    processWritingStages: [
      { icon: '🔍', title: 'Annotation First', description: 'Before rewriting, annotate for transformation targets: contractions, vague intensifiers, unsupported claims, first person where inappropriate.', time: '5 min', prompts: ['What are the informal features I need to address?', 'Which claims need attribution?', 'Which claims need hedging?'] },
      { icon: '🔄', title: 'Sentence Reconstruction', description: 'Rewrite sentence by sentence — not word-for-word substitution but structural reconstruction.', time: '15 min', prompts: ['Am I preserving the meaning or changing it?', 'Is the reconstructed sentence grammatically complete?', 'Have I added appropriate attribution?'] },
      { icon: '🎯', title: 'Hedging Check', description: 'Review every claim: is its certainty level accurately represented? "Always", "never", "obviously" are red flags.', time: '5 min', prompts: ['Can I prove this claim?', 'Should this be "suggests" not "proves"?', 'Have I over-hedged to the point of meaninglessness?'], aiPrompt: 'You are an academic writing coach specialising in register and hedging. Review this student\'s transformed academic writing. Identify: (1) One example of effective formal register — quote the sentence and explain what makes it work. (2) One example of remaining informal language or over-claiming — quote it and suggest a specific revision. (3) One example of hedging used correctly and one example where stronger hedging is needed. Be specific and use APA 7th conventions in your examples.' },
    ],

    resources: [
      { icon: '📋', name: 'Hedging language reference list', note: 'Categorised: verbs (suggests, indicates, appears, tends to), adverbs (generally, typically, often), qualifiers (in many contexts, under certain conditions). Laminated, student keeps.' },
    ],

    exitTicket: {
      prompt: 'Submit: your original informal text + your academic transformation + one paragraph explaining three specific changes you made and why each was necessary.',
      stems: ['I changed [specific element] because in academic writing…', 'I added hedging to [claim] because the evidence…', 'I removed [word/phrase] because it…'],
      time: '5 minutes',
      collect: 'The explanation paragraph is the key diagnostic — it shows whether students understand WHY the changes matter, not just that informal writing is "wrong."',
    },

    facilitatorNotes: [
      'The hardest transformation for most students is the unsupported claim. Rewriting "technology improves learning" requires either adding a source or replacing it with hedged language — "evidence suggests that technology may support learning outcomes in specific contexts (Author, Year)." The structure of the sentence changes, not just the words.',
      'Some students from formal language backgrounds may already write in a register that is too stiff. For them, the challenge is productive formality — precise without being impenetrable.',
    ],
  },

  c14: {
    id: 'c14', type: 'contact', unit: 'u14',
    phase: 'Phase 3 — Unit 14',
    title: 'Visual Arguments Workshop — Reading the Invisible Frame',
    subtitle: 'What a graph is NOT showing you is as important as what it is',
    tags: ['Visual Literacy', 'Data Analysis', 'Four-Question Protocol', 'SA Education Data'],
    goal: 'Students can apply the four analytical questions to any data visualisation and produce a written verbal argument about both what the visual claims and what it conceals. They leave having analysed at least one real South African education data visual.',

    preWork: [
      { item: 'Unit 14 Module', detail: 'McCandless TED talk + visual arguments reading + visual literacy task completed' },
      { item: 'One data visual from SA news or government', detail: 'Screenshot or printout from Daily Maverick, Mail & Guardian, DBE or Stats SA — any visual about education, health, or inequality in South Africa' },
    ],
    preWorkNote: 'Have printed backup visuals available: DBE Annual Report charts, PIRLS 2021 provincial data, Stats SA education levels by province.',

    blocks: [
      {
        time: '0:00', duration: 12, type: 'activation',
        title: 'Spot the Mislead',
        description: 'Students see three graphs. Two are honest; one uses a visual rhetoric technique to mislead. Can they find it?',
        steps: [
          'Project three graphs sequentially (30 seconds each)',
          'Students write their answer: which graph is most misleading, and what is the technique?',
          'Reveal + discuss: truncated y-axis, cherry-picked date range, misleading percentage framing',
          'Key question: is the graph technically accurate? Yes. Is it honest? Why not?',
        ],
        facilitatorScript: 'This graph is not lying. Every number is correct. And yet — it is misleading. That is the hardest kind of visual to critique. Today we build the tools to do it.',
        materials: ['Three projected graphs (prepared in advance: at least one with truncated y-axis)'],
      },
      {
        time: '0:12', duration: 15, type: 'live-demo',
        title: 'Four-Question Protocol — Live Analysis',
        description: 'Facilitator models the complete four-question analytical protocol on one real SA education data visual.',
        steps: [
          'Question 1: What exactly is being measured? Define the variable. What does "reading proficiency" mean here?',
          'Question 2: Scale and baseline — where does the y-axis start? What would this look like at full scale?',
          'Question 3: Source — who produced this data? What interest do they have in the findings?',
          'Question 4: What is outside the frame? What context would change how we read these numbers?',
        ],
        facilitatorScript: 'I am going slowly through this so you can see the moves. In your own analysis later, this should take you 5–7 minutes per visual.',
        materials: ['Projected SA education data visual — PIRLS 2021 or DBE matric results'],
      },
      {
        time: '0:27', duration: 30, type: 'workshop',
        pomMinutes: 25,
        title: 'Independent Visual Analysis',
        description: 'Students apply the four-question protocol to their own brought-in visual. Pomodoro structures the analysis.',
        steps: [
          'Apply all four questions in writing — minimum 2 sentences per question',
          'Identify: what is the visual\'s central argument (not just its data)?',
          'Identify: what is the single most important thing missing from the frame?',
          'Write a verdict: is this visual honest? Well-designed? Misleading in ways a careful reader should flag?',
        ],
        materials: ['Students\' own visuals + backup printed visuals'],
        facilitatorScript: 'Your verdict does not have to be negative. A well-designed, honest visual is worth identifying as such. The skill is the ability to judge — not always to criticise.',
      },
      {
        time: '0:57', duration: 3, type: 'break',
        title: 'Short break',
      },
      {
        time: '1:00', duration: 20, type: 'discussion',
        title: 'Gallery of Verdicts',
        description: 'Students share their visuals and verdicts. Class evaluates the quality of the analysis.',
        steps: [
          'Four students share: show the visual, read their verdict',
          'Class responds to each: did the analysis apply all four questions? Was the verdict supported by specific evidence?',
          'Facilitator notes: "Verdict A is analytical. Verdict B describes the visual without analysing it. What is the difference?"',
        ],
        facilitatorScript: 'We are evaluating the quality of the analysis, not the visual itself. A strong analysis of a boring graph is better work than a weak analysis of a dramatic one.',
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Written Analytical Response',
        description: 'Students write a final 80-word analytical paragraph applying all four questions as an integrated piece of academic prose.',
      },
    ],

    processWritingStages: [
      { icon: '🔍', title: 'Question 1 — Measurement', description: 'What exactly is being measured? How is the variable defined? What does the measure include and exclude?', time: '3 min', prompts: ['How is the key variable defined?', 'What does this measure NOT capture?', 'Could the same data be measured differently?'] },
      { icon: '📏', title: 'Question 2 — Scale & Baseline', description: 'Where does the y-axis start? Does the scale distort magnitude? Would the visual look different at full scale?', time: '3 min', prompts: ['Does the y-axis start at 0?', 'Is the scale proportional?', 'What would this look like at full scale?'] },
      { icon: '📋', title: 'Question 3 — Source', description: 'Who produced this data? When? For what purpose? What interest do they have in how the findings are presented?', time: '3 min', prompts: ['Who collected this data?', 'Do they have a stake in the findings?', 'Has this data been independently verified?'] },
      { icon: '🖼️', title: 'Question 4 — Outside the Frame', description: 'What important context is missing? What would change the interpretation if the reader knew it?', time: '3 min', prompts: ['What socioeconomic context is absent?', 'What comparison group is missing?', 'What historical context would change how we read this?'], aiPrompt: 'You are a data literacy and visual rhetoric coach. A student has analysed a data visualisation using four analytical questions. Evaluate: (1) Does the analysis identify what is specifically being measured, or just name the topic? (2) Does it address scale/baseline issues? (3) Does it evaluate the source\'s potential bias? (4) Does it identify meaningful absent context — not just "more information would be nice" but a specific piece of missing context that would significantly change interpretation? Give 2–3 sentences of targeted feedback on the weakest element.' },
    ],

    resources: [
      { icon: '📊', name: 'Backup data visuals (printed)', note: 'PIRLS 2021 provincial reading scores, DBE matric results by province, Stats SA educational attainment by race, NGO education spending comparison' },
      { icon: '📋', name: 'Four-question analysis card', note: 'Laminated. Students keep. Used in every literature review and every written source evaluation from this point.' },
    ],

    exitTicket: {
      prompt: 'Submit your four-question analysis + one-sentence verdict on your chosen visual.',
      stems: ['The most important thing missing from the frame is… because this context would…', 'This visual argues [X] but conceals [Y] by…'],
      time: '5 minutes',
      collect: 'Q4 (outside the frame) is the most diagnostic question. Students who write only "more data would be useful" are describing the absence of information without naming what specifically is missing and why it matters.',
    },
  },

  c15: {
    id: 'c15', type: 'contact', unit: 'u15',
    phase: 'Phase 3 — Unit 15',
    title: 'Peer Review Clinic — Every Student Gives and Receives',
    subtitle: 'Criterion-referenced feedback as a scholarly practice, not a box-ticking exercise',
    tags: ['Peer Review Protocol', 'Criterion-Referenced Feedback', 'Feedforward', 'PEEL Application'],
    goal: 'Every student gives and receives structured, criterion-referenced peer feedback on a real piece of academic writing. No vague feedback is accepted — the session enforces specificity through protocol and public accountability.',

    preWork: [
      { item: 'Unit 15 Module', detail: 'Feedback research reading + annotated peer review visual task + writing task submitted' },
      { item: 'A piece of your own academic writing', detail: 'Your Unit 12 PEEL paragraph (revised version) or your Unit 13 register transformation. Something you actually care about improving.' },
    ],
    preWorkNote: 'If a student brings nothing, they review a supplied sample paragraph. But they miss the chance to get feedback on their own work — which is the primary purpose.',

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Feedback Spectrum — Good to Useless',
        description: 'Students rank five feedback comments from most to least useful. Group calibration exercise.',
        steps: [
          'Display five peer feedback examples (range from vague to specific to criterion-referenced)',
          'Students rank them 1–5: most useful to least useful (individual, 2 min)',
          'Groups of 3 compare rankings and resolve disagreements',
          'Whole class: establish criteria that explain the ranking',
        ],
        facilitatorScript: 'The goal is not to agree on what "nice feedback" looks like. The goal is to agree on what feedback you can actually USE to make your writing better. Those are different standards.',
        materials: ['Five feedback comments (printed cards or projected)'],
      },
      {
        time: '0:10', duration: 10, type: 'live-demo',
        title: 'Four-Part Protocol Modelled Live',
        description: 'Facilitator models a complete peer review on a student volunteer\'s PEEL paragraph (with permission).',
        steps: [
          'Read the paragraph once straight through',
          'Part 1: Name what works specifically — quote the element, name the criterion it meets',
          'Part 2: Identify the single most important gap — one issue, not a list',
          'Part 3: Describe what improvement looks like — not "be more analytical" but "add a sentence after your Evidence that begins: \'This finding reveals that…\'"',
          'Part 4: One feedforward sentence — what to focus on next time',
        ],
        facilitatorScript: 'I am not praising this student. I am analysing their work against the criteria and giving them something they can act on. This is a skill that protects you from being vague.',
      },
      {
        time: '0:20', duration: 35, type: 'peer-feedback',
        title: 'Structured Peer Review Rounds',
        description: 'Two rounds of peer review using the four-part protocol. Each student gives and receives feedback twice.',
        steps: [
          'Round 1 (15 min): Swap with first partner. Apply four-part protocol in writing — minimum 4 sentences',
          'Read feedback received. React in writing: one thing you will act on and one thing you disagree with',
          'Round 2 (15 min): Swap with second partner from a different table. Apply protocol again.',
          'Return work.',
        ],
        facilitatorScript: 'You will write the review — not just discuss it. Written feedback is more careful, more specific, and more useful than verbal feedback. Your partner keeps it.',
      },
      {
        time: '0:55', duration: 5, type: 'break',
        title: 'Break',
      },
      {
        time: '1:00', duration: 20, type: 'process-write',
        title: 'Feedback-Driven Revision',
        description: 'Students revise one specific element of their writing based on the most actionable feedback they received.',
        steps: [
          'Read both reviews. Identify the single most important revision signal',
          'Make the specific revision — rewrite only what the feedback identifies',
          'Write 2 sentences: what changed, why you changed it (or why you disagreed and what you changed instead)',
        ],
        facilitatorScript: 'Revision is not accepting every piece of feedback. It is reading feedback critically, deciding what serves your argument, and acting on it deliberately.',
      },
      {
        time: '1:20', duration: 10, type: 'discussion',
        title: 'Reflecting on the Process',
        description: 'Whole-class debrief: what made peer feedback useful today? What was still too vague?',
        steps: [
          'Who received feedback they could immediately act on? What made it actionable?',
          'Who received feedback that was too vague? What would have made it better?',
          'How does this experience change how you will write peer feedback in future assessments?',
        ],
      },
    ],

    processWritingStages: [
      { icon: '📎', title: 'Criteria First', description: 'Before reading the work, re-read the criteria. Your review should reference criteria, not personal preferences.', time: '2 min', prompts: ['What are the 4 PEEL elements?', 'What does each element require?', 'What would a strong version of each look like?'] },
      { icon: '✅', title: 'Name What Works', description: 'Identify one specific element that meets the criteria. Quote it. Name the criterion. Explain why it works.', time: '3 min', prompts: ['Which sentence/element is strongest?', 'Which criterion does it meet?', 'What specifically makes it meet the criterion?'] },
      { icon: '🎯', title: 'Identify the Gap', description: 'Name the single most important weakness. One issue — not a list. Locate it precisely.', time: '3 min', prompts: ['Which criterion is least well addressed?', 'Where specifically is the gap (paragraph number, sentence)?', 'What is missing?'] },
      { icon: '🔮', title: 'Feedforward', description: 'Describe what improvement looks like — a concrete instruction, not a general direction.', time: '4 min', prompts: ['What specific action should they take?', 'What sentence should they add/change/remove?', 'What would a stronger version contain?'], aiPrompt: 'You are a peer review coach. Evaluate this student\'s peer review comment against the four-part protocol: (1) Does it name what works specifically (not vaguely)? (2) Does it identify a single most important gap with a specific location in the text? (3) Does it describe what improvement looks like as a concrete instruction? (4) Is there a feedforward sentence that is actionable? For each element: does it meet the criterion? If not, rewrite it to show what it should say.' },
    ],

    resources: [
      { icon: '📋', name: 'Peer review protocol card', note: 'Four-part: what works (specific), the gap (one issue, located), what improvement looks like (concrete), feedforward (actionable). Laminated. Students keep.' },
    ],

    exitTicket: {
      prompt: 'Submit: (1) The feedback you gave to Partner 1. (2) The feedback you gave to Partner 2. (3) The revision you made based on the feedback you received, with one sentence explaining your decision.',
      stems: ['I revised [specific element] because the feedback identified…', 'I disagreed with the feedback about [element] because…'],
      time: '5 minutes',
      collect: 'Quality of feedback given reveals whether students have internalised criteria. Superficial feedback ("good work") after a session devoted to criterion-referenced feedback means the student needs individual coaching.',
    },
  },

// ══════════════════════════════════════════════════════════════════
// PHASE 4 CONTACT SESSIONS — Units 16–18: AI as a Scholarly Tool
// ══════════════════════════════════════════════════════════════════

  c16: {
    id: 'c16', type: 'contact', unit: 'u16',
    phase: 'Phase 4 — Unit 16',
    title: 'AI Prompting Lab — CREATE in Practice',
    subtitle: 'From vague questions to precision tools: building prompts that actually work',
    tags: ['CREATE Framework', 'Prompt Engineering', 'Hallucination Detection', 'Academic AI Use'],
    goal: 'Every student writes and tests at least three CREATE-structured prompts for real academic tasks — and critically evaluates the AI outputs they receive for accuracy, hallucination, and fitness for academic use.',

    preWork: [
      { item: 'Unit 16 Module', detail: 'Google prompt engineering video + CREATE framework reading + writing response submitted' },
      { item: 'Access to an AI tool', detail: 'Claude, ChatGPT, Gemini, or Copilot — any accessible AI assistant. This session uses it live.' },
    ],
    preWorkNote: 'Not all students will have devices with AI access. Plan for groups of 2–3 sharing one device. The analysis is more important than individual access.',

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Vague Prompt vs Precise Prompt — Live Demonstration',
        description: 'Facilitator demonstrates the same task twice: once with a vague prompt, once with a CREATE-structured prompt. Students compare outputs.',
        steps: [
          'Task: "Get feedback on a PEEL paragraph"',
          'Vague prompt: "Is my paragraph good?" → observe output quality',
          'CREATE prompt: full six-element prompt with role, task, examples, constraints, format, and extras',
          'Compare outputs side by side: specificity, accuracy, usefulness',
        ],
        facilitatorScript: 'I am not changing the task. I am changing the specification. The task is identical. The instructions are different. The outputs are dramatically different.',
        materials: ['Projected AI tool (live)', 'Sample PEEL paragraph for prompting'],
      },
      {
        time: '0:10', duration: 30, type: 'workshop',
        pomMinutes: 25,
        title: 'CREATE Prompt Building — Three Real Tasks',
        description: 'Students build and test CREATE prompts for three different academic tasks. Group rotation structure.',
        steps: [
          'Task 1 (8 min): Get AI feedback on your PEEL paragraph. Write the CREATE prompt first, then test it.',
          'Task 2 (8 min): Ask AI to explain one concept from this module in plain language. CREATE prompt. Test.',
          'Task 3 (9 min): Ask AI to generate a reading list on your teaching subject. Test the output — verify 3 citations.',
          'Each task: write the full CREATE prompt in your workbook before testing',
        ],
        facilitatorScript: 'Write the prompt before testing. That discipline matters. The prompt is the thinking — the testing is the checking.',
        materials: ['AI access per group', 'CREATE prompt template card'],
      },
      {
        time: '0:40', duration: 5, type: 'break',
        title: 'Break',
      },
      {
        time: '0:45', duration: 25, type: 'discussion',
        title: 'Hallucination Hunt — Verify Task 3 Outputs',
        description: 'Students verify the reading list their AI produced. How many citations actually exist?',
        steps: [
          'Take the AI-generated reading list from Task 3',
          'Verify first 3 citations in Scopus or Google Scholar: does the paper exist?',
          'Record findings: real / hallucinated / partially correct (real author, wrong paper)',
          'Class tally: across all groups, what percentage of AI citations were accurate?',
          'Discussion: what does this mean for academic AI use?',
        ],
        facilitatorScript: 'I want the actual percentage. We are doing empirical research on AI reliability right now, in this room, with real data.',
        materials: ['Scopus or Google Scholar access', 'Tally sheet (or live shared Google Sheet)'],
      },
      {
        time: '1:10', duration: 20, type: 'process-write',
        title: 'AI Use Protocol — My Rules',
        description: 'Students draft their personal AI use protocol for academic work — informed by what they observed today.',
        steps: [
          'Three things I will use AI for (with CREATE prompts) — and why',
          'Three things I will NOT use AI for in academic work — and why',
          'One verification step I will apply every time I use AI output in an academic context',
        ],
        facilitatorScript: 'This protocol is not a permanent statement. It is your current thinking, informed by what you have seen today. You will update it in Unit 18.',
      },
    ],

    processWritingStages: [
      { icon: '🎭', title: 'Character (C)', description: 'Who should the AI be for this task? A writing coach? A subject expert? A peer reviewer? The role shapes everything.', time: '1 min', prompts: ['What expertise does this task require?', 'What role would produce the most useful feedback?'] },
      { icon: '📋', title: 'Request + Examples (R+E)', description: 'What specifically do you want? Show a good example — what would a strong output look like?', time: '3 min', prompts: ['What exactly is the task?', 'What would an excellent output contain?', 'What example can I include?'] },
      { icon: '🎯', title: 'Adjustments + Type (A+T)', description: 'What constraints apply? What format do you want? Word count? Bullet points? Academic register?', time: '2 min', prompts: ['What should the AI NOT do?', 'What format is most useful?', 'What level of detail do I need?'] },
      { icon: '✔️', title: 'Verify Output', description: 'After receiving AI output: check every factual claim. Verify every citation. Do not assume fluency equals accuracy.', time: '5 min', prompts: ['Does this paper/quote/statistic actually exist?', 'Is this claim supported by evidence I can verify?', 'Where might hallucination be hiding in this output?'] },
    ],

    resources: [
      { icon: '📋', name: 'CREATE framework card', note: 'Character, Request, Examples, Adjustments, Type, Extras. Laminated. Students keep.' },
      { icon: '💻', name: 'AI tool access', note: 'At least one device per group of 2–3. Claude.ai is recommended — the usage policies and interface design are transparent about limitations.' },
    ],

    exitTicket: {
      prompt: 'Submit: (1) Your best CREATE prompt from today (with all 6 elements labelled). (2) The AI output it produced. (3) One verification result: what did you find when you checked the output?',
      stems: ['The most important verification I did was…', 'I was surprised to find…', 'I will now always verify [specific type of AI output] because…'],
      time: '5 minutes',
      collect: 'Verification results are the key diagnostic. Students who say "everything was accurate" may not have checked rigorously. Students who found hallucinations and can explain them have internalised the core lesson.',
    },

    facilitatorNotes: [
      'The citation verification exercise almost always produces at least 20–30% hallucination rates. This is the most memorable learning moment in the session — an empirical demonstration of AI unreliability that students have generated themselves.',
      'Some students will be resistant ("my AI was fine, no errors"). Encourage them to verify 5 citations rather than 3. The more they check, the more likely they find errors.',
      'The debate about AI ethics and fairness sometimes emerges here. This is appropriate but redirect to Unit 18 for the full treatment — today\'s focus is practical literacy.',
    ],
  },

  c17: {
    id: 'c17', type: 'contact', unit: 'u17',
    phase: 'Phase 4 — Unit 17',
    title: 'Literature Mapping Workshop — From One Paper to a Field',
    subtitle: 'Building a synthesis matrix live, with real sources, for a real topic',
    tags: ['Citation Networks', 'Synthesis Matrix', 'Thematic Synthesis', 'ResearchRabbit'],
    goal: 'Students build a real synthesis matrix on a shared topic and write their first thematic synthesis paragraph — integrating three sources rather than summarising them separately. They experience the conceptual leap from annotation to synthesis.',

    preWork: [
      { item: 'Unit 17 Module', detail: 'Scribbr literature review video + literature mapping reading + synthesis matrix activity submitted' },
      { item: 'Three sources on a chosen topic', detail: 'Same sources from the Unit 17 writing prompt. Bring them — you will build on this work today.' },
    ],
    preWorkNote: 'Students who have not found their three sources will need to use Scopus live during the workshop. Build in time for this — 10 minutes at the start if needed.',

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Source-by-Source vs Thematic — Spot the Difference',
        description: 'Two versions of the same literature review content. Students identify which is synthesis.',
        steps: [
          'Project Version A (source-by-source): Smith (2020) argues... Jones (2021) argues... Patel (2022) argues...',
          'Project Version B (thematic): A convergent body of evidence shows... (Smith, 2020; Jones, 2021; Patel, 2022)...',
          'Students write: what is the structural difference? What does Version B do that Version A cannot?',
          'Brief discussion: when does Version A ever have a purpose?',
        ],
        facilitatorScript: 'Version A is not wrong — it is what annotated bibliographies do. The question is: when does an essay or literature review need something different? Always.',
      },
      {
        time: '0:10', duration: 15, type: 'live-demo',
        title: 'Synthesis Matrix — Built Live',
        description: 'Facilitator builds a synthesis matrix live on a shared topic using three projected sources.',
        steps: [
          'Project three article abstracts on "AI in teacher education"',
          'Draw the matrix: rows = sources, columns = themes (main argument, methodology, context, limitation, relevant?)',
          'Fill in each cell — narrating what goes in and what is left out',
          'At the end: "What pattern is visible in this matrix that was not visible when I read each abstract separately?"',
        ],
        facilitatorScript: 'The matrix is a thinking tool. I am not summarising here — I am categorising. The categories force comparison.',
        materials: ['Three projected abstracts', 'Matrix template (on board or projected)'],
      },
      {
        time: '0:25', duration: 35, type: 'workshop',
        pomMinutes: 30,
        title: 'Build Your Own Synthesis Matrix',
        description: 'Students build a matrix for their own three sources, then attempt a synthesis paragraph.',
        steps: [
          'Copy the matrix template. Fill in your three sources (20 min Pomodoro)',
          'Identify: where do the sources agree? Where do they diverge?',
          'Write a thematic topic sentence: what pattern do these three sources collectively establish?',
          'Write a full thematic paragraph integrating all three — do not summarise each separately (10 min)',
        ],
        facilitatorScript: 'The paragraph is harder than the matrix. That is the point. The matrix is preparation — it reveals the pattern. The paragraph is the argument.',
        materials: ['Students\' three sources', 'Synthesis matrix template (A3 or projected)', 'Pomodoro timer'],
      },
      {
        time: '1:00', duration: 5, type: 'break',
        title: 'Break',
      },
      {
        time: '1:05', duration: 20, type: 'peer-feedback',
        title: 'Thematic Paragraph Exchange',
        description: 'Pairs read each other\'s synthesis paragraphs and apply a specific evaluation.',
        steps: [
          'Read partner\'s paragraph. Underline every place where two or more sources are mentioned in the same sentence or clause',
          'Count the integrations — 0 integrations means source-by-source; 2+ means synthesis is present',
          'Write one specific comment: "Your strongest synthesis moment is [quote] because…"',
          'Write one feedforward: "You need to integrate sources at [specific location] — try combining [source X] and [source Y] by…"',
        ],
      },
      {
        time: '1:25', duration: 5, type: 'process-write',
        title: 'Gap Statement Draft',
        description: 'Students write a gap statement for their topic based on what they found missing in the matrix.',
      },
    ],

    processWritingStages: [
      { icon: '📊', title: 'Matrix — Rows and Columns', description: 'One row per source. Columns: main argument, methodology (how they know), context (where, who), limitation, relevant to your question (Y/N).', time: '15 min', prompts: ['What is the core finding of each source?', 'How did they collect their data?', 'What does the methodology NOT allow them to claim?'] },
      { icon: '🔗', title: 'Pattern Finding', description: 'After filling the matrix: where are the columns consistent (agreement)? Where are they different (divergence)?', time: '5 min', prompts: ['What do all three sources agree on?', 'Where is there genuine disagreement?', 'What does every source leave unanswered?'] },
      { icon: '📝', title: 'Thematic Paragraph', description: 'Open with a thematic claim. Weave sources together. Acknowledge disagreement where it exists. Close with a gap.', time: '10 min', prompts: ['What is the one sentence that captures the pattern?', 'Can I put 2+ sources in the same citation bracket?', 'Where do I need to name the disagreement explicitly?'], aiPrompt: 'You are a literature review writing coach. Evaluate this student\'s synthesis paragraph. Criteria: (1) Does it open with a thematic claim (not "researchers have studied X")? (2) Does it integrate multiple sources in single sentences, or summarise each separately? (3) Does it identify a point of convergence AND a point of divergence/nuance? (4) Does it end with or include a gap statement? For each criterion: does it meet the standard? If not, quote the specific problem and provide a model revision showing what synthesis looks like.' },
    ],

    resources: [
      { icon: '📋', name: 'Synthesis matrix template (A3)', note: 'Rows: sources. Columns: main argument, methodology, context, limitation, relevant (Y/N). Laminated or printed — one per student.' },
      { icon: '💻', name: 'Scopus or Google Scholar access', note: 'For students who need to find sources during the session.' },
    ],

    exitTicket: {
      prompt: 'Submit: (1) Your completed synthesis matrix. (2) Your thematic synthesis paragraph. (3) Your gap statement.',
      stems: ['The pattern across these three sources is…', 'However, they diverge in…', 'Despite this research, no study has examined…'],
      time: '5 minutes',
      collect: 'The paragraph is the primary diagnostic. Count integration moments — places where two or more sources appear in the same sentence. Zero integrations means the student is still summarising, not synthesising.',
    },
  },

  c18: {
    id: 'c18', type: 'contact', unit: 'u18',
    phase: 'Phase 4 — Unit 18',
    title: 'Academic Integrity Forum — Cases, Principles, Policies',
    subtitle: 'Moving from rule-compliance to principled practice — a whole-class deliberation',
    tags: ['Academic Integrity', 'AI Ethics', 'Case Studies', 'Personal Policy'],
    goal: 'Students can reason through ambiguous AI use scenarios using principled criteria (not just "is this allowed?"), articulate where their institution\'s policy is clear and where it is ambiguous, and draft a personal AI ethics policy they actually believe.',

    preWork: [
      { item: 'Unit 18 Module', detail: 'Academic integrity reading + quiz + personal AI ethics policy writing task submitted' },
      { item: '3-minute pre-session reflection', detail: 'If your lecturer could see every AI interaction in your last assignment — would you be comfortable? Honest answer required, not a performance.' },
    ],
    preWorkNote: 'This session requires an atmosphere of honest self-reflection, not performance. Set this norm explicitly at the start. No grades attached to honesty.',

    blocks: [
      {
        time: '0:00', duration: 5, type: 'activation',
        title: 'Anonymous Comfort Poll',
        description: 'Anonymous show of hands: who would be comfortable if their AI interactions were fully visible to their lecturer?',
        steps: [
          'Anonymous slips: Yes / No / Depends',
          'Tally and share',
          'Normalise the "No" and "Depends" answers — discomfort is diagnostic, not evidence of dishonesty',
        ],
        facilitatorScript: 'There are no wrong answers here. This is not a confession. The discomfort tells us something useful about where the boundary between acceptable and unacceptable AI use is still unclear — for you and for most of us.',
      },
      {
        time: '0:05', duration: 30, type: 'discussion',
        title: 'Case Study Deliberations',
        description: 'Groups deliberate four AI use scenarios. Each group receives a different scenario and must reach a group position.',
        steps: [
          'Case A: Student uses AI to generate essay outline, then writes all content themselves. Acceptable?',
          'Case B: Student pastes a complex article into AI, asks for a plain-language summary, then reads and analyses the original. Acceptable?',
          'Case C: Student submits an AI-written first draft with "significant editing." Acceptable? What counts as significant?',
          'Case D: Student uses AI to verify their APA 7th citations. Acceptable? What about using AI to generate citations?',
          'Each group presents their position and criterion — not just their verdict',
        ],
        facilitatorScript: 'I want to hear your reasoning, not your conclusion. What principle did you use to reach this verdict? Would that principle work for ALL four cases?',
        materials: ['Case study cards (printed, one per group)'],
      },
      {
        time: '0:35', duration: 5, type: 'break',
        title: 'Short break',
      },
      {
        time: '0:40', duration: 20, type: 'workshop',
        title: 'Policy Audit — What Does Your Institution Actually Say?',
        description: 'Students locate and read their actual institutional AI policy, then identify what is clear and what is ambiguous.',
        steps: [
          'Locate the AI or academic integrity policy online (your specific institution)',
          'In 10 minutes: what does the policy explicitly permit? What does it explicitly prohibit? What is genuinely ambiguous?',
          'Write one scenario that the policy does NOT clearly resolve — and what you would do in that case',
        ],
        materials: ['Device access to institution website'],
        facilitatorScript: 'If your institution does not yet have a specific AI policy — which is common — what is the most relevant existing policy (plagiarism? technology use?) and what principles can you extract from it?',
      },
      {
        time: '1:00', duration: 25, type: 'process-write',
        title: 'Personal AI Ethics Policy — Final Draft',
        description: 'Students write the final version of their personal policy, now informed by case study deliberations and institutional policy research.',
        steps: [
          'Three things I will use AI for — with a principled reason',
          'Three things I will not use AI for — with a principled reason',
          'One principle that guides the boundary — phrased as a test',
          'How I will handle transparency: will I disclose AI use? When? To whom?',
        ],
        facilitatorScript: 'This policy is not for submission to your institution. It is your own intellectual commitment — the document you return to when you face an ambiguous situation. Make it honest.',
      },
    ],

    processWritingStages: [
      { icon: '⚖️', title: 'The Integrity Test', description: 'Before any AI use: "Does this use honestly represent my own intellectual engagement with the task?" Apply before, not after.', time: '1 min', prompts: ['Am I using AI to help me think — or instead of thinking?', 'Would I be comfortable disclosing this use?', 'What am I learning (or not learning) by using AI here?'] },
      { icon: '📜', title: 'What the Policy Says', description: 'Know your institution\'s policy before the situation arises. Find the specific clauses that apply to your use.', time: '5 min', prompts: ['What is explicitly permitted?', 'What is explicitly prohibited?', 'What is genuinely ambiguous — and who should I ask?'] },
      { icon: '✍️', title: 'Personal Policy Drafting', description: 'Three uses (with reasons) + three non-uses (with reasons) + one guiding principle + transparency commitment.', time: '15 min', prompts: ['What is my learning goal for each assignment?', 'Does this AI use advance or undermine that goal?', 'What would I tell my students to do in this situation?'] },
    ],

    resources: [
      { icon: '📋', name: 'Case study cards', note: 'Four scenarios, printed, one per group. Should include both clearly acceptable, clearly unacceptable, and genuinely ambiguous cases.' },
    ],

    exitTicket: {
      prompt: 'Submit your Personal AI Ethics Policy (three uses, three non-uses, one principle, transparency commitment).',
      stems: ['The principle I use to draw the line is… because…', 'The scenario I still find genuinely ambiguous is… and I would resolve it by…'],
      time: '5 minutes',
      collect: 'Policies that cite only institutional rules (without personal principles) suggest the student has not moved beyond compliance. Policies with genuine reasoning, nuance, and acknowledgement of ambiguity suggest principled practice.',
    },

    facilitatorNotes: [
      'This session requires facilitator transparency. If you use AI in your own research or preparation, say so. Model honest disclosure. If you do not, say that too. Students learn as much from the facilitator\'s practice as from the content.',
      'The ambiguous cases are the most valuable ones. Case C ("significant editing") is likely to produce genuine disagreement. Do not resolve it — map the range of positions and the principles behind them.',
    ],
  },

// ══════════════════════════════════════════════════════════════════
// PHASE 5 CONTACT SESSIONS — Units 19–20: The Future Scholar
// ══════════════════════════════════════════════════════════════════

  c19: {
    id: 'c19', type: 'contact', unit: 'u19',
    phase: 'Phase 5 — Unit 19',
    title: 'Literature Review Writing Lab — Matrix to Published Paragraph',
    subtitle: 'The session where synthesis becomes prose',
    tags: ['Literature Review', 'Thematic Integration', 'Scholarly Positioning', 'Gap Statements'],
    goal: 'Every student completes a full literature review paragraph — opening thematic claim, integrated sources, acknowledged divergence, gap statement — that is ready for inclusion in an actual academic essay. This is the module\'s capstone writing task.',

    preWork: [
      { item: 'Unit 19 Module', detail: 'Scribbr literature review video + synthesis writing reading + full paragraph attempt submitted' },
      { item: 'Completed synthesis matrix (from Unit 17)', detail: 'The matrix is the raw material. Students who have not completed it will spend the first 20 minutes doing so instead of writing.' },
      { item: 'Three verified sources', detail: 'All citations verified against Scopus. No unverified AI-generated citations permitted in this session.' },
    ],
    preWorkNote: 'Students must bring their synthesis matrix. This is a writing lab, not a research session. The research has been done — today is writing.',

    blocks: [
      {
        time: '0:00', duration: 10, type: 'activation',
        title: 'Source-by-Source → Thematic Transformation',
        description: 'Rapid transformation exercise. Students rewrite a source-by-source paragraph as a thematic synthesis.',
        steps: [
          'Project: a 100-word source-by-source paragraph (three sources, each described separately)',
          'Students have 7 minutes to transform it into a thematic synthesis',
          'Two students share their transformations',
          'Identify: where did the integration happen? What moved from separate sentences to shared sentences?',
        ],
        facilitatorScript: 'Seven minutes. This is not a final draft — it is a warm-up. The goal is to find the thematic move and make it.',
        materials: ['Projected source-by-source paragraph'],
      },
      {
        time: '0:10', duration: 40, type: 'pomodoro',
        pomMinutes: 35,
        title: 'Literature Review Paragraph — Full Draft',
        description: '35-minute Pomodoro writing block. Students write their complete literature review paragraph from their synthesis matrix.',
        steps: [
          'Step 1 (5 min): Write your thematic topic sentence — the claim that the paragraph will support',
          'Step 2 (20 min): Write the integrated body — weave your sources into the argument. Aim for at least two multi-citation sentences.',
          'Step 3 (5 min): Acknowledge divergence — where do your sources disagree, and why does that matter?',
          'Step 4 (5 min): Write your gap statement — what question does the existing literature leave open?',
        ],
        facilitatorScript: 'Use your matrix. It has the patterns. Your job now is to argue the patterns in prose. Write continuously — don\'t revise while you draft.',
        materials: ['Students\' synthesis matrices', 'Pomodoro timer', 'Writing prompt on board: full essay question related to students\' teaching subject'],
      },
      {
        time: '0:50', duration: 5, type: 'break',
        title: 'Break',
      },
      {
        time: '0:55', duration: 25, type: 'peer-feedback',
        title: 'Scholarly Positioning Review',
        description: 'Pairs evaluate each other\'s literature review paragraphs for integration quality and scholarly positioning.',
        steps: [
          'Read the paragraph. Mark every citation bracket. Count how many have 2+ sources.',
          'Underline the gap statement. Evaluate: is it specific enough to justify a research question?',
          'Write: "Your most effective synthesis moment is [quote] because…"',
          'Write: "Your scholarly position is [present/absent/partial] because…"',
          'Write one feedforward: the single most important revision',
        ],
      },
      {
        time: '1:20', duration: 10, type: 'process-write',
        title: 'Targeted Revision',
        description: 'Students revise specifically the element their feedback identified as weakest.',
      },
    ],

    processWritingStages: [
      { icon: '🎯', title: 'Thematic Topic Sentence', description: 'State the pattern the literature establishes. Not "researchers have studied X" but "Evidence consistently shows [pattern], though [qualification]."', time: '5 min', prompts: ['What do my three sources collectively establish?', 'What is the strongest pattern in my matrix?', 'Can I state a position in one sentence?'] },
      { icon: '🔀', title: 'Integration Moves', description: 'Aim for 2+ citations in the same sentence or clause. Integration means the ideas appear in the same argument, not in separate sentences.', time: '15 min', prompts: ['Can I write "(Smith, 2020; Jones, 2021)" in the same sentence?', 'Where do two sources make the same point from different angles?', 'Where do sources converge enough to cite together?'] },
      { icon: '⚡', title: 'Divergence Acknowledgement', description: 'Name the disagreement explicitly. "However, X argues… while Y and Z find…" This is scholarly sophistication, not weakness.', time: '5 min', prompts: ['Where do my sources not fully agree?', 'Is the disagreement methodological, theoretical, or empirical?', 'Does naming the disagreement strengthen or weaken my paragraph?'] },
      { icon: '🕳️', title: 'Gap Statement', description: 'The final sentence: what question does the existing literature leave open? This is the justification for your essay argument or research question.', time: '5 min', prompts: ['What context, population, or question has not been addressed?', 'What methodological limitation means the finding cannot be applied to my context?', 'What does "Despite extensive research on X, no study has examined Y" look like in my paragraph?'], aiPrompt: 'You are a literature review writing coach at postgraduate level. Evaluate this student\'s literature review paragraph against four criteria: (1) Thematic opening — does it open with a claim about the literature or a description of who studied what? Quote the opening sentence and evaluate. (2) Integration — how many sentences contain 2+ citations? Is this enough? (3) Divergence acknowledgement — is there a specific point of disagreement or nuance named? (4) Gap statement — is it specific enough to justify a research question, or too vague? For each: verdict + specific revision instruction.' },
    ],

    resources: [
      { icon: '📋', name: 'Synthesis matrix (from Unit 17)', note: 'Students bring their own. This is the required pre-work. Without it, the session is significantly less effective.' },
    ],

    exitTicket: {
      prompt: 'Submit your complete literature review paragraph with: thematic topic sentence highlighted, all integration moments underlined, gap statement in bold.',
      stems: ['The gap I identified is… This matters because…', 'The strongest integration moment in my paragraph is…'],
      time: '5 minutes',
      collect: 'This is the module\'s most important piece of formative writing. Use it to identify students who are still summarising vs those who are genuinely synthesising. Both groups need different kinds of support for their assessed literature review.',
    },

    facilitatorNotes: [
      'Some students will find the thematic topic sentence the hardest part. They know what each paper says but cannot articulate the pattern. Help them by asking: "Forget the individual papers. What do I now know about this field that I did not know before? Write that as a sentence."',
      'The gap statement often feels like criticism of the sources. Reframe: "You are not criticising the researchers. You are positioning your own question within a field. The gap is not a failure of the literature — it is an opportunity for your essay."',
    ],
  },

  c20: {
    id: 'c20', type: 'contact', unit: 'u20',
    phase: 'Phase 5 — Unit 20',
    title: 'Module Synthesis — Who Have You Become?',
    subtitle: 'Reflective practice, scholarly commitments, and handing each other forward',
    tags: ['Reflective Practice', 'Academic Identity', 'Mission Statement', 'Module Closing'],
    goal: 'Students complete the module with a genuine, honest reflection on their development as readers and writers — and leave with three specific intellectual commitments they have made publicly in front of peers.',

    preWork: [
      { item: 'Unit 20 Module', detail: 'Briceño TED talk + reflective practice reading + Academic Mission Statement first attempt submitted' },
      { item: 'Any piece of your own writing from this module', detail: 'Week 1 or 2 writing — your first submission. This is the "before" you will compare to your current writing.' },
    ],
    preWorkNote: 'Students should physically bring their earliest module writing. The comparison between Week 1 and Week 20 writing is the most powerful reflection tool available.',

    blocks: [
      {
        time: '0:00', duration: 15, type: 'activation',
        title: 'Before and After — The Comparison',
        description: 'Students compare their Week 1–2 writing to a recent piece. Structured annotation exercise.',
        steps: [
          'Lay early writing next to recent writing',
          'Annotate the early writing: circle three things you would do differently now',
          'Write one sentence: "The most significant change in my academic writing between Week 1 and now is…"',
          'Optional share: two students volunteer their comparison. Class responds — do they see the growth described?',
        ],
        facilitatorScript: 'Be honest. If you don\'t see growth, name that too — what held back the development? That is equally valuable data.',
      },
      {
        time: '0:15', duration: 20, type: 'discussion',
        title: 'Learning Zone Mapping',
        description: 'Students map their experience of learning vs performance zones across the module.',
        steps: [
          'On a blank page: draw a timeline of the module. Mark moments of genuine discomfort (learning zone) vs moments of confident execution (performance zone)',
          'Pair discussion: where did you spend the most time? Where did you grow most?',
          'Key question: which sessions put you most clearly in the learning zone? What made them feel that way?',
        ],
        facilitatorScript: 'The learning zone moments are the growth moments — even if they felt unpleasant at the time. Your map is a map of your development, not your performance.',
      },
      {
        time: '0:35', duration: 30, type: 'process-write',
        title: 'Academic Mission Statement — Final Version',
        description: 'Pomodoro block for final Mission Statement writing, then small-group sharing.',
        steps: [
          'Pomodoro 25 min: Write your final Academic Mission Statement — 300–350 words',
          'Required elements: one growth moment (specific), your current academic identity (honest), three intellectual commitments for next year (concrete and actionable)',
          '5 min: Form groups of 3 and read statements aloud',
          'Each person receives one observation from each group member: "This commitment sounds concrete enough to keep" or "This commitment is too vague to act on"',
        ],
        facilitatorScript: 'The three commitments are the part that matters most. Not "read more" but: when, what, how, with what specific practice. Vague commitments don\'t survive Week 2 of next semester.',
        materials: ['Pomodoro timer'],
      },
      {
        time: '1:05', duration: 5, type: 'break',
        title: 'Break',
      },
      {
        time: '1:10', duration: 20, type: 'discussion',
        title: 'Handing Each Other Forward',
        description: 'Module closing ritual: each student shares one thing they want the next cohort to know.',
        steps: [
          'Prompt: "What one piece of advice would you give to a student starting this module next year?"',
          'Each student writes their advice on an index card',
          'Selected cards are read aloud',
          'Facilitator collects — these become orientation material for next year\'s cohort',
        ],
        facilitatorScript: 'You are now the people who have done this. What did you know at the end that you wish you had known at the start?',
        materials: ['Index cards', 'Pens'],
      },
    ],

    processWritingStages: [
      { icon: '🔙', title: 'Growth Reflection', description: 'Look back specifically — a moment, a piece of writing, a skill. Be concrete about what changed.', time: '5 min', prompts: ['What could I not do in Week 1 that I can do now?', 'When did the hardest skill start to feel possible?', 'What still feels difficult — and why?'] },
      { icon: '🪞', title: 'Identity Statement', description: 'Who are you now as a scholar? Not who you aspire to be — who you are.', time: '5 min', prompts: ['What aspect of academic work feels like mine now?', 'What still feels foreign?', 'How do I describe myself as a student/scholar now?'] },
      { icon: '🎯', title: 'Three Commitments', description: 'Specific, actionable, testable. Each commitment names a skill, a frequency, and a context.', time: '10 min', prompts: ['Not: "I will read more." But: "I will apply the three-pass method to every required reading before my tutorial."', 'Not: "I will write better." But: "I will submit PEEL paragraph drafts 48 hours before deadlines to allow time for revision."'] },
      { icon: '📜', title: 'Transparency Commitment', description: 'How will you handle AI use, peer feedback, and academic honesty in your next year? State it explicitly.', time: '5 min', prompts: ['What is my AI use principle?', 'When will I seek peer feedback?', 'How will I respond to critical feedback on my writing?'] },
    ],

    resources: [
      { icon: '📄', name: 'Index cards', note: 'For the "handing forward" ritual. Keep the anonymised cards for next year\'s orientation.' },
    ],

    exitTicket: {
      prompt: 'Submit your final Academic Mission Statement with your three commitments clearly formatted and numbered.',
      stems: ['My three intellectual commitments for next year are:', 'The skill I am most committed to developing is…'],
      time: '5 minutes',
      collect: 'The three commitments are the exit data. Sort into: specific + actionable / vague but meaningful / purely aspirational. Students in the third category need a brief follow-up conversation to help them specify.',
    },

    facilitatorNotes: [
      'The "before and after" comparison is the most reliably powerful moment in this session. Some students are genuinely moved by seeing their own growth. Some are confronted by how little they grew. Both responses are valuable.',
      'The "handing forward" ritual has two purposes: it asks students to articulate their learning (metacognitive), and it creates a legacy — they contributed something to next year\'s students. This matters more than it appears to.',
    ],
  },

// ══════════════════════════════════════════════════════════════════
// PHASE 3 TUTORIAL SESSIONS — Units 10–15: Academic Communication
// ══════════════════════════════════════════════════════════════════

  t10: {
    id: 't10', type: 'tutorial', unit: 'u10',
    phase: 'Phase 3 — Unit 10',
    title: 'Three-Pass Practice + Abstract Clinic',
    subtitle: 'Applying the method to real sources students have already found',
    tags: ['Three-Pass Method', 'Diagnostic', 'Abstract Analysis', 'Reading Strategies'],
    goal: 'Students apply the three-pass method to an abstract from their own research and receive feedback on the quality of their Pass Three analytical position.',

    preWork: [
      { item: 'Unit 10 Module', detail: 'Full completion + writing response' },
      { item: 'Contact Session 10 work', detail: 'Pass Three sentence from C10 exit ticket' },
    ],

    blocks: [
      {
        time: '0:00', duration: 8, type: 'diagnostic',
        title: 'Reading Level Diagnostic',
        description: 'Tutor administers a 5-minute diagnostic: students apply Pass One to a new abstract and write their Pass One result.',
        steps: [
          'Provide a fresh abstract (not one seen before)',
          'Students have 5 minutes: apply Pass One, write a one-sentence summary + Yes/No/Maybe decision',
          'Tutor scans results: who is still writing summaries at Pass Two depth?',
        ],
        facilitatorScript: 'Five minutes. No discussion. Just Pass One — orientation only.',
      },
      {
        time: '0:08', duration: 20, type: 'workshop',
        title: 'Pass Three Deepening',
        description: 'Students apply Pass Three to an abstract of their own choosing. Tutor provides individual coaching.',
        steps: [
          'Students choose one abstract from their research collection',
          'Apply Pass Three in writing: 4–6 sentences identifying an assumption, a methodological limitation, or a contextual gap',
          'Tutor circulates: coach students who are writing descriptive Pass Two responses to find the critical move',
        ],
      },
      {
        time: '0:28', duration: 12, type: 'peer-feedback',
        title: 'Pass Three Peer Challenge',
        description: 'Pairs read each other\'s Pass Three responses and ask the most probing question they can.',
        steps: [
          'Read partner\'s Pass Three sentence',
          'Ask one of: "What specifically in the text makes you say that?" or "What would the author say in defence?"',
          'Switch. Defend your position with evidence from the abstract.',
        ],
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Exit Ticket',
        description: 'One sentence: what changed about your Pass Three position after the peer challenge?',
      },
    ],

    processWritingStages: [
      { icon: '🔬', title: 'Pass Three Position', description: 'Write your analytical position: what assumption, limitation, or contextual gap did you identify?', time: '5 min', prompts: ['What does the methodology not allow this paper to claim?', 'What assumption underlies the argument?'] },
    ],

    exitTicket: {
      prompt: 'Submit your Pass Three analytical position sentence (4–6 sentences) + one sentence about how the peer challenge changed or strengthened it.',
      stems: ['This paper cannot claim… because…', 'The peer challenge made me realise…'],
      time: '5 minutes',
      collect: 'Flag students who cannot move beyond description to critique — they need individual reading coaching before Assessment 4.',
    },
  },

  t11: {
    id: 't11', type: 'tutorial', unit: 'u11',
    phase: 'Phase 3 — Unit 11',
    title: 'Note System Trial + First Synthesis',
    subtitle: 'Cornell applied to real content, then the synthesis move modelled and practised',
    tags: ['Cornell Notes', 'Synthesis', 'Active Recall', 'Micro-Write'],
    goal: 'Students have tried the Cornell system on real content and successfully completed one two-sentence synthesis connecting two module sources.',

    preWork: [
      { item: 'Unit 11 Module', detail: 'Full completion + Cornell practice from C11' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'activation',
        title: 'Active Recall Test',
        description: 'Students cover the right column of their C11 Cornell notes and test their recall from the cue column alone.',
        facilitatorScript: 'Cover everything except the left column. Can you recall the ideas from the cues alone? This is the purpose of the cue column.',
      },
      {
        time: '0:05', duration: 20, type: 'workshop',
        title: 'Cornell + Synthesis Practice',
        description: 'Students create new Cornell notes on a short assigned reading, then complete the synthesis step.',
        steps: [
          'Read: short passage (400 words) — provided by tutor',
          'Cornell notes: right column during reading, cue column after, 2-sentence summary',
          'Synthesis: connect this reading to any previous module reading in 2 sentences',
        ],
      },
      {
        time: '0:25', duration: 10, type: 'discussion',
        title: 'Synthesis Sharing',
        description: 'Three students share their synthesis sentences. Group evaluates: conceptual connection or surface similarity?',
      },
      {
        time: '0:35', duration: 10, type: 'process-write',
        title: 'Exit Micro-Write',
        description: 'Students write 3 sentences: what the two readings collectively establish, where they differ, and why that difference matters.',
      },
    ],

    exitTicket: {
      prompt: 'Submit Cornell notes page + 3-sentence micro-synthesis.',
      stems: ['Both readings argue…', 'However, they differ in…', 'This difference matters because…'],
      time: '5 minutes',
      collect: 'The micro-synthesis quality predicts literature review paragraph quality. Save these — they are baseline data for Assessment 4 coaching.',
    },
  },

  t12: {
    id: 't12', type: 'tutorial', unit: 'u12',
    phase: 'Phase 3 — Unit 12',
    title: 'PEEL Clinic — Targeted Explanation Revision',
    subtitle: 'The hardest PEEL element gets the most focused attention',
    tags: ['PEEL', 'Analytical Explanation', 'Peer Feedback', 'Targeted Revision'],
    goal: 'Every student has a revised PEEL paragraph where the Explanation element has been specifically strengthened based on criterion-referenced feedback.',

    preWork: [
      { item: 'Unit 12 + C12', detail: 'PEEL paragraph written and peer-reviewed in C12. Bring the feedback you received.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 8, type: 'mini-lesson',
        title: 'Explanation Anatomy',
        description: 'Tutor shows three Explanation sentences — weak, adequate, strong. Students identify what makes each one.',
        facilitatorScript: 'The weak one just says "this is important." The adequate one says "this shows that X." The strong one says "this challenges the assumption that Y, because Z." Which move makes it strong?',
      },
      {
        time: '0:08', duration: 22, type: 'workshop',
        title: 'Explanation Rewrite',
        description: 'Students rewrite only their Explanation sentence using the peer feedback from C12.',
        steps: [
          'Read your C12 peer feedback on the Explanation element',
          'Rewrite the Explanation sentence — not the whole paragraph',
          'Try two different versions. Keep the stronger one.',
        ],
      },
      {
        time: '0:30', duration: 10, type: 'peer-feedback',
        title: 'Explanation Exchange',
        description: 'Pairs share only their revised Explanation sentences. Partner asks: "What assumption does this challenge? What does this reveal that was not visible before?"',
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Exit',
        description: 'Submit: original Explanation + revised Explanation + one sentence explaining the change.',
      },
    ],

    exitTicket: {
      prompt: 'Before and after: original Explanation sentence, revised Explanation sentence, one sentence explaining what you changed and why.',
      stems: ['I changed the Explanation because the original only…', 'The revised version is stronger because it…'],
      time: '5 minutes',
      collect: 'Compare before/after. Students who changed word order without changing analytical content need individual coaching on what "analytical move" means.',
    },
  },

  t13: {
    id: 't13', type: 'tutorial', unit: 'u13',
    phase: 'Phase 3 — Unit 13',
    title: 'Register Revision Clinic',
    subtitle: 'Taking real student writing through the transformation process',
    tags: ['Academic Register', 'Hedging', 'Sentence Revision', 'Artefact Workshop'],
    goal: 'Students systematically transform one paragraph of their own writing from informal to academic register, with attention to hedging, attribution, and precision.',

    preWork: [
      { item: 'Unit 13 + C13', detail: 'Register transformation from C13. Bring the version you submitted.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'activation',
        title: 'Spot the Register',
        description: 'Tutor reads two sentences: one informal, one academic (same content). Students identify which is which and explain why.',
      },
      {
        time: '0:05', duration: 25, type: 'workshop',
        title: 'Full Paragraph Transformation',
        description: 'Students transform a full paragraph (either their own writing or a supplied informal paragraph) systematically.',
        steps: [
          'Annotate first: mark every informal feature (contraction, intensifier, unsupported claim, first person)',
          'Transform sentence by sentence — not word substitution, sentence reconstruction',
          'Add hedging where needed. Add attribution where a claim requires support.',
        ],
      },
      {
        time: '0:30', duration: 10, type: 'peer-feedback',
        title: 'Register Audit',
        description: 'Partner reads the transformed paragraph and marks any remaining informal features.',
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Reflection',
        description: 'One paragraph: which transformation was hardest and why.',
      },
    ],

    exitTicket: {
      prompt: 'Submit your annotated informal original + transformed academic version.',
      stems: ['The hardest transformation was… because…', 'I added hedging to [claim] because…'],
      time: '5 minutes',
      collect: 'Check that transformations are structural (sentence reconstruction) not cosmetic (synonym swapping). The test: if you re-read the transformed version without the original, does it function as academic prose?',
    },
  },

  t14: {
    id: 't14', type: 'tutorial', unit: 'u14',
    phase: 'Phase 3 — Unit 14',
    title: 'Visual Analysis Artefact Workshop',
    subtitle: 'Students produce a structured written analysis of a data visual — ready for assessment',
    tags: ['Visual Literacy', 'Four-Question Protocol', 'Academic Prose', 'Artefact'],
    goal: 'Students complete a polished written visual analysis (150–200 words) of a real SA education data visual — applying all four questions in academic prose.',

    preWork: [
      { item: 'Unit 14 + C14', detail: 'Visual analysis from C14 exit ticket. Bring the visual you analysed.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Quick Protocol Recall',
        description: 'Without looking at notes: what are the four analytical questions? Students write them from memory.',
      },
      {
        time: '0:05', duration: 20, type: 'workshop',
        title: 'Written Analysis Drafting',
        description: 'Students convert their C14 four-question analysis into a flowing academic paragraph.',
        steps: [
          'Read the four-question notes from C14',
          'Write a 150–200 word academic paragraph — not a list, but integrated prose',
          'The paragraph must: describe the visual\'s argument, evaluate the scale/baseline, question the source, identify what is outside the frame',
        ],
      },
      {
        time: '0:25', duration: 15, type: 'peer-feedback',
        title: 'Protocol Completeness Check',
        description: 'Partner checks that all four questions are present and answered specifically.',
      },
      {
        time: '0:40', duration: 5, type: 'revision',
        title: 'Revision Based on Feedback',
      },
    ],

    exitTicket: {
      prompt: 'Submit final 150–200 word written visual analysis — all four questions addressed in academic prose.',
      stems: ['This visual argues [X] by…', 'However, the most important thing missing from the frame is…'],
      time: '5 minutes',
      collect: 'Assess whether students have moved from listing answers to the four questions to integrating them into a coherent argument. Integration is the diagnostic — lists suggest mechanical compliance; prose suggests analytical thinking.',
    },
  },

  t15: {
    id: 't15', type: 'tutorial', unit: 'u15',
    phase: 'Phase 3 — Unit 15',
    title: 'Assessment 5 Peer Review Workshop',
    subtitle: 'Applying the peer review protocol to real Assessment 5 draft work',
    tags: ['Assessment 5', 'Peer Review', 'Genre Translation', 'Feedforward'],
    goal: 'Students apply the full four-part peer review protocol to a draft of Assessment 5 (Genre Translation Studio) — giving criterion-referenced feedback that their partner can act on immediately.',

    preWork: [
      { item: 'Assessment 5 draft', detail: 'Any draft version — even rough. This session is for feedback, not polishing.' },
      { item: 'Assessment 5 criteria', detail: 'Bring the rubric. Feedback must be criterion-referenced.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'activation',
        title: 'Criteria Refresh',
        description: 'Students re-read the Assessment 5 criteria in silence. Two minutes. Then: what is the most important criterion?',
      },
      {
        time: '0:05', duration: 30, type: 'peer-feedback',
        title: 'Full Peer Review — Assessment 5 Draft',
        description: 'Pairs apply the four-part protocol to Assessment 5 drafts. Written feedback only.',
        steps: [
          'Read once straight through without marking',
          'Apply four-part protocol: what works (specific, criterion-referenced) / the single most important gap / what improvement looks like / feedforward',
          'Write minimum 5 sentences of feedback',
          'Return work. Read feedback received.',
        ],
      },
      {
        time: '0:35', duration: 8, type: 'workshop',
        title: 'Feedback-Driven Revision',
        description: 'Students make one specific revision based on the most actionable feedback.',
      },
      {
        time: '0:43', duration: 2, type: 'process-write',
        title: 'Exit',
        description: 'One sentence: what will you change in the full assessment based on today?',
      },
    ],

    exitTicket: {
      prompt: 'Submit the feedback you gave + one sentence about the revision you\'ll make to your own assessment.',
      stems: ['Based on my peer\'s feedback, I will change…', 'The most useful feedback I received was…'],
      time: '5 minutes',
      collect: 'Both directions matter: feedback quality given (criterion-referenced?) and responsiveness to feedback received (substantive or cosmetic revision planned?).',
    },
  },

// ══════════════════════════════════════════════════════════════════
// PHASE 4 TUTORIAL SESSIONS — Units 16–18: AI as a Scholarly Tool
// ══════════════════════════════════════════════════════════════════

  t16: {
    id: 't16', type: 'tutorial', unit: 'u16',
    phase: 'Phase 4 — Unit 16',
    title: 'Prompt Engineering Practice — Real Tasks, Real Outputs',
    subtitle: 'Build, test, and verify three academic AI prompts',
    tags: ['CREATE Framework', 'Prompt Testing', 'Citation Verification', 'AI Literacy'],
    goal: 'Students build and test CREATE-structured prompts for real academic tasks and verify at least one AI output against independent sources.',

    preWork: [
      { item: 'Unit 16 + C16', detail: 'CREATE framework + prompts built in C16. Bring your best prompt from the session.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'activation',
        title: 'Best Prompt Share',
        description: 'Three students share their best CREATE prompt from C16. Group evaluates: which element is strongest?',
      },
      {
        time: '0:05', duration: 20, type: 'workshop',
        title: 'Prompt Refinement + New Task',
        description: 'Students refine their C16 prompt based on observations, then build a new prompt for a different task.',
        steps: [
          'Refine your best prompt from C16: improve the Examples element specifically',
          'Test the refined prompt. Compare to original: better? Worse? Why?',
          'New task (10 min): build a CREATE prompt for getting help structuring a literature review paragraph',
        ],
      },
      {
        time: '0:25', duration: 10, type: 'workshop',
        title: 'Verification Practice',
        description: 'Students verify two specific claims from today\'s AI outputs against independent sources.',
      },
      {
        time: '0:35', duration: 10, type: 'discussion',
        title: 'What Could Not Be Verified?',
        description: 'Brief whole-tutorial discussion: what outputs were hardest to verify? What does that mean for how you use them?',
      },
      {
        time: '0:45', duration: 0, type: 'process-write',
        title: 'Exit',
        description: 'Submit: best CREATE prompt (with all 6 elements labelled) + verification result.',
      },
    ],

    exitTicket: {
      prompt: 'Submit your best CREATE prompt + one verification result (what you verified and what you found).',
      stems: ['The most important verification I did was…', 'I discovered [claim/citation] was [accurate / hallucinated] when I checked because…'],
      time: '5 minutes',
      collect: 'Verification results are the key diagnostic. Flag students who did not find any errors — they likely did not check rigorously.',
    },
  },

  t17: {
    id: 't17', type: 'tutorial', unit: 'u17',
    phase: 'Phase 4 — Unit 17',
    title: 'Synthesis Matrix Deep Dive',
    subtitle: 'Completing the matrix, finding the patterns, writing the paragraph',
    tags: ['Synthesis Matrix', 'Thematic Paragraph', 'Gap Statement', 'Literature Review'],
    goal: 'Students complete a full synthesis matrix and write a thematic paragraph using it — the foundational skill for Assessment 6 and all future literature reviews.',

    preWork: [
      { item: 'Unit 17 + C17', detail: 'Synthesis matrix from C17. Three sources verified in Scopus.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Matrix Check',
        description: 'Tutor checks matrices are complete. Students with incomplete matrices spend first 10 minutes completing them.',
      },
      {
        time: '0:05', duration: 15, type: 'workshop',
        title: 'Pattern Identification',
        description: 'Students identify patterns in their completed matrix — convergence, divergence, gaps — and write a 2-sentence analysis of each.',
      },
      {
        time: '0:20', duration: 15, type: 'workshop',
        title: 'Thematic Paragraph Draft',
        description: 'Students write a full thematic paragraph from their matrix patterns.',
        facilitatorScript: 'The matrix told you what the patterns are. The paragraph argues those patterns. Start with: "Evidence on [topic] suggests [pattern], though [qualification]."',
      },
      {
        time: '0:35', duration: 8, type: 'peer-feedback',
        title: 'Integration Check',
        description: 'Partner marks every multi-citation bracket in the paragraph. Count: how many sources appear together?',
      },
      {
        time: '0:43', duration: 2, type: 'process-write',
        title: 'Gap Statement',
        description: 'Write one gap statement for your topic.',
      },
    ],

    exitTicket: {
      prompt: 'Submit: completed matrix + thematic paragraph + gap statement.',
      stems: ['The strongest pattern across my sources is…', 'Despite this research, no study has examined…'],
      time: '5 minutes',
      collect: 'Count integration moments in the paragraph. Zero: still summarising. 1–2: emerging synthesis. 3+: genuine thematic writing. This predicts Assessment 6 quality.',
    },
  },

  t18: {
    id: 't18', type: 'tutorial', unit: 'u18',
    phase: 'Phase 4 — Unit 18',
    title: 'AI Ethics Policy — Finalisation and Peer Challenge',
    subtitle: 'Testing your policy against edge cases — does it hold?',
    tags: ['Academic Integrity', 'AI Ethics', 'Policy Writing', 'Assessment 6 Prep'],
    goal: 'Students have a finalised, reasoned Personal AI Ethics Policy that has been tested against peer challenge and edge cases — and a clear plan for Assessment 6.',

    preWork: [
      { item: 'Unit 18 + C18', detail: 'Personal AI Ethics Policy draft from C18.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 10, type: 'workshop',
        title: 'Policy Revision',
        description: 'Students revise their C18 policy based on case study discussions and peer feedback.',
      },
      {
        time: '0:10', duration: 20, type: 'peer-feedback',
        title: 'Edge Case Challenge',
        description: 'Pairs challenge each other\'s policies with edge cases: scenarios the policy may not clearly address.',
        steps: [
          'Read partner\'s policy',
          'Design one edge case scenario the policy does not clearly resolve',
          'Present the scenario. Partner must apply their principle to decide',
          'Does the principle hold? Does the policy need revision?',
        ],
      },
      {
        time: '0:30', duration: 10, type: 'workshop',
        title: 'Assessment 6 Prep',
        description: 'Brief introduction to Assessment 6 (AI Ethics Tribunal). What does the AI ethics policy contribute to the assessment?',
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Policy Finalisation',
        description: 'Students make any final revisions based on the edge case challenge.',
      },
    ],

    exitTicket: {
      prompt: 'Submit final Personal AI Ethics Policy.',
      stems: ['The edge case that challenged my policy most was…', 'I resolved it by applying the principle that…'],
      time: '5 minutes',
      collect: 'Policies that survived edge case challenge without revision suggest the principle is robust. Policies that required significant revision suggest the student is still working through the reasoning — which is good progress, not a failure.',
    },
  },

// ══════════════════════════════════════════════════════════════════
// PHASE 5 TUTORIAL SESSIONS — Units 19–20: The Future Scholar
// ══════════════════════════════════════════════════════════════════

  t19: {
    id: 't19', type: 'tutorial', unit: 'u19',
    phase: 'Phase 5 — Unit 19',
    title: 'Literature Review Section Workshop',
    subtitle: 'Peer-reviewing and refining the literature review paragraph for assessment',
    tags: ['Literature Review', 'Peer Review', 'Scholarly Positioning', 'Assessment Prep'],
    goal: 'Students have a refined, peer-reviewed literature review paragraph that is ready for assessment submission — with strong thematic opening, integration, acknowledged divergence, and a specific gap statement.',

    preWork: [
      { item: 'Unit 19 + C19', detail: 'Literature review paragraph from C19. Bring it — this is the focus of the session.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 5, type: 'diagnostic',
        title: 'Integration Count',
        description: 'Students count the number of multi-citation brackets in their own paragraph. Report. Tutor records on board.',
        facilitatorScript: 'Zero is fine — we are going to address that. This is diagnostic, not judgement.',
      },
      {
        time: '0:05', duration: 15, type: 'peer-feedback',
        title: 'Full Literature Review Peer Review',
        description: 'Pairs apply specific literature review criteria to each other\'s paragraphs.',
        steps: [
          'Criterion 1: Is the opening sentence a thematic claim (not a description of who studied what)?',
          'Criterion 2: Are there 2+ multi-citation sentences?',
          'Criterion 3: Is there a specific point of divergence named?',
          'Criterion 4: Is the gap statement specific enough to justify a research question?',
          'Write: one strength per criterion + one feedforward',
        ],
      },
      {
        time: '0:20', duration: 20, type: 'revision',
        title: 'Targeted Revision',
        description: 'Students revise the element their feedback identified as weakest.',
        facilitatorScript: 'Most students will need to work on either the thematic opening or the gap statement. Choose the one your peer identified and rewrite it specifically.',
      },
      {
        time: '0:40', duration: 5, type: 'process-write',
        title: 'Exit',
        description: 'Submit revised paragraph.',
      },
    ],

    exitTicket: {
      prompt: 'Submit revised literature review paragraph with: (1) thematic opening underlined, (2) integration moments highlighted, (3) gap statement bolded.',
      stems: ['I revised the [element] because…', 'My gap statement now reads…'],
      time: '5 minutes',
      collect: 'This is the highest-stakes exit ticket in the module — it is likely close to assessment submission. Flag any student whose gap statement is still vague or whose paragraph is still source-by-source. They need targeted support.',
    },
  },

  t20: {
    id: 't20', type: 'tutorial', unit: 'u20',
    phase: 'Phase 5 — Unit 20',
    title: 'Mission Statement + Module Celebration',
    subtitle: 'Finalising commitments, celebrating growth, handing forward',
    tags: ['Academic Mission Statement', 'Reflection', 'Module Closure', 'Celebration'],
    goal: 'Students leave the module with a finalised Academic Mission Statement that represents honest self-reflection and three specific, actionable intellectual commitments — and with a sense of accomplished completion.',

    preWork: [
      { item: 'Unit 20 + C20', detail: 'Academic Mission Statement draft from C20.' },
    ],

    blocks: [
      {
        time: '0:00', duration: 8, type: 'workshop',
        title: 'Mission Statement Revision',
        description: 'Students revise their C20 Mission Statement based on peer feedback received in the contact session.',
        facilitatorScript: 'The three commitments need to pass the specificity test: if a stranger read them, could they tell what you will actually DO differently next semester? If not, revise.',
      },
      {
        time: '0:08', duration: 15, type: 'peer-feedback',
        title: 'Commitment Specificity Check',
        description: 'Pairs read each other\'s three commitments. Partner evaluates: specific + actionable / meaningful but vague / purely aspirational.',
        steps: [
          'Read each commitment',
          'Rate: specific + actionable (can act on immediately) / meaningful but vague (needs when/how) / aspirational (cannot be acted on)',
          'For any non-specific commitment: suggest one specific revision',
        ],
      },
      {
        time: '0:23', duration: 12, type: 'workshop',
        title: 'Final Revision',
        description: 'Students make final revisions based on peer feedback.',
      },
      {
        time: '0:35', duration: 7, type: 'discussion',
        title: 'Module Celebration',
        description: 'Each student says one sentence about what they are taking from the module.',
        facilitatorScript: 'One sentence. Not a performance. The most honest sentence you can write about what this semester meant.',
      },
      {
        time: '0:42', duration: 3, type: 'process-write',
        title: 'Final Submission',
        description: 'Submit final Academic Mission Statement.',
      },
    ],

    exitTicket: {
      prompt: 'Submit your final Academic Mission Statement.',
      stems: ['My three commitments for next year are:', 'The most important thing I am taking from this module is…'],
      time: '3 minutes',
      collect: 'Keep all Mission Statements. With permission, use anonymised extracts in next year\'s orientation session. The "handing forward" tradition strengthens module culture over time.',
    },
  }

});
