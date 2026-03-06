# Technology Stack

**Project:** Academic Literacies Learning Analytics (Specification)
**Researched:** 2026-03-06
**Research limitation:** WebSearch and WebFetch were unavailable during this research session. All findings are based on training data (cutoff May 2025). Confidence levels reflect this -- nothing has been live-verified. Recommend validating version numbers and standard statuses before finalizing the specification.

---

## Recommended Stack

This is a specification project, not a coding project. "Stack" here means: the standards, data models, frameworks, and tools that the specification should reference and the dev team should implement against.

---

### Learning Analytics Standards

| Technology | Version | Purpose | Why | Confidence |
|------------|---------|---------|-----|------------|
| **xAPI (Experience API)** | 2.0 (spec finalized ~2023-2024) | Event data standard | Industry-dominant standard for learning activity tracking. Actor-Verb-Object triple maps perfectly to "Student-Did-Activity" events. Rich extension mechanism for CoP and SDL custom data. Massive ecosystem of LRS providers, authoring tools, and integrations. | MEDIUM -- version number needs verification |
| **xAPI Profiles** | Per xAPI 2.0 spec | Vocabulary and pattern definitions | Allows defining a custom "Academic Literacy Profile" that constrains verbs, activity types, and extensions to your domain. This is how you formalize CoP participation events and SDL indicators as a reusable vocabulary. | MEDIUM |
| **cmi5** | 1.0 | Content launch/completion tracking | xAPI profile for structured content (reading modules, quizzes). Handles session management, completion, and pass/fail. Use for the structured learning content; extend with custom xAPI for social/CoP activities. | MEDIUM |

**Do NOT use:**

| Technology | Why Not |
|------------|---------|
| **IMS Caliper Analytics** | 1EdTech (formerly IMS Global) has been converging Caliper toward xAPI interoperability. Caliper had institutional adoption but a smaller ecosystem. For a new specification, xAPI provides broader tooling support, more LRS options, and stronger community momentum. Caliper's sensor API model is more opinionated but less flexible for custom CoP tracking. |
| **SCORM** | Legacy standard. No support for social learning, discussion tracking, or the granular activity streams needed for CoP analytics. SCORM tracks completion, not learning processes. |
| **Proprietary analytics formats** | Lock-in risk. xAPI's open standard means the dev team can swap LRS providers and visualization tools without rewriting the data layer. |
| **Custom event schemas without a standard** | Tempting for simplicity but creates a dead-end. xAPI gives you interoperability, existing tooling, and a shared vocabulary that future systems can consume. The overhead of xAPI compliance is modest and the specification should bake it in from the start. |

---

### Learning Record Store (LRS)

| Technology | Type | Purpose | Why | Confidence |
|------------|------|---------|-----|------------|
| **Learning Locker** (open source, by Learning Pool) | Open Source / Commercial | Primary LRS for storing and querying xAPI statements | Most widely adopted open-source LRS. Can be self-hosted (important for university data governance). Has REST API for dashboards, supports statement forwarding, and handles the query patterns needed for longitudinal tracking. Community edition is free; enterprise adds support. | MEDIUM -- verify current licensing model |
| **TRAX LRS** | Open Source (Laravel-based) | Alternative LRS | Lighter-weight option if the university runs PHP/Laravel infrastructure. Less feature-rich than Learning Locker but simpler to deploy and maintain. Good for teams that want full control. | LOW -- verify active maintenance status |
| **Watershed LRS** (by Watershed / Intellum) | Commercial SaaS | Alternative for no-ops | If the university prefers SaaS over self-hosting. Strong analytics and visualization built in. Higher cost but zero infrastructure burden. | LOW -- verify current product status, may have been acquired/renamed |
| **Veracity Learning** | Commercial SaaS | Alternative commercial option | Another commercial LRS with good xAPI 2.0 support and built-in analytics. | LOW |

**Recommendation:** Specify **Learning Locker** as the reference LRS in the specification, with a note that any xAPI-conformant LRS is acceptable. This gives the dev team a concrete target while preserving flexibility. The specification should define LRS query patterns (for dashboards) against the xAPI standard query API, not against Learning Locker's proprietary features.

---

### Data Model Layer

| Component | Approach | Purpose | Why | Confidence |
|-----------|----------|---------|-----|------------|
| **xAPI Statement Structure** | Actor-Verb-Object + Context + Result + Extensions | Core event schema | The specification should define every trackable event as an xAPI statement template. This gives the dev team exact JSON structures to emit. | HIGH (well-documented standard) |
| **Custom xAPI Profile: Academic Literacy** | JSON-LD profile document | Domain vocabulary | Define custom verbs (e.g., "reflected-on", "adopted-discourse", "sought-feedback"), activity types ("writing-task", "peer-discussion", "reading-module"), and extensions (CoP-stage, SDL-level, discourse-markers). This is the heart of the specification. | HIGH (approach is standard practice) |
| **Offline Event Queue** | Local storage + sync pattern | Handle unreliable connectivity | The specification must define a client-side event queue pattern: events are stored locally (IndexedDB/SQLite on mobile), timestamped at creation, and batch-synced when connectivity returns. The LRS handles deduplication via statement IDs. | HIGH (standard mobile-first pattern) |
| **Aggregation Layer** | Materialized views / pre-computed metrics | Dashboard performance | Raw xAPI statements are too granular for real-time dashboards. The specification should define an aggregation schema: per-student daily/weekly summaries, cohort roll-ups, and metric time-series. This sits between LRS and dashboards. | HIGH (standard architecture) |

---

### Theoretical Measurement Frameworks

These are not "technologies" but they ARE part of the specification stack -- they determine what gets measured and how.

| Framework | Purpose | How It Maps to Analytics | Confidence |
|-----------|---------|--------------------------|------------|
| **Communities of Practice (Wenger, 1998)** | Track student movement from peripheral to full participation | Define measurable indicators for: (1) Legitimate Peripheral Participation -- observing, consuming content, tentative contributions; (2) Increasing participation -- frequency and quality of contributions, peer interaction; (3) Identity development -- adoption of academic discourse, self-identification as community member; (4) Reification -- producing artifacts that embody community knowledge (essays, reflections). Map each to xAPI events. | HIGH (well-established theory) |
| **Self-Directed Learning Readiness (Guglielmino SDLRS / Garrison's model)** | Track autonomy development along scaffolded-to-independent spectrum | Define measurable indicators for: (1) Self-management -- completing tasks without prompting, time management patterns; (2) Self-monitoring -- using feedback, revision behavior, self-assessment accuracy; (3) Motivation -- engagement patterns over time, voluntary beyond-required activity. Map each to xAPI events and derive composite SDL scores. | HIGH (well-established theory) |
| **Academic Literacies Model (Lea & Street, 2006)** | Contextual understanding of literacy as social practice | Informs WHAT literacy means beyond skills -- identity, power, disciplinary conventions. The specification should track not just "did they write correctly" but "did they adopt discipline-specific discourse patterns." This is harder to automate but can be proxied via quiz performance on genre/register recognition, peer feedback quality, and tutor assessments. | HIGH (well-established theory) |
| **SOLO Taxonomy (Biggs & Collis)** | Measure response quality in structured assessments | Map quiz and writing rubric scores to SOLO levels (prestructural through extended abstract). Provides a learning quality dimension beyond completion metrics. The specification should define how tutor-assigned rubric scores feed back into analytics. | MEDIUM (application to automated analytics is limited) |

---

### Visualization and Dashboard Layer

| Technology/Approach | Purpose | Why | Confidence |
|---------------------|---------|-----|------------|
| **Specification defines wireframes + data contracts, not specific visualization libraries** | Keep specification implementation-agnostic | The dev team will choose charting libraries based on their existing app stack (likely React Native / Flutter for mobile). The specification should define: what data each chart shows, what interactions are available, what the data API returns. | HIGH (correct approach for spec project) |
| **Dashboard Data API specification** | Define endpoints the dashboards consume | Specify RESTful endpoints: `/api/analytics/student/{id}/summary`, `/api/analytics/cohort/{id}/trends`, etc. Define request/response schemas. This is more useful to the dev team than picking a charting library. | HIGH |
| **Mobile-first design patterns** | Small-screen dashboard rendering | Specify: (1) Progressive disclosure -- summary card first, tap to expand; (2) Sparklines over full charts on mobile; (3) Traffic-light indicators (red/amber/green) for quick scanning; (4) Swipe-based time navigation; (5) Minimal data transfer (aggregated server-side, not raw data to client). | HIGH (UX pattern, not technology) |
| **Reference: Apache Superset or Metabase** | Tutor/teaching team dashboards (larger screens) | For the staff-facing dashboards that will be used on desktops/tablets, reference open-source BI tools as options. These connect to the aggregation database and provide flexible exploration. Not for student mobile view. | MEDIUM -- verify current versions |

---

### Supporting Standards and Formats

| Standard | Purpose | Why | Confidence |
|----------|---------|-----|------------|
| **JSON-LD** | xAPI profile and statement context | xAPI uses JSON-LD for linked data semantics. The profile specification will be a JSON-LD document. | HIGH |
| **OAuth 2.0 / xAPI Authentication** | LRS authentication | xAPI specifies Basic Auth or OAuth for statement submission. The specification should mandate OAuth 2.0 for production. | HIGH |
| **ISO 8601** | Timestamp format | All events must use ISO 8601 with timezone. Critical for longitudinal tracking across the academic year and for correct ordering of offline-queued events. | HIGH |
| **UUID v4** | Statement identifiers | Each xAPI statement gets a UUID. Essential for offline deduplication -- events generated offline must have IDs assigned at creation time, not at sync time. | HIGH |
| **LTI 1.3 (Learning Tools Interoperability)** | Integration with university LMS | If the academic literacy app needs to exchange data with the university's LMS (Blackboard, Moodle, Canvas), LTI 1.3 is the integration standard. The specification should note LTI launch context as optional enrichment for xAPI statements. | MEDIUM |

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not Alternative |
|----------|-------------|-------------|---------------------|
| Event standard | xAPI 2.0 | IMS Caliper | Smaller ecosystem, less flexible for custom CoP events, convergence toward xAPI |
| Event standard | xAPI 2.0 | Custom JSON events | No interoperability, no tooling ecosystem, harder to maintain |
| LRS | Learning Locker (reference) | Custom database | Reinvents solved problems (querying, aggregation, auth, statement validation) |
| Content tracking | cmi5 (xAPI profile) | SCORM 2004 | SCORM cannot track social learning, discussion, or process-level data |
| CoP framework | Wenger (1998) + indicators | Purely behavioral metrics | Behavioral metrics (clicks, time-on-page) without theoretical framing produce meaningless numbers. CoP theory tells you WHAT to measure. |
| SDL framework | Garrison's model | No SDL tracking | Students are supposed to develop autonomy; without measuring it, you cannot scaffold it or show growth |
| Dashboard approach | Wireframes + data contracts | Specific library recommendation | Specification project should not constrain implementation choices |
| Offline handling | Client-side queue + batch sync | Require connectivity | Violates the mobile-first, unreliable-connectivity constraint. Would lose data. |

---

## Key Specification Artifacts This Stack Produces

The stack choices above imply the specification must include:

1. **xAPI Profile Document** -- JSON-LD file defining all custom verbs, activity types, and extensions for academic literacy tracking
2. **Statement Templates** -- Example xAPI JSON for every trackable event (reading completion, writing submission, quiz attempt, discussion post, reflection entry, etc.)
3. **Aggregation Schema** -- Database schema for pre-computed metrics (daily/weekly student summaries, cohort aggregates, time-series for longitudinal tracking)
4. **Dashboard Data API** -- OpenAPI/Swagger specification for endpoints that serve dashboard data
5. **Offline Sync Protocol** -- Specification for client-side event queuing, conflict resolution, and batch submission
6. **Metric Definitions** -- Mathematical formulas for each composite metric (CoP participation score, SDL readiness index, engagement trajectory, etc.) with pedagogical rationale
7. **Threshold Definitions** -- When to trigger nudges, alerts, and escalations, with evidence basis

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| xAPI as primary standard | MEDIUM | Training data strongly supports this but version 2.0 status needs live verification. xAPI has been the dominant learning analytics standard since ~2013. |
| Caliper deprecation recommendation | LOW | 1EdTech's direction was toward convergence but I could not verify current status. The recommendation to avoid Caliper should be validated. |
| Learning Locker as reference LRS | MEDIUM | Was the leading open-source LRS as of training data, but licensing and maintenance status should be verified. |
| Theoretical frameworks (CoP, SDL) | HIGH | These are established academic theories, not technology products. They do not change rapidly. |
| Offline sync pattern | HIGH | Standard mobile architecture pattern, not dependent on specific technology versions. |
| Dashboard approach (wireframes + API spec) | HIGH | Sound engineering practice for a specification project. |

---

## Verification Needed Before Finalizing Specification

These items could NOT be verified during this research session due to tool limitations:

1. **xAPI 2.0 status** -- Is 2.0 finalized, or is 1.0.3 still the production standard? The specification should target the current stable version.
2. **Learning Locker licensing** -- Is the open-source Community Edition still available and maintained?
3. **1EdTech Caliper status** -- Has Caliper been officially deprecated, merged, or is it still a parallel standard?
4. **cmi5 adoption** -- Is cmi5 widely supported by current LRS implementations?
5. **Emerging standards** -- Are there new learning analytics standards (2024-2026) that this research missed?

---

## Sources

All findings are based on Claude's training data (cutoff May 2025). No live sources were consulted due to tool access limitations. Key knowledge sources from training:

- xAPI specification (adlnet.gov / xapi.com)
- 1EdTech (formerly IMS Global) standards documentation
- Wenger, E. (1998). Communities of Practice: Learning, Meaning, and Identity
- Garrison, D.R. (1997). Self-directed learning: Toward a comprehensive model
- Lea, M.R. & Street, B.V. (2006). The "Academic Literacies" model
- Biggs, J.B. & Collis, K.F. (1982). Evaluating the Quality of Learning: The SOLO Taxonomy
