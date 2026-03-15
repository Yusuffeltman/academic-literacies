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

import { quiz, exercise, pathwayChallenge, essayMilestone, heutagogyCycle, portfolioEvidence } from '../src/components/activities.js';
import { VIDEOS, VIDEO_CONFIG } from './videos.js';

// Shorthand helpers used inside unit HTML strings
// ivp() returns a container div; the player is instantiated
// after the HTML is injected into the DOM (see app.js)
function ivp(key) {
  return `<div id="ivp-${key}" data-video-key="${key}" class="ivp-container"></div>`;
}

const q = quiz;
const ex = exercise;
const pc = pathwayChallenge;
const em = essayMilestone;
const hc = heutagogyCycle;
const pe = portfolioEvidence;

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

      ${pc('u1-pc', {
      title: 'AI Literacy Application',
      intro: 'Choose your level of inquiry. Complete one track fully before recording your learning cycle.',
      supportedTitle: 'Supported',
      supportedTasks: [
        'Identify three common AI tools used by students.',
        'List one risk of using these tools for academic work.'
      ],
      coreTitle: 'Core',
      coreTasks: [
        'Compare how a generic search engine and an LLM generate their answers.',
        'Evaluate a recent interaction you had with an AI tool for accuracy.'
      ],
      advancedTitle: 'Advanced',
      advancedTasks: [
        'Synthesize the "stochastic parrot" concept in relation to academic integrity policies.',
        'Justify why AI literacy is a foundational academic skill in your discipline.'
      ]
    })}
      
      ${em('u1-em', {
      title: 'Essay Milestone 1',
      target: 'Establish your primary argument regarding AI use.',
      checklist: [
        'Formulate a claim regarding the role of AI in your field.',
        'Ensure the claim does not suggest AI "understands" human concepts.'
      ]
    })}

      ${hc('u1-hc', {
      title: 'Unit 1 Learning Cycle',
      prompt: 'Reflect deeply (80+ words) on your pathway choice in relation to your learning contract.',
      context: 'Unit 1: AI Literacy Foundations. Focus on the shift from viewing AI as an oracle to a probabilistic tool.'
    })}

      ${pe('u1-pe', {
      title: 'AI Literacy Transfer Artifact',
      target: 'Link an artifact (e.g. prompt log, verified essay plan) showing you applied AI literacy skills to another module.'
    })}
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

      ${pc('u2-pc', {
      supportedTasks: [
        'Perform a basic Google search on a topic of interest.',
        'Note the number of results and identifying features of the top three links.'
      ],
      coreTasks: [
        'Use Boolean operators AND, OR, NOT to refine your search.',
        'Find one scholarly article and one grey literature source using high-quality databases.'
      ],
      advancedTasks: [
        'Construct a complex search string using nested parentheses and wildcards.',
        'Critically evaluate why specific databases (e.g. Scopus vs Scholar) return significantly different result sets.'
      ]
    })}

      ${em('u2-em', {
      title: 'Essay Milestone 2',
      target: 'Gather your evidence base.',
      checklist: [
        'Include at least 5 scholarly sources in your reading list.',
        'Distinguish clearly between primary evidence and secondary commentary.'
      ]
    })}

      ${hc('u2-hc', {
      title: 'Unit 2 Learning Cycle',
      prompt: 'Reflect (80+ words) on how Boolean searching has changed your "path of least resistance" when finding info.',
      context: 'Unit 2: Digital Information Landscapes. Focus on moving from "googling" to strategic inquiry.'
    })}

      ${pe('u2-pe', {
      title: 'Database Skills Transfer',
      target: 'Evidence of a specific database search string used in another module to find a peer-reviewed source.'
    })}
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

      ${pc('u3-pc', {
          supportedTasks: [
            'Identify the author and date of an online source.',
            'Check if the source links to any external evidence.'
          ],
          coreTasks: [
            'Practice lateral reading: what do other reliable sites say about this organization?',
            'Apply the SIFT framework to verify a breaking news story or controversial claim.'
          ],
          advancedTasks: [
            'Critique the SIFT framework for highly niche academic claims.',
            'Evaluate the role of "consensus" in lateral reading when dealing with emerging research.'
          ]
        })}

      ${em('u3-em', {
          title: 'Essay Milestone 3',
          target: 'Vett your bibliography for impact and authority.',
          checklist: [
            'Verify the credentials of your three most cited authors.',
            'Ensure your sources reflect a diverse range of perspectives (where appropriate).'
          ]
        })}

      ${hc('u3-hc', {
          title: 'Unit 3 Learning Cycle',
          prompt: 'Reflect (80+ words) on a time you were misled by a source and how SIFT would have prevented it.',
          context: 'Unit 3: Critical Source Evaluation. Focus on the distinction between "reading vertically" and "reading laterally".'
        })}

      ${pe('u3-pe', {
          title: 'Evaluation Framework Transfer',
          target: 'Link to a SIFT analysis you performed on a source for a different module.'
        })}
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
        ['C: Context', 'Who are you? What is the academic setting?'],
        ['R: Role', 'Act as a PhD supervisor / peer-reviewer.'],
        ['E: Examples', 'Provide a sample of the style you want.'],
        ['A: Ask', 'The specific task you want performed.'],
        ['T: Target', 'Who is the audience for this output?'],
        ['E: Execute', 'Final check — run and iterate.'],
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
