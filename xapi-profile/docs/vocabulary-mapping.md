# Vocabulary Mapping: Academic Literacies xAPI Profile

**Profile:** Academic Literacies Learning Analytics Profile v1
**Profile IRI:** `https://w3id.org/xapi/aclit`
**Version:** `https://w3id.org/xapi/aclit/v1`
**Date:** 2026-03-07

---

## 1. Introduction

This document maps every vocabulary term used in the Academic Literacies xAPI Profile to its authoritative source. It serves as the provenance record for the profile's vocabulary, enabling implementors to verify that terms are used correctly and trace their definitions to source specifications.

**Design principle:** Maximize reuse of existing standard vocabularies. Define custom vocabulary only when no existing term captures the required semantics. The result: zero custom verbs, seven reused standard activity types, nine custom activity types, and fifteen custom extensions.

---

## 2. Verbs Used (All Reused -- Zero Custom)

All verbs in the profile are reused from established xAPI vocabularies. No custom verbs are defined.

| Verb Display Name | Verb IRI | Source Vocabulary | Used For |
|---|---|---|---|
| logged in | `https://brindlewaye.com/xAPITerms/verbs/loggedin` | Jisc / Brindlewaye | Session open |
| logged out | `https://brindlewaye.com/xAPITerms/verbs/loggedout` | Jisc / Brindlewaye | Session close |
| viewed | `http://id.tincanapi.com/verb/viewed` | TinCan | Page/resource viewed, reading section viewed, discussion thread viewed, help resource accessed |
| experienced | `http://adlnet.gov/expapi/verbs/experienced` | ADL | Module navigation |
| completed | `http://adlnet.gov/expapi/verbs/completed` | ADL | Reading section completed, quiz completed, module completed |
| attempted | `http://adlnet.gov/expapi/verbs/attempted` | ADL | Quiz attempted |
| passed | `http://adlnet.gov/expapi/verbs/passed` | ADL | Quiz passed |
| failed | `http://adlnet.gov/expapi/verbs/failed` | ADL | Quiz failed |
| answered | `http://adlnet.gov/expapi/verbs/answered` | ADL | Question answered |
| created | `http://activitystrea.ms/schema/1.0/create` | Activity Streams | Forum post created |
| commented | `http://adlnet.gov/expapi/verbs/commented` | ADL | Forum reply posted |
| submitted | `http://activitystrea.ms/schema/1.0/submit` | Activity Streams | Writing submitted, peer review submitted, self-report submitted |
| asked | `http://adlnet.gov/expapi/verbs/asked` | ADL | Help requested, extension requested |
| progressed | `http://adlnet.gov/expapi/verbs/progressed` | ADL | Course progressed |

**Total: 14 verbs, all reused from standard vocabularies.**

---

## 3. Activity Types -- Reused from Standard Vocabularies

These activity types are defined by external vocabularies and used as-is in the profile.

| Type Name | Type IRI | Source | Used For |
|---|---|---|---|
| Course | `http://adlnet.gov/expapi/activities/course` | ADL | Course context (contextActivities.grouping) |
| Module | `http://adlnet.gov/expapi/activities/module` | ADL | Module context, module navigation, module completed |
| Assessment | `http://adlnet.gov/expapi/activities/assessment` | ADL | Quiz attempt (attempted, completed, passed, failed) |
| CMI Interaction | `http://adlnet.gov/expapi/activities/cmi.interaction` | ADL / SCORM | Quiz question (answered) |
| Page | `http://activitystrea.ms/schema/1.0/page` | Activity Streams | Page/resource viewed |
| Note | `http://activitystrea.ms/schema/1.0/note` | Activity Streams | Forum post (new thread) |
| Comment | `http://activitystrea.ms/schema/1.0/comment` | Activity Streams | Forum reply |

**Total: 7 standard activity types reused.**

---

## 4. Activity Types -- Custom (Academic Literacies Profile)

These activity types are defined in the profile namespace because no existing standard type captures the required semantics.

| Type Name | Type IRI | Rationale |
|---|---|---|
| Learning Session | `https://w3id.org/xapi/aclit/v1/activity-types/session` | Session-scoped context container for the hierarchical context pattern. No standard type represents a login-to-logout session that carries device/connection metadata for child statements. |
| Reading Section | `https://w3id.org/xapi/aclit/v1/activity-types/reading-section` | Section-level granularity within a module. ADL `lesson` is the closest but represents a broader instructional unit; reading sections are sub-lesson content chunks for tracking reading progress. |
| Writing Task | `https://w3id.org/xapi/aclit/v1/activity-types/writing-task` | Writing assignments with discourse metadata (word count, citations, drafts). Activity Streams `article` is closest but does not convey the assignment/submission semantics or the iterative draft model. |
| Discussion Thread | `https://w3id.org/xapi/aclit/v1/activity-types/discussion-thread` | Forum thread as a parent container for posts and replies. TinCan `forum-topic` is similar but the profile needs a thread-level type distinct from individual posts (`note`/`comment`). |
| Peer Review | `https://w3id.org/xapi/aclit/v1/activity-types/peer-review` | No standard type exists for peer review activities. This captures the specific act of one student reviewing another's writing, a key Communities of Practice indicator. |
| Help Request | `https://w3id.org/xapi/aclit/v1/activity-types/help-request` | No standard type for help-seeking requests. Distinct from viewing a resource (which uses `help-resource`); this represents an active request directed at a person or service. |
| Help Resource | `https://w3id.org/xapi/aclit/v1/activity-types/help-resource` | Help/support resources (FAQs, writing guides, tutorials). ADL `media` is too generic; this type signals that the resource was accessed in a help-seeking context, enabling help-seeking pattern analysis. |
| Extension Request | `https://w3id.org/xapi/aclit/v1/activity-types/extension-request` | No standard type for deadline extension requests. Tracked separately from general help requests because extension requests are a distinct self-regulation indicator. |
| Self-Report Instrument | `https://w3id.org/xapi/aclit/v1/activity-types/self-report` | Placeholder for self-report questionnaires (confidence, goals, strategies). ADL `question` is closest but represents a single question; this represents a complete instrument. Detailed schema deferred to Phase 3. |

**Total: 9 custom activity types.**

---

## 5. Extensions -- Custom (Academic Literacies Profile)

All extensions are defined under the namespace `https://w3id.org/xapi/aclit/v1/extensions/`. Each has an `inlineSchema` JSON Schema for validation.

| Extension Name | Extension IRI | Type | Rationale |
|---|---|---|---|
| Device Type | `.../extensions/device-type` | Context | Equity normalization: interpret interaction patterns relative to device constraints (smartphone vs desktop). No standard extension exists. |
| Connection Type | `.../extensions/connection-type` | Context | Equity normalization: students on mobile data or offline should not be penalized. No standard extension exists. |
| Help Type | `.../extensions/help-type` | Context | Categorizes help-seeking behavior (tutor, support center, peer, self-help). Enables distinction between strategic and dependent help-seeking. |
| Word Count | `.../extensions/word-count` | Result | Writing quantity metric. Standard result fields do not capture word count; needed for longitudinal writing development tracking. |
| Paragraph Count | `.../extensions/paragraph-count` | Result | Writing structure metric. Tracks paragraph organization as an indicator of discourse competency development. |
| Citation Count | `.../extensions/citation-count` | Result | Academic referencing practice indicator. Tracks citation usage across draft iterations and assignment types. |
| Draft Number | `.../extensions/draft-number` | Result | Revision iteration counter. Tracks writing process engagement through draft progression. |
| Assignment Type | `.../extensions/assignment-type` | Result | Writing task categorization. Different assignment types require different discourse competencies and are weighted differently in metrics. |
| Time Spent | `.../extensions/time-spent` | Result | ISO 8601 duration for time-on-task. Supplements standard result.duration for independently measured time. |
| Artifact URL | `.../extensions/artifact-url` | Result | External storage reference for writing artifacts exceeding 1000 characters. Keeps statement size manageable. |
| Artifact Content Type | `.../extensions/artifact-content-type` | Result | MIME type of externally stored artifact. Paired with artifact-url. |
| Prompt Topic | `.../extensions/prompt-topic` | Result | Writing prompt identifier. Enables cohort-level analysis of responses to the same prompt. |
| Thread Depth | `.../extensions/thread-depth` | Result | Forum reply nesting depth. Higher depth indicates more engaged discussion and CoP participation quality. |
| Feedback Text | `.../extensions/feedback-text` | Result | Peer review feedback content. Captures the substance of the review for discourse analysis. |
| Reviewer Pseudonym | `.../extensions/reviewer-pseudonym` | Result | Pseudonymous reviewer identifier. Enables linking reviews to reviewers without exposing real identities. |

**Total: 15 custom extensions (3 context, 12 result).**

---

## 6. Design Decisions

### Zero Custom Verbs

All 22 event types in the profile map to existing standard verbs. Domain specificity comes from the verb + activity type combination, not from the verb alone. For example, "writing submitted" uses the Activity Streams `submit` verb with the custom `writing-task` activity type -- there is no need for a custom `submitted-writing` verb.

### IRI Namespace

All custom vocabulary uses the namespace `https://w3id.org/xapi/aclit/v1/` with semantic versioning embedded in the path:
- Profile ID (version-independent): `https://w3id.org/xapi/aclit`
- Version IRI: `https://w3id.org/xapi/aclit/v1`
- Activity types: `https://w3id.org/xapi/aclit/v1/activity-types/{name}`
- Extensions: `https://w3id.org/xapi/aclit/v1/extensions/{name}`

This follows the ADL-recommended IRI design pattern and is structured for w3id.org persistent IRI registration.

### xAPI 1.0.3 with 2.0 Forward-Compatibility

The profile targets xAPI 1.0.3 (IEEE 9274.1.1) while following all 1.0.3 SHOULD recommendations as if they were MUST, ensuring forward-compatibility with xAPI 2.0. The profile does not use 2.0-specific features (`contextAgents`, `contextGroups`) that would break 1.0.3 compatibility.

### Extension Validation via inlineSchema

Every custom extension includes an `inlineSchema` property containing a JSON Schema definition. This enables machine-readable validation of extension values without requiring separate validator code. This is a locked decision established in the Phase 2 context.

---

*Document: xapi-profile/docs/vocabulary-mapping.md*
*Part of: Academic Literacies xAPI Profile v1*
*See also: academic-literacies-profile.jsonld (machine-readable profile), event-catalog.md (human-readable event reference)*
