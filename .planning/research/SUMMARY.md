# Project Research Summary

**Project:** Academic Literacies Learning Analytics
**Domain:** Learning analytics specification for first-year academic literacy (CoP + SDL frameworks, mobile-first, offline-capable)
**Researched:** 2026-03-06
**Confidence:** MEDIUM

## Executive Summary

This project is a **specification** (not a codebase) for a mobile-first learning analytics system that tracks first-year students' development of academic literacy through the lenses of Communities of Practice (Wenger) and Self-Directed Learning (Garrison/Knowles). Experts build learning analytics systems using a five-layer event-driven architecture: collect structured events, process and enrich them, store immutably, compute layered metrics, and present role-specific dashboards. The dominant standard for learning event data is xAPI (Experience API), which provides an Actor-Verb-Object event model that maps directly to "Student-Did-Activity" tracking. The specification must produce an xAPI Profile, statement templates, metric formulas, dashboard wireframes, and an API contract -- not code.

The recommended approach is to build the specification bottom-up following the architecture's natural dependencies: start with privacy/consent architecture and the xAPI event schema, then define the offline-sync protocol and data collection layer, then base metrics and composite CoP/SDL indicators, and finally dashboards and intervention logic for three distinct audiences (students, tutors, teaching teams). The theoretical frameworks (CoP, SDL, Academic Literacies) are well-established and provide strong guidance on **what** to measure; the hard part is operationalizing qualitative constructs (identity development, legitimate peripheral participation, self-regulation capacity) into measurable proxies without reducing them to meaningless click counts.

The top risks are: (1) **surveillance framing** -- designing tracking around institutional needs rather than student empowerment, which destroys trust and produces gaming behavior; (2) **privacy as afterthought** -- POPIA compliance must shape the data model from day one, not be bolted on later; (3) **measuring clicks instead of learning** -- behavioral proxies (time-on-page, post counts) presented as learning indicators without validity documentation; and (4) **reducing CoP to interaction counts** -- missing the qualitative dimensions (discourse adoption, identity, mutual engagement quality) that distinguish a learning community from a posting requirement. Mitigation requires designing student-facing analytics first, building a layered measurement framework with explicit proxy validity conditions, and incorporating equity review gates throughout.

## Key Findings

### Recommended Stack

This is a specification project, so "stack" means standards, data models, and reference technologies the dev team should implement against. The core standard is **xAPI 2.0** for all learning event data, with a custom **Academic Literacy xAPI Profile** defining domain-specific verbs, activity types, and extensions. The specification should reference **Learning Locker** as the reference LRS (Learning Record Store) while remaining LRS-agnostic. The specification outputs are data contracts and wireframes, not library choices.

**Core technologies/standards:**
- **xAPI 2.0:** Learning event standard -- Actor-Verb-Object triples map perfectly to student activity tracking, with rich extension support for CoP/SDL custom data
- **Custom xAPI Profile (Academic Literacy):** Domain vocabulary -- defines verbs like "reflected-on," "adopted-discourse," activity types like "peer-discussion," "writing-task," and extensions for CoP-stage and SDL-level
- **cmi5 1.0:** Structured content tracking -- handles session management and completion for reading modules and quizzes within the xAPI ecosystem
- **Learning Locker (reference LRS):** Event storage and querying -- most widely adopted open-source LRS, self-hostable for university data governance
- **OAuth 2.0 + UUID v4 + ISO 8601:** Authentication, deduplication, and timestamping standards essential for offline-first sync reliability
- **LTI 1.3:** Optional LMS integration standard for university systems (Blackboard, Moodle, Canvas)

**Critical version verification needed:** xAPI 2.0 finalization status, Learning Locker licensing model, and Caliper deprecation status could not be verified (no web access during research).

### Expected Features

The feature landscape is organized into six layers with clear dependencies. Data collection (Layer 1) must come first because events cannot be recovered retroactively.

**Must have (table stakes):**
- All core event capture: module access, writing submissions, quiz attempts, discussion events, session tracking
- Offline event queue with sync reconciliation (non-negotiable for mobile-first)
- Engagement frequency, completion rates, assessment performance, time-on-task metrics
- Student progress overview dashboard (mobile-first), tutor student profiles with risk flags, team cohort overview
- Inactivity and non-submission alerts to tutors
- Self-report data collection (confidence/difficulty ratings) -- start collecting immediately even if SDL analytics are not yet built

**Should have (differentiators -- these make this system CoP/SDL-grounded, not a generic activity tracker):**
- CoP Participation Trajectory: composite index tracking movement from peripheral to full community participation
- Academic Discourse Adoption Index: tracking uptake of discipline vocabulary and argumentation patterns
- Self-Regulation Composite: planning, monitoring, and reflection behavior indicators
- Scaffolding Dependence Index: where on the guided-to-independent spectrum a student sits
- Calibration Accuracy: gap between self-reported confidence and actual performance
- Student-facing nudges: contextual, encouraging micro-interventions (max 2-3/week)
- Tutor consultation evidence view: curated data formatted for one-on-one meetings
- Goal-setting interface with decreasing scaffolding over the semester

**Defer (v2+):**
- Advanced NLP-based discourse analysis (start with keyword/phrase matching, upgrade later)
- Community health metrics (requires full semester of data)
- Intervention effectiveness tracking (requires interventions to have been running)
- Content effectiveness analytics
- Cross-context transfer indicators

**Critical anti-features (never build):**
- Competitive leaderboards, gamification badges, or class rankings
- Predictive "will fail" scores shown to students
- Automated punitive actions triggered by algorithms
- Webcam/attention monitoring, keystroke content capture, location tracking

### Architecture Approach

The architecture follows a standard five-layer event-driven pattern (Collect, Process, Store, Analyse, Present) with two cross-cutting concerns (offline sync and privacy/consent). The key architectural patterns are Event Sourcing (append-only immutable event log), CQRS (separate write and read paths), Offline-First with Sync (device is primary write target), and Metric Layering (raw events to base metrics to composite indicators to trajectories). Three computation cadences handle different needs: real-time for nudge triggers, nightly batch for summary metrics, and weekly for longitudinal trends. All three dashboard audiences consume the same underlying data pipeline through different pre-computed views.

**Major components:**
1. **Data Collection Layer (in-app):** Event Capture SDK, Offline Event Queue, Session Tracker -- embedded in mobile app, produces raw timestamped events
2. **Processing Pipeline (server):** Event Validator, Event Enricher (academic calendar context, cohort membership), Sync Reconciliation -- normalizes and deduplicates without computing metrics
3. **Storage Layer:** Raw Event Store (immutable, append-only), Computed Metric Store (derived, regenerable), Dashboard Cache (pre-computed for fast mobile delivery)
4. **Analysis Engine:** Real-time Indicators (nudge triggers), Batch Aggregator (daily/weekly summaries), Longitudinal Analyser (trend computation, CoP trajectories, SDL curves)
5. **Presentation Layer:** Three role-specific dashboards (student self-reflection, tutor consultation, team cohort) plus Intervention Engine (nudges, alerts, escalation)

### Critical Pitfalls

1. **Surveillance framing (CRIT-1):** Design student-facing analytics FIRST. Every data point must answer "how does knowing this help the student?" Apply pedagogical intent testing. If surveillance framing is baked into the data model, it cannot be fixed later.

2. **Privacy as afterthought (CRIT-2):** Conduct a Data Protection Impact Assessment before designing the data model. Implement granular consent (app functionality, personal analytics, tutor sharing, cohort analytics, research use). Build data deletion into the architecture from day one. POPIA compliance is non-negotiable.

3. **Measuring clicks instead of learning (CRIT-3):** For each metric, document explicitly what it measures (behavior), what it proxies (learning outcome), when the proxy is valid, and when it breaks. Combine behavioral data with performance indicators and self-report. Build "data humility" into every dashboard.

4. **Reducing CoP to interaction counts (CRIT-4):** Map analytics to Wenger's three dimensions (mutual engagement quality, shared repertoire development, joint enterprise alignment). Implement a participation spectrum (reader to synthesizer) where all positions are valid. Accept that some CoP dimensions require tutor observation, not algorithmic classification.

5. **Algorithmic bias amplifying inequities (CRIT-5):** Design for the most constrained user first (limited connectivity, second language, assistive technology). Use relative progress over absolute benchmarks. Build contestability ("I was offline due to load-shedding"). Equity review gate on every metric: "Does this disadvantage any student group?"

## Implications for Roadmap

Based on combined research, the specification should be built in 5 phases following the architecture's layer dependencies and the feature dependency chain.

### Phase 1: Foundation -- Privacy, Consent, and Event Schema

**Rationale:** Privacy/consent architecture constrains every subsequent design decision (CRIT-2). The xAPI event schema must be defined before metrics, dashboards, or sync can be specified. Both ARCHITECTURE.md and PITFALLS.md agree this must come first.
**Delivers:** Data Protection Impact Assessment, granular consent model, xAPI Profile document (custom verbs, activity types, extensions), statement templates for all trackable events, event storage model, data retention policy, access control matrix.
**Addresses:** FEATURES Layer 1 (data collection schema), all privacy/consent requirements.
**Avoids:** CRIT-2 (privacy as afterthought), CRIT-1 (surveillance framing -- forced to articulate student benefit for every data point during schema design), MIN-1 (granularity mismatch -- schema is driven by analytics questions).

### Phase 2: Collection and Sync -- Offline-First Data Pipeline

**Rationale:** The offline event queue is the most architecturally significant constraint and a hard prerequisite for all analytics. Without it, data from disadvantaged students is systematically missing (CRIT-5). Must be specified before metrics because metric validity depends on understanding sync limitations.
**Delivers:** Event capture specification (how events are generated per activity type), offline queue specification (local storage, sequence numbers, retry logic), sync protocol (batch sync, idempotent deduplication, conflict resolution), processing pipeline rules (validation, enrichment with academic calendar context, sync reconciliation).
**Addresses:** FEATURES Layer 1 (all event capture), offline queue differentiator, ARCHITECTURE Layers 1-2.
**Avoids:** MIN-2 (sync data artifacts), CRIT-5 (connectivity-aware design from the start).

### Phase 3: Metrics and Measurement Framework

**Rationale:** Metrics must be defined before dashboards can be designed (you cannot specify what a dashboard shows without knowing what metrics exist). This is where the CoP and SDL theoretical frameworks get operationalized. The layered metric approach (raw to base to composite to trajectory) keeps definitions tractable and testable.
**Delivers:** Base metric definitions (engagement frequency, completion rates, assessment performance, time-on-task), composite CoP indicators (participation trajectory, discourse adoption index, peer interaction quality), composite SDL indicators (self-regulation composite, scaffolding dependence index, calibration accuracy), threshold definitions for alerts/nudges, temporal modeling (academic calendar periods with period-specific baselines).
**Addresses:** FEATURES Layers 2 and 5 (core analytics + CoP/SDL analytics), ARCHITECTURE Layer 4.
**Avoids:** CRIT-3 (measuring clicks -- each metric has documented proxy validity), CRIT-4 (reducing CoP to counts -- Wenger's three dimensions explicitly mapped), MOD-4 (correlation-causation -- confounds documented per metric), MOD-6 (no temporal modeling -- calendar periods built in).

### Phase 4: Dashboards and Presentation

**Rationale:** Dashboards can only be specified after metrics are defined. Three separate audience views are required (not one dashboard with role filters). Mobile-first constraint means designing for 5-inch screens as the primary target, with progressive disclosure.
**Delivers:** Student self-reflection dashboard wireframes (mobile-first, offline-capable, 3-4 key metrics on landing), tutor consultation dashboard (individual student profiles with cohort context, risk flags, evidence view), teaching team cohort dashboard (distributions, trends, content effectiveness), Dashboard Data API specification (RESTful endpoints with request/response schemas).
**Addresses:** FEATURES Layer 3 (basic dashboards) and Layer 6 (advanced dashboards), ARCHITECTURE Layer 5.
**Avoids:** MOD-2 (information overload -- task-driven design, one key question per view), MOD-5 (mobile lip service -- mobile is primary design target), CRIT-1 (surveillance -- student dashboard designed first).

### Phase 5: Interventions and Feedback Loops

**Rationale:** Interventions depend on both the analysis engine (triggers from Phase 3) and the presentation layer (delivery channels from Phase 4). This phase closes the analytics loop and must include intervention logging for effectiveness tracking.
**Delivers:** Nudge logic and content (student-facing, max 2-3/week, encouraging tone), alert system (tutor-facing, prioritized, actionable with suggested responses), escalation pathways (automated nudge to tutor alert to team review), intervention logging specification, scaffolding adaptation recommendations, goal-setting interface with decreasing structure, metacognitive reflection prompts.
**Addresses:** FEATURES Layer 6 (interventions), SDL features (goal-setting, self-reflection prompts, scaffolding adaptation).
**Avoids:** MOD-3 (alert fatigue -- start with 2-3 alert types, feedback loop for calibration), MOD-1 (undermining self-direction -- tools offered as options, not requirements), MIN-4 (ignoring tutor capacity -- workload assumptions specified, alert prioritization).

### Phase Ordering Rationale

- **Bottom-up dependency chain:** Each phase produces outputs consumed by the next. Event schema (Phase 1) feeds collection spec (Phase 2) feeds metric definitions (Phase 3) feeds dashboard design (Phase 4) feeds intervention logic (Phase 5).
- **Privacy-first:** Starting with consent and data governance prevents the most damaging and expensive-to-fix pitfall (CRIT-2).
- **Data collection before analytics:** Capturing comprehensive events from day one is critical because data cannot be recovered retroactively. Even if Phase 3+ analytics are not ready at launch, the events are being stored.
- **Metrics before dashboards:** Prevents the anti-pattern of dashboard-driven data collection (Architecture anti-pattern 1). Dashboards display pre-computed metrics, never compute them.
- **Interventions last:** They depend on everything else and benefit most from the lessons learned in earlier phases.

### Research Flags

Phases likely needing deeper research during planning:
- **Phase 1:** POPIA-specific requirements for educational analytics need legal/compliance input. Current xAPI 2.0 status needs live verification.
- **Phase 3:** Operationalizing CoP participation trajectory and academic discourse adoption into measurable metrics is the hardest design challenge. NLP approach for discourse markers needs current technology assessment. Temporal modeling (academic calendar periods) needs institutional calendar data.
- **Phase 5:** Nudge content and tone require pedagogical expertise and ideally student co-design input. Escalation pathway design depends on institutional tutor-to-student ratios and consultation workflows.

Phases with standard patterns (can likely skip deep research):
- **Phase 2:** Offline-first sync with event sourcing is a well-documented mobile architecture pattern. xAPI statement submission and LRS sync protocols are established.
- **Phase 4:** Dashboard design patterns for learning analytics are well-documented (Jivet et al., 2018). Mobile-first progressive disclosure is standard UX practice. The three-audience model is clearly defined by the architecture.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM | xAPI dominance is well-established but version 2.0 status and Learning Locker licensing need live verification. Theoretical frameworks (CoP, SDL) are HIGH confidence. |
| Features | MEDIUM | Feature landscape is well-grounded in LA literature and CoP/SDL theory. "Differentiator" classification should be validated against current commercial LA platforms (Canvas, Blackboard analytics may have evolved). |
| Architecture | MEDIUM | Five-layer event-driven pattern is the standard LA reference architecture. Offline-first patterns are well-established. Specific scalability estimates are LOW confidence. |
| Pitfalls | HIGH | All critical pitfalls are extensively documented in LA literature. South Africa-specific concerns (POPIA, connectivity, equity) add context but do not change the core risks. |

**Overall confidence:** MEDIUM -- Strong theoretical and architectural foundations, but no live verification of current technology landscape (2026). The specification is for a well-understood domain with established patterns, which increases confidence despite the verification gap.

### Gaps to Address

- **POPIA compliance specifics:** Need legal/compliance input on educational analytics requirements under South African data protection law. Cannot be resolved by technical research alone.
- **xAPI 2.0 current status:** Is 2.0 finalized or is 1.0.3 still the production target? Affects all statement templates in the specification. Verify before Phase 1.
- **Learning Locker licensing:** Confirm open-source Community Edition is still available and maintained. Affects LRS recommendation.
- **Institutional context:** Tutor-to-student ratios, consultation workflows, existing LMS, academic calendar structure. Needed for Phases 3-5. Requires stakeholder input, not web research.
- **South African connectivity patterns:** Specific bandwidth, data cost, and load-shedding patterns that affect offline-sync design and data-cost-aware dashboard design. Needed for Phase 2.
- **Current NLP capabilities for discourse analysis:** Lightweight approaches for detecting academic vocabulary adoption, hedging language, citation patterns in student writing. Needed for Phase 3.
- **Mobile LA best practices (2025-2026):** Limited literature on mobile-first learning analytics dashboards. May need to extrapolate from general mobile UX research.

## Sources

### Primary (HIGH confidence)
- Wenger, E. (1998). *Communities of Practice: Learning, Meaning, and Identity*. Cambridge University Press. -- CoP framework, participation trajectory, shared repertoire
- Garrison, D.R. (1997). Self-directed learning: Toward a comprehensive model. -- SDL dimensions, self-regulation components
- Lea, M.R. & Street, B.V. (2006). The "Academic Literacies" model. -- Literacy as social practice, identity, disciplinary conventions
- Slade, S. & Prinsloo, P. (2013). Learning analytics: Ethical issues and dilemmas. -- Ethics, privacy, power dynamics, equity
- Wise, A.F. (2014). Designing pedagogical interventions to support student use of learning analytics. -- Pedagogical intent principle
- Chatti, M.A. et al. (2012). A reference model for learning analytics. -- Five-layer LA architecture

### Secondary (MEDIUM confidence)
- xAPI specification (adlnet.gov / xapi.com) -- Event standard, statement structure, profiles
- Jivet, I. et al. (2018). License to evaluate: Preparing LA dashboards for educational practice. -- Dashboard design patterns
- Tsai, Y.-S. & Gasevic, D. (2017). Learning analytics in higher education -- challenges and policies. -- Institutional adoption failures
- Ferguson, R. (2012). Learning analytics: Drivers, developments and challenges. -- LA landscape overview
- Biggs, J.B. & Collis, K.F. (1982). The SOLO Taxonomy. -- Assessment quality levels

### Tertiary (LOW confidence)
- Learning Locker, TRAX LRS, Watershed LRS current status -- Needs live verification
- xAPI 2.0 finalization status -- Needs live verification
- IMS Caliper current status -- Needs live verification
- Current mobile LA platform capabilities -- Needs market research

---
*Research completed: 2026-03-06*
*Ready for roadmap: yes*
