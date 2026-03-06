# Domain Pitfalls: Learning Analytics for Academic Literacy

**Domain:** Learning analytics -- academic literacy, Communities of Practice, self-directed learning
**Researched:** 2026-03-06
**Overall confidence:** MEDIUM (based on established LA literature; web verification unavailable this session)

**Important note on sources:** Web search and Context7 tools were unavailable during this research session. All findings draw on established learning analytics literature (Slade & Prinsloo, 2013; Tsai & Gasevic, 2017; Wise, 2014; Ferguson, 2012; Jivet et al., 2018; Dollinger & Lodge, 2018; Tanes et al., 2011; Pardo & Siemens, 2014). Confidence levels reflect this constraint. Claims should be verified against current sources during phase-specific research.

---

## Critical Pitfalls

Mistakes that cause project failure, ethical harm, or require fundamental rearchitecting.

---

### CRIT-1: Surveillance Framing -- Tracking Students Instead of Supporting Them

**What goes wrong:** The analytics system is designed around what the institution wants to know about students rather than what students need to know about their own learning. Students perceive the system as surveillance, leading to resistance, gaming, or disengagement. This is especially damaging for first-year students who are already navigating power asymmetries in academia.

**Why it happens:** Analytics projects are often driven by institutional retention concerns. The default mental model is "monitor students to intervene when they struggle" rather than "give students tools to understand and direct their own learning." Self-directed learning tracking becomes a contradiction when the tracking feels externally imposed.

**Consequences:**
- Student distrust and non-engagement with the platform
- Gaming behaviors (opening modules without reading, posting empty forum replies)
- Ethical complaints and regulatory scrutiny
- The analytics become meaningless because behavior is performative, not authentic
- Undermines the self-directed learning framework the project claims to support

**Warning signs:**
- Specifications describe what tutors/admins can see before describing what students can see
- Data points are defined by what is easy to capture, not what is meaningful to learners
- No student co-design input in analytics requirements
- Dashboards show student data to tutors that students themselves cannot access

**Prevention:**
- Design student-facing analytics FIRST. Every data point collected must answer: "How does knowing this help the student?"
- Apply Wise's (2014) "pedagogical intent" principle: every analytic must connect to a specific learning goal
- Implement transparency: students see exactly what is tracked and why
- Give students control: opt-in for sharing with tutors, ability to annotate their own data
- Frame all tracking language as "reflection support" not "monitoring"

**Phase relevance:** Must be addressed in the foundational specification phase. If the surveillance framing is baked into the data model, it cannot be fixed later without rearchitecting.

**Confidence:** HIGH -- This is the single most documented failure mode in learning analytics literature.

---

### CRIT-2: Privacy Architecture as Afterthought

**What goes wrong:** Privacy, consent, and data governance are treated as compliance checkboxes added after the data model is designed, rather than architectural constraints that shape the data model. This leads to systems that technically comply but practically violate student trust, or systems that must be fundamentally restructured when privacy requirements are properly understood.

**Why it happens:** Development teams prioritize "what data do we need?" before asking "what data are we allowed to collect and how must we handle it?" Privacy regulations (POPIA in South Africa, GDPR-aligned frameworks) are consulted late. Student consent models are bolted on.

**Consequences:**
- Data model must be rearchitected to support consent withdrawal, data deletion, purpose limitation
- Legal exposure under POPIA (Protection of Personal Information Act) or institutional ethics boards
- Student backlash if data practices are perceived as exploitative
- Inability to use collected data for research because consent was not properly scoped

**Warning signs:**
- No data protection impact assessment in early planning
- Consent model is a single "I agree" checkbox
- No data retention policy defined
- No distinction between operational data (needed for app function) and analytics data (collected for insight)
- No plan for what happens when a student withdraws consent

**Prevention:**
- Conduct a data protection impact assessment (DPIA) before designing the data model
- Design for POPIA compliance from the start: purpose specification, data minimization, retention limits
- Implement granular consent: separate consent for (a) app functionality, (b) personal analytics, (c) sharing with tutors, (d) aggregated cohort analytics, (e) research use
- Build data deletion capability into the architecture from day one
- Distinguish between: operational data (app needs to function), personal analytics (student's own reflection), shared analytics (visible to tutors/teams), aggregate analytics (cohort-level, de-identified)
- Define data ownership: students own their learning data; institution has a license to aggregate

**Phase relevance:** Must be the FIRST thing specified, before any data model design. The consent architecture constrains every other design decision.

**Confidence:** HIGH -- POPIA and ethics board requirements are non-negotiable constraints.

---

### CRIT-3: Measuring Clicks Instead of Learning

**What goes wrong:** The analytics system measures behavioral proxies (page views, time on page, login frequency, post counts) and presents them as if they measure learning. "Student A spent 45 minutes on the reading module" tells you nothing about whether Student A understood, engaged critically, or was asleep with the tab open.

**Why it happens:** Behavioral data is easy to capture. Learning is hard to measure. The gap between "what we can measure" and "what matters" is bridged with wishful thinking. In academic literacy specifically, the skills being developed (critical reading, academic argumentation, source integration) are inherently qualitative and resist quantification.

**Consequences:**
- Dashboards show activity, not learning -- tutors make decisions on misleading data
- Students optimize for visible metrics rather than actual learning
- Interventions target active-but-struggling students too late (they look "fine" in the data)
- Quiet deep learners are flagged as "disengaged" because they have low click counts
- The analytics system loses credibility with teaching teams who see the gap between data and reality

**Warning signs:**
- Analytics specifications use "engagement" without defining it operationally
- Time-on-task is treated as equivalent to effort or understanding
- No distinction between "completed module" and "demonstrated competency"
- Forum participation is measured by post count, not post quality

**Prevention:**
- Define a clear measurement framework that distinguishes: behavioral indicators (what students do), performance indicators (what students demonstrate), self-report indicators (what students perceive)
- For each analytic, document explicitly: "This measures X (behavior). It is a proxy for Y (learning outcome). The proxy is valid when Z (conditions). It breaks when W (limitations)."
- Combine quantitative behavioral data with qualitative checkpoints: quiz performance, writing rubric scores, self-assessment responses
- For academic literacy specifically: track progression through cognitive levels (recall, comprehension, application, analysis) not just completion
- Build in "data humility" -- every dashboard should communicate uncertainty, not certainty

**Phase relevance:** Metric design phase. Must precede any dashboard or reporting design.

**Confidence:** HIGH -- This is the "vanity metrics" problem well-documented in both analytics and product design literature.

---

### CRIT-4: Reducing Communities of Practice to Interaction Counts

**What goes wrong:** CoP analytics measure only the visible, countable aspects of community participation (forum posts, replies, likes) and miss the dimensions that Wenger's framework actually emphasizes: mutual engagement quality, shared repertoire development, and joint enterprise alignment. The result is analytics that cannot distinguish between a thriving learning community and a group of students posting minimum-required responses.

**Why it happens:** Wenger's CoP framework describes qualitative phenomena (identity formation, legitimate peripheral participation, boundary crossing) that resist quantification. Teams default to what Learning Management Systems already track: post counts, reply rates, network graphs. Social Network Analysis (SNA) is applied without understanding its limitations for measuring community quality.

**Consequences:**
- Students who lurk productively (legitimate peripheral participation in Wenger's terms) are flagged as disengaged
- Students who post frequently but superficially appear as "model community members"
- Tutors cannot distinguish between genuine knowledge co-construction and performative participation
- The analytics actively punish the developmental trajectory Wenger describes (newcomers start at the periphery and gradually increase participation)
- CoP measurement becomes a participation compliance tool, destroying the community it claims to measure

**Warning signs:**
- CoP metrics are all quantitative (post count, reply count, network centrality)
- No rubric for distinguishing quality of community interactions
- Legitimate peripheral participation (reading without posting) is invisible or penalized
- No developmental model -- the same metrics are applied in week 1 and week 30
- Analytics cannot capture when students reference each other's ideas or build on prior discussions

**Prevention:**
- Map analytics to Wenger's three CoP dimensions explicitly:
  - Mutual engagement: Not just "did they interact?" but "did they respond substantively?" Use content analysis markers (questions asked, ideas referenced, disagreements engaged)
  - Shared repertoire: Track adoption of academic literacy conventions over time (vocabulary use, citation practices, genre awareness)
  - Joint enterprise: Track collaborative artifact production, not just individual posts
- Implement a participation spectrum model: reader -> responder -> initiator -> synthesizer. All positions are valid; the analytics track movement, not position.
- Include self-report: "Did you feel part of a learning community this week?" (simple scale)
- Use qualitative sampling: flag a random subset of interactions for tutor review, not algorithmic classification of all interactions
- Accept that some CoP dimensions cannot be quantified and design for tutor observation notes alongside automated metrics

**Phase relevance:** CoP measurement specification phase. Must be informed by Wenger's framework directly, not by what LMS platforms typically track.

**Confidence:** HIGH -- The tension between quantifying community and Wenger's qualitative framework is well-established in CoP literature.

---

### CRIT-5: Algorithmic Bias Amplifying Existing Inequities

**What goes wrong:** Analytics models trained on or calibrated against historical data encode existing inequities. Students from disadvantaged backgrounds, students using the platform in a second language, students with different cultural participation norms, and students with disabilities are systematically misclassified by "at-risk" algorithms. In South African higher education, where access and equity are foundational concerns, this is not just a technical problem but a justice failure.

**Why it happens:** "Engagement" norms are calibrated against majority or privileged student behaviors. Time-on-task patterns differ for students reading in a second language. Forum participation norms differ across cultures. Students with limited data access may show "low engagement" patterns that actually reflect connectivity constraints, not learning disengagement.

**Consequences:**
- Students from disadvantaged backgrounds receive disproportionate "at-risk" flags, creating a stigmatization feedback loop
- Intervention resources are misdirected (targeting visible behavioral patterns rather than actual need)
- Students who learn differently are pathologized by the system
- The analytics system reproduces the very inequities the academic literacy program aims to address
- Institutional trust is damaged, particularly among the students most in need of support

**Warning signs:**
- "At-risk" models use behavioral thresholds without demographic disaggregation
- No analysis of false positive rates across demographic groups
- "Normal" engagement patterns are defined without considering diversity of legitimate approaches
- No mechanism for students to contest or explain their analytics profile
- Platform assumes always-on connectivity

**Prevention:**
- Disaggregate all analytics by relevant demographic dimensions during design validation (not as an afterthought)
- Design for the most constrained user first: limited connectivity, second-language readers, assistive technology users
- Use relative progress (student's own trajectory) rather than absolute benchmarks where possible
- Build contestability: students can annotate their data ("I was offline because of load-shedding, not because I was disengaged")
- Have equity review as a formal gate in specification: "Does this metric disadvantage any student group?"
- Consider connectivity-aware analytics: distinguish "chose not to engage" from "could not access the platform"

**Phase relevance:** Must be addressed in metric design AND intervention design phases. Requires ongoing monitoring post-launch.

**Confidence:** HIGH -- Equity and bias in learning analytics is extensively documented (Slade & Prinsloo, 2013; Tsai & Gasevic, 2017).

---

## Moderate Pitfalls

Mistakes that cause significant rework, misleading outputs, or reduced adoption.

---

### MOD-1: Self-Directed Learning Tracking That Undermines Self-Direction

**What goes wrong:** The system tracks self-directed learning behaviors (goal setting, self-assessment, resource selection, time management) but in doing so creates an externally defined framework that tells students what self-direction should look like. Students learn to perform the system's version of self-direction rather than developing genuine self-regulatory skills.

**Why it happens:** Self-directed learning (SDL) is operationalized as a checklist of behaviors (set a goal, track your progress, reflect weekly) rather than as a developmental capacity. The tracking system rewards compliance with the SDL framework rather than authentic self-regulation.

**Prevention:**
- Offer SDL tools as options, not requirements: goal-setting templates are available, not mandatory
- Track whether students use SDL features, but do not penalize non-use -- some students self-regulate through means the app does not capture
- Allow students to define their own reflection prompts and learning goals, not just select from predefined options
- Show SDL analytics only to the student themselves (never to tutors as a performance metric)
- Include a developmental model: early scaffolding with gradual release (more structure in semester 1, more freedom in semester 2)

**Phase relevance:** SDL feature design phase and metric design phase.

**Confidence:** MEDIUM -- well-grounded in SDL theory but specific to this project's design choices.

---

### MOD-2: Dashboard Information Overload

**What goes wrong:** Dashboards show every available metric to every audience. Students see tutor-level cohort data they cannot act on. Tutors see raw behavioral data without interpretation. Teaching teams see individual student data when they need cohort patterns. The result: nobody uses the dashboards because they cannot find actionable information.

**Why it happens:** The instinct is to show more data to demonstrate value. Dashboard design follows data availability rather than user task analysis. The three audiences (students, tutors, teaching teams) have fundamentally different information needs, but a single dashboard tries to serve all three.

**Prevention:**
- Design separate dashboard views for each audience, driven by task analysis:
  - Students: "What should I do next?" (actionable, personal, forward-looking)
  - Tutors: "Which students need my attention and why?" (prioritized, contextual, consultation-ready)
  - Teaching teams: "What patterns are emerging across the cohort?" (aggregate, trend-based, curriculum-informing)
- Apply the "one key question" principle: each dashboard view answers ONE primary question
- Use progressive disclosure: summary first, details on demand
- Every metric shown must have an associated action. If the user cannot do anything about the number, remove it.
- Mobile-first constraint forces simplicity -- this is an advantage, not a limitation

**Phase relevance:** Dashboard specification phase. Requires user task analysis as input.

**Confidence:** HIGH -- Dashboard overload is documented extensively in LA literature (Jivet et al., 2018).

---

### MOD-3: Alert Fatigue and False Positive Interventions

**What goes wrong:** The system generates too many alerts, too many are false positives, and tutors stop paying attention. Alternatively, alerts are accurate but not actionable -- the tutor knows a student is "at risk" but has no specific guidance on what to do.

**Why it happens:** Alert thresholds are set conservatively (better to over-alert than miss someone). No feedback loop exists to calibrate alerts. Alerts are generated from single data points rather than patterns. Alert design focuses on detection without specifying response protocols.

**Prevention:**
- Start with very few alerts (2-3 types maximum) and expand based on tutor feedback
- Every alert must include: what was detected, why it matters, what the tutor should consider doing
- Implement alert suppression: if a tutor has already acted on a student's situation, do not re-alert for the same pattern
- Build in feedback: tutors can mark alerts as "helpful" or "not relevant" to calibrate thresholds
- Use trend-based alerts (pattern over 2+ weeks) rather than point-in-time alerts (missed one session)
- Define false positive tolerance explicitly: aim for precision over recall (fewer, more accurate alerts)

**Phase relevance:** Intervention design phase. Requires pilot testing with real tutors.

**Confidence:** HIGH -- Alert fatigue is well-documented across domains.

---

### MOD-4: Correlation-as-Causation in Metric Interpretation

**What goes wrong:** Analytics show correlations (students who use the discussion forum more tend to get higher grades) and stakeholders interpret them as causal (therefore we should require more forum participation). This leads to policies that optimize for the proxy, not the outcome.

**Why it happens:** Correlation-causation confusion is a universal cognitive bias, amplified by dashboard visualizations that imply causal relationships. In academic literacy, confounds are pervasive: students who use forums more may simply be more motivated, more confident in English, or have better connectivity.

**Prevention:**
- Every correlation shown in analytics must include a visible caveat: "Students who X tend to Y, but X may not cause Y"
- In specification, document known confounds for each metric
- Avoid language like "impact" or "effect" in dashboard labels -- use "association" or "pattern"
- Provide teaching teams with a brief interpretation guide for each analytic
- Design analytics to raise questions, not answer them: "This pattern is worth investigating" not "This is the problem"

**Phase relevance:** Metric design and dashboard design phases.

**Confidence:** HIGH -- fundamental to responsible analytics practice.

---

### MOD-5: Mobile-First as Lip Service

**What goes wrong:** The specification says "mobile-first" but the analytics, dashboards, and data collection are designed for desktop and then "made responsive." This results in dashboards that are technically viewable on mobile but practically unusable: tiny charts, horizontal scrolling, data-heavy tables, features that require precise clicking.

**Why it happens:** Specification writers and stakeholders typically work on desktops/laptops. They design what they would want to see. Mobile constraints (small screen, touch interaction, variable connectivity, data cost awareness) are treated as implementation details rather than design constraints.

**Prevention:**
- Specify mobile as the PRIMARY design target. If a feature does not work well on a 5-inch screen with touch interaction, redesign the feature, not the screen
- Apply data cost awareness: analytics displays should be lightweight (no heavy chart libraries, no auto-refreshing dashboards eating mobile data)
- Design for intermittent connectivity from the start: what analytics are available offline? What syncs when connectivity returns?
- Use mobile-native interaction patterns: swipe, tap, long-press -- not hover, right-click, drag
- Test all specifications against the question: "Would this work for a student on a bus using a mid-range Android phone with intermittent 3G?"

**Phase relevance:** Every phase that involves UI specification. Must be a standing constraint, not a separate phase.

**Confidence:** HIGH -- directly relevant to this project's stated mobile-first requirement.

---

### MOD-6: Year-Long Tracking Without Temporal Modeling

**What goes wrong:** Analytics treat the full academic year as a homogeneous period. The same metrics and thresholds are applied in orientation week, mid-semester, exam periods, and between semesters. This produces misleading patterns: engagement "drops" during exam periods are normal, not concerning. First-week activity spikes are novelty, not sustainable engagement.

**Why it happens:** It is simpler to define fixed thresholds than temporal models. The academic calendar's effect on behavior is known but not formally incorporated into analytics design.

**Prevention:**
- Define academic calendar periods explicitly in the analytics model: orientation, early semester, mid-semester, pre-exam, exam, inter-semester
- Calibrate baselines and thresholds per period: "normal engagement" looks different in week 2 vs week 10
- Design analytics to show trajectory within periods, not raw counts across periods
- For CoP analytics especially: community engagement has a natural arc (forming, norming, performing) that should be modeled
- For SDL: expectations of self-direction should increase across the year (developmental scaffolding)

**Phase relevance:** Metric design phase and temporal modeling specification.

**Confidence:** MEDIUM -- grounded in academic calendar reality but specific calibration needs empirical data.

---

## Minor Pitfalls

Mistakes that cause friction, reduced quality, or technical debt but are recoverable.

---

### MIN-1: Data Collection Granularity Mismatch

**What goes wrong:** Either too much data is collected (every click, scroll, keystroke -- creating storage, privacy, and analysis burdens) or too little (only completion events, missing the process data needed for meaningful analytics). The granularity does not match the questions the analytics need to answer.

**Prevention:**
- Start from the analytics questions, not the data collection capabilities. For each planned analytic, document exactly what data points are needed.
- Apply data minimization (also a POPIA requirement): collect only what serves a documented analytical purpose
- Define three collection tiers: (1) essential operational data, (2) analytics data collected by default with consent, (3) detailed process data collected only for specific research purposes with additional consent
- Plan for storage and processing: full-year tracking of detailed behavioral data at scale creates real infrastructure requirements

**Phase relevance:** Data model specification phase.

**Confidence:** MEDIUM.

---

### MIN-2: Offline-Online Sync Producing Data Artifacts

**What goes wrong:** Students complete activities offline. When connectivity returns, data syncs with timestamps that do not reflect actual activity times. Analytics show artificial activity bursts when sync occurs. "Time on task" calculations are corrupted. Duplicate submissions appear if sync retry logic is imprecise.

**Prevention:**
- Specify client-side timestamping with device clock (accept imprecision as a known limitation)
- Design sync logic that is idempotent (re-syncing the same data does not create duplicates)
- Flag synced-from-offline data in the analytics pipeline so dashboards can distinguish live vs synced activity
- Accept gracefully that some temporal analytics will be approximate for offline-first users -- document this limitation rather than pretending precision

**Phase relevance:** Technical architecture specification and data model phase.

**Confidence:** MEDIUM -- standard mobile-offline challenge, but specific sync artifacts need empirical observation.

---

### MIN-3: Consent Fatigue Leading to Blanket Opt-Out

**What goes wrong:** The consent model is so granular and so frequently prompted that students either click "agree to everything" without reading (defeating informed consent) or "decline everything" to make it stop (losing valuable analytics). Either way, the consent process fails its purpose.

**Prevention:**
- Design consent as a one-time, clear, layered process: summary on top, details available but not required
- Use progressive consent: basic analytics consent at onboarding, additional consent requested only when a feature needs it
- Make the default experience good without analytics sharing -- students should not feel punished for declining
- Provide a single settings page where consent can be reviewed and modified at any time
- Test consent language with actual first-year students for comprehension

**Phase relevance:** Consent architecture phase, UI/UX specification.

**Confidence:** MEDIUM.

---

### MIN-4: Ignoring Tutor Capacity in Intervention Design

**What goes wrong:** The analytics system surfaces insights and alerts for every student, but tutors have 100+ students each. The system is designed as if tutors have unlimited time to review dashboards and follow up on alerts. Tutors burn out, stop using the system, and analytics investment is wasted.

**Prevention:**
- Specify tutor workload assumptions explicitly (tutors see N students, have M hours per week for analytics review)
- Design alert prioritization: show top 5 students needing attention, not all 30 with any flag
- Provide batch actions: "These 8 students show similar patterns -- here is a group intervention approach"
- Include tutor-facing analytics about their own workload and response patterns
- Design for consultation integration: analytics should feed into scheduled tutor-student meetings, not create additional ad hoc work

**Phase relevance:** Intervention design phase and tutor dashboard specification.

**Confidence:** MEDIUM -- depends on institutional context and tutor ratios.

---

### MIN-5: Neglecting the Teaching Team Feedback Loop

**What goes wrong:** Analytics show cohort patterns to teaching teams, but there is no mechanism for teaching teams to act on those patterns within the platform. The analytics are informative but not integrated into curriculum adjustment workflows. Teaching teams discuss patterns in meetings but cannot translate insights into platform changes.

**Prevention:**
- Design analytics-to-action pathways: if cohort data shows a module is confusing, what is the workflow for flagging/adjusting it?
- Include annotation capabilities: teaching teams can mark periods, events, or curriculum changes that explain pattern shifts
- Build in a "closing the loop" mechanism: when a curriculum change is made in response to analytics, track whether the pattern changes
- Provide export and reporting features so analytics can feed into program review documents

**Phase relevance:** Teaching team dashboard specification and platform administration specification.

**Confidence:** LOW -- depends heavily on institutional workflow context.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Severity | Mitigation |
|-------------|---------------|----------|------------|
| Data model design | Privacy as afterthought (CRIT-2) | Critical | Lead with DPIA and consent architecture |
| Data model design | Granularity mismatch (MIN-1) | Minor | Start from analytics questions, not data availability |
| Metric design | Measuring clicks not learning (CRIT-3) | Critical | Define measurement framework with proxy validity conditions |
| Metric design | Correlation as causation (MOD-4) | Moderate | Document confounds for every metric |
| Metric design | No temporal modeling (MOD-6) | Moderate | Build academic calendar into metric definitions |
| CoP analytics | Reducing community to counts (CRIT-4) | Critical | Map to Wenger's three dimensions explicitly |
| SDL features | Undermining self-direction (MOD-1) | Moderate | Offer tools as options, not requirements |
| Dashboard design | Information overload (MOD-2) | Moderate | Separate views per audience, one key question each |
| Dashboard design | Mobile lip service (MOD-5) | Moderate | Design for 5-inch screen as primary target |
| Intervention design | Alert fatigue (MOD-3) | Moderate | Start with 2-3 alert types, build feedback loop |
| Intervention design | Ignoring tutor capacity (MIN-4) | Minor | Specify workload assumptions, prioritize alerts |
| Intervention design | Stigmatization via algorithms (CRIT-5) | Critical | Equity review gate, demographic disaggregation |
| Technical architecture | Offline sync artifacts (MIN-2) | Minor | Client-side timestamps, idempotent sync, flag offline data |
| Consent/onboarding | Consent fatigue (MIN-3) | Minor | Layered progressive consent, good default experience |
| All phases | Surveillance framing (CRIT-1) | Critical | Design student-facing analytics first, apply pedagogical intent test |

## Anti-Patterns Summary

| Anti-Pattern | What It Looks Like | What to Do Instead |
|--------------|-------------------|-------------------|
| Panopticon analytics | Every student action tracked and visible to staff | Student-controlled sharing, aggregate-by-default |
| Engagement theater | Post counts and login streaks as primary metrics | Quality indicators, performance data, self-report |
| One dashboard fits all | Same view for students, tutors, and teaching teams | Role-specific views driven by task analysis |
| Binary risk classification | Students labeled "at risk" or "on track" | Multidimensional profiles with context and uncertainty |
| Compliance-driven SDL | Mandatory goal-setting and reflection activities | Optional scaffolding with gradual release |
| Activity-equals-learning | Time on page presented as understanding | Proxy validity documentation, mixed methods |
| Desktop-first mobile | Responsive design instead of mobile-native design | Mobile as primary design target, data cost awareness |
| Universal thresholds | Same engagement baselines for all students all year | Relative progress, temporal modeling, equity review |

## Sources and Confidence Notes

All findings in this document draw on established learning analytics literature. Key references:

- Slade, S. & Prinsloo, P. (2013). Learning analytics: Ethical issues and dilemmas. *American Behavioral Scientist*, 57(10), 1510-1529. [Ethics, privacy, power dynamics]
- Tsai, Y.-S. & Gasevic, D. (2017). Learning analytics in higher education -- challenges and policies. *ICEL*. [Policy, institutional adoption failures]
- Wise, A.F. (2014). Designing pedagogical interventions to support student use of learning analytics. *LAK '14*. [Pedagogical intent, actionability]
- Ferguson, R. (2012). Learning analytics: Drivers, developments and challenges. *IJTEL*, 4(5/6), 304-317. [Overview of LA challenges]
- Jivet, I., Scheffel, M., Specht, M., & Drachsler, H. (2018). License to evaluate: Preparing learning analytics dashboards for educational practice. *LAK '18*. [Dashboard design, actionability gaps]
- Dollinger, M. & Lodge, J.M. (2018). Co-creation strategies for learning analytics. *LAK '18*. [Student co-design, agency]
- Pardo, A. & Siemens, G. (2014). Ethical and privacy principles for learning analytics. *BJET*, 45(3), 438-450. [Privacy architecture, data ownership]
- Wenger, E. (1998). *Communities of Practice: Learning, Meaning, and Identity*. Cambridge University Press. [CoP framework]

**Confidence assessment:**
- CRIT-1 through CRIT-5: HIGH confidence. These are well-documented, extensively discussed pitfalls in LA literature. The specific application to academic literacy and South African context adds nuance but the core risks are established.
- MOD-1 through MOD-6: HIGH to MEDIUM confidence. Well-grounded in literature, with some project-specific extrapolation.
- MIN-1 through MIN-5: MEDIUM to LOW confidence. These are reasonable engineering concerns, but specific manifestation depends on implementation choices not yet made.

**Gaps requiring further research:**
- POPIA-specific requirements for educational analytics (need legal/compliance input)
- South African connectivity patterns and their specific impact on analytics design
- Institutional tutor-to-student ratios and consultation workflows
- Existing LMS analytics capabilities that this platform would need to integrate with or replace
- Current best practices for mobile learning analytics in low-bandwidth contexts (2025-2026 landscape)
