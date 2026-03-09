# Phase 2 Plan 3: Writing Artifact Spec and Statement Patterns Summary

Writing sample collection specification defines capture (submit-only), storage (inline vs external at 1000-char threshold), metadata extensions, offline handling, and Phase 5 discourse analysis data contract. Statement patterns define valid event sequences for all major workflows (session lifecycle, reading, quiz, discussion, help-seeking) with 11 total patterns in the profile.

## Completed Tasks

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Create Writing Sample Collection Specification | `4a88797` | `xapi-profile/docs/writing-artifact-spec.md` |
| 2 | Add Statement Patterns to Profile | `4f96734` | `xapi-profile/academic-literacies-profile.jsonld` |

## What Was Built

### Writing Sample Collection Specification
- **Purpose and scope:** Defines how writing artifacts (writing tasks, forum posts, peer review feedback) are captured, stored, and made available for academic discourse analysis
- **Capture rules:** Submit-only (no auto-saves, no keystroke logging); full text snapshot at each submission; draft tracking via incrementing draft-number
- **Storage strategy:** Inline in `result.response` for text <= 1000 chars; external artifact store with `artifact-url` reference for text > 1000 chars
- **Metadata:** 3 required extensions (word-count, draft-number, assignment-type), 4 recommended (paragraph-count, citation-count, time-spent, prompt-topic), 2 conditional (artifact-url, artifact-content-type)
- **Computation rules:** Detailed algorithms for word count, paragraph count, citation count (heuristic), time spent, draft number
- **Offline handling:** Inline artifacts queued as self-contained statements; external artifacts use provisional-to-permanent URL replacement on sync
- **Discourse analysis support:** Documents how each metadata field supports Phase 5 CoP vocabulary marker detection, citation analysis, argument structure, draft progression, and cross-context transfer
- **Privacy:** DPIA DATA-04 cross-reference; student + assigned tutor access only; POPIA compliance

### Statement Patterns (11 total)
- **Session Lifecycle** (primary): login -> zero or more activities -> optional logout
- **Session Activity:** alternates across all activity types (page, module, reading, quiz, writing, discussion, peer review, help-seeking, completion, progress, self-report)
- **Reading Activity:** view section -> optionally complete
- **Quiz Activity:** attempt -> one or more questions -> outcome (completed/passed/failed)
- **Discussion Activity:** alternates of thread-viewed, forum-post-created, forum-reply-posted
- **Help-Seeking Activity:** alternates of help-requested, help-resource-accessed, extension-requested
- **Composition sub-patterns:** zeroOrMore (session activities), oneOrMore (quiz questions), optional (session close, reading completion)

## Deviations from Plan

None -- plan executed exactly as written. The writing artifact spec already existed as an untracked file from a prior session; it was verified to meet all requirements and committed as-is.

## Verification Results

| Check | Result |
|-------|--------|
| Writing spec contains "1000" (threshold) | Pass (8 occurrences) |
| Writing spec contains "word-count" | Pass (6 occurrences) |
| Writing spec contains "draft-number" | Pass (7 occurrences) |
| Writing spec contains "artifact-url" | Pass (9 occurrences) |
| Writing spec contains "discourse" | Pass (6 occurrences) |
| Writing spec contains "DPIA" | Pass (5 occurrences) |
| Writing spec contains "offline" | Pass (11 occurrences) |
| Profile is valid JSON | Pass |
| Patterns count >= 7 | Pass (11 patterns) |
| Primary pattern exists | Pass (session-lifecycle) |
| Quiz pattern has attempt->answer->outcome sequence | Pass |
| All 5 pattern types used | Pass (sequence, alternates, optional, zeroOrMore, oneOrMore) |

## Phase 2 Completion Status

With this plan complete, Phase 2 delivers the full xAPI Event Schema:
- **02-01:** xAPI Profile document + vocabulary mapping + event catalog
- **02-02:** 22 statement templates + JSON Schema validation + 10 example statements
- **02-03:** Writing artifact collection spec + 11 statement patterns

## Decisions Made

- Writing spec confirms submit-only capture as locked decision (no auto-saves, no keystrokes)
- Writing spec confirms 1000-char inline/external threshold as locked decision
- Citation count is explicitly documented as heuristic; precise parsing deferred to Phase 5
- Forum posts are writing artifacts for discourse analysis but use discussion templates (not writing-submitted)
- Peer review feedback text is a writing artifact for CoP analysis

## Duration

~2 minutes
