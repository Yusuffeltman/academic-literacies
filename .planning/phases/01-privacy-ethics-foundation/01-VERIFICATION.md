# Phase 1: Privacy & Ethics Foundation - Verification

**Verified:** 2026-03-07
**Status:** passed

## Goal

A complete data governance framework exists that constrains every subsequent design decision -- what data can be collected, how long it is retained, who can access it, and how every metric is checked for bias before inclusion.

## Success Criteria Verification

### SC-1: DPIA covering all planned data collection under POPIA ✓

- 5 DPIA documents exist in `governance/dpia/`
- Processing description covers 7 data collection activities, each with documented "Pedagogical Purpose" (7 occurrences verified)
- Lawful basis uses legitimate interest (Section 11(1)(f)) + contractual necessity (5 occurrences of "legitimate interest")
- Section 11(3) objection rights documented (5 occurrences)
- Risk assessment identifies 7 risks with likelihood/impact ratings
- Safeguards document provides technical and organizational mitigations
- Data subject rights cover access, correction, objection, deletion, complaint

### SC-2: Data retention and deletion specification ✓

- `governance/retention/data-lifecycle-spec.md` exists
- Defines uniform end-of-academic-year retention (4 occurrences)
- Includes operational deletion procedures (not just policy statements)
- Addresses backup deletion, derived data handling
- Student-initiated deletion documented (after course ends)
- Edge cases covered (withdrawal, supplementary exams, legal hold)

### SC-3: Equity review framework ✓

- `governance/equity/equity-review-framework.md` exists
- 12 bias check headings across 4 SA-specific categories (connectivity, language, prior education, device)
- Checklist items are specific answerable questions with evidence requirements
- Four-outcome decision framework (approved, approved with mitigation, flagged, rejected)
- Worked examples included

### SC-4: Access control matrix ✓

- `governance/access-control/access-control-matrix.md` exists
- 4 roles defined (Student, Assigned Tutor, Teaching Team, System Admin)
- 7 occurrences of "Aggregated only" in matrix
- Minimum group size of 10 specified (4 occurrences)
- Tutor-student fixed mapping rules documented
- Plain language summary section present

## Requirement Coverage

| Requirement | Status | Evidence |
|-------------|--------|----------|
| PRIV-01 | ✓ Complete | 5 DPIA documents with full POPIA 8 conditions mapping |
| PRIV-02 | ✓ Complete | Data lifecycle spec with operational deletion procedures |
| PRIV-03 | ✓ Complete | Equity review framework with 4 bias categories and decision framework |

## Must-Have Verification

| Must-Have | Status |
|-----------|--------|
| DPIA covers all planned data collection activities | ✓ 7 activities documented |
| Every activity documents pedagogical purpose | ✓ 7 occurrences verified |
| Legitimate interest is primary lawful basis | ✓ Not consent-only |
| Section 11(3) objection rights documented | ✓ Clear process documented |
| Retention defined for all data categories | ✓ Uniform end-of-year policy |
| Deletion procedures are operational | ✓ 4-step process with checklist |
| Access control specifies all audiences | ✓ 4-role matrix, 10 data categories |
| Teaching team sees aggregated only | ✓ With minimum group size 10 |
| Equity checklist is repeatable | ✓ Specific questions with evidence requirements |
| SA-specific bias risks addressed | ✓ Connectivity, language, prior education, device |

## Score

**10/10 must-haves verified**

## Gaps

None identified.

---
*Verified: 2026-03-07*
*Verifier: manual (orchestrator)*
