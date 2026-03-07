# Data Lifecycle and Retention Specification

**Document type:** Governance specification
**Scope:** All personal information processed by the Academic Literacies Learning Analytics system
**Governing law:** Protection of Personal Information Act (POPIA), Act 4 of 2013
**Version:** 1.0
**Date:** 2026-03-07

---

## 1. Scope and Principles

This specification governs the retention and deletion of all personal information collected, processed, and stored by the Academic Literacies Learning Analytics system. It applies to data from all sources: LMS interactions, writing submissions, self-report instruments, quiz/assessment activities, discussion forums, and derived analytics.

### Governing Principles

1. **Purpose limitation (POPIA Section 13):** Data is retained only as long as necessary to achieve the specific pedagogical purpose for which it was collected -- supporting student development toward academic community membership during the course.
2. **Retention limitation (POPIA Section 14):** Records of personal information must not be retained beyond the period necessary for the purpose, unless retention is required or authorized by law, or the data subject has consented to retention.
3. **Uniform retention (project decision):** All data categories follow the same retention period. This simplifies administration, reduces error, and makes the policy explainable to students in plain language.
4. **Operational deletion (not just policy):** This specification defines executable procedures, not aspirational statements. A system administrator must be able to follow this document to complete end-of-year data cleanup without ambiguity.

---

## 2. Data Categories

The following table defines every category of personal information processed by the analytics system.

| # | Category | Description | Classification |
|---|----------|-------------|----------------|
| 1 | LMS Interaction Events | Page views, clicks, navigation paths, session start/end timestamps, module access sequences | Personal Information |
| 2 | Writing Samples | Student-submitted paragraphs, essays, reflections -- the text content itself | Personal Information |
| 3 | Self-Report Responses | Responses to confidence surveys, goal-setting instruments, strategy self-assessments | Personal Information |
| 4 | Quiz/Assessment Records | Answers submitted, scores received, attempt timestamps, time-on-task per question | Personal Information |
| 5 | Discussion Forum Activity | Posts, replies, peer interactions -- content and metadata (timestamps, thread position) | Personal Information |
| 6 | Session Metadata | Device type, connectivity status, session duration, offline sync events | Personal Information |
| 7 | Derived Metrics/Scores | Computed indicators: engagement scores, CoP development indices, SDL progression scores, early warning flags, scaffolding dependence measures | Personal Information |
| 8 | Learning Plan Records | Tutor-created or system-generated individual learning plans, notes, and action items | Personal Information |
| 9 | Data Access Audit Logs | Records of who accessed which student's data, when, and for what purpose | Personal Information |

### Classification Notes

- All categories 1-8 are **Personal Information** under POPIA because they relate to an identifiable natural person (the student).
- **Derived Metrics/Scores (Category 7):** Although computed rather than directly collected, these metrics are derived from personal information and remain linked to an identifiable individual. They retain their classification as Personal Information until aggregated beyond the point of re-identification.
- **Data Access Audit Logs (Category 9):** These contain references to both the accessor (staff member) and the data subject (student). They are classified as Personal Information and have a distinct retention period (see Section 3).
- No data in this system is classified as **Special Personal Information** under POPIA Section 26 (no health data, biometric data, religious beliefs, etc. are collected).

---

## 3. Retention Rules

### 3.1 Definition of "End of Academic Year"

For the purposes of this specification, **"end of academic year"** is defined as **31 January of the calendar year following the academic year in question**.

**Rationale:** The January 31 cutoff accounts for:
- Supplementary and deferred examinations (typically held in January)
- Final grade processing and academic board decisions
- The administrative close of the academic year

**Example:** Data collected during the 2026 academic year (February 2026 -- November 2026) is retained until 31 January 2027.

### 3.2 Retention Schedule

| # | Category | Retention Period | Retention Trigger | Deletion Trigger | Legal Basis |
|---|----------|-----------------|-------------------|------------------|-------------|
| 1 | LMS Interaction Events | End of academic year | Date of collection | 31 January following collection year | POPIA s14 -- purpose fulfilled at course end |
| 2 | Writing Samples | End of academic year | Date of submission | 31 January following collection year | POPIA s14 -- purpose fulfilled at course end |
| 3 | Self-Report Responses | End of academic year | Date of submission | 31 January following collection year | POPIA s14 -- purpose fulfilled at course end |
| 4 | Quiz/Assessment Records | End of academic year | Date of submission | 31 January following collection year | POPIA s14 -- purpose fulfilled at course end |
| 5 | Discussion Forum Activity | End of academic year | Date of posting | 31 January following collection year | POPIA s14 -- purpose fulfilled at course end |
| 6 | Session Metadata | End of academic year | Date of collection | 31 January following collection year | POPIA s14 -- purpose fulfilled at course end |
| 7 | Derived Metrics/Scores | End of academic year | Date of computation | 31 January following collection year | POPIA s14 -- purpose fulfilled at course end |
| 8 | Learning Plan Records | End of academic year | Date of creation | 31 January following collection year | POPIA s14 -- purpose fulfilled at course end |
| 9 | Data Access Audit Logs | 1 year beyond data deletion | Date of access event | 31 January of the year after data deletion | POPIA s8 -- accountability requirement |

**Note on Audit Logs (Category 9):** Audit logs are retained for one additional year beyond the deletion of the data they reference. This supports accountability under POPIA Section 8 and enables investigation of any post-deletion queries about data handling. For example, if student data from 2026 is deleted on 31 January 2027, the audit logs recording access to that data are retained until 31 January 2028.

---

## 4. Deletion Procedures

This section defines the operational process for data deletion. It addresses research Pitfall 6: retention policy must include executable deletion procedures, not just time periods.

### 4.1 Scheduled End-of-Year Deletion

#### Trigger Event

The scheduled deletion process begins on **1 February** each year, targeting all data whose deletion trigger date has been reached (31 January).

#### Responsible Role

**System Administrator** (role, not named individual). The System Administrator is responsible for executing the deletion process and producing the deletion confirmation report.

#### Pre-Deletion Checklist

Before deletion proceeds, the System Administrator must verify that ALL of the following conditions are met:

- [ ] **Grades finalized:** All final grades, including supplementary examination results, have been submitted and ratified by the academic board
- [ ] **No pending data access requests:** No outstanding POPIA Section 23 access requests are in process for the data to be deleted
- [ ] **No pending objection proceedings:** No unresolved POPIA Section 11(3) objection cases involve the data to be deleted
- [ ] **No legal hold:** No data is subject to active legal proceedings or preservation orders (see Section 6.3)
- [ ] **Student export window completed:** Students have been given at least 30 days advance notice and opportunity to export their data before deletion (see Section 4.3)

If any checklist item is not satisfied, deletion of the affected data is **deferred** until the condition is resolved. Unaffected data proceeds with deletion on schedule.

#### Deletion Process

The deletion process is executed in the following order:

**Step 1: Individual-Level Data Deletion**
- All records in Categories 1-8 linked to individual students are **permanently deleted** from the production database
- Deletion is by hard delete (not soft delete / logical delete) -- records are removed, not flagged
- Foreign key references to student identifiers are removed

**Step 2: Backup Data Deletion**
- All backup copies containing the deleted data must be purged within **30 days** of production deletion, or at the next scheduled backup rotation cycle, whichever comes first
- If backup systems do not support selective deletion, the earliest full backup cycle that excludes the deleted data marks the completion of backup purging
- The System Administrator documents which backup media were affected and when purging was completed

**Step 3: Derived/Aggregated Statistics Retention**
- **Aggregated statistics are RETAINED.** Once data has been aggregated beyond individual identification (e.g., cohort means, distribution summaries, trend lines computed across groups), it is no longer Personal Information under POPIA
- The aggregation threshold for de-identification is a minimum group size of 10 students (consistent with the access control matrix)
- Pre-computed aggregates that meet this threshold are retained for institutional research and course improvement purposes
- Any aggregate computed from fewer than 10 individuals is deleted alongside individual data

**Step 4: Audit Log Handling**
- Data access audit logs (Category 9) are **NOT deleted** at this stage
- Audit logs are retained for 1 additional year (until the following 31 January) per the retention schedule in Section 3.2
- The audit log deletion follows the same process one year later

#### Verification

After deletion is complete:

1. **Deletion confirmation report** is generated, recording:
   - Date of deletion
   - Data categories deleted
   - Number of student records affected
   - Any data deferred (with reason)
   - Backup purge status and expected completion date
2. The deletion confirmation report is **retained** as an administrative record (it contains no personal information, only aggregate counts)
3. The System Administrator and the Information Officer both sign off on the report

### 4.2 Student Notification

- **Pre-deletion notice:** At least 30 days before the scheduled deletion date (i.e., by 1 January), students are notified via the institutional communication channel (email/LMS notification) that their analytics data will be deleted on 31 January
- **Post-deletion confirmation:** After deletion is executed, a general notification is issued confirming that end-of-year data deletion has been completed
- Notifications include instructions for how students can request a data export before deletion (see Section 4.3)

### 4.3 Student Data Export

Before deletion, students have the right to export their data in a readable format:

- **Export format:** Machine-readable (JSON or CSV) and human-readable (PDF summary)
- **Export scope:** All individual-level data in Categories 1-8
- **Export availability:** From the date of pre-deletion notice until the deletion date (minimum 30 days)
- **Process:** Self-service export via the application, or by written request to the Information Officer
- **Post-export:** Export does not affect the deletion schedule -- data is still deleted on the scheduled date

---

## 5. Student-Initiated Deletion

### 5.1 Availability

Student-initiated deletion is available **after the course ends**. During the course, analytics are part of the course experience (locked decision: no mid-course deletion).

During the course, students may exercise their **objection rights** under POPIA Section 11(3), which stops further processing of their data but does not trigger deletion. See Section 5.3 for the objection process.

### 5.2 Post-Course Deletion Request

| Aspect | Detail |
|--------|--------|
| **Eligibility** | Any student whose data is held by the system, after the course has ended |
| **Request method** | Written request to the Information Officer (email or institutional form) |
| **Verification** | Identity of the requesting student is verified before processing |
| **Timeline** | Deletion completed within 30 days of verified request |
| **Scope** | All individual-level data (Categories 1-8) linked to the requesting student |
| **Aggregated data** | Aggregated statistics that included the student's data are RETAINED -- they are no longer Personal Information and cannot be used to identify the individual |
| **Backup deletion** | Backup copies purged within 30 days of production deletion or next backup rotation cycle |
| **Confirmation** | Written confirmation sent to the student upon completion of deletion |
| **Audit trail** | The deletion request and confirmation are logged in the audit trail (Category 9) |

### 5.3 Mid-Course Objection (Not Deletion)

If a student objects to processing during the course under POPIA Section 11(3):

1. The objection is received and recorded by the Information Officer
2. Processing of the student's data for analytics purposes **stops immediately**
3. The student's data remains stored but is excluded from all analytics computations, dashboards, and reports
4. The student's data is deleted at the end of academic year per the standard schedule, or earlier if the student requests post-course deletion
5. The impact on the student's course participation is documented and communicated to the student (e.g., they will not receive analytics-based feedback or nudges)

**Note:** The threshold for "reasonable grounds" under Section 11(3) in the context of course-integrated analytics requires legal review. This process documents the operational steps; the legal assessment of individual objections is the responsibility of the Information Officer.

---

## 6. Exceptions and Edge Cases

### 6.1 Student Withdrawal Mid-Year

If a student withdraws from the course before the end of the academic year:

- Data is retained until the standard end-of-academic-year deletion date (31 January)
- The student may request **early deletion** after withdrawal, following the post-course deletion process in Section 5.2
- If the student does not request early deletion, their data is deleted on the standard schedule

### 6.2 Supplementary Examinations

The retention period (ending 31 January) explicitly accounts for the supplementary examination period. No special handling is needed -- the January 31 cutoff ensures that all supplementary results are finalized before deletion.

### 6.3 Legal Hold

If data is subject to active legal proceedings, a formal preservation order, or a regulatory investigation:

- Retention is extended until the proceedings or investigation conclude (POPIA Section 14(2))
- The legal hold is documented, including: the scope of data affected, the reason for the hold, the expected duration, and the authorizing party
- Data under legal hold is excluded from scheduled deletion
- When the hold is lifted, the data is deleted within 30 days

### 6.4 System Migration or Decommissioning

If the analytics system is migrated to a new platform or decommissioned:

- All retention and deletion rules in this specification continue to apply
- Data transferred to a new system carries its original retention schedule
- If the system is decommissioned before end of academic year, students are notified and offered a data export before deletion

---

## 7. Review and Governance

- This specification is reviewed **annually** before the start of each academic year
- Reviews are conducted by the Information Officer in consultation with the System Administrator and Teaching Team
- Changes to retention periods or deletion procedures require approval from the institutional data governance committee
- This document is versioned; previous versions are archived

---

## References

- POPIA Section 8: Accountability
- POPIA Section 11(3): Objection to processing
- POPIA Section 13: Purpose specification
- POPIA Section 14: Retention and restriction of records
- POPIA Section 14(2): Retention for legal proceedings
- POPIA Section 23: Access to personal information
- Access Control Matrix: `governance/access-control/access-control-matrix.md`
- DPIA Data Subject Rights: `governance/dpia/05-data-subject-rights.md`
