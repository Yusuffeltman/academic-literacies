# DPIA Part 5: Data Subject Rights

**Document:** Data Protection Impact Assessment -- Data Subject Rights
**System:** Academic Literacies Learning Analytics (ALE00Y1)
**Version:** 1.0 (Specification)
**Date:** 2026-03-07
**Status:** Draft for legal review

---

## 1. Overview

This document specifies how the rights of data subjects (students) under POPIA are implemented in the learning analytics system. Each right includes the legal basis, what the right entails, the process for exercising it, and implementation considerations.

All rights apply to students enrolled in ALE00Y1 whose personal information is processed by the analytics system.

---

## 2. Right of Access (POPIA Section 23)

### 2.1 Legal Basis

POPIA Section 23 provides that a data subject may request the responsible party to confirm whether personal information about them is held and to provide a description and record of that information.

### 2.2 What the Student Can Access

A student may request access to all personal information held about them in the analytics system, including:

- **LMS interaction data:** Page views, time-on-task records, navigation history
- **Discussion forum data:** Posts, replies, timestamps
- **Writing samples:** All submitted texts with timestamps
- **Quiz data:** Attempts, scores, individual question responses
- **Self-report data:** All questionnaire responses
- **Session metadata:** Login history, session durations, device types
- **Curriculum progress:** Module completion status and timeline
- **Derived metrics:** Any computed indicators (engagement scores, CoP indicators, SDL indicators) with explanation of how they were calculated

### 2.3 Export Format

Data is provided in a **readable, structured format**:
- Tabular data (interaction events, quiz scores, session records): CSV or equivalent structured format
- Text content (writing samples, forum posts, goal entries): Original text with metadata
- Derived metrics: Summary report with metric values and calculation explanations in plain language

The export includes a plain-language guide explaining what each data category means and how it was collected.

### 2.4 Process

1. **Request:** Student submits a written request to the Information Officer (or designated contact). The request can be submitted via email, the institution's information request portal, or in person.
2. **Verification:** The Information Officer verifies the student's identity using institutional credentials.
3. **Processing:** The analytics system generates a complete data export for the requesting student.
4. **Delivery:** The export is delivered to the student via a secure channel (e.g., institutional email, secure download link) within a **reasonable time** as required by POPIA. Target response time: 30 calendar days from receipt of a valid request.
5. **Record:** The request and its fulfilment are logged for audit purposes.

### 2.5 Fees

A prescribed fee may be charged as permitted by POPIA Section 23(1) read with the Promotion of Access to Information Act. The institution's fee schedule applies. The first request per academic year is processed at no cost.

---

## 3. Right to Correction (POPIA Section 24)

### 3.1 Legal Basis

POPIA Section 24(1) provides that a data subject may request the responsible party to correct or delete personal information that is inaccurate, irrelevant, excessive, out of date, incomplete, misleading, or obtained unlawfully.

### 3.2 What Can Be Corrected

| Data Type | Correctable? | Rationale |
|-----------|:------------:|-----------|
| Self-report questionnaire responses | **Yes** | Student-reported data; the student is the authoritative source |
| Goal-setting entries | **Yes** | Student-authored content |
| Profile/demographic data | **Yes** | If held, student can correct inaccuracies |
| LMS interaction events | **No** | System-collected factual records of actions that occurred; correction would alter the factual record |
| Forum posts/replies | **Limited** | Student can edit/delete their own posts through the application's normal functionality; historical records of the post existing are retained |
| Writing sample submissions | **No** | Submitted as part of course assessment; factual record of what was submitted |
| Quiz attempt records | **No** | System-generated factual records of assessment performance |
| Session metadata | **No** | System-generated factual records |
| Curriculum progress | **No** | Derived from factual event records |

**Principle:** Self-reported data is correctable because the student is the source. System-collected data records factual events that occurred and is not correctable (the event happened). If a system error produced incorrect records, this is handled as a data quality issue by the system administrator, not as a Section 24 correction.

### 3.3 Process

1. **Request:** Student submits a correction request identifying the specific data to be corrected and the proposed correction.
2. **Assessment:** The Information Officer determines whether the data is correctable per the categories above.
3. **If correctable:** The correction is made within 30 calendar days. The student is notified of the correction. Any third parties to whom the inaccurate data was disclosed are notified.
4. **If not correctable:** The student is informed of the reason (e.g., the data is a factual system record), and informed of their right to lodge a complaint with the Information Regulator.
5. **Record:** The request, decision, and any correction are logged for audit purposes.

---

## 4. Right to Object (POPIA Section 11(3))

### 4.1 Legal Basis

POPIA Section 11(3) provides that a data subject may object, at any time, to the processing of personal information on reasonable grounds relating to his, her, or its particular situation, **unless legislation provides for such processing**.

This right applies even when the lawful basis for processing is legitimate interest (Section 11(1)(f)). It is the student's legal right to object, and the institution must respond.

### 4.2 Objection Process

**Step 1: Submission**
- The student submits a **written objection** to the Information Officer
- The objection should state the reasonable grounds relating to the student's particular situation
- Objection can be submitted via email, the institution's information request portal, or in person
- No specific form is required; a plain-language letter or email is sufficient

**Step 2: Acknowledgment**
- The Information Officer acknowledges receipt within 5 working days
- The student is informed of the expected timeline for a decision

**Step 3: Assessment**
- The Information Officer assesses the objection considering:
  - The student's stated grounds
  - Whether the grounds relate to the student's particular situation (not a general objection to analytics)
  - Whether there are compelling legitimate grounds for processing that override the student's interests
  - The impact on the student's course participation if processing stops

**Step 4: Decision**
- If the objection is **upheld:** Processing of the student's personal information for analytics purposes stops. The student's existing data is retained until the standard deletion date (end of academic year) but is no longer actively processed or displayed in dashboards.
- If the objection is **not upheld:** The student is provided with written reasons and informed of their right to lodge a complaint with the Information Regulator.

**Step 5: Implementation (if upheld)**
- The student's data is excluded from active analytics processing
- The student's data is excluded from aggregated views
- The student retains access to course materials and activities but does not receive analytics-driven features (self-reflection dashboard, automated nudges)
- The tutor is informed that analytics data is no longer available for this student (consultation proceeds without analytics evidence)

### 4.3 Consequences for Course Participation

Analytics are integrated into the ALE00Y1 course experience. If a student's objection is upheld:

- **Course access:** Unaffected. The student continues to access all course materials and activities.
- **Assessment:** Unaffected. The student's grades and academic standing are not affected.
- **Analytics features:** Unavailable. The student does not receive the self-reflection dashboard, automated nudges, or analytics-informed tutor consultation.
- **Tutor support:** Available but without analytics evidence. The tutor relies on direct interaction and assessment results.

### 4.4 Legal Review Flag

**This area requires legal review before implementation.**

The scenario where a student objects under Section 11(3) to processing that is integral to the course experience raises unresolved questions:

- Does "unless legislation provides for such processing" (Section 11(3)) apply if institutional regulations mandate analytics as part of course delivery?
- Can the institution rely on "compelling legitimate grounds" to continue processing over the student's objection?
- What is the institution's obligation to provide equivalent course experience without analytics?

**Recommendation:** The process documented above (stopping processing for the individual while maintaining course access) is the default position. Legal counsel should review this process and advise on the institution's position regarding compelling legitimate grounds and the interaction between Section 11(3) and institutional course requirements.

---

## 5. Right to Deletion (POPIA Section 24)

### 5.1 Legal Basis

POPIA Section 24(1)(c) provides that a data subject may request the responsible party to delete personal information. Section 14 provides that records must not be retained longer than necessary for the purpose.

### 5.2 When Deletion is Available

**Deletion is available after the course ends.** This is a governance decision documented in the project context:

- **During the course:** No mid-course deletion. Analytics are part of the course experience and processing is ongoing for pedagogical purposes. Individual deletion mid-course would compromise the integrity of course-integrated analytics (e.g., tutor consultation evidence, self-reflection tools, early warning systems).
- **After the course:** Students may request deletion of their individual-level data at any time after the course ends (final results published). The standard automated deletion at end of academic year may occur before a request is made.

### 5.3 What is Deleted

| Data Type | Deleted? | Detail |
|-----------|:--------:|--------|
| LMS interaction events | **Yes** | All individual event records |
| Discussion forum posts/replies | **Yes** | Post content and metadata attributed to the student |
| Writing samples | **Yes** | All submitted texts |
| Quiz attempt records | **Yes** | All attempts, scores, and question responses |
| Self-report responses | **Yes** | All questionnaire responses and goal entries |
| Session metadata | **Yes** | All login/session records |
| Curriculum progress | **Yes** | All progress tracking records |
| Derived metrics | **Yes** | All computed indicators for the student |
| Aggregated statistics | **No** | Cohort-level aggregates that included the student's data are retained. Once aggregated, these are no longer personal information -- the individual cannot be identified from the aggregate. Recalculation to exclude the student is not performed. |
| Audit logs | **Retained** | Audit logs documenting access to the student's data are retained for the compliance verification period (12 months after data deletion). These logs document system events, not the student's personal information. |

### 5.4 Process

1. **Request:** Student submits a deletion request after the course ends.
2. **Verification:** The Information Officer confirms the student's identity and that the course has ended.
3. **Execution:** All individual-level data is deleted from active storage within 30 calendar days.
4. **Backups:** Data in backups is purged within 30 days of the deletion execution (aligned with standard backup rotation).
5. **Confirmation:** The student receives written confirmation that their individual-level data has been deleted.
6. **Record:** The request and deletion are logged in the audit trail.

### 5.5 Relationship to Retention Policy

The standard retention policy (governance/retention/data-lifecycle-spec.md, Plan 01-02) specifies automated deletion at end of academic year. A student's deletion request may be made:
- **Before automated deletion:** Manual deletion is processed; the student's data is removed ahead of the standard schedule
- **After automated deletion:** The student is informed that their data has already been deleted per the standard retention policy

---

## 6. Right to Lodge a Complaint (POPIA Section 74)

### 6.1 Legal Basis

POPIA Section 74 provides that any person may submit a complaint to the Information Regulator if they believe that the protection of their personal information has been interfered with.

### 6.2 Process

Students are informed of their right to lodge a complaint with the Information Regulator:
- **When:** In the privacy notice, in any response to a rights request, and on request
- **Contact details:** The Information Regulator's contact information is provided in the privacy notice and the data handling policy

**Information Regulator contact:**
- Website: https://www.justice.gov.za/inforeg/
- Email: complaints.IR@justice.gov.za
- Physical address: As published by the Information Regulator

### 6.3 Internal Escalation

Before lodging a complaint with the Information Regulator, students are encouraged (but not required) to:
1. Contact the Information Officer with their concern
2. If unsatisfied, escalate through the institution's internal complaint process
3. If still unsatisfied, lodge a complaint with the Information Regulator

The institution does not condition any rights on the student first exhausting internal processes.

---

## 7. Communication of Rights to Students

### 7.1 When Rights are Communicated

| Timing | Channel | Content |
|--------|---------|---------|
| At enrollment | Course information materials | Summary of analytics, link to full privacy notice |
| First application login | In-app notification | What data is collected, why, and student rights summary |
| Before each self-report questionnaire | Questionnaire preamble | Purpose of this specific data collection |
| On request | Information Officer | Full rights information and assistance |
| In the application | Accessible privacy page | Complete privacy notice with rights procedures |

### 7.2 Language and Accessibility

- All rights communications are written in **plain language** accessible to first-year university students
- Technical and legal terminology is explained in everyday language
- Communications are available in the primary language(s) of instruction
- The privacy notice is available in an accessible digital format (not only PDF)
- Contact information for the Information Officer is prominently displayed

### 7.3 Example Plain-Language Summary

> **Your data in Academic Literacies**
>
> The Academic Literacies application tracks your learning activity to help you and your tutor understand your progress. Here is what you should know:
>
> **What we collect:** Your activity in the app (what you read, write, and how you participate in discussions), your quiz results, and your responses to self-assessment questionnaires.
>
> **Why:** To help you see your own growth, to help your tutor support you better, and to help the teaching team improve the course.
>
> **Who sees it:** You see your own data. Your assigned tutor sees your data to support you. The teaching team sees only group-level patterns (never individual students).
>
> **How long:** Your data is kept until the end of the academic year, then deleted.
>
> **Your rights:**
> - Ask to see all your data at any time
> - Ask to correct information you provided (like questionnaire responses)
> - Ask to have your data deleted after the course ends
> - Object to your data being processed (contact the Information Officer)
> - Complain to the Information Regulator if you believe your privacy has been violated
>
> **Contact:** [Information Officer contact details]

---

## 8. Summary of Rights Implementation

| Right | POPIA Section | Available When | Response Time | Process Owner |
|-------|:------------:|---------------|:-------------:|---------------|
| Access | 23 | Any time during or after course | 30 days | Information Officer |
| Correction | 24 | Any time (self-reported data only) | 30 days | Information Officer |
| Objection | 11(3) | Any time | Decision within 30 days | Information Officer + legal review |
| Deletion | 24 | After course ends | 30 days execution | Information Officer |
| Complaint | 74 | Any time | Per Information Regulator process | Information Regulator |

---

*Document: governance/dpia/05-data-subject-rights.md*
*Part of: Data Protection Impact Assessment for ALE00Y1 Learning Analytics*
*Previous: 04-safeguards.md (Safeguards)*
