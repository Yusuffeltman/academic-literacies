---
phase: 01-privacy-ethics-foundation
plan: 03
subsystem: governance
tags: [equity, bias-check, POPIA, fairness, South-Africa, learning-analytics]

# Dependency graph
requires:
  - phase: none
    provides: standalone governance artifact
provides:
  - Per-metric equity review checklist with 16 bias-check questions
  - Four-outcome decision framework (approved, approved with mitigation, flagged, rejected)
  - SA-specific bias risk documentation (connectivity, language, prior education, device)
  - Governance directory index across all Phase 1 documents
affects:
  - 04-engagement-metrics (every metric must pass equity review)
  - 05-cop-metrics (every metric must pass equity review)
  - 06-sdl-metrics (every metric must pass equity review)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Equity review embedded in metric specification (not separate audit)"
    - "Four-outcome decision framework with escalation path"

key-files:
  created:
    - governance/equity/equity-review-framework.md
    - governance/README.md
  modified: []

key-decisions:
  - "16-question checklist organized by four SA-specific bias risk categories"
  - "Growth-over-time recommended over absolute measures as primary mitigation pattern"
  - "FLAGGED metrics escalated to user; REJECTED metrics require alternative suggestions"

patterns-established:
  - "Equity review as embedded section in metric specification documents"
  - "Evidence-based checklist: each question requires specific evidence to answer"
  - "Worked examples demonstrate checklist application for future metric authors"

# Metrics
duration: 4min
completed: 2026-03-07
---

# Phase 1 Plan 3: Equity Review Framework Summary

**Per-metric equity review checklist with 16 SA-specific bias questions, four-outcome decision framework, and two worked examples demonstrating connectivity/language/device bias detection**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-07T02:34:28Z
- **Completed:** 2026-03-07T02:38:12Z
- **Tasks:** 2
- **Files created:** 2

## Accomplishments

- Equity review framework with four bias check sections covering South African educational context (load-shedding, multilingual population, prior education inequality, device limitations)
- 16 specific answerable questions with evidence requirements and mitigation options per category
- Four-outcome decision framework (APPROVED, APPROVED WITH MITIGATION, FLAGGED FOR REVIEW, REJECTED) with clear criteria and documentation requirements
- Two worked examples (Session Duration, Discussion Forum Posting Frequency) demonstrating full checklist application
- Governance index document providing navigation across all 8 Phase 1 governance documents

## Task Commits

Each task was committed atomically:

1. **Task 1: Create Equity Review Framework and Checklist** - `68bfa22` (feat)
2. **Task 2: Create Governance Index Document** - `00cb2c6` (docs)

## Files Created/Modified

- `governance/equity/equity-review-framework.md` - Complete equity review process with per-metric checklist, worked examples, and governance procedures
- `governance/README.md` - Index of all 8 governance documents with paths, purposes, and regulatory context

## Decisions Made

- Organized checklist as table format with columns for question number, question, evidence required, and risk description for scannable review
- Used "Evidence Required" column to make each question empirically answerable rather than subjective
- Worked examples chosen to demonstrate different bias profiles: Session Duration surfaces connectivity/device bias; Discussion Forum surfaces language bias
- Mitigation recommendations consistently favor growth-over-time measures over absolute measures

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Equity review framework ready for application in Phases 4, 5, and 6
- Framework is self-contained and does not depend on other Phase 1 outputs
- Phases 4-6 metric specification documents must include a completed equity review section
- If Plans 01-01 and 01-02 have not yet been executed, the governance README references documents that do not yet exist (this is expected and documented)

---
*Phase: 01-privacy-ethics-foundation*
*Completed: 2026-03-07*
