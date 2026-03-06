# Phase 1: Privacy & Ethics Foundation - Context

**Gathered:** 2026-03-06
**Status:** Ready for planning

<domain>
## Phase Boundary

A complete data governance framework — DPIA, data retention/deletion rules, equity review process, and access control matrix — that constrains every subsequent design decision in the analytics specification. This phase produces governance documents, not technical implementation.

</domain>

<decisions>
## Implementation Decisions

### POPIA Scope & Consent
- South African institution — POPIA is the primary regulatory framework
- Analytics are part of the course experience — consent via enrollment/terms of use, not separate opt-in
- Institution has an existing ethics review process — the DPIA should work within that framework
- DPIA should be a structured framework for legal review — produce the analytics-specific content, legal team validates POPIA compliance
- Simple consent model for v1 (not granular) — students accept analytics as part of course participation

### Data Access Boundaries
- Tutors have full access to all analytics for their assigned students (engagement, CoP, SDL, self-reports)
- Tutor-student mapping is fixed assignment — each student has a designated tutor, only that tutor sees their data
- Teaching team sees aggregated cohort patterns only — no individual student data at team level
- Students see only their own trajectory — growth-focused, comparing to their past self, not classmates

### Equity Review Criteria
- All four equity risks acknowledged: connectivity disadvantage, language disadvantage, prior education gaps, device limitations
- When a metric might be biased: flag and review — metric is flagged, human reviews before dashboard inclusion
- Equity review is a checklist in the spec — a repeatable process document that any analyst can follow
- Scope is prospective only — check new metrics for bias before they go live

### Retention & Student Rights
- Data retained until end of academic year, then deleted
- Students can request to see all data — full export in readable format available
- No mid-course deletion — analytics are part of the course, deletion available after course ends
- Same retention rules for all data types — uniform policy, simpler to implement and explain

### Claude's Discretion
- Exact DPIA document structure and section headings
- Specific POPIA sections to reference
- Equity review checklist item wording and scoring approach
- Access control matrix format and granularity

</decisions>

<specifics>
## Specific Ideas

- The equity framework should specifically address South African context — load-shedding impacts on connectivity, data costs affecting mobile usage, multilingual student population
- DPIA must document pedagogical purpose for every data collection activity — "why does collecting this help the student?"
- Access control should be simple enough to explain to students in plain language

</specifics>

<deferred>
## Deferred Ideas

- Granular consent model (students control what data is collected and who sees it) — v2 requirement (PRIV-04)
- Historical data bias auditing — noted for future consideration after system has accumulated data

</deferred>

---

*Phase: 01-privacy-ethics-foundation*
*Context gathered: 2026-03-06*
