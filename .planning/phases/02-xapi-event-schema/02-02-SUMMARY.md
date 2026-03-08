---
phase: 02-xapi-event-schema
plan: 02
subsystem: xapi-profile
tags: [xapi, json-schema, statement-templates, validation, examples]
completed: 2026-03-08
duration: 7min
depends_on:
  requires: [02-01]
  provides: [statement-templates, json-schemas, example-statements]
  affects: [02-03, 03-01]
tech_stack:
  added: []
  patterns: [json-schema-draft-2020-12, xapi-statement-template, hierarchical-context-grouping]
key_files:
  created:
    - xapi-profile/schemas/session-opened.schema.json
    - xapi-profile/schemas/session-closed.schema.json
    - xapi-profile/schemas/page-viewed.schema.json
    - xapi-profile/schemas/module-navigated.schema.json
    - xapi-profile/schemas/reading-viewed.schema.json
    - xapi-profile/schemas/reading-completed.schema.json
    - xapi-profile/schemas/quiz-attempted.schema.json
    - xapi-profile/schemas/quiz-completed.schema.json
    - xapi-profile/schemas/quiz-passed.schema.json
    - xapi-profile/schemas/quiz-failed.schema.json
    - xapi-profile/schemas/question-answered.schema.json
    - xapi-profile/schemas/writing-submitted.schema.json
    - xapi-profile/schemas/forum-post-created.schema.json
    - xapi-profile/schemas/forum-reply-posted.schema.json
    - xapi-profile/schemas/thread-viewed.schema.json
    - xapi-profile/schemas/peer-review-submitted.schema.json
    - xapi-profile/schemas/help-requested.schema.json
    - xapi-profile/schemas/help-resource-accessed.schema.json
    - xapi-profile/schemas/extension-requested.schema.json
    - xapi-profile/schemas/module-completed.schema.json
    - xapi-profile/schemas/course-progressed.schema.json
    - xapi-profile/schemas/self-report-submitted.schema.json
    - xapi-profile/examples/session-open.json
    - xapi-profile/examples/reading-viewed.json
    - xapi-profile/examples/quiz-completed.json
    - xapi-profile/examples/question-answered.json
    - xapi-profile/examples/writing-submitted.json
    - xapi-profile/examples/forum-post-created.json
    - xapi-profile/examples/forum-reply-posted.json
    - xapi-profile/examples/peer-review-submitted.json
    - xapi-profile/examples/help-requested.json
    - xapi-profile/examples/module-completed.json
  modified: []
decisions: []
---

# Phase 2 Plan 2: Statement Templates, JSON Schemas, and Example Payloads Summary

22 JSON Schema validation files (Draft 2020-12) for all statement templates, plus 10 example xAPI statements covering navigation, reading, quiz, writing, discussion, peer review, help-seeking, and curriculum completion events.

## What Was Done

### Task 1: JSON Schema Validation Files (22 schemas)

Verified the existing 22 statement templates in the profile JSON-LD (created in 02-01) are correct and complete. Created 22 corresponding JSON Schema files in `xapi-profile/schemas/`, one per template.

Each schema validates the complete xAPI statement structure:
- **Actor**: Pseudonymous account with homePage and name
- **Verb**: Fixed IRI per template (e.g., `loggedin`, `completed`, `submit`)
- **Object**: Fixed activity type per template
- **Context**: Hierarchical contextActivities pattern -- session grouping (or course+module for session-opened) and profile category
- **Result**: Template-specific requirements (score, duration, completion, extensions)

Schema design patterns:
- `$defs` for shared patterns (account, sessionGrouping, score) within each file
- `const` for fixed values (verb IDs, activity types, success true/false)
- `contains` for array validation (category must contain profile reference)
- Templates with parent references (question-answered, forum-post-created, forum-reply-posted, peer-review-submitted) enforce parent activity type

### Task 2: Example Statement Payloads (10 examples)

Created 10 representative example statements in `xapi-profile/examples/` with realistic fictional data from a South African academic literacies course context:

1. **session-open**: Smartphone on mobile-data, course+module grouping, registration UUID
2. **reading-viewed**: Reading section with 4m30s duration
3. **quiz-completed**: Score 8/10, success, completion, 12m30s duration
4. **question-answered**: CMI interaction (choice) with parent quiz, correctResponsesPattern
5. **writing-submitted**: Inline text with all 7 extensions (word-count, paragraph-count, citation-count, draft-number, assignment-type, time-spent, prompt-topic)
6. **forum-post-created**: Thread-depth 0, parent discussion-thread, word-count 58
7. **forum-reply-posted**: Thread-depth 1, parent note (different student actor)
8. **peer-review-submitted**: Feedback text with substantive review content, parent writing-task
9. **help-requested**: Tutor-question help-type context extension
10. **module-completed**: Completion true with aggregate score 82/100

## Decisions Made

No new decisions required. All templates follow the patterns established in 02-01.

## Deviations from Plan

None -- plan executed exactly as written. The profile templates were already correct from 02-01, so no modifications were needed.

## Verification Results

| Check | Result |
|-------|--------|
| Profile templates count | 22 |
| Schema files count | 22 |
| Example files count | 10 |
| StatementTemplate occurrences in profile | 22 |
| All JSON files valid | Yes |
| Session-opened uses course+module grouping | Yes |
| All other templates use session grouping | Yes |
| question-answered has parent assessment rule | Yes |
| writing-submitted requires word-count | Yes |
| All templates have profile category | Yes |

## Commits

| Hash | Description |
|------|-------------|
| f7f43d3 | feat(02-02): create JSON Schema validation files for all 22 statement templates |
| c4c3f0b | feat(02-02): create 10 example xAPI statement payloads for representative event types |

## Next Phase Readiness

Plan 02-03 (statement patterns) can now proceed. All 22 templates are defined with complete rules, validated by JSON Schema, and demonstrated by examples. The patterns plan will define sequencing constraints (e.g., session-open must precede child statements).
