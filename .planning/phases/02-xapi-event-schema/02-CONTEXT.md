# Phase 2: xAPI Event Schema - Context

**Gathered:** 2026-03-07
**Status:** Ready for planning

<domain>
## Phase Boundary

A complete, standards-based event vocabulary defining exactly what data the system captures for every student interaction. Covers reading, writing, quiz, discussion, navigation, and self-report event types. Produces an xAPI Profile document, statement templates with example payloads, and a writing artifact collection specification. All events reference the Phase 1 DPIA and document pedagogical purpose.

</domain>

<decisions>
## Implementation Decisions

### Event granularity
- Reading events at **page/section level** -- track which sections viewed and time per section
- Quiz events at **both levels** -- attempt-level summary statement with question-level detail nested as sub-statements or extensions
- Discussion events at **post + engagement level** -- one statement per post/reply, plus separate statements for reading others' posts and viewing threads
- Context strategy: **hierarchical** -- session-open statement carries full context (course, module, device type); child statements reference session ID to reduce redundancy

### Writing artifact capture
- Capture drafts on **submit only** -- full text snapshot at each draft submission and final version (not periodic intervals)
- Storage: **inline for short, external reference for long** -- forum posts and short reflections (< 1000 chars) inline in statements; longer writing artifacts (essays, reports) stored externally with URL/ID reference
- Metadata: **structural + assignment context** -- word count, paragraph count, citation count, draft number, time spent, plus assignment type, prompt/topic, and rubric criteria
- Peer review: **yes, as a distinct event type** -- capture reviewer, feedback given, and author's response as separate events (key CoP indicator)

### Activity type coverage
- Navigation events: **yes, include navigation** -- login/logout, page views, resource access, module navigation needed for session frequency and engagement metrics
- Self-report events: **placeholder only** -- reserve verb/activity-type slots for confidence ratings, goal-setting, and reflections; defer detailed schema to Phase 3 when instruments are designed
- Help-seeking: **explicit events** -- define event types for tutor questions, help resource access, extension requests, support center visits
- Multi-module tracking: **yes, built into context** -- every statement includes module/course context to enable cross-context transfer analysis (Phase 5 CoP metric)

### Profile & extension design
- Vocabulary reuse: **maximize reuse** -- use ADL verbs, SCORM profile, cmi5 where possible; only create custom vocabulary where no standard fits the academic literacy domain
- xAPI version: **1.0.3 with 2.0 forward-compatibility** -- design for stable 1.0.3 but follow 2.0 conventions where possible for easier future migration
- SA educational context: **generic extensions** -- use generic education extensions (level, qualification, period) that work across contexts; SA-specific values (NQF, SAQA) in instance data, not baked into schema
- Formality: **formal JSON-LD profile** -- full xAPI Profile spec compliance with IRI namespace, JSON-LD context, machine-readable and publishable
- Validation: **schema-level validation** -- define JSON Schema constraints for each statement template (required extensions, allowed values, type checks)
- Versioning: **semantic versioning in IRI** -- profile IRI includes version (/v1/); breaking changes get new version, backward-compatible changes update minor
- Actor identification: **account-based with pseudonym** -- use xAPI account object with institutional system as homePage and pseudonymous accountName, aligning with Phase 1 DPIA privacy requirements

### Claude's Discretion
- Exact IRI namespace structure and naming conventions
- How question-level quiz data is nested (sub-statements vs. result extensions)
- Compression/efficiency of statement templates
- Mapping strategy for existing ADL/cmi5 verbs to academic literacy activities
- JSON Schema validation strictness levels

</decisions>

<specifics>
## Specific Ideas

- Jisc xAPI recipes (UK learning analytics) as a reference point for educational event modeling patterns
- cmi5 assignable unit patterns where applicable for structured learning content
- Schema must support offline queuing (Phase 3 dependency) -- statements must be self-contained enough to queue and sync later
- Writing artifacts are critical for the academic discourse adoption metric (Phase 5) -- schema should anticipate vocabulary marker and citation pattern analysis needs

</specifics>

<deferred>
## Deferred Ideas

None -- discussion stayed within phase scope

</deferred>

---

*Phase: 02-xapi-event-schema*
*Context gathered: 2026-03-07*
