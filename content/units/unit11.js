// content/units/unit11.js — Note-Taking for Thinking
// Phase 3 | Academic Entry Level 2

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
export const VIDEO_KEY = 'unit11';

const RT_U11 = {
  id: 'rt-u11', unitId: 'u11', unitNum: 11,
  title: 'Notes That Think — Moving Beyond Transcription',
  level: 'Academic Entry Level 2', wordTarget: 180,
  source: 'Adapted for Academic Literacies — informed by Ahrens, S. (2017). How to take smart notes. CreateSpace; Vygotsky, L.S. (1978). Mind in society. Harvard University Press.',
  sourceUrl: null,
  vocab: [
    { term: 'Atomic note', definition: 'A note that contains exactly one idea, expressed in your own words, complete enough to understand without re-reading the source. The building block of the Zettelkasten system.', example: 'Instead of "Vygotsky — ZPD", an atomic note says: "Vygotsky\'s Zone of Proximal Development (1978) is the space between what a learner can do alone and what they can do with support. This is where teaching should target — not too easy, not too hard."' },
    { term: 'Synthesis', definition: 'The intellectual process of identifying patterns, tensions, and connections across multiple sources — and combining them into a new, coherent argument of your own. Synthesis is the highest-level academic writing skill.', example: 'Saying "Both Freire and Vygotsky emphasise the social dimension of learning, but they differ on the source of oppression that schooling must overcome" is synthesis.' },
    { term: 'Zettelkasten', definition: 'A personal knowledge management system (German: "slip box") where each note contains one idea and is linked to related notes. Used by philosopher Niklas Luhmann, who published over 70 books using the system.', example: 'A note on "Zone of Proximal Development" links to notes on "scaffolding," "collaborative learning," and "inclusive classroom design."' },
    { term: 'Transcription trap', definition: 'The common student mistake of copying what a source says word-for-word into notes, which creates records of information but prevents the active processing that produces genuine understanding and original thinking.', example: 'Copying an entire paragraph from a journal article into your notes feels productive but produces the same cognitive outcome as not reading it at all.' },
  ],
  text: `
    <h3>Notes That Think — Moving Beyond Transcription</h3>

    <p>Most students take notes the same way: they write down what the source says. They may paraphrase slightly, or highlight key sentences, or use bullet points instead of prose — but the fundamental activity is transcription: moving information from the source into a notebook or document.</p>

    <p>Transcription feels productive. It creates a tangible record. It can fill pages in an hour. But it does almost nothing to advance your understanding or generate original thinking. Research on learning consistently shows that the act of writing something down without processing it through your own cognition produces very little long-term retention and essentially no new ideas.</p>

    <p>Notes that generate thinking look different. They contain your response to what you have read, not a copy of it. They connect the new idea to something you already know. They ask a question the source has not answered. They notice a contradiction between this source and something you read last week. They begin to form the skeleton of an argument.</p>

    <p>The <strong>Zettelkasten method</strong>, developed by sociologist Niklas Luhmann, operationalises this. Every note is "atomic" — it contains one idea, completely expressed, in your own words. Every note is linked to other notes — not by topic tags, but by explicit connections: "This relates to X because..." or "This contradicts Y in that..." Over time, the links between notes become the structure of your thinking, and writing essays becomes a matter of following and articulating the connections you have already made.</p>

    <p>You do not need to use Luhmann's physical card system. Digital tools like Obsidian, Notion, or even a well-organised Word document can implement the same principles. The tool is secondary. The discipline — one idea per note, in your own words, connected to other ideas — is what matters.</p>

    <p>For education researchers, this approach has a particular advantage: your field draws on multiple disciplines — psychology, sociology, linguistics, philosophy, policy studies. Notes that connect across these disciplines are how you develop the kind of integrated, multi-perspective argument that distinguishes excellent education scholarship from disciplinary tunnel vision.</p>
  `,
  visual: `
    <div class="rt-infographic">
      <div class="rt-infographic-title">Transcription Notes vs. Thinking Notes</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:16px;">
        <div style="background:#fee2e2; border:1px solid #fca5a5; border-radius:10px; padding:20px;">
          <div style="font-weight:700; color:#b91c1c; margin-bottom:12px;">❌ Transcription Note</div>
          <div style="font-size:13px; background:#fff8f8; border-radius:8px; padding:12px; font-family:'DM Mono',monospace; line-height:1.7; color:#374151;">
            <em>Vygotsky (1978):</em><br>
            "Every function in the child's cultural development appears twice: first, on the social level, and later on the individual level; first between people (interpsychological) and then inside the child (intrapsychological)."
          </div>
          <div style="font-size:12px; color:#b91c1c; margin-top:10px;">You have copied the quote. You have not thought about it.</div>
        </div>
        <div style="background:#dcfce7; border:1px solid #86efac; border-radius:10px; padding:20px;">
          <div style="font-weight:700; color:#15803d; margin-bottom:12px;">✅ Thinking Note (Atomic)</div>
          <div style="font-size:13px; background:#f0fdf4; border-radius:8px; padding:12px; font-family:'DM Mono',monospace; line-height:1.7; color:#374151;">
            <em>Vygotsky — social origin of thought (1978)</em><br><br>
            All higher thinking starts as social interaction — between teacher and learner, or between peers — before it becomes internal thought.<br><br>
            → Implication: group discussion is not peripheral to learning, it IS learning.<br>
            → Connects to: ZPD note, scaffolding note<br>
            → Tension with: individualist testing culture in SA schools
          </div>
          <div style="font-size:12px; color:#15803d; margin-top:10px;">You have processed the idea. You have your own response. You have connections.</div>
        </div>
      </div>
      <div style="background:var(--cream2); border-radius:10px; padding:14px; font-size:13px;">
        <strong>The test of a good note:</strong> Can you understand it completely without re-reading the source? Does it contain your thinking, or just the author's?
      </div>
    </div>
  `,
  questions: [
    'The text says transcription "feels productive" but produces little learning. Why do you think this is? What is happening cognitively when you copy something versus when you process it into your own words?',
    'Look at the two note examples in the visual. The thinking note ends with "Tension with: individualist testing culture in SA schools." Why is identifying a tension between a theory and a real-world context valuable for academic writing? How could you turn that one line into an essay argument?',
    'The text says Luhmann\'s discipline is "one idea per note, in your own words, connected to other ideas." Try it right now: write one atomic note from this reading. One idea. Your words. One connection to something else you know. (Write it in your answer here.)',
  ],
  writingPrompt: `Choose any two readings from this module — one from Phase 1 and one from Phase 2.

Write 6–7 sentences:
• Identify ONE idea from each reading (in your own words — no copying)
• Write an explicit connection between them: how do these two ideas relate? Do they support each other, contradict each other, or does one extend the other?
• Write one sentence that begins: "Together, these two ideas suggest that..." — this is the beginning of a synthesis argument
• Reflect: was this harder than summarising each source separately? What made it more difficult — and why do you think that difficulty is actually valuable?`,
};

export const unit11 = {
  id: 'u11', badge: 'Unit 11', title: 'Note-Taking for Thinking',
  phase: 'Phase 3 — Academic Communication',
  html: () => `
    <h1>Unit 11: Note-Taking for Thinking</h1>
    <p class="lead">The notes you take determine the quality of the thinking you produce. Most students take notes that record information. This unit teaches you to take notes that generate ideas — the difference between a filing system and a thinking system.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Distinguish between transcription notes and thinking notes — and explain why the difference matters</li>
        <li>Write atomic notes that contain one idea, in your own words, with explicit connections to other ideas</li>
        <li>Apply the Zettelkasten principle using any digital or physical tool</li>
        <li>Write a sentence-level synthesis connecting ideas from two different sources</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>This video explains the Zettelkasten method — a note-taking system used by some of the most prolific academic thinkers in history. You do not need to adopt the full system. But the core principle — one idea per note, in your own words, connected to other ideas — will permanently change how you engage with reading.</p>
    <div id="ivp-unit11" data-video-key="unit11" class="ivp-container"></div>

    ${quiz('q11a',
      'A student reads a 20-page chapter and fills 4 pages of notes by writing the key sentences from each section. According to this unit, what is the main problem with their approach?',
      ['The notes are too long', 'They should be using bullet points instead of sentences', 'They are transcribing the author\'s thinking rather than processing it into their own — so they will find it difficult to write originally from these notes, and they are unlikely to remember the ideas', 'They should highlight the chapter instead of taking notes'],
      2,
      '✅ Transcription-style notes are essentially re-reading the source in a different format. They do not require you to understand, connect, question, or respond to the ideas. When you later try to write an essay from these notes, you will find yourself either re-reading the chapter or paraphrasing the author\'s words rather than making your own argument.'
    )}

    ${quiz('q11b',
      'You are writing a literature review on inclusive education. You have notes on Vygotsky\'s ZPD, a South African policy document on inclusion, and a study showing inclusion is underfunded in rural schools. What should you do with these three items?',
      ['Summarise each one separately in the literature review', 'Find the connections and tensions between them — for example, how the policy aspiration (inclusion) relates to the theoretical basis (ZPD) and the empirical reality (underfunding) — and write a synthesised argument', 'Choose the most recent one and focus on that', 'Ask AI to synthesise them for you'],
      1,
      '✅ Three connected pieces of information — a theory, a policy, and empirical data — are the raw material of a sophisticated academic argument. Your job as a scholar is to identify the relationship between them and articulate it. In this case: ZPD tells us what inclusion should look like cognitively; the policy tells us what the state intends; the empirical data tells us the gap between intention and reality. That gap is your argument.'
    )}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u11', RT_U11)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"A scholar's notes are not a record of what they have read. They are a record of what they have thought. The difference is everything."</p>
    </div>
  `,
};
