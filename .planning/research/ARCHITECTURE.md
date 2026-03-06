# Architecture Patterns

**Domain:** Learning analytics for academic literacy (mobile-first, specification project)
**Researched:** 2026-03-06
**Primary source basis:** Training data (learning analytics reference architectures: Chatti et al. 2012 LA reference model, Siemens 2013 LA model, SoLAR/IMS Caliper framework patterns, xAPI ecosystem patterns). WebSearch/WebFetch/Context7 were unavailable during this research session.
**Confidence:** MEDIUM -- well-established architectural patterns in a mature field, but not verified against current (2026) sources.

---

## Recommended Architecture

### Overview: Five-Layer Event-Driven Architecture

Learning analytics systems follow a well-established layered architecture. For this project -- a specification blueprint for a mobile-first academic literacy app -- the architecture has five logical layers plus two cross-cutting concerns:

```
+------------------------------------------------------------------+
|                    CROSS-CUTTING: PRIVACY & CONSENT               |
+------------------------------------------------------------------+
|                                                                    |
|  Layer 5: PRESENTATION (Dashboards & Interventions)               |
|  +-------------------+  +------------------+  +-----------------+ |
|  | Student            |  | Tutor            |  | Teaching Team   | |
|  | Self-Reflection    |  | Consultation     |  | Cohort          | |
|  | Dashboard          |  | Dashboard        |  | Dashboard       | |
|  +-------------------+  +------------------+  +-----------------+ |
|                                                                    |
|  Layer 4: ANALYSIS ENGINE (Metric Computation)                    |
|  +-------------------+  +------------------+  +-----------------+ |
|  | Real-time          |  | Batch/Scheduled  |  | Longitudinal    | |
|  | Indicators         |  | Aggregations     |  | Trend Analysis  | |
|  +-------------------+  +------------------+  +-----------------+ |
|                                                                    |
|  Layer 3: STORAGE (Event Store + Computed Metrics)                |
|  +-------------------+  +------------------+  +-----------------+ |
|  | Raw Event          |  | Computed         |  | Dashboard       | |
|  | Store              |  | Metric Store     |  | Cache           | |
|  +-------------------+  +------------------+  +-----------------+ |
|                                                                    |
|  Layer 2: PROCESSING PIPELINE (Validation & Enrichment)           |
|  +-------------------+  +------------------+  +-----------------+ |
|  | Event              |  | Enrichment       |  | Sync            | |
|  | Validation         |  | (context, time)  |  | Reconciliation  | |
|  +-------------------+  +------------------+  +-----------------+ |
|                                                                    |
|  Layer 1: DATA COLLECTION (Instrumentation)                       |
|  +-------------------+  +------------------+  +-----------------+ |
|  | In-App Event       |  | Offline          |  | Session         | |
|  | Capture            |  | Queue            |  | Tracking        | |
|  +-------------------+  +------------------+  +-----------------+ |
|                                                                    |
+------------------------------------------------------------------+
|                    CROSS-CUTTING: OFFLINE SYNC                     |
+------------------------------------------------------------------+
```

This follows the standard learning analytics pipeline: **Collect -> Process -> Store -> Analyse -> Present**, with intervention feedback loops closing the cycle.

---

## Component Boundaries

### Layer 1: Data Collection (Instrumentation Layer)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Event Capture SDK | Intercepts user interactions in the app and converts them to structured events | Offline Queue, Processing Pipeline (when online) |
| Offline Event Queue | Stores events locally on device when connectivity is unavailable; manages retry and sync | Event Capture SDK, Sync Reconciliation |
| Session Tracker | Manages session boundaries (start, heartbeat, end); calculates time-on-task | Event Capture SDK |

**Boundary principle:** The collection layer is embedded in the mobile app. It knows about user actions but knows nothing about metrics or dashboards. It produces raw, timestamped, structured events and nothing more.

**Key design decisions for this project:**
- Events follow a standard schema: `{actor, verb, object, context, timestamp, session_id}`
- This aligns with xAPI (Experience API / Tin Can) statement structure, which is the dominant standard for learning event data
- The offline queue is critical: students on unreliable connectivity must never lose interaction data
- Events are immutable once created -- corrections happen in the processing layer, not by modifying raw events

**What gets captured (mapped to app activities):**

| Activity | Events Generated |
|----------|-----------------|
| Reading modules | `opened`, `scrolled`, `time_spent`, `completed`, `highlighted`, `revisited` |
| Writing tasks | `started`, `draft_saved`, `word_count_changed`, `submitted`, `revised_after_feedback` |
| Quizzes | `started`, `answered` (per question), `completed`, `score`, `time_per_question` |
| Discussion forums | `viewed_thread`, `posted`, `replied`, `quote_used`, `academic_term_used` |
| General | `session_start`, `session_end`, `navigation`, `help_accessed`, `notification_tapped` |

### Layer 2: Processing Pipeline (Validation and Enrichment)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Event Validator | Checks event schema conformance, rejects malformed events, deduplicates | Event Capture SDK (input), Enrichment (output) |
| Event Enricher | Adds contextual metadata: academic week number, module progression position, cohort membership, activity category | Validator (input), Raw Event Store (output) |
| Sync Reconciliation | Handles late-arriving offline events; resolves ordering conflicts; merges device-local and server event streams | Offline Queue (input), Event Store (output) |

**Boundary principle:** The processing layer normalises and enriches raw events but does not compute metrics. It guarantees that everything entering the Event Store is valid, contextualised, and deduplicated.

**Critical for this project:**
- Sync Reconciliation is architecturally complex because offline events arrive late and out of order. The specification must define conflict resolution rules (e.g., server-timestamp vs. device-timestamp, duplicate detection windows).
- Enrichment must stamp each event with the academic calendar context (week of semester, assessment period, etc.) because longitudinal analysis depends on temporal context.

### Layer 3: Storage Layer

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Raw Event Store | Append-only store of all validated, enriched events; source of truth | Processing Pipeline (writes), Analysis Engine (reads) |
| Computed Metric Store | Stores pre-calculated metrics, aggregations, and indicator values | Analysis Engine (writes), Dashboards (reads) |
| Dashboard Cache | Stores pre-rendered or pre-computed dashboard state for fast mobile delivery | Computed Metric Store (source), Dashboards (reads) |

**Boundary principle:** Storage is split into raw events (immutable, complete history) and computed metrics (derived, regenerable from raw events). This separation is fundamental -- it means metric definitions can change without losing data.

**Key design decisions:**
- Raw events are immutable and append-only. This is non-negotiable for audit, research ethics, and metric recalculation.
- Computed metrics are regenerable. If the formula for "reading engagement" changes mid-year, all historical values can be recomputed from raw events.
- Dashboard Cache exists because mobile devices on slow connections cannot wait for real-time metric computation. Pre-compute and serve.

### Layer 4: Analysis Engine (Metric Computation)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Real-time Indicators | Computes immediate/near-real-time metrics triggered by incoming events (e.g., streak broken, quiz failed) | Raw Event Store (reads), Computed Metric Store (writes), Intervention Engine (triggers) |
| Batch Aggregator | Scheduled computation of aggregate metrics (daily, weekly): engagement scores, progress percentages, cohort averages | Raw Event Store (reads), Computed Metric Store (writes) |
| Longitudinal Analyser | Computes trend-over-time metrics: trajectory analysis, development curves, semester comparisons | Computed Metric Store (reads historical), Computed Metric Store (writes trends) |

**Boundary principle:** The analysis engine reads from storage and writes computed values back to storage. It contains all metric logic -- formulas, thresholds, classification rules. Dashboards never compute metrics; they only display pre-computed values.

**Three computation cadences are essential:**

| Cadence | Purpose | Examples |
|---------|---------|---------|
| Real-time (event-driven) | Immediate feedback, nudges | "You haven't opened the app in 3 days", quiz failure alert |
| Batch (scheduled, e.g., nightly) | Summary metrics, comparisons | Weekly engagement score, cohort percentile, progress percentage |
| Longitudinal (weekly/monthly) | Development trajectories | CoP participation trajectory, autonomy growth curve, semester comparison |

**CoP and SDL-specific analysis components:**

| Analysis Component | What It Computes | Theoretical Basis |
|--------------------|------------------|-------------------|
| Participation Trajectory | Movement from peripheral to fuller participation | Wenger's CoP: legitimate peripheral participation |
| Discourse Development | Academic vocabulary adoption, citation practices in writing | CoP: adopting community discourse norms |
| Self-regulation Index | Planning behaviour, self-monitoring, help-seeking patterns | SDL: metacognitive awareness |
| Scaffolding Position | Where student sits on guided-to-independent spectrum | SDL: scaffolded autonomy |
| Peer Engagement Quality | Discussion depth, reciprocity, knowledge building vs. social chat | CoP: mutual engagement |

### Layer 5: Presentation Layer (Dashboards and Interventions)

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| Student Self-Reflection Dashboard | Shows personal progress, development trajectory, self-assessment prompts, nudges | Dashboard Cache (reads), Intervention Engine (receives nudges) |
| Tutor Consultation Dashboard | Shows individual student evidence, comparison to cohort, flagged concerns, learning plan integration | Dashboard Cache (reads), Alert system (receives flags) |
| Teaching Team Cohort Dashboard | Shows cohort-level patterns, distribution analysis, systemic issues, intervention effectiveness | Dashboard Cache (reads) |
| Intervention Engine | Generates automated nudges, staff alerts, and escalation triggers based on metric thresholds | Real-time Indicators (triggers), Computed Metric Store (reads thresholds), Student Dashboard (delivers nudges), Tutor Dashboard (delivers alerts) |

**Boundary principle:** Presentation components are view-only consumers of pre-computed data. They never query raw events directly. The intervention engine is a separate component that acts on analysis results -- it is not part of the dashboards themselves.

**Three audiences, one data pipeline, different views:**

```
Same raw events
  |
Same processing pipeline
  |
Same event store
  |
  +-- Student metrics -----> Student Dashboard (self-reflection)
  |
  +-- Individual metrics ---> Tutor Dashboard (consultation evidence)
  |
  +-- Aggregated metrics ---> Team Dashboard (cohort patterns)
  |
  +-- Threshold triggers ---> Intervention Engine (nudges + alerts)
```

The three dashboards share the same underlying data and many of the same computed metrics. The difference is:
- **Student view:** "My" data, trends, self-assessment, personal trajectory
- **Tutor view:** "This student's" data in context of cohort, with flags and learning plan hooks
- **Team view:** Cohort distributions, patterns, systemic trends, aggregate effectiveness

---

## Cross-Cutting Concerns

### Offline Sync Architecture

This is the most architecturally significant constraint for this project. Students use smartphones with unreliable connectivity.

**Pattern: Local-First Event Sourcing**

```
[Student Phone]                          [Server]
+------------------+                     +------------------+
| App Activity     |                     |                  |
|   |              |                     |                  |
|   v              |                     |                  |
| Event Capture    |                     |                  |
|   |              |                     |                  |
|   v              |                     |                  |
| Local Event      |   -- sync when -->  | Processing       |
| Queue (SQLite    |      online         | Pipeline         |
| or IndexedDB)   |                     |                  |
|   |              |   <-- dashboard --  |                  |
|   v              |      data           |                  |
| Local Dashboard  |                     |                  |
| State Cache      |                     |                  |
+------------------+                     +------------------+
```

**Key architectural decisions for offline:**

1. **Events are always written locally first.** The device is the primary write target. Server sync is secondary and asynchronous.
2. **Local queue uses monotonic sequence numbers.** Each device maintains its own sequence to detect gaps and ensure completeness during sync.
3. **Sync is idempotent.** Events carry a unique ID (UUID); the server deduplicates on ID, so retrying sync is always safe.
4. **Dashboard data is cached locally.** When offline, the student sees their last-synced dashboard state. A "last updated" timestamp makes staleness visible.
5. **Batch sync, not real-time streaming.** When connectivity returns, events sync in batches (most recent first for priority, then backfill). This is more reliable than maintaining a persistent connection.
6. **Conflict resolution:** Device-generated timestamps are preserved alongside server-received timestamps. Analysis uses device timestamps for accuracy (time-on-task) but server timestamps for ordering when device clocks are unreliable.

### Privacy and Consent Architecture

Learning analytics has specific ethical requirements (data ownership, consent, transparency).

| Component | Responsibility |
|-----------|---------------|
| Consent Manager | Tracks student consent status; gates data collection on/off per consent level |
| Data Scope Controller | Ensures dashboard audiences see only permitted data (students see own; tutors see assigned students; teams see aggregate) |
| Audit Log | Records all data access events for compliance |
| Data Retention Policy | Enforces retention windows; anonymisation/deletion after specified periods |

**Access control matrix:**

| Data Type | Student | Tutor | Teaching Team |
|-----------|---------|-------|---------------|
| Own raw events | Read | No | No |
| Own computed metrics | Read | Read (assigned students) | Aggregate only |
| Individual trajectory | Read (own) | Read (assigned) | No |
| Cohort aggregates | Limited (percentile position) | Read | Read |
| Intervention history | Read (own nudges) | Read (assigned) | Read (aggregate) |

---

## Data Flow: Student Interaction to Educator Insight

The complete flow from a single student action to appearing on all three dashboards:

### Step-by-step example: Student submits a writing task

```
1. CAPTURE: Student taps "Submit" on a writing task
   -> Event Capture SDK creates event:
      {actor: student_123, verb: "submitted", object: writing_task_42,
       context: {module: "academic_writing", week: 6, word_count: 487,
       draft_number: 2, time_spent_seconds: 2340},
       timestamp: "2026-04-15T14:23:00Z", session: "sess_abc"}

2. QUEUE: Event written to local SQLite queue
   -> Assigned local sequence number: 847
   -> Marked as unsynced

3. SYNC: Device has connectivity
   -> Batch of queued events (including this one) sent to server
   -> Server acknowledges receipt; local queue marks as synced

4. VALIDATE: Processing pipeline receives event
   -> Schema check: passes
   -> Dedup check: no duplicate UUID found
   -> Enrichment: adds {academic_week: 6, semester: 1, cohort: "ENG101-A",
      tutor: "tutor_456", activity_category: "writing",
      is_revision: true (draft_number > 1)}

5. STORE: Enriched event appended to Raw Event Store

6. ANALYSE (Real-time): Event triggers immediate checks
   -> "Student revised before submitting" -> increment revision_count metric
   -> "Word count 487 on draft 2 (was 312 on draft 1)" -> writing_development signal
   -> Check: is this student flagged for low writing engagement? If yes, clear flag.

7. ANALYSE (Batch, runs nightly):
   -> Recalculate student_123's weekly writing engagement score
   -> Update cohort writing submission distribution
   -> Compare student_123's revision behaviour to cohort average
   -> Update CoP discourse indicators (if NLP analysis of text is in scope)
   -> Recalculate scaffolding position: student revised independently (no prompt) -> shift toward "self-directed"

8. ANALYSE (Longitudinal, runs weekly):
   -> Update student_123's writing development trajectory (weeks 1-6)
   -> Detect trend: "improving" / "plateau" / "declining"
   -> Update semester-level participation curve

9. PRESENT: Dashboards read from Computed Metric Store / Dashboard Cache

   Student Dashboard shows:
   - "You submitted your writing task (draft 2). Your revision improved word count by 56%."
   - Writing development trajectory graph (6 weeks)
   - Self-reflection prompt: "What did you change in your revision?"

   Tutor Dashboard shows:
   - Student_123 submitted writing_task_42 (revised, improved)
   - Student_123 is at 65th percentile for writing engagement in cohort
   - No current flags for this student
   - Scaffolding indicator: "Moving toward independent" (revised without prompt)

   Teaching Team Dashboard shows:
   - 78% of cohort ENG101-A has submitted writing_task_42
   - Revision rate: 34% of submissions are revisions (up from 22% last month)
   - Cohort writing engagement distribution (histogram)

10. INTERVENE (if triggered):
    -> For students who HAVEN'T submitted after 5 days: automated nudge
    -> For students whose trajectory shows "declining": tutor alert
    -> For cohort with < 50% submission rate: teaching team notification
```

---

## Patterns to Follow

### Pattern 1: Event Sourcing (Append-Only Event Log)

**What:** All student interactions are stored as immutable events. Current state is derived by replaying events, never by mutating a "current state" record.

**When:** Always -- this is foundational for learning analytics.

**Why for this project:**
- Metric definitions evolve. When the team refines what "engagement" means in week 8, they can recompute from week 1 without data loss.
- Research ethics require auditability. Every data point can be traced to its source event.
- Longitudinal analysis needs the full history, not just current state.

### Pattern 2: CQRS (Command Query Responsibility Segregation)

**What:** Separate the write path (event ingestion) from the read path (dashboard queries). Events are written to the event store; dashboards read from pre-computed metric views.

**When:** When write volume is high and read patterns differ from write patterns (exactly this project's situation).

**Why for this project:**
- Events arrive continuously from hundreds of students. Dashboard queries need aggregated, pre-computed views.
- Mobile dashboards need fast reads from cached/pre-computed data, not real-time queries against the event store.
- Three different dashboard audiences need three different "read models" from the same underlying data.

### Pattern 3: Offline-First with Sync

**What:** The mobile app treats the device as primary storage, syncing to the server when connectivity allows.

**When:** Users have unreliable connectivity (exactly this project's mobile-first constraint).

**Why for this project:**
- Students must not lose interaction data due to network issues.
- Dashboard must show something useful even when offline (cached last-known state).

### Pattern 4: Metric Layering (Raw -> Computed -> Composite)

**What:** Build metrics in layers: raw events become base metrics, base metrics combine into composite indicators, composite indicators form trajectories.

```
Raw Events:
  quiz_answered, time_spent, score
       |
Base Metrics (direct from events):
  quiz_accuracy (%), avg_time_per_question, attempt_count
       |
Composite Indicators (combining base metrics):
  "Formative Assessment Engagement" = f(accuracy_trend, attempt_frequency, time_investment)
       |
Trajectory (composite over time):
  "Assessment Development Curve" = engagement_indicator plotted over academic weeks
```

**Why for this project:**
- CoP and SDL indicators are inherently composite -- "participation trajectory" combines forum posts, reading completion, writing submissions, and peer interaction.
- Layering makes the specification tractable. Define base metrics first, then compose them.

---

## Anti-Patterns to Avoid

### Anti-Pattern 1: Dashboard-Driven Data Collection

**What:** Designing data collection around what the dashboard wants to show, rather than capturing comprehensive interaction events.

**Why bad:** Locks in dashboard design decisions at the instrumentation level. When dashboard requirements change (and they will), you lack the raw data to support new views.

**Instead:** Capture comprehensive, granular events. Let the analysis layer decide what to compute. Over-capture at the event level; be selective at the metric level.

### Anti-Pattern 2: Real-Time Everything

**What:** Computing all metrics in real-time as events arrive.

**Why bad:** Computationally expensive, unnecessary for most learning analytics (educators don't need sub-second updates), and creates fragile architectures where a computation failure affects event ingestion.

**Instead:** Use three cadences (real-time for nudges, batch for summaries, longitudinal for trends). Only nudge-triggering metrics need real-time computation.

### Anti-Pattern 3: Mutable Student State Records

**What:** Maintaining a single "student_progress" record that gets updated with each interaction.

**Why bad:** Loses history. Cannot recompute metrics retroactively. Cannot do longitudinal analysis. Cannot audit data.

**Instead:** Event sourcing. Append-only event log. Derive current state from event replay.

### Anti-Pattern 4: Monolithic Metric Definitions

**What:** Defining complex metrics as single formulas that directly query raw events.

**Why bad:** Unreadable, untestable, and fragile. When one sub-component of "CoP Participation" changes, the entire metric breaks.

**Instead:** Metric layering. Base metrics -> composite indicators -> trajectories. Each layer is independently testable and documentable.

### Anti-Pattern 5: Direct Device-to-Dashboard Pipeline

**What:** Having the mobile app directly compute and display analytics from local data.

**Why bad:** Inconsistent metrics across devices, no cohort comparison possible, no tutor/team views, no centralised intervention logic.

**Instead:** Device collects and queues events. Server processes, analyses, computes. Pre-computed dashboard state syncs back to device for display.

---

## Scalability Considerations

Since this is a specification project for a university app, "scale" is bounded but worth considering.

| Concern | 100 students | 1,000 students | 10,000 students |
|---------|-------------|----------------|-----------------|
| Event volume | ~10K events/day | ~100K events/day | ~1M events/day |
| Event store size | ~50MB/semester | ~500MB/semester | ~5GB/semester |
| Batch computation | Seconds | Minutes | Needs queuing/parallelism |
| Dashboard cache | Trivial | Manageable | Needs cache strategy |
| Sync traffic | Negligible | Moderate | Needs rate limiting |

For a first-year cohort at a single institution, expect 200-2,000 students. The architecture handles this comfortably without exotic infrastructure. The specification should note scaling boundaries but not over-engineer.

---

## Build Order Implications

The layered architecture creates clear build-order dependencies. **You cannot build higher layers without lower layers in place.**

### Recommended Build Sequence

```
Phase 1: Foundation (must come first)
  -> Event schema specification (what events exist, their structure)
  -> Storage model (how events are stored)
  -> Privacy/consent framework (gates everything else)

Phase 2: Collection Layer
  -> Event capture specification (how events are generated in the app)
  -> Offline queue specification (how events are stored on device)
  -> Sync protocol specification (how events reach the server)

Phase 3: Processing + Base Metrics
  -> Validation rules
  -> Enrichment rules
  -> Sync reconciliation rules
  -> Base metric definitions (direct derivations from events)

Phase 4: Analysis Engine
  -> Composite indicator definitions (combining base metrics)
  -> Threshold definitions (what triggers nudges/alerts)
  -> Longitudinal trend computation rules

Phase 5: Presentation + Intervention
  -> Student dashboard specification
  -> Tutor dashboard specification
  -> Teaching team dashboard specification
  -> Intervention/nudge logic and escalation paths
```

**Why this order:**
- You cannot define metrics without knowing what events exist (Phase 1 before Phase 3)
- You cannot design dashboards without knowing what metrics are available (Phase 4 before Phase 5)
- You cannot specify offline sync without knowing the event schema (Phase 1 before Phase 2)
- Privacy/consent must be specified first because it constrains everything else
- The intervention engine depends on both the analysis engine (triggers) and the presentation layer (delivery)

---

## How the Three Audience Views Relate Architecturally

The three dashboards are not three separate systems. They are three views of one data pipeline:

```
                    Shared Infrastructure
                    =====================
Raw Events  -->  Processing  -->  Event Store  -->  Analysis Engine
                                                         |
                                    +--------------------+--------------------+
                                    |                    |                    |
                              Individual             Individual           Cohort
                              Metrics                Metrics +            Aggregations
                              (own data)             Cohort Context
                                    |                    |                    |
                              Student              Tutor                Teaching Team
                              Dashboard            Dashboard            Dashboard
                                    |                    |                    |
                              Self-reflection      Consultation          Systemic
                              + Nudges             Evidence +            Decisions +
                                                   Learning Plans        Effectiveness
```

**Architectural implications:**
1. **Same metric, different presentation.** A student's "writing engagement score" appears on all three dashboards, but contextualised differently: the student sees their trajectory, the tutor sees it relative to cohort, the team sees the distribution.
2. **Access control is a cross-cutting concern.** The data pipeline is shared; what varies is who can see what. This is enforced at the Dashboard Cache / API layer, not in the storage or analysis layers.
3. **Intervention engine spans audiences.** A nudge to a student and an alert to a tutor may be triggered by the same metric threshold. The engine decides what goes where.

---

## Sources and Confidence

| Claim | Source | Confidence |
|-------|--------|------------|
| Five-layer architecture pattern | Training data: Chatti et al. (2012) LA reference model, Siemens (2013) | MEDIUM -- well-established pattern, not verified against 2026 sources |
| xAPI event structure as standard | Training data: ADL xAPI specification, widely adopted | MEDIUM -- dominant standard as of training cutoff, likely still current |
| Event sourcing for LA | Training data: standard practice in LA literature and systems | MEDIUM |
| CQRS pattern applicability | Training data: general software architecture, applied to LA context | MEDIUM |
| Offline-first architecture patterns | Training data: standard mobile-first patterns (local-first, sync protocols) | MEDIUM |
| Three-cadence computation model | Training data: common LA system design | MEDIUM |
| Build order dependencies | Derived from architectural analysis | HIGH -- logically follows from layer dependencies |
| Scalability estimates | Training data: estimates based on typical university event volumes | LOW -- not verified with current benchmarks |

**Gaps needing validation:**
- Current state of xAPI vs IMS Caliper vs proprietary event formats in 2026
- Whether newer architectural patterns (e.g., edge computing for mobile LA) have emerged
- Specific technology recommendations for implementing this architecture (covered in STACK.md)
- Privacy regulation specifics (POPIA in South Africa, GDPR if applicable) -- not researched here
