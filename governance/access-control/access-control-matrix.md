# Access Control Matrix

**Document type:** Governance specification
**Scope:** Role-based data visibility rules for the Academic Literacies Learning Analytics system
**Governing law:** Protection of Personal Information Act (POPIA), Act 4 of 2013
**Version:** 1.0
**Date:** 2026-03-07

---

## 1. Overview and Principles

### Purpose

This document defines exactly which data each audience role can access within the learning analytics system. It is the authoritative specification for implementing role-based access control. A developer should be able to implement access control directly from this document without ambiguity.

### Design Principles

1. **Default deny:** No access is granted unless explicitly specified in the matrix below. If a data category or role combination is not listed, the default is "No access."
2. **Explainable to students:** Every access rule must be describable in plain language. If a rule cannot be explained simply, it is too complex (locked decision).
3. **Minimum necessary access:** Each role receives only the data access required for its specific function.
4. **No individual identification at team level:** The Teaching Team role never sees data that could identify individual students, directly or indirectly.

---

## 2. Role Definitions

### Student

The individual data subject. A student interacts with the analytics system to reflect on their own learning development.

- **Access scope:** Own data only
- **Cannot:** See any other student's data in any form (individual or aggregated in a way that reveals individuals)
- **Data presentation:** Growth-focused -- compared to their own past performance, never to classmates

### Assigned Tutor

The tutor assigned to a specific student via a fixed institutional mapping. Each student has exactly one designated tutor. Tutors use analytics to prepare for one-on-one consultations and to develop individual learning plans.

- **Access scope:** Data for assigned students only
- **Cannot:** See data for students assigned to other tutors
- **Cannot:** Request or obtain access to non-assigned students
- **Data presentation:** Individual student trajectories, with cohort context available only as aggregated benchmarks

### Teaching Team

Course coordinator and academic staff responsible for the course as a whole. The Teaching Team uses analytics to identify cohort-level patterns, detect systemic issues, and make course-level intervention decisions.

- **Access scope:** Aggregated cohort data only
- **Cannot:** See individual student data
- **Cannot:** Identify individual students from aggregated views
- **Cannot:** Drill down from aggregated data to individual records
- **Data presentation:** Statistical summaries, distributions, and trend lines across the cohort

### System Administrator

Technical role responsible for system operation, maintenance, and support. The System Administrator has broad technical access for operational purposes but does not use data for pedagogical decisions.

- **Access scope:** Technical access to all data for maintenance and support
- **Cannot:** Use data for pedagogical decision-making
- **Constraint:** All access is logged and auditable
- **Data use:** System maintenance, debugging, data deletion execution, security monitoring

---

## 3. Access Control Matrix

The following matrix defines permissions for each data category across all four roles. This is the definitive reference for implementation.

| # | Data Category | Student (own data) | Assigned Tutor | Teaching Team | System Admin |
|---|---------------|-------------------|----------------|---------------|--------------|
| 1 | Engagement metrics (session frequency, duration, module completion rates) | Read | Read | Aggregated only | Technical access |
| 2 | Performance trends (quiz scores, writing quality progression over time) | Read | Read | Aggregated only | Technical access |
| 3 | CoP indicators (participation trajectory, discourse adoption, peer interaction quality, cross-context transfer) | Read | Read | Aggregated only | Technical access |
| 4 | SDL indicators (scaffolding dependence, self-regulation, calibration accuracy, help-seeking patterns) | Read | Read | Aggregated only | Technical access |
| 5 | Self-report responses (confidence ratings, goal-setting, strategy self-assessments) | Read | Read | Aggregated only | Technical access |
| 6 | Writing samples (submitted paragraphs, essays, reflections -- full text) | Read | Read | No access | Technical access |
| 7 | Discussion forum posts (post content, replies, thread participation) | Read (own) | Read (assigned students) | No access | Technical access |
| 8 | Raw event logs (clicks, navigation paths, timestamps, device metadata) | No access | No access | No access | Technical access |
| 9 | Early warning flags (at-risk indicators, engagement decline alerts) | Read (own) | Read (assigned students) | Aggregated counts only | Technical access |
| 10 | Learning plan records (individual learning plans, tutor notes, action items) | Read (own) | Read/Write (assigned students) | No access | Technical access |

### Matrix Notes

- **"Read"** means view-only access to the data as presented in dashboards and reports.
- **"Read/Write"** (Learning Plan Records, Assigned Tutor only) means the tutor can both view and create/edit learning plans for their assigned students.
- **"Aggregated only"** means statistical summaries subject to the aggregation rules in Section 4. The Teaching Team never sees individual records behind the aggregates.
- **"Aggregated counts only"** (Early Warning Flags, Teaching Team) means the Teaching Team sees how many students are flagged at each level, but not which students.
- **"Technical access"** means the System Administrator can access the underlying data store for operational purposes. This access is logged and auditable (see Section 3, System Administrator role definition).
- **"No access"** means the role has no visibility of this data category in any form, including aggregated form.

---

## 4. Aggregation Rules

These rules govern all data categories marked "Aggregated only" or "Aggregated counts only" in the matrix above. They apply without exception.

### 4.1 Definition of Aggregation

"Aggregated" means statistical summaries computed across a group of students. Permitted aggregation types include:

- Mean, median, mode
- Standard deviation, variance
- Distribution histograms (binned)
- Percentile bands (e.g., quartiles) -- but NOT individual percentile ranks
- Trend lines over time (cohort-level)
- Counts and proportions

Aggregation does NOT include:

- Lists of individual values (even without names)
- Sorted rankings
- Any view where a single data point represents one student

### 4.2 Minimum Group Size

**The minimum group size for any aggregated view is 10 students.**

This threshold is enforced at the query/display level:

- If the total cohort is displayed, the group size is the full cohort (always above 10 for a viable course)
- If the view is filtered (e.g., by tutorial group, by demographic characteristic, by engagement level), the resulting group must contain at least 10 students
- If a filtered view produces a group smaller than 10, the data for that group is **suppressed** -- the cell is redacted and displays a message such as "Group too small to display"

### 4.3 Cell Suppression Rules

When a group falls below the minimum size threshold:

- The aggregated value is replaced with a suppression indicator (e.g., "*" or "< 10 students")
- No partial data is displayed (no "approximately" or ranges that might narrow identification)
- The Teaching Team is informed that suppression occurred due to privacy rules, but is not told the exact group size

### 4.4 No Drill-Down

The Teaching Team **cannot** click through, expand, or otherwise navigate from an aggregated view to reach individual student records. This is enforced at the application level:

- Aggregated views do not link to individual records
- No "view details" or "see students" functionality exists at the Teaching Team access level
- API endpoints serving Teaching Team views return only pre-computed aggregates, never individual records

---

## 5. Tutor-Student Mapping Rules

### 5.1 Assignment Model

The tutor-student assignment is a **fixed mapping**: each student has exactly one designated tutor at any given time (locked decision).

- The mapping is maintained by the Teaching Team / course administration
- The mapping is stored in the system and used to enforce tutor access scope
- A tutor's data access is strictly scoped to their assigned students -- no broader access is possible

### 5.2 Assignment Changes

If a student is reassigned to a different tutor:

- The **previous tutor's access** to that student's data is **revoked immediately** upon reassignment
- The **new tutor** gains access to the student's data upon reassignment
- The reassignment is logged in the audit trail, including: date, previous tutor, new tutor, authorizing party
- Historical data (from the period under the previous tutor) is accessible to the new tutor -- continuity of care requires this

### 5.3 Access Boundaries

- A tutor **cannot** request access to students not assigned to them
- A tutor **cannot** see aggregated data about other tutors' students (they are not part of the Teaching Team role by default)
- If a tutor also holds a Teaching Team role (e.g., a senior tutor who is also a course coordinator), they operate under Teaching Team rules when viewing cohort data and under Tutor rules when viewing assigned student data. The two views are separate and clearly distinguished in the interface.

---

## 6. Data Presentation Rules

These rules constrain how data is presented in dashboards and reports. They are binding on Phase 7 (dashboard design).

### 6.1 Student-Facing Views

All student-facing analytics views must follow these rules:

- **Growth-focused framing:** Compare the student to their OWN past performance. Show trajectory and development over time.
- **No peer comparison:** No percentile rankings, no cohort position indicators, no "you are in the top/bottom X%," no comparison to class averages, no leaderboards.
- **No data revealing others:** No information, direct or indirect, about other students' performance. The student's view is entirely self-referential.
- **Encouraging language:** Metrics are framed in terms of growth and progress, not deficit or ranking. Example: "Your academic discourse use has increased from 3 to 7 instances per essay" rather than "You are below average."

### 6.2 Tutor-Facing Views

Tutor views for individual students:

- **Individual trajectory context:** Present the student's data in the context of their own development over time
- **Cohort benchmarks:** Cohort context is available only as aggregated benchmarks (e.g., "cohort median engagement score: 72") to help tutors calibrate expectations
- **No student-to-student comparison:** Tutors do not see side-by-side comparisons of their assigned students. Each student's data is viewed independently.
- **Learning plan integration:** The student's learning plan is displayed alongside their analytics data to support consultation preparation

### 6.3 Teaching Team Views

Teaching Team views are exclusively aggregated:

- **Cohort-level patterns:** Distributions, trends, and summary statistics across the entire cohort or large subgroups
- **Intervention signals:** Aggregated counts of early warning flags (e.g., "14 students flagged for engagement decline") without identifying which students
- **No individual identification:** No names, student numbers, or any data that could identify an individual student
- **Trend analysis:** Week-over-week or module-over-module cohort trends to inform course-level decisions

---

## 7. Plain Language Summary

The following summary is written in plain language suitable for inclusion in a student-facing privacy notice or course information document.

---

**Who can see your learning analytics data?**

**You** can see:
- Your own engagement patterns (how often you use the app, which modules you complete)
- Your own performance trends (quiz scores, writing quality over time)
- Your own development indicators (how your academic skills are growing)
- Your own self-report responses (the goals and reflections you submitted)
- Your own writing submissions and discussion posts
- Any early warning flags about your progress
- Your individual learning plan

Your data is always shown in terms of your own growth -- how you are developing compared to your past self. You will never see how you compare to other students.

**Your assigned tutor** can see:
- The same data you see about yourself -- your engagement, performance, development indicators, self-reports, writing, and discussion posts
- Your early warning flags and your learning plan (your tutor can also update your learning plan)

Your tutor can ONLY see data for students assigned to them. They cannot see data for other students.

**The teaching team** (course coordinator and academic staff) can see:
- Summary statistics about the whole class (averages, trends, patterns)
- How many students are flagged for support (but not which students)

The teaching team CANNOT see any individual student's data. They only see group-level summaries, and only when the group is large enough (at least 10 students) to ensure no one can be identified.

**Nobody else** can see your individual data. The system administrator has technical access for maintenance purposes, but does not use your data for teaching decisions. All access to your data is logged.

---

## 8. Implementation Requirements

For the development team implementing this specification:

1. **Access control enforcement:** Must be enforced at the API/backend level, not just the UI. Even if a UI element is hidden, the underlying data must not be accessible to unauthorized roles.
2. **Audit logging:** Every data access event must be logged with: accessor identity, role, data subject(s) accessed, timestamp, and purpose category.
3. **Aggregation computation:** Teaching Team views must be served from pre-computed aggregates or compute aggregates server-side. Raw individual records must never be transmitted to Teaching Team clients.
4. **Minimum group size enforcement:** The 10-student threshold must be enforced server-side. The client must not receive data that would allow it to compute sub-threshold aggregates.
5. **Tutor scope enforcement:** Tutor queries must be filtered by the tutor-student mapping table. A tutor's API requests must return only data for their assigned students.

---

## References

- POPIA Section 8: Accountability (audit logging requirement)
- POPIA Section 14: Retention limitation (linked to data lifecycle spec)
- POPIA Section 19-22: Security safeguards (access control as safeguard)
- Data Lifecycle Specification: `governance/retention/data-lifecycle-spec.md`
- DPIA Safeguards: `governance/dpia/04-safeguards.md`
