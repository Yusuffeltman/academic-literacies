// content/units/unit07.js — Unit 7: SIFT & Lateral Reading
import { quiz }        from '../../src/components/activities.js';
import { readingTask } from '../../src/components/reading-task.js';
import { visualTask }  from '../../src/components/visual-task.js';

const RT_CONFIG = {
  id: 'rt-u7', unitId: 'u7', unitNum: 7,
  title: 'The Professional Fact-Checker\'s Toolkit',
  level: 'Foundation Level 3', wordTarget: 140,
  source: 'Adapted for Academic Literacies — based on Caulfield (2019) Web Literacy for Student Fact-Checkers',
  vocab: [
    { term: 'SIFT', definition: 'A four-step framework for evaluating online information: Stop (pause before sharing or believing), Investigate the source, Find better coverage, Trace claims to their origin.', example: 'Before sharing a Facebook post about a new education policy, SIFT: stop your emotional reaction, investigate who posted it, find what authoritative sources say, and trace the original claim.' },
    { term: 'Lateral reading', definition: 'The practice of verifying a source by opening new tabs and reading what other people and organisations say about that source — rather than reading what the source says about itself.', example: 'Instead of reading the "About Us" page of a website, a lateral reader Googles the website name and reads what independent journalists and researchers say about it.' },
    { term: 'Upstream source', definition: 'The original source of a claim. Many media articles borrow from earlier reports, which were based on research — the upstream source is that original research.', example: 'A newspaper article about a new teaching method may cite a university press release, which was based on a journal article. The journal article is the upstream source.' },
    { term: 'Credibility', definition: 'The quality of being trusted and believed — in academic research, established through expertise, transparency, evidence, and accountability.', example: 'A peer-reviewed article in the South African Journal of Education has high credibility because it has been evaluated by independent experts.' },
  ],
  text: `<h3>The Professional Fact-Checker's Toolkit</h3>
    <p>Professional fact-checkers — journalists who work for organisations like Africa Check — do not evaluate sources by reading them very carefully. They evaluate sources by looking at what the world says <em>about</em> those sources. This approach, called lateral reading, is far more efficient and reliable than trying to evaluate a source from the inside. An unreliable website can write an extremely convincing "About Us" page. It cannot control what independent researchers, journalists, and fact-checkers write about it.</p>
    <p>The SIFT framework, developed by media literacy researcher Mike Caulfield, gives any reader a practical four-step process for evaluating any online claim. The first step — Stop — is perhaps the most important. It asks you to pause your emotional reaction before you believe or share anything. Content designed to spread misinformation is almost always designed to trigger emotion first. When you feel that spike of outrage, fear, or excitement, SIFT tells you to slow down.</p>
    <p>For student teachers in South Africa, source evaluation is a professional skill. You will encounter claims about pedagogy, policy, child development, and curriculum from parents, social media, and colleagues. Some will be well-evidenced. Many will not. Developing the discipline to check before you believe — and to model that checking for your learners — is one of the most practical things this module will give you.</p>
    <p>Lateral reading is particularly powerful because it is fast. You do not need to read an entire article to evaluate its source. Open two new tabs. Search the publication name and the author name. Read what others say. It takes three minutes and will tell you more than three hours of reading the source itself.</p>`,
  questions: [
    'What is lateral reading and why is it more effective than reading a website\'s "About Us" page? Use a specific example in your explanation.',
    'The text says the Stop step is "perhaps the most important." Why? What makes emotional content particularly difficult to evaluate critically?',
    'As a future teacher, describe one specific South African school situation where you would need to apply the full SIFT framework — either for your own professional decision-making or to help a learner.',
  ],
  writingPrompt: `Find one piece of information you recently encountered online related to education — a social media post, news article, or WhatsApp message.
Apply the SIFT framework. Write 5 sentences documenting each step: Stop (what was your initial reaction?), Investigate (what did you find when you searched the source?), Find (what did better coverage say?), Trace (where did the original claim come from?). End with your verdict: reliable, use with caution, or unreliable — and why.`,
};

const VT_CONFIG = {
  id: 'vt-u7', unitId: 'u7',
  title: 'Reading an Infographic: Is This Data Trustworthy?',
  chartType: 'infographic with statistical claims',
  visualDescription: 'A social-media style infographic making statistical claims about social media and education, with a source attribution that needs critical evaluation',
  source: 'Constructed for Academic Literacies to demonstrate common infographic credibility issues',
  observePrompt: 'This infographic is the kind you might encounter shared by teachers on social media. Study it carefully before reading critically — notice the claims it makes, and the evidence it provides for them.',
  observeChecklist: [
    'The three statistical claims made in the infographic',
    'Whether each claim has a cited source',
    'The date of the data (if provided)',
    'Any language that sounds definitive but might be oversimplified',
  ],
  visual: `<div style="background:linear-gradient(135deg,#1e40af,#3730a3);border-radius:12px;padding:28px;color:#fff;max-width:480px;margin:0 auto;">
    <div style="text-align:center;margin-bottom:20px;">
      <div style="font-size:13px;letter-spacing:2px;text-transform:uppercase;opacity:.7;margin-bottom:6px;">Education Research</div>
      <div style="font-size:22px;font-weight:800;line-height:1.2;">How Social Media Affects Student Learning</div>
    </div>
    <div style="display:flex;flex-direction:column;gap:14px;margin-bottom:20px;">
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:16px;display:flex;align-items:center;gap:16px;">
        <div style="font-size:36px;font-weight:800;color:#fbbf24;min-width:70px;text-align:center;">68%</div>
        <div style="font-size:14px;line-height:1.4;">of students check their phones during study sessions at least once every 15 minutes</div>
      </div>
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:16px;display:flex;align-items:center;gap:16px;">
        <div style="font-size:36px;font-weight:800;color:#34d399;min-width:70px;text-align:center;">40%</div>
        <div style="font-size:14px;line-height:1.4;">lower academic performance in students who use social media for more than 3 hours daily</div>
      </div>
      <div style="background:rgba(255,255,255,.12);border-radius:10px;padding:16px;display:flex;align-items:center;gap:16px;">
        <div style="font-size:36px;font-weight:800;color:#f87171;min-width:70px;text-align:center;">2hrs</div>
        <div style="font-size:14px;line-height:1.4;">the amount of sleep students lose per night due to late-night social media use</div>
      </div>
    </div>
    <div style="text-align:center;font-size:11px;opacity:.5;border-top:1px solid rgba(255,255,255,.2);padding-top:12px;">
      Source: Various studies, 2019–2022 &nbsp;|&nbsp; EduStats Research Group
    </div>
  </div>`,
  questions: [
    { q: 'Apply the "T — Trace" step of SIFT to this infographic. The source is listed as "Various studies, 2019–2022 / EduStats Research Group." What specific problems do you notice with this attribution, and what would you do to investigate further?', hint: 'What does "various studies" actually tell you? Can you verify "EduStats Research Group"?', modelAnswer: '"Various studies" is not a citable source — it does not identify which studies, who conducted them, or where they were published. "EduStats Research Group" is an anonymous organisation — a lateral reader would immediately search this name to check if it is a real, verifiable research institution or a fabricated name. The date range (2019–2022) is a positive sign but meaningless without specific citations. This infographic cannot be verified and should not be shared professionally without finding the original studies.' },
    { q: 'The infographic claims "40% lower academic performance" for students using social media more than 3 hours daily. Identify two questions a critical reader must ask before accepting this claim as fact.', hint: 'Think about: what does "lower" mean exactly? Compared to whom? How was "academic performance" measured?', modelAnswer: 'Key questions: (1) Lower than what baseline? 40% lower than students who use no social media, or 40% lower than their own performance without it — these are very different claims. (2) How was "academic performance" measured — grade average, test scores, attendance? Different measures would produce different results. Also: does the study establish causation (social media causes lower performance) or only correlation (the two co-occur)? These are the critical distinctions between statistical reporting and statistical interpretation.' },
    { q: 'You are a teacher and a colleague shares this infographic in your school WhatsApp group saying "We need to ban phones in class immediately." Using SIFT, what would you say in response?', hint: 'You are not dismissing their concern — you are asking them to verify before acting.', modelAnswer: 'I would acknowledge the concern is legitimate — phone use during class is a real issue — but note that this infographic cannot be traced to verifiable sources. Before making policy decisions, we need actual peer-reviewed research. I would suggest searching Scopus for studies on phone use and academic performance, checking Africa Check or similar for fact-checks on these specific statistics, and raising the issue with the HOD using evidence we can stand behind. Acting on unverified infographics, even well-intentioned ones, sets a poor example of the critical thinking we want to teach.' },
  ],
};

export const unit07 = {
  id: 'u7', badge: 'Unit 7', title: 'Evaluating Sources: SIFT & Lateral Reading',
  phase: 'Phase 2 — Finding & Evaluating Knowledge',
  html: () => `
    <h1>Unit 7: Evaluating Sources — SIFT & Lateral Reading</h1>
    <p class="lead">Finding sources is easy. Knowing which ones to trust — with evidence — is the scholarly skill this unit builds. You will leave with a professional-grade fact-checking toolkit and practice applying it to the kinds of visuals that circulate in teacher communities.</p>
    <div class="unit-outcomes"><div class="outcomes-label">By the end of this unit you will be able to:</div><ul>
      <li>Apply all four SIFT steps to any online source</li>
      <li>Practise lateral reading as a fast, reliable verification strategy</li>
      <li>Critically evaluate an infographic's source attribution and statistical claims</li>
      <li>Write a documented SIFT evaluation of a real source from your own life</li>
    </ul></div>
    <div class="section-label">🎬 Watch First</div>
    <p>Mike Caulfield developed SIFT after discovering why traditional "read carefully" media literacy approaches were not working. This will change how you evaluate every source from this point forward.</p>
    <div id="ivp-unit7" data-video-key="unit7" class="ivp-container"></div>
    ${quiz('q7a','Lateral reading means:',['Reading an article very carefully from beginning to end','Opening new tabs to find what other sources say about the source you are evaluating','Skimming headings and subheadings','Reading the "About Us" and "Contact" pages'],1,'✅ Lateral reading takes you off the source immediately. In under 3 minutes, you will know more about a source\'s credibility than hours of close reading. The "About Us" page is written by the source itself — it cannot verify the source\'s credibility.')}
    ${quiz('q7b','Africa Check is South Africa\'s leading independent fact-checking organisation. In the SIFT framework, Africa Check is most useful at which step?',['S — Stop: to pause your emotional reaction','I — Investigate: to check who is behind a source','F — Find better coverage: to find fact-checks on a specific claim','T — Trace: to find the original upstream source'],2,'✅ Africa Check is most useful for "Find better coverage" — they systematically fact-check claims and document their methodology with citations. They also help with "Trace" (they often identify the original source of a claim), but their primary value is providing independent, verified coverage of a claim.')}
    <h2>📊 Visual Activity: Critically Evaluating an Infographic</h2>
    <p>Infographics circulate constantly in teacher WhatsApp groups and social media. Many look professional and cite impressive statistics — but their sources cannot be verified. This activity gives you practice applying SIFT specifically to visual content.</p>
    ${visualTask('vt-u7', VT_CONFIG)}
    <div class="concept-card"><div class="concept-card-label">South African Fact-Checking Resources</div>
    <p><strong>Africa Check</strong> (africacheck.org) — covers SA politics, health, education, social issues. Transparent methodology, cites primary sources.</p>
    <p><strong>GroundUp</strong> (groundup.org.za) — evidence-based community journalism. Excellent on education, housing, social policy. Corrects errors transparently.</p></div>
    <h2>Reading & Writing Activity</h2>
    ${readingTask('rt-u7', RT_CONFIG)}
    <div class="unit-closing"><div class="unit-closing-label">Before You Move On</div>
    <p>"The goal is not to distrust everything. The goal is to know — specifically, with evidence — why you trust what you trust."</p></div>`,
};
