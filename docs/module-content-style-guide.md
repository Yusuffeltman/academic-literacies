# Module Content Style Guide

This guide standardizes authoring for `ALE00Y1` unit content so updates remain coherent across all units.

## 1) Required Unit Structure

Every unit should retain this sequence (unless a unit has a clearly justified pedagogic exception):

1. Unit title + lead
2. Learning outcomes
3. Video / pre-engagement segment
4. Diagnostic quizzes
5. Core learning activities (reading/visual/prompt or equivalent)
6. **Pathway Challenge Structure** block
7. **Essay Milestone** block
8. Heutagogy / learning-cycle reflection where implemented
9. Unit closing statement

## 2) Pathway Challenge Standard

Use `pathwayChallenge(...)` from `src/components/activities.js`.

### Track labels (fixed)
- Supported: **Minimum completion track**
- Core: **Expected proficiency track**
- Advanced: **Stretch and extension track**

### Design rules
- Keep each track to 2 clear action bullets.
- Escalate cognitive demand from Supported → Core → Advanced.
- Make tasks observable and assessable (avoid vague verbs like “understand more”).
- End users complete one track fully, then can move up.

### Good task verb set
- Identify, verify, compare, evaluate, justify, synthesize, revise, map, integrate.

## 3) Essay Milestone Standard

Use `essayMilestone(...)` from `src/components/activities.js`.

### Checklist format
- 3–4 bullets only.
- Each bullet must describe evidence of completion.
- Align milestone to writing progression stage of the unit.

### Progression expectation
- Early units: claim formation + evidence basics.
- Mid units: synthesis, citation integrity, analytical depth.
- Unit 6 onward: full-essay readiness and iterative revision quality.

## 4) Heutagogy Integration Standard

Use `heutagogyCycle(...)` where learner agency is required.

Each cycle should preserve:
- Learning contract goal
- Pathway choice
- Double-loop reflection
- Evidence note
- Save + AI metacognitive coaching actions

### Moderation expectation
- Tutor/Lecturer moderation should classify entries as:
  - Approved
  - Needs revision
  - Pending
- Moderation notes must be actionable and criterion-referenced.

## 5) Tone and Register

- Keep language academically rigorous but accessible.
- Prefer explicit, direct instruction over motivational filler.
- Avoid unbounded claims (“always”, “proves”) unless strongly justified.
- Use evidence-oriented phrasing:
  - “The evidence suggests...”
  - “This indicates...”
  - “A limitation is...”

## 6) Assessment Alignment Rules

When editing unit tasks:
- Ensure each major task maps to at least one stated learning outcome.
- Ensure quiz items test reasoning, not recall only.
- Ensure writing prompts request explicit argument + evidence behaviour.

## 7) Change-Control Checklist (Before Merging)

For every unit edit, confirm:

- [ ] Pathway block present and coherent
- [ ] Essay milestone present and stage-appropriate
- [ ] Difficulty progression across tracks is clear
- [ ] Writing task demands evidence and analysis
- [ ] No contradiction with integrity/disclosure expectations
- [ ] Unit structure check passes (`npm run check:unit-structure`)
- [ ] Build passes (`npm run build`)

## 8) File Targets for Ongoing Maintenance

- Unit files: `content/units/unit01.js` … `content/units/unit20.js`
- Shared generators: `src/components/activities.js`
- Tutor/Lecturer moderation surfaces:
  - `src/dashboards/tutor.js`
  - `src/dashboards/lecturer.js`

---

Use this guide as the baseline for all future content revisions so structure, challenge, and progression remain consistent across the module.