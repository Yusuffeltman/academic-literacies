---
phase: 01-privacy-ethics-foundation
plan: 01
subsystem: governance
tags: [popia, dpia, privacy, data-protection, lawful-basis, risk-assessment, south-africa]

# Dependency graph
requires:
  - phase: none
    provides: "First plan in first phase -- no prior dependencies"
provides:
  - "5-part DPIA covering processing description, lawful basis, risk assessment, safeguards, and data subject rights"
  - "POPIA 8 conditions mapping for 7 data collection activities"
  - "Privacy risk register with 7 identified risks and mitigation safeguards"
  - "Section 11(3) objection process specification"
  - "Minimum group size threshold (10) for aggregation re-identification prevention"
affects: [01-02-retention, 01-03-equity, 02-xapi-schema, 07-dashboards, 08-interventions]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "DPIA structured around POPIA 8 conditions per data activity"
    - "Risk assessment with likelihood/impact matrix and residual risk tracking"
    - "Legitimate interest + contractual necessity as dual lawful basis"

key-files:
  created:
    - governance/dpia/01-processing-description.md
    - governance/dpia/02-lawful-basis.md
    - governance/dpia/03-risk-assessment.md
    - governance/dpia/04-safeguards.md
    - governance/dpia/05-data-subject-rights.md
  modified: []

key-decisions:
  - "Legitimate interest (Section 11(1)(f)) + contractual necessity (Section 11(1)(b)) as dual lawful basis, not consent-only"
  - "Minimum group size of 10 for teaching team aggregated views"
  - "7 risks identified: 4 High, 2 Medium, 1 Low; post-safeguard residual: 0 High, 2 Medium, 5 Low"
  - "Section 11(3) objection process stops individual processing but flagged for legal review"
  - "No mid-course deletion; deletion available after course ends"
  - "Aggregated statistics retained after individual deletion (no longer personal information)"

patterns-established:
  - "DPIA document structure: 5-part series (processing, lawful basis, risks, safeguards, rights)"
  - "Each data activity documents pedagogical purpose answering 'how does this help the student learn'"
  - "Cross-referencing between DPIA documents via file path references"

# Metrics
duration: 8min
completed: 2026-03-07
---

# Phase 1 Plan 1: DPIA Summary

**Five-part DPIA covering 7 data collection activities mapped against POPIA's 8 conditions, with risk register, 12 safeguards, and full student rights implementation including Section 11(3) objection process**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-07T02:34:28Z
- **Completed:** 2026-03-07T02:42:10Z
- **Tasks:** 2
- **Files created:** 5

## Accomplishments

- Complete processing description for 7 data activities (LMS events, forum, writing, quizzes, self-reports, sessions, curriculum progress), each with documented pedagogical purpose
- POPIA 8 conditions mapping using legitimate interest + contractual necessity as dual lawful basis, avoiding the consent-only pitfall
- Risk assessment identifying 7 privacy risks with likelihood/impact ratings and a minimum group size of 10 for re-identification prevention
- 12 technical and organizational safeguards with residual risk assessment showing all High risks reduced to Low or Medium post-mitigation
- Student rights implementation covering access, correction, objection (Section 11(3)), deletion, and complaint, with plain-language communication examples

## Task Commits

Each task was committed atomically:

1. **Task 1: Create DPIA Processing Description and Lawful Basis** - `ee3cd5f` (feat)
2. **Task 2: Create DPIA Risk Assessment, Safeguards, and Data Subject Rights** - `879f3a4` (feat)

## Files Created/Modified

- `governance/dpia/01-processing-description.md` - Processing description for all 7 data collection activities with pedagogical purpose
- `governance/dpia/02-lawful-basis.md` - POPIA 8 conditions mapping with legitimate interest assessment and activity-condition matrix
- `governance/dpia/03-risk-assessment.md` - 7 privacy risks with likelihood/impact ratings and risk summary table
- `governance/dpia/04-safeguards.md` - 12 technical and organizational safeguards with residual risk assessment
- `governance/dpia/05-data-subject-rights.md` - Student rights under POPIA with implementation procedures and plain-language example

## Decisions Made

1. **Dual lawful basis (legitimate interest + contractual necessity):** Following research recommendation and USAf guidance, the DPIA establishes Section 11(1)(f) + Section 11(1)(b) as the primary lawful basis for all analytics processing, avoiding reliance on consent alone.

2. **Minimum group size of 10 for aggregation:** The conservative end of the 5-10 range recommended by research, chosen for tutorial group contexts where small groups are common.

3. **7 risks identified (expanded from plan's minimum of 6):** Added Risk 7 (Chilling Effect on Participation) beyond the 6 specified risks, as it is a documented concern in the learning analytics literature that affects data quality.

4. **Section 11(3) objection stops processing, flagged for legal review:** The default position is that upheld objections stop analytics processing for the individual while maintaining course access. The interaction between Section 11(3) and course-integrated analytics is flagged as requiring legal counsel input.

5. **Aggregated statistics retained after deletion:** Following research Open Question 4 recommendation, cohort-level aggregates that included a student's data are not recalculated after individual deletion, as they are no longer personal information.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- DPIA complete and ready for legal review
- Plan 01-02 (retention/deletion spec + access control matrix) can proceed; the DPIA references these documents
- Plan 01-03 (equity review framework) can proceed; the DPIA references the equity review in safeguard 7
- Legal review flagged for Section 11(3) objection process and course-integrated analytics interaction
- Cross-border transfer status flagged for confirmation (cloud hosting location)

---
*Phase: 01-privacy-ethics-foundation*
*Completed: 2026-03-07*
