# Lesson-Presentation A/B — Ethics Notice & Opt-Out

**Status:** For approval before any live run
**Scope:** unit07 and unit08 only; first-year ALE00Y1 cohort
**Aligns with:** [`governance/dpia/`](../governance/dpia) (01–05) and [`governance/equity/equity-review-framework.md`](../governance/equity/equity-review-framework.md)

This documents the participant notice, the opt-out mechanism, and how the trial meets the project's data-protection and equity commitments. It is the non-code gate that must be signed off before enabling the trial.

---

## 1. What the trial does (processing description)

Two presentation formats of the same unit content are compared:
- **Arm A** — the current single-scroll unit (control).
- **Arm B** — the same content segmented at meaningful activity boundaries (no content changed; connected reading never fragmented).

Assignment is within-subjects and counterbalanced: each student sees one format on unit 7 and the other on unit 8. At the end of each test unit, a short, **ungraded** quick-check (comprehension + one effort question) is offered.

Cross-ref: DPIA [01-processing-description](../governance/dpia/01-processing-description.md).

## 2. Lawful basis & purpose

The purpose is **course improvement** — deciding, on evidence, how to present lesson content for this cohort. Processing is limited to what that purpose requires. The comprehension/effort responses are **formative and never contribute to any mark or record**.

Cross-ref: DPIA [02-lawful-basis](../governance/dpia/02-lawful-basis.md).

## 3. Data collected (data minimisation)

Per completed test unit, one `lesson_completed` event records:

| Field | Why |
|---|---|
| presentation arm (A/B) | the comparison |
| comprehension score | primary outcome |
| effort rating (1–9) | perceived load |
| reading completion, time-on-task | engagement |
| writing level (1–5, already captured) | transfer |
| prior-knowledge band (lower/higher) | the moderator check |

No new personal data is collected. Events flow through the **existing** analytics pipeline (`analytics/raw-events`) under the canonical-student key already used for roster analytics — no extra identifiers. The prior-knowledge **band** is a coarse derived value (not the underlying scores). Home-language (EAL) is **not** collected unless separately approved.

Cross-ref: DPIA [03-risk-assessment](../governance/dpia/03-risk-assessment.md), [04-safeguards](../governance/dpia/04-safeguards.md).

## 4. Voluntary participation & opt-out (data-subject rights)

- **Notice:** on first reaching a test unit, students see a one-time, dismissible notice explaining the trial is voluntary, anonymous for analysis, and has no effect on marks.
- **Opt-out:** one click ("Use the standard layout") sets a persisted `experiment.optOut` flag. Opted-out students are **never assigned an arm, never segmented, and never logged** — they get the standard scroll with no quick-check. The current unit re-renders immediately in the control layout.
- **Reversible:** the preference is stored in the student's state; `setLessonExperimentOptOut(false)` re-enables participation (a settings toggle can expose this).
- **No detriment:** because the design is within-subjects and the check is ungraded, neither participating nor opting out advantages or disadvantages any student.

Implementation: [`src/components/experiment-notice.js`](../src/components/experiment-notice.js); preference persisted in `STATE.experiment` ([`src/state.js`](../src/state.js)).

Cross-ref: DPIA [05-data-subject-rights](../governance/dpia/05-data-subject-rights.md).

## 5. Equity considerations

- **No graded impact:** the measure is formative; counterbalancing means any format effect on assessed writing is balanced across the two units.
- **Subgroup care:** outcomes are analysed by prior-knowledge band specifically to check the format does not disadvantage lower-prior-knowledge or EAL-profile students — and to detect if it *helps* them (the hypothesis). If the read-out shows Arm B harming any subgroup, the trial stops.
- **Access:** both arms run on the same web/Android build; neither requires extra data, bandwidth, or device capability. Arm B keeps the reading continuous and the PDF/print path available (mobile-friendly).

Cross-ref: [equity-review-framework](../governance/equity/equity-review-framework.md).

## 6. Retention & governance

- Events are retained under the existing analytics retention policy; no separate store is created.
- The trial is scoped to two units and a defined window; disabling it is a one-line change (`TEST_UNIT_IDS`), after which no further events are produced.
- Draft comprehension items require lecturer sign-off ([comprehension-items-review.md](comprehension-items-review.md)) before the run.

## 7. Participant notice text (as shown in-app)

> **We're trialling how this unit is laid out.**
> A short, anonymous quick-check at the end helps us learn which layout supports learning best. It's **voluntary** and **does not affect your marks**. You can use the standard layout instead at any time.
> [ Got it ] [ Use the standard layout ]

## 8. Approval checklist (before enabling)

- ☐ Comprehension items reviewed and signed off (separate document)
- ☐ This notice approved by the module owner
- ☐ DPIA cross-references confirmed current
- ☐ Equity reviewer sign-off
- ☐ Run window and cohort communication agreed

**Approved by:** ________________  **Role:** ____________  **Date:** ____________
