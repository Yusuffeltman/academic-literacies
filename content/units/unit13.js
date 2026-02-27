// content/units/unit13.js — Academic Voice, Hedging & Register
// Phase 3 | Academic Entry Level 4

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
export const VIDEO_KEY_13 = 'unit13';

const RT_U13 = {
  id: 'rt-u13', unitId: 'u13', unitNum: 13,
  title: 'Finding Your Academic Voice', level: 'Academic Entry Level 4', wordTarget: 220,
  source: 'Adapted for Academic Literacies — informed by Hyland, K. (2005). Metadiscourse. Continuum; and South African academic writing pedagogy research.',
  sourceUrl: null,
  vocab: [
    { term: 'Hedging language', definition: 'Words and phrases that qualify the strength of a claim — acknowledging that evidence supports a conclusion without claiming absolute certainty. Essential for intellectual honesty in academic writing.', example: '"This suggests..." / "The evidence indicates..." / "It appears that..." / "These findings may be explained by..."' },
    { term: 'Academic register', definition: 'The formal, precise, and impersonal variety of language expected in academic writing — characterised by complex sentence structures, discipline-specific vocabulary, and careful attribution of claims.', example: 'Informal: "Teachers are really stressed out." Academic register: "Research indicates that teacher burnout in South African schools is associated with elevated workloads, inadequate support, and systemic resource constraints (Mncube & Harber, 2012)."' },
    { term: 'Stance markers', definition: 'Linguistic features that signal your attitude toward a claim — whether you are certain, tentative, surprised, or critical. Academic writers use stance markers to position themselves in relation to the evidence.', example: '"Surprisingly, the study found..." / "Crucially, the authors note..." / "Contrary to expectations..." all signal the writer\'s analytical stance.' },
    { term: 'Nominalisation', definition: 'Converting verbs or adjectives into nouns — a feature of formal academic writing that creates density and abstraction. Used carefully, it adds precision; used excessively, it obscures meaning.', example: 'Verb: "The government failed to implement the policy." Nominalised: "The failure of policy implementation..." The noun form allows you to then say something analytical about that failure.' },
  ],
  text: `
    <h3>Finding Your Academic Voice — Register, Hedging, and the Art of Confident Uncertainty</h3>
    <p>One of the most common questions first-year students ask is: "Should I write in first person or third person?" This is the wrong question. The right question is: "Am I making claims with the appropriate level of certainty, supported by the appropriate evidence, in language my academic reader will find credible?"</p>
    <p><strong>Academic register</strong> is not about avoiding "I" or using long words. It is about precision, attribution, and appropriate qualification. In academic writing, you rarely claim absolute certainty — because absolute certainty is rarely justified by evidence. Instead, you use <strong>hedging language</strong> to signal the strength of your claim: "The evidence suggests..." is different from "The evidence proves..." — and both are different from "I think..." The choice between them communicates your relationship to the evidence and your intellectual honesty about its limits.</p>
    <p>Hedging is not weakness. It is precision. It communicates: "I am claiming what the evidence supports, no more and no less." Over-confident claims ("This proves...") invite challenge and signal inexperience. Appropriately hedged claims signal a writer who understands the nature of evidence.</p>
    <p>Academic voice also requires care about attribution. In everyday writing, we might say "everyone knows that..." or "it is widely accepted that..." Academic writing demands: by whom? Verified by what? "Studies consistently show that..." is still weak — which studies? How many? "A systematic review of 47 studies across 12 countries found that..." is stronger, and "Smith and Jones (2021), in a longitudinal study of 800 South African teachers over five years, found that..." is stronger still.</p>
    <p>For students writing in English as an additional language, finding an academic voice has an extra layer of complexity: you may be translating not just words, but entire ways of structuring an argument from your home language into English academic conventions. This is real intellectual work, and it takes time. What helps most is reading widely in academic English — not to copy the style, but to develop an instinct for what sounds right in academic contexts.</p>
  `,
  visual: null,
  questions: [
    'The text says hedging is "not weakness but precision." Explain this in your own words. Give one example of an over-confident academic claim and rewrite it with appropriate hedging.',
    'Compare these two sentences: "Teachers are stressed." vs. "Research indicates that teachers in under-resourced South African schools report elevated levels of occupational stress, attributed to workload, lack of support, and resource constraints (Mncube & Harber, 2012)." What specific differences make the second sentence more academically credible? List at least three.',
    'Think about how you typically write — in WhatsApp messages, in casual essays, in your home language. What is ONE specific feature of your natural writing that you will need to adapt for academic English? (Be specific — not just "it is too informal" but what exactly is informal about it.)',
  ],
  writingPrompt: `Take ONE paragraph you have already written for this module — from any of the previous writing tasks — and rewrite it in a more formal academic register.

Submit BOTH your original paragraph AND your revised version.

In your revised version:
• Replace informal words with precise academic vocabulary
• Add appropriate hedging to any absolute claims
• Ensure every claim is attributed to a source
• Remove any first-person phrases that weaken rather than strengthen (e.g. "I think" can often become "The evidence suggests")

After both versions, write 3 sentences explaining the three most significant changes you made and why each one improves the academic quality of the writing.`,
};

export const unit13 = {
  id: 'u13', badge: 'Unit 13', title: 'Academic Voice, Hedging & Register',
  phase: 'Phase 3 — Academic Communication',
  html: () => `
    <h1>Unit 13: Academic Voice, Hedging & Register</h1>
    <p class="lead">How you say something in academic writing is as important as what you say. This unit develops the specific linguistic habits — hedging, attribution, register, and precision — that give academic writing its credibility and authority.</p>
    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Apply hedging language appropriately to qualify claims with intellectual honesty</li>
        <li>Distinguish formal academic register from informal writing — and shift between them deliberately</li>
        <li>Revise your own previous writing using improved register, hedging, and attribution</li>
        <li>Write with a voice that is both academically credible and authentically yours</li>
      </ul>
    </div>
    <div class="section-label">🎬 Watch First</div>
    <p>This tutorial on academic writing style demonstrates the difference between formal and informal register using real student writing examples. Pay close attention to the hedging language examples — they appear simple but take practice to deploy correctly.</p>
    <div id="ivp-unit13" data-video-key="unit13" class="ivp-container"></div>

    ${quiz('q13a',
      'Which sentence demonstrates the most appropriate academic hedging?',
      ['This proves that bilingual education improves all learner outcomes.', 'I think maybe bilingual education might possibly help some learners sometimes.', 'The available evidence suggests that bilingual instruction is associated with improved literacy outcomes in the Foundation Phase, though contextual factors significantly mediate this relationship.', 'Bilingual education is good and everyone agrees.'],
      2,
      '✅ Option C hedges appropriately: "suggests" (not "proves"), "associated with" (not "causes"), and "contextual factors significantly mediate this relationship" acknowledges the complexity of the evidence. Option A overclaims. Option B under-hedges to the point of meaninglessness. Option D makes a false universal claim.'
    )}

    ${quiz('q13b',
      'A student writes: "Obviously, teachers in rural schools struggle more than urban teachers." What is the academic writing problem with this sentence?',
      ['It uses the word "struggle" which is too emotional', '"Obviously" asserts that something is self-evident without providing evidence — in academic writing, nothing is obvious; all claims require evidence and attribution, even claims that seem commonsensical', 'It should compare rural and urban in more detail', 'It is too short'],
      1,
      '✅ "Obviously," "clearly," "of course," and "everyone knows" are red flags in academic writing. They assert certainty without providing it. If something is genuinely well-supported by evidence, the evidence is more persuasive than the assertion that the claim is obvious. Replace "obviously" with a citation.'
    )}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u13', RT_U13)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"Finding your academic voice does not mean erasing your natural voice. It means learning to deploy different registers for different contexts — the way a skilled teacher can speak to a six-year-old, to a parent, to a colleague, and to a policy-maker in four different registers without losing their essential self."</p>
    </div>
  `,
};
