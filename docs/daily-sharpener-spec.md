# Daily Sharpener — Spaced Repetition for LitApp

**Status:** Spec / proposed
**Owner:** Yusuf Feltman
**Pedagogical basis:** Spaced repetition (Ebbinghaus forgetting curve), retrieval practice, Leitner box scheduling — layered on the app's existing Vygotskian ZPD/mastery engine.

---

## 1. Problem

LitApp's adaptive engine ([src/state.js](../src/state.js)) records, per skill:

- `skill_scores[skillId]` — full history of `{ score (0–5), timestamp, source, triggered_by }`
- `skill_status[skillId]` — `untested | weak | developing | strong`
- `needs_remediation[]` — skills flagged after 2 consecutive sub-3 scores

But **nothing ever resurfaces a weak skill.** A student fails *citation_practice*, gets flagged, and the flag sits inert. There is no mechanism that says "you practised this 8 days ago and were shaky — let's refresh it." This is the single biggest retention gap in the app, and the data to close it already exists.

## 2. Goal

A **Daily Sharpener** card on the student dashboard that resurfaces the skill most *due* for review and launches the matching micro-module in one tap. Spacing follows mastery: weaker skills come back sooner, mastered skills come back rarely. No new content, no new AI prompts — pure scheduling over existing assets.

**Non-goals (v1):** streaks/daily-goal pressure (see §9), notifications, new micro-modules.

## 3. What already exists (reuse, do not rebuild)

| Need | Already in codebase |
|---|---|
| "Last practised" timestamp per skill | `skill_scores[skill][n].timestamp` ([state.js:798](../src/state.js)) |
| Mastery tier per skill | `skill_status` + `_updateSkillStatus()` ([state.js:817](../src/state.js)) |
| 6 skill-targeted micro-modules | [content/micro-modules/](../content/micro-modules) — each declares `skill` |
| Launch a module | `window.goToMicroModule(id)` ([app.js:330](../src/app.js)) |
| Pre/post effectiveness tracking | `recordOutcome()` / `closeOutcomes()` ([state.js:916](../src/state.js)) |
| Score capture after a module | `recordSkillScore()` → already calls `closeOutcomes()` |
| Dashboard skill UI to slot beside | `renderSkillMap()` ([student.js:1915](../src/dashboards/student.js)) |
| Persistence + Firebase sync | `saveState()` |

## 4. Skill → module map

```
critical_reading    → reading-strategies
evidence_use        → evidence-booster
argument_structure  → argument-builder
academic_tone       → tone-workshop
source_evaluation   → source-skills
citation_practice   → citation-guide
research_skills     → (no module) → AI Tutor fallback
ai_literacy         → (no module) → AI Tutor fallback
```

6 of 8 skills are module-backed. **v1 schedules only those 6.** `research_skills` and `ai_literacy` route to the AI Tutor with a skill-focused prompt (the recommendation system already supports `ai_tutor` targets) — or are simply excluded from v1 and added when modules exist.

## 5. Scheduling algorithm — Leitner boxes keyed on mastery

We do **not** use raw SM-2: our "items" are skills scored 0–5, not binary flashcards, and we already have a mastery classifier. A Leitner box maps cleanly onto `skill_status`.

### Intervals

| Box | Mastery tier | Review interval |
|---|---|---|
| 1 | `weak` | 1 day |
| 2 | `developing` | 3 days |
| 3 | `strong` (1st time) | 7 days |
| 4 | `strong` (held ≥2 reviews) | 14 days |

`untested` skills are **not** scheduled (nothing to review yet — they belong to the existing "use the AI tools" onboarding path).

### "Due" computation (v1 — derived, zero schema change)

```
lastPracticed = last skill_scores[skill].timestamp
intervalDays  = { weak:1, developing:3, strong:7 }[status]   // box 4 is v2
dueAt         = lastPracticed + intervalDays
isDue         = status ∈ {weak,developing,strong} AND now >= dueAt
```

### Queue ordering

1. `weak` before `developing` before `strong`
2. Within a tier, **most overdue first** (largest `now − dueAt`)
3. Tie-break: skill with fewest total interactions (least-rehearsed)

### Promotion / demotion (handled by the *existing* score loop)

When a Sharpener review completes, `recordSkillScore()` runs as it does today, updating `skill_status`. Because the box is *derived from status*, promotion/demotion is automatic:

- score improves → status rises (e.g. weak→developing) → longer interval next time
- score declines / stays <3 → status holds or drops → back to a 1-day interval

No separate box bookkeeping needed in v1.

## 6. New module: `src/spaced-review.js` (pure, testable)

```js
export const SKILL_MODULE_MAP = { critical_reading:'reading-strategies', ... };
export const REVIEW_INTERVALS = { weak:1, developing:3, strong:7 };

// Returns sorted array of due items:
// { skillId, moduleId, status, lastPracticedAt, intervalDays, dueAt, daysOverdue }
export function getReviewQueue(adaptive, now = Date.now()) { ... }

// Top of queue or null
export function getNextDue(adaptive, now = Date.now()) { ... }

// "You practised Citation Practice 8 days ago — quick 5-minute refresh?"
export function describeDue(item) { ... }
```

Pure functions over the `adaptive` object → unit-testable with no Firebase.

## 7. UI — Daily Sharpener card

Rendered at the top of the student dashboard (above `renderSkillMap`), and in the Android dashboard variant `_renderAndroidStudentDashboard`.

**Due state:**
> 🎯 **Daily Sharpener**
> Citation Practice — you last practised this 8 days ago.
> *A quick refresh keeps it sharp.* **[ Start 5-min refresh → ]**
> *(2 more skills due this week)*

**Empty state (nothing due) — calm, no guilt:**
> ✅ **All sharp.** Nothing due for review today. Come back tomorrow.

Launch button calls `recordOutcome(moduleId, skillId, scoreBefore)` then `goToMicroModule(moduleId)` — wiring the effectiveness loop that already exists.

## 8. Integration points (exact)

| File | Change |
|---|---|
| `src/spaced-review.js` | **new** — scheduling pure functions |
| `src/dashboards/student.js` | render Sharpener card in `renderStudentDashboard` + `_renderAndroidStudentDashboard`; launch handler |
| `src/styles/main.css` | `.sharpener-card` styles (reuse skill-card / rec-card tokens) |
| `test/spaced-review.test.js` | **new** — interval, due, ordering, empty-queue cases |
| `src/state.js` | **no change in v1** (derived). v2 only: persist `adaptive.reviews` for box-4 expanding intervals |

## 9. Phasing

- **v1 (this PR):** `spaced-review.js` + dashboard card + tests. Derived scheduling, 6 module-backed skills, calm empty state. No schema change.
- **v2:** persist `adaptive.reviews` boxes for true expanding intervals (box 4 = 14 days, box 5 = 30); AI-Tutor fallback for the 2 uncovered skills.
- **v3 (separate decision):** gentle **weekly rhythm** indicator ("3 of 5 study days") — habit formation *without* a punitive daily streak. Deliberately deferred; streaks can penalise legitimate non-study days and induce anxiety in a credit-bearing course.

## 10. Edge cases

- **No scored skills yet** → card hidden entirely (don't nag new users).
- **Status changed manually / by other tools** → fine; queue recomputes from live `skill_status` each render.
- **Clock skew / future timestamps** → clamp `daysOverdue ≥ 0`.
- **Module mid-completion** → existing micro-module flow owns its own state; Sharpener only launches.
- **All due skills are `strong`** → still show, but framed as "keep it sharp," lower visual urgency than focus areas.

## 11. Success signal

Reuse `adaptive.outcomes`: a Sharpener review that raises the score closes a pending outcome as `improved`. Aggregate `improved` rate across Sharpener-sourced outcomes = the metric for whether spacing is working. Already computable from existing data; surfaceable later in the lecturer cohort view.
