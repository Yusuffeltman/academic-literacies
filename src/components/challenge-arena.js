// src/components/challenge-arena.js
// ─────────────────────────────────────────────
// Challenge Arena — Advanced interactive games for high-performing students
// Skill-mapped, scored, timed, with progressive difficulty
// ─────────────────────────────────────────────

import { STATE, recordOutcome } from '../state.js';

const _esc = (s) => {
  const d = document.createElement('div');
  d.textContent = String(s || '');
  return d.innerHTML;
};

// ── Sound Engine (Web Audio API + Speech Synthesis) ──

let _audioCtx = null;
function _ctx() {
  if (!_audioCtx) _audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  return _audioCtx;
}

// Tick sound — short click
function _sfxTick() {
  if (_soundMuted) return;
  try {
    const ctx = _ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.06);
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.06);
  } catch (_) { /* audio not available */ }
}

// Persistent ticking clock — returns stop function
let _tickInterval = null;
function _sfxStartClock(bpm = 60) {
  _sfxStopClock();
  const interval = 60000 / bpm;
  _tickInterval = setInterval(_sfxTick, interval);
  _sfxTick(); // immediate first tick
  return _sfxStopClock;
}
function _sfxStopClock() {
  if (_tickInterval) { clearInterval(_tickInterval); _tickInterval = null; }
}

// Urgent fast ticking — for last 15 seconds
function _sfxStartUrgentClock() {
  _sfxStopClock();
  _tickInterval = setInterval(_sfxTick, 250);
}

// Correct answer — ascending cheerful tone
function _sfxCorrect() {
  if (_soundMuted) return;
  try {
    const ctx = _ctx();
    const now = ctx.currentTime;
    [523, 659, 784].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + i * 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.08 + 0.15);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.08);
      osc.stop(now + i * 0.08 + 0.15);
    });
  } catch (_) {}
}

// Wrong answer — descending buzz
function _sfxWrong() {
  if (_soundMuted) return;
  try {
    const ctx = _ctx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(300, now);
    osc.frequency.exponentialRampToValueAtTime(150, now + 0.3);
    gain.gain.setValueAtTime(0.1, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.3);
  } catch (_) {}
}

// Bank / cash-in sound — register cha-ching
function _sfxBank() {
  if (_soundMuted) return;
  try {
    const ctx = _ctx();
    const now = ctx.currentTime;
    [1200, 1600, 2000].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.1, now + i * 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.06 + 0.12);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.06);
      osc.stop(now + i * 0.06 + 0.12);
    });
  } catch (_) {}
}

// Victory fanfare
function _sfxVictory() {
  if (_soundMuted) return;
  try {
    const ctx = _ctx();
    const now = ctx.currentTime;
    [523, 659, 784, 1047].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.12, now + i * 0.15);
      gain.gain.linearRampToValueAtTime(0.12, now + i * 0.15 + 0.1);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.15 + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.15);
      osc.stop(now + i * 0.15 + 0.35);
    });
  } catch (_) {}
}

// Countdown beep — used for last 3 seconds
function _sfxCountdownBeep(high = false) {
  if (_soundMuted) return;
  try {
    const ctx = _ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = high ? 1000 : 600;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.2);
  } catch (_) {}
}

// Reveal / dramatic sound
function _sfxReveal() {
  if (_soundMuted) return;
  try {
    const ctx = _ctx();
    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(800, now + 0.4);
    gain.gain.setValueAtTime(0.08, now);
    gain.gain.linearRampToValueAtTime(0.12, now + 0.2);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  } catch (_) {}
}

// ── Announcer Voice (Web Speech API) ──
let _currentUtterance = null;
function _announce(text, rate = 1.0, onEnd = null) {
  if (_soundMuted) { if (onEnd) setTimeout(onEnd, 800); return; }
  try {
    if (!window.speechSynthesis) { if (onEnd) onEnd(); return; }
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = rate;
    u.pitch = 0.9;
    u.volume = 0.8;
    // Try to pick a good English voice
    const voices = window.speechSynthesis.getVoices();
    const preferred = voices.find(v => /google.*uk/i.test(v.name))
      || voices.find(v => /daniel/i.test(v.name))
      || voices.find(v => /english.*male/i.test(v.name))
      || voices.find(v => v.lang.startsWith('en'));
    if (preferred) u.voice = preferred;
    if (onEnd) u.onend = onEnd;
    _currentUtterance = u;
    window.speechSynthesis.speak(u);
  } catch (_) { if (onEnd) onEnd(); }
}

function _stopAnnouncer() {
  try { window.speechSynthesis?.cancel(); } catch (_) {}
  _currentUtterance = null;
}

// Preload voices (some browsers need this)
try { window.speechSynthesis?.getVoices(); } catch (_) {}

// ── Mute Control ──
let _soundMuted = localStorage.getItem('arena-muted') === '1';
window._toggleArenaSound = () => {
  _soundMuted = !_soundMuted;
  localStorage.setItem('arena-muted', _soundMuted ? '1' : '0');
  if (_soundMuted) { _sfxStopClock(); _stopAnnouncer(); }
  document.querySelectorAll('.arena-mute-btn').forEach(b => {
    b.textContent = _soundMuted ? '🔇 Unmute' : '🔊 Mute';
  });
};

// ── Skill mapping ──────────────────────────────
const SKILL_MAP = {
  critical_reading: { label: 'Critical Reading', icon: '📖', color: '#8b5cf6' },
  evidence_use: { label: 'Evidence Use', icon: '📊', color: '#3b82f6' },
  argument_structure: { label: 'Argument Structure', icon: '🏗️', color: '#f59e0b' },
  academic_tone: { label: 'Academic Tone', icon: '🎓', color: '#10b981' },
  source_evaluation: { label: 'Source Evaluation', icon: '🔍', color: '#ef4444' },
  citation_practice: { label: 'Citation Practice', icon: '📝', color: '#06b6d4' },
  research_skills: { label: 'Research Skills', icon: '🔬', color: '#ec4899' },
  ai_literacy: { label: 'AI Literacy', icon: '🤖', color: '#6366f1' },
};

// ── Game Definitions ───────────────────────────

const CHALLENGE_GAMES = [
  {
    id: 'vocab-blitz',
    title: 'Vocabulary Blitz',
    description: 'Match academic terms to definitions under time pressure. Speed matters!',
    icon: '⚡',
    skills: ['academic_tone', 'critical_reading'],
    difficulty: 'medium',
    color: '#f59e0b',
    minUnitsVisited: 3,
  },
  {
    id: 'source-ranker',
    title: 'Source Credibility Ranker',
    description: 'Rank sources from most to least credible. Drag them into the correct order.',
    icon: '🏆',
    skills: ['source_evaluation', 'research_skills'],
    difficulty: 'hard',
    color: '#ef4444',
    minUnitsVisited: 5,
  },
  {
    id: 'peel-builder',
    title: 'PEEL Paragraph Builder',
    description: 'Construct academic paragraphs by placing Point, Evidence, Explanation, and Link in the right order.',
    icon: '🧱',
    skills: ['argument_structure', 'evidence_use'],
    difficulty: 'medium',
    color: '#3b82f6',
    minUnitsVisited: 6,
  },
  {
    id: 'citation-fixer',
    title: 'Citation Repair Shop',
    description: 'Fix broken APA 7th citations before time runs out. Each fix earns points.',
    icon: '🔧',
    skills: ['citation_practice'],
    difficulty: 'hard',
    color: '#06b6d4',
    minUnitsVisited: 8,
  },
  {
    id: 'ai-detective',
    title: 'AI Detective',
    description: 'Analyse text passages and determine which were written by AI. Difficulty increases each round.',
    icon: '🕵️',
    skills: ['ai_literacy', 'critical_reading'],
    difficulty: 'expert',
    color: '#6366f1',
    minUnitsVisited: 1,
  },
  {
    id: 'argument-wars',
    title: 'Argument Wars',
    description: 'Build the strongest academic argument by selecting claims, evidence, and warrants. Compete against the clock.',
    icon: '⚔️',
    skills: ['argument_structure', 'evidence_use', 'critical_reading'],
    difficulty: 'expert',
    color: '#ec4899',
    minUnitsVisited: 10,
  },
  {
    id: 'register-rush',
    title: 'Register Rush',
    description: 'Transform informal text to academic register in 60 seconds. AI grades your transformation.',
    icon: '🔄',
    skills: ['academic_tone'],
    difficulty: 'hard',
    color: '#10b981',
    minUnitsVisited: 6,
  },
  {
    id: 'synthesis-sprint',
    title: 'Synthesis Sprint',
    description: 'Combine multiple source summaries into one coherent synthesis paragraph. Quality and speed both count.',
    icon: '🔗',
    skills: ['critical_reading', 'evidence_use', 'argument_structure'],
    difficulty: 'expert',
    color: '#8b5cf6',
    minUnitsVisited: 10,
  },
  {
    id: 'weakest-link',
    title: 'The Weakest Link',
    description: 'Rapid-fire questions across all skills. Bank your points before the chain breaks — one wrong answer resets it!',
    icon: '🔗',
    skills: ['critical_reading', 'source_evaluation', 'citation_practice', 'academic_tone', 'ai_literacy', 'argument_structure', 'evidence_use', 'research_skills'],
    difficulty: 'hard',
    color: '#dc2626',
    minUnitsVisited: 4,
  },
  {
    id: 'research-feud',
    title: 'Research Feud',
    description: 'Guess the real research statistics! How close can you get to the actual findings from published studies?',
    icon: '📊',
    skills: ['research_skills', 'evidence_use', 'critical_reading'],
    difficulty: 'medium',
    color: '#7c3aed',
    minUnitsVisited: 2,
  },
];

// ── Game Content Data ──────────────────────────

const _VOCAB_ROUNDS = [
  // Round 1 — Foundation
  [
    { term: 'Empirical', def: 'Based on observation or experiment rather than theory', decoys: ['Based on personal opinion', 'Theoretical framework', 'Historical analysis'] },
    { term: 'Discourse', def: 'Written or spoken communication in a particular context', decoys: ['A mathematical formula', 'A type of citation', 'An internet search'] },
    { term: 'Hegemony', def: 'Dominance of one group over others in society', decoys: ['Equal distribution of power', 'Academic writing style', 'A research methodology'] },
    { term: 'Paradigm', def: 'A worldview or framework of thinking accepted by a community', decoys: ['A type of paragraph', 'A citation format', 'A reading strategy'] },
    { term: 'Epistemology', def: 'The study of knowledge — what counts as knowing', decoys: ['The study of ethics', 'The study of language', 'The study of statistics'] },
  ],
  // Round 2 — Intermediate
  [
    { term: 'Pedagogy', def: 'The theory and practice of teaching', decoys: ['The study of children', 'A grading system', 'A type of assessment'] },
    { term: 'Ontology', def: 'The study of what exists — the nature of being and reality', decoys: ['The study of language origins', 'A data collection method', 'An argument structure'] },
    { term: 'Praxis', def: 'The process of putting theory into practice', decoys: ['A type of academic journal', 'A citation management tool', 'A statistical test'] },
    { term: 'Heuristic', def: 'A practical approach to problem-solving that is not guaranteed to be optimal', decoys: ['A proven scientific method', 'A type of peer review', 'An academic writing structure'] },
    { term: 'Semiotics', def: 'The study of signs, symbols, and their interpretation', decoys: ['The study of sentence structure', 'A referencing system', 'A data analysis technique'] },
  ],
  // Round 3 — Advanced
  [
    { term: 'Hermeneutics', def: 'The theory of interpretation, especially of texts', decoys: ['A medical research method', 'A statistical framework', 'A citation verification process'] },
    { term: 'Positivism', def: 'The belief that knowledge comes only from observable, measurable evidence', decoys: ['An optimistic research approach', 'A qualitative methodology', 'A peer review standard'] },
    { term: 'Reification', def: 'Treating an abstract concept as if it were a concrete, real thing', decoys: ['Simplifying a complex argument', 'Citing multiple sources', 'Reviewing literature systematically'] },
    { term: 'Triangulation', def: 'Using multiple methods or sources to validate findings', decoys: ['A three-paragraph essay structure', 'A mathematical proof technique', 'Citing exactly three sources'] },
    { term: 'Incommensurability', def: 'When two theories or paradigms cannot be directly compared', decoys: ['When data cannot be measured', 'When sources disagree', 'When writing lacks clarity'] },
  ],
];

const _SOURCE_RANKING_ROUNDS = [
  {
    prompt: 'Rank these sources on the topic "AI in South African education" from MOST to LEAST credible:',
    sources: [
      { text: 'Peer-reviewed article in South African Journal of Education (2023)', rank: 1, reason: 'Peer-reviewed, subject-specific, recent, South African context.' },
      { text: 'Official government report from the Department of Basic Education (2023)', rank: 2, reason: 'Authoritative source, but may have political bias. Good for statistics.' },
      { text: 'Article on The Conversation by a UCT professor', rank: 3, reason: 'Expert author, editorial oversight, but not peer-reviewed.' },
      { text: 'Popular blog post by an education influencer with 500K followers', rank: 4, reason: 'Large audience ≠ expertise. No peer review, potential commercial bias.' },
      { text: 'Anonymous Reddit comment saying "AI will replace all teachers"', rank: 5, reason: 'Anonymous, no credentials, unsupported claim. Not an academic source.' },
    ],
  },
  {
    prompt: 'Rank these sources on "student mental health during COVID" from MOST to LEAST credible:',
    sources: [
      { text: 'Systematic review in The Lancet Psychiatry (2022), 47 studies analysed', rank: 1, reason: 'Systematic review = highest evidence level. Top-tier journal, large sample.' },
      { text: 'Cross-sectional survey study in SAJHE (2021), n=2,400 SA students', rank: 2, reason: 'Peer-reviewed, large SA sample, but single time-point only.' },
      { text: 'WHO policy brief on student mental health (2022)', rank: 3, reason: 'Authoritative international body, but policy documents can be selective.' },
      { text: 'News24 article quoting a psychologist', rank: 4, reason: 'Journalist\'s interpretation of an expert. Check the original source.' },
      { text: 'A student\'s TikTok video about their personal experience', rank: 5, reason: 'Valid lived experience, but not generalisable. Anecdotal, not empirical.' },
    ],
  },
];

const _PEEL_ROUNDS = [
  {
    topic: 'AI tools can enhance student writing when used appropriately.',
    pieces: [
      { type: 'P', text: 'AI-powered feedback tools have the potential to enhance the quality of student academic writing when integrated thoughtfully into the learning process.', order: 1 },
      { type: 'E', text: 'A study by Chen and Li (2023) found that students who received AI-generated feedback alongside instructor comments improved their essay scores by 23% compared to those who received instructor comments alone.', order: 2 },
      { type: 'E2', text: 'This improvement can be attributed to the immediacy of AI feedback, which allows students to revise while their thought process is still active, rather than waiting days for instructor responses.', order: 3 },
      { type: 'L', text: 'Therefore, rather than viewing AI as a threat to academic integrity, institutions should explore how AI feedback tools can complement existing pedagogical practices.', order: 4 },
    ],
  },
  {
    topic: 'The digital divide affects educational equity in South Africa.',
    pieces: [
      { type: 'P', text: 'The persistent digital divide in South Africa undermines efforts to achieve equitable access to quality education, particularly in rural and township communities.', order: 1 },
      { type: 'E', text: 'According to the Department of Communications and Digital Technologies (2023), only 37% of rural households have reliable internet access, compared to 84% in urban areas.', order: 2 },
      { type: 'E2', text: 'This disparity means that students in under-resourced communities cannot access online learning platforms, digital libraries, or AI tools that their urban counterparts use daily, creating a two-tiered education system.', order: 3 },
      { type: 'L', text: 'Addressing this infrastructure gap is therefore a prerequisite for any policy that seeks to integrate technology into South African education equitably.', order: 4 },
    ],
  },
  {
    topic: 'Critical reading skills are essential for university success.',
    pieces: [
      { type: 'P', text: 'The ability to read critically — distinguishing between description, analysis, and evaluation — is fundamental to academic success at university level.', order: 1 },
      { type: 'E', text: 'Research by Hermida (2009) demonstrated that students who received explicit instruction in critical reading strategies achieved significantly higher grades across all disciplines, not just language courses.', order: 2 },
      { type: 'E2', text: 'This cross-disciplinary impact occurs because critical reading enables students to evaluate evidence, identify assumptions, and construct informed arguments — skills required in every academic field.', order: 3 },
      { type: 'L', text: 'Universities should therefore embed critical reading instruction across the curriculum rather than confining it to academic literacy modules alone.', order: 4 },
    ],
  },
];

const _CITATION_FIX_ROUNDS = [
  { broken: 'Smith, John. (2022). "Understanding AI in Education." Journal of AI Studies. Vol 15, No 3, Pages 45-67.', fixed: 'Smith, J. (2022). Understanding AI in education. Journal of AI Studies, 15(3), 45–67.', errors: ['Full first name → initials', 'Quotation marks removed from article title', 'Sentence case for article title', '"Vol/No/Pages" → volume(issue), pages format', 'Comma after journal name'] },
  { broken: 'Department of Education (2023). Annual Report. Retrieved from https://www.education.gov.za/report.pdf, accessed 12 March 2024.', fixed: 'Department of Education. (2023). Annual report. https://www.education.gov.za/report.pdf', errors: ['Period after group author name', 'Sentence case for title', 'No "Retrieved from"', 'No access date for stable URLs'] },
  { broken: 'Nkosi, T., Dlamini, S., Molefe, K., Van der Merwe, L., & Sithole, P. (2021). Digital literacy gaps. SA Journal of Higher Ed, 35(2), 112-128.', fixed: 'Nkosi, T., Dlamini, S., Molefe, K., Van der Merwe, L., & Sithole, P. (2021). Digital literacy gaps. SA Journal of Higher Education, 35(2), 112–128.', errors: ['Journal title not abbreviated (use full name)', 'En dash (–) not hyphen (-) for page ranges'] },
  { broken: '(Molefe, Dlamini, Sithole, 2022)', fixed: '(Molefe et al., 2022)', errors: ['3+ authors = first author et al. in APA 7th', 'Add comma before year'] },
  { broken: 'Brown A.L. 1992. Design experiments. The Journal of the Learning Sciences 2(2): 141-178', fixed: 'Brown, A. L. (1992). Design experiments. The Journal of the Learning Sciences, 2(2), 141–178.', errors: ['Comma after surname', 'Space between initials', 'Year in parentheses', 'Period after year', 'Comma after journal name', 'Comma before volume', 'En dash for pages', 'Period at end'] },
];

const _AI_DETECTIVE_ROUNDS = [
  // Level 1 — Easy to spot
  [
    { text: 'The utilization of artificial intelligence in educational paradigms represents a transformative shift in pedagogical methodologies. The multifaceted nature of AI-driven learning platforms necessitates a comprehensive re-evaluation of traditional assessment frameworks and instructional design principles.', isAI: true, clue: 'Overloaded jargon, no specific context, sounds impressive but says nothing concrete.' },
    { text: 'When I first used ChatGPT for my assignment, I thought it was amazing — it wrote three paragraphs in seconds. But when my lecturer asked me what I meant in paragraph two, I couldn\'t explain it. That\'s when I realised I hadn\'t actually learned anything.', isAI: false, clue: 'Personal narrative, specific incident, emotional honesty, self-reflection.' },
  ],
  // Level 2 — Harder
  [
    { text: 'Critical thinking in higher education extends beyond the mere acquisition of knowledge. It encompasses the ability to analyse assumptions, evaluate evidence, and construct well-reasoned arguments. In the South African context, where educational inequalities persist, developing these skills is particularly important for first-generation university students.', isAI: true, clue: 'Perfectly structured but generic. Mentions SA but makes no specific claims. No citations. No personal voice.' },
    { text: 'I struggled with the SIFT method at first because I kept wanting to just Google everything instead of actually stopping to think. But after using it on my observation log, I noticed I was catching misinformation that I would have shared before. The hardest part was accepting that sources I trusted weren\'t always reliable.', isAI: false, clue: 'Describes a learning journey with struggle, specific method reference, genuine insight.' },
  ],
  // Level 3 — Very subtle
  [
    { text: 'Vygotsky\'s zone of proximal development provides a useful framework for understanding how AI tools might serve as a "more knowledgeable other" in the learning process. However, this analogy has limitations — unlike a human tutor, AI cannot genuinely understand a student\'s confusion or adapt its approach based on emotional cues.', isAI: true, clue: 'Well-argued but notice: no citation for Vygotsky, perfectly balanced structure, hedges appropriately but has no personal stance.' },
    { text: 'Vygotsky (1978) argued that learning happens in the space between what you can do alone and what you can do with help. I think AI sits weirdly in that space — it can help you produce work, but it doesn\'t actually help you understand it. My tutor made me rewrite my paragraph without ChatGPT and I realised how much I\'d been relying on it to think for me.', isAI: false, clue: 'Proper citation, personal experience, authentic voice ("sits weirdly"), concrete example.' },
  ],
];

const _ARGUMENT_COMPONENTS = [
  {
    topic: 'Should AI-generated text be considered plagiarism?',
    claims: [
      { text: 'AI-generated text should be classified as a form of academic misconduct when submitted without disclosure.', strength: 'strong', type: 'claim' },
      { text: 'AI is just a tool like a calculator, so using it isn\'t cheating.', strength: 'weak', type: 'claim' },
      { text: 'The definition of plagiarism needs to evolve to account for AI-assisted writing.', strength: 'strong', type: 'claim' },
    ],
    evidence: [
      { text: 'A 2024 survey found that 67% of South African university students have used AI tools for assignments (Govender & Pillay, 2024).', strength: 'strong', type: 'evidence' },
      { text: 'Everyone knows students use AI, so it must be acceptable.', strength: 'weak', type: 'evidence' },
      { text: 'Universities with clear AI-use policies saw a 40% reduction in misconduct cases (Chen et al., 2023).', strength: 'strong', type: 'evidence' },
    ],
    warrants: [
      { text: 'Because academic integrity requires that submitted work represents the student\'s own understanding and intellectual effort.', strength: 'strong', type: 'warrant' },
      { text: 'Because technology always changes and we should just accept it.', strength: 'weak', type: 'warrant' },
      { text: 'Because transparent AI use policies allow students to learn to work WITH AI ethically, preparing them for professional contexts.', strength: 'strong', type: 'warrant' },
    ],
  },
];

// ── Arena Renderer ─────────────────────────────

export function renderChallengeArena(container) {
  const visitedCount = Object.values(STATE.progress || {}).filter(p => p.visited).length;
  const skills = STATE.adaptive?.skills || {};
  const isHighPerformer = STATE.adaptive?.high_performer === true;

  const availableGames = CHALLENGE_GAMES.filter(g => visitedCount >= g.minUnitsVisited);
  const lockedGames = CHALLENGE_GAMES.filter(g => visitedCount < g.minUnitsVisited);

  container.innerHTML = `
    <div class="student-dash anim-fade" style="max-width:1100px;margin:0 auto;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;margin-bottom:24px;">
        <div>
          <h1 style="margin:0;font-size:28px;color:var(--navy);">Challenge Arena</h1>
          <p style="margin:4px 0 0 0;color:var(--muted);font-size:14px;">Push your skills further with interactive challenges</p>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <div style="background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;padding:8px 16px;border-radius:12px;font-weight:800;font-size:13px;">
            🏆 ${_getArenaXP()} XP
          </div>
          <button onclick="window.goToStudentDashboard()" class="btn-prev" style="display:inline-flex;">← Dashboard</button>
        </div>
      </div>

      <!-- Skill overview strip -->
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:24px;">
        ${Object.entries(SKILL_MAP).map(([key, s]) => {
          const skill = skills[key];
          const status = skill?.status || 'untested';
          const colors = { strong: '#22c55e', developing: '#f59e0b', weak: '#ef4444', untested: '#94a3b8' };
          return `<div style="padding:8px 14px;border-radius:10px;background:${colors[status]}18;border:1px solid ${colors[status]}44;font-size:12px;font-weight:600;color:${colors[status]};">
            ${s.icon} ${s.label}: ${status}
          </div>`;
        }).join('')}
      </div>

      <!-- Available games -->
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;margin-bottom:24px;">
        ${availableGames.map(g => `
          <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;box-shadow:0 4px 12px rgba(15,23,42,.04);cursor:pointer;transition:transform .15s ease,box-shadow .15s ease;"
               onmouseover="this.style.transform='translateY(-3px)';this.style.boxShadow='0 12px 28px rgba(15,23,42,.1)'"
               onmouseout="this.style.transform='';this.style.boxShadow='0 4px 12px rgba(15,23,42,.04)'"
               onclick="window._startChallengeGame('${g.id}')">
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px;">
              <div style="width:48px;height:48px;border-radius:14px;background:${g.color}18;display:flex;align-items:center;justify-content:center;font-size:24px;border:2px solid ${g.color}33;">${g.icon}</div>
              <div>
                <div style="font-size:16px;font-weight:800;color:var(--navy);">${_esc(g.title)}</div>
                <div style="font-size:11px;color:${g.color};font-weight:700;text-transform:uppercase;letter-spacing:.05em;">${_esc(g.difficulty)}</div>
              </div>
            </div>
            <p style="font-size:13px;color:var(--muted);line-height:1.5;margin:0 0 12px 0;">${_esc(g.description)}</p>
            <div style="display:flex;gap:6px;flex-wrap:wrap;">
              ${g.skills.map(sk => `<span style="font-size:10px;padding:3px 8px;border-radius:6px;background:${SKILL_MAP[sk]?.color || '#94a3b8'}18;color:${SKILL_MAP[sk]?.color || '#94a3b8'};font-weight:600;">${SKILL_MAP[sk]?.label || sk}</span>`).join('')}
            </div>
            <div style="font-size:12px;color:var(--muted);margin-top:10px;">Best: ${_getGameBest(g.id)}</div>
          </div>`).join('')}
      </div>

      <!-- Locked games -->
      ${lockedGames.length ? `
        <h3 style="color:var(--muted);font-size:14px;margin:0 0 12px 0;">🔒 Locked — complete more units to unlock</h3>
        <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px;opacity:.5;">
          ${lockedGames.map(g => `
            <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:20px;">
              <div style="display:flex;align-items:center;gap:12px;">
                <div style="width:48px;height:48px;border-radius:14px;background:#94a3b818;display:flex;align-items:center;justify-content:center;font-size:24px;">🔒</div>
                <div>
                  <div style="font-size:16px;font-weight:800;color:var(--navy);">${_esc(g.title)}</div>
                  <div style="font-size:11px;color:var(--muted);">Requires ${g.minUnitsVisited} units visited</div>
                </div>
              </div>
            </div>`).join('')}
        </div>` : ''}
    </div>`;
}

// ── XP & Scoring ───────────────────────────────
function _getArenaXP() {
  const scores = JSON.parse(localStorage.getItem('challenge-arena-scores') || '{}');
  let xp = 0;
  for (const [, games] of Object.entries(scores)) {
    for (const s of games) xp += s.xp || 0;
  }
  return xp;
}

function _getGameBest(gameId) {
  const scores = JSON.parse(localStorage.getItem('challenge-arena-scores') || '{}');
  const games = scores[gameId] || [];
  if (!games.length) return 'Not played';
  const best = Math.max(...games.map(s => s.score || 0));
  return `${best} pts`;
}

function _saveGameScore(gameId, score, xp, skills = []) {
  const scores = JSON.parse(localStorage.getItem('challenge-arena-scores') || '{}');
  if (!scores[gameId]) scores[gameId] = [];
  scores[gameId].push({ score, xp, date: new Date().toISOString(), skills });
  // Keep last 20 per game
  if (scores[gameId].length > 20) scores[gameId] = scores[gameId].slice(-20);
  localStorage.setItem('challenge-arena-scores', JSON.stringify(scores));

  // Record outcomes for adaptive system
  for (const skill of skills) {
    const normalizedScore = Math.min(5, (score / 100) * 5);
    recordOutcome(skill, normalizedScore, `challenge-arena/${gameId}`);
  }
}

// ── Game Mount ─────────────────────────────────
function _mountGame(html) {
  const app = document.getElementById('app');
  if (!app) return;
  app.innerHTML = `
    <div class="student-dash anim-fade" style="max-width:1100px;margin:0 auto;padding:24px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <button onclick="window._exitArenaGame()" class="btn-prev" style="display:inline-flex;">← Back to Arena</button>
        <div style="display:flex;gap:10px;align-items:center;">
          <button class="arena-mute-btn" onclick="window._toggleArenaSound()" style="padding:6px 14px;border-radius:10px;border:1px solid var(--border);background:white;font-size:13px;font-weight:600;cursor:pointer;">${_soundMuted ? '🔇 Unmute' : '🔊 Mute'}</button>
          <div id="game-score-display" style="background:linear-gradient(135deg,#f59e0b,#ef4444);color:white;padding:8px 16px;border-radius:12px;font-weight:800;font-size:15px;">Score: 0</div>
        </div>
      </div>
      <div id="game-mount">${html}</div>
    </div>`;
}

// Clean exit — stop all sounds when leaving a game
window._exitArenaGame = () => {
  _sfxStopClock();
  _stopAnnouncer();
  window.goToChallengeArena();
};

function _updateScore(score) {
  const el = document.getElementById('game-score-display');
  if (el) el.textContent = `Score: ${score}`;
}

// ── Game Implementations ───────────────────────

// ── VOCAB BLITZ ────────────────────────────────
function _startVocabBlitz() {
  let round = 0;
  let score = 0;
  let timeLeft = 60;
  let timer = null;
  let currentTermIdx = 0;

  function render() {
    if (round >= _VOCAB_ROUNDS.length) {
      _endVocabBlitz(score);
      return;
    }
    const terms = _VOCAB_ROUNDS[round];
    if (currentTermIdx >= terms.length) {
      round++;
      currentTermIdx = 0;
      render();
      return;
    }
    const term = terms[currentTermIdx];
    const allOptions = [term.def, ...term.decoys].sort(() => Math.random() - 0.5);

    const mount = document.getElementById('game-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">
          <span style="font-size:13px;color:var(--muted);">Round ${round + 1}/${_VOCAB_ROUNDS.length} · Word ${currentTermIdx + 1}/${terms.length}</span>
          <span id="vb-timer" style="font-size:20px;font-weight:800;color:${timeLeft <= 10 ? '#ef4444' : 'var(--navy)'};">⏱ ${timeLeft}s</span>
        </div>
        <div style="background:linear-gradient(135deg,#1e3a5f,#1d4ed8);border-radius:16px;padding:28px;margin-bottom:20px;">
          <div style="font-size:11px;color:rgba(255,255,255,.6);text-transform:uppercase;letter-spacing:.15em;margin-bottom:8px;">Define this term</div>
          <div style="font-size:clamp(28px,4vw,42px);font-weight:900;color:white;">${_esc(term.term)}</div>
        </div>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
        ${allOptions.map((opt, i) => `
          <button id="vb-opt-${i}" onclick="window._vbAnswer(${i}, ${opt === term.def})"
            style="padding:16px 18px;border-radius:14px;border:2px solid var(--border);background:white;color:var(--navy);font-size:14px;font-weight:600;cursor:pointer;text-align:left;line-height:1.5;transition:all .2s ease;">
            ${_esc(opt)}
          </button>`).join('')}
      </div>
      <div id="vb-feedback" style="display:none;margin-top:14px;padding:14px 18px;border-radius:12px;font-size:14px;line-height:1.5;"></div>`;

    if (!timer) {
      timer = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('vb-timer');
        if (timerEl) {
          timerEl.textContent = `⏱ ${timeLeft}s`;
          timerEl.style.color = timeLeft <= 10 ? '#ef4444' : 'var(--navy)';
        }
        if (timeLeft <= 0) {
          clearInterval(timer);
          _endVocabBlitz(score);
        }
      }, 1000);
    }
  }

  window._vbAnswer = (idx, correct) => {
    const opts = document.querySelectorAll('[id^="vb-opt-"]');
    opts.forEach(o => { o.style.pointerEvents = 'none'; });
    const btn = document.getElementById(`vb-opt-${idx}`);
    if (correct) {
      score += 10 + Math.floor(timeLeft / 2); // Bonus for speed
      if (btn) { btn.style.background = '#dcfce7'; btn.style.borderColor = '#22c55e'; }
    } else {
      if (btn) { btn.style.background = '#fee2e2'; btn.style.borderColor = '#ef4444'; }
    }
    _updateScore(score);
    const fb = document.getElementById('vb-feedback');
    if (fb) {
      fb.style.display = 'block';
      fb.style.background = correct ? '#f0fdf4' : '#fef2f2';
      fb.style.color = correct ? '#166534' : '#991b1b';
      fb.textContent = correct ? 'Correct! +' + (10 + Math.floor(timeLeft / 2)) + ' points' : 'Not quite — keep going!';
    }
    setTimeout(() => { currentTermIdx++; render(); }, 1200);
  };

  _mountGame('<div>Loading...</div>');
  render();

  function _endVocabBlitz(finalScore) {
    if (timer) clearInterval(timer);
    const xp = Math.floor(finalScore / 2);
    _saveGameScore('vocab-blitz', finalScore, xp, ['academic_tone', 'critical_reading']);
    const mount = document.getElementById('game-mount');
    if (mount) mount.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:16px;">⚡</div>
        <h2 style="font-size:32px;font-weight:900;color:var(--navy);margin:0 0 8px 0;">Vocabulary Blitz Complete!</h2>
        <div style="font-size:48px;font-weight:900;color:var(--accent);margin:16px 0;">${finalScore} pts</div>
        <div style="font-size:16px;color:var(--muted);margin-bottom:24px;">+${xp} XP earned</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button onclick="window._startChallengeGame('vocab-blitz')" class="btn-primary">Play Again</button>
          <button onclick="window.goToChallengeArena()" class="btn-prev" style="display:inline-flex;">Back to Arena</button>
        </div>
      </div>`;
  }
}

// ── SOURCE RANKER ──────────────────────────────
function _startSourceRanker() {
  const roundData = _SOURCE_RANKING_ROUNDS[Math.floor(Math.random() * _SOURCE_RANKING_ROUNDS.length)];
  const shuffled = [...roundData.sources].sort(() => Math.random() - 0.5);
  let attempts = 0;

  _mountGame(`
    <div>
      <div style="background:linear-gradient(135deg,#7f1d1d,#ef4444);border-radius:16px;padding:24px;color:white;margin-bottom:20px;">
        <div style="font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:6px;">Source Credibility Challenge</div>
        <h2 style="margin:0;font-size:22px;line-height:1.3;">${_esc(roundData.prompt)}</h2>
      </div>
      <p style="font-size:13px;color:var(--muted);margin:0 0 14px 0;">Click sources in order from MOST credible (1st) to LEAST credible (last).</p>
      <div id="sr-sources" style="display:flex;flex-direction:column;gap:8px;">
        ${shuffled.map((s, i) => `
          <div id="sr-src-${i}" data-rank="${s.rank}" onclick="window._srSelect(${i})"
            style="padding:16px 20px;border-radius:14px;border:2px solid var(--border);background:white;cursor:pointer;transition:all .2s ease;">
            <div style="font-size:14px;font-weight:600;color:var(--navy);line-height:1.5;">${_esc(s.text)}</div>
          </div>`).join('')}
      </div>
      <div id="sr-selected" style="margin-top:20px;">
        <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px;">Your ranking:</div>
        <div id="sr-order" style="display:flex;flex-direction:column;gap:6px;min-height:40px;"></div>
      </div>
      <button id="sr-check" onclick="window._srCheck()" style="display:none;margin-top:16px;padding:12px 24px;border-radius:12px;border:none;background:var(--accent);color:white;font-weight:700;font-size:14px;cursor:pointer;">Check My Ranking</button>
      <div id="sr-result" style="display:none;margin-top:16px;"></div>
    </div>`);

  const selectedOrder = [];
  const sourceData = shuffled;

  window._srSelect = (idx) => {
    const el = document.getElementById(`sr-src-${idx}`);
    if (!el || el.style.opacity === '0.3') return;
    el.style.opacity = '0.3';
    el.style.pointerEvents = 'none';
    selectedOrder.push({ idx, rank: parseInt(el.dataset.rank) });

    const orderEl = document.getElementById('sr-order');
    if (orderEl) {
      orderEl.innerHTML += `<div style="padding:10px 14px;border-radius:10px;background:#f0f9ff;border:1px solid #bfdbfe;font-size:13px;">
        <strong>#${selectedOrder.length}</strong> — ${_esc(sourceData[idx].text)}
      </div>`;
    }

    if (selectedOrder.length === sourceData.length) {
      const checkBtn = document.getElementById('sr-check');
      if (checkBtn) checkBtn.style.display = 'inline-block';
    }
  };

  window._srCheck = () => {
    attempts++;
    let correct = 0;
    selectedOrder.forEach((s, i) => {
      if (s.rank === i + 1) correct++;
    });
    const score = Math.round((correct / sourceData.length) * 100);
    const xp = Math.floor(score / 3);
    _saveGameScore('source-ranker', score, xp, ['source_evaluation', 'research_skills']);
    _updateScore(score);

    const resultEl = document.getElementById('sr-result');
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = `
        <div style="padding:20px;border-radius:14px;background:${score >= 80 ? '#f0fdf4' : score >= 60 ? '#fffbeb' : '#fef2f2'};border:1px solid ${score >= 80 ? '#86efac' : score >= 60 ? '#fde68a' : '#fca5a5'};">
          <div style="font-size:24px;font-weight:900;color:${score >= 80 ? '#166534' : score >= 60 ? '#92400e' : '#991b1b'};margin-bottom:8px;">${correct}/${sourceData.length} correct — ${score} pts (+${xp} XP)</div>
          <div style="font-size:14px;font-weight:700;margin-bottom:12px;">Correct order:</div>
          ${roundData.sources.sort((a, b) => a.rank - b.rank).map(s => `
            <div style="padding:10px 14px;border-radius:10px;background:white;margin-bottom:6px;border:1px solid var(--border);">
              <div style="font-size:13px;font-weight:700;color:var(--navy);">#${s.rank}: ${_esc(s.text)}</div>
              <div style="font-size:12px;color:var(--muted);margin-top:4px;">${_esc(s.reason)}</div>
            </div>`).join('')}
          <div style="display:flex;gap:12px;margin-top:16px;">
            <button onclick="window._startChallengeGame('source-ranker')" class="btn-primary">Try Another</button>
            <button onclick="window.goToChallengeArena()" class="btn-prev" style="display:inline-flex;">Back to Arena</button>
          </div>
        </div>`;
    }
  };
}

// ── PEEL BUILDER ───────────────────────────────
function _startPeelBuilder() {
  const roundData = _PEEL_ROUNDS[Math.floor(Math.random() * _PEEL_ROUNDS.length)];
  const shuffled = [...roundData.pieces].sort(() => Math.random() - 0.5);
  const placed = [];

  _mountGame(`
    <div>
      <div style="background:linear-gradient(135deg,#1e3a5f,#3b82f6);border-radius:16px;padding:24px;color:white;margin-bottom:20px;">
        <div style="font-size:11px;letter-spacing:.15em;text-transform:uppercase;color:rgba(255,255,255,.6);margin-bottom:6px;">PEEL Paragraph Builder</div>
        <h2 style="margin:0;font-size:20px;line-height:1.4;">Topic: "${_esc(roundData.topic)}"</h2>
      </div>
      <p style="font-size:13px;color:var(--muted);margin:0 0 14px 0;">Click the sentences in the correct PEEL order: <strong>Point → Evidence → Explanation → Link</strong></p>
      <div id="peel-pieces" style="display:flex;flex-direction:column;gap:8px;">
        ${shuffled.map((p, i) => `
          <div id="peel-piece-${i}" data-order="${p.order}" data-type="${p.type}" onclick="window._peelSelect(${i})"
            style="padding:14px 18px;border-radius:12px;border:2px solid var(--border);background:white;cursor:pointer;transition:all .2s ease;">
            <div style="font-size:13px;color:var(--navy);line-height:1.6;">${_esc(p.text)}</div>
          </div>`).join('')}
      </div>
      <div style="margin-top:20px;">
        <div style="font-size:13px;font-weight:700;color:var(--navy);margin-bottom:8px;">Your paragraph:</div>
        <div id="peel-order" style="display:flex;flex-direction:column;gap:6px;min-height:40px;"></div>
      </div>
      <div id="peel-result" style="display:none;margin-top:16px;"></div>
    </div>`);

  const pieceData = shuffled;

  window._peelSelect = (idx) => {
    const el = document.getElementById(`peel-piece-${idx}`);
    if (!el || el.style.opacity === '0.3') return;
    el.style.opacity = '0.3';
    el.style.pointerEvents = 'none';
    placed.push(pieceData[idx]);

    const typeColors = { P: '#3b82f6', E: '#22c55e', E2: '#10b981', L: '#f59e0b' };
    const typeLabels = { P: 'Point', E: 'Evidence', E2: 'Explanation', L: 'Link' };
    const p = pieceData[idx];

    const orderEl = document.getElementById('peel-order');
    if (orderEl) {
      orderEl.innerHTML += `<div style="padding:10px 14px;border-radius:10px;background:${typeColors[p.type]}10;border:1px solid ${typeColors[p.type]}44;font-size:12px;line-height:1.5;">
        <strong style="color:${typeColors[p.type]};">[${typeLabels[p.type]}]</strong> ${_esc(p.text).slice(0, 80)}...
      </div>`;
    }

    if (placed.length === pieceData.length) {
      let correct = 0;
      placed.forEach((p, i) => { if (p.order === i + 1) correct++; });
      const score = Math.round((correct / pieceData.length) * 100);
      const xp = Math.floor(score / 3);
      _saveGameScore('peel-builder', score, xp, ['argument_structure', 'evidence_use']);
      _updateScore(score);

      const resultEl = document.getElementById('peel-result');
      if (resultEl) {
        resultEl.style.display = 'block';
        resultEl.innerHTML = `
          <div style="padding:20px;border-radius:14px;background:${score === 100 ? '#f0fdf4' : score >= 50 ? '#fffbeb' : '#fef2f2'};border:1px solid ${score === 100 ? '#86efac' : score >= 50 ? '#fde68a' : '#fca5a5'};">
            <div style="font-size:24px;font-weight:900;color:${score === 100 ? '#166534' : score >= 50 ? '#92400e' : '#991b1b'};">${correct}/${pieceData.length} in correct position — ${score} pts (+${xp} XP)</div>
            ${score < 100 ? `<p style="font-size:13px;color:var(--muted);margin:8px 0 0 0;">Correct order: Point → Evidence → Explanation → Link. Each component serves a specific function in building a convincing academic paragraph.</p>` : '<p style="font-size:13px;color:#166534;margin:8px 0 0 0;">Perfect PEEL structure!</p>'}
            <div style="display:flex;gap:12px;margin-top:16px;">
              <button onclick="window._startChallengeGame('peel-builder')" class="btn-primary">Try Another</button>
              <button onclick="window.goToChallengeArena()" class="btn-prev" style="display:inline-flex;">Back to Arena</button>
            </div>
          </div>`;
      }
    }
  };
}

// ── AI DETECTIVE ───────────────────────────────
function _startAiDetective() {
  let level = 0;
  let score = 0;
  let itemIdx = 0;

  function renderItem() {
    if (level >= _AI_DETECTIVE_ROUNDS.length) {
      _endAiDetective(score);
      return;
    }
    const items = _AI_DETECTIVE_ROUNDS[level];
    if (itemIdx >= items.length) {
      level++;
      itemIdx = 0;
      renderItem();
      return;
    }
    const item = items[itemIdx];
    const mount = document.getElementById('game-mount');
    if (!mount) return;

    mount.innerHTML = `
      <div style="text-align:center;margin-bottom:16px;">
        <div style="font-size:13px;color:var(--muted);margin-bottom:4px;">Level ${level + 1}/${_AI_DETECTIVE_ROUNDS.length} · Passage ${itemIdx + 1}/${items.length}</div>
        <div style="display:inline-block;padding:4px 12px;border-radius:8px;background:${level === 0 ? '#dcfce7' : level === 1 ? '#fef3c7' : '#fee2e2'};font-size:11px;font-weight:700;color:${level === 0 ? '#166534' : level === 1 ? '#92400e' : '#991b1b'};">${level === 0 ? 'Easy' : level === 1 ? 'Medium' : 'Hard'}</div>
      </div>
      <div style="background:#f8fafc;border:1px solid var(--border);border-radius:16px;padding:24px;margin-bottom:20px;">
        <p style="font-size:15px;line-height:1.8;color:var(--navy);margin:0;font-style:italic;">"${_esc(item.text)}"</p>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
        <button onclick="window._adGuess(true, ${item.isAI})" style="padding:20px;border-radius:14px;border:2px solid #6366f1;background:#6366f122;color:var(--navy);font-size:18px;font-weight:800;cursor:pointer;transition:all .2s ease;">🤖 AI-Generated</button>
        <button onclick="window._adGuess(false, ${item.isAI})" style="padding:20px;border-radius:14px;border:2px solid #22c55e;background:#22c55e22;color:var(--navy);font-size:18px;font-weight:800;cursor:pointer;transition:all .2s ease;">✍️ Human-Written</button>
      </div>
      <div id="ad-feedback" style="display:none;margin-top:16px;padding:16px 20px;border-radius:14px;font-size:14px;line-height:1.6;"></div>`;
  }

  window._adGuess = (guessedAI, actuallyAI) => {
    const correct = guessedAI === actuallyAI;
    const points = (level + 1) * 15;
    if (correct) score += points;
    _updateScore(score);

    const items = _AI_DETECTIVE_ROUNDS[level];
    const item = items[itemIdx];
    const fb = document.getElementById('ad-feedback');
    if (fb) {
      fb.style.display = 'block';
      fb.style.background = correct ? '#f0fdf4' : '#fef2f2';
      fb.style.border = `1px solid ${correct ? '#86efac' : '#fca5a5'}`;
      fb.innerHTML = `
        <strong style="color:${correct ? '#166534' : '#991b1b'};">${correct ? '✅ Correct!' : '❌ Wrong!'} ${actuallyAI ? 'This was AI-generated.' : 'This was written by a human.'}</strong>
        ${correct ? ` +${points} points` : ''}
        <br><br><strong>Clue:</strong> ${_esc(item.clue)}`;
    }

    // Disable buttons
    document.querySelectorAll('#game-mount button').forEach(b => { b.style.pointerEvents = 'none'; });

    setTimeout(() => { itemIdx++; renderItem(); }, 3000);
  };

  _mountGame('<div>Loading...</div>');
  renderItem();

  function _endAiDetective(finalScore) {
    const xp = Math.floor(finalScore / 2);
    _saveGameScore('ai-detective', finalScore, xp, ['ai_literacy', 'critical_reading']);
    const mount = document.getElementById('game-mount');
    if (mount) mount.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:16px;">🕵️</div>
        <h2 style="font-size:32px;font-weight:900;color:var(--navy);margin:0 0 8px 0;">Investigation Complete!</h2>
        <div style="font-size:48px;font-weight:900;color:var(--accent);margin:16px 0;">${finalScore} pts</div>
        <div style="font-size:16px;color:var(--muted);margin-bottom:24px;">+${xp} XP earned</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button onclick="window._startChallengeGame('ai-detective')" class="btn-primary">Play Again</button>
          <button onclick="window.goToChallengeArena()" class="btn-prev" style="display:inline-flex;">Back to Arena</button>
        </div>
      </div>`;
  }
}

// ── CITATION FIXER ─────────────────────────────
function _startCitationFixer() {
  let currentIdx = 0;
  let score = 0;
  let timeLeft = 120;
  let timer = null;
  const rounds = [..._CITATION_FIX_ROUNDS].sort(() => Math.random() - 0.5);

  function render() {
    if (currentIdx >= rounds.length || timeLeft <= 0) {
      endGame();
      return;
    }
    const r = rounds[currentIdx];
    const mount = document.getElementById('game-mount');
    if (!mount) return;

    mount.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <span style="font-size:13px;color:var(--muted);">Citation ${currentIdx + 1}/${rounds.length}</span>
        <span id="cf-timer" style="font-size:20px;font-weight:800;color:${timeLeft <= 20 ? '#ef4444' : 'var(--navy)'};">⏱ ${timeLeft}s</span>
      </div>
      <div style="background:#fef2f2;border:2px solid #fca5a5;border-radius:14px;padding:20px;margin-bottom:16px;">
        <div style="font-size:11px;color:#991b1b;font-weight:700;text-transform:uppercase;letter-spacing:.1em;margin-bottom:8px;">Broken Citation</div>
        <p style="font-size:15px;color:#991b1b;font-family:var(--font-mono);line-height:1.7;margin:0;">${_esc(r.broken)}</p>
      </div>
      <label style="font-size:13px;font-weight:700;color:var(--navy);display:block;margin-bottom:6px;">Type the corrected APA 7th citation:</label>
      <textarea id="cf-input" rows="3" style="width:100%;padding:14px;border:2px solid var(--border);border-radius:12px;font-size:14px;font-family:var(--font-mono);line-height:1.6;resize:vertical;box-sizing:border-box;" placeholder="Type the corrected citation here..."></textarea>
      <div style="display:flex;gap:10px;margin-top:12px;">
        <button onclick="window._cfSubmit()" class="btn-primary">Submit Fix</button>
        <button onclick="window._cfShowAnswer()" class="btn-prev" style="display:inline-flex;">Show Answer</button>
      </div>
      <div id="cf-feedback" style="display:none;margin-top:14px;"></div>`;

    if (!timer) {
      timer = setInterval(() => {
        timeLeft--;
        const timerEl = document.getElementById('cf-timer');
        if (timerEl) {
          timerEl.textContent = `⏱ ${timeLeft}s`;
          timerEl.style.color = timeLeft <= 20 ? '#ef4444' : 'var(--navy)';
        }
        if (timeLeft <= 0) { clearInterval(timer); endGame(); }
      }, 1000);
    }
  }

  window._cfSubmit = () => {
    const input = document.getElementById('cf-input')?.value?.trim() || '';
    const r = rounds[currentIdx];
    // Simple similarity check
    const normalize = s => s.toLowerCase().replace(/\s+/g, ' ').replace(/[^\w\s]/g, '').trim();
    const similarity = _stringSimilarity(normalize(input), normalize(r.fixed));
    const points = Math.round(similarity * 30);
    score += points;
    _updateScore(score);
    _cfShowResult(points, r);
  };

  window._cfShowAnswer = () => {
    _cfShowResult(0, rounds[currentIdx]);
  };

  function _cfShowResult(points, r) {
    const fb = document.getElementById('cf-feedback');
    if (fb) {
      fb.style.display = 'block';
      fb.innerHTML = `
        <div style="padding:16px;border-radius:12px;background:#f0fdf4;border:1px solid #86efac;">
          <div style="font-size:15px;font-weight:700;color:#166534;margin-bottom:8px;">${points > 0 ? `+${points} points!` : 'No points — study the correct version:'}</div>
          <div style="font-size:14px;font-family:var(--font-mono);color:#166534;line-height:1.6;margin-bottom:10px;">${_esc(r.fixed)}</div>
          <div style="font-size:12px;color:var(--muted);">
            <strong>Errors fixed:</strong>
            <ul style="margin:4px 0 0 0;padding-left:16px;">${r.errors.map(e => `<li>${_esc(e)}</li>`).join('')}</ul>
          </div>
        </div>`;
    }
    setTimeout(() => { currentIdx++; render(); }, 3500);
  }

  _mountGame('<div>Loading...</div>');
  render();

  function endGame() {
    if (timer) clearInterval(timer);
    const xp = Math.floor(score / 2);
    _saveGameScore('citation-fixer', score, xp, ['citation_practice']);
    const mount = document.getElementById('game-mount');
    if (mount) mount.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:16px;">🔧</div>
        <h2 style="font-size:32px;font-weight:900;color:var(--navy);margin:0 0 8px 0;">Citation Repair Complete!</h2>
        <div style="font-size:48px;font-weight:900;color:var(--accent);margin:16px 0;">${score} pts</div>
        <div style="font-size:16px;color:var(--muted);margin-bottom:24px;">+${xp} XP earned · ${currentIdx}/${rounds.length} citations attempted</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button onclick="window._startChallengeGame('citation-fixer')" class="btn-primary">Play Again</button>
          <button onclick="window.goToChallengeArena()" class="btn-prev" style="display:inline-flex;">Back to Arena</button>
        </div>
      </div>`;
  }
}

// Simple string similarity (Dice coefficient)
function _stringSimilarity(a, b) {
  if (a === b) return 1;
  if (a.length < 2 || b.length < 2) return 0;
  const bigrams = new Map();
  for (let i = 0; i < a.length - 1; i++) {
    const bg = a.substring(i, i + 2);
    bigrams.set(bg, (bigrams.get(bg) || 0) + 1);
  }
  let matches = 0;
  for (let i = 0; i < b.length - 1; i++) {
    const bg = b.substring(i, i + 2);
    const count = bigrams.get(bg) || 0;
    if (count > 0) { bigrams.set(bg, count - 1); matches++; }
  }
  return (2 * matches) / (a.length + b.length - 2);
}

// ── THE WEAKEST LINK ──────────────────────────

const _WEAKEST_LINK_QUESTIONS = [
  // Critical Reading
  { skill: 'critical_reading', q: 'What does it mean to read "against the grain"?', a: 'To question the author\'s assumptions and read critically', wrong: ['To read from right to left', 'To focus on grammar errors', 'To read only the conclusion'] },
  { skill: 'critical_reading', q: 'In academic reading, what is a "claim"?', a: 'A statement the author wants you to accept as true', wrong: ['A legal complaint', 'A chapter title', 'A reference list entry'] },
  { skill: 'critical_reading', q: 'What is the purpose of a literature review?', a: 'To synthesise existing research and identify gaps', wrong: ['To list every book on the topic', 'To review the grammar of literature', 'To write a book summary'] },
  { skill: 'critical_reading', q: 'What does "interrogating a text" mean?', a: 'Asking critical questions about the text\'s claims, evidence, and assumptions', wrong: ['Reading it aloud', 'Memorising key quotes', 'Highlighting every sentence'] },
  { skill: 'critical_reading', q: 'A text\'s "warrant" connects what two things?', a: 'The claim and the evidence', wrong: ['The title and the conclusion', 'The author and the publisher', 'The introduction and the bibliography'] },
  // Source Evaluation
  { skill: 'source_evaluation', q: 'What does the CRAAP test evaluate?', a: 'Currency, Relevance, Authority, Accuracy, Purpose of a source', wrong: ['The quality of writing style', 'The length of an article', 'Whether the source is available online'] },
  { skill: 'source_evaluation', q: 'Which is generally the MOST credible source?', a: 'A peer-reviewed journal article', wrong: ['A Wikipedia article', 'A popular blog post', 'A social media thread'] },
  { skill: 'source_evaluation', q: 'What makes a source "primary"?', a: 'It provides first-hand evidence or original data', wrong: ['It is the first result on Google', 'It was published before other sources', 'It has the most citations'] },
  { skill: 'source_evaluation', q: '"Predatory journals" are problematic because they...', a: 'Publish without proper peer review for profit', wrong: ['Are only available in print', 'Have too many authors', 'Use complicated language'] },
  { skill: 'source_evaluation', q: 'What is "lateral reading"?', a: 'Checking what other sources say about a claim before reading deeply', wrong: ['Reading a text from side to side', 'Skimming multiple chapters at once', 'Reading in a second language'] },
  // Citation Practice
  { skill: 'citation_practice', q: 'In APA 7th, how do you cite a source with 3 or more authors?', a: 'First author et al.', wrong: ['List all authors every time', 'First and last author only', 'Use the title instead'] },
  { skill: 'citation_practice', q: 'What is a DOI?', a: 'A Digital Object Identifier — a permanent link to an academic source', wrong: ['Department of Information', 'A type of citation style', 'A database for journals'] },
  { skill: 'citation_practice', q: 'When must you include a page number in an APA in-text citation?', a: 'When using a direct quote', wrong: ['Always', 'Never', 'Only for books'] },
  { skill: 'citation_practice', q: 'Self-plagiarism means...', a: 'Reusing your own previous work without acknowledgement', wrong: ['Plagiarising yourself by accident', 'Using your own name incorrectly', 'Writing an autobiography'] },
  { skill: 'citation_practice', q: 'What goes in an APA reference list that does NOT go in a bibliography?', a: 'Nothing — APA uses a reference list with only cited sources', wrong: ['Background reading', 'Recommended texts', 'Course textbooks'] },
  // Academic Tone
  { skill: 'academic_tone', q: 'Which is written in appropriate academic tone?', a: '"The findings suggest a correlation between the variables"', wrong: ['"I totally think they\'re connected"', '"Obviously everyone knows this"', '"The data is kinda showing stuff"'] },
  { skill: 'academic_tone', q: 'What is "hedging" in academic writing?', a: 'Using cautious language to avoid overstating claims', wrong: ['Writing with bushes and garden metaphors', 'Avoiding the topic', 'Making your writing shorter'] },
  { skill: 'academic_tone', q: 'Which word is an appropriate hedging term?', a: 'Suggests', wrong: ['Proves', 'Obviously', 'Definitely'] },
  { skill: 'academic_tone', q: 'Why should you avoid "I think" in academic writing?', a: 'It is subjective — use evidence-based framing instead', wrong: ['It is too short', 'It makes the essay longer', 'Lecturers dislike the letter I'] },
  { skill: 'academic_tone', q: 'What is the "passive voice" useful for in academic writing?', a: 'Emphasising the action or result rather than the actor', wrong: ['Making sentences longer', 'Hiding spelling mistakes', 'Impressing the reader'] },
  // AI Literacy
  { skill: 'ai_literacy', q: 'What is an "AI hallucination"?', a: 'When an AI generates false information that sounds plausible', wrong: ['When a human sees AI where there is none', 'When an AI crashes', 'When an AI shows images'] },
  { skill: 'ai_literacy', q: 'Why can\'t you cite ChatGPT as an academic source?', a: 'It is not peer-reviewed, not verifiable, and may hallucinate', wrong: ['It costs money', 'It only works in English', 'It was invented too recently'] },
  { skill: 'ai_literacy', q: 'What does "prompt engineering" mean?', a: 'Designing input instructions to get better outputs from AI', wrong: ['Building physical robots', 'Coding an AI from scratch', 'Fixing broken AI systems'] },
  { skill: 'ai_literacy', q: 'AI-generated text often lacks...', a: 'Original critical thinking and verifiable sources', wrong: ['Proper spelling', 'Long paragraphs', 'Any useful content at all'] },
  { skill: 'ai_literacy', q: 'The SIFT method helps you...', a: 'Stop, Investigate, Find better coverage, Trace claims to their source', wrong: ['Sort, Index, File, Tabulate research', 'Save, Import, Format, Transform data', 'Scan, Identify, Fix, Test writing'] },
  // Argument Structure
  { skill: 'argument_structure', q: 'What does PEEL stand for?', a: 'Point, Evidence, Explanation, Link', wrong: ['Plan, Edit, Evaluate, List', 'Purpose, Example, Ending, Length', 'Paragraph, Essay, Explanation, Logic'] },
  { skill: 'argument_structure', q: 'A "counter-argument" is...', a: 'An opposing viewpoint that you acknowledge and respond to', wrong: ['An argument at a shop counter', 'A second essay on the same topic', 'Arguing with your lecturer'] },
  { skill: 'argument_structure', q: 'What is a "thesis statement"?', a: 'The central argument or position of your essay', wrong: ['A PhD dissertation', 'The first sentence of any essay', 'A theory that has been proven'] },
  { skill: 'argument_structure', q: 'Why is a "straw man" fallacy problematic?', a: 'It misrepresents the opposing argument to make it easier to attack', wrong: ['It uses agricultural metaphors', 'It is too informal', 'It only applies to science writing'] },
  { skill: 'argument_structure', q: 'What makes evidence "relevant"?', a: 'It directly supports the specific claim being made', wrong: ['It is recent', 'It comes from a famous author', 'It includes statistics'] },
  // Evidence Use
  { skill: 'evidence_use', q: 'What is the difference between a direct quote and a paraphrase?', a: 'A direct quote uses the author\'s exact words; a paraphrase restates the idea in your own words', wrong: ['There is no difference', 'Paraphrases are always shorter', 'Direct quotes don\'t need citations'] },
  { skill: 'evidence_use', q: 'When should you use a direct quote instead of paraphrasing?', a: 'When the original wording is particularly powerful or precise', wrong: ['Always — quotes are better', 'Never — paraphrasing is always preferred', 'Only when you\'re running out of words'] },
  { skill: 'evidence_use', q: 'What is "cherry-picking" evidence?', a: 'Selecting only evidence that supports your view while ignoring contradicting evidence', wrong: ['Using fruit-related metaphors', 'Choosing the best quotes', 'Reading only the best journals'] },
  { skill: 'evidence_use', q: 'What does it mean to "engage with" a source?', a: 'Analysing, questioning, and connecting the source to your argument', wrong: ['Mentioning the title', 'Including it in the reference list', 'Reading it once quickly'] },
  { skill: 'evidence_use', q: 'A "signal phrase" is used to...', a: 'Introduce a quote or paraphrase by naming the author', wrong: ['Start every paragraph', 'Signal the end of an essay', 'Send a message to the reader'] },
  // Research Skills
  { skill: 'research_skills', q: 'What is a "Boolean search"?', a: 'Using AND, OR, NOT operators to refine database searches', wrong: ['Searching for true/false answers', 'A search engine for maths', 'A search in a specific language'] },
  { skill: 'research_skills', q: 'What does "peer review" mean?', a: 'Evaluation of research by other experts in the same field before publication', wrong: ['Students reviewing each other\'s work', 'An employer performance review', 'Looking at what peers have published'] },
  { skill: 'research_skills', q: 'What is an "abstract" in a research article?', a: 'A brief summary of the entire study including methods, results, and conclusions', wrong: ['An artistic painting related to the research', 'An abstract concept or theory', 'The first paragraph of the introduction'] },
  { skill: 'research_skills', q: 'What is the purpose of a "control group" in research?', a: 'To provide a baseline for comparison with the experimental group', wrong: ['To control the budget', 'To manage the research team', 'To control which sources are used'] },
  { skill: 'research_skills', q: 'What does "operationalise" mean in research?', a: 'To define a concept in measurable terms so it can be studied', wrong: ['To perform surgery', 'To make research operational', 'To publish the findings'] },
];

const _CHAIN_VALUES = [50, 100, 150, 200, 300, 400, 500, 750, 1000];

function _startWeakestLink() {
  const questions = [..._WEAKEST_LINK_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 20);
  let qIdx = 0;
  let banked = 0;
  let chainPos = 0;
  let correct = 0;
  let wrong = 0;
  let timeLeft = 90;
  let timer = null;
  let _answering = false; // prevent double-tap

  function renderQ() {
    if (qIdx >= questions.length || timeLeft <= 0) {
      endGame();
      return;
    }
    _answering = false;
    const q = questions[qIdx];
    const options = [q.a, ...q.wrong].sort(() => Math.random() - 0.5);
    // Store correct index so we can highlight it on wrong answer
    const correctIdx = options.indexOf(q.a);
    const chainHtml = _CHAIN_VALUES.map((v, i) => {
      const active = i === chainPos;
      const passed = i < chainPos;
      return `<div style="padding:4px 10px;border-radius:6px;font-size:12px;font-weight:700;
        background:${active ? '#dc2626' : passed ? '#22c55e22' : '#f1f5f9'};
        color:${active ? 'white' : passed ? '#16a34a' : '#94a3b8'};
        border:1px solid ${active ? '#dc2626' : passed ? '#22c55e44' : '#e2e8f0'};">
        ${v}</div>`;
    }).reverse().join('');

    const skillInfo = SKILL_MAP[q.skill] || {};
    const mount = document.getElementById('game-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 120px;gap:20px;align-items:start;">
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
            <div style="font-size:13px;font-weight:700;color:#dc2626;">
              Q${qIdx + 1} of ${questions.length} · ${skillInfo.icon || ''} ${skillInfo.label || q.skill}
            </div>
            <div style="display:flex;gap:12px;align-items:center;">
              <div id="wl-timer" style="font-size:20px;font-weight:900;color:${timeLeft <= 15 ? '#dc2626' : 'var(--navy)'};">${timeLeft}s</div>
              <button onclick="window._wlBank()" style="padding:8px 18px;border-radius:10px;border:2px solid #f59e0b;background:#f59e0b22;color:#b45309;font-weight:800;font-size:13px;cursor:pointer;transition:all .15s ease;"
                onmouseover="this.style.background='#f59e0b44'" onmouseout="this.style.background='#f59e0b22'">
                BANK ${_CHAIN_VALUES[chainPos - 1] || 0}
              </button>
            </div>
          </div>
          <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:0 4px 12px rgba(0,0,0,.04);margin-bottom:16px;">
            <h2 id="wl-question-text" style="font-size:18px;font-weight:800;color:var(--navy);margin:0 0 20px 0;line-height:1.5;">${_esc(q.q)}</h2>
            <div style="display:grid;gap:10px;">
              ${options.map((opt, i) => `
                <button id="wl-opt-${i}" data-correct="${i === correctIdx ? '1' : '0'}" onclick="window._wlAnswer(${i}, ${i === correctIdx})"
                  style="text-align:left;padding:14px 18px;border-radius:12px;border:2px solid var(--border);background:white;
                  font-size:14px;font-weight:600;color:var(--navy);cursor:pointer;transition:all .2s ease;"
                  onmouseover="this.style.borderColor='#dc2626';this.style.background='#fef2f2'"
                  onmouseout="this.style.borderColor='var(--border)';this.style.background='white'">
                  ${String.fromCharCode(65 + i)}. ${_esc(opt)}
                </button>`).join('')}
            </div>
          </div>
          <div style="display:flex;gap:16px;font-size:13px;color:var(--muted);">
            <span>Banked: <strong style="color:#16a34a;">${banked}</strong></span>
            <span>Correct: <strong style="color:var(--navy);">${correct}</strong></span>
            <span>Wrong: <strong style="color:#dc2626;">${wrong}</strong></span>
          </div>
        </div>
        <div style="display:flex;flex-direction:column;gap:4px;padding:12px;background:#0f172a;border-radius:14px;">
          <div style="font-size:10px;text-transform:uppercase;letter-spacing:.1em;color:#64748b;text-align:center;margin-bottom:4px;font-weight:700;">Chain</div>
          ${chainHtml}
        </div>
      </div>`;

    // Announcer reads the question aloud
    _announce(q.q, 1.1);
  }

  function startTimer() {
    _sfxStartClock(60); // ticking at 1/sec
    timer = setInterval(() => {
      timeLeft--;
      const el = document.getElementById('wl-timer');
      if (el) {
        el.textContent = `${timeLeft}s`;
        el.style.color = timeLeft <= 15 ? '#dc2626' : 'var(--navy)';
        if (timeLeft <= 15) el.style.animation = 'none'; // stop any prior
      }
      // Switch to urgent ticking at 15s
      if (timeLeft === 15) _sfxStartUrgentClock();
      // Countdown beeps for last 3 seconds
      if (timeLeft <= 3 && timeLeft > 0) _sfxCountdownBeep(timeLeft === 1);
      if (timeLeft <= 0) {
        clearInterval(timer);
        _sfxStopClock();
        endGame();
      }
    }, 1000);
  }

  function endGame() {
    if (timer) clearInterval(timer);
    _sfxStopClock();
    _stopAnnouncer();
    // Auto-bank remaining chain
    banked += _CHAIN_VALUES[chainPos - 1] || 0;
    const finalScore = banked;
    const xp = Math.round(finalScore / 5);
    _saveGameScore('weakest-link', finalScore, ['critical_reading', 'source_evaluation', 'citation_practice', 'academic_tone', 'ai_literacy', 'argument_structure', 'evidence_use', 'research_skills']);
    _updateScore(finalScore);

    const mount = document.getElementById('game-mount');
    if (!mount) return;
    const accuracy = qIdx > 0 ? Math.round((correct / qIdx) * 100) : 0;
    const grade = accuracy >= 90 ? 'Strongest Link!' : accuracy >= 70 ? 'Strong Contender' : accuracy >= 50 ? 'Middle of the Pack' : 'You ARE the Weakest Link!';
    const gradeColor = accuracy >= 90 ? '#22c55e' : accuracy >= 70 ? '#3b82f6' : accuracy >= 50 ? '#f59e0b' : '#dc2626';

    // Victory fanfare or dramatic sound
    if (accuracy >= 70) _sfxVictory(); else _sfxReveal();
    // Announcer reads the verdict
    setTimeout(() => _announce(`Round complete. ${grade}. You scored ${finalScore} points with ${accuracy} percent accuracy.`, 0.9), 600);

    mount.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:12px;">${accuracy >= 70 ? '🏆' : '🔗'}</div>
        <h2 style="font-size:28px;font-weight:900;color:var(--navy);margin:0 0 6px 0;">Round Complete!</h2>
        <div style="font-size:22px;font-weight:900;color:${gradeColor};margin:12px 0;">${grade}</div>
        <div style="font-size:42px;font-weight:900;color:var(--accent);margin:16px 0;">${finalScore} pts</div>
        <div style="font-size:15px;color:var(--muted);margin-bottom:24px;">+${xp} XP earned</div>
        <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;max-width:400px;margin:0 auto 24px auto;">
          <div style="padding:12px;border-radius:12px;background:#f0fdf4;border:1px solid #bbf7d0;">
            <div style="font-size:11px;color:#16a34a;text-transform:uppercase;">Correct</div>
            <div style="font-size:24px;font-weight:900;color:#166534;">${correct}</div>
          </div>
          <div style="padding:12px;border-radius:12px;background:#fef2f2;border:1px solid #fecaca;">
            <div style="font-size:11px;color:#dc2626;text-transform:uppercase;">Wrong</div>
            <div style="font-size:24px;font-weight:900;color:#991b1b;">${wrong}</div>
          </div>
          <div style="padding:12px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe;">
            <div style="font-size:11px;color:#3b82f6;text-transform:uppercase;">Accuracy</div>
            <div style="font-size:24px;font-weight:900;color:#1d4ed8;">${accuracy}%</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button onclick="window._startChallengeGame('weakest-link')" class="btn-primary">Play Again</button>
          <button onclick="window.goToChallengeArena()" class="btn-prev" style="display:inline-flex;">Back to Arena</button>
        </div>
      </div>`;
  }

  window._wlAnswer = (idx, isCorrect) => {
    if (_answering) return;
    _answering = true;
    _stopAnnouncer();
    // Disable all buttons
    for (let i = 0; i < 4; i++) {
      const btn = document.getElementById(`wl-opt-${i}`);
      if (btn) { btn.disabled = true; btn.style.cursor = 'default'; btn.onmouseover = null; btn.onmouseout = null; }
    }
    const btn = document.getElementById(`wl-opt-${idx}`);
    if (isCorrect) {
      correct++;
      chainPos = Math.min(chainPos + 1, _CHAIN_VALUES.length - 1);
      _sfxCorrect();
      if (btn) { btn.style.background = '#f0fdf4'; btn.style.borderColor = '#22c55e'; btn.style.color = '#166534'; }
    } else {
      wrong++;
      chainPos = 0;
      _sfxWrong();
      if (btn) { btn.style.background = '#fef2f2'; btn.style.borderColor = '#dc2626'; btn.style.color = '#991b1b'; }
      // Highlight the correct answer in green
      for (let i = 0; i < 4; i++) {
        const b = document.getElementById(`wl-opt-${i}`);
        if (b && b.getAttribute('data-correct') === '1') {
          b.style.background = '#f0fdf4'; b.style.borderColor = '#22c55e'; b.style.color = '#166534';
        }
      }
    }
    qIdx++;
    _updateScore(banked + (_CHAIN_VALUES[chainPos - 1] || 0));
    setTimeout(renderQ, 800);
  };

  window._wlBank = () => {
    if (chainPos > 0) {
      _sfxBank();
      _announce(`Bank! ${_CHAIN_VALUES[chainPos - 1]} points secured.`, 1.2);
      banked += _CHAIN_VALUES[chainPos - 1];
      chainPos = 0;
      _updateScore(banked);
    }
    renderQ();
  };

  // Intro sequence with announcer
  _mountGame(`
    <div style="text-align:center;padding:40px 20px;">
      <div style="font-size:64px;margin-bottom:12px;">🔗</div>
      <h2 style="font-size:24px;font-weight:900;color:var(--navy);">The Weakest Link</h2>
      <p style="color:var(--muted);margin:12px 0;">20 rapid-fire questions · 90 seconds · Bank before the chain breaks!</p>
      <p style="font-size:13px;color:var(--muted);line-height:1.8;">Answer correctly to climb the chain. <strong>BANK</strong> to lock in your points before a wrong answer resets the chain to zero!</p>
      <div id="wl-countdown" style="font-size:48px;font-weight:900;color:#dc2626;margin-top:20px;"></div>
    </div>`);

  _announce('Welcome to The Weakest Link. You have 90 seconds to answer 20 questions. Bank your points before the chain breaks. Let us begin.', 1.0, () => {
    // 3-2-1 countdown after announcer finishes
    let count = 3;
    const cdEl = document.getElementById('wl-countdown');
    const cdInterval = setInterval(() => {
      if (cdEl) cdEl.textContent = count;
      _sfxCountdownBeep(count === 1);
      count--;
      if (count < 0) {
        clearInterval(cdInterval);
        renderQ();
        startTimer();
      }
    }, 800);
  });
}

// ── RESEARCH FEUD ─────────────────────────────

const _RESEARCH_FEUD_ROUNDS = [
  {
    question: 'What percentage of university students admit to using AI tools for assignments? (UNESCO 2024)',
    answer: 56,
    unit: '%',
    source: 'UNESCO Global Education Monitoring Report, 2024',
    funFact: 'More than half of students globally reported using AI, but only 20% said their university had clear AI policies.',
  },
  {
    question: 'What percentage of citations generated by ChatGPT are completely fabricated? (Alkaissi & McFarlane 2023)',
    answer: 47,
    unit: '%',
    source: 'Alkaissi, H. & McFarlane, S. (2023). Artificial Hallucinations in ChatGPT.',
    funFact: 'Nearly half of all academic references generated by GPT-3.5 pointed to papers, authors, or journals that simply do not exist.',
  },
  {
    question: 'How many hours per week does the average South African university student spend reading academic texts? (CHE 2023)',
    answer: 4,
    unit: 'hours',
    source: 'Council on Higher Education (CHE) Student Engagement Survey, 2023',
    funFact: 'This is about one-third of what lecturers expect. Students in humanities read slightly more than STEM students.',
  },
  {
    question: 'What percentage of first-year students at SA universities drop out before second year? (DHET 2023)',
    answer: 33,
    unit: '%',
    source: 'Department of Higher Education and Training statistics, 2023',
    funFact: 'Academic literacy and language barriers are among the top 3 reasons cited, alongside financial pressure.',
  },
  {
    question: 'What percentage of academic papers are retracted due to plagiarism? (Retraction Watch 2023)',
    answer: 24,
    unit: '%',
    source: 'Retraction Watch Database Analysis, 2023',
    funFact: 'Plagiarism is the second most common reason for retraction, after data fabrication/falsification.',
  },
  {
    question: 'What is the average Flesch Reading Ease score of published journal articles? (Plavén-Sigray et al.)',
    answer: 27,
    unit: 'points',
    source: 'Plavén-Sigray, P. et al. (2017). The readability of scientific texts is decreasing over time. eLife.',
    funFact: 'A score of 27 means academic articles are harder to read than legal documents. Readability has dropped steadily since the 1880s.',
  },
  {
    question: 'How many words does the average undergraduate essay contain? (Nesi & Gardner 2012)',
    answer: 2200,
    unit: 'words',
    source: 'Nesi, H. & Gardner, S. (2012). Genres across the Disciplines.',
    funFact: 'Essay length varies hugely by discipline — law students write the longest essays, averaging 3,400 words.',
  },
  {
    question: 'What percentage of students report difficulty distinguishing credible from non-credible online sources? (Stanford 2022)',
    answer: 82,
    unit: '%',
    source: 'Stanford History Education Group, Evaluating Information Online, 2022',
    funFact: 'Even university students struggled — most failed to identify sponsored content or check source credibility.',
  },
  {
    question: 'What percentage of academics have used AI detection tools that gave false positives on human writing? (Weber-Wulff et al. 2023)',
    answer: 63,
    unit: '%',
    source: 'Weber-Wulff, D. et al. (2023). Testing of Detection Tools for AI-Generated Text.',
    funFact: 'AI detectors are particularly unreliable for non-native English speakers, flagging their writing as AI-generated at much higher rates.',
  },
  {
    question: 'How many sources does the average undergraduate cite in a research essay? (Hendricks & Quinn 2000)',
    answer: 7,
    unit: 'sources',
    source: 'Hendricks, M. & Quinn, L. (2000). Teaching referencing as an introduction to epistemological empowerment. Teaching in Higher Education.',
    funFact: 'First-year students typically cite 5–7 sources, while honours students average 15–20. Quality matters more than quantity.',
  },
];

function _startResearchFeud() {
  const rounds = [..._RESEARCH_FEUD_ROUNDS].sort(() => Math.random() - 0.5).slice(0, 6);
  let rIdx = 0;
  let totalScore = 0;

  function renderRound() {
    if (rIdx >= rounds.length) {
      endFeud();
      return;
    }
    const r = rounds[rIdx];
    const mount = document.getElementById('game-mount');
    if (!mount) return;

    mount.innerHTML = `
      <div style="text-align:center;max-width:640px;margin:0 auto;">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
          <div style="font-size:13px;font-weight:700;color:#7c3aed;">Round ${rIdx + 1} of ${rounds.length}</div>
          <div style="font-size:13px;color:var(--muted);">Total: <strong>${totalScore} pts</strong></div>
        </div>
        <div style="background:linear-gradient(135deg,#7c3aed,#6366f1);border-radius:20px;padding:32px 28px;color:white;margin-bottom:24px;box-shadow:0 8px 24px rgba(124,58,237,.25);">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:.15em;color:rgba(255,255,255,.6);margin-bottom:12px;">Survey says...</div>
          <h2 style="font-size:20px;font-weight:800;line-height:1.5;margin:0;">${_esc(r.question)}</h2>
        </div>
        <div style="background:white;border:1px solid var(--border);border-radius:16px;padding:24px;box-shadow:0 4px 12px rgba(0,0,0,.04);">
          <label style="font-size:14px;font-weight:700;color:var(--navy);display:block;margin-bottom:12px;">Your guess:</label>
          <div style="display:flex;gap:12px;align-items:center;justify-content:center;">
            <input id="feud-guess" type="number" placeholder="?" style="width:140px;padding:14px;font-size:28px;font-weight:900;text-align:center;border:2px solid var(--border);border-radius:14px;color:var(--navy);" autofocus />
            <span style="font-size:18px;font-weight:700;color:var(--muted);">${_esc(r.unit)}</span>
          </div>
          <button id="feud-submit" onclick="window._feudSubmit()" style="margin-top:16px;padding:12px 32px;border-radius:12px;border:none;background:#7c3aed;color:white;font-weight:800;font-size:15px;cursor:pointer;transition:all .2s ease;">
            Lock In Answer
          </button>
        </div>
      </div>`;

    // Announcer reads the question
    _announce(`Round ${rIdx + 1}. ${r.question}`, 0.95);

    // Auto-focus the input
    setTimeout(() => document.getElementById('feud-guess')?.focus(), 100);
    // Allow Enter key to submit
    document.getElementById('feud-guess')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') window._feudSubmit();
    });
  }

  window._feudSubmit = () => {
    const input = document.getElementById('feud-guess');
    const btn = document.getElementById('feud-submit');
    if (!input || !btn) return;
    btn.disabled = true;
    _stopAnnouncer();

    const guess = parseFloat(input.value);
    if (isNaN(guess)) { input.style.borderColor = '#dc2626'; btn.disabled = false; return; }

    const r = rounds[rIdx];
    const diff = Math.abs(guess - r.answer);
    const pctOff = (diff / Math.max(r.answer, 1)) * 100;

    let points = 0;
    let verdict = '';
    let verdictColor = '';
    if (diff === 0) { points = 500; verdict = 'EXACT MATCH!'; verdictColor = '#22c55e'; }
    else if (pctOff <= 5) { points = 400; verdict = 'Incredibly close!'; verdictColor = '#22c55e'; }
    else if (pctOff <= 10) { points = 300; verdict = 'Very close!'; verdictColor = '#3b82f6'; }
    else if (pctOff <= 20) { points = 200; verdict = 'Good guess!'; verdictColor = '#3b82f6'; }
    else if (pctOff <= 35) { points = 100; verdict = 'In the ballpark'; verdictColor = '#f59e0b'; }
    else if (pctOff <= 50) { points = 50; verdict = 'Not quite'; verdictColor = '#f59e0b'; }
    else { points = 0; verdict = 'Way off!'; verdictColor = '#dc2626'; }

    // Dramatic reveal pause, then sound + announcement
    _sfxReveal();

    totalScore += points;
    _updateScore(totalScore);

    const mount = document.getElementById('game-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div style="text-align:center;max-width:640px;margin:0 auto;">
        <div style="font-size:14px;font-weight:700;color:#7c3aed;margin-bottom:16px;">Round ${rIdx + 1} of ${rounds.length}</div>
        <div style="background:white;border:1px solid var(--border);border-radius:20px;padding:32px;box-shadow:0 4px 12px rgba(0,0,0,.04);">
          <div style="font-size:28px;font-weight:900;color:${verdictColor};margin-bottom:8px;">${verdict}</div>
          <div style="display:flex;justify-content:center;gap:32px;margin:20px 0;">
            <div>
              <div style="font-size:12px;color:var(--muted);text-transform:uppercase;">Your guess</div>
              <div style="font-size:32px;font-weight:900;color:var(--navy);">${guess} ${_esc(r.unit)}</div>
            </div>
            <div style="width:2px;background:var(--border);"></div>
            <div>
              <div style="font-size:12px;color:var(--muted);text-transform:uppercase;">Actual answer</div>
              <div style="font-size:32px;font-weight:900;color:#7c3aed;">${r.answer} ${_esc(r.unit)}</div>
            </div>
          </div>
          <div style="font-size:18px;font-weight:800;color:${verdictColor};margin:12px 0;">+${points} points</div>
          <div style="margin-top:20px;padding:16px;background:#f5f3ff;border-radius:14px;border:1px solid #e9d5ff;text-align:left;">
            <div style="font-size:12px;font-weight:700;color:#7c3aed;text-transform:uppercase;letter-spacing:.08em;margin-bottom:6px;">Did you know?</div>
            <p style="font-size:13px;color:var(--navy);line-height:1.6;margin:0 0 8px 0;">${_esc(r.funFact)}</p>
            <p style="font-size:11px;color:var(--muted);margin:0;font-style:italic;">Source: ${_esc(r.source)}</p>
          </div>
        </div>
        <button onclick="window._feudNext()" class="btn-primary" style="margin-top:20px;">
          ${rIdx + 1 < rounds.length ? 'Next Round' : 'See Results'}
        </button>
      </div>`;

    // Announcer reads the verdict and fun fact after a brief delay
    setTimeout(() => {
      if (points >= 300) _sfxCorrect(); else if (points > 0) _sfxBank(); else _sfxWrong();
      const announceText = `${verdict}. The answer is ${r.answer} ${r.unit}. You scored ${points} points. ${r.funFact}`;
      _announce(announceText, 1.0);
    }, 500);
  };

  window._feudNext = () => {
    _stopAnnouncer();
    rIdx++;
    renderRound();
  };

  function endFeud() {
    _stopAnnouncer();
    const xp = Math.round(totalScore / 5);
    _saveGameScore('research-feud', totalScore, ['research_skills', 'evidence_use', 'critical_reading']);
    const maxPossible = rounds.length * 500;
    const pct = Math.round((totalScore / maxPossible) * 100);
    const grade = pct >= 80 ? 'Research Guru!' : pct >= 60 ? 'Sharp Analyst' : pct >= 40 ? 'Promising Researcher' : 'Keep Reading!';
    const gradeColor = pct >= 80 ? '#22c55e' : pct >= 60 ? '#3b82f6' : pct >= 40 ? '#f59e0b' : '#dc2626';

    _sfxVictory();
    setTimeout(() => _announce(`Research Feud complete! You are a ${grade}. Final score: ${totalScore} points out of ${maxPossible} possible.`, 0.9), 600);

    const mount = document.getElementById('game-mount');
    if (!mount) return;
    mount.innerHTML = `
      <div style="text-align:center;padding:40px 20px;">
        <div style="font-size:64px;margin-bottom:12px;">📊</div>
        <h2 style="font-size:28px;font-weight:900;color:var(--navy);margin:0 0 6px 0;">Research Feud Complete!</h2>
        <div style="font-size:22px;font-weight:900;color:${gradeColor};margin:12px 0;">${grade}</div>
        <div style="font-size:42px;font-weight:900;color:var(--accent);margin:16px 0;">${totalScore} pts</div>
        <div style="font-size:15px;color:var(--muted);margin-bottom:8px;">out of ${maxPossible} possible</div>
        <div style="font-size:14px;color:var(--muted);margin-bottom:24px;">+${xp} XP earned</div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button onclick="window._startChallengeGame('research-feud')" class="btn-primary">Play Again</button>
          <button onclick="window.goToChallengeArena()" class="btn-prev" style="display:inline-flex;">Back to Arena</button>
        </div>
      </div>`;
  }

  // Intro with announcer
  _mountGame(`
    <div style="text-align:center;padding:40px 20px;">
      <div style="font-size:64px;margin-bottom:12px;">📊</div>
      <h2 style="font-size:24px;font-weight:900;color:var(--navy);">Research Feud</h2>
      <p style="color:var(--muted);margin:12px 0;">Can you guess the real research statistics?</p>
      <p style="font-size:13px;color:var(--muted);line-height:1.8;">6 rounds of real findings from published studies. The closer your guess, the more points you earn!</p>
    </div>`);
  _announce('Welcome to Research Feud! Can you guess what the research actually found? Six rounds, real statistics. The closer you are, the more points you earn. Good luck!', 1.0, () => {
    setTimeout(renderRound, 500);
  });
}

// ── Game Router ────────────────────────────────
window._startChallengeGame = (gameId) => {
  switch (gameId) {
    case 'vocab-blitz': _startVocabBlitz(); break;
    case 'source-ranker': _startSourceRanker(); break;
    case 'peel-builder': _startPeelBuilder(); break;
    case 'citation-fixer': _startCitationFixer(); break;
    case 'ai-detective': _startAiDetective(); break;
    case 'weakest-link': _startWeakestLink(); break;
    case 'research-feud': _startResearchFeud(); break;
    case 'argument-wars':
    case 'register-rush':
    case 'synthesis-sprint':
      _mountGame(`
        <div style="text-align:center;padding:60px 20px;">
          <div style="font-size:64px;margin-bottom:16px;">🚧</div>
          <h2 style="font-size:28px;font-weight:900;color:var(--navy);">Coming Soon</h2>
          <p style="font-size:15px;color:var(--muted);margin:12px 0 24px 0;">This challenge is being developed. Try another game!</p>
          <button onclick="window.goToChallengeArena()" class="btn-prev" style="display:inline-flex;">Back to Arena</button>
        </div>`);
      break;
  }
};
