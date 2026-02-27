// content/units.js
// ─────────────────────────────────────────────
// All course units. Each unit is an object with:
//   id      — unique string
//   badge   — short label shown in sidebar
//   title   — full title shown in sidebar and topbar
//   html()  — function returning the unit's HTML string
//
// Helper functions (quiz, exercise, ivp) are imported from
// their respective modules — keeping content and logic separate.
//
// TO ADD A UNIT: append a new object to the UNITS array.
// ─────────────────────────────────────────────

import { quiz, exercise }         from '../src/components/activities.js';
import { VIDEOS, VIDEO_CONFIG }   from './videos.js';

// Shorthand helpers used inside unit HTML strings
// ivp() returns a container div; the player is instantiated
// after the HTML is injected into the DOM (see app.js)
function ivp(key) {
  return `<div id="ivp-${key}" data-video-key="${key}" class="ivp-container"></div>`;
}

const q  = quiz;
const ex = exercise;

export const UNITS = [
  {
    id: 'u1',
    badge: 'Unit 1',
    title: 'AI Literacy Foundations',
    html: () => `
      <h1>Unit 1: AI Literacy Foundations</h1>
      <p class="lead">Before we can use AI as a scholarly tool, we must understand what it is — and, crucially, what it is not.</p>

      <div class="ex-block" style="background:var(--amber-dim); border:none;">
        <label class="ex-lbl">Learning Outcomes</label>
        <ul style="margin:10px 0 0 20px; font-size:14px; line-height:1.8;">
          <li>Define AI Literacy and explain its relevance to higher education.</li>
          <li>Identify the core components of Large Language Models (LLMs).</li>
          <li>Recognise the phenomenon of AI "hallucination" and apply critical evaluation strategies.</li>
        </ul>
      </div>

      ${ivp('intro')}

      <h2>What Makes AI "Intelligent"?</h2>
      <p>Modern AI systems, particularly LLMs like GPT-4 or Gemini, are sophisticated statistical engines trained on vast text corpora. They predict the most plausible next token in a sequence — they do not "understand" text in the way humans do. This distinction is the foundation of AI literacy: the capacity to engage with AI tools critically, ethically, and effectively.</p>

      ${q('q1',
        'An AI model that answers questions by predicting likely word sequences is best described as:',
        ['A conscious reasoning agent', 'A stochastic pattern matcher', 'An internet search engine', 'A human expert system'],
        1,
        'LLMs are probabilistic pattern matchers — they produce plausible outputs, not verified truths.'
      )}

      ${ex('e1',
        'AI Encounter Journal',
        'Describe a recent interaction you had with an AI tool…',
        'Describe one recent interaction you had with an AI tool (e.g. ChatGPT, Gemini, Copilot). What did you ask? What did it produce? What surprised, impressed, or concerned you?',
        'Reflective journal on personal AI use in academic contexts'
      )}
    `,
  },

  {
    id: 'u2',
    badge: 'Unit 2',
    title: 'Digital Information Landscapes',
    html: () => `
      <h1>Unit 2: Navigating Digital Information Landscapes</h1>
      <p class="lead">The internet contains peer-reviewed gold and viral misinformation in equal measure. Your job is to distinguish between them systematically.</p>

      <div class="ex-block" style="background:var(--amber-dim); border:none;">
        <label class="ex-lbl">Learning Outcomes</label>
        <ul style="margin:10px 0 0 20px; font-size:14px; line-height:1.8;">
          <li>Apply Boolean operators to construct precise database searches.</li>
          <li>Differentiate between primary, secondary, and grey literature.</li>
          <li>Navigate key academic databases (JSTOR, SCOPUS, Google Scholar).</li>
        </ul>
      </div>

      ${ivp('digital')}

      <h2>The Information Ecosystem</h2>
      <p>Academic literature exists in a hierarchy. Primary sources (original research) sit at the top. Secondary sources (reviews, syntheses) interpret primary research. Grey literature (government reports, NGO white papers, conference proceedings) falls outside traditional commercial publishing but is often highly authoritative. Understanding where a source sits in this hierarchy shapes how you use and cite it.</p>

      ${q('q2',
        'A government health department report on vaccine efficacy is best classified as:',
        ['Primary literature', 'Secondary literature', 'Grey literature', 'Social media'],
        2,
        'Grey literature includes documents from government bodies, NGOs, and think tanks — authoritative but not peer-reviewed.'
      )}

      ${ex('e2',
        'Boolean Search Log',
        'I searched for… using the operators…',
        'Conduct a Boolean search on a topic relevant to your discipline. Document your search string, the database used, and evaluate three results: one scholarly, one grey literature, one you would reject and why.',
        'Boolean search operators and academic database navigation'
      )}
    `,
  },

  {
    id: 'u3',
    badge: 'Unit 3',
    title: 'Critical Source Evaluation',
    html: () => `
      <h1>Unit 3: Critical Source Evaluation</h1>
      <p class="lead">Finding sources is easy. Knowing which ones to trust — and being able to justify that trust — is the scholarly skill.</p>

      ${ivp('eval')}

      <h2>The SIFT Framework</h2>
      <p>Developed by Mike Caulfield, SIFT offers a rapid four-step protocol for evaluating online information:</p>

      <div style="display:grid; grid-template-columns:1fr 1fr; gap:15px; margin:20px 0 30px;">
        ${['Stop — pause before sharing or citing.',
           'Investigate the source — who is behind it?',
           'Find better coverage — look for corroboration.',
           'Trace claims — go back to the original source.']
          .map((s, i) => `<div class="ex-block" style="margin:0;">
            <strong style="color:var(--amber);">${s.split('—')[0].trim()}</strong>
            <p style="font-size:13px;margin:4px 0 0;">— ${s.split('—')[1].trim()}</p>
          </div>`).join('')}
      </div>

      ${q('q3',
        'Lateral reading means:',
        [
          'Reading an article very carefully from start to finish.',
          'Opening other tabs to verify a source from outside itself.',
          'Skimming only the headings and abstract.',
          'Reading the "About Us" page of a website.',
        ],
        1,
        'Lateral reading means verifying a source by reading what others say about it — not what it says about itself.'
      )}

      ${ex('e3',
        'SIFT Analysis',
        'The source I evaluated was…',
        'Apply the full SIFT protocol to one source you\'ve found for a current assignment. Document each step and conclude with a verdict: cite, use with caution, or reject.',
        'SIFT framework for evaluating digital sources and lateral reading'
      )}
    `,
  },

  {
    id: 'u4',
    badge: 'Unit 4',
    title: 'Academic Integrity & AI Ethics',
    html: () => `
      <h1>Unit 4: Academic Integrity & AI Ethics</h1>
      <p class="lead">The rules of academic integrity have not changed — but AI has made them harder to apply and easier to violate.</p>

      ${ivp('integrity')}

      <h2>The Plagiarism Spectrum</h2>

      <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:15px; margin-bottom:30px;">
        <div class="ex-block" style="margin:0; text-align:center; background:#dcfce7; border:1px solid #86efac;">
          <strong style="color:#15803d;">GREEN ZONE</strong>
          <p style="font-size:12px;margin-top:5px;">Brainstorming & Outlining.</p>
          <p style="font-size:11px;color:#64748b;">You are the architect.</p>
        </div>
        <div class="ex-block" style="margin:0; text-align:center; background:#fef3c7; border:1px solid #fde68a;">
          <strong style="color:#b45309;">AMBER ZONE</strong>
          <p style="font-size:12px;margin-top:5px;">Editing & Feedback.</p>
          <p style="font-size:11px;color:#64748b;">Must be declared/cited.</p>
        </div>
        <div class="ex-block" style="margin:0; text-align:center; background:#fee2e2; border:1px solid #fca5a5;">
          <strong style="color:#b91c1c;">RED ZONE</strong>
          <p style="font-size:12px;margin-top:5px;">Content Generation.</p>
          <p style="font-size:11px;color:#64748b;">AI writes the essay.</p>
        </div>
      </div>

      ${q('q4',
        'A student uses ChatGPT to translate their entire essay from Spanish to English. Is this allowed?',
        ['Yes, translation is fine.', 'No, unless explicitly permitted by policy.', 'Yes, if they fix the grammar later.', 'Only if they pay for GPT-4.'],
        1,
        'Machine translation of whole assignments is generally considered unoriginal work — always check your institution\'s policy.'
      )}

      ${ex('e4',
        'Personal AI Ethics Policy',
        'I will use AI for… but not for…',
        'Draft a brief personal policy (3–4 sentences) on exactly how you will use — or not use — AI in your upcoming assignments. How will you declare its role to your assessor?',
        'Ethics of AI use in higher education and academic integrity policies'
      )}
    `,
  },

  {
    id: 'u5',
    badge: 'Unit 5',
    title: 'Prompt Engineering',
    html: () => `
      <h1>Unit 5: Generative AI & Prompt Engineering</h1>
      <p class="lead">Mastering AI as a research partner requires learning the art of the prompt — moving from simple questions to sophisticated, iterative prompt engineering.</p>

      ${ivp('prompt')}

      <h2>The CREATE Framework</h2>

      <div class="ex-block" style="background:#f0f7ff; border:1px solid #cce3ff;">
        <label class="ex-lbl" style="color:#0056b3;">CREATE</label>
        ${[
          ['C: Context',  'Who are you? What is the academic setting?'],
          ['R: Role',     'Act as a PhD supervisor / peer-reviewer.'],
          ['E: Examples', 'Provide a sample of the style you want.'],
          ['A: Ask',      'The specific task you want performed.'],
          ['T: Target',   'Who is the audience for this output?'],
          ['E: Execute',  'Final check — run and iterate.'],
        ].map(([k, v]) => `<p style="font-size:13px;margin-bottom:5px;"><strong>${k}</strong> — ${v}</p>`).join('')}
      </div>

      ${ex('e5',
        'Prompt Workbench',
        'Before: [simple prompt]\nAfter: [CREATE-structured prompt]',
        'Take a simple prompt you\'ve used recently and rewrite it using the CREATE framework. Show both versions and reflect on how the AI\'s output changed.',
        'Prompt engineering for academic research using the CREATE framework'
      )}
    `,
  },
];
