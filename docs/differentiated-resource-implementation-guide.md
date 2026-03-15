# Differentiated Resource Implementation Guide

Use this guide with the generated assignment file:
- [docs/differentiated-resource-assignment.csv](./differentiated-resource-assignment.csv)
- [docs/resource-stocktake-matrix.csv](./resource-stocktake-matrix.csv)
- [docs/ilp-template.md](./ilp-template.md)
- [docs/pathway-moderation-rubric.md](./pathway-moderation-rubric.md)

## What was generated
The planner redistributes current seed resources into pathway-level use-cases for each reviewed-module objective:
- Supported
- Core
- Advanced

Each assignment row includes:
- objective and phase alignment,
- matched resource and skill-tags,
- pathway-specific adaptation instruction,
- expected evidence output,
- implicit soft-skill focus,
- implementation priority.

## How to use in week planning
1. Filter [docs/differentiated-resource-assignment.csv](./differentiated-resource-assignment.csv) by current phase and objective.
2. Select at least 1 resource per pathway for each tutorial/contact cycle.
3. Copy the adaptation instruction into session activities.
4. Copy the evidence output into ILP checkpoint fields.
5. Use moderation rubric evidence to confirm/adjust pathway placement fortnightly.

## How to use in ILP meetings
For each student:
- choose pathway row(s) from the assignment file,
- assign one reading-focused and one writing-focused resource/action,
- capture due date and expected evidence in [docs/ilp-template.md](./ilp-template.md),
- review output quality against the pathway rubric.

## Fairness controls to keep active
- Same objectives and rubric domains across all pathways.
- Different scaffolding and complexity, not different standards.
- Opt-up option available each cycle.
- Pathway changes only after evidence from multiple sources.

## Immediate rollout (2 weeks)
### Week 1
- Pilot in one high-load cluster (recommended: Phase 3 objectives).
- Assign one differentiated reading task + one differentiated writing task.
- Collect outputs and tutor notes.

### Week 2
- Review outputs in moderation meeting.
- Update ILPs (hold/move/opt-up decisions).
- Record resource effectiveness and identify missing supported/advanced assets.

## Gap closure priority
From current matrix state, pathway-tagged assets are missing at supported and advanced levels.
Priority action:
1. Keep using current resources with adaptations (now available in assignment CSV).
2. Add/curate pathway-specific assets where repeated adaptation is insufficient.
3. Retag stock-take and regenerate counts after additions.

## Refresh process
When resources change:
1. Run `node ./scripts/prefill_stocktake.mjs`
2. Run `node ./scripts/generate_differentiated_assignments.mjs`
3. Re-open CSVs and review new gaps/assignments.
