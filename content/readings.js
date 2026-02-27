// content/readings.js
// ─────────────────────────────────────────────
// Extensive Reading (ER) tiers.
// Each tier has a set of articles and a comprehension prompt.
// Add new tiers or articles here — no code changes needed elsewhere.
// ─────────────────────────────────────────────

export const ER_TIERS = [
  {
    tier: 1,
    label: 'Foundation',
    description: 'Accessible articles introducing core AI and digital literacy concepts.',
    articles: [
      {
        title: 'What Is AI, Really?',
        source: 'MIT Technology Review',
        url: 'https://www.technologyreview.com/2022/01/25/1044233/what-is-ai-really/',
        summary: 'A plain-language explainer of how modern AI systems work, what they can and cannot do, and why it matters for students.',
        readingTime: '8 min',
      },
      {
        title: 'How to Spot a Deepfake',
        source: 'BBC Future',
        url: 'https://www.bbc.com/future/article/20230103-how-to-spot-a-deepfake',
        summary: 'Practical tips for identifying AI-generated media in an era of increasing synthetic content.',
        readingTime: '6 min',
      },
    ],
    quizPrompt: 'In 150–200 words, explain the key difference between narrow AI and general AI, and give one real-world example of narrow AI you encountered this week.',
  },
  {
    tier: 2,
    label: 'Intermediate',
    description: 'Scholarly-adjacent articles requiring critical analysis and source evaluation.',
    articles: [
      {
        title: 'The Plagiarism Problem: Students, AI, and Academic Integrity',
        source: 'Inside Higher Ed',
        url: 'https://www.insidehighered.com/news/2023/05/18/professors-grade-ai-tool-used-detect-plagiarism',
        summary: 'An exploration of how universities are adapting academic integrity policies in response to generative AI tools.',
        readingTime: '12 min',
      },
      {
        title: 'Beyond the Hype: What AI Can Actually Do in Education',
        source: 'The Conversation',
        url: 'https://theconversation.com/beyond-the-hype-what-ai-can-actually-do-in-education-196327',
        summary: "A measured assessment of AI's genuine educational affordances versus its overstated claims.",
        readingTime: '10 min',
      },
    ],
    quizPrompt: 'Critically compare how two of this tier\'s articles frame the relationship between AI and academic integrity. Which argument do you find more persuasive and why? (200–250 words)',
  },
  {
    tier: 3,
    label: 'Advanced',
    description: 'Peer-reviewed and long-form pieces demanding synthesis and scholarly critique.',
    articles: [
      {
        title: 'Stochastic Parrots: On the Dangers of Very Large Language Models',
        source: 'Bender et al., ACM FAccT 2021',
        url: 'https://dl.acm.org/doi/10.1145/3442188.3445922',
        summary: 'The seminal paper questioning the environmental and societal costs of large language models, and the epistemic risks of treating them as understanding systems.',
        readingTime: '30 min',
      },
    ],
    quizPrompt: 'Bender et al. use the metaphor of a "stochastic parrot" to critique large language models. In 250–300 words, explain this metaphor, evaluate its strengths and limitations as a scholarly argument, and connect it to at least one concept from this course.',
  },
];
