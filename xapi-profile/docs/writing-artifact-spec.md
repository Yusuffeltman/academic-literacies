# Writing Sample Collection Specification

**Version:** 1.0
**Profile:** Academic Literacies Learning Analytics (`https://w3id.org/xapi/aclit/v1`)
**Status:** Normative
**Related:** [xAPI Profile](../academic-literacies-profile.jsonld) | [DPIA Processing Description](../../governance/dpia/01-processing-description.md)

---

## 1. Purpose and Scope

### 1.1 Purpose

This specification defines how writing artifacts are captured, stored, and made available for academic discourse analysis within the Academic Literacies learning analytics system. It is a dedicated deliverable addressing Success Criterion 3 (writing sample collection for academic discourse analysis) and the DATA-04 processing activity defined in the DPIA.

### 1.2 Scope

All student-authored text submitted through the learning analytics system, including:

- **Writing tasks** -- paragraphs, essays, reflections, reports, summaries, annotated bibliographies (captured via the `writing-submitted` statement template)
- **Forum posts** -- top-level posts and replies (captured via `forum-post-created` and `forum-reply-posted` templates)
- **Peer review feedback** -- review text provided by students (captured via `peer-review-submitted` template)

### 1.3 Key Downstream Consumer

The primary consumer of writing artifact data is the **Phase 5 Communities of Practice (CoP) academic discourse adoption metric**, which analyses writing artifacts to detect:

- Vocabulary markers (academic register, hedging language, discipline-specific terminology)
- Citation patterns (referencing frequency, style, source diversity)
- Argument structure (paragraph organization, logical progression)

This specification defines the data model and capture rules; the actual lexical and structural analysis algorithms are defined in Phase 5.

### 1.4 DPIA Reference

Writing sample collection is documented as processing activity DATA-04 ("Writing Sample Submissions") in the [DPIA Processing Description](../../governance/dpia/01-processing-description.md). That document defines the lawful basis, data subjects, and processing purposes. This specification provides the technical implementation details for that processing activity.

### 1.5 Privacy Constraints

Writing artifacts are **Personal Information** under the Protection of Personal Information Act (POPIA). The following constraints apply:

- **Access control:** Writing artifacts are accessible only to the **student** (author) and their **assigned tutor**. The teaching team has **NO access** to individual writing samples. This is enforced by the access control matrix defined in the DPIA.
- **Pseudonymization:** Writing artifacts are linked to pseudonymous actor identifiers, not real student names.
- **Retention:** Writing artifacts follow the same data lifecycle as xAPI statements -- deleted at the end of the academic year (31 January).
- **No keystroke logging:** Only submitted text is captured. No drafts-in-progress, auto-saves, or keystroke data are collected.

---

## 2. Capture Rules

### 2.1 When: Submit-Only Capture

Writing artifacts are captured **on submit only**. This is a locked design decision.

- No periodic auto-saves are captured
- No keystroke logging or typing behaviour is recorded
- No drafts-in-progress are stored
- Each click of "Submit" generates exactly one xAPI statement with the full submitted text

### 2.2 What: Full Text Snapshot

Each submission captures the **full text** of the artifact at the moment of submission. The system does NOT compute diffs between drafts -- each submission is a complete, self-contained snapshot.

### 2.3 Draft Tracking

Each submission generates a separate xAPI statement with an incrementing `draft-number` extension:

- **Draft 1** -- first submission for a writing task
- **Draft 2** -- first revision (resubmission) for the same task
- **Draft N** -- the Nth submission for the same task

The client is responsible for tracking and incrementing draft numbers per writing task per student.

### 2.4 Forum Posts as Writing Artifacts

Forum post text is captured in the `forum-post-created` and `forum-reply-posted` statements via `result.response`. These are **also writing artifacts** for discourse analysis purposes, but they use the discussion statement templates rather than the `writing-submitted` template.

Forum posts do not carry the full writing metadata set (no draft-number, assignment-type, etc.) because they are spontaneous contributions rather than structured assignments. They do carry `word-count` (recommended) and `thread-depth` (required).

### 2.5 Peer Review Feedback as Writing Artifacts

Feedback text is captured in the `peer-review-submitted` statement via the `feedback-text` result extension. Peer review feedback is a writing artifact for CoP discourse analysis -- it demonstrates a student's ability to engage critically with another's writing using academic language.

---

## 3. Storage Strategy: Inline vs External Reference

### 3.1 Threshold

The inline/external threshold is **1000 characters**. This is a locked design decision from the Phase 2 context document.

### 3.2 Inline Storage (text <= 1000 characters)

For short artifacts (1000 characters or fewer), the full text is stored in the `result.response` field of the xAPI statement.

**Applies to:** forum posts, short reflections, peer review feedback, short paragraphs.

**Advantages:**
- Self-contained statement -- no external dependency
- Works offline without additional artifact storage
- xAPI-compliant: `result.response` is a standard field for capturing learner input

### 3.3 External Reference Storage (text > 1000 characters)

For longer artifacts (more than 1000 characters), the text is stored in an external artifact store. The xAPI statement includes references to the stored artifact:

| Field | Value |
|-------|-------|
| `result.extensions["artifact-url"]` | URL or UUID reference to the stored artifact |
| `result.extensions["artifact-content-type"]` | MIME type (typically `text/plain` or `text/markdown`) |
| `result.response` | **OMITTED** -- not duplicated to avoid bloating the LRS |

**Applies to:** essays, reports, long reflections, annotated bibliographies.

### 3.4 Artifact Store Requirements

These are specification-level requirements. Implementation details (specific storage technology, API design) are deferred to Phase 3.

| Requirement | Description |
|-------------|-------------|
| **Unique ID** | Each artifact has a unique identifier per submission (UUID recommended) |
| **Immutability** | Once stored, an artifact is never modified. A new draft produces a new artifact with a new ID |
| **Access control** | Must enforce the same access rules as the LRS: student + assigned tutor only |
| **Retention** | Follows the same data lifecycle as xAPI statements: deletion at end of academic year (31 January) |
| **Format** | Plain text (`text/plain`) or Markdown (`text/markdown`). No binary formats for writing artifacts |
| **Availability** | Must be accessible from the same network contexts as the LRS (including offline sync scenarios) |

---

## 4. Required Metadata (Writing Extensions)

Every `writing-submitted` statement MUST include the required extensions and SHOULD include the recommended extensions. Conditional extensions are required only when the artifact is stored externally.

| Extension | Obligation | Description | Computed By |
|-----------|-----------|-------------|-------------|
| `word-count` | **Required** | Number of words in submitted text | Client-side at submission time |
| `draft-number` | **Required** | Draft iteration (1, 2, 3, ...) | Client-side, incremented per task |
| `assignment-type` | **Required** | Type of writing task (`paragraph`, `essay`, `reflection`, `report`, `summary`, `annotated-bibliography`) | From assignment configuration |
| `paragraph-count` | Recommended | Number of paragraphs | Client-side at submission time |
| `citation-count` | Recommended | Number of citations/references (heuristic) | Client-side, heuristic detection |
| `time-spent` | Recommended | ISO 8601 duration on task | Client-side timer |
| `prompt-topic` | Recommended | Writing prompt or topic | From assignment configuration |
| `artifact-url` | Conditional | External artifact reference | Generated at storage time (external only) |
| `artifact-content-type` | Conditional | MIME type of external artifact | Set at storage time (external only) |

**Obligation levels:**
- **Required** = MUST be present in every `writing-submitted` statement. Validated by the JSON Schema.
- **Recommended** = SHOULD be present. Absence is tolerated but reduces analysis capability.
- **Conditional** = Required only for external reference artifacts (text > 1000 characters).

All extension IRIs are defined in the [xAPI Profile](../academic-literacies-profile.jsonld) under the `https://w3id.org/xapi/aclit/v1/extensions/` namespace.

---

## 5. Computation Rules for Metadata

### 5.1 Word Count

Split text by whitespace characters, count non-empty tokens.

- Language-agnostic (works for English and code-switched text common in South African academic contexts)
- Exclude empty tokens produced by multiple consecutive whitespace characters
- Example: `"The cat sat on the mat"` = 6 words

### 5.2 Paragraph Count

Count text blocks separated by double newlines (`\n\n`).

- Minimum 1 paragraph for any non-empty text
- Leading and trailing whitespace is trimmed before counting
- A single block of text with no double-newline separators = 1 paragraph
- Example: `"First paragraph.\n\nSecond paragraph."` = 2 paragraphs

### 5.3 Citation Count

Heuristic count. This is an approximation -- precise citation parsing is a Phase 5 concern.

**Detection rules (cumulative):**

1. **Parenthetical references:** Count matches of patterns like `(Author, Year)`, `(Author Year)`, `(Author et al., Year)`, or `(Author & Author, Year)`
2. **Numbered references:** Count matches of patterns like `[1]`, `[12]`, `[1, 3]`
3. **Bibliography entries:** If a "References" or "Bibliography" section heading is detected, count the entries (lines or list items) in that section

The count may under- or over-count. Implementors should document this limitation to students and tutors. Precise citation parsing (style consistency, source diversity, self-citation analysis) is deferred to Phase 5.

### 5.4 Time Spent

Duration from first interaction with the writing task to submission.

- **Start:** Page load or task-open event
- **End:** Submit button click
- **Navigation away:** Timer pauses when the student navigates away from the task; resumes on return
- **Offline:** If the client tracks time locally during offline use, offline duration is included
- **Format:** ISO 8601 duration (e.g., `PT25M`, `PT2H15M`, `PT1H30M45S`)

### 5.5 Draft Number

Sequential integer per writing task per student.

- First submission for a task = `1`
- Each resubmission for the same task increments by 1
- The client is responsible for tracking the draft sequence
- If a student submits, then resubmits for the same task, `draft-number` goes from 1 to 2
- There is no maximum draft number

---

## 6. Offline Considerations

### 6.1 Inline Artifacts (Offline)

Writing submissions captured offline are queued as self-contained xAPI statements with the full text stored in `result.response` (for artifacts <= 1000 characters). These statements are complete and require no external dependency for sync.

### 6.2 External Reference Artifacts (Offline)

For external reference artifacts captured while offline:

1. The artifact text is stored locally on the device
2. The xAPI statement is queued with a **provisional artifact-url** (local reference, e.g., `local://artifact/{uuid}`)
3. On network reconnection:
   - The artifact is uploaded to the external artifact store
   - The permanent artifact-url is obtained
   - The queued statement's `artifact-url` is updated to the permanent URL
   - The statement is then submitted to the LRS

### 6.3 Phase 3 Dependency

Phase 3 (Offline Data Pipeline) will specify the exact queuing mechanism, sync protocol, conflict resolution, and retry logic. This specification defines the **data model requirements** that the offline pipeline must satisfy:

- Offline-queued statements must be structurally identical to online statements once synced
- Artifact immutability must be maintained (no merging of offline edits)
- The provisional-to-permanent URL replacement must happen atomically before LRS submission

---

## 7. Academic Discourse Analysis Support

This section documents how the writing artifact data model supports Phase 5 CoP metrics. The actual analysis algorithms are defined in Phase 5; this section establishes the data contract.

### 7.1 Vocabulary Marker Detection

- **Requires:** Access to the full text (inline via `result.response` or external via `artifact-url`)
- **Structural indicators:** `word-count` and `citation-count` provide quantitative proxies
- **Phase 5 scope:** Detecting academic register, hedging language (e.g., "it could be argued that"), discipline-specific terminology, and code-switching patterns

### 7.2 Citation Pattern Analysis

- **Requires:** `citation-count` for rough indicator; full text for detailed analysis
- **Phase 5 scope:** Style consistency, source diversity, self-citation vs external citation, bibliography completeness

### 7.3 Argument Structure Indicators

- **Requires:** `paragraph-count` as a structural proxy
- **Structural assumption:** More paragraphs may indicate more structured argument development (introduction, body paragraphs, conclusion)
- **Phase 5 scope:** Actual argument analysis (thesis detection, evidence-claim linkage, counterargument handling)

### 7.4 Draft Progression Analysis

The combination of `draft-number`, `word-count`, and `citation-count` across sequential drafts for the same assignment enables trajectory analysis:

- Is the student's writing growing in length across revisions?
- Are citations being added in later drafts?
- Is the structural complexity (paragraph count) increasing?

This trajectory data is a key input for the CoP "movement toward full participation" metric.

### 7.5 Cross-Context Transfer

Writing artifacts from different `assignment-type` values and modules can be compared to detect transfer of academic literacy skills:

- Does a student who demonstrates academic discourse in essays also use it in forum posts?
- Does vocabulary complexity transfer across modules?

The `assignment-type` extension and module context (from the session grouping in `contextActivities`) enable this cross-referencing.

---

## 8. Data Flow Diagram

```
Student writes text
       |
       v
Client computes metadata (word count, paragraph count, citation count)
       |
       v
Text length <= 1000 chars?
      / \
    Yes   No
     |     |
     v     v
  Inline  Store in artifact store
  in      Get artifact-url
  result. |
  response|
     \   /
      \ /
       v
Build xAPI statement (writing-submitted template)
  - Include required extensions (word-count, draft-number, assignment-type)
  - Include recommended extensions where available
  - Include artifact-url + artifact-content-type if external
       |
       v
Online?
      / \
    Yes   No
     |     |
     v     v
  Submit  Queue locally
  to LRS  (sync when online)
```

---

## 9. Profile Cross-References

| This Spec Section | Profile Element | Profile ID |
|-------------------|-----------------|------------|
| Capture Rules (Section 2) | `writing-submitted` template | `https://w3id.org/xapi/aclit/v1/templates/writing-submitted` |
| Forum Posts (Section 2.4) | `forum-post-created` template | `https://w3id.org/xapi/aclit/v1/templates/forum-post-created` |
| Forum Posts (Section 2.4) | `forum-reply-posted` template | `https://w3id.org/xapi/aclit/v1/templates/forum-reply-posted` |
| Peer Review (Section 2.5) | `peer-review-submitted` template | `https://w3id.org/xapi/aclit/v1/templates/peer-review-submitted` |
| Metadata (Section 4) | `word-count` extension | `https://w3id.org/xapi/aclit/v1/extensions/word-count` |
| Metadata (Section 4) | `draft-number` extension | `https://w3id.org/xapi/aclit/v1/extensions/draft-number` |
| Metadata (Section 4) | `assignment-type` extension | `https://w3id.org/xapi/aclit/v1/extensions/assignment-type` |
| Metadata (Section 4) | `paragraph-count` extension | `https://w3id.org/xapi/aclit/v1/extensions/paragraph-count` |
| Metadata (Section 4) | `citation-count` extension | `https://w3id.org/xapi/aclit/v1/extensions/citation-count` |
| Metadata (Section 4) | `time-spent` extension | `https://w3id.org/xapi/aclit/v1/extensions/time-spent` |
| Metadata (Section 4) | `prompt-topic` extension | `https://w3id.org/xapi/aclit/v1/extensions/prompt-topic` |
| External Storage (Section 3.3) | `artifact-url` extension | `https://w3id.org/xapi/aclit/v1/extensions/artifact-url` |
| External Storage (Section 3.3) | `artifact-content-type` extension | `https://w3id.org/xapi/aclit/v1/extensions/artifact-content-type` |
| Peer Review (Section 2.5) | `feedback-text` extension | `https://w3id.org/xapi/aclit/v1/extensions/feedback-text` |
