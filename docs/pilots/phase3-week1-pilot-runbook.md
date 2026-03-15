# Phase 3 Week 1 Pilot Runbook

This pilot tests differentiated delivery in Phase 3 using one reading task and one writing task per pathway.

## Pilot Files
- Assignment set: [docs/phase3-week1-pilot.csv](./phase3-week1-pilot.csv)
- Full differentiated planner: [docs/differentiated-resource-assignment.csv](./differentiated-resource-assignment.csv)
- ILP form: [docs/ilp-template.md](./ilp-template.md)
- Moderation rubric: [docs/pathway-moderation-rubric.md](./pathway-moderation-rubric.md)

## Pilot Scope (Week 1)
Objectives tested:
- `p3.read.deep_academic`
- `p3.write.argument_synthesis`

Pathways tested:
- Supported
- Core
- Advanced

Rows included:
- 6 total (2 objectives × 3 pathways)

## Delivery Protocol
1. Use pathway decisions already recorded in moderation rubric.
2. Assign each student the row matching their pathway from [docs/phase3-week1-pilot.csv](./phase3-week1-pilot.csv).
3. Run reading task first, then writing task.
4. Require evidence output exactly as specified in CSV.
5. Add one bounded learner-choice element (chosen angle, audience, or output framing).
6. Capture ILP checkpoint for each student (quality + completion + reflection).

## Tutor Session Structure
- 10 min: objective framing and expected evidence
- 20 min: differentiated reading task
- 20 min: writing task draft
- 10 min: self-check + AI feedback prompt
- 10 min: tutor feedback and ILP notes

## Evidence to Collect
For each student:
- submission artifact (reading + writing)
- completion status (on time / late / incomplete)
- quality note against pathway expectations
- one revision action after feedback
- soft-skill observation (communication, self-management, collaboration, critical judgement, or adaptability)
- 80-120 word double-loop reflection (what changed in understanding + what changed in strategy)

## Evaluation Metrics (end of week)
- Completion rate by pathway
- Quality attainment by pathway (met / partially met / not met)
- Revision uptake rate
- Time-on-task realism (too easy / appropriate / too hard)
- Tutor confidence in pathway placement (hold / adjust)
- Learner-agency indicator (choice quality + reflection quality)

## Decision Rules After Pilot
- If >70% in a pathway finish quickly with weak depth -> increase challenge for that pathway.
- If <50% complete with high confusion -> increase scaffolding for that pathway.
- If quality and pace are balanced -> keep current design and scale to next week.

## Fortnight Review Link
Use pilot evidence in the next moderation meeting to:
- confirm or adjust pathway placements,
- update ILPs,
- flag resource gaps needing supported/advanced-specific assets.

## Quick Start Command (optional checks)
To verify pilot row count:
- `Import-Csv .\docs\phase3-week1-pilot.csv | Measure-Object`
