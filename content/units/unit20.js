// content/units/unit20.js — Your Academic Identity & Lifelong Learning
// Phase 5 — The Future Scholar

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';

const RT_U20 = {
  id: 'rt-u20', unitId: 'u20', unitNum: 20,
  title: 'The Reflective Scholar — Looking Back to Move Forward',
  level: 'Academic Mastery Level 2', wordTarget: 300,
  source: 'Adapted for Academic Literacies — drawing on Boud, D. (2001). Using journal writing to enhance reflective practice. New Directions for Adult and Continuing Education; and Schön, D. (1987). Educating the Reflective Practitioner. Jossey-Bass.',
  vocab: [
    { term: 'Metacognition', definition: 'Thinking about your own thinking — awareness of how you learn, what strategies work for you, where your patterns of error are, and how to deliberately adjust your approach. The foundation of self-regulated learning.', example: 'A metacognitive learner doesn\'t just notice they failed an essay. They analyse why: Was it a reading comprehension problem? A structural writing issue? A source evaluation failure? They identify the specific gap and address it.' },
    { term: 'Reflective practice', definition: 'A professional and scholarly habit of systematically examining your own practice — what worked, what didn\'t, and what you would do differently — in order to improve. Used in teaching, research, and professional development.', example: 'A teacher who reflects on a lesson asks: Which students didn\'t understand? What did my explanation not address? What would I change? This is different from simply remembering the lesson.' },
    { term: 'Academic identity', definition: 'Your sense of yourself as a thinker, writer, and learner within the academic community — the values, habits, and sense of belonging (or non-belonging) that shape how you engage with scholarly work.', example: 'First-generation university students often experience a tension between their home identity and academic identity — feeling that "being academic" means abandoning who they are. Strong academic identity integrates both: your life experience and knowledge enrich your scholarly perspective.' },
    { term: 'Lifelong learning', definition: 'The ongoing, voluntary pursuit of knowledge and skills throughout life — not as a means to a credential, but as a disposition toward curiosity, growth, and engagement with ideas. The disposition this entire module has been building.', example: 'A teacher who keeps reading new research, attends professional learning communities, seeks feedback on their practice, and treats uncertainty as an invitation to learn rather than a threat to their authority is a lifelong learner.' },
  ],
  text: `
    <h3>The Reflective Scholar — Looking Back to Move Forward</h3>

    <p>You have completed a module designed to do something unusual: not just give you information, but change how you think. Whether it has succeeded is something only you can determine — and that determination requires the skill of reflective practice.</p>

    <p>Donald Schön's foundational distinction between <em>reflection-in-action</em> (adjusting your thinking while you are doing something) and <em>reflection-on-action</em> (examining what you did after the fact to improve future practice) applies directly to scholarly development. The exit tickets, writing reflections, and reading responses throughout this module were all forms of structured reflection. This final unit asks you to reflect on the whole — and on yourself as a learner.</p>

    <p>Academic identity is not fixed. Most first-year students arrive at university with a thin academic identity — a sense of themselves as a student, but not yet as a thinker. The transition to scholarship requires building a new self-concept: someone who engages with difficult ideas, who produces original analytical writing, who reads sources critically rather than reverentially, who belongs in the intellectual conversation. This transition is uncomfortable. It should be. Intellectual growth is always preceded by the discomfort of not-yet-knowing.</p>

    <p>What does it mean to leave this module differently from how you entered it? At minimum, it means having a set of tools you did not have before — a reading method, a paragraph structure, a source evaluation framework, a prompt engineering approach. But ideally it means something more: a habit of intellectual self-scrutiny. The ability to ask yourself, of any claim — whether from a researcher, an AI, a government report, or your own first draft — <em>How do I know this? What is the evidence? What am I assuming?</em></p>

    <p>The Academic Mission Statement you write in this unit is not a performance of what you think a scholar should say. It is an honest account of where you are now, where you want to go, and what intellectual habits you are committing to developing. A mission statement you actually believe will serve you differently than one written to please a marker.</p>
  `,
  questions: [
    'Schön distinguishes between reflection-in-action and reflection-on-action. Give an example of each from your experience in this module — a moment when you adjusted your thinking while doing something, and a moment when you examined what you had done afterwards.',
    'The text says academic identity transition is "uncomfortable" and "should be." Why does growth require discomfort? What specifically is the discomfort of transitioning from student-identity to scholar-identity?',
    'The text says ideally the module leaves you with "a habit of intellectual self-scrutiny" — the ability to ask "How do I know this?" of any claim. Give one example from each: a research claim, an AI output, and your own writing, where you applied this question this semester and what you found.',
  ],
  writingPrompt: `Your Academic Mission Statement — 300–350 words.

This is the final writing task of the module. It is also the most personal.

Your statement must honestly address three things:

1. GROWTH: What is the single most significant change in how you read, write, or think that this module has produced? Be specific — name the skill, the moment it shifted, and what it felt like before and after.

2. IDENTITY: How do you see yourself as a scholar now, compared to when you started? What aspects of academic life feel more like yours? What still feels foreign or uncomfortable?

3. COMMITMENTS: What three specific intellectual habits will you carry into your next year of study? These should be concrete and actionable — not "I will read more" but "I will apply the three-pass method to every required reading before the tutorial."

Write honestly. This is the only piece in the module where honest imperfection is more valuable than polished performance.`,
};

export const unit20 = {
  id: 'u20', badge: 'Unit 20', title: 'Your Academic Identity & Lifelong Learning',
  phase: 'Phase 5 — The Future Scholar',
  html: () => `
    <h1>Unit 20: Your Academic Identity & Lifelong Learning</h1>
    <p class="lead">You have spent twenty units building skills. This final unit asks a different question: who have you become? Reflective practice — examining your own development honestly — is both the conclusion of this module and the beginning of your life as a self-directed scholar.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Apply reflective practice frameworks (Schön's reflection-on-action) to evaluate your own development as a reader and writer</li>
        <li>Articulate your emerging academic identity — the habits, values, and sense of belonging you have developed</li>
        <li>Identify three specific intellectual commitments to carry into your next year of study</li>
        <li>Write an honest, specific Academic Mission Statement that reflects genuine self-knowledge</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>Eduardo Briceño's TED talk on getting better at the things you care about makes a distinction that is central to this unit: the difference between the <em>learning zone</em> (where you are deliberately practising and improving, making mistakes, operating at the edge of your competence) and the <em>performance zone</em> (where you execute what you already know). Most schooling trains students to stay in the performance zone. Scholarship requires regular, deliberate, uncomfortable time in the learning zone.</p>
    <div id="ivp-unit20" data-video-key="unit20" class="ivp-container"></div>

    ${quiz('q20a',
      'Briceño distinguishes between the "learning zone" and the "performance zone." Which of these activities is in the LEARNING zone?',
      [
        'Writing an essay on a topic you already understand well',
        'Deliberately attempting a skill you know you are weak at — analytical explanation in PEEL paragraphs — accepting that your first attempt will be imperfect, with a specific goal of improving that one element',
        'Re-reading material you already know to feel confident',
        'Only attempting tasks you are sure you can do well',
      ],
      1,
      '✅ The learning zone requires deliberate discomfort: working at the edge of your competence, accepting imperfection, getting feedback, and adjusting. Staying only in the performance zone — only doing what you are already good at — feels safer but produces no growth. Most effective learners alternate between zones: learning zone to build new capacity, performance zone to apply it.'
    )}

    ${quiz('q20b',
      'A student writes their Academic Mission Statement: "I will be a hardworking student who reads all the required work and submits assignments on time." What is the fundamental weakness of this statement?',
      [
        'It is too short',
        'It describes baseline compliance with course requirements — not intellectual habits, values, or specific growth commitments. It tells us nothing about what kind of thinker this student wants to become.',
        'It should include more goals',
        'Mission statements should not mention assignments',
      ],
      1,
      '✅ "Submitting on time" and "doing the reading" are minimum requirements, not intellectual commitments. A meaningful Academic Mission Statement names specific habits of mind: analytical reading, evidence-based argument, tolerance for intellectual discomfort, curiosity-driven inquiry, honest self-assessment. These are the habits that distinguish a student from a scholar.'
    )}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u20', RT_U20)}

    <div class="unit-closing">
      <div class="unit-closing-label">You Have Completed the Module</div>
      <p>"The purpose of academic literacies is not to make you sound like a scholar. It is to give you the tools to think like one — and to keep thinking like one, in every classroom, every staffroom, and every conversation with a learner who deserves a teacher who never stopped learning."</p>
    </div>
  `,
};
