# DPIA Part 1: Processing Description

**Document:** Data Protection Impact Assessment -- Processing Description
**System:** Academic Literacies Learning Analytics (ALE00Y1)
**Version:** 1.0 (Specification)
**Date:** 2026-03-07
**Status:** Draft for legal review

---

## 1. Introduction

### 1.1 Responsible Party

The institution (university) acts as the responsible party under POPIA Section 1, in its capacity as the provider of the Academic Literacies course (ALE00Y1). Processing is conducted under the institution's authority for the purpose of supporting student learning outcomes.

This document does not name individuals. Roles are defined institutionally.

### 1.2 Information Officer

The institution's designated Information Officer, as registered with the Information Regulator under POPIA Section 55, is responsible for ensuring compliance with this DPIA. Day-to-day data handling for the analytics system is delegated to the Academic Literacies teaching team under the Information Officer's oversight.

### 1.3 Scope

This DPIA covers the learning analytics specification for the Academic Literacies course (ALE00Y1), a first-year academic literacy module. The analytics system collects and processes student interaction data to:

- Make student development toward academic community membership visible and measurable
- Identify struggling students early through evidence-based indicators
- Support individually-tailored learning plans through tutor consultation evidence

The system serves three audiences: students (self-reflection), tutors (consultation evidence), and the teaching team (cohort patterns).

### 1.4 Legal Review Notice

This DPIA has been prepared as part of the analytics system specification. It documents the analytics-specific data processing activities and their pedagogical rationale. **A legal team review is expected before any implementation proceeds.** The document is structured to facilitate that review by explicitly mapping each activity to POPIA's eight conditions for lawful processing (see 02-lawful-basis.md).

### 1.5 Regulatory Framework

- **Primary:** Protection of Personal Information Act, 2013 (POPIA)
- **Sector guidance:** USAf POPIA Code of Conduct for Public Universities (2020)
- **Ethics framework:** Jisc Code of Practice for Learning Analytics (2023)
- **Supplementary:** DELICATE Checklist (Drachsler & Greller, 2016)

---

## 2. Data Collection Activities

The following sections describe each data collection activity in the analytics system. Every activity documents its pedagogical purpose -- answering "How does collecting this data help the student learn?" -- as required by POPIA Section 13 (purpose specification) and the project's governance framework.

---

### 2.1 LMS Interaction Events

**Activity Name:** LMS Interaction Event Tracking

**Data Collected:**
- Page/module view events (resource ID, timestamp, duration)
- Navigation sequences (page transitions, reading order)
- Time-on-task measurements (active time per resource, idle detection)
- Content interaction events (scroll depth, video play/pause/completion)

**Data Subjects:**
- **Primary:** Students enrolled in ALE00Y1
- **Secondary:** None (tutor interactions are not captured in this activity)

**Pedagogical Purpose:** LMS interaction data provides the foundation for engagement metrics that track whether students are accessing learning materials regularly and spending sufficient time with them. This enables early identification of disengaging students -- a key predictor of academic difficulty -- so that tutors can intervene before assessment failure. Time-on-task and navigation patterns also inform self-directed learning indicators, helping students understand their own study habits.

**Collection Method:** Automatic capture via LMS event logging. Student interactions generate xAPI statements stored in a Learning Record Store (LRS). No additional student action is required beyond normal course participation.

**Volume and Frequency:**
- Estimated 50-200 events per student per active session
- 2-5 sessions per week per student during semester
- Approximately 5,000-25,000 events per student per semester

**Third Parties:**
- LMS platform vendor (operator/processor): processes events within the platform
- Hosting provider: infrastructure for LRS storage
- No third-party commercial access to individual-level data

---

### 2.2 Discussion Forum Activity

**Activity Name:** Discussion Forum Post and Reply Tracking

**Data Collected:**
- Forum posts (content text, timestamp, thread ID, word count)
- Replies to other students' posts (content text, parent post reference, timestamp)
- Reply depth and threading position
- Post frequency and temporal distribution

**Data Subjects:**
- **Primary:** Students enrolled in ALE00Y1
- **Secondary:** Tutors, when they post in forums (tutor posts are captured as context for student interaction analysis, though tutor-specific analytics are not the primary purpose)

**Pedagogical Purpose:** Discussion forum activity is a primary indicator of Communities of Practice (CoP) participation. Tracking post and reply patterns reveals a student's movement from peripheral participation (reading only) through responding to peers, contributing original ideas, and synthesizing group knowledge. Academic discourse markers in forum posts provide evidence of disciplinary language adoption. This data directly supports tutor consultation by showing which students are engaging substantively with peers versus remaining isolated.

**Collection Method:** Automatic capture when students submit forum posts or replies. Content text is stored for academic discourse analysis (vocabulary markers, argument structure). xAPI statements record the interaction event.

**Volume and Frequency:**
- Estimated 2-10 posts/replies per student per week during active discussion periods
- Approximately 50-200 forum interactions per student per semester
- Content text stored per post (typically 50-500 words each)

**Third Parties:**
- LMS platform vendor (forum hosting and content storage)
- Hosting provider (infrastructure)

---

### 2.3 Writing Sample Submissions

**Activity Name:** Writing Sample Collection

**Data Collected:**
- Writing task submissions (full text: paragraphs, essays, reflections)
- Submission metadata (timestamp, task ID, word count, revision count)
- Writing quality progression indicators (derived from text analysis)

**Data Subjects:**
- **Primary:** Students enrolled in ALE00Y1

**Pedagogical Purpose:** Writing samples are the most direct evidence of academic literacy development. Tracking writing quality over time -- vocabulary range, argument structure, citation patterns, register appropriateness -- reveals whether students are developing the discourse competencies that define academic community membership. This longitudinal view of writing development is essential for tutors building individual learning plans: it shows what specific literacy skills a student needs to work on and whether previous interventions are having an effect.

**Collection Method:** Student submission through the application's writing task interface. Submissions are stored as submitted. Text analysis for discourse indicators may be performed server-side.

**Volume and Frequency:**
- Estimated 1-3 writing submissions per student per week
- Approximately 20-60 submissions per student per semester
- Full text stored per submission (typically 100-2,000 words each)

**Third Parties:**
- Hosting provider (storage infrastructure)
- No external text analysis services in v1 (all processing internal)

---

### 2.4 Quiz and Assessment Attempts

**Activity Name:** Quiz Performance Recording

**Data Collected:**
- Quiz attempt records (quiz ID, timestamp, duration, score)
- Individual question responses (question ID, selected answer, correct/incorrect)
- Attempt sequence (first attempt, retakes)
- Time per question (where measurable)

**Data Subjects:**
- **Primary:** Students enrolled in ALE00Y1

**Pedagogical Purpose:** Quiz and assessment data provides direct evidence of content mastery and knowledge gaps. Performance trends over time reveal whether a student is progressing, stagnating, or declining -- triggering different intervention approaches. The correlation between a student's self-predicted performance and actual quiz results is a key indicator of metacognitive awareness (calibration accuracy), which is central to self-directed learning development. Quiz data also supports the teaching team's cohort-level analysis of which content areas need additional instruction.

**Collection Method:** Automatic capture when students complete quiz attempts within the application. xAPI statements record each attempt with score and response detail.

**Volume and Frequency:**
- Estimated 2-5 quiz attempts per student per week
- Approximately 40-100 quiz attempts per student per semester
- Per-question response data for each attempt

**Third Parties:**
- LMS platform vendor (quiz delivery and scoring)
- Hosting provider (infrastructure)

---

### 2.5 Self-Report Questionnaire Responses

**Activity Name:** Self-Report Questionnaires (Confidence, Goal-Setting, Strategy-Use)

**Data Collected:**
- Confidence ratings (Likert-scale responses on perceived competence)
- Goal-setting entries (student-defined learning goals, free text)
- Strategy-use self-assessments (study strategy selection and perceived effectiveness)
- Response timestamps and completion status

**Data Subjects:**
- **Primary:** Students enrolled in ALE00Y1

**Pedagogical Purpose:** Self-report data captures the subjective dimension of learning that behavioral data cannot. A student may be completing all tasks (high engagement metrics) but feel overwhelmed and underconfident -- a mismatch that predicts future disengagement. Conversely, a student who is struggling but setting realistic goals and adopting effective strategies is on a positive trajectory. Self-report data enables the analytics system to combine behavioral and experiential evidence, providing tutors with a more complete picture for consultation. It also powers the student-facing self-reflection dashboard, promoting metacognitive awareness.

**Collection Method:** Periodic questionnaires administered within the application at specified intervals (e.g., beginning/end of module, mid-semester, end-of-semester). Students complete instruments as part of course activities. Responses are stored as structured data (Likert scales) and free text (goals).

**Volume and Frequency:**
- Estimated 3-6 questionnaire administrations per semester
- 10-20 items per questionnaire
- Approximately 30-120 individual responses per student per semester

**Third Parties:**
- Hosting provider (storage infrastructure)
- No external survey platforms (instruments embedded in application)

---

### 2.6 Session and Login Metadata

**Activity Name:** Session/Login Tracking

**Data Collected:**
- Login events (timestamp, authentication method)
- Session duration (start time, end time, active time)
- Device type (smartphone, tablet, desktop -- category only, not device fingerprint)
- Connection type indicator (where available: wifi, mobile data, offline-sync)
- Session frequency and temporal patterns (day of week, time of day)

**Data Subjects:**
- **Primary:** Students enrolled in ALE00Y1

**Pedagogical Purpose:** Session metadata is the baseline engagement indicator. Login frequency and session duration patterns reveal study habits and regularity -- key predictors of academic success. Device type data informs equity considerations: if a student exclusively uses a smartphone on mobile data, their interaction patterns should be interpreted differently than a desktop user with stable wifi. This data also enables the system to normalize other metrics for connectivity constraints, preventing students with poor infrastructure from being falsely flagged as disengaged.

**Collection Method:** Automatic capture at session initiation and termination. Device type detected from user-agent or application platform. Connection type captured where the application platform provides this information.

**Volume and Frequency:**
- Estimated 10-30 sessions per student per month
- One login event per session
- Session metadata is lightweight (approximately 5-10 data points per session)

**Third Parties:**
- Authentication provider (if federated login is used)
- Hosting provider (infrastructure)

---

### 2.7 Curriculum Position and Progress Tracking

**Activity Name:** Curriculum Position/Progress Tracking

**Data Collected:**
- Module/unit completion status (completed, in-progress, not started)
- Completion timestamps per curriculum element
- Progress percentage through course curriculum
- Pace relative to expected timeline (ahead, on track, behind)
- Sequence of curriculum element completion (linear vs non-linear progression)

**Data Subjects:**
- **Primary:** Students enrolled in ALE00Y1

**Pedagogical Purpose:** Curriculum progress tracking enables the system to identify students who are falling behind the expected pace before this becomes a crisis. "Behind pace" is one of the earliest and most reliable indicators that a student needs support. Progress data also reveals study patterns -- whether a student works linearly through the curriculum or jumps between topics -- which informs self-directed learning indicators. For tutors, knowing exactly where a student is in the curriculum is essential context for consultation: it shows what content has been encountered and what lies ahead.

**Collection Method:** Automatic derivation from LMS interaction events and assessment completion records. Progress status is computed from completion events against the defined curriculum structure.

**Volume and Frequency:**
- Updated with each content completion or assessment event
- Approximately 20-50 curriculum position updates per student per semester
- Lightweight derived data (status flags and timestamps)

**Third Parties:**
- LMS platform vendor (curriculum structure and completion tracking)
- Hosting provider (infrastructure)

---

## 3. Summary of Data Activities

| # | Activity | Data Type | Collection Method | Primary Purpose |
|---|----------|-----------|-------------------|-----------------|
| 2.1 | LMS Interaction Events | Behavioral (automatic) | LMS event logging | Engagement and study habit indicators |
| 2.2 | Discussion Forum Activity | Behavioral + Content | Forum submission capture | CoP participation and discourse adoption |
| 2.3 | Writing Sample Submissions | Content (student-generated) | Task submission | Academic literacy development tracking |
| 2.4 | Quiz/Assessment Attempts | Performance (automatic) | Quiz completion capture | Content mastery and metacognitive calibration |
| 2.5 | Self-Report Questionnaires | Self-reported (periodic) | In-app questionnaire | Subjective experience and self-regulation |
| 2.6 | Session/Login Metadata | Technical (automatic) | Session lifecycle events | Baseline engagement and equity normalization |
| 2.7 | Curriculum Progress | Derived (automatic) | Computed from events | Pace monitoring and early warning |

---

## 4. Cross-Cutting Notes

### 4.1 Data Subjects

All data activities involve students enrolled in ALE00Y1 as primary data subjects. Tutors are secondary data subjects only in Activity 2.2 (Discussion Forum), where their forum posts may be captured as context for student interaction analysis.

### 4.2 Special Categories of Personal Information

No special categories of personal information as defined in POPIA Section 26 (race, ethnicity, religion, health, sexual orientation, biometric data, trade union membership, political persuasion, criminal record) are intentionally collected. Demographic data is not collected by the analytics system. Free-text fields (writing samples, forum posts, goal-setting entries) may incidentally contain personal information of a special nature; processing of such incidental content is governed by the purpose limitation and access controls documented in this DPIA.

### 4.3 Children's Data

POPIA Section 35 restricts processing of children's (under 18) personal information. The majority of ALE00Y1 students are adults (18+). For any enrolled students under 18, the institution's existing enrollment processes (which include competent person consent) apply. The analytics system does not apply different processing rules based on age -- it processes all enrolled students' data under the same governance framework.

### 4.4 Cross-Border Transfer

No cross-border transfer of personal information is planned. All data is stored and processed within South Africa or in compliance with POPIA Section 72 requirements if cloud infrastructure is hosted outside the Republic.

---

*Document: governance/dpia/01-processing-description.md*
*Part of: Data Protection Impact Assessment for ALE00Y1 Learning Analytics*
*Next: 02-lawful-basis.md (POPIA Conditions Mapping)*
