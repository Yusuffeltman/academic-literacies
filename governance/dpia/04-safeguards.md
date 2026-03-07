# DPIA Part 4: Safeguards

**Document:** Data Protection Impact Assessment -- Technical and Organizational Safeguards
**System:** Academic Literacies Learning Analytics (ALE00Y1)
**Version:** 1.0 (Specification)
**Date:** 2026-03-07
**Status:** Draft for legal review

---

## 1. Overview

This document specifies the technical and organizational safeguards that mitigate the privacy risks identified in 03-risk-assessment.md. Each safeguard is mapped to the risk(s) it addresses.

---

## 2. Technical Safeguards

### Safeguard 1: Minimum Group Size Enforcement for Aggregation

**Mitigates:** Risk 1 (Re-identification from aggregated data)

**Specification:**
- Any aggregated view at teaching team level must enforce a minimum group size of **10 students**
- When a group, filter combination, or cross-tabulation produces a cell with fewer than 10 students, that cell is **suppressed** (not displayed)
- Suppression applies to: averages, distributions, counts, and any derived statistics
- The suppressed cell displays a message such as "Group too small to display" rather than partial data
- This rule applies to all data activities across all dashboard views available to the teaching team role

**Rationale:** Research recommends 5-10 as minimum group size. The threshold of 10 is chosen as the conservative end, appropriate for the small tutorial group sizes common in ALE00Y1. Tutors with legitimate need for individual data already have access through the tutor dashboard for their assigned students.

**Implementation note:** This is an application-level control. The aggregation query layer must check group size before returning results.

---

### Safeguard 2: Encryption at Rest and in Transit

**Mitigates:** Risk 2 (Data breach / unauthorized access)

**Specification:**
- **In transit:** All data transmission uses TLS 1.2 or higher. No unencrypted HTTP connections accepted.
- **At rest:** All stored personal information is encrypted using AES-256 or equivalent. This includes:
  - Learning Record Store (LRS) data
  - Writing sample content
  - Self-report questionnaire responses
  - Session metadata
  - Offline queue data on student devices (encrypted local storage)
- **Key management:** Encryption keys managed through the hosting provider's key management service; keys rotated annually at minimum

---

### Safeguard 3: Role-Based Access Control (RBAC)

**Mitigates:** Risk 2 (Data breach), Risk 5 (Tutor access boundary violation)

**Specification:**

| Role | Access Level | Scope |
|------|-------------|-------|
| **Student** | Read own data only | Individual-level: own engagement, performance, CoP, SDL indicators, self-reports |
| **Tutor** | Read assigned students' data | Individual-level for assigned students only; no access to non-assigned students |
| **Teaching Team** | Read aggregated cohort data only | Cohort-level: distributions, trends, aggregated indicators (minimum group size enforced) |
| **System Admin** | Technical access for maintenance | All data for technical operations; no pedagogical access; access logged |

**Tutor-student mapping enforcement:**
- Each student is assigned to exactly one tutor (fixed assignment)
- The tutor dashboard enforces this mapping at the query level -- a tutor's data requests are filtered to return only their assigned students
- Tutor-student mappings are managed by the teaching team administrator
- Mapping changes are audit-logged
- A tutor cannot override or expand their student assignment

**Authentication:**
- All users authenticate through the institution's identity provider
- Session tokens have defined expiry periods
- Failed login attempts are rate-limited and logged

---

### Safeguard 4: Audit Logging

**Mitigates:** Risk 2 (Data breach), Risk 3 (Function creep), Risk 5 (Tutor access boundary)

**Specification:**
- All data access events are logged with: user ID, role, timestamp, data accessed (category, not content), action type (view, export, query)
- Audit logs are append-only and tamper-protected
- Logs are retained for the same period as the data they cover (end of academic year) plus 12 months for compliance verification
- Regular audit reviews (at least quarterly) check for:
  - Access patterns outside normal use (e.g., tutor accessing data at unusual hours or volumes)
  - Failed access attempts (potential boundary testing)
  - Data exports (who exported what and when)
- Anomalous access patterns trigger alerts to the Information Officer

---

### Safeguard 5: Incident Response for Data Breaches

**Mitigates:** Risk 2 (Data breach)

**Specification:**
- **Detection:** Automated monitoring for unauthorized access attempts, unusual data access volumes, and system integrity violations
- **Containment:** Immediate revocation of compromised credentials; isolation of affected systems
- **Notification (POPIA Section 22):**
  - Information Regulator notified as soon as reasonably possible after discovery
  - Affected data subjects (students) notified as soon as reasonably possible
  - Notification includes: nature of the compromise, categories of data affected, measures taken, contact details for further information
- **Recovery:** Restoration from encrypted backups; access review and credential reset for all affected accounts
- **Post-incident review:** Root cause analysis; DPIA update if risk assessment changes; affected students offered additional support (e.g., monitoring for misuse)

---

### Safeguard 6: Purpose Limitation Enforcement

**Mitigates:** Risk 3 (Function creep)

**Specification:**
- The prohibited uses listed in 02-lawful-basis.md Section 4.2 are enforced through:
  - **Policy:** Written data use policy signed by all staff with data access
  - **Technical controls:** No data export functionality for teaching team role (aggregated views only, no individual data download)
  - **Access restrictions:** Analytics data is not accessible from institutional systems outside the analytics application (no API access for HR, admissions, or disciplinary systems)
  - **Contractual controls:** Processing agreements with operators/processors explicitly prohibit secondary use
- Any proposed new use of analytics data requires:
  1. Written proposal with purpose justification
  2. Compatibility assessment against POPIA Section 15
  3. DPIA addendum if the new use introduces additional risks
  4. Approval by the Information Officer

---

### Safeguard 7: Data Quality Flags and Connectivity Normalization

**Mitigates:** Risk 4 (Connectivity-gap data quality)

**Specification:**
- **Missing data flags:** When data coverage for a student falls below a defined threshold for any metric period, the metric is flagged as "insufficient data" rather than computed from incomplete information
- **Connectivity normalization:**
  - Session metadata includes device type and connection type indicators
  - Time-on-task calculations exclude periods flagged as connectivity interruptions
  - Engagement metrics can be adjusted for known connectivity constraints (e.g., smartphone-only users on mobile data are evaluated against adjusted baselines)
- **Load-shedding awareness:**
  - Known load-shedding schedules (where available) are used to annotate interaction data
  - Sessions that terminate during a load-shedding window are flagged as interrupted, not as voluntary disengagement
- **Tutor visibility:** Data quality flags are visible to tutors in the consultation dashboard, so they can contextualize a student's metrics
- **Equity review integration:** Every new metric passes the Equity Review Framework (governance/equity/equity-review-framework.md, Plan 01-03) before inclusion, which includes specific connectivity and device bias checks

---

### Safeguard 8: Automated Retention Enforcement

**Mitigates:** Risk 6 (Retention overrun)

**Specification:**
- **Automated deletion job:** A scheduled process runs after the end-of-academic-year date to delete all individual-level data
- **Deletion scope:** All data across all activities for students in the completed academic year
- **Aggregated data:** Cohort-level aggregated statistics (which no longer constitute personal information) are retained for teaching quality improvement
- **Deletion verification:** The deletion process generates a verification report confirming:
  - Number of student records processed
  - Data categories deleted
  - Any records that could not be deleted (with reason and remediation plan)
- **Backup cleanup:** Backups containing individual-level data from the completed year are purged within 30 days of the deletion job
- **Detailed procedures:** See governance/retention/data-lifecycle-spec.md (Plan 01-02)

---

## 3. Organizational Safeguards

### Safeguard 9: Transparency and Growth Framing

**Mitigates:** Risk 7 (Chilling effect on participation)

**Specification:**
- All student-facing communications about analytics use **growth-oriented language**: analytics tracks development and progress, not compliance or surveillance
- Students are shown their own trajectory (comparing to their past self), not rankings against peers
- The self-reflection dashboard emphasizes what the student has achieved and what to focus on next, not deficiency
- The privacy notice explains clearly that analytics data is never used punitively
- Tutor consultation guidance emphasizes that analytics is evidence for supportive conversation, not judgment

---

### Safeguard 10: Staff Training on Data Handling

**Mitigates:** Risk 2 (Data breach), Risk 3 (Function creep), Risk 5 (Tutor access boundary)

**Specification:**
- **Initial training:** All staff with access to analytics data complete data handling training before receiving access
- **Training covers:**
  - POPIA obligations relevant to their role
  - What data they can access and why (purpose limitation)
  - What they cannot do with the data (prohibited uses)
  - How to handle a suspected data breach (incident reporting)
  - The tutor-student boundary (for tutors)
- **Tutor onboarding:** Specific onboarding module covering:
  - How to read and interpret analytics data in consultation
  - The pedagogical purpose of each metric
  - Why they see only their assigned students' data
  - How to discuss analytics with students constructively
- **Refresher:** Annual refresher training required for continued access
- **Acknowledgment:** Staff sign a data handling acknowledgment confirming they understand their obligations

---

### Safeguard 11: Data Handling Policy

**Mitigates:** Risk 3 (Function creep), Risk 6 (Retention overrun)

**Specification:**
- A written data handling policy is:
  - Communicated to all students at enrollment (plain language version)
  - Accessible within the application at all times
  - Signed/acknowledged by all staff with data access
- The policy covers:
  - What data is collected and why (references 01-processing-description.md)
  - How long data is kept (end of academic year)
  - Who can see what (access control matrix)
  - Student rights and how to exercise them (references 05-data-subject-rights.md)
  - Contact information for the Information Officer
  - How to lodge a complaint with the Information Regulator

---

### Safeguard 12: Annual DPIA Review

**Mitigates:** All risks (ongoing governance)

**Specification:**
- This DPIA is reviewed annually or when significant changes occur to:
  - Data collection activities (new activities added or existing ones modified)
  - Processing technology (new tools or platforms)
  - Risk landscape (new threats or incidents)
  - Regulatory environment (POPIA amendments or Information Regulator guidance)
- The review is conducted by the Information Officer (or delegate) with input from the teaching team
- Review output: updated DPIA documents with change log; updated risk assessment if risk profile has changed
- First review: at the end of the first academic year of operation

---

## 4. Residual Risk Assessment

After applying the safeguards documented above, the following residual risks remain:

| # | Risk | Pre-Safeguard | Post-Safeguard | Residual Risk Accepted? |
|---|------|:------------:|:--------------:|:-----------------------:|
| 1 | Re-identification from aggregated data | High | **Low** | Yes -- minimum group size of 10 effectively prevents re-identification in normal use |
| 2 | Data breach / unauthorized access | High | **Medium** | Yes -- no system is breach-proof; residual risk managed through incident response and encryption |
| 3 | Function creep | High | **Low** | Yes -- policy, technical, and contractual controls limit secondary use; requires ongoing vigilance |
| 4 | Connectivity-gap data quality | High | **Medium** | Yes -- normalization and flags mitigate but cannot fully resolve infrastructure inequality; ongoing equity review |
| 5 | Tutor access boundary violation | Medium | **Low** | Yes -- hard enforcement at query level; residual risk is minimal |
| 6 | Retention overrun | Medium | **Low** | Yes -- automated deletion with verification; residual risk is technical failure of automation |
| 7 | Chilling effect on participation | Low | **Low** | Yes -- growth framing and transparency reduce but cannot eliminate awareness effects |

**Overall residual risk assessment:** After safeguards, two risks remain at Medium (data breach and connectivity-gap quality). These are accepted as manageable:
- Data breach: inherent to any digital system; mitigated by encryption, RBAC, audit logging, and incident response
- Connectivity-gap quality: inherent to the South African infrastructure context; mitigated by normalization, flags, and equity review, but cannot be fully resolved through analytics system design alone

---

*Document: governance/dpia/04-safeguards.md*
*Part of: Data Protection Impact Assessment for ALE00Y1 Learning Analytics*
*Previous: 03-risk-assessment.md (Risk Assessment)*
*Next: 05-data-subject-rights.md (Data Subject Rights)*
