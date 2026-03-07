# Phase 2: xAPI Event Schema - Research

**Researched:** 2026-03-07
**Domain:** xAPI statement design, xAPI Profile specification (JSON-LD), learning analytics event vocabularies
**Confidence:** HIGH (xAPI 1.0.3 specification is stable and well-documented; xAPI Profile spec is authoritative; Jisc recipes provide proven educational patterns)

## Summary

This phase produces an xAPI Profile document, statement templates for every trackable event type, a writing artifact collection specification, and pedagogical purpose documentation linking each event to the Phase 1 DPIA. The work is specification authoring, not code -- the outputs are JSON-LD profile documents, JSON statement examples, and JSON Schema validation definitions.

The xAPI 1.0.3 specification provides a stable, well-documented data model for learning event statements. The xAPI Profile specification (conforming to `https://w3id.org/xapi/profiles#1.0`) defines a formal JSON-LD structure for declaring custom vocabularies (verbs, activity types, extensions), statement templates with validation rules, and statement patterns describing valid sequences. The Jisc Learning Analytics recipes provide a proven reference for educational event modelling in VLE contexts, with established verb and activity type choices for login/logout, resource viewing, quiz answering, forum posting, and assignment submission. The cmi5 profile provides session lifecycle patterns (launched/initialized/terminated) that map well to the hierarchical context strategy decided in Phase Context.

The primary challenge is vocabulary mapping: most events map to existing standard verbs (ADL, Jisc, Activity Streams), but academic-literacy-specific concepts (writing artifact capture with discourse metadata, peer review events, help-seeking interactions, CoP participation tracking) require custom vocabulary in the profile's own namespace. The IRI namespace design follows the established pattern `https://w3id.org/xapi/{profile}/{term-type}/{term}` with semantic versioning embedded in the profile version IRI.

**Primary recommendation:** Build the profile by maximizing reuse of ADL verbs, Jisc recipe patterns, and Activity Streams activity types, defining custom vocabulary only for domain-specific concepts (academic discourse metadata, help-seeking, peer review). Structure statement templates using the hierarchical context pattern (session-open carries full context; child statements reference session via `context.contextActivities.grouping`). Use JSON Schema `inlineSchema` within the xAPI Profile for each extension to enable validation.

## Standard Stack

This is a specification project -- "stack" means the reference specifications, vocabularies, and patterns that structure the deliverables.

### Core Specifications
| Specification | Version | Purpose | Why Standard |
|---------------|---------|---------|--------------|
| xAPI Base Standard | 1.0.3 (IEEE 9274.1.1) | Statement data model (Actor-Verb-Object-Context-Result) | Locked decision; stable spec since 2017; 2.0 is backward-compatible |
| xAPI Profile Specification | 1.0 (`profiles#1.0`) | JSON-LD format for declaring profiles with concepts, templates, patterns | Only standard for machine-readable xAPI profile definition |
| JSON-LD | 1.1 | Serialization format for the profile document | Required by xAPI Profile spec |
| JSON Schema | Draft 2020-12 | Validation schemas for statement templates and extensions | Locked decision; industry standard for JSON validation |

### Reusable Vocabularies
| Vocabulary | Namespace | Purpose | Verbs/Types Used |
|------------|-----------|---------|------------------|
| ADL Verbs | `http://adlnet.gov/expapi/verbs/` | Core learning verbs | attempted, completed, passed, failed, answered, experienced, interacted, asked, voided, progressed |
| ADL Activity Types | `http://adlnet.gov/expapi/activities/` | Core activity types | course, module, assessment, question, cmi.interaction, media, lesson, attempt |
| Jisc/Brindlewaye Verbs | `https://brindlewaye.com/xAPITerms/verbs/` | Login lifecycle | loggedin, loggedout |
| TinCan Verbs | `http://id.tincanapi.com/verb/` | Extended learning verbs | viewed, rated |
| Activity Streams | `http://activitystrea.ms/schema/1.0/` | Social/content verbs & types | create, share, submit; note, article, comment, file, page |
| cmi5 Verbs | `https://w3id.org/xapi/adl/verbs/` | Session lifecycle | satisfied, waived (reference only -- not all 9 apply) |

### Reference Implementations
| Reference | Source | Purpose | How Used |
|-----------|--------|---------|----------|
| Jisc xAPI Recipes v1.0.1 | Cetis/xapi (GitHub) | VLE event statement templates | Direct reference for login, resource viewed, quiz, forum post, assignment submitted patterns |
| Connected Learning Recipe (CLRecipe) | kirstykitto/CLRecipe (GitHub) | Social learning / discussion tracking | Reference for discussion forum verb/activity type choices |
| cmi5 Specification | AICC/CMI-5_Spec_Current (GitHub) | Session lifecycle and assignable unit patterns | Reference for session open/close pattern and context structure |
| xAPI SCORM Profile | adlnet/xAPI-SCORM-Profile (GitHub) | SCORM-to-xAPI migration patterns | Reference for quiz/assessment nested statement structure |

### Not Needed
| Instead of | Don't Use | Reason |
|------------|-----------|--------|
| Custom verb creation for login | Custom `loggedin`/`loggedout` verbs | Jisc/Brindlewaye verbs are established and widely adopted |
| Custom quiz interaction model | Custom question/answer structure | ADL `cmi.interaction` with `interactionType` covers all quiz question types from SCORM |
| Custom profile format | Ad-hoc JSON documents | xAPI Profile spec provides machine-readable, publishable, discoverable format |
| Custom statement validation | Hand-written validators | JSON Schema embedded in profile (`inlineSchema`) provides declarative validation |

## Architecture Patterns

### Recommended Deliverable Structure
```
xapi-profile/
  academic-literacies-profile.jsonld    # Full xAPI Profile (JSON-LD)
  schemas/
    session-open.schema.json            # JSON Schema per statement template
    reading-viewed.schema.json
    quiz-attempted.schema.json
    quiz-answered.schema.json
    writing-submitted.schema.json
    forum-posted.schema.json
    ...
  examples/
    session-open.json                   # Complete example statement per template
    reading-viewed.json
    quiz-attempted.json
    quiz-answered.json
    writing-submitted.json
    forum-posted.json
    ...
  docs/
    event-catalog.md                    # Human-readable event type catalog with DPIA references
    writing-artifact-spec.md            # Writing sample collection specification
    vocabulary-mapping.md               # Maps every verb/type to source vocabulary
```

### Pattern 1: Hierarchical Context (Session-Scoped)

**What:** The session-open statement carries the full context (course, module, device type, connection type). All subsequent statements in the session reference the session ID via `context.contextActivities.grouping`, avoiding redundant context in every statement.

**When to use:** Every statement except the session-open statement itself.

**Structure:**
```json
{
  "actor": {
    "objectType": "Agent",
    "account": {
      "homePage": "https://lms.institution.ac.za",
      "name": "pseudonym-abc123"
    }
  },
  "verb": {
    "id": "https://brindlewaye.com/xAPITerms/verbs/loggedin",
    "display": { "en": "logged in" }
  },
  "object": {
    "objectType": "Activity",
    "id": "https://lms.institution.ac.za/sessions/{session-uuid}",
    "definition": {
      "type": "https://w3id.org/xapi/aclit/v1/activity-types/session",
      "name": { "en": "Learning Session" }
    }
  },
  "context": {
    "registration": "{session-uuid}",
    "contextActivities": {
      "grouping": [
        {
          "id": "https://lms.institution.ac.za/courses/ALE00Y1",
          "definition": {
            "type": "http://adlnet.gov/expapi/activities/course",
            "name": { "en": "Academic Literacies (ALE00Y1)" }
          }
        },
        {
          "id": "https://lms.institution.ac.za/courses/ALE00Y1/modules/{module-id}",
          "definition": {
            "type": "http://adlnet.gov/expapi/activities/module",
            "name": { "en": "Module: Academic Reading" }
          }
        }
      ],
      "category": [
        {
          "id": "https://w3id.org/xapi/aclit/v1",
          "definition": {
            "type": "http://adlnet.gov/expapi/activities/profile",
            "name": { "en": "Academic Literacies xAPI Profile v1" }
          }
        }
      ]
    },
    "extensions": {
      "https://w3id.org/xapi/aclit/v1/extensions/device-type": "smartphone",
      "https://w3id.org/xapi/aclit/v1/extensions/connection-type": "mobile-data"
    }
  },
  "timestamp": "2026-03-07T14:30:00.000Z"
}
```

Child statements then reference the session:
```json
{
  "context": {
    "contextActivities": {
      "grouping": [
        {
          "id": "https://lms.institution.ac.za/sessions/{session-uuid}",
          "definition": {
            "type": "https://w3id.org/xapi/aclit/v1/activity-types/session"
          }
        }
      ],
      "category": [
        {
          "id": "https://w3id.org/xapi/aclit/v1"
        }
      ]
    }
  }
}
```

**Offline queuing support:** Because each child statement includes the session grouping reference (not just a session ID in an extension), statements are self-contained. A queued statement can be sent to the LRS without requiring the session-open statement to have been received first. The LRS can reconstruct the hierarchy from `contextActivities.grouping`.

### Pattern 2: Quiz Two-Level Nesting (Attempt + Question)

**What:** Quiz events use two levels: an attempt-level statement (verb: `attempted`/`completed`/`passed`/`failed`) with overall score, and question-level statements (verb: `answered`) with individual responses. Questions reference the quiz attempt via `context.contextActivities.parent`.

**When to use:** All quiz and assessment events.

**Structure:**

Quiz attempt (parent):
```json
{
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/completed",
    "display": { "en": "completed" }
  },
  "object": {
    "id": "https://lms.institution.ac.za/quizzes/{quiz-id}/attempts/{attempt-id}",
    "definition": {
      "type": "http://adlnet.gov/expapi/activities/assessment",
      "name": { "en": "Module 3 Comprehension Quiz" }
    }
  },
  "result": {
    "score": { "scaled": 0.8, "raw": 8, "min": 0, "max": 10 },
    "success": true,
    "completion": true,
    "duration": "PT12M30S"
  }
}
```

Question response (child referencing parent):
```json
{
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/answered",
    "display": { "en": "answered" }
  },
  "object": {
    "id": "https://lms.institution.ac.za/quizzes/{quiz-id}/questions/{question-id}",
    "definition": {
      "type": "http://adlnet.gov/expapi/activities/cmi.interaction",
      "interactionType": "choice",
      "correctResponsesPattern": ["option_b"],
      "choices": [
        { "id": "option_a", "description": { "en": "Answer A" } },
        { "id": "option_b", "description": { "en": "Answer B" } },
        { "id": "option_c", "description": { "en": "Answer C" } }
      ]
    }
  },
  "result": {
    "response": "option_b",
    "success": true,
    "duration": "PT45S"
  },
  "context": {
    "contextActivities": {
      "parent": [
        {
          "id": "https://lms.institution.ac.za/quizzes/{quiz-id}/attempts/{attempt-id}",
          "definition": {
            "type": "http://adlnet.gov/expapi/activities/assessment"
          }
        }
      ]
    }
  }
}
```

### Pattern 3: Writing Artifact Inline vs. External Reference

**What:** Short writing artifacts (< 1000 chars) are stored inline in `result.response`. Longer artifacts are stored externally with a reference URL in a context extension.

**When to use:** All writing submission events.

**Structure (inline -- short text):**
```json
{
  "verb": {
    "id": "http://activitystrea.ms/schema/1.0/submit",
    "display": { "en": "submitted" }
  },
  "object": {
    "id": "https://lms.institution.ac.za/tasks/{task-id}",
    "definition": {
      "type": "https://w3id.org/xapi/aclit/v1/activity-types/writing-task",
      "name": { "en": "Paragraph: Academic Register" }
    }
  },
  "result": {
    "response": "The student's submitted text goes here...",
    "completion": true,
    "extensions": {
      "https://w3id.org/xapi/aclit/v1/extensions/word-count": 187,
      "https://w3id.org/xapi/aclit/v1/extensions/paragraph-count": 2,
      "https://w3id.org/xapi/aclit/v1/extensions/citation-count": 3,
      "https://w3id.org/xapi/aclit/v1/extensions/draft-number": 2,
      "https://w3id.org/xapi/aclit/v1/extensions/assignment-type": "paragraph",
      "https://w3id.org/xapi/aclit/v1/extensions/time-spent": "PT25M"
    }
  }
}
```

**Structure (external reference -- long text):**
```json
{
  "result": {
    "completion": true,
    "extensions": {
      "https://w3id.org/xapi/aclit/v1/extensions/word-count": 1847,
      "https://w3id.org/xapi/aclit/v1/extensions/paragraph-count": 12,
      "https://w3id.org/xapi/aclit/v1/extensions/citation-count": 8,
      "https://w3id.org/xapi/aclit/v1/extensions/draft-number": 3,
      "https://w3id.org/xapi/aclit/v1/extensions/artifact-url": "https://storage.institution.ac.za/artifacts/{artifact-id}",
      "https://w3id.org/xapi/aclit/v1/extensions/artifact-content-type": "text/plain",
      "https://w3id.org/xapi/aclit/v1/extensions/assignment-type": "essay",
      "https://w3id.org/xapi/aclit/v1/extensions/time-spent": "PT2H15M"
    }
  }
}
```

### Pattern 4: Actor Identification (Pseudonymous Account)

**What:** All statements use the xAPI `account` agent identifier with the institutional LMS as `homePage` and a pseudonymous `accountName`. This aligns with the Phase 1 DPIA requirement for pseudonymous identification.

**When to use:** Every statement.

**Structure:**
```json
{
  "actor": {
    "objectType": "Agent",
    "account": {
      "homePage": "https://lms.institution.ac.za",
      "name": "stu-f7a3b2c1"
    }
  }
}
```

**Key rule:** The `accountName` is a pseudonym -- not the student number, name, or email. A separate mapping (outside the LRS, access-controlled per the Phase 1 access control matrix) links pseudonyms to real identities.

### Anti-Patterns to Avoid

- **Extension-heavy statements with empty core:** Statements where all meaningful data is in extensions and the verb/object/result core is generic. The xAPI best practice is "a statement shouldn't be totally defined by its extensions." Extensions enhance, not replace, core meaning.
- **Flat context (no hierarchy):** Repeating full course/module/device context in every statement. This bloats payloads, complicates offline queuing, and makes context updates inconsistent. Use the session-grouping pattern.
- **Custom verbs when standard exists:** Creating `https://w3id.org/xapi/aclit/v1/verbs/answered-quiz-question` when `http://adlnet.gov/expapi/verbs/answered` with the correct activity type achieves the same thing. Verb + activity type combination conveys meaning, not verb alone.
- **Sub-statements for quiz questions:** xAPI sub-statements are for statements-about-statements (e.g., "instructor commented on student's completion"). Using them for quiz question nesting adds unnecessary complexity. Use separate statements with `context.contextActivities.parent` instead.
- **Storing writing text only in attachments:** xAPI attachments are for signed statements and supplementary files. Short text belongs in `result.response`; long text in an external store with a URL reference in extensions.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Login/logout verbs | Custom login verbs | `https://brindlewaye.com/xAPITerms/verbs/loggedin` / `loggedout` (Jisc standard) | Widely adopted in UK/international LA; interoperable with Jisc-compatible systems |
| Quiz question types | Custom interaction model | `cmi.interaction` with `interactionType` (choice, true-false, fill-in, matching, etc.) | Covers all SCORM question types; established ecosystem support |
| Forum post verbs | Custom discussion verbs | `http://activitystrea.ms/schema/1.0/create` for new post; `http://adlnet.gov/expapi/verbs/commented` for reply | Activity Streams verbs are the standard for social/content creation |
| Resource viewing | Custom "read" verb | `http://id.tincanapi.com/verb/viewed` (Jisc standard) | Jisc VLE recipe standard; TinCan registry established |
| Assignment submission | Custom submission verb | `http://activitystrea.ms/schema/1.0/submit` | Activity Streams standard for content submission |
| Profile document format | Custom JSON schema file | xAPI Profile Specification JSON-LD with `@context`, `conformsTo`, concepts, templates, patterns | Machine-readable, publishable, discoverable; the only standard for xAPI profile authoring |
| Statement validation | Custom validation logic | JSON Schema `inlineSchema` on extensions + JSON Schema files for statement templates | Declarative validation; no custom code needed |
| IRI design | Ad-hoc URL structure | `https://w3id.org/xapi/{profile}/{term-type}/{term}` pattern | ADL-recommended persistence strategy via w3id.org |

**Key insight:** The xAPI ecosystem has mature vocabulary for learning events. The academic literacy domain requires custom extensions (discourse metadata, help-seeking types, CoP indicators) but almost no custom verbs or activity types. Custom vocabulary should be limited to extensions and a small number of domain-specific activity types.

## Common Pitfalls

### Pitfall 1: Creating Custom Verbs When Standard Verbs Exist
**What goes wrong:** Teams create profile-specific verbs like `aclit:read-section`, `aclit:take-quiz`, `aclit:write-essay` when standard verbs (`viewed`, `attempted`, `submitted`) combined with appropriate activity types convey the same meaning.
**Why it happens:** Verb feels like the natural place to encode domain specificity. But xAPI semantics come from verb + activity type + context, not verb alone.
**How to avoid:** For each event type, first search ADL verbs, Jisc recipes, and Activity Streams for an existing verb. Only create a custom verb if no combination of existing verb + activity type captures the action. Document the mapping decision in the vocabulary mapping document.
**Warning signs:** Profile defines more than 5 custom verbs. Most educational LA profiles need 0-3 custom verbs.

### Pitfall 2: Inconsistent Context Strategy Across Event Types
**What goes wrong:** Some statements carry full context, others carry partial context, and the hierarchy breaks down. Downstream analytics cannot reliably reconstruct which module/session a statement belongs to.
**Why it happens:** Different event types are designed by different people at different times without a consistent context template.
**How to avoid:** Define a single context template that ALL statement templates inherit. The session-grouping pattern (Pattern 1 above) provides this. Every statement template must include the context structure showing which `contextActivities` are required.
**Warning signs:** Statement templates have inconsistent `contextActivities` structures; some use `parent` where others use `grouping` for the same relationship.

### Pitfall 3: Writing Artifacts Without Sufficient Metadata for Discourse Analysis
**What goes wrong:** Writing text is captured but without the metadata needed for Phase 5 academic discourse analysis (word count, citation count, draft number, assignment type). Downstream analysis requires re-processing all artifacts.
**Why it happens:** The writing capture is designed as a simple submission event without anticipating analysis needs.
**How to avoid:** The writing submission statement template must include all structural metadata as result extensions: word count, paragraph count, citation count, draft number, time spent, assignment type, prompt/topic. These are computed at submission time and stored in the statement. The CONTEXT.md explicitly lists these.
**Warning signs:** Writing submission template has only `result.response` with no extensions.

### Pitfall 4: Profile Without Validation Schemas
**What goes wrong:** The profile defines statement templates but provides no machine-readable way to validate that statements conform. Implementors produce invalid statements that are only caught at analysis time.
**Why it happens:** Validation is seen as an implementation concern, not a specification concern.
**How to avoid:** Every extension definition in the profile must include `inlineSchema` (JSON Schema). Every statement template must have a corresponding JSON Schema file that validates the complete statement structure (required fields, allowed values, type constraints). This is a locked decision.
**Warning signs:** Extension definitions in the profile have no `schema` or `inlineSchema` property.

### Pitfall 5: Forgetting Pedagogical Purpose Documentation
**What goes wrong:** The event schema defines what data is collected but not why. This violates the Phase 1 DPIA requirement that every data collection activity documents its pedagogical purpose, and it violates Success Criterion 4 for this phase.
**Why it happens:** Technical schema design focuses on structure, not rationale.
**How to avoid:** Every event type in the event catalog document must include: (1) a reference to the DPIA section (e.g., "See DPIA 2.1: LMS Interaction Events"), (2) a statement of pedagogical purpose ("Tracking section-level reading enables early identification of disengaging students"), and (3) a mapping to the metric domain it supports (engagement, CoP, SDL, etc.).
**Warning signs:** Event catalog lists event types with only technical descriptions and no DPIA references.

### Pitfall 6: IRI Namespace Without Versioning Strategy
**What goes wrong:** Profile is published with IRIs like `https://w3id.org/xapi/aclit/verbs/submitted` without version information. When a breaking change is needed, there is no way to distinguish old and new vocabulary.
**Why it happens:** Versioning feels premature for v1.
**How to avoid:** Embed version in the profile IRI path: `https://w3id.org/xapi/aclit/v1/verbs/...`. The profile `id` is version-independent (`https://w3id.org/xapi/aclit`), but the `versions[].id` includes version (`https://w3id.org/xapi/aclit/v1`). All concept IRIs include the version path segment. This is a locked decision.
**Warning signs:** Concept IRIs have no version component.

## Code Examples

Note: "Code" here means JSON specification documents, not application code.

### Example 1: xAPI Profile Document Skeleton
```json
{
  "@context": "https://w3id.org/xapi/profiles/context",
  "id": "https://w3id.org/xapi/aclit",
  "type": "Profile",
  "conformsTo": "https://w3id.org/xapi/profiles#1.0",
  "prefLabel": {
    "en": "Academic Literacies Learning Analytics Profile"
  },
  "definition": {
    "en": "xAPI Profile for tracking student interactions in an academic literacies course. Defines verbs, activity types, extensions, and statement templates for reading, writing, quiz, discussion, navigation, and help-seeking events."
  },
  "seeAlso": "https://docs.institution.ac.za/xapi/aclit",
  "author": {
    "type": "Organization",
    "name": "Academic Literacies Teaching Team"
  },
  "versions": [
    {
      "id": "https://w3id.org/xapi/aclit/v1",
      "generatedAtTime": "2026-03-07T00:00:00Z"
    }
  ],
  "concepts": [],
  "templates": [],
  "patterns": []
}
```

### Example 2: Custom Extension Definition with Inline Schema
```json
{
  "id": "https://w3id.org/xapi/aclit/v1/extensions/word-count",
  "type": "ResultExtension",
  "inScheme": "https://w3id.org/xapi/aclit/v1",
  "prefLabel": { "en": "Word Count" },
  "definition": { "en": "The number of words in the submitted writing artifact." },
  "recommendedVerbs": ["http://activitystrea.ms/schema/1.0/submit"],
  "inlineSchema": "{\"type\":\"integer\",\"minimum\":0}"
}
```

### Example 3: Custom Activity Type Definition
```json
{
  "id": "https://w3id.org/xapi/aclit/v1/activity-types/writing-task",
  "type": "ActivityType",
  "inScheme": "https://w3id.org/xapi/aclit/v1",
  "prefLabel": { "en": "Writing Task" },
  "definition": { "en": "A writing assignment in the academic literacies course requiring student-authored text submission (paragraph, essay, reflection, report)." },
  "broadMatch": ["http://activitystrea.ms/schema/1.0/article"]
}
```

### Example 4: Statement Template Definition
```json
{
  "id": "https://w3id.org/xapi/aclit/v1/templates/writing-submitted",
  "type": "StatementTemplate",
  "inScheme": "https://w3id.org/xapi/aclit/v1",
  "prefLabel": { "en": "Writing Task Submitted" },
  "definition": { "en": "Generated when a student submits a writing artifact (draft or final version)." },
  "verb": "http://activitystrea.ms/schema/1.0/submit",
  "objectActivityType": "https://w3id.org/xapi/aclit/v1/activity-types/writing-task",
  "contextGroupingActivityType": ["https://w3id.org/xapi/aclit/v1/activity-types/session"],
  "contextCategoryActivityType": ["https://w3id.org/xapi/aclit/v1"],
  "rules": [
    {
      "location": "$.result.extensions['https://w3id.org/xapi/aclit/v1/extensions/word-count']",
      "presence": "included"
    },
    {
      "location": "$.result.extensions['https://w3id.org/xapi/aclit/v1/extensions/draft-number']",
      "presence": "included"
    },
    {
      "location": "$.result.extensions['https://w3id.org/xapi/aclit/v1/extensions/assignment-type']",
      "presence": "included"
    },
    {
      "location": "$.result.completion",
      "presence": "included"
    }
  ]
}
```

### Example 5: Discussion Forum Post Statement
```json
{
  "actor": {
    "objectType": "Agent",
    "account": {
      "homePage": "https://lms.institution.ac.za",
      "name": "stu-f7a3b2c1"
    }
  },
  "verb": {
    "id": "http://activitystrea.ms/schema/1.0/create",
    "display": { "en": "created" }
  },
  "object": {
    "objectType": "Activity",
    "id": "https://lms.institution.ac.za/forums/{forum-id}/posts/{post-id}",
    "definition": {
      "type": "http://activitystrea.ms/schema/1.0/note",
      "name": { "en": "Forum Post: Academic Reading Strategies" }
    }
  },
  "result": {
    "response": "The student's forum post text...",
    "extensions": {
      "https://w3id.org/xapi/aclit/v1/extensions/word-count": 156,
      "https://w3id.org/xapi/aclit/v1/extensions/thread-depth": 0
    }
  },
  "context": {
    "contextActivities": {
      "parent": [
        {
          "id": "https://lms.institution.ac.za/forums/{forum-id}/threads/{thread-id}",
          "definition": {
            "type": "https://w3id.org/xapi/aclit/v1/activity-types/discussion-thread"
          }
        }
      ],
      "grouping": [
        {
          "id": "https://lms.institution.ac.za/sessions/{session-uuid}",
          "definition": {
            "type": "https://w3id.org/xapi/aclit/v1/activity-types/session"
          }
        }
      ],
      "category": [
        { "id": "https://w3id.org/xapi/aclit/v1" }
      ]
    }
  },
  "timestamp": "2026-03-07T15:45:00.000Z"
}
```

### Example 6: Help-Seeking Event
```json
{
  "verb": {
    "id": "http://adlnet.gov/expapi/verbs/asked",
    "display": { "en": "asked" }
  },
  "object": {
    "objectType": "Activity",
    "id": "https://lms.institution.ac.za/help/{request-id}",
    "definition": {
      "type": "https://w3id.org/xapi/aclit/v1/activity-types/help-request",
      "name": { "en": "Help Request: Citation Formatting" }
    }
  },
  "context": {
    "extensions": {
      "https://w3id.org/xapi/aclit/v1/extensions/help-type": "tutor-question"
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Ad-hoc JSON recipe documents | Formal xAPI Profile spec (JSON-LD) with machine-readable concepts, templates, patterns | xAPI Profiles spec 1.0 (2017-2018) | Profiles are discoverable, validatable, and interoperable |
| Custom verbs for every action | Verb + activity type combination; maximize vocabulary reuse | Community consensus 2018-2020 | Fewer custom verbs; better interoperability |
| xAPI 1.0.3 only | xAPI 2.0 (IEEE 9274.1.1) with backward compatibility | 2024-2025 | 2.0 adds `contextAgents`/`contextGroups`; SHOULD* becomes SHALL; backward-compatible |
| SCORM-style monolithic tracking | Event-level statements with hierarchical context | xAPI ecosystem maturation 2016-2020 | Fine-grained analytics; offline-capable |
| Flat statement context | Hierarchical context via `contextActivities` (parent/grouping/category) | xAPI spec best practice evolution | Reduces redundancy; supports cross-module analysis |

**Deprecated/outdated:**
- Using `mbox` (email) for actor identification -- privacy concern; `account` is preferred for pseudonymous identification
- xAPI 0.9 statement format -- incompatible with 1.0.3+; must not be used
- Using `revision` context property for versioning content -- this is for minor edits, not version control
- Using sub-statements for nesting quiz questions -- separate statements with `contextActivities.parent` is the established pattern

## xAPI 2.0 Forward-Compatibility Notes

The locked decision is to target xAPI 1.0.3 with 2.0 forward-compatibility. Based on research, the practical implications are:

1. **Minimal structural changes:** xAPI 2.0 is not significantly different from 1.0.3 in statement structure. The data model is backward-compatible.
2. **New properties:** 2.0 adds `contextAgents` and `contextGroups` to the context object. The profile should NOT use these yet (not supported by 1.0.3 LRS implementations) but should be aware that instructor/team context may use these in future versions.
3. **SHOULD to SHALL:** Some best practices that were SHOULD in 1.0.3 became SHALL (required) in 2.0. Following all SHOULD recommendations in 1.0.3 now ensures 2.0 compliance later.
4. **Terminology:** "MUST" becomes "SHALL" in 2.0 -- no behavioral change, only language.
5. **Action items for this phase:** Follow all 1.0.3 SHOULD recommendations as if they were MUST. Do not use `contextAgents`/`contextGroups`. Document in the profile that a future v2 may adopt 2.0-specific features.

## Complete Event Type Inventory

Based on the DPIA activities and CONTEXT.md decisions, the following event types must have statement templates:

### Navigation Events
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Session open (login) | `https://brindlewaye.com/xAPITerms/verbs/loggedin` | `aclit:session` (custom) | Jisc VLE recipe |
| Session close (logout) | `https://brindlewaye.com/xAPITerms/verbs/loggedout` | `aclit:session` (custom) | Jisc VLE recipe |
| Page/resource viewed | `http://id.tincanapi.com/verb/viewed` | `http://activitystrea.ms/schema/1.0/page` | Jisc VLE recipe |
| Module navigation | `http://adlnet.gov/expapi/verbs/experienced` | `http://adlnet.gov/expapi/activities/module` | ADL |

### Reading Events
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Section viewed | `http://id.tincanapi.com/verb/viewed` | `aclit:reading-section` (custom) | Jisc + custom type |
| Section completed | `http://adlnet.gov/expapi/verbs/completed` | `aclit:reading-section` (custom) | ADL |

### Quiz Events
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Quiz attempted | `http://adlnet.gov/expapi/verbs/attempted` | `http://adlnet.gov/expapi/activities/assessment` | ADL |
| Quiz completed | `http://adlnet.gov/expapi/verbs/completed` | `http://adlnet.gov/expapi/activities/assessment` | ADL |
| Quiz passed | `http://adlnet.gov/expapi/verbs/passed` | `http://adlnet.gov/expapi/activities/assessment` | ADL |
| Quiz failed | `http://adlnet.gov/expapi/verbs/failed` | `http://adlnet.gov/expapi/activities/assessment` | ADL |
| Question answered | `http://adlnet.gov/expapi/verbs/answered` | `http://adlnet.gov/expapi/activities/cmi.interaction` | ADL/SCORM |

### Writing Events
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Writing submitted | `http://activitystrea.ms/schema/1.0/submit` | `aclit:writing-task` (custom) | Activity Streams |

### Discussion Events
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Forum post created | `http://activitystrea.ms/schema/1.0/create` | `http://activitystrea.ms/schema/1.0/note` | Activity Streams / CLRecipe |
| Forum reply posted | `http://adlnet.gov/expapi/verbs/commented` | `http://activitystrea.ms/schema/1.0/comment` | ADL + Activity Streams |
| Thread/post viewed | `http://id.tincanapi.com/verb/viewed` | `aclit:discussion-thread` (custom) | TinCan + custom type |

### Peer Review Events
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Peer review submitted | `http://activitystrea.ms/schema/1.0/submit` | `aclit:peer-review` (custom) | Activity Streams |

### Help-Seeking Events
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Help requested (tutor question) | `http://adlnet.gov/expapi/verbs/asked` | `aclit:help-request` (custom) | ADL |
| Help resource accessed | `http://id.tincanapi.com/verb/viewed` | `aclit:help-resource` (custom) | TinCan |
| Extension requested | `http://adlnet.gov/expapi/verbs/asked` | `aclit:extension-request` (custom) | ADL |

### Curriculum Progress Events
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Module completed | `http://adlnet.gov/expapi/verbs/completed` | `http://adlnet.gov/expapi/activities/module` | ADL |
| Course progressed | `http://adlnet.gov/expapi/verbs/progressed` | `http://adlnet.gov/expapi/activities/course` | ADL |

### Self-Report Events (Placeholder)
| Event | Verb (IRI) | Activity Type (IRI) | Source |
|-------|-----------|---------------------|--------|
| Self-report submitted | `http://activitystrea.ms/schema/1.0/submit` | `aclit:self-report` (custom) | Placeholder -- defer to Phase 3 |

### Summary: Custom Vocabulary Needed

**Custom Activity Types (8):**
1. `aclit:session` -- learning session container
2. `aclit:reading-section` -- page/section-level reading content
3. `aclit:writing-task` -- writing assignment
4. `aclit:discussion-thread` -- forum discussion thread
5. `aclit:peer-review` -- peer review activity
6. `aclit:help-request` -- help-seeking request
7. `aclit:help-resource` -- help/support resource
8. `aclit:extension-request` -- assessment extension request
9. `aclit:self-report` -- self-report instrument (placeholder)

**Custom Extensions (~15):**
- Context: `device-type`, `connection-type`, `help-type`
- Result (writing): `word-count`, `paragraph-count`, `citation-count`, `draft-number`, `assignment-type`, `time-spent`, `artifact-url`, `artifact-content-type`, `prompt-topic`
- Result (discussion): `thread-depth`
- Result (peer review): `feedback-text`, `reviewer-pseudonym`

**Custom Verbs: 0** -- All events map to existing standard verbs.

## Open Questions

1. **Exact `homePage` IRI for actor accounts**
   - What we know: Must be the institutional LMS URL; pseudonymous `accountName`
   - What's unclear: Whether to use the production LMS URL or a generic institution URL
   - Recommendation: Use the LMS base URL (e.g., `https://lms.institution.ac.za`) as this is the system generating the events; document this in the profile

2. **w3id.org registration for the profile namespace**
   - What we know: Best practice is to register `https://w3id.org/xapi/aclit` with w3id.org for persistent IRIs
   - What's unclear: Whether to register now (specification phase) or at implementation; registration requires a GitHub PR to the w3id.org repo
   - Recommendation: Use `https://w3id.org/xapi/aclit` as the namespace in the specification. Actual w3id.org registration can happen at implementation time. Document that IRIs are designed for w3id.org registration.

3. **Peer review statement structure: reviewer identity**
   - What we know: Peer review events capture reviewer, feedback, and author response; reviewer must be pseudonymous
   - What's unclear: Whether the reviewer is the `actor` of the statement (natural) or referenced in an extension; how to link the review to the original writing submission
   - Recommendation: Reviewer is the `actor` (they performed the review action). The object references the writing task being reviewed. The original submission is linked via `context.contextActivities.parent` referencing the writing-submitted statement's object. Feedback text goes in `result.response` (inline if short) or external reference.

4. **Thread depth and reply-to semantics in discussion events**
   - What we know: Discussion events track post + engagement; reply statements should reference what they reply to
   - What's unclear: Whether reply-to is modeled via `context.contextActivities.parent` (referencing the parent post) or via a context extension
   - Recommendation: Use `context.contextActivities.parent` to reference the parent post/thread. This is the xAPI-standard way to express "this is a response to that." Thread depth as a numeric extension is supplementary metadata.

5. **Self-report placeholder scope**
   - What we know: CONTEXT.md says "reserve verb/activity-type slots" and "defer detailed schema to Phase 3"
   - What's unclear: How much structure to define now vs. leaving entirely for Phase 3
   - Recommendation: Define the activity type (`aclit:self-report`) and verb (`submit`) in the profile with a minimal statement template. Add a note that the template will be expanded in Phase 3 when instruments are designed. Include placeholder extensions (`instrument-id`, `response-data`) without detailed schemas.

## Sources

### Primary (HIGH confidence)
- [xAPI Profile Specification Structure](https://adlnet.github.io/xapi-profiles/xapi-profiles-structure.html) -- Full profile document structure, concept types, statement templates, patterns, rules
- [xAPI Specification Data Model (1.0.3)](https://github.com/adlnet/xAPI-Spec/blob/master/xAPI-Data.md) -- Statement structure, actor, verb, object, context, result, contextActivities
- [xAPI Statements 101](https://xapi.com/statements-101/) -- Actor/verb/object anatomy, extensions best practices
- [xAPI Deep Dive: Context](https://xapi.com/blog/deep-dive-context/) -- contextActivities (parent/grouping/category/other), registration, extensions
- [xAPI Deep Dive: Result](https://xapi.com/blog/deep-dive-result/) -- Score, completion, success, response, duration, extensions
- [xAPI Deep Dive: Verb](https://xapi.com/blog/deep-dive-verb/) -- ADL verb registry, verb IRI patterns
- [xAPI Deep Dive: Activity](https://xapi.com/blog/deep-dive-activity/) -- Activity types, cmi.interaction, interactionType
- [IRI Design and Persistence (ADL Companion Spec)](https://adl.gitbooks.io/companion-specification-for-xapi-vocabularies/content/vocabulary_development_and_publishing/iri_design_and_persistence.html) -- IRI naming conventions, w3id.org persistence strategy

### Secondary (MEDIUM confidence)
- [Jisc xAPI Recipes v1.0.1](https://github.com/alanepaull/xapi) -- VLE statement templates: login, resource viewed, quiz, forum post, assignment submitted
- [Connected Learning Recipe (CLRecipe)](https://github.com/kirstykitto/CLRecipe) -- Discussion/social learning verbs and activity types (Activity Streams based)
- [cmi5 Verbs](https://risc-inc.com/the-cmi5-verbs/) -- 9 cmi5 session lifecycle verbs
- [xAPI 2.0 Forward-Compatibility](https://xapi.com/blog/what-vendors-can-do-to-prepare-for-xapi-2-0/) -- 2.0 changes, backward compatibility, preparation recommendations
- [xAPI Schema Validation](https://xapi.com/schema/) -- JSON Schema for statement validation; limitations (structure only, not content quality)
- [OpenLearning xAPI Verbs/Objects List](https://help.openlearning.com/t/63ax49/xapi-list-of-statements-verbs-and-objects) -- Verb and activity type IRI reference

### Tertiary (LOW confidence)
- [Enhanced xAPI Data Model for Assessment Analytics](https://www.sciencedirect.com/science/article/pii/S1877050918312675) -- Assessment-specific xAPI extensions (academic paper, not verified against current spec)
- [xAPI-vle-recipe Vocabulary](https://github.com/xAPI-vle/xAPI-vle-recipe/blob/master/vocabulary.md) -- Earlier Jisc recipe version (v0.2.1); may differ from current v1.0.1

## Metadata

**Confidence breakdown:**
- xAPI statement structure: HIGH -- Specification is stable (1.0.3 since 2017); data model well-documented
- xAPI Profile specification: HIGH -- Authoritative specification fetched directly; JSON-LD structure verified
- Verb/activity type mapping: HIGH -- ADL verbs verified via multiple sources; Jisc recipes confirmed via GitHub repos
- IRI namespace design: HIGH -- ADL companion spec for vocabularies provides explicit guidance
- Writing artifact capture: MEDIUM -- No existing xAPI profile specifically addresses academic writing artifact capture with discourse metadata; pattern is extrapolated from xAPI best practices + CONTEXT.md decisions
- Peer review event modeling: MEDIUM -- No standard xAPI recipe for peer review exists; design is derived from general xAPI patterns
- Help-seeking event modeling: MEDIUM -- No standard xAPI vocabulary for help-seeking; `asked` verb is ADL standard but activity types are custom
- xAPI 2.0 forward-compatibility: MEDIUM -- Changes documented but 2.0 adoption is early; practical implications for this profile are minimal

**Research date:** 2026-03-07
**Valid until:** 2026-04-07 (30 days -- xAPI specification is stable; no breaking changes expected)
