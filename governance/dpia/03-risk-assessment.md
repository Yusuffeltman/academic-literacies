# DPIA Part 3: Privacy Risk Assessment

**Document:** Data Protection Impact Assessment -- Risk Assessment
**System:** Academic Literacies Learning Analytics (ALE00Y1)
**Version:** 1.0 (Specification)
**Date:** 2026-03-07
**Status:** Draft for legal review

---

## 1. Risk Assessment Methodology

### 1.1 Scope

This risk assessment identifies and evaluates privacy risks arising from the data collection activities described in 01-processing-description.md. Each risk is assessed for likelihood and impact on data subjects (students), producing an overall risk level that determines the priority and nature of mitigation measures (documented in 04-safeguards.md).

### 1.2 Rating Scale

**Likelihood:**
| Rating | Definition |
|--------|-----------|
| Low | Unlikely to occur given current controls; would require multiple failures |
| Medium | Could occur under foreseeable circumstances; requires attention |
| High | Likely to occur without specific mitigation; a known problem in similar systems |

**Impact on Data Subject:**
| Rating | Definition |
|--------|-----------|
| Low | Minor inconvenience; no lasting effect on the student |
| Medium | Significant distress, unfair treatment, or reputational harm to the student |
| High | Severe harm: academic penalty based on flawed data, discrimination, or widespread exposure of personal information |

**Overall Risk Level:**
| | Impact: Low | Impact: Medium | Impact: High |
|---|:-:|:-:|:-:|
| **Likelihood: High** | Medium | High | Critical |
| **Likelihood: Medium** | Low | Medium | High |
| **Likelihood: Low** | Low | Low | Medium |

---

## 2. Identified Risks

### Risk 1: Re-identification from Aggregated Data

**Description:** Teaching team members see only aggregated cohort data. However, when tutorial groups are small or when demographic/behavioral filters are applied, aggregated views may inadvertently identify individual students. For example, if a tutorial group has only 3 students, an "average engagement score" for that group effectively reveals individual data.

**Affected Activities:** All activities when viewed at teaching team level (aggregated views)

**Assessment:**
| Factor | Rating | Rationale |
|--------|--------|-----------|
| Likelihood | **High** | Tutorial group sizes vary; some groups will have fewer than 10 students. Without enforcement, re-identification is probable. |
| Impact | **Medium** | A teaching team member could identify a specific student's engagement or performance patterns, potentially leading to biased treatment. |
| **Overall Risk** | **High** | |

**Risk-Specific Notes:**
The research literature explicitly identifies this as a common pitfall in learning analytics (Pitfall 3 in Phase 1 Research). The mitigation is a **minimum group size of 10** for any aggregated view at teaching team level. When a group contains fewer than 10 students, the aggregated cell is suppressed (not displayed) rather than shown. This threshold is based on:
- Research recommendation of 5-10 as minimum, with 10 as the conservative choice
- The small cohort sizes typical in tutorial-based teaching
- The availability of individual-level data to assigned tutors (who have legitimate access), reducing the need for teaching team members to see small-group aggregates

**Mitigation:** See 04-safeguards.md, Safeguard 1 (Minimum Group Size Enforcement)

---

### Risk 2: Data Breach / Unauthorized Access

**Description:** Unauthorized parties gain access to individual student data -- engagement patterns, writing samples, self-report responses, or quiz performance. This could occur through technical vulnerability (system compromise), credential theft (tutor account compromised), or insider misuse (staff accessing data outside their role).

**Affected Activities:** All activities

**Assessment:**
| Factor | Rating | Rationale |
|--------|--------|-----------|
| Likelihood | **Medium** | Standard web application risk; institutional security controls exist but are not breach-proof. LMS platforms are frequent targets. |
| Impact | **High** | Exposure of academic performance data, self-report responses (confidence levels, personal goals), and writing samples could cause significant harm to students -- embarrassment, reputational damage, or misuse of disclosed learning difficulties. |
| **Overall Risk** | **High** | |

**Mitigation:** See 04-safeguards.md, Safeguards 2-5 (Encryption, Access Control, Audit Logging, Incident Response)

---

### Risk 3: Function Creep

**Description:** Data collected for pedagogical purposes is used for unrelated purposes -- disciplinary action based on engagement metrics, surveillance of student behaviour patterns, sharing data with third parties for commercial purposes, or using analytics data in admissions or employment decisions.

**Affected Activities:** All activities

**Assessment:**
| Factor | Rating | Rationale |
|--------|--------|-----------|
| Likelihood | **Medium** | Function creep is a documented pattern in educational data systems. Institutional pressure to "use the data we have" for secondary purposes is foreseeable. |
| Impact | **High** | Use of analytics data for punitive purposes or decisions beyond pedagogy could cause serious harm to students and fundamentally undermine trust in the learning analytics system. |
| **Overall Risk** | **High** | |

**Mitigation:** See 04-safeguards.md, Safeguard 6 (Purpose Limitation Enforcement) and 02-lawful-basis.md, Section 4.2 (Prohibited Uses)

---

### Risk 4: Connectivity-Gap Data Quality

**Description:** Students with unreliable connectivity (due to load-shedding, mobile data costs, or poor infrastructure) produce incomplete interaction data. If the analytics system treats missing data as "no engagement," these students are falsely flagged as disengaged or at-risk, leading to inappropriate interventions or inaccurate tutor assessments.

**Affected Activities:** LMS Interaction Events, Session/Login Metadata, Curriculum Progress (most affected); Discussion Forum, Quiz Attempts (moderately affected)

**Assessment:**
| Factor | Rating | Rationale |
|--------|--------|-----------|
| Likelihood | **High** | In the South African context, load-shedding and mobile data constraints are widespread and well-documented. Many students in ALE00Y1 will be affected. |
| Impact | **Medium** | Students could be incorrectly classified as disengaged, leading to unnecessary interventions, inaccurate tutor briefings, or unfair comparison with peers who have better connectivity. |
| **Overall Risk** | **High** | |

**Risk-Specific Notes:**
This risk is amplified by the South African educational context:
- **Load-shedding** causes unpredictable session interruptions that look like voluntary disengagement
- **Mobile data costs** incentivize students to minimize online time, depressing interaction metrics
- **Shared devices** may limit when students can access the LMS
- The offline data pipeline (Phase 3) partially mitigates this, but offline events may still be lost if the device is not reconnected before queue overflow

**Mitigation:** See 04-safeguards.md, Safeguard 7 (Data Quality Flags and Connectivity Normalization)

---

### Risk 5: Tutor Access Boundary Violation

**Description:** A tutor accesses analytics data for students not assigned to them. This could reveal sensitive information about students in other tutorial groups -- performance struggles, self-report responses, or writing quality -- to a tutor who has no pedagogical relationship with that student.

**Affected Activities:** All activities (when accessed through tutor dashboard)

**Assessment:**
| Factor | Rating | Rationale |
|--------|--------|-----------|
| Likelihood | **Medium** | Depends on access control implementation. If tutor-student mapping is enforced at the application level, the risk is reduced. If mapping is advisory (soft boundary), the risk is higher. |
| Impact | **Medium** | Student data is disclosed to an authorized institutional user (tutor) but one who does not have a legitimate pedagogical relationship with that specific student. |
| **Overall Risk** | **Medium** | |

**Mitigation:** See 04-safeguards.md, Safeguard 3 (Tutor-Student Mapping Enforcement)

---

### Risk 6: Retention Overrun

**Description:** Individual-level student data is retained beyond the end of the academic year, violating the stated retention period and POPIA Section 14. This could occur through technical failure (deletion job not running), incomplete deletion (some data stores missed), or intentional deferral ("we might need it later").

**Affected Activities:** All activities

**Assessment:**
| Factor | Rating | Rationale |
|--------|--------|-----------|
| Likelihood | **Medium** | Data deletion is often deprioritized. Without automated enforcement, manual deletion processes are unreliable. |
| Impact | **Medium** | Students' personal information is held longer than stated, violating their rights under POPIA Section 14 and the privacy notice they were given. Retained data increases breach exposure window. |
| **Overall Risk** | **Medium** | |

**Mitigation:** See 04-safeguards.md, Safeguard 8 (Automated Retention Enforcement)

---

### Risk 7: Chilling Effect on Participation

**Description:** Students who are aware they are being monitored modify their behaviour to "look good" on analytics rather than engaging authentically. This is particularly relevant for discussion forum activity (students posting superficially to hit metrics) and self-report questionnaires (students giving socially desirable responses rather than honest self-assessments).

**Affected Activities:** Discussion Forum Activity, Self-Report Questionnaires, Writing Sample Submissions

**Assessment:**
| Factor | Rating | Rationale |
|--------|--------|-----------|
| Likelihood | **Medium** | Documented in learning analytics literature. Students who understand they are being tracked may self-censor or perform for the system. |
| Impact | **Low** | The primary harm is to data quality and the student's own self-reflection accuracy. The student is not directly harmed but may miss the pedagogical benefit of honest engagement. |
| **Overall Risk** | **Low** | |

**Mitigation:** See 04-safeguards.md, Safeguard 9 (Transparency and Growth Framing)

---

## 3. Risk Summary

| # | Risk | Likelihood | Impact | Overall | Key Mitigation |
|---|------|:----------:|:------:|:-------:|----------------|
| 1 | Re-identification from aggregated data | High | Medium | **High** | Minimum group size of 10 |
| 2 | Data breach / unauthorized access | Medium | High | **High** | Encryption, RBAC, audit logging |
| 3 | Function creep | Medium | High | **High** | Purpose limitation, prohibited uses |
| 4 | Connectivity-gap data quality | High | Medium | **High** | Data quality flags, normalization |
| 5 | Tutor access boundary violation | Medium | Medium | **Medium** | Tutor-student mapping enforcement |
| 6 | Retention overrun | Medium | Medium | **Medium** | Automated deletion |
| 7 | Chilling effect on participation | Medium | Low | **Low** | Transparency, growth framing |

**Overall assessment:** Four risks are rated High, two Medium, one Low. The High risks require specific technical and organizational safeguards documented in 04-safeguards.md. After safeguards are applied, residual risk assessment is provided in 04-safeguards.md, Section 4.

---

*Document: governance/dpia/03-risk-assessment.md*
*Part of: Data Protection Impact Assessment for ALE00Y1 Learning Analytics*
*Previous: 02-lawful-basis.md (Lawful Basis)*
*Next: 04-safeguards.md (Safeguards)*
