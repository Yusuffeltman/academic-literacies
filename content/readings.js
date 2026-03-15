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
  {
    tier: 4,
    label: 'Scholarly',
    description: 'Open-access scholarly readings and book chapters for deeper theoretical and technical engagement.',
    articles: [
      {
        title: 'Attention Is All You Need',
        source: 'Vaswani et al., 2017 (arXiv)',
        url: 'https://arxiv.org/abs/1706.03762',
        summary: 'Introduces the Transformer architecture that underpins modern large language models; essential for understanding current NLP advances.',
        readingTime: '25–35 min',
      },
      {
        title: 'Deep Learning (select chapters)',
        source: 'Goodfellow, Bengio & Courville (book)',
        url: 'https://www.deeplearningbook.org/',
        summary: 'Foundational textbook on deep learning; select chapters (e.g. chapters on sequence models) are recommended for conceptual depth.',
        readingTime: 'varies (selected chapters)',
      },
      {
        title: 'The Mythos of Model Interpretability',
        source: 'Lipton, 2016 (arXiv)',
        url: 'https://arxiv.org/abs/1606.03490',
        summary: 'A critical survey of what interpretability means in machine learning and common pitfalls in claims about explainability.',
        readingTime: '20–30 min',
      },
      {
        title: 'Fairness and Machine Learning (select excerpts)',
        source: 'Barocas, Hardt & Narayanan (open book)',
        url: 'https://fairmlbook.org/',
        summary: 'Accessible chapters on fairness definitions, measurement, and practical trade-offs in algorithmic systems.',
        readingTime: 'varies (selected excerpts)',
      },
      {
        title: 'Learning Analytics: The Emergence of a Discipline',
        source: 'Siemens, 2013 (SOLAR)',
        url: 'https://solaresearch.org/learning-analytics/',
        summary: 'Framing paper on learning analytics as an emerging field — pedagogy, data, and ethical tensions for designers.',
        readingTime: '20–30 min',
      },
      {
        title: 'Learning analytics: ethical guidance for practice',
        source: 'Jisc (guide)',
        url: 'https://www.jisc.ac.uk/guides/learning-analytics-ethical-guidance',
        summary: 'Practical guidance on ethics, privacy, and governance for learning analytics systems — highly relevant to POPIA-sensitive contexts.',
        readingTime: '15–25 min',
      },
      {
        title: 'How People Learn (selected chapters)',
        source: 'National Research Council (summary)',
        url: 'https://nap.nationalacademies.org/catalog/9853/how-people-learn',
        summary: 'Foundational cognitive science insights on how learners build knowledge and expertise; use selected chapters for pedagogy grounding.',
        readingTime: '30–60 min (selected chapters)',
      },
      {
        title: 'How to Read a Paper',
        source: 'Keshav (practical guide)',
        url: 'http://keshav.ecs.soton.ac.uk/doc/undergrad/reading.pdf',
        summary: 'A short practical method for efficiently reading and analysing scholarly papers — useful skill for students approaching Tier 4 texts.',
        readingTime: '10–20 min',
      },
      {
        title: 'Design-Based Research: A Decade of Progress',
        source: 'Educational Designer / DBR literature',
        url: 'https://www.educationaldesigner.org/ed/volume1/issue1/article6/',
        summary: 'Overview of design-based research methodology for educational interventions and complex systems research.',
        readingTime: '20–30 min',
      },
      {
        title: 'A Survey of Educational Data Mining and Learning Analytics',
        source: 'Romero & Ventura (arXiv survey)',
        url: 'https://arxiv.org/abs/1704.06844',
        summary: 'Comprehensive survey of methods used in EDM and LA, useful for researchers and technically-curious educators.',
        readingTime: '25–40 min',
      },
      {
        title: 'A Survey of Explainable AI: Concepts, Taxonomies and Research Directions',
        source: 'Arrieta et al. (arXiv)',
        url: 'https://arxiv.org/abs/1910.10045',
        summary: 'A broad survey of explainable AI (XAI) methods, evaluation approaches, and open challenges.',
        readingTime: '25–40 min',
      },
      {
        title: 'Metacognition and Self-Regulated Learning (overview)',
        source: 'Zimmerman & educational summaries (open resources)',
        url: 'https://www.researchgate.net/publication/228707398_Metacognition_and_Self-regulated_Learning',
        summary: 'Accessible overviews of metacognitive strategies and self-regulation for students and educators.',
        readingTime: '20–30 min',
      }
    ],
    quizPrompt: 'Choose one article from this Scholarly tier and write a 300–350 word critical synthesis: summarise the central argument, evaluate its strengths and limitations, and propose one way its insights could change classroom practice in this module.'
  }
];
