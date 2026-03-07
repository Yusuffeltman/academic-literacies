# Equity Review Framework

Per-metric bias-check process for the Academic Literacies Learning Analytics system.

**Regulatory basis:** POPIA (Act 4 of 2013), Condition 7 (Security Safeguards); Jisc Code of Practice Principle 6 (Interventions should not be based on biased data)
**Applies to:** Every metric specified in Phases 4, 5, and 6 before inclusion in the analytics specification
**Version:** 1.0
**Created:** 2026-03-07

---

## 1. Purpose and Scope

### Purpose

This framework ensures every metric in the learning analytics specification is checked for bias before inclusion. Equity is a design constraint, not an afterthought. A metric that systematically disadvantages students from particular backgrounds undermines the core purpose of the system -- making student development visible so that struggling students are identified early and supported.

### Scope

- **Prospective only:** This framework is applied to new metrics as they are specified. It is not a retroactive audit tool. (Locked decision: historical data bias auditing is deferred to a future version.)
- **Specification-time check:** The review happens during Phases 4 (Engagement Metrics), 5 (Community of Practice Metrics), and 6 (Self-Directed Learning Metrics), before a metric enters the specification.
- **Not an implementation audit:** This framework checks the metric's *design* for bias, not the deployed system's outputs. Runtime fairness monitoring is a separate concern for later phases.

### When Applied

Before any metric is added to the specification in Phases 4, 5, or 6. The review is completed as part of the metric specification document itself.

### Who Applies It

The analyst or designer specifying the metric. In this project, that means Claude during specification phases, with user review of the completed checklist. For FLAGGED metrics, the user makes the final decision.

### Guiding Principle

Equity is a design constraint, not an afterthought. Research consistently shows that learning analytics systems can reproduce and amplify existing inequalities when equity considerations are bolted on after design decisions are made. This framework prevents that anti-pattern by requiring bias evaluation before specification.

---

## 2. South African Context

The following four bias risks are specific to the South African higher education context. They are grounded in structural realities that affect how students interact with digital learning environments. Each risk is well-documented in South African educational research and directly relevant to learning analytics measurement.

### 2.1 Load-Shedding and Connectivity

Scheduled and unscheduled power outages (load-shedding) disrupt internet access across South Africa, but their impact is uneven. Students in areas with worse electrical infrastructure experience more frequent and longer outages. Even when power is available, mobile data costs force many students to ration their online activity -- choosing which resources to access and when to go online. A metric that assumes continuous connectivity will systematically undercount the engagement of students affected by these constraints.

### 2.2 Multilingual Student Population

South Africa has 11 official languages. Many university students are learning in English as a second, third, or fourth language. Academic discourse norms -- citation practices, argumentation structures, hedging conventions -- are rooted in particular linguistic traditions. Code-switching between languages is a normal communicative practice in South African academic settings, not a deficit. A metric that penalizes non-standard English expression or rewards vocabulary richness measured against monolingual English norms will disadvantage multilingual students.

### 2.3 Prior Education Inequality

The legacy of apartheid-era education policy means that students enter South African universities with vastly different levels of preparedness. School quality varies enormously by region, former department, and socioeconomic status. Students from historically disadvantaged schools may have strong learning potential but lower starting-point scores. A metric that conflates prior schooling quality with current learning effort -- measuring where a student *is* rather than how far they have *come* -- will penalize students from disadvantaged backgrounds for circumstances beyond their control.

### 2.4 Device Limitations

Many South African university students access the LMS primarily or exclusively via smartphone. Small screens, limited storage, and constrained bandwidth create interaction patterns that differ significantly from desktop users. Tapping, scrolling, and reading on a 5-inch screen is fundamentally different from using a laptop with a full keyboard. A metric that treats all interaction patterns as equivalent without accounting for device context will misrepresent mobile-first students' engagement.

---

## 3. Per-Metric Equity Review Checklist

For each metric under review, complete all four bias check sections below. Every checklist item is a specific, answerable question. For each question, the reviewer must:

1. Answer YES or NO
2. Cite the evidence used to reach that answer
3. If YES (risk identified), note the specific concern

A YES answer does not automatically disqualify a metric. It means a bias risk has been identified and must be addressed through mitigation or escalation.

### 3a. Connectivity Bias Check

| # | Question | Evidence Required | If YES (Risk Identified) |
|---|----------|-------------------|--------------------------|
| C1 | Does this metric use time-based measurement (duration, time-on-task, session length) that would be distorted by connectivity interruptions? | Check if the metric formula includes timestamps, duration, or frequency calculations that assume continuous connectivity. | Time-based measurements will undercount engagement for students experiencing load-shedding or connectivity drops. |
| C2 | Does load-shedding in the student's area affect the data source for this metric? | Check if the data is collected from always-online systems (e.g., LMS server logs) vs. systems that can capture activity offline. | Data gaps during outage periods create systematic measurement bias correlated with geographic location. |
| C3 | Is offline activity captured and reconciled when connectivity resumes? | Check if the metric's data source supports offline sync (as specified in the Phase 3 data collection pipeline). | Students who work offline during outages will have their activity undercounted or missed entirely. |
| C4 | Does the metric penalize students who ration mobile data by limiting their online sessions? | Check if session count, page views, or connection frequency is a direct component of the metric formula. | Students managing data costs will show artificially lower engagement scores despite equivalent learning effort. |

**Mitigation options when connectivity bias is identified:**
- Normalize time-based measures for known outage periods (using load-shedding schedule data where available)
- Use activity completion rather than time-on-task as the primary measurement
- Weight offline-captured data equally with online data
- Measure outcomes (what was accomplished) rather than inputs (how long they were connected)

### 3b. Language Bias Check

| # | Question | Evidence Required | If YES (Risk Identified) |
|---|----------|-------------------|--------------------------|
| L1 | Does this metric use vocabulary richness, lexical complexity, or word count as a component? | Check the metric formula for any linguistic complexity measures, readability scores, or text length requirements. | Vocabulary-based measures disadvantage L2/L3 English speakers who may express equivalent understanding with different linguistic resources. |
| L2 | Are vocabulary-based measures normed for L2/L3 English speakers? | Check if norms, baselines, or benchmarks account for language background. Look for whether a monolingual English corpus was used for calibration. | Norms based on monolingual English speakers will systematically rate multilingual students lower regardless of their conceptual understanding. |
| L3 | Does academic discourse measurement penalize code-switching? | Check if mixed-language contributions (e.g., forum posts with isiZulu and English) are counted differently from English-only contributions. | Penalizing code-switching misidentifies a normal multilingual academic practice as a deficit. |
| L4 | Does the metric assume a specific academic writing tradition that may not match all students' educational backgrounds? | Check if scoring rubrics or measurement criteria are tied to particular rhetorical conventions (e.g., thesis-first argumentation, specific citation styles, particular hedging patterns). | Students from different educational traditions may demonstrate understanding through alternative rhetorical structures. |

**Mitigation options when language bias is identified:**
- Use growth-over-time rather than absolute measures of linguistic performance
- Norm within language background groups where appropriate
- Count substantive contribution regardless of linguistic form
- Measure conceptual engagement (ideas expressed) rather than linguistic sophistication
- Accept code-switching as valid academic discourse

### 3c. Prior Education Bias Check

| # | Question | Evidence Required | If YES (Risk Identified) |
|---|----------|-------------------|--------------------------|
| P1 | Does this metric conflate prior schooling quality with current learning effort? | Check if the metric rewards pre-existing knowledge or skills rather than measuring growth or new learning. | Students from historically disadvantaged schools will score lower despite equivalent or greater learning effort. |
| P2 | Does baseline measurement separate starting point from trajectory? | Check if the metric uses an initial assessment or early measurement as a baseline and calculates change from that point. | Without baseline separation, students who start lower will always appear to perform worse, regardless of their rate of growth. |
| P3 | Are thresholds set relative to individual trajectory, not cohort norms? | Check if "good performance" is defined as improvement from the student's own baseline rather than comparison to class averages or absolute standards. | Cohort-normed thresholds penalize students from disadvantaged backgrounds who may be growing rapidly but from a lower starting point. |
| P4 | Does the metric account for different entry-level digital literacy? | Check if LMS navigation skill, familiarity with online learning tools, or digital fluency affects the metric independently of the learning being measured. | Students unfamiliar with digital learning environments may appear less engaged when they are actually spending effort on tool navigation rather than content. |

**Mitigation options when prior education bias is identified:**
- Use gain scores (change from baseline) rather than absolute scores
- Set individual baselines using early-course assessment data
- Measure growth trajectories rather than point-in-time performance
- Separate digital literacy effects from content learning effects
- Provide baseline digital literacy support and exclude navigation learning from engagement metrics

### 3d. Device Limitation Bias Check

| # | Question | Evidence Required | If YES (Risk Identified) |
|---|----------|-------------------|--------------------------|
| D1 | Does this metric disadvantage smartphone-only users? | Check if the measured interaction is significantly harder, slower, or different on small screens (e.g., complex form input, multi-tab workflows, drag-and-drop interactions). | Smartphone-only users will show lower scores for interactions that are designed for desktop use. |
| D2 | Are interaction patterns normalized for screen size constraints? | Check if click/tap patterns, scroll depth, time-to-complete, or navigation paths differ systematically by device type and whether the metric accounts for this. | Raw interaction counts will misrepresent mobile users' engagement if the same task requires more interactions on a small screen. |
| D3 | Does mobile data cost affect willingness to engage with the measured activity? | Check if the activity requires significant data transfer -- video streaming, large file downloads, image-heavy content -- that would consume costly mobile data. | Students rationing mobile data will avoid data-intensive activities, appearing less engaged when the barrier is economic, not motivational. |
| D4 | Is the metric measurable on low-bandwidth connections? | Check if data collection requires always-on connectivity, real-time synchronization, or high-bandwidth telemetry that may fail on slow connections. | Metrics that require high-bandwidth data collection will have missing or incomplete data for students on slow connections. |

**Mitigation options when device limitation bias is identified:**
- Normalize interaction metrics by device type (separate mobile and desktop interaction models)
- Avoid penalizing shorter mobile sessions -- measure session productivity rather than duration
- Ensure measured activities are mobile-accessible and mobile-optimized
- Use lightweight data collection that works on low-bandwidth connections
- Offer alternative interaction modes for data-intensive activities

---

## 4. Review Decision Framework

After completing all four bias check sections (16 questions total), the reviewer assigns one of four outcomes based on the pattern of identified risks.

### Decision Outcomes

#### APPROVED

**Criteria:** No significant bias risk identified across all four checks (all questions answered NO, or YES answers are negligible and self-evidently not harmful).

**Action:** Metric proceeds to specification without modification.

**Documentation required:** Brief statement confirming no bias risks were identified, with a one-sentence rationale for each bias check section.

#### APPROVED WITH MITIGATION

**Criteria:** Bias risk identified in one or more checks, but specific mitigation is documented, feasible, and can be incorporated into the metric's specification.

**Action:** Metric proceeds to specification WITH the mitigation measures incorporated into the metric definition. The mitigation becomes part of the metric, not an optional add-on.

**Documentation required:**
- Which specific risks were identified (by checklist item number)
- Which mitigation measures are being applied
- How the mitigation changes the metric definition (before/after)
- Why the mitigation adequately addresses the identified risk

#### FLAGGED FOR REVIEW

**Criteria:** Significant bias risk identified that cannot be mitigated through metric design alone. The risk requires a judgment call about whether the metric's value justifies its potential for harm.

**Action:** Metric specification is paused. The risk analysis is escalated to the user (or course coordinator) for a decision before specification proceeds.

**Documentation required:**
- The specific risk and why it cannot be designed away
- The metric's pedagogical value (what would be lost by not including it)
- Potential alternative measurement approaches
- The decision needed from the reviewer

#### REJECTED

**Criteria:** The metric cannot be fairly applied across the student population. The bias is inherent to the measurement approach and no feasible mitigation exists.

**Action:** Metric is not included in the specification. Alternative measurement approaches are suggested if possible.

**Documentation required:**
- Why the bias is inherent (not just present but unfixable)
- What alternative metrics could capture similar pedagogical insight without the bias
- Whether a fundamentally different measurement approach could work

### Decision Guidelines

- A single YES answer with clear mitigation = APPROVED WITH MITIGATION
- Multiple YES answers with clear mitigations = APPROVED WITH MITIGATION (mitigations compound)
- Any YES answer where mitigation is uncertain or insufficient = FLAGGED FOR REVIEW
- Systematic bias across multiple checks with no feasible mitigation = REJECTED
- When in doubt between APPROVED WITH MITIGATION and FLAGGED FOR REVIEW, choose FLAGGED FOR REVIEW (err on the side of human review)

---

## 5. Worked Examples

The following examples demonstrate how the equity review checklist is applied to candidate metrics. These are illustrative -- actual metric reviews will be conducted during Phases 4-6.

### Example A: "Session Duration" Metric

**Metric description:** Measures the total time a student spends in active LMS sessions per week, calculated from login/logout timestamps and inactivity timeouts.

#### Connectivity Bias Check

| # | Answer | Evidence | Notes |
|---|--------|----------|-------|
| C1 | **YES** | Session duration is entirely time-based, calculated from timestamps. A connectivity drop mid-session creates an artificial session end followed by a new session start, fragmenting actual study time. | Direct time-based measurement risk. |
| C2 | **YES** | LMS server logs require active connection. During load-shedding, no data is recorded even if the student is studying offline with downloaded materials. | Data source is always-online only. |
| C3 | **NO** | Not applicable in current design -- no offline activity capture exists yet (Phase 3 will address this). | Future mitigation pathway exists. |
| C4 | **YES** | Students rationing data will log shorter sessions, appearing less engaged. A student who studies for 2 hours via downloaded PDFs will show 0 minutes of session duration. | Session count is the direct measurement. |

**Connectivity bias identified:** 3 of 4 questions flagged.

#### Language Bias Check

| # | Answer | Evidence | Notes |
|---|--------|----------|-------|
| L1 | **NO** | Session duration does not measure any linguistic content. | No language component. |
| L2 | **NO** | Not applicable -- no vocabulary measures. | |
| L3 | **NO** | Not applicable -- no discourse measurement. | |
| L4 | **NO** | Not applicable -- no writing tradition assumptions. | |

**Language bias identified:** None.

#### Prior Education Bias Check

| # | Answer | Evidence | Notes |
|---|--------|----------|-------|
| P1 | **NO** | Session duration measures time spent, not knowledge level. | |
| P2 | **NO** | Not applicable -- duration is not a knowledge measure. | |
| P3 | **NO** | Not applicable to time measurement. | |
| P4 | **YES** | Students unfamiliar with the LMS may spend more time navigating rather than learning, inflating their session duration without corresponding learning gains. Conversely, digitally fluent students may accomplish the same learning in less time. | Digital literacy confound -- cuts both ways. |

**Prior education bias identified:** 1 of 4 questions flagged (minor, bidirectional effect).

#### Device Limitation Bias Check

| # | Answer | Evidence | Notes |
|---|--------|----------|-------|
| D1 | **YES** | Smartphone users have different session patterns -- shorter, more frequent sessions due to screen fatigue and mobile usage context (e.g., commuting). Total weekly duration may be equivalent but session structure differs. | Mobile session patterns differ fundamentally. |
| D2 | **NO** | Session duration is measured in time, not interaction counts, so screen size does not directly distort the measurement. | |
| D3 | **YES** | Students on mobile data will limit session duration to manage costs, especially for data-heavy course sections. | Economic barrier to session length. |
| D4 | **NO** | Session logging requires only login/logout events, which are low-bandwidth. | |

**Device bias identified:** 2 of 4 questions flagged.

#### Review Decision: APPROVED WITH MITIGATION

**Risks identified:** C1, C2, C4 (connectivity); P4 (prior education, minor); D1, D3 (device)

**Mitigations to incorporate into metric specification:**
1. **Do not use raw session duration as a standalone metric.** Instead, combine with activity completion data to create a "productive session time" measure.
2. **Normalize for known outage periods:** Exclude or weight-adjust time windows coinciding with scheduled load-shedding in the student's registered area.
3. **Do not compare absolute session durations across device types.** Report mobile and desktop session patterns separately, or normalize by device category.
4. **Supplement with offline activity data** when the Phase 3 offline sync pipeline is available.

**Metric definition change:** "Session Duration" becomes "Productive Session Time" -- measured as time spent in sessions where at least one learning activity was completed, normalized for device type and known connectivity disruptions.

---

### Example B: "Discussion Forum Posting Frequency" Metric

**Metric description:** Counts the number of substantive posts (excluding greetings and single-word replies) a student makes in course discussion forums per week.

#### Connectivity Bias Check

| # | Answer | Evidence | Notes |
|---|--------|----------|-------|
| C1 | **NO** | Posting frequency is a count, not a time-based measure. Posts are timestamped but the metric is the count, not the timing. | |
| C2 | **YES** | Forum posting requires active internet connection. Students cannot compose and queue posts offline in the current LMS. | Always-online activity. |
| C3 | **NO** | Forum posts are discrete events -- once posted, they are recorded. The issue is inability to post during outages, not data loss. | |
| C4 | **YES** | Each forum post requires a connection. Students rationing data may choose to read posts (lower data) rather than compose and submit replies (higher interaction cost). | Data rationing reduces posting willingness. |

**Connectivity bias identified:** 2 of 4 questions flagged.

#### Language Bias Check

| # | Answer | Evidence | Notes |
|---|--------|----------|-------|
| L1 | **NO** | The metric counts posts, not vocabulary. However, the "substantive" filter may implicitly favor longer, more linguistically complex posts. | Edge case -- depends on "substantive" definition. |
| L2 | **NO** | Not directly applicable, but see L1 note. | |
| L3 | **YES** | If the "substantive" filter is applied only to English text, code-switched posts (e.g., a post mixing isiZulu and English) may be misclassified as non-substantive. | Code-switching classification risk. |
| L4 | **YES** | Forum posting conventions (length, structure, formality) vary by educational tradition. Students from backgrounds where oral discussion is valued over written may participate less in text-based forums despite active engagement in face-to-face tutorials. | Written forum culture assumption. |

**Language bias identified:** 2 of 4 questions flagged.

#### Prior Education Bias Check

| # | Answer | Evidence | Notes |
|---|--------|----------|-------|
| P1 | **YES** | Students from schools with strong essay-writing traditions may be more comfortable posting in academic forums. The metric conflates prior writing confidence with current engagement willingness. | Writing confidence as prior education artifact. |
| P2 | **NO** | Posting frequency is measured from course start -- all students begin at zero posts. However, the rate of posting may differ based on comfort level. | Natural baseline exists (zero). |
| P3 | **NO** | The metric is a raw count, not compared to a threshold. However, if thresholds are later applied (e.g., "at least 3 posts per week"), they should be growth-based. | Future threshold risk. |
| P4 | **NO** | Forum posting is a basic LMS function accessible across digital literacy levels. | Low digital literacy barrier. |

**Prior education bias identified:** 1 of 4 questions flagged.

#### Device Limitation Bias Check

| # | Answer | Evidence | Notes |
|---|--------|----------|-------|
| D1 | **YES** | Composing forum posts on a smartphone is significantly harder than on a desktop keyboard. Students may write shorter, less frequent posts due to input difficulty, not lack of engagement. | Smartphone composition burden. |
| D2 | **NO** | Post count is device-independent once posted. | |
| D3 | **YES** | Loading forum threads with many posts consumes data. Students on limited data may avoid entering forums altogether, reducing their opportunity to post. | Data cost of forum participation. |
| D4 | **NO** | Posting a forum message is a low-bandwidth action. | |

**Device bias identified:** 2 of 4 questions flagged.

#### Review Decision: APPROVED WITH MITIGATION

**Risks identified:** C2, C4 (connectivity); L3, L4 (language); P1 (prior education); D1, D3 (device)

**Mitigations to incorporate into metric specification:**
1. **Define "substantive" inclusively:** A substantive post is any post that engages with course content, regardless of language, length, or rhetorical style. Code-switched posts are substantive. Short but on-topic posts are substantive.
2. **Measure growth in posting frequency, not absolute frequency.** A student who goes from 0 to 2 posts per week shows more engagement growth than one who maintains 5 posts per week.
3. **Include alternative participation channels:** Count tutorial contributions, peer feedback, and other forms of academic participation alongside forum posts to avoid privileging a single interaction mode.
4. **Do not set absolute frequency thresholds.** Use individual trajectory (is the student posting more than they used to?) rather than cohort comparison.
5. **Weight-adjust for device type:** Recognize that a smartphone post represents more effort than a desktop post.

**Metric definition change:** "Discussion Forum Posting Frequency" becomes "Academic Discussion Participation" -- measured as substantive contributions across all discussion channels (forums, tutorials, peer feedback), with growth trajectory as the primary indicator rather than absolute count, and code-switched contributions counted as valid participation.

---

## 6. Process and Governance

### When the Review is Conducted

The equity review is completed as part of metric specification during Phases 4, 5, and 6. It is not a separate process -- it is embedded in the specification document for each metric. A metric specification is not complete until the equity review section is filled in.

### Record Keeping

Each metric's specification document includes a completed equity review section showing:
- All 16 checklist questions with YES/NO answers and evidence
- The review decision (APPROVED / APPROVED WITH MITIGATION / FLAGGED FOR REVIEW / REJECTED)
- For mitigated metrics: the specific mitigations and how they change the metric definition
- For flagged metrics: the escalation decision and rationale
- For rejected metrics: the reason and any suggested alternatives

### Escalation Process

**FLAGGED FOR REVIEW** metrics are escalated to the user for decision before specification proceeds. The escalation includes:
1. The metric description and its pedagogical purpose
2. The identified bias risks with evidence
3. Why the risk cannot be mitigated through design alone
4. The decision options (proceed with acknowledged risk, modify the metric, abandon the metric)
5. The reviewer's recommendation

The user's decision and rationale are recorded in the metric specification document.

### Framework Updates

If new equity risks are identified during later phases (e.g., a bias pattern observed in pilot data), this framework can be updated:
1. Add new checklist items to the relevant section (or create a new section)
2. Document why the new risk was added
3. Previously-approved metrics that may be affected by the new risk should be re-reviewed
4. Updated framework version is recorded

### Relationship to DPIA

This equity review framework complements the Data Protection Impact Assessment (DPIA). The DPIA addresses privacy and data protection risks. This framework addresses fairness and equity risks. Both must be satisfied before a metric enters the specification.

---

*Framework version: 1.0*
*Created: 2026-03-07*
*Applies to: Phases 4, 5, and 6 metric specifications*
*Regulatory context: POPIA (Act 4 of 2013), Jisc Code of Practice for Learning Analytics*
