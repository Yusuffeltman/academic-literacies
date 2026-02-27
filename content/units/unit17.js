// content/units/unit17.js — AI for Literature Mapping & Synthesis
// Phase 4 — AI as a Scholarly Tool

import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
import { visualTask }  from '../../src/components/visual-task.js';

const RT_U17 = {
  id: 'rt-u17', unitId: 'u17', unitNum: 17,
  title: 'Mapping a Research Field — From Individual Papers to Conversations',
  level: 'Academic Transition Level 2', wordTarget: 220,
  source: 'Adapted for Academic Literacies — drawing on Machi, L. & McEvoy, B. (2022). The Literature Review: Six Steps to Success. Corwin; and Grant, M. & Booth, A. (2009). A typology of reviews. Health Information & Libraries Journal, 26(2), 91–108.',
  vocab: [
    { term: 'Literature mapping', definition: 'The process of identifying the key papers, authors, debates, and theoretical frameworks in a research field — creating an overview of what the field knows, disagrees about, and has not yet answered.', example: 'Before writing a literature review on inclusive education in South Africa, you would map: Who are the dominant researchers? What are the 3–4 main positions? What is contested? What gaps exist?' },
    { term: 'Citation network', definition: 'The web of connections between papers formed by citation relationships — paper A cites paper B, paper C cites both A and B, and so on. Tools like ResearchRabbit visualise these networks to reveal which papers are foundational.', example: 'If you start with one 2022 paper on AI in education and follow its citation network, you will find the 5–6 foundational papers from 2015–2019 that almost everyone in the field cites.' },
    { term: 'Thematic synthesis', definition: 'Organising sources by the themes or arguments they address — rather than summarising each source separately. Thematic synthesis produces coherent, argument-driven literature review paragraphs.', example: 'Instead of: "Smith (2020) found X. Jones (2021) found Y. Patel (2022) found Z." → "Three studies converge on the finding that [theme], though they differ on [point of disagreement]: Smith (2020) argues..., while Jones (2021) and Patel (2022) both find..."' },
    { term: 'Synthesis matrix', definition: 'A table that maps sources against themes or criteria — rows are sources, columns are themes. Allows you to see patterns across sources at a glance before writing the literature review.', example: 'Columns: Source | Sample size | Context | Key finding | Methodological limitation | Relevant to my argument (Y/N). Filling this in for 8–10 papers reveals patterns invisible when sources are read separately.' },
  ],
  text: `
    <h3>Mapping a Research Field — From Individual Papers to Conversations</h3>

    <p>A literature review is not a list of summaries. It is a map of a conversation — one that has been happening for years or decades among researchers who agree on some things, disagree on others, and have collectively left some questions open. Your job as a literature reviewer is to describe that conversation accurately, position yourself within it, and identify where your own research question fits.</p>

    <p>The challenge for most first-year students is that they have only ever read papers individually — one at a time, in isolation. A literature review requires you to read across sources simultaneously, noticing patterns: Who keeps citing whom? Where do researchers agree? Where do they contradict each other? What methodological approaches dominate? What question keeps being asked but never fully answered?</p>

    <p>AI tools — particularly those designed for literature mapping, like ResearchRabbit, Connected Papers, and Elicit — help with the first part of this work: finding papers and visualising their relationships. These tools can take one landmark paper and show you the citation network around it, helping you rapidly identify the 5–10 papers that almost everyone in the field cites. This is enormously useful for orientation.</p>

    <p>But AI tools cannot do the synthesis for you. They can find papers; they cannot tell you what the papers mean in relation to each other. They can identify that three papers all discuss "play-based learning" — they cannot tell you that Smith's interpretation of play is behaviourist while Jones's is constructivist, and that this theoretical difference explains why their findings seem contradictory. That analytical work requires you to have actually read the papers and thought about them.</p>

    <p>The synthesis matrix is the practical tool that bridges the gap between individual paper notes and a coherent thematic synthesis. Before writing a single sentence of your literature review, populate a synthesis matrix: each paper as a row, each major theme as a column. Patterns that are invisible in a stack of papers become visible in a table — and those patterns are the raw material of your thematic paragraphs.</p>
  `,
  questions: [
    'The text says "A literature review is not a list of summaries — it is a map of a conversation." What is the practical difference between writing a list of summaries and writing a map of a conversation? What does the writer need to do differently?',
    'The text distinguishes between what AI tools can do (find papers, visualise citation networks) and what they cannot do (synthesise). Why can AI not synthesise? What specifically is the human analytical work that is required?',
    'Explain what a synthesis matrix is and why filling it in before writing is useful. What becomes visible in the matrix that is invisible when sources are read one at a time?',
  ],
  writingPrompt: `Choose ONE of the following education research topics:
(a) Play-based learning in the Foundation Phase
(b) AI tools in teacher education
(c) Mother-tongue instruction in multilingual South African classrooms

Using Scopus or Google Scholar, find THREE peer-reviewed sources on your chosen topic published since 2015. 

Then:
1. Create a simple synthesis matrix with these columns: Source (Author, Year) | Main argument | Evidence type (qualitative/quantitative) | SA context? (Y/N) | Key limitation
2. Below the matrix, write a 3-sentence thematic synthesis — one paragraph that groups what the three papers agree on and where they diverge. Do NOT summarise each paper separately.`,
};

const VT_U17 = {
  id: 'vt-u17', unitId: 'u17',
  title: 'Reading a Citation Network Map',
  chartType: 'network diagram',
  visualDescription: 'A citation network visualisation showing a central landmark paper connected to 12 citing and cited papers, with node size indicating citation count and line thickness indicating citation frequency',
  source: 'Academic Literacies module — based on ResearchRabbit/Connected Papers network visualisation principles. Network represents a fictional education research topic.',
  observePrompt: 'Study the network carefully before answering. Notice: which nodes are largest? Which paper sits most centrally? Which papers cluster together? Where are the isolated nodes?',
  observeChecklist: [
    'Which node (paper) is the largest and most central',
    'Which papers cluster tightly together vs sit in isolation',
    'Whether any papers appear to connect two otherwise separate clusters',
    'What the node size and line thickness represent',
    'Whether there are papers cited by many others vs papers that cite many others',
  ],
  analysePrompt: 'What does the structure of this network tell you about the research field — before you have read a single paper?',
  analyseQuestions: [
    'The largest, most central node is probably a foundational paper. What does this tell you — why would you read this paper first?',
    'Two clusters of papers are connected only through a single bridge paper. What does this suggest about the relationship between the two sub-fields?',
    'There are three isolated papers on the edge of the network with few connections. What are two possible explanations for their isolation — one positive, one concerning?',
  ],
  modelAnswer: `A citation network map gives you the architecture of a research conversation before you read any of the papers. The largest, most central node is foundational: almost everyone in the field has read and cited it, which means it defines the terms of the debate and is your mandatory starting point. Clusters indicate sub-fields or methodological traditions that are internally well-connected but less engaged with each other — a bridge paper connecting two clusters is particularly valuable because it speaks both languages. Isolated papers on the periphery may be recent work not yet widely cited (potentially cutting-edge), work from a different disciplinary tradition, or work that was methodologically weak and therefore not taken up. The network gives you a reading priority: start at the centre, work outward toward the clusters most relevant to your question, and note where the field's edges and silences are.`,
};

export const unit17 = {
  id: 'u17', badge: 'Unit 17', title: 'AI for Literature Mapping & Synthesis',
  phase: 'Phase 4 — AI as a Scholarly Tool',
  html: () => `
    <h1>Unit 17: AI for Literature Mapping & Synthesis</h1>
    <p class="lead">AI tools can map a research field in minutes. They can find papers you would never have found with keyword searches alone, and visualise citation relationships that reveal how a field is structured. What they cannot do is think about those relationships for you — that analytical work is yours.</p>

    <div class="unit-outcomes">
      <div class="outcomes-label">By the end of this unit you will be able to:</div>
      <ul>
        <li>Use a citation network to identify landmark papers and key debates in a research field</li>
        <li>Build a synthesis matrix from three or more sources before writing a literature review paragraph</li>
        <li>Write a thematic synthesis paragraph that groups sources by argument rather than summarising them separately</li>
        <li>Distinguish clearly between what AI literature tools can and cannot do for academic synthesis</li>
      </ul>
    </div>

    <div class="section-label">🎬 Watch First</div>
    <p>This Scribbr tutorial on writing a literature review covers the move from individual source summaries to thematic, integrated paragraphs — the most difficult transition in literature review writing. Watch specifically for the demonstration of how a "source-by-source" structure differs from a "theme-by-theme" structure, and why the second produces stronger academic writing.</p>
    <div id="ivp-unit17" data-video-key="unit17" class="ivp-container"></div>

    ${quiz('q17a',
      'A student writes their literature review as: "Smith (2020) argues... Jones (2021) argues... Patel (2022) argues..." — each source in a separate paragraph. What is the fundamental problem with this structure?',
      [
        'They have too many sources',
        'This is a list of summaries, not a synthesis — it shows what individual researchers say but not how the ideas relate, where they agree, where they conflict, or what patterns emerge across the field',
        'The citations are in the wrong format',
        'Literature reviews should not use multiple sources',
      ],
      1,
      '✅ Summarising sources one by one is the most common literature review error. It shows you have read the sources but not that you have thought across them. A synthesis asks: what do these sources collectively establish? Where do they converge? Where do they contradict? What question do they all leave unanswered? These are the questions that produce literature review paragraphs.'
    )}

    ${quiz('q17b',
      'You use ResearchRabbit to map your topic and it identifies 47 potentially relevant papers. What should you do BEFORE reading all 47?',
      [
        'Read all 47 papers in full before deciding which to use',
        'Use the citation network to identify the 5–8 most central, most-cited papers as your starting point — applying Pass One (abstract only) to each before deciding which deserve full reading',
        'Choose the 5 most recent papers and ignore older ones',
        'Ask AI to summarise all 47 for you',
      ],
      1,
      '✅ Citation network tools are most useful as filtering tools, not reading lists. The most-cited, most-central papers give you the field\'s foundational knowledge. Then use the three-pass method from Unit 10: abstract first, decide whether to read in full, apply critical reading only to the most relevant. Reading 47 papers without a strategy is neither efficient nor effective.'
    )}

    <h2>Visual Literacy Task</h2>
    ${visualTask(VT_U17)}

    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u17', RT_U17)}

    <div class="unit-closing">
      <div class="unit-closing-label">Before You Move On</div>
      <p>"A literature review that summarises sources separately is a bibliography with commentary. A literature review that synthesises them is a map of an intellectual territory — one that shows where the paths converge, where they diverge, and where no one has yet walked."</p>
    </div>
  `,
};
