# Feature Landscape: Learning Analytics for Academic Literacy

**Domain:** Learning analytics for first-year academic literacy (CoP + SDL framework)
**Researched:** 2026-03-06
**Confidence:** MEDIUM (based on training knowledge of LA literature, CoP theory, and SDL frameworks; no live web verification was possible during this research session)

---

## 1. Data Collection Features

### Table Stakes

Events/interactions that must be tracked or the analytics system has no raw material to work with.

| Feature | Why Expected | Complexity | Audience | Notes |
|---------|-------------|------------|----------|-------|
| Module/reading access events (open, time-on-page, completion) | Core engagement signal; without this you cannot measure reading behaviour | Low | All | Timestamp + duration + completion boolean. Must handle offline: queue events locally, sync when connected. |
| Writing task submissions (timestamp, word count, revision count) | Writing is the primary literacy act; submission metadata is the minimum viable signal | Low | All | Track draft saves vs final submissions separately. |
| Quiz attempt events (start, answers, score, time per question) | Formative assessment is the main learning-gain signal | Low | All | Store item-level responses, not just totals, to enable diagnostic analytics later. |
| Discussion forum events (post, reply, view, react) | Peer interaction is central to CoP participation; without this, community membership is invisible | Low | All | Distinguish between creating posts, replying to others, and passive viewing. |
| Session start/end with device and connectivity metadata | Needed for engagement patterns, time-on-task, and understanding the connectivity context | Low | Tutor, Team | Auto-detect online/offline state at session boundaries. |
| Login/authentication events | Baseline for calculating return frequency and session patterns | Low | Tutor, Team | Minimal: just timestamp and success/failure. |

### Differentiators

| Feature | Value Proposition | Complexity | Audience | Notes |
|---------|-------------------|------------|----------|-------|
| Granular reading behaviour (scroll depth, pause points, re-reads, highlight/annotation) | Distinguishes surface reading from deep engagement; maps to CoP concept of developing shared repertoire | Medium | Student, Tutor | Requires in-app instrumentation. Scroll depth and re-read detection are the highest-value signals. Highlighting/annotation is optional but powerful. |
| Writing process events (keystroke bursts, pause patterns, revision diffs between drafts) | Captures the writing *process* not just the product; reveals self-regulation and planning behaviour | High | Student, Tutor | Privacy-sensitive. Track aggregate patterns (burst length, pause duration, revision ratio) not raw keystrokes. Needs clear consent framing. |
| Discussion discourse markers (use of academic vocabulary, citation of course material, building on peers' ideas) | Directly measures movement toward academic discourse community membership (core CoP indicator) | High | All | Requires lightweight NLP or pattern matching. Can start with keyword/phrase lists and upgrade to ML later. |
| Self-reported data (confidence ratings, difficulty ratings, goal-setting entries) | Captures metacognitive dimension that behavioural data alone misses; essential for SDL tracking | Medium | Student, Tutor | Integrate brief self-report prompts at natural pause points (post-quiz, post-submission). Keep friction minimal: 1-2 taps maximum. |
| Navigation/help-seeking events (help button clicks, FAQ views, resource revisits) | Help-seeking is a key self-regulated learning behaviour; distinguishes stuck students from independent ones | Low | Tutor, Team | Low implementation cost, high analytical value. |
| Offline interaction queue with sync reconciliation | Handles the smartphone/unreliable-connectivity reality; without this, data collection has systematic gaps for the most disadvantaged students | Medium | System | Not a user-facing feature but a critical infrastructure requirement. Events must be timestamped at creation, not at sync. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Continuous screen recording or screenshot capture | Surveillance, not analytics. Violates trust, creates massive data burden, offers little analytical value over event-level tracking. | Track discrete, meaningful events (see above). |
| Keystroke logging with content capture | Privacy violation; shifts from understanding learning process to monitoring content creation. Students will self-censor. | Track keystroke *patterns* (burst/pause) without content. |
| Location tracking | Irrelevant to academic literacy outcomes. Creates surveillance perception. | If context matters, let students self-report study location optionally. |
| Social graph extraction from external platforms | Out of scope and ethically problematic. | Track only in-app interactions. |
| Webcam/attention monitoring | Surveillance technology antithetical to self-directed learning philosophy. Destroys trust. | Use engagement proxies (time-on-task, interaction patterns). |

---

## 2. Analytics/Metric Features

### Table Stakes

Calculations and indicators without which the dashboard has nothing meaningful to show.

| Feature | Why Expected | Complexity | Audience | Notes |
|---------|-------------|------------|----------|-------|
| Engagement frequency metrics (sessions/week, active days, return rate) | Universal LA baseline; every system tracks this | Low | All | Normalise by available time (exam periods vs teaching weeks). Show trend, not just snapshot. |
| Content completion rates (modules read, tasks submitted, quizzes attempted) | Progress tracking is the most basic expectation from any learning system | Low | All | Calculate as percentage of available content, not absolute counts. Account for content release schedule. |
| Assessment performance (quiz scores, running average, trend direction) | Students and tutors expect to see how performance is changing over time | Low | All | Show trajectory (improving/declining/stable), not just current score. Compare to cohort median as optional reference. |
| Time-on-task metrics (reading time, writing time, total active time) | Core learning effort indicator; needed by tutors for consultation discussions | Medium | Tutor, Team | Must handle idle detection (no interaction for X minutes = not active). Offline sessions need careful time calculation. |
| Activity distribution (proportion of time across reading, writing, quiz, discussion) | Shows whether student is engaging with all literacy dimensions or only some | Low | Student, Tutor | Pie/bar visualisation of time or event allocation across activity types. |
| Cohort comparison indicators (percentile rank, above/below cohort median) | Tutors and teams need context for individual performance; students need non-competitive reference points | Medium | All | For students: show as "You are engaging more/less than typical" not as rank. For tutors/teams: show distribution. |
| Risk/alert flags (inactivity threshold, declining performance, non-submission) | Without early warning signals, the analytics system is descriptive but not actionable | Medium | Tutor, Team | Define thresholds collaboratively with teaching staff. Start conservative and tune. |

### Differentiators

These are what make this system grounded in CoP and SDL theory rather than being a generic activity tracker.

| Feature | Value Proposition | Complexity | Audience | Notes |
|---------|-------------------|------------|----------|-------|
| **CoP Participation Trajectory** -- composite index of participation depth over time | Operationalises Wenger's legitimate peripheral participation: are students moving from the margins toward full community membership? | High | All | Composite of: (1) discussion contribution frequency and quality, (2) academic discourse adoption, (3) peer interaction reciprocity, (4) resource sharing/citation. Must show trajectory over weeks/months, not point-in-time. |
| **Academic Discourse Adoption Index** -- tracking uptake of discipline-specific vocabulary and argumentation patterns | Directly measures a core CoP outcome: adopting the shared repertoire of the academic community | High | Student, Tutor | Analyse writing submissions and discussion posts for: discipline terminology usage, hedging language, evidence-citation patterns, argument structure markers. Start with keyword frequency; evolve to pattern matching. |
| **Self-Regulation Composite** -- planning, monitoring, and reflection behaviour indicators | Operationalises SDL: are students developing metacognitive capacity? | High | Student, Tutor | Composite of: (1) goal-setting frequency and specificity, (2) self-assessment accuracy (confidence vs actual performance), (3) help-seeking appropriateness, (4) revision behaviour (do they revise before submitting?), (5) time management patterns. |
| **Scaffolding Dependence Index** -- measuring where on the guided-to-independent spectrum a student sits | Unique to SDL framework: quantifies readiness to reduce scaffolding | High | Tutor, Team | Track: (1) hint/help usage frequency over time (should decrease), (2) performance with vs without scaffolding, (3) voluntary engagement beyond required tasks, (4) quality of self-set goals. Decreasing dependence = increasing readiness for autonomy. |
| **Peer Interaction Quality Score** -- beyond counting posts, assessing the nature of peer engagement | CoP membership requires mutual engagement, not just broadcasting | High | Tutor, Team | Measure: (1) reply-to-post ratio, (2) thread depth in conversations, (3) whether posts build on others' ideas (reference detection), (4) reciprocity (does student both give and receive responses?). |
| **Cross-Context Transfer Indicators** -- evidence that literacy skills developed in one activity transfer to another | Captures deep learning vs surface compliance; a CoP differentiator | High | Tutor, Team | Look for: vocabulary from reading modules appearing in writing tasks, discussion patterns improving after reading specific modules, quiz performance correlating with reading depth. Requires cross-activity event correlation. |
| **Calibration Accuracy** -- gap between self-reported confidence/difficulty and actual performance | Key SDL metric: accurate self-assessment is a hallmark of self-directed learners | Medium | Student, Tutor | Compare pre-task confidence rating with post-task performance. Track calibration gap over time (should narrow). Powerful for tutor consultations. |
| **Engagement Quality Score** -- distinguishing deep from surface engagement | Moves beyond "time spent" which rewards passive screen-on time | Medium | Tutor, Team | Weight engagement by: interaction depth (scrolling + annotating > just opening), revision behaviour, voluntary re-engagement with content, performance following engagement. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Class rank / competitive leaderboards | Undermines CoP philosophy (community, not competition). Damages motivation for struggling students. Research consistently shows negative effects for lower-performing students. | Use self-referenced growth metrics ("You improved by X since last month") and non-competitive cohort context ("Most students at this stage..."). |
| Punitive "engagement scores" that penalise low activity | Conflates quantity with quality. Punishes students with connectivity issues. Rewards gaming behaviour (click-through without learning). | Use engagement *quality* metrics. Flag low engagement as "may need support" not as a grade component. |
| Automated grading of writing quality | Outside scope (this is analytics, not assessment). NLP-based writing quality scoring is unreliable for academic literacy development and culturally biased. | Track writing *process* indicators (revision, time, planning behaviours) and leave quality assessment to human tutors. |
| Predictive "will fail" scores shown to students | Research shows this harms motivation and creates self-fulfilling prophecy. Ethically problematic. | Show students growth trajectory and actionable next steps. Show risk indicators only to tutors/staff with framing as "may benefit from support." |
| Single numerical "learning score" | Reductive. Obscures the multidimensional nature of academic literacy development. Invites gaming. | Use a small set of 3-5 distinct indicators that together paint a picture. |

---

## 3. Dashboard Features

### Table Stakes

Views and visualisations without which the dashboard fails its audience.

| Feature | Why Expected | Complexity | Audience | Notes |
|---------|-------------|------------|----------|-------|
| **Student: Personal progress overview** -- completion rates, recent activity, current standing | Students expect to see "where am I?" at a glance | Low | Student | Must load fast on mobile. Single-screen summary. Avoid information overload: 3-4 key indicators maximum on landing view. |
| **Student: Activity history timeline** -- what I did and when | Self-reflection requires being able to review one's own behaviour | Low | Student | Scrollable chronological list. Filterable by activity type. |
| **Tutor: Individual student profile** -- all metrics for one student, with context | Tutors need a "consultation prep" view: everything about one student in one place | Medium | Tutor | Must support quick comparison to cohort norms. Include flags/alerts at top. Link to specific evidence (which tasks, which posts). |
| **Tutor: Student list with status indicators** -- overview of all assigned students with colour-coded risk | Tutors need to triage: who needs attention? | Medium | Tutor | Sortable/filterable list. Red/amber/green or equivalent status. Click-through to individual profiles. |
| **Team: Cohort overview dashboard** -- aggregate metrics across all students | Teaching teams need the bird's-eye view | Medium | Team | Show distributions, not just averages. Highlight outlier clusters. Filter by tutor group, demographic, time period. |
| **Team: Trend visualisations** -- how cohort metrics are changing over the academic year | Longitudinal patterns are the core value of year-long tracking | Medium | Team | Line charts with week-by-week or month-by-month granularity. Overlay semester boundaries, assessment deadlines, intervention points. |
| **Responsive mobile layout** -- all student-facing views must work on smartphone screens | Students use smartphones. A dashboard that requires a laptop fails the user population. | Medium | Student | This is a hard constraint, not a nice-to-have. Design mobile-first, not responsive-as-afterthought. |
| **Offline-capable student dashboard** -- cached view accessible without connectivity | Students with unreliable connectivity cannot rely on live-loading dashboards | Medium | Student | Cache last-fetched dashboard state. Show "last updated" timestamp. Queue any self-report inputs for sync. |

### Differentiators

| Feature | Value Proposition | Complexity | Audience | Notes |
|---------|-------------------|------------|----------|-------|
| **Student: CoP membership journey visualisation** -- showing progression from peripheral to fuller participation | Makes the theoretical framework tangible and motivating. Students see themselves developing as community members, not just completing tasks. | High | Student | Could be a journey map, trajectory line, or progression through stages. Must be encouraging, never shaming. Key design challenge: making "legitimate peripheral participation" feel like progress, not inadequacy. |
| **Student: Self-regulation reflection prompts** -- contextual prompts that guide metacognitive reflection | Transforms the dashboard from passive display to active learning tool. Core SDL feature. | Medium | Student | Trigger based on context: after quiz ("How well did you predict your score?"), after writing ("What strategy did you use?"), after a week of data ("What pattern do you notice?"). |
| **Student: Goal-setting and tracking interface** -- students set learning goals and track progress against them | Operationalises SDL's goal-setting component. Gives students agency over their analytics. | Medium | Student | Start with structured goals (choose from templates), evolve to freeform. Show progress toward self-set goals alongside system metrics. Must feel empowering, not bureaucratic. |
| **Tutor: Consultation evidence view** -- curated data formatted for one-on-one meetings | Designed for the specific workflow of tutor-student consultations. Most LA dashboards do NOT design for this use case. | Medium | Tutor | Pre-select the 3-5 most important data points for discussion. Include "conversation starters" (e.g., "Ask about their reading strategy for Module X -- they spent significant time but scored low on the quiz"). Exportable/printable for meetings. |
| **Tutor: Individual learning plan integration** -- link analytics evidence to learning plan goals | Connects analytics to intervention. Most systems stop at "here's the data." | High | Tutor | Tutor sets goals for student; dashboard tracks progress against those goals. Enables evidence-based plan reviews. |
| **Tutor: Comparative student view** -- side-by-side comparison of 2-3 students (anonymised) | Helps tutors identify patterns across students with similar profiles | Medium | Tutor | Useful for identifying whether a pattern is individual or systemic. Privacy: tutor can only compare students in their own group. |
| **Team: Intervention effectiveness tracking** -- did cohort-level interventions move the needle? | Closes the analytics loop. Most LA systems track student behaviour but not whether interventions worked. | High | Team | Overlay intervention events on cohort trend lines. Before/after comparison. Track which nudge types get responses. |
| **Team: Content effectiveness view** -- which modules/tasks are working and which are not | Informs teaching improvement, not just student tracking. Shifts analytics from surveillance to pedagogy improvement. | Medium | Team | Show: completion rates, performance outcomes, engagement quality, and student difficulty ratings by content item. Surfaces content that needs revision. |
| **Student: Peer activity context (anonymised)** -- "Students who engage in discussion tend to improve their writing scores" | Provides social norm information without competition. Nudges toward CoP participation by showing community patterns. | Medium | Student | Must be fully anonymised. Frame as community norms, not individual comparisons. Research-backed: social norm nudges are effective for behaviour change. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Real-time activity feed ("Student X just completed...") visible to tutors | Surveillance, not analytics. Creates anxiety. Tutors do not need second-by-second updates. | Daily/weekly summary updates. Alert only on meaningful thresholds (3+ days inactive, sudden performance drop). |
| Complex multi-chart desktop dashboards for students | Students use phones. Cognitive overload kills engagement. Most LA dashboards fail because they show too much. | 3-4 key metrics on landing view. Drill-down available but not forced. Progressive disclosure. |
| Gamification elements (badges, points, streaks) | Extrinsic motivation undermines intrinsic motivation development, which is the core SDL goal. Badges reward compliance, not learning. | Use growth-oriented framing: "Your academic vocabulary has expanded" not "You earned the Vocabulary Badge." |
| Grade prediction displays | Creates anxiety, learned helplessness, or false confidence. Ethically problematic for first-year students still developing. | Show trajectory and actionable steps. "You are improving in X" not "You are predicted to get a C." |

---

## 4. Intervention Features

### Table Stakes

| Feature | Why Expected | Complexity | Audience | Notes |
|---------|-------------|------------|----------|-------|
| Inactivity alerts to tutors (student has not logged in for N days) | Most basic early-warning signal. Without this, at-risk students are invisible until it is too late. | Low | Tutor | Configurable threshold (default: 5 consecutive days during teaching weeks). Suppress during vacation periods. |
| Non-submission alerts (student missed a deadline) | Assessment submission is the strongest single predictor of at-risk status | Low | Tutor | Alert on first missed submission, escalate on second consecutive miss. |
| Performance decline alerts (score dropped significantly from running average) | Catches students whose engagement looks fine but whose learning is declining | Medium | Tutor | Define "significant" statistically (e.g., >1 SD below personal running average) not arbitrarily. Avoid false positives. |
| Alert dashboard for tutors (centralised view of all current alerts) | Tutors need one place to see who needs attention, sorted by urgency | Medium | Tutor | Distinguish between: urgent (multiple risk factors), moderate (single risk factor), informational (notable pattern). |
| Configurable thresholds (teaching team can adjust alert sensitivity) | Different cohorts/contexts need different thresholds. Hard-coded thresholds will be wrong. | Medium | Team | Provide sensible defaults with override capability. Log threshold changes for accountability. |

### Differentiators

| Feature | Value Proposition | Complexity | Audience | Notes |
|---------|-------------------|------------|----------|-------|
| **Student-facing nudges** -- contextual, encouraging micro-interventions delivered in-app | Shifts intervention from reactive (tutor notices problem) to proactive (system supports student in the moment). Core SDL feature. | Medium | Student | Examples: "You have not visited the discussion forum this week -- students who participate in discussion tend to improve their writing" / "You completed Module 3 quickly -- would you like to review the key concepts before the quiz?" Must be encouraging, never nagging. Limit frequency (max 2-3 per week). |
| **Scaffolding adaptation recommendations** -- suggest to tutors when to reduce/increase scaffolding for a student | Operationalises the scaffolded-autonomy model. Unique to SDL-grounded systems. | High | Tutor | Based on Scaffolding Dependence Index: "Student X is performing well without hints -- consider reducing scaffolding for next task" or "Student Y is struggling independently -- consider re-introducing guided support." |
| **Escalation pathways** -- structured escalation from automated nudge to tutor alert to team-level review | Multi-tier intervention prevents both under-reaction (no one notices) and over-reaction (tutor called for every blip) | Medium | All | Tier 1: Automated student nudge. Tier 2: Tutor alert (if nudge produces no response in N days). Tier 3: Teaching team flag (if tutor intervention produces no change). Each tier logged for effectiveness tracking. |
| **Intervention logging** -- record what interventions were attempted and their outcomes | Closes the feedback loop. Without logging, you cannot evaluate whether interventions work. | Medium | Tutor, Team | Tutor records: "Consulted with student on [date], discussed [topic], agreed on [action]." System tracks post-intervention metrics automatically. |
| **Self-reflection triggered interventions** -- prompt metacognitive reflection rather than prescriptive action | Aligns with SDL: the goal is to develop student self-regulation, not to create dependence on external direction | Medium | Student | After low quiz score: "What study strategy did you use? What might you try differently?" rather than "You should study more." Builds metacognitive capacity. |
| **Positive reinforcement nudges** -- recognise genuine growth and effort, not just flag problems | Most LA intervention systems are deficit-focused. Recognising growth supports motivation and CoP belonging. | Low | Student | "Your discussion contributions have increased this month -- your peers are responding to your ideas" / "You revised your essay three times -- that revision pattern is associated with stronger academic writing." |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Automated punitive actions (locking content, mandatory meetings triggered by algorithm) | Removes human judgment from high-stakes decisions. Algorithmic decisions about student access are ethically unacceptable. | Alert humans (tutors, coordinators). Humans decide on action. |
| High-frequency nudges (daily or multiple per day) | Notification fatigue. Students will disable notifications, defeating the purpose. Research shows diminishing returns past 2-3 per week. | Cap at 2-3 nudges per week. Prioritise by importance. |
| Peer-shaming interventions ("You are behind your classmates") | Undermines CoP community belonging. Creates anxiety. Counterproductive for struggling students. | Use self-referenced comparisons ("You improved since last week") or anonymised norms ("Most students find this challenging"). |
| Parent/guardian notifications | University students are adults. Parental notification infantilises students and undermines SDL development. Out of scope and ethically inappropriate. | All communications go to the student. Tutors can involve student support services through proper university channels if needed. |

---

## 5. CoP-Specific Features

Features grounded specifically in Wenger's Communities of Practice framework.

### Table Stakes

| Feature | Why Expected | Complexity | Audience | Notes |
|---------|-------------|------------|----------|-------|
| Discussion participation tracking (posts, replies, views over time) | Mutual engagement is a core CoP dimension. Must be trackable at minimum. | Low | All | Track trajectory, not snapshot. A student who goes from 0 to 3 posts/week is progressing even if 3 is "below average." |
| Content engagement breadth (how much of the shared repertoire has the student engaged with) | Shared repertoire engagement is foundational to CoP membership | Low | All | Percentage of available modules accessed, tasks attempted, discussions viewed. |

### Differentiators

| Feature | Value Proposition | Complexity | Audience | Notes |
|---------|-------------------|------------|----------|-------|
| **Participation trajectory mapping** -- visualising movement from peripheral to fuller participation | The signature CoP feature. Maps Wenger's LPP concept to observable data. No mainstream LA platform does this well. | High | All | Define participation stages: (1) Lurking/observing, (2) Responding to prompts, (3) Initiating contributions, (4) Mentoring/helping peers, (5) Challenging/extending community knowledge. Track movement between stages. |
| **Academic discourse adoption tracking** -- monitoring uptake of academic vocabulary, argument structures, hedging, and citation practices | Measures adoption of the community's shared repertoire -- a core CoP outcome | High | Student, Tutor | Analyse writing and discussion for: (1) discipline-specific terminology frequency, (2) hedging language ("suggests," "may indicate"), (3) evidence-citation patterns ("According to..."), (4) argument connectives ("however," "therefore," "in contrast"). Track trends, not absolutes. |
| **Peer interaction reciprocity analysis** -- who receives responses and who gives them, and how this changes | CoP membership requires mutual engagement. One-directional interaction (only posting, never replying, or only replying, never initiating) indicates incomplete participation. | Medium | Tutor, Team | Calculate: initiation ratio, response ratio, reciprocity index. Flag students who are consistently ignored by peers (may indicate marginalisation). Flag students who consume but never contribute. |
| **Joint enterprise contribution indicators** -- evidence that a student is contributing to communal learning goals, not just personal ones | Joint enterprise is a core CoP dimension alongside mutual engagement and shared repertoire | High | Tutor, Team | Hardest to measure. Proxies: (1) contributions that generate peer responses, (2) posts that reference course goals or community norms, (3) help-giving behaviour, (4) collaborative task engagement patterns. |
| **Identity development narrative** -- qualitative + quantitative view of how a student's academic identity is developing | CoP theory emphasises identity as central to learning. This goes beyond skills/knowledge to "becoming an academic." | High | Tutor | Combine: (1) self-reported identity/confidence data, (2) discourse adoption trends, (3) participation trajectory, (4) help-seeking to help-giving ratio shift. Present as a narrative arc for tutor consultations, not as a score. |
| **Community health metrics** -- cohort-level indicators of whether the CoP itself is functioning well | A CoP is more than individual trajectories; the community itself can be healthy or dysfunctional | Medium | Team | Measure: (1) discussion response rate (are posts getting replies?), (2) interaction network density (is participation concentrated or distributed?), (3) newcomer integration rate (how quickly do new participants get responses?), (4) discourse quality trends. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Social network visualisation showing individual student connections | Exposes social dynamics in potentially harmful ways. Students seeing they have "fewer connections" is demoralising and not actionable. | Show individuals their own interaction patterns. Show tutors/teams anonymised network health metrics. |
| "Influence scores" ranking students by peer impact | Creates hierarchy within what should be a community. Rewards confident students, penalises shy ones. | Track peer interaction quality, not influence. |
| Mandatory participation quotas driven by analytics | Coerced participation is antithetical to genuine CoP membership. Compliance-driven posting produces low-quality contributions. | Use nudges and encouragement. Let tutors address participation concerns in consultations. Quality over quantity. |

---

## 6. Self-Directed Learning Features

Features grounded in SDL theory (Knowles, Zimmerman, Garrison) and the scaffolded autonomy model.

### Table Stakes

| Feature | Why Expected | Complexity | Audience | Notes |
|---------|-------------|------------|----------|-------|
| Task completion tracking with optional vs required distinction | SDL requires knowing what the student chose to do beyond requirements | Low | All | Tag all activities as required or optional/voluntary. Voluntary engagement is a strong SDL signal. |
| Basic self-assessment integration (pre/post confidence ratings) | Self-assessment is the most fundamental metacognitive act. Without it, SDL tracking is purely behavioural. | Low | Student, Tutor | 1-tap confidence rating before quiz, difficulty rating after task. Minimal friction. |

### Differentiators

| Feature | Value Proposition | Complexity | Audience | Notes |
|---------|-------------------|------------|----------|-------|
| **Goal-setting interface with structured scaffolding** -- students set weekly/monthly learning goals, with templates that decrease in structure over time | Directly operationalises SDL's self-management dimension. The decreasing structure embodies scaffolded autonomy. | Medium | Student | Early semester: highly structured ("This week I will complete Module X and participate in one discussion"). Late semester: more open ("This week my learning goal is..."). Track goal quality (specificity, achievability) and achievement rate. |
| **Self-regulation behaviour tracking** -- composite of planning, monitoring, and reflection indicators | Makes the invisible process of self-regulation visible to both student and tutor | High | Student, Tutor | Track: (1) preview behaviour (do they look at what is coming?), (2) self-testing (do they reattempt quizzes?), (3) revision behaviour, (4) time management (spacing vs cramming), (5) help-seeking patterns. Combine into a Self-Regulation Profile, not a single score. |
| **Scaffolding level adaptation tracking** -- monitoring how much support a student currently needs and how this changes | Unique to the scaffolded autonomy model. Makes tutor decisions about support level evidence-based. | High | Tutor | Track per-activity-type: (1) current scaffolding level, (2) performance at current level, (3) readiness indicators for level reduction. Recommend (not automate) scaffolding changes to tutors. |
| **Metacognitive reflection prompts** -- contextualised prompts that develop self-assessment and strategy awareness | Transforms analytics from observation to active development of SDL skills | Medium | Student | Context-specific: after a quiz mismatch ("You expected to do well but scored 45% -- what might explain the gap?"), after a study session ("You spent 90 minutes on Module 4 -- what strategy did you use?"), weekly ("Looking at your week, what worked well and what would you change?"). |
| **Calibration tracking dashboard** -- student-facing view of how accurate their self-assessments are becoming | Develops the crucial SDL skill of accurate self-assessment. Rare in LA platforms. | Medium | Student | Show: (1) prediction-vs-reality scatter plot over time, (2) calibration accuracy trend (gap should narrow), (3) which topics/skills they over/underestimate. Frame as a skill to develop: "Your self-assessment accuracy improved from 40% to 65% this semester." |
| **Voluntary engagement index** -- proportion of student activity that goes beyond requirements | Intrinsic motivation indicator. SDL development means students increasingly direct their own learning. | Low | Tutor, Team | Calculate: optional module access, unrequired discussion participation, additional quiz attempts, self-set goal completion. Track trend over semester. Increasing voluntary engagement = positive SDL development. |
| **Learning strategy repertoire tracking** -- evidence that students are using (and varying) different study strategies | SDL requires strategy awareness and flexibility, not just effort | Medium | Student, Tutor | Infer from behaviour patterns: reading-then-quiz vs quiz-then-reading, spaced vs massed practice, single-draft vs revision-heavy writing, help-seeking frequency. Flag students who use only one strategy. |

### Anti-Features

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Fully automated scaffolding adjustment (system removes support without tutor involvement) | Removes human judgment from pedagogical decisions. Can harm students if algorithm misjudges readiness. The system should recommend, not decide. | System recommends scaffolding changes to tutors with evidence. Tutors decide and implement. |
| Mandatory goal-setting that blocks app access | Coercion undermines the very autonomy SDL aims to develop. Goals become compliance, not genuine self-direction. | Make goal-setting available and gently encouraged. Reward engagement with the feature, do not punish non-engagement. |
| "Self-directed learning score" visible to peers | SDL development is deeply personal. Comparing self-regulation across students is inappropriate and demotivating. | SDL indicators visible only to the individual student and their tutor. |

---

## Feature Dependencies

```
LAYER 1: Data Collection Foundation (must exist first)
  - Session/login events
  - Module access events
  - Writing submission events
  - Quiz attempt events
  - Discussion forum events
  - Offline event queue + sync
     |
     v
LAYER 2: Core Analytics (requires Layer 1)
  - Engagement frequency metrics
  - Content completion rates
  - Assessment performance trends
  - Time-on-task calculations
  - Activity distribution
  - Cohort comparison indicators
     |
     v
LAYER 3: Basic Dashboards + Alerts (requires Layer 2)
  - Student progress overview
  - Tutor student profile view
  - Team cohort dashboard
  - Inactivity/non-submission alerts
  - Risk flags
     |
     v
LAYER 4: Advanced Data Collection (can begin alongside Layer 3)
  - Granular reading behaviour (scroll, re-read, annotation)
  - Writing process events (burst/pause patterns)
  - Self-reported data (confidence, difficulty, goals)
  - Help-seeking events
     |
     v
LAYER 5: CoP + SDL Analytics (requires Layers 2 + 4)
  - Academic discourse adoption index
  - CoP participation trajectory
  - Self-regulation composite
  - Scaffolding dependence index
  - Peer interaction quality
  - Calibration accuracy
     |
     v
LAYER 6: Advanced Dashboards + Interventions (requires Layer 5)
  - CoP membership journey visualisation
  - Goal-setting interface
  - Metacognitive reflection prompts
  - Scaffolding adaptation recommendations
  - Intervention logging + effectiveness tracking
  - Community health metrics
  - Content effectiveness view
```

Key dependency notes:
- **Self-report data collection (Layer 4) is required for most SDL metrics (Layer 5).** Without student self-report, SDL tracking is limited to behavioural inference.
- **Discussion events (Layer 1) are required for all CoP metrics.** If discussion is under-used in the app, CoP analytics will have insufficient data.
- **Offline queue (Layer 1) is a hard prerequisite.** Without it, data from the most disadvantaged students is systematically missing, biasing all analytics.
- **Cohort comparison (Layer 2) is required for risk flags (Layer 3).** Thresholds need normative context.

---

## MVP Recommendation

For MVP (first implementation cycle), prioritise:

1. **All Layer 1 data collection** -- without comprehensive event capture from day one, you lose data that cannot be recovered retroactively
2. **Layer 2 core analytics** -- engagement, completion, performance, time-on-task
3. **Layer 3 basic dashboards for all three audiences** -- student progress overview, tutor student profiles with risk flags, team cohort overview
4. **Basic inactivity and non-submission alerts** -- the minimum viable intervention system
5. **Self-report data collection (from Layer 4)** -- start collecting confidence/difficulty ratings immediately, even if SDL analytics are not yet built, so data is available when they are

Defer to post-MVP:
- **Advanced CoP metrics** (discourse analysis, participation trajectory): Require NLP capabilities and substantial data accumulation. Design the data collection now, build the analytics in Phase 2.
- **Goal-setting interface**: Valuable but can be introduced mid-semester once students are oriented to the app.
- **Scaffolding adaptation recommendations**: Requires tutor workflow integration and calibration with real data.
- **Intervention effectiveness tracking**: Requires interventions to have been running long enough to measure outcomes.
- **Community health metrics**: Requires a full semester of discussion data to be meaningful.

---

## Audience-Feature Matrix

Summary of which features serve which audience.

| Feature Category | Student | Tutor | Teaching Team |
|-----------------|---------|-------|---------------|
| Personal progress overview | PRIMARY | - | - |
| Self-reflection prompts | PRIMARY | - | - |
| Goal-setting interface | PRIMARY | Observes | - |
| CoP journey visualisation | PRIMARY | Uses in consultation | - |
| Calibration tracking | PRIMARY | Reviews | - |
| Individual student profile | - | PRIMARY | - |
| Consultation evidence view | - | PRIMARY | - |
| Student list with risk flags | - | PRIMARY | - |
| Scaffolding recommendations | - | PRIMARY | - |
| Learning plan integration | - | PRIMARY | - |
| Cohort overview dashboard | - | Reviews own group | PRIMARY |
| Trend visualisations | - | - | PRIMARY |
| Content effectiveness | - | Contributes data | PRIMARY |
| Community health metrics | - | - | PRIMARY |
| Intervention effectiveness | - | Logs interventions | PRIMARY |
| Automated nudges | RECEIVES | Configures | Sets policy |
| Risk/alert flags | - | RECEIVES | Reviews patterns |
| Escalation pathways | Tier 1 recipient | Tier 2 recipient | Tier 3 recipient |

---

## Sources and Confidence Notes

This research draws on established learning analytics literature and frameworks:

- **Communities of Practice theory:** Wenger (1998), Wenger-Trayner & Wenger-Trayner (2015). CoP dimensions (mutual engagement, joint enterprise, shared repertoire) and legitimate peripheral participation are well-established. HIGH confidence in theoretical grounding.
- **Self-directed learning:** Knowles (1975), Zimmerman (2002), Garrison (1997). Self-regulation components (planning, monitoring, reflection) are well-validated. HIGH confidence in theoretical grounding.
- **Learning analytics dashboards:** Literature from LAK conferences, Jivet et al. (2018) systematic review of LA dashboards, Schwendimann et al. (2017) dashboard review. MEDIUM confidence -- the field evolves rapidly; specific platform features may have changed since training data.
- **Intervention/nudge systems:** Teasley (2017), Jayaprakash et al. (2014) on early alert systems. HIGH confidence on principles, MEDIUM on current implementation patterns.
- **Discourse analysis in learning analytics:** Gaevic et al. (2015), Ferguson & Shum (2012) on epistemic/social network analytics. MEDIUM confidence -- NLP capabilities evolve quickly.
- **Mobile learning analytics:** Limited specific literature on mobile-first LA dashboards for academic literacy. LOW confidence on mobile-specific best practices; recommendations here are extrapolated from mobile UX principles and LA dashboard research.
- **Feature categorisation (table stakes vs differentiators):** Based on analysis of common LA platforms (Canvas Analytics, Blackboard Analytics, Moodle Learning Analytics, OnTask) and academic LA systems described in research literature. MEDIUM confidence -- commercial platform features change frequently.

**Key gap:** Live verification of current LA platform features was not possible during this research session. Commercial platforms (Canvas, Blackboard, Brightspace) may have added CoP-specific or SDL-specific analytics features since training data cutoff. Recommend validating the "differentiator" classification against current platform capabilities before finalising the specification.
