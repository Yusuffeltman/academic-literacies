---
phase: 01-privacy-ethics-foundation
plan: 02
subsystem: governance
tags: [popia, retention, deletion, access-control, rbac, data-lifecycle, privacy]

# Dependency graph
requires:
  - phase: none
    provides: standalone governance documents (no prior phase dependency)
provides:
  - Data lifecycle specification with operational deletion procedures
  - Access control matrix with 4-role permission model
  - Aggregation rules (minimum group size 10) for teaching team views
  - Tutor-student fixed mapping rules
  - Data presentation rules (growth-focused, no peer comparison)
  - Plain language privacy summary for students
affects:
  - 01-03 (equity review framework references access control roles)
  - 02-schema (data categories defined here constrain schema design)
  - 04-metrics (aggregation rules constrain metric computation)
  - 07-dashboards (access control matrix and presentation rules constrain dashboard design)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-based access control: 4 roles (Student, Assigned Tutor, Teaching Team, System Admin)"
    - "Aggregation threshold: minimum group size of 10 for de-identification"
    - "Uniform retention: end of academic year (31 January) for all data categories"

key-files:
  created:
    - governance/retention/data-lifecycle-spec.md
    - governance/access-control/access-control-matrix.md
  modified: []

key-decisions:
  - "End of academic year defined as 31 January (accounts for supplementary exams)"
  - "9 data categories defined for lifecycle management"
  - "Minimum group size of 10 for aggregation (from research recommendation)"
  - "Audit logs retained 1 year beyond data deletion for POPIA accountability"
  - "Pre-computed aggregates below threshold deleted alongside individual data"
  - "Tutor reassignment revokes previous tutor access immediately"

patterns-established:
  - "Data categories: 10 categories in access matrix, 9 in retention spec (audit logs separate)"
  - "Deletion procedure: 4-step process (individual delete, backup purge, aggregate retention, audit log handling)"
  - "Student data export: self-service or written request, JSON/CSV + PDF formats"

# Metrics
duration: 5min
completed: 2026-03-07
---

# Phase 1 Plan 2: Data Retention and Access Control Summary

**Uniform end-of-academic-year retention with 4-step deletion procedures, and 4-role access control matrix with minimum group size 10 for aggregated teaching team views**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-07T02:34:33Z
- **Completed:** 2026-03-07T02:38:12Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- Data lifecycle specification with 9 data categories, uniform retention (31 January cutoff), and operational 4-step deletion procedures including backup purging and aggregate handling
- Access control matrix covering 10 data categories across 4 roles with explicit aggregation rules, cell suppression, and no-drill-down enforcement
- Plain language privacy summary suitable for direct inclusion in student-facing privacy notices
- Implementation requirements section giving developers concrete backend enforcement rules

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Data Retention and Deletion Specification** - `9596635` (feat)
2. **Task 2: Create Access Control Matrix** - `e80f890` (feat)

## Files Created/Modified

- `governance/retention/data-lifecycle-spec.md` - Data lifecycle rules, deletion procedures, student rights, edge cases
- `governance/access-control/access-control-matrix.md` - Role-data permission matrix, aggregation rules, tutor mapping, presentation rules

## Decisions Made

1. **End of academic year = 31 January:** Accounts for supplementary examinations and final grade processing. Provides a clear, unambiguous cutoff date.
2. **9 data categories in retention spec:** Covers all personal information in the system including audit logs. Audit logs get a distinct 1-year-beyond retention for accountability.
3. **Minimum group size of 10:** Following research recommendation (upper end of 5-10 range) for conservative privacy protection in potentially small cohorts.
4. **Pre-computed aggregates below threshold are deleted:** Aggregates computed from fewer than 10 individuals are treated as potentially identifiable and deleted alongside individual data.
5. **Tutor reassignment = immediate access revocation:** Previous tutor loses access immediately upon reassignment; new tutor inherits full history for continuity of care.
6. **Hard delete, not soft delete:** Individual records are permanently removed from production, not flagged/hidden. Backups purged within 30 days.

## Deviations from Plan

None -- plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None -- no external service configuration required.

## Next Phase Readiness

- Retention spec and access control matrix are complete and ready to be referenced by DPIA (01-01) and equity review framework (01-03)
- Both documents are cross-referenced to DPIA sections that will be created in other plans
- Data categories defined here should be used consistently across all Phase 1 governance documents
- No blockers for subsequent plans

---
*Phase: 01-privacy-ethics-foundation*
*Completed: 2026-03-07*
