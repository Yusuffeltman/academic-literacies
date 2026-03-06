# Roadmap: Academic Literacies Learning Analytics

## Overview

This roadmap delivers an implementation-ready specification for a learning analytics system grounded in Communities of Practice and Self-Directed Learning theory. The specification is built bottom-up following the architecture's natural dependencies: privacy and data governance first, then event schemas, then data collection, then layered metrics (base, CoP, SDL), then dashboards for three audiences, and finally intervention logic. Each phase produces specification documents -- data schemas, metric definitions, wireframes, or logic rules -- not running code.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Privacy & Ethics Foundation** - POPIA-compliant privacy framework and equity review process
- [ ] **Phase 2: xAPI Event Schema** - Event data model for all trackable student interactions
- [ ] **Phase 3: Offline Data Pipeline** - Offline-first data collection and sync specification
- [ ] **Phase 4: Core Engagement Metrics** - Base metric definitions with formulas and thresholds
- [ ] **Phase 5: CoP Development Metrics** - Communities of Practice composite indicators
- [ ] **Phase 6: SDL Autonomy Metrics** - Self-Directed Learning composite indicators
- [ ] **Phase 7: Dashboards & Presentation** - Three-audience dashboard wireframes and data API spec
- [ ] **Phase 8: Interventions & Feedback Loops** - Nudge logic, alert rules, escalation paths

## Phase Details

### Phase 1: Privacy & Ethics Foundation
**Goal**: A complete data governance framework exists that constrains every subsequent design decision -- what data can be collected, how long it is retained, who can access it, and how every metric is checked for bias before inclusion.
**Depends on**: Nothing (first phase)
**Requirements**: PRIV-01, PRIV-02, PRIV-03
**Success Criteria** (what must be TRUE):
  1. A Data Protection Impact Assessment document exists covering all planned data collection activities under POPIA
  2. A data retention and deletion specification defines lifecycle rules for every data category and documents student deletion rights
  3. An equity review framework document provides a repeatable bias-check process with criteria that can be applied to every metric before dashboard inclusion
  4. An access control matrix specifies exactly which data each audience (student, tutor, teaching team) can see
**Plans**: TBD

Plans:
- [ ] 01-01: TBD
- [ ] 01-02: TBD
- [ ] 01-03: TBD

### Phase 2: xAPI Event Schema
**Goal**: A complete, standards-based event vocabulary exists that defines exactly what data the application captures for every student interaction, providing the foundation all metrics are computed from.
**Depends on**: Phase 1 (privacy framework constrains what events can be collected)
**Requirements**: DATA-01, DATA-04
**Success Criteria** (what must be TRUE):
  1. A custom Academic Literacy xAPI Profile document defines all domain-specific verbs, activity types, and extensions needed for reading, writing, quiz, and discussion tracking
  2. Statement templates exist for every trackable event type with complete Actor-Verb-Object structure, context extensions, and example payloads
  3. A writing sample collection specification defines how writing artifacts are captured, stored, and made available for academic discourse analysis
  4. Every event type in the schema references the DPIA and documents its pedagogical purpose (why collecting this helps the student)
**Plans**: TBD

Plans:
- [ ] 02-01: TBD
- [ ] 02-02: TBD
- [ ] 02-03: TBD

### Phase 3: Offline Data Pipeline
**Goal**: A complete specification exists for collecting events on unreliable mobile connections and self-report data, so that no student data is lost due to connectivity and subjective learning experience is captured alongside behavioral data.
**Depends on**: Phase 2 (event schema defines what the pipeline transports)
**Requirements**: DATA-02, DATA-03
**Success Criteria** (what must be TRUE):
  1. An offline event queue specification defines local storage format, sequence numbering, retry logic, and maximum queue size for the mobile client
  2. A batch sync protocol document specifies idempotent deduplication, conflict resolution, and reconciliation rules for when connectivity resumes
  3. Self-report instrument specifications define the confidence, goal-setting, and strategy-use questionnaires with administration timing, response formats, and xAPI statement mappings
  4. The sync specification accounts for South African connectivity constraints (data cost, load-shedding, intermittent wifi) with explicit design decisions documented
**Plans**: TBD

Plans:
- [ ] 03-01: TBD
- [ ] 03-02: TBD

### Phase 4: Core Engagement Metrics
**Goal**: Base-level metric definitions exist with precise formulas, threshold values, and documented proxy validity, forming the quantitative foundation that CoP and SDL composite metrics build upon.
**Depends on**: Phase 2 (metrics are computed from events defined in the schema), Phase 3 (sync limitations affect metric validity)
**Requirements**: METR-01, METR-02, METR-03, METR-04
**Success Criteria** (what must be TRUE):
  1. Engagement metric definitions (session frequency, duration, activity completion rates) include exact formulas, threshold values for alert triggers, and normalization rules for connectivity gaps
  2. Performance trend specifications define how quiz scores and writing quality progression are computed over time, including trend detection algorithms and period-specific baselines
  3. Learning path progression metrics define curriculum position and pace calculations relative to expected trajectory, with clear definitions of "on track," "ahead," and "behind"
  4. Time-on-task metric definitions include normalization for offline periods and connectivity constraints, with documented conditions under which the proxy is valid versus unreliable
  5. Every metric document includes a proxy validity section: what behavior it measures, what learning outcome it proxies, when the proxy holds, and when it breaks
**Plans**: TBD

Plans:
- [ ] 04-01: TBD
- [ ] 04-02: TBD
- [ ] 04-03: TBD

### Phase 5: CoP Development Metrics
**Goal**: Composite indicators exist that operationalize Wenger's Communities of Practice framework into measurable proxies, tracking students' movement from legitimate peripheral participation toward full academic community membership.
**Depends on**: Phase 4 (CoP composites build on base engagement and performance metrics)
**Requirements**: COP-01, COP-02, COP-03, COP-04
**Success Criteria** (what must be TRUE):
  1. A participation trajectory specification defines how movement from peripheral to full participation is tracked using posting frequency, reply depth, and initiation-vs-response ratio, with a multi-stage participation spectrum (reader, responder, contributor, synthesizer)
  2. An academic discourse adoption specification defines how uptake of academic register is detected in writing and discussion, including vocabulary markers, citation patterns, and argument structure indicators
  3. A peer interaction quality specification defines how substantive vs surface interactions are classified and how reciprocity and depth are measured
  4. A cross-context transfer specification defines how evidence of applying academic literacy skills across different modules and activity types is detected and scored
  5. All four CoP metrics explicitly map to Wenger's three dimensions (mutual engagement, shared repertoire, joint enterprise) with documented theoretical justification
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD
- [ ] 05-03: TBD

### Phase 6: SDL Autonomy Metrics
**Goal**: Composite indicators exist that operationalize Self-Directed Learning theory into measurable proxies, tracking where students sit on the guided-to-independent spectrum and how their self-regulation capacity develops over the academic year.
**Depends on**: Phase 4 (SDL composites build on base engagement and performance metrics)
**Requirements**: SDL-01, SDL-02, SDL-03, SDL-04
**Success Criteria** (what must be TRUE):
  1. A scaffolding dependence index specification defines how support level is measured and how movement toward independence is tracked, including what constitutes "guided," "developing," and "independent" on the spectrum
  2. A self-regulation tracking specification defines observable behavioral indicators for goal-setting, planning, progress monitoring, and reflection, with data sources and computation methods for each
  3. A calibration accuracy specification defines how the correlation between student self-predicted and actual performance is computed, including scoring rules and interpretation guidelines for metacognitive awareness
  4. A help-seeking pattern specification defines classification rules for strategic, dependent, and avoidant help-seeking, with behavioral indicators and thresholds for each category
  5. All four SDL metrics include longitudinal modeling: how the metric is expected to change across the academic year (both semesters) and what trajectory shapes indicate healthy vs concerning development
**Plans**: TBD

Plans:
- [ ] 06-01: TBD
- [ ] 06-02: TBD
- [ ] 06-03: TBD

### Phase 7: Dashboards & Presentation
**Goal**: Complete wireframes and data specifications exist for three role-specific dashboards plus an early warning system, designed mobile-first for 5-inch screens with offline capability, so the development team can build the presentation layer.
**Depends on**: Phase 4, Phase 5, Phase 6 (dashboards display metrics defined in those phases)
**Requirements**: DASH-01, DASH-02, DASH-03, DASH-04
**Success Criteria** (what must be TRUE):
  1. Student self-reflection dashboard wireframes exist showing personal growth visualization, goal tracking, and next-step suggestions, designed for mobile screens with offline viewing capability and progressive disclosure
  2. Tutor consultation dashboard wireframes exist showing individual student evidence views formatted for one-on-one meetings, with cohort context, risk flags, and learning plan development support
  3. Teaching team cohort dashboard wireframes exist showing cohort-level distributions, trends, at-risk student identification, and system health metrics
  4. An early warning system specification defines automated risk flags with threshold definitions across multiple indicators, prioritization logic, and escalation rules
  5. A Dashboard Data API specification defines RESTful endpoints with request/response schemas, caching strategy, and pre-computation rules for mobile performance
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD
- [ ] 07-03: TBD
- [ ] 07-04: TBD

### Phase 8: Interventions & Feedback Loops
**Goal**: Complete intervention logic exists covering automated student nudges, tutor alerts, learning plan templates, and intervention logging, closing the analytics loop so data leads to action and actions are tracked for effectiveness.
**Depends on**: Phase 7 (interventions are delivered through dashboards and notification channels defined in Phase 7)
**Requirements**: INTV-01, INTV-02, INTV-03, INTV-04
**Success Criteria** (what must be TRUE):
  1. An automated nudge specification defines context-sensitive student prompts with trigger rules, content templates, frequency caps (max 2-3/week), tone guidelines, and delivery channel specifications
  2. A tutor alert specification defines notification rules for risk threshold crossings with prioritization logic, suggested response actions, and workload-aware throttling
  3. Individual learning plan templates exist as evidence-based frameworks for tutor-student goal setting, informed by analytics data, with decreasing scaffolding structure over the semester
  4. An intervention logging specification defines how interventions are recorded (type, trigger, actor, timing, student response) and how outcome tracking enables effectiveness analysis over time
  5. An escalation pathway document defines the progression from automated nudge to tutor alert to teaching team review, with clear transition criteria and human-in-the-loop requirements
**Plans**: TBD

Plans:
- [ ] 08-01: TBD
- [ ] 08-02: TBD
- [ ] 08-03: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 -> 6 -> 7 -> 8
Note: Phases 5 and 6 depend on Phase 4 but not on each other; they could theoretically be worked in parallel.

| Phase | Plans Complete | Status | Completed |
|-------|---------------|--------|-----------|
| 1. Privacy & Ethics Foundation | 0/3 | Not started | - |
| 2. xAPI Event Schema | 0/3 | Not started | - |
| 3. Offline Data Pipeline | 0/2 | Not started | - |
| 4. Core Engagement Metrics | 0/3 | Not started | - |
| 5. CoP Development Metrics | 0/3 | Not started | - |
| 6. SDL Autonomy Metrics | 0/3 | Not started | - |
| 7. Dashboards & Presentation | 0/4 | Not started | - |
| 8. Interventions & Feedback Loops | 0/3 | Not started | - |
