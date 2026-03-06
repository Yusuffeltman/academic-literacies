# Academic Literacies Learning Analytics

## What This Is

A comprehensive learning analytics blueprint for an existing academic literacy application used by first-year university students. The project produces implementation-ready specifications — data schemas, metric definitions, dashboard wireframes, and intervention logic — that a development team will build into the app. Every metric is grounded in Communities of Practice theory and self-directed learning pedagogy.

## Core Value

Make student development toward academic community membership visible and measurable, so that struggling students are identified early and supported through evidence-based, individually-tailored learning plans.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Data event specification for all trackable student interactions (reading, writing, quizzes, discussion)
- [ ] Metric definitions with formulas, thresholds, and pedagogical rationale
- [ ] CoP development indicators — academic discourse adoption, peer engagement quality, self-regulation patterns, cross-context transfer
- [ ] Scaffolded autonomy tracking — measuring where students sit on the guided-to-independent spectrum
- [ ] Student-facing self-reflection dashboard (mobile-first, works on unreliable connectivity)
- [ ] Tutor consultation view — evidence for one-on-one discussions and individual learning plan development
- [ ] Teaching team cohort dashboard — patterns, trends, and cohort-level intervention triggers
- [ ] Automated nudge/intervention logic — rules, triggers, escalation paths
- [ ] Offline-capable data collection for unreliable mobile connectivity
- [ ] Full academic year longitudinal tracking model (both semesters)

### Out of Scope

- Building/coding the analytics system — this project produces specifications for an existing dev team
- Peer support/mentoring matching system — focus is on staff-mediated and self-directed intervention
- Multi-year tracking beyond first year — design for one year, extensibility noted but not specified
- App UX redesign — analytics layer only, existing app structure assumed

## Context

- **Pedagogical framework:** Communities of Practice (Wenger) — students as legitimate peripheral participants moving toward full membership in the academic community. Self-directed learning with scaffolded autonomy (guided initially, increasing independence as competence develops).
- **Student population:** First-year university students transitioning from school to higher education. Academic literacy gaps are most acute at this transition point.
- **Device reality:** Students primarily use smartphones. Both unreliable data/wifi connectivity and small screen constraints must inform dashboard design and data collection strategy.
- **Activity types in app:** Structured reading/modules, writing tasks (paragraphs, essays, reflections), quizzes/formative assessments, discussion/peer interaction forums.
- **Three analytics audiences:** (1) Students — self-reflection tools and automated nudges, (2) Individual tutors — evidence for consultations and learning plan development, (3) Teaching teams — cohort-level patterns and systemic intervention decisions.
- **Intervention model:** Multi-layered — automated nudges to students, staff dashboard alerts, self-reflection tools that promote metacognition. No peer-matching automation.

## Constraints

- **Platform**: Mobile-first (smartphones) — dashboards must render on small screens, data collection must handle offline/intermittent connectivity
- **Deliverable format**: Implementation specifications, not code — data schemas, metric formulas, wireframes, logic rules
- **Theoretical grounding**: Every metric must be justified with pedagogical rationale (CoP theory, self-directed learning literature)
- **Tracking period**: Full academic year (two semesters) — analytics must capture longitudinal development, not just point-in-time snapshots

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Specification project, not code | Existing dev team will implement; this project provides the blueprint | — Pending |
| Three-audience dashboard model | Students, tutors, and teaching teams have different analytics needs | — Pending |
| CoP + SDL theoretical frame | Captures identity development and autonomy growth, not just task completion | — Pending |
| Scaffolded autonomy over free choice | First-years need guided entry before self-direction | — Pending |
| No peer-matching automation | Keep intervention human-mediated via staff, plus student self-reflection | — Pending |

---
*Last updated: 2026-03-06 after initialization*
