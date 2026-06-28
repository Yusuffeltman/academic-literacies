# Lesson Presentation Redesign — Testable Spec

**Status:** Spec / proposed experiment
**Depends on:** [lesson-presentation-evidence-review.md](lesson-presentation-evidence-review.md)
**Goal:** Operationalise the evidence review's principles into a concrete redesign and a fair, low-effort experiment that decides — on measured learning, not intuition — whether to adopt it.

---

## 1. Hypothesis

A unit that is **segmented by activity but keeps connected prose continuous** will, versus the current single-scroll unit, **lower perceived cognitive load and raise completion without reducing comprehension or writing-transfer quality** — with the comprehension/load benefit largest for lower-prior-knowledge and EAL students (cognitive load theory; segmenting principle), and *no* benefit from fragmenting the reading itself (screen-inferiority / coherence evidence).

This is directional but pre-committed: the review warns effects are small-to-moderate and population-dependent, so the bar is **non-inferiority on comprehension/transfer + improvement on load or completion**, not a large win.

## 2. The two arms

**Arm A — Control (current).** The unit renders as today: one continuous scrolling page; reading-task in its normal stepper.

**Arm B — Treatment ("architecture-segmented, prose-continuous").** The unit is divided only at **authored, meaningful activity boundaries** — Orient, Learn, Watch, Practise, Reflect — with these rules:

| Rule | Rationale (evidence review §) |
|---|---|
| Split only at activity boundaries; **never mid-argument** | §3–§4: fragmenting connected meaning hurts |
| Each **connected explanation stays continuous** within its chunk (may scroll) | §4: situation-model / coherence |
| The **reading is one continuous block**; PDF/print promoted for long texts | §4: screen inferiority for expository text |
| Reduce load via **signalling** (clear headings/structure) + **coherence** (less decoration), not by chopping | §7.3 |
| **Step-gating only** for the reading-task flow and **pacing only** for video | §3, §7.4 |
| Vocabulary **pre-training** retained before dense readings | §6 |

Critically, Arm B is **not** the parked prototype: boundaries are authored (not heuristic), connected prose is never sub-divided, and the reading is never fragmented.

> Build note: Arm B can reuse the parked `unit-reader`, but driven by **authored chunk metadata** on the test units (an array of boundary markers) rather than the heading heuristic — so the experiment tests the *principle*, not heuristic accuracy.

## 3. Measures (wired to what the app already captures)

| Construct | Measure | Source in app | New work |
|---|---|---|---|
| **Comprehension** (primary) | % correct on a fixed MCQ set per test unit | `quiz()` already scores against a correct index | Author a comparable comprehension MCQ block per test unit |
| **Transfer / quality** | Reading-task writing rating (1–5 `LEVELS`) | Already captured by the AI feedback step | none |
| **Cognitive load** | One-item Paas mental-effort rating (1–9) at unit end | Reuse the reading-survey slider pattern | Add one slider + log |
| **Perceived difficulty** | Reading-survey difficulty item (1–5) | Already captured (`readingSurvey.difficulty`) | none |
| **Completion** | Unit/reading completion rate | `STATE.progress[unitId].readingComplete` | none |
| **Time-on-task / drop-off** | Timestamps; last step reached | `unit_open` events + reading-task `savedAt`/`step` | Log step on exit |
| **Frustration** | Existing frustration index | `STATE.adaptive.frustration_index` | none |
| **Prior knowledge** (moderator) | Prior-knowledge band (lower/higher) from skill_status, logged on completion | `STATE.adaptive.skill_status` → `priorKnowledgeBand()` | done — split shown in the read-out |
| **EAL** (moderator) | Home language | not currently captured | Optional profile field; else use prior-knowledge proxy |

**Condition + outcome logging:** extend `trackLearningEvent` to stamp `presentationArm` ('A'|'B') on unit events, and add `lesson_arm_assigned` and `lesson_completed` to `LEARNING_ACTION_EVENT_TYPES` in [analytics.js](../src/analytics.js) so they flow through the existing xAPI/metrics pipeline.

## 4. Design & assignment

**Within-subjects, counterbalanced** (not between-subjects A/B). Each student experiences **both** formats across **matched test units**; presentation order is counterbalanced across students.

Rationale: small course cohorts give weak between-groups power; within-subjects is more sensitive and, importantly, **fairer** — no student is confined to one format on assessed work (see §7).

- **Test units (confirmed): `unit07` "The Professional Fact-Checker" and `unit08` "Trusting AI with Your Research".** Both Phase 2 (Finding & Evaluating Knowledge), identical length (141 lines), near-identical writing difficulty (140/150 words), identical component structure, cognate source/AI-evaluation skills, and adjacent + mid-course (low attrition, no first-unit novelty confound). Runner-up if an exact difficulty match is preferred over data completeness: `unit16` + `unit17` (Phase 4, both 220-word target).
- **Assignment:** deterministic from a hash of `studentId × unitId` so the split is balanced and reproducible; persisted in `STATE` so a student always sees the same arm for a given unit.
- **Counterbalance:** half the cohort sees unit X in Arm A / unit Y in Arm B; the other half the reverse.

## 5. Analysis plan

- **Primary outcome:** comprehension MCQ %. Decision rule = **non-inferiority** of Arm B (pre-set margin, e.g. ≤3 percentage points) — we must not trade comprehension for tidiness.
- **Secondary:** writing rating (1–5), Paas load (1–9), completion, time-on-task, drop-off step.
- **Method:** paired within-student comparisons; a mixed-effects model (student random effect; fixed effects arm, unit, order) if N allows. Report **effect sizes + confidence intervals**, not just p-values.
- **Moderators (the key check):** arm × prior-knowledge and arm × EAL interactions, to test the expertise-reversal-style prediction that segmentation helps novices/EAL most.
- **Status:** treat as **design-based / formative**. With a single course cohort this is decision-support, not a publishable RCT.

## 6. Decision criteria

- **Adopt Arm B** if: comprehension non-inferior **and** (load lower **or** completion higher) **and** writing rating not worse — especially holding within the lower-prior-knowledge / EAL subgroup.
- **Iterate** if: mixed (e.g. load down but completion flat) — refine signalling/chunk size and re-test.
- **Reject / stay on scroll** if: comprehension or writing rating drops, or no load/completion benefit. (This is the outcome the parked prototype would likely have produced — now we'd *know*.)

## 7. Equity & ethics (non-negotiable in a credit-bearing course)

- Align with the existing **DPIA and equity-review framework** already in the repo ([governance-framework.js](../src/components/governance-framework.js)).
- **No student disadvantaged:** within-subjects design means everyone gets both formats; counterbalancing balances any format effect across units so assessed writing is not systematically affected by arm.
- **Use formative items** for the comprehension measure (not graded marks) so measurement never affects a student's record.
- **Notice + opt-out:** inform students that presentation is being trialled and allow opting out to the default (Arm A).
- **Data minimisation:** reuse existing event fields; only add the EAL field if there is a lawful basis and clear value.

## 8. Instrumentation checklist (minimal build)

1. Authored chunk-boundary metadata for the 2 test units (array of markers; consumed by `unit-reader`).
2. `presentationArm` assignment + persistence in `STATE`; deterministic hash.
3. Comprehension MCQ block per test unit (reuse `quiz()`).
4. One-item Paas effort slider at unit end (reuse survey pattern) + log.
5. Exit/step logging for time-on-task and drop-off.
6. New event types + `presentationArm` in [analytics.js](../src/analytics.js); confirm they map to the xAPI profile.
7. A small read-out (lecturer analytics) summarising the measures by arm and subgroup.

## 9. Phasing

1. **Build** Arm B for 2 matched units with authored boundaries (reuse parked `unit-reader`).
2. **Instrument** measures + condition logging (§8).
3. **Pilot** for a defined window across one cohort.
4. **Analyse** against §5; **decide** against §6.
5. Only then consider course-wide rollout (with scaffolds that **fade** by `skill_status`, per review §5).

---

### Out of scope (deliberately)
- Course-wide redesign before data exists.
- Fragmenting readings or connected explanations in either arm.
- Replacing the reading-task (it already embodies the right principles — review §6).
