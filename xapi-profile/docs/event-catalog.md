# Event Catalog: Academic Literacies Learning Analytics

This catalog lists every event type captured by the Academic Literacies learning analytics system. Each event documents its pedagogical purpose and references the DPIA section that authorizes its collection.

**Total event types:** 22
**Profile:** Academic Literacies xAPI Profile (`https://w3id.org/xapi/aclit`)

---

## Navigation Events

### Session Open

| Field | Value |
|-------|-------|
| **Verb** | loggedin (`https://brindlewaye.com/xAPITerms/verbs/loggedin`) |
| **Activity Type** | Learning Session (`https://w3id.org/xapi/aclit/v1/activity-types/session`) |
| **Description** | Generated when a student logs in and begins a learning session |
| **DPIA Reference** | DPIA 2.6: Session and Login Metadata |
| **Pedagogical Purpose** | Session frequency and timing patterns reveal engagement regularity. Declining login frequency is an early indicator of disengagement, enabling proactive tutor outreach before academic performance deteriorates. |
| **Metric Domain** | Engagement |
| **Key Extensions** | device-type (Context), connection-type (Context) |

### Session Close

| Field | Value |
|-------|-------|
| **Verb** | loggedout (`https://brindlewaye.com/xAPITerms/verbs/loggedout`) |
| **Activity Type** | Learning Session (`https://w3id.org/xapi/aclit/v1/activity-types/session`) |
| **Description** | Generated when a student logs out or their session ends |
| **DPIA Reference** | DPIA 2.6: Session and Login Metadata |
| **Pedagogical Purpose** | Session duration (computed from open-close pairs) indicates depth of engagement per visit. Very short sessions may signal access barriers; very long sessions may indicate productive study or struggling without progress. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.duration |

### Page/Resource Viewed

| Field | Value |
|-------|-------|
| **Verb** | viewed (`http://id.tincanapi.com/verb/viewed`) |
| **Activity Type** | Page (`http://activitystrea.ms/schema/1.0/page`) |
| **Description** | Generated when a student views a page or resource within the application |
| **DPIA Reference** | DPIA 2.1: LMS Interaction Events |
| **Pedagogical Purpose** | Page view sequences reveal navigation patterns and content access breadth. Students who skip content sections may need guidance on learning pathways. |
| **Metric Domain** | Engagement |
| **Key Extensions** | None |

### Module Navigation

| Field | Value |
|-------|-------|
| **Verb** | experienced (`http://adlnet.gov/expapi/verbs/experienced`) |
| **Activity Type** | Module (`http://adlnet.gov/expapi/activities/module`) |
| **Description** | Generated when a student navigates to a module |
| **DPIA Reference** | DPIA 2.1: LMS Interaction Events |
| **Pedagogical Purpose** | Module-level navigation tracks which content areas students engage with, enabling identification of under-accessed modules and informing curriculum review. |
| **Metric Domain** | Engagement |
| **Key Extensions** | None |

---

## Reading Events

### Reading Section Viewed

| Field | Value |
|-------|-------|
| **Verb** | viewed (`http://id.tincanapi.com/verb/viewed`) |
| **Activity Type** | Reading Section (`https://w3id.org/xapi/aclit/v1/activity-types/reading-section`) |
| **Description** | Generated when a student views a reading section within a module |
| **DPIA Reference** | DPIA 2.1: LMS Interaction Events |
| **Pedagogical Purpose** | Section-level reading tracking identifies where students spend time and which sections they skip. Combined with assessment data, this reveals whether students who skip readings underperform on related tasks. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.duration |

### Reading Section Completed

| Field | Value |
|-------|-------|
| **Verb** | completed (`http://adlnet.gov/expapi/verbs/completed`) |
| **Activity Type** | Reading Section (`https://w3id.org/xapi/aclit/v1/activity-types/reading-section`) |
| **Description** | Generated when a student completes (reaches the end of) a reading section |
| **DPIA Reference** | DPIA 2.1: LMS Interaction Events |
| **Pedagogical Purpose** | Reading completion rates correlate with assessment readiness. Students who consistently leave readings incomplete may benefit from scaffolded reading strategies or shorter content chunks. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.completion |

---

## Quiz Events

### Quiz Attempted

| Field | Value |
|-------|-------|
| **Verb** | attempted (`http://adlnet.gov/expapi/verbs/attempted`) |
| **Activity Type** | Assessment (`http://adlnet.gov/expapi/activities/assessment`) |
| **Description** | Generated when a student begins a quiz attempt |
| **DPIA Reference** | DPIA 2.4: Quiz and Assessment Attempts |
| **Pedagogical Purpose** | Quiz attempt timing relative to content access reveals preparation patterns. Students who attempt quizzes without engaging prerequisite content may need guidance on study strategies. |
| **Metric Domain** | Engagement, SDL |
| **Key Extensions** | result.score (recommended) |

### Quiz Completed

| Field | Value |
|-------|-------|
| **Verb** | completed (`http://adlnet.gov/expapi/verbs/completed`) |
| **Activity Type** | Assessment (`http://adlnet.gov/expapi/activities/assessment`) |
| **Description** | Generated when a student finishes a quiz (regardless of pass/fail) |
| **DPIA Reference** | DPIA 2.4: Quiz and Assessment Attempts |
| **Pedagogical Purpose** | Completion with score data enables performance trend analysis. Declining trends trigger early warnings; improving trends confirm intervention effectiveness. Duration data reveals test-taking strategies. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.score, result.completion, result.duration |

### Quiz Passed

| Field | Value |
|-------|-------|
| **Verb** | passed (`http://adlnet.gov/expapi/verbs/passed`) |
| **Activity Type** | Assessment (`http://adlnet.gov/expapi/activities/assessment`) |
| **Description** | Generated when a student passes a quiz (score meets threshold) |
| **DPIA Reference** | DPIA 2.4: Quiz and Assessment Attempts |
| **Pedagogical Purpose** | Pass events with scores enable mastery tracking. The gap between passing threshold and actual score indicates how comfortably students are meeting learning outcomes. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.score, result.success |

### Quiz Failed

| Field | Value |
|-------|-------|
| **Verb** | failed (`http://adlnet.gov/expapi/verbs/failed`) |
| **Activity Type** | Assessment (`http://adlnet.gov/expapi/activities/assessment`) |
| **Description** | Generated when a student fails a quiz (score below threshold) |
| **DPIA Reference** | DPIA 2.4: Quiz and Assessment Attempts |
| **Pedagogical Purpose** | Fail events trigger targeted support. Repeated failures on the same topic indicate persistent misconceptions requiring tutor intervention rather than self-study. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.score, result.success |

### Question Answered

| Field | Value |
|-------|-------|
| **Verb** | answered (`http://adlnet.gov/expapi/verbs/answered`) |
| **Activity Type** | cmi.interaction (`http://adlnet.gov/expapi/activities/cmi.interaction`) |
| **Description** | Generated for each question answered within a quiz attempt |
| **DPIA Reference** | DPIA 2.4: Quiz and Assessment Attempts |
| **Pedagogical Purpose** | Question-level data reveals specific misconceptions and knowledge gaps. Aggregate question difficulty analysis identifies content areas that need curriculum revision or additional scaffolding. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.response, result.success |

---

## Writing Events

### Writing Submitted

| Field | Value |
|-------|-------|
| **Verb** | submit (`http://activitystrea.ms/schema/1.0/submit`) |
| **Activity Type** | Writing Task (`https://w3id.org/xapi/aclit/v1/activity-types/writing-task`) |
| **Description** | Generated when a student submits a writing artifact (draft or final) |
| **DPIA Reference** | DPIA 2.3: Writing Sample Submissions |
| **Pedagogical Purpose** | Draft progression reveals writing development trajectory over time. Word count growth, increasing citation use, and multi-draft revision patterns are proxies for developing academic literacy. Writing artifacts enable academic discourse analysis for CoP metrics. |
| **Metric Domain** | Engagement, CoP |
| **Key Extensions** | word-count, paragraph-count, citation-count, draft-number, assignment-type, time-spent, prompt-topic, artifact-url, artifact-content-type |

---

## Discussion Events

### Forum Post Created

| Field | Value |
|-------|-------|
| **Verb** | create (`http://activitystrea.ms/schema/1.0/create`) |
| **Activity Type** | Note (`http://activitystrea.ms/schema/1.0/note`) |
| **Description** | Generated when a student creates a new forum post (top-level thread) |
| **DPIA Reference** | DPIA 2.2: Discussion Forum Activity |
| **Pedagogical Purpose** | Initiating discussions (vs. only responding) tracks movement from peripheral to full participation in the academic community. Post frequency and quality indicate developing confidence in academic discourse. |
| **Metric Domain** | CoP |
| **Key Extensions** | word-count, thread-depth |

### Forum Reply Posted

| Field | Value |
|-------|-------|
| **Verb** | commented (`http://adlnet.gov/expapi/verbs/commented`) |
| **Activity Type** | Comment (`http://activitystrea.ms/schema/1.0/comment`) |
| **Description** | Generated when a student replies to an existing forum post |
| **DPIA Reference** | DPIA 2.2: Discussion Forum Activity |
| **Pedagogical Purpose** | Reply depth and frequency indicate engagement quality. Substantive replies that build on others' ideas demonstrate developing academic discourse skills. The initiation-to-response ratio tracks participatory evolution. |
| **Metric Domain** | CoP |
| **Key Extensions** | thread-depth |

### Thread/Post Viewed

| Field | Value |
|-------|-------|
| **Verb** | viewed (`http://id.tincanapi.com/verb/viewed`) |
| **Activity Type** | Discussion Thread (`https://w3id.org/xapi/aclit/v1/activity-types/discussion-thread`) |
| **Description** | Generated when a student views a discussion thread |
| **DPIA Reference** | DPIA 2.2: Discussion Forum Activity |
| **Pedagogical Purpose** | Thread viewing without posting characterizes legitimate peripheral participation -- a recognized early stage in CoP membership development. Tracking view-to-post ratios over time reveals movement along the participation spectrum. |
| **Metric Domain** | CoP |
| **Key Extensions** | None |

---

## Peer Review Events

### Peer Review Submitted

| Field | Value |
|-------|-------|
| **Verb** | submit (`http://activitystrea.ms/schema/1.0/submit`) |
| **Activity Type** | Peer Review (`https://w3id.org/xapi/aclit/v1/activity-types/peer-review`) |
| **Description** | Generated when a student submits a peer review of another student's writing |
| **DPIA Reference** | DPIA 2.2: Discussion Forum Activity |
| **Pedagogical Purpose** | Peer review is a key indicator of academic community membership. Giving and receiving constructive feedback develops critical analysis skills and shared academic repertoire. Feedback quality (length, specificity) tracks CoP development. |
| **Metric Domain** | CoP |
| **Key Extensions** | feedback-text, reviewer-pseudonym |

---

## Help-Seeking Events

### Help Requested

| Field | Value |
|-------|-------|
| **Verb** | asked (`http://adlnet.gov/expapi/verbs/asked`) |
| **Activity Type** | Help Request (`https://w3id.org/xapi/aclit/v1/activity-types/help-request`) |
| **Description** | Generated when a student submits a request for academic help |
| **DPIA Reference** | DPIA 2.1: LMS Interaction Events |
| **Pedagogical Purpose** | Help-seeking patterns distinguish strategic learners (who seek help appropriately) from dependent learners (excessive help-seeking) and avoidant learners (never seeking help despite struggling). This classification informs SDL metric computation. |
| **Metric Domain** | SDL |
| **Key Extensions** | help-type (Context) |

### Help Resource Accessed

| Field | Value |
|-------|-------|
| **Verb** | viewed (`http://id.tincanapi.com/verb/viewed`) |
| **Activity Type** | Help Resource (`https://w3id.org/xapi/aclit/v1/activity-types/help-resource`) |
| **Description** | Generated when a student accesses a help resource (FAQ, tutorial, writing guide) |
| **DPIA Reference** | DPIA 2.1: LMS Interaction Events |
| **Pedagogical Purpose** | Self-help resource usage indicates self-directed learning behavior. Students who proactively access resources before asking for tutor help demonstrate developing independence. Resource access patterns also inform which support materials are effective. |
| **Metric Domain** | SDL |
| **Key Extensions** | None |

### Extension Requested

| Field | Value |
|-------|-------|
| **Verb** | asked (`http://adlnet.gov/expapi/verbs/asked`) |
| **Activity Type** | Extension Request (`https://w3id.org/xapi/aclit/v1/activity-types/extension-request`) |
| **Description** | Generated when a student requests a deadline extension for an assessment |
| **DPIA Reference** | DPIA 2.1: LMS Interaction Events |
| **Pedagogical Purpose** | Extension request frequency and timing may signal time management challenges or external pressures. When correlated with engagement patterns, this data helps tutors distinguish between students who need study skills support and those facing external barriers. |
| **Metric Domain** | SDL |
| **Key Extensions** | None |

---

## Curriculum Progress Events

### Module Completed

| Field | Value |
|-------|-------|
| **Verb** | completed (`http://adlnet.gov/expapi/verbs/completed`) |
| **Activity Type** | Module (`http://adlnet.gov/expapi/activities/module`) |
| **Description** | Generated when a student completes all required activities in a module |
| **DPIA Reference** | DPIA 2.7: Curriculum Position and Progress Tracking |
| **Pedagogical Purpose** | Module completion pacing relative to expected trajectory identifies students falling behind before summative assessment reveals it. Early detection enables proactive intervention during the teaching period rather than reactive support after poor results. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.completion, result.score (recommended) |

### Course Progressed

| Field | Value |
|-------|-------|
| **Verb** | progressed (`http://adlnet.gov/expapi/verbs/progressed`) |
| **Activity Type** | Course (`http://adlnet.gov/expapi/activities/course`) |
| **Description** | Generated at defined checkpoints to record overall curriculum position |
| **DPIA Reference** | DPIA 2.7: Curriculum Position and Progress Tracking |
| **Pedagogical Purpose** | Course-level progress tracking enables cohort comparison. Students significantly behind the cohort median pace receive early warnings. Progress velocity (rate of change) is more informative than absolute position for identifying at-risk students. |
| **Metric Domain** | Engagement |
| **Key Extensions** | result.extensions (progress percentage) |

---

## Self-Report Events

### Self-Report Submitted

| Field | Value |
|-------|-------|
| **Verb** | submit (`http://activitystrea.ms/schema/1.0/submit`) |
| **Activity Type** | Self-Report Instrument (`https://w3id.org/xapi/aclit/v1/activity-types/self-report`) |
| **Description** | Generated when a student completes a self-report questionnaire (confidence, goal-setting, strategy-use) |
| **DPIA Reference** | DPIA 2.5: Self-Report Questionnaire Responses |
| **Pedagogical Purpose** | Self-reported confidence, goals, and strategy use enable calibration accuracy measurement -- comparing what students think they know against demonstrated performance. This metacognitive awareness metric is central to SDL development. Placeholder pending Phase 3 instrument design. |
| **Metric Domain** | SDL |
| **Key Extensions** | None (to be defined in Phase 3) |

---

## Summary Statistics

| Metric | Count |
|--------|-------|
| Total event types | 22 |
| Standard verbs reused | 14 |
| Custom verbs | 0 |
| Custom activity types | 9 |
| Custom extensions | 15 |
| Event categories | 9 |

### Metric Domain Distribution

| Domain | Event Count | Events |
|--------|-------------|--------|
| Engagement | 12 | Session open/close, page viewed, module navigated, reading viewed/completed, quiz attempted/completed/passed/failed, question answered, module completed, course progressed |
| CoP | 5 | Writing submitted, forum post created, forum reply posted, thread viewed, peer review submitted |
| SDL | 4 | Help requested, help resource accessed, extension requested, self-report submitted |
| Multiple | 1 | Quiz attempted (Engagement + SDL) |
