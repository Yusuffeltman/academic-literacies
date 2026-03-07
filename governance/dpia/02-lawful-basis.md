# DPIA Part 2: Lawful Basis and POPIA Conditions Mapping

**Document:** Data Protection Impact Assessment -- Lawful Basis
**System:** Academic Literacies Learning Analytics (ALE00Y1)
**Version:** 1.0 (Specification)
**Date:** 2026-03-07
**Status:** Draft for legal review

---

## 1. Overview of Lawful Basis

### 1.1 Primary Lawful Basis

The lawful basis for processing personal information in this analytics system is:

1. **Legitimate interest** (POPIA Section 11(1)(f)) -- The institution has a legitimate interest in understanding and improving student learning outcomes. Learning analytics serves this interest by making student development visible to educators and students themselves.

2. **Contractual necessity** (POPIA Section 11(1)(b)) -- Analytics are part of the course experience as enrolled. Students participate in learning analytics as an integral component of the Academic Literacies course, not as a separate opt-in service.

**The lawful basis is NOT consent-only.** While students are informed about data processing (transparency obligation under POPIA Section 18), and enrollment constitutes acceptance of the course terms including analytics, standalone consent is not relied upon as the sole legal ground. This avoids the "consent myth" pitfall: under POPIA Section 11(2), consent can be withdrawn at any time, which would create operational impossibility for course-integrated analytics (see Werksmans, 2026, "Moving beyond the consent myth under POPIA").

### 1.2 Legitimate Interest Assessment

Per the USAf POPIA Code of Conduct and established legitimate interest analysis methodology:

**Step 1 -- Purpose test:** Is the purpose legitimate?
- Yes. Improving student learning outcomes and identifying struggling students early are core functions of a university.

**Step 2 -- Necessity test:** Is the processing necessary for that purpose?
- Yes. Learning analytics requires collecting and analyzing student interaction data. Without processing, the pedagogical purpose cannot be achieved.

**Step 3 -- Balancing test:** Do the data subject's interests override the legitimate interest?
- The analytics system is designed to benefit data subjects (students) directly through self-reflection tools, early intervention, and evidence-based tutoring. Safeguards (access controls, purpose limitation, retention limits, objection rights) mitigate privacy risks. The balance favours processing with appropriate safeguards.

**Step 4 -- Safeguards:** What safeguards are in place?
- See 04-safeguards.md for full technical and organizational safeguard documentation.
- Key safeguards: role-based access control, minimum group size for aggregation, purpose limitation, end-of-academic-year deletion, objection rights under Section 11(3).

---

## 2. POPIA Eight Conditions Mapping

The following sections map each data collection activity (as described in 01-processing-description.md) against POPIA's eight conditions for lawful processing.

For brevity and clarity, conditions that apply uniformly across all activities are documented once in a shared section, while activity-specific details are documented per activity.

---

### Condition 1: Accountability (POPIA Section 8)

*Applies uniformly to all data collection activities.*

| Element | Detail |
|---------|--------|
| **Responsible party** | The institution (university), acting through the Academic Literacies teaching team |
| **Information Officer** | The institution's designated Information Officer as registered with the Information Regulator |
| **Deputy Information Officers** | Academic department head (delegated responsibility for course-level data) |
| **Operator/processor** | LMS platform vendor processes data on behalf of the institution under a processing agreement |
| **Hosting provider** | Infrastructure provider stores data under a processing agreement with appropriate security terms |
| **Compliance measures** | This DPIA; staff training on data handling; annual DPIA review; incident response procedures |

The responsible party ensures that all conditions for lawful processing are met and that the measures documented in this DPIA are implemented and maintained.

---

### Condition 2: Processing Limitation (POPIA Sections 9-12)

#### 2.1 Lawful Basis per Activity

| Activity | Lawful Basis | Justification |
|----------|-------------|---------------|
| LMS Interaction Events | Legitimate interest (Section 11(1)(f)) + Contractual necessity (Section 11(1)(b)) | Engagement tracking is integral to the course design; enables early identification of disengaging students |
| Discussion Forum Activity | Legitimate interest (Section 11(1)(f)) + Contractual necessity (Section 11(1)(b)) | Forum participation is a course activity; discourse analysis measures academic development |
| Writing Sample Submissions | Legitimate interest (Section 11(1)(f)) + Contractual necessity (Section 11(1)(b)) | Writing tasks are core course assessments; quality tracking measures literacy development |
| Quiz/Assessment Attempts | Legitimate interest (Section 11(1)(f)) + Contractual necessity (Section 11(1)(b)) | Quizzes are course assessments; performance tracking is standard educational practice |
| Self-Report Questionnaires | Legitimate interest (Section 11(1)(f)) + Contractual necessity (Section 11(1)(b)) | Self-report instruments are administered as course activities; subjective data complements behavioral metrics |
| Session/Login Metadata | Legitimate interest (Section 11(1)(f)) | Session data is collected automatically; provides baseline engagement context and equity normalization |
| Curriculum Progress | Legitimate interest (Section 11(1)(f)) + Contractual necessity (Section 11(1)(b)) | Progress tracking is inherent to structured course delivery |

**Note:** No activity relies on consent as the sole lawful basis. Consent is obtained through enrollment and course terms, but legitimate interest and contractual necessity provide the primary legal ground. This ensures that analytics processing is not disrupted by consent withdrawal under Section 11(2).

#### 2.2 Adequacy and Minimality (Section 9(3))

For each activity, only data that serves the documented pedagogical purpose is collected:

| Activity | Adequacy Rationale | What is NOT Collected |
|----------|-------------------|----------------------|
| LMS Interaction Events | Page views, time-on-task, and navigation are the minimum needed for engagement metrics | Keystroke logging, mouse movement tracking, screen recording |
| Discussion Forum Activity | Post content, threading, and frequency are needed for CoP participation indicators | Private messages between students, draft text before submission |
| Writing Sample Submissions | Submitted text is needed for discourse analysis | Revision history keystrokes, copy-paste sources, writing process metadata |
| Quiz/Assessment Attempts | Scores, responses, and timing are needed for mastery and calibration metrics | Biometric data during quizzes, proctoring data, webcam footage |
| Self-Report Questionnaires | Structured responses and goals are the defined instrument outputs | Open-ended personal disclosure beyond instrument scope |
| Session/Login Metadata | Login times, duration, and device category are needed for engagement baseline | IP addresses (stored only for security), precise geolocation, device fingerprints |
| Curriculum Progress | Completion status and timestamps are needed for pace calculation | Idle screen time between activities, background application data |

#### 2.3 Objection Rights (Section 11(3))

Even though legitimate interest is the primary lawful basis, POPIA Section 11(3) grants data subjects the right to object to processing on reasonable grounds relating to their particular situation. The objection process is documented in full in 05-data-subject-rights.md, Section 4.

---

### Condition 3: Purpose Specification (POPIA Sections 13-14)

#### 3.1 Specific Purpose per Activity

Each data collection activity has a specific, explicitly defined, and lawful purpose as required by Section 13:

| Activity | Specific Purpose |
|----------|-----------------|
| LMS Interaction Events | Measure engagement patterns and study habits to identify disengaging students early and support self-directed learning development |
| Discussion Forum Activity | Track Communities of Practice participation trajectory and academic discourse adoption |
| Writing Sample Submissions | Monitor academic literacy development over time to support evidence-based tutoring and individual learning plans |
| Quiz/Assessment Attempts | Assess content mastery, detect knowledge gaps, and measure metacognitive calibration accuracy |
| Self-Report Questionnaires | Capture subjective learning experience to complement behavioral indicators and promote metacognitive awareness |
| Session/Login Metadata | Establish baseline engagement indicators and normalize metrics for connectivity and device equity |
| Curriculum Progress | Monitor pace relative to expected trajectory for early warning and self-directed learning indicators |

All purposes are pedagogical. No data is collected for purposes unrelated to supporting student learning in ALE00Y1.

#### 3.2 Retention Limitation (Section 14)

**Retention period:** All individual-level data is retained until the end of the academic year in which it was collected.

**Deletion trigger:** End of academic year (defined as the date final results are published for the relevant semester/year).

**Deletion scope:** All individual-level data across all activities. Aggregated cohort statistics (which are no longer personal information) may be retained for teaching quality improvement.

**Detailed retention and deletion procedures:** See governance/retention/data-lifecycle-spec.md (Plan 01-02).

#### 3.3 Student Notification (Section 18)

Students are notified about data processing through:

1. **Course enrollment materials:** Plain-language description of analytics included in course information provided at registration
2. **Application privacy notice:** Accessible within the application, describing what data is collected, why, and how it is used
3. **First-login notification:** On first access to the application, a clear notification summarises the analytics system and links to the full privacy notice
4. **Questionnaire preamble:** Before each self-report instrument, a brief statement explains why the data is being collected and how it will be used

---

### Condition 4: Further Processing Limitation (POPIA Section 15)

*Applies uniformly to all data collection activities.*

#### 4.1 Permitted Secondary Uses

| Secondary Use | Compatibility Assessment |
|---------------|------------------------|
| Aggregated cohort analysis for teaching team | Compatible -- directly supports the primary pedagogical purpose; individual data is not disclosed at team level |
| Course improvement analysis | Compatible -- using aggregated patterns to improve course design serves the original educational purpose |
| Research (fully anonymized) | Compatible -- subject to institutional ethics committee approval; data must be irreversibly anonymized before use |

#### 4.2 Explicitly Prohibited Uses

The following uses of analytics data are **prohibited**:

| Prohibited Use | Rationale |
|----------------|-----------|
| **Punitive action** based on analytics data alone | Analytics data indicates potential difficulty, not fault; punitive use would undermine trust and the pedagogical purpose |
| **Surveillance** of students beyond the documented pedagogical purpose | Analytics serves learning support, not monitoring compliance or behavior control |
| **Third-party commercial use** | Student data is not a commercial asset; no sale, licensing, or sharing for commercial purposes |
| **Automated decision-making** with legal effects without human review | POPIA Section 71 protections apply; automated flags trigger human review, not automated consequences |
| **Employment or admissions decisions** by the institution | Analytics data from this course cannot be used in unrelated institutional decisions |
| **Sharing with external parties** beyond documented processors | Only contracted operators/processors with appropriate agreements may access data |

---

### Condition 5: Information Quality (POPIA Section 16)

#### 5.1 Accuracy Measures per Activity

| Activity | Accuracy Measure |
|----------|-----------------|
| LMS Interaction Events | Timestamped event logging with server-side validation; deduplication for offline-sync replays |
| Discussion Forum Activity | Content stored as submitted; metadata generated server-side |
| Writing Sample Submissions | Stored as submitted by the student; no automated modification of content |
| Quiz/Assessment Attempts | Scores computed server-side from validated answer keys; attempt records are immutable |
| Self-Report Questionnaires | Responses recorded as submitted; structured instruments reduce ambiguity |
| Session/Login Metadata | Server-side session tracking; client-reported device type validated against user-agent |
| Curriculum Progress | Derived from verified completion events; progress recomputed on each sync |

#### 5.2 Handling Missing Data and Connectivity Gaps

The South African context presents specific data quality challenges:

- **Load-shedding:** Power outages interrupt sessions mid-activity. The system must distinguish between a session that ended due to load-shedding and a genuine disengagement event.
- **Mobile data costs:** Students may limit their usage to conserve data, producing lower interaction volumes that do not reflect lower engagement.
- **Intermittent connectivity:** Events may arrive out of order or in delayed batches after offline periods.

**Mitigation:**
- Offline event queuing with sequence numbers enables correct ordering on sync
- Missing data flags are attached to metrics when data coverage falls below a defined threshold
- Time-on-task calculations exclude periods flagged as connectivity interruptions
- Engagement metrics are normalized for known connectivity constraints where device/connection type indicates limitations

See governance/dpia/03-risk-assessment.md, Risk 4 (Connectivity-Gap Data Quality) for full risk analysis.

---

### Condition 6: Openness (POPIA Sections 17-18)

*Applies uniformly to all data collection activities.*

#### 6.1 Privacy Notice Requirements

The following information is made available to students in plain language:

| Requirement (Section 18) | How Addressed |
|--------------------------|---------------|
| Identity of responsible party | Institution name and department in privacy notice |
| Purpose of processing | Specific pedagogical purposes listed per data activity |
| Description of data collected | Summary of all activities and data types |
| Recipients or categories of recipients | Tutor (assigned only), teaching team (aggregated), system admin (technical) |
| Right to object (Section 11(3)) | Objection process described with contact information |
| Right to lodge complaint with Information Regulator | Contact details for the Information Regulator included |
| Whether cross-border transfer occurs | Stated (no planned cross-border transfer, or POPIA Section 72 compliance if applicable) |
| Any further information needed for fair processing | Retention period, deletion rights, access request process |

#### 6.2 Plain Language Commitment

All student-facing privacy communications are written in plain language accessible to first-year university students. Technical and legal terminology is accompanied by plain-language explanations. Communications are available in the primary language(s) of instruction.

#### 6.3 Registration with Information Regulator

The institution's registration under POPIA Section 55 covers the processing described in this DPIA. The analytics system's processing activities are included in the institution's processing register.

---

### Condition 7: Security Safeguards (POPIA Sections 19-22)

Security safeguards for this analytics system are documented in detail in **governance/dpia/04-safeguards.md**.

**Summary of key safeguards:**

| Category | Measure |
|----------|---------|
| **Technical** | Encryption at rest and in transit; role-based access control; tutor-student mapping enforcement; minimum group size (10) for aggregation; audit logging; automated end-of-year deletion |
| **Organizational** | Staff training; tutor onboarding; data handling policy; incident response procedure; annual DPIA review |
| **Breach notification** | POPIA Section 22 compliance: notification to Information Regulator and affected data subjects as soon as reasonably possible after discovery of a compromise |

The responsible party takes reasonable measures to secure the integrity and confidentiality of personal information as required by Section 19, taking into account generally accepted information security practices and procedures.

---

### Condition 8: Data Subject Participation (POPIA Sections 23-25)

Data subject rights and their implementation procedures are documented in detail in **governance/dpia/05-data-subject-rights.md**.

**Summary of rights implemented:**

| Right | Implementation |
|-------|---------------|
| **Access (Section 23)** | Full data export in readable format on request |
| **Correction (Section 24)** | Process for correcting inaccurate self-reported data; system-collected events are factual records |
| **Deletion (Section 24)** | Available after course ends; covers all individual-level data; aggregated statistics retained |
| **Objection (Section 11(3))** | Written request to Information Officer; processing stops for that individual; legal review flagged for course-integrated analytics conflict |
| **Complaint (Section 74)** | Right to lodge complaint with the Information Regulator |

---

## 3. Activity-by-Condition Matrix

The following matrix provides an at-a-glance view of how each activity addresses each POPIA condition. Detailed documentation is in the sections above and in the referenced companion documents.

| Activity | 1. Accountability | 2. Processing Limitation | 3. Purpose Spec | 4. Further Processing | 5. Info Quality | 6. Openness | 7. Security | 8. Data Subject |
|----------|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| LMS Interaction Events | Shared | LI + CN | Engagement tracking | Agg. cohort OK | Event validation | Privacy notice | 04-safeguards | 05-rights |
| Discussion Forum | Shared | LI + CN | CoP participation | Agg. cohort OK | As-submitted | Privacy notice | 04-safeguards | 05-rights |
| Writing Samples | Shared | LI + CN | Literacy development | Agg. cohort OK | As-submitted | Privacy notice | 04-safeguards | 05-rights |
| Quiz/Assessment | Shared | LI + CN | Mastery + calibration | Agg. cohort OK | Server-computed | Privacy notice | 04-safeguards | 05-rights |
| Self-Report | Shared | LI + CN | Subjective experience | Agg. cohort OK | As-submitted | Privacy notice | 04-safeguards | 05-rights |
| Session Metadata | Shared | LI | Engagement baseline | Agg. cohort OK | Server-tracked | Privacy notice | 04-safeguards | 05-rights |
| Curriculum Progress | Shared | LI + CN | Pace monitoring | Agg. cohort OK | Event-derived | Privacy notice | 04-safeguards | 05-rights |

**Key:** LI = Legitimate Interest (Section 11(1)(f)), CN = Contractual Necessity (Section 11(1)(b)), Agg. = Aggregated

---

## 4. References

- Protection of Personal Information Act, 2013 (Act 4 of 2013) -- Sections 8-25
- USAf POPIA Code of Conduct for Public Universities (2020)
- Werksmans (2026), "Moving beyond the consent myth under POPIA"
- Jisc Code of Practice for Learning Analytics (2023)
- DELICATE Checklist (Drachsler & Greller, 2016)

---

*Document: governance/dpia/02-lawful-basis.md*
*Part of: Data Protection Impact Assessment for ALE00Y1 Learning Analytics*
*Previous: 01-processing-description.md (Processing Description)*
*Next: 03-risk-assessment.md (Risk Assessment)*
