// content/units/unit06.js — Unit 6: Scopus AI & Intelligent Literature Discovery
import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
import { visualTask }  from '../../src/components/visual-task.js';

const RT_CONFIG = {
  id: 'rt-u6', unitId: 'u6', unitNum: 6,
  title: 'Searching Smarter: From Keywords to Intelligence',
  level: 'Foundation Level 2', wordTarget: 120,
  source: 'Adapted for Academic Literacies — drawing on Elsevier Scopus AI documentation',
  vocab: [
    { term: 'Scopus', definition: 'The world\'s largest curated database of peer-reviewed literature, maintained by Elsevier. It indexes over 90 million research records.', example: 'When your lecturer asks you to "search the literature," Scopus is one of the primary tools for doing this systematically.' },
    { term: 'Natural language query', definition: 'Searching using ordinary conversational language rather than technical Boolean operators. AI-powered tools like Scopus AI process natural language.', example: 'Instead of typing "teacher AND "professional development" AND "South Africa"", you can ask: "What does recent research say about teacher development in South African secondary schools?"' },
    { term: 'Citation analysis', definition: 'The study of how often a piece of research is cited by other researchers — used to evaluate the influence and impact of a publication.', example: 'A paper published in 2015 that has been cited 847 times is considered highly influential in its field.' },
    { term: 'Metadata', definition: 'Data that describes other data. In academic publishing: title, author, journal, date, abstract, keywords — the information about a paper, not the paper itself.', example: 'Scopus stores metadata for millions of papers, allowing you to search without accessing the full text of every article.' },
  ],
  text: `<h3>Searching Smarter: From Keywords to Intelligence</h3>
    <p>For decades, searching an academic database required a specific technical skill: knowing how to construct Boolean search strings using AND, OR, and NOT operators. A student who did not know that technique could spend hours searching and find nothing useful. That barrier has largely been removed. Scopus AI allows researchers to search the world's largest curated database of peer-reviewed literature using plain, conversational language.</p>
    <p>But removing the technical barrier does not remove the critical thinking barrier. Scopus AI is powerful, but it requires you to evaluate what it gives you. The tool can surface relevant papers quickly — it cannot tell you whether those papers are appropriate for your specific argument, whether their methodologies are sound, or whether their findings have been challenged by more recent research. That evaluation is your responsibility.</p>
    <p>Understanding how Scopus differs from Google Scholar and general AI tools like ChatGPT is essential. Google Scholar indexes a wider range of documents, including non-peer-reviewed material and preprints — it is broader but less curated. ChatGPT and similar tools can fabricate citations that look real but do not exist. Scopus indexes only verified, published academic records with accurate metadata. When Scopus tells you a paper exists, it exists. This is not a small distinction — it is the difference between building an argument on verified knowledge and building it on AI hallucination.</p>`,
  questions: [
    'What is the main difference between Scopus and a general AI chatbot like ChatGPT when it comes to finding academic sources? Why does this difference matter for a university assignment?',
    'The text says removing the "technical barrier" does not remove the "critical thinking barrier." What must you still do yourself that Scopus AI cannot do for you?',
    'Based on what you have read: for which specific research task would you use Google Scholar rather than Scopus? Give a real example from your studies.',
  ],
  writingPrompt: `Imagine you are writing on "effects of mobile phones on learning in South African secondary schools."
Write 4–5 sentences describing your Scopus AI search strategy: What would your first query be (write it out exactly)? What filters would you apply? What would you look for in results to decide which papers to read? What would you do if you got fewer than 5 results? Use at least two vocabulary words from this unit.`,
};

const VT_CONFIG = {
  id: 'vt-u6', unitId: 'u6',
  title: 'Research Tool Comparison: Which Tool for Which Task?',
  chartType: 'comparison table',
  visualDescription: 'A table comparing five research tools across key dimensions of reliability, scope, and appropriate use',
  source: 'Adapted for Academic Literacies from MIT Libraries AI Research Guide (2024)',
  observePrompt: 'Read each row and column before answering. Notice which tools are "retrieval" tools (search real databases) and which are "generative" tools (produce text). This distinction is the most important thing in this table.',
  observeChecklist: [
    'The five tools listed in the columns',
    'Which tools retrieve from verified databases vs generate text',
    'Which tool you have personally used before',
    'The row that shows the most important risk for academic use',
  ],
  visual: `<div style="overflow-x:auto;padding:8px;">
    <table style="width:100%;border-collapse:collapse;font-size:13px;min-width:560px;">
      <thead><tr style="background:var(--navy);color:#fff;">
        <th style="padding:11px 14px;text-align:left;">Dimension</th>
        <th style="padding:11px 14px;text-align:center;background:#15803d;">Scopus AI</th>
        <th style="padding:11px 14px;text-align:center;">Google Scholar</th>
        <th style="padding:11px 14px;text-align:center;">Elicit</th>
        <th style="padding:11px 14px;text-align:center;background:#991b1b;">ChatGPT</th>
        <th style="padding:11px 14px;text-align:center;background:#991b1b;">Gemini / Copilot</th>
      </tr></thead>
      <tbody>
        <tr style="background:#f8fafc;"><td style="padding:10px 14px;font-weight:600;">Type</td><td style="text-align:center;color:#15803d;font-weight:700;">Retrieval</td><td style="text-align:center;color:#15803d;font-weight:700;">Retrieval</td><td style="text-align:center;color:#15803d;font-weight:700;">Retrieval</td><td style="text-align:center;color:#b91c1c;font-weight:700;">Generative</td><td style="text-align:center;color:#b91c1c;font-weight:700;">Generative</td></tr>
        <tr style="background:#fff;"><td style="padding:10px 14px;font-weight:600;">Peer-reviewed only?</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">❌ No</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">❌ No</td><td style="text-align:center;">❌ No</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:10px 14px;font-weight:600;">Citations verified?</td><td style="text-align:center;">✅ Always</td><td style="text-align:center;">✅ Usually</td><td style="text-align:center;">✅ Always</td><td style="text-align:center;">⚠️ Often false</td><td style="text-align:center;">⚠️ Often false</td></tr>
        <tr style="background:#fff;"><td style="padding:10px 14px;font-weight:600;">Natural language search?</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">✅ Yes</td></tr>
        <tr style="background:#f8fafc;"><td style="padding:10px 14px;font-weight:600;">Safe for assignment citations?</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">✅ Verify first</td><td style="text-align:center;">✅ Yes</td><td style="text-align:center;">❌ Verify in Scopus</td><td style="text-align:center;">❌ Verify in Scopus</td></tr>
        <tr style="background:#fff;"><td style="padding:10px 14px;font-weight:600;">Best use</td><td style="text-align:center;font-size:12px;">Literature reviews</td><td style="text-align:center;font-size:12px;">Open-access versions</td><td style="text-align:center;font-size:12px;">Summarising findings</td><td style="text-align:center;font-size:12px;">Brainstorming only</td><td style="text-align:center;font-size:12px;">Brainstorming only</td></tr>
      </tbody>
    </table>
    <p style="font-size:12px;color:var(--muted);margin-top:8px;font-style:italic;">✅ Yes &nbsp;⚠️ Conditional — requires verification &nbsp;❌ No / not reliable for this purpose</p>
  </div>`,
  questions: [
    { q: 'The table shows that ChatGPT and Gemini have ⚠️ "Often false" for "Citations verified." Why is this specifically dangerous for a student writing an assignment — even if the student did not intend to submit false information?', hint: 'Think about what happens when you submit a reference that looks correct but does not exist.', modelAnswer: 'The danger is that the student cannot tell the difference between a real citation and a hallucinated one without verification — both look identical in format. If a student submits a hallucinated citation, it is still academic misconduct regardless of intent. The student is responsible for verifying every source before submission. "I did not know it was false" is not an acceptable defence.' },
    { q: 'All five tools support natural language search. But two of them are marked ❌ for "Safe for assignment citations." Explain why natural language search ability does NOT make a tool safe for academic citation.', hint: 'What is the difference between answering a question and retrieving a verified document?', modelAnswer: 'Natural language search ability describes how you interact with the tool — it says nothing about whether the results come from a verified database or are generated text. ChatGPT understands your natural language question and generates a plausible-sounding answer, including citations. But those citations are produced by pattern-matching in training data, not by querying a real database. A conversational interface does not guarantee verified output.' },
    { q: 'A classmate says "I always use Google Scholar because it finds more papers than Scopus." Based on the table, what is the trade-off they are accepting — and when would that trade-off be acceptable?', hint: 'Look at what Google Scholar does NOT filter out.', modelAnswer: 'Google Scholar\'s broader scope includes non-peer-reviewed material, preprints, and grey literature — material that Scopus excludes. The trade-off is breadth for curation. This is acceptable when: (a) looking for an open-access PDF of a paper already identified as reliable, or (b) needing very recent preprints in a fast-moving field. It is not acceptable as a substitute for Scopus when the assignment requires peer-reviewed sources only.' },
  ],
};

export const unit06 = {
  id: 'u6', badge: 'Unit 6', title: 'Scopus AI & Intelligent Literature Discovery',
  phase: 'Phase 2 — Finding & Evaluating Knowledge',
  html: () => `
    <h1>Unit 6: Scopus AI & Intelligent Literature Discovery</h1>
    <p class="lead">Scopus AI lets you search over 90 million peer-reviewed records in plain language. This unit teaches you to use that power precisely — and to understand exactly why it is different from asking ChatGPT.</p>
    <div class="unit-outcomes"><div class="outcomes-label">By the end of this unit you will be able to:</div><ul>
      <li>Use Scopus AI to formulate effective natural language research queries</li>
      <li>Distinguish retrieval tools from generative AI tools — and know which to use when</li>
      <li>Read a comparison table critically to evaluate tool appropriateness</li>
      <li>Write a structured search strategy for a real assignment topic</li>
    </ul></div>
    <div class="section-label">🎬 Watch First</div>
    <p>This Elsevier tutorial demonstrates Scopus AI's core features. Pay close attention to how the tool explains its reasoning — that explanation is your first evaluation tool.</p>
    <div id="ivp-unit6" data-video-key="unit6" class="ivp-container"></div>
    ${quiz('q6a','Scopus AI surfaces a 2018 paper with 312 citations. Google Scholar also returns a 2024 preprint on the same topic. Which should you read first and why?',['The 2024 preprint — more recent means more relevant','The 2018 paper — older papers are always more reliable','Read the 2018 paper first for foundational understanding, then the 2024 preprint for recent developments — noting it is not yet peer-reviewed','Both are equally useful'],2,'✅ A highly cited 2018 paper is likely a landmark study — read it to understand what the field established. A 2024 preprint offers current thinking but has not survived peer review. Both have value. Good researchers read both and note the difference.')}
    ${quiz('q6b','You ask ChatGPT for five references on inclusive education in South Africa. It provides five detailed, well-formatted citations. What must you do before using any of them?',['Use them directly — ChatGPT is reliable for academic citations','Check that each one appears in Scopus or Google Scholar and verify all details','Ask ChatGPT to double-check its own citations','Use only the three most recent ones'],1,'✅ AI chatbots frequently hallucinate citations. Always verify every AI-generated citation in Scopus or Google Scholar before use. Submitting a hallucinated reference is academic misconduct — even if you did not know it was false.')}
    <h2>📊 Visual Activity: Choosing the Right Research Tool</h2>
    <p>Research decisions depend on understanding your tools. This comparison table will help you internalise when to use each platform — and crucially, which ones carry risk for academic citation.</p>
    ${visualTask('vt-u6', VT_CONFIG)}
    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u6', RT_CONFIG)}
    <div class="unit-closing"><div class="unit-closing-label">Before You Move On</div>
    <p>"A tool that searches 90 million peer-reviewed papers in seconds is only as good as the question you ask it. The intellectual work — framing, evaluation, synthesis — is always yours."</p></div>`,
};
