# Reviewed Module Differentiation and ILP Plan

## Purpose
This planning pack defines how to:
- increase challenge and pace depth,
- differentiate fairly across levels,
- foreground continuous writing and extensive reading,
- develop soft skills implicitly inside academic tasks,
- implement individual learning plans (ILPs) through student, tutor, lecturer, and AI collaboration.
- operationalize a heutagogical minimum viable framework for independent, self-directed learning.

Scope is aligned to the current module architecture:
- 20 units + 6 assessments in 5 phases ([content/units/index.js](../content/units/index.js))
- extensive reading tiers ([content/readings.js](../content/readings.js))
- resource library seed model ([content/resources.js](../content/resources.js))
- micro-modules ([content/micro-modules/index.js](../content/micro-modules/index.js))

Operational companion:
- Unit 1-6 writing rubric ladder ([docs/unit1-6-writing-rubric-ladder.md](./unit1-6-writing-rubric-ladder.md))

---

## Heutagogy MVP Framework (Module-Wide)

Design principle:
- Keep common academic standards, while increasing learner agency in goals, pathways, evidence mode, and reflection.

Minimum viable heutagogy components (required in every 2-week cycle):
1. Learning Contract (negotiated): student defines one inquiry question, one output choice, and one capability target.
2. Learner Choice Window: at least one task includes controlled choice (topic, audience, or format) within shared rubric criteria.
3. Double-Loop Reflection: students report both what they learned and how their learning strategy changed.
4. Capability Portfolio Evidence: students store artifacts showing transfer across contexts, not only task completion.
5. Co-Assessment Touchpoint: student self-assessment compared with tutor/lecturer judgement during ILP review.

Heutagogy fairness guardrails:
- outcomes and grading criteria remain common,
- choice is structured (bounded) not unbounded,
- moderation checks ensure pathway decisions are evidence-based,
- students can opt up without penalty.

---

## 1) Pathway Decision Logic (Fair and Evidence-Based)

### 1.1 Pathways
- Supported Pathway: high scaffolding, reduced task complexity, strong tutor/AI prompting.
- Core Pathway: standard module challenge and independence.
- Advanced Pathway: low scaffolding, higher synthesis and transfer demands.

All pathways target the same unit and module outcomes. Differentiation changes support, depth, and complexity, not outcome access.

### 1.2 Placement Evidence (no single-point decisions)
Use a rolling evidence bundle:
- Diagnostic reading task (comprehension + inference + critique)
- Baseline writing sample (argument quality + structure + language control)
- First 2 weeks engagement evidence (task completion quality, revision behavior)
- Tutor observation notes (discussion quality, help-seeking, autonomy)

### 1.3 Decision Rubric (0-4 scale)
Score each dimension from 0 to 4:
1. Reading comprehension and interpretation
2. Critical analysis and evaluation
3. Argument structure and evidence integration
4. Academic language and referencing control
5. Revision quality (response to feedback)
6. Learning behaviors (consistency, autonomy, collaboration)

Weighted index:
- Reading/analysis: 35%
- Writing/argument: 35%
- Revision behavior: 20%
- Learning behaviors: 10%

Suggested entry bands:
- 0.0-1.9: Supported
- 2.0-3.1: Core
- 3.2-4.0: Advanced

### 1.4 Movement Rules (equity safeguard)
- Review cycle every 2 weeks.
- Move up if 2 consecutive cycles exceed pathway threshold.
- Move down only after combined evidence from at least 3 dimensions and tutor review.
- Students may opt up for specific tasks (stretch option) without permanent pathway change.

### 1.5 Fairness Controls
- Same outcome statements and summative rubrics for all.
- Different challenge pathways use common rubric domains with level descriptors.
- Double moderation for pathway changes (tutor proposes, lecturer confirms).
- Audit report each month by cohort subgroup (pathway distribution, movement, outcomes).

---

## 2) Differentiation Rules by Task Type

For every major task in each unit:
- Supported: scaffolded prompt, chunked checklist, model paragraph, minimum evidence target.
- Core: standard prompt, guided structure, expected evidence target.
- Advanced: open framing, additional source requirement, counter-position and transfer requirement.

Minimum challenge rules:
- Every reading task includes interpretation + critique (not summary only).
- Every writing task includes evidence use + reflection/revision step.
- Every 2-week cycle includes at least one transfer task (apply concept to new context).

---

## 3) Continuous Writing Spine (Foregrounded)

Target requirement:
- All students reach full-essay writing capability by Unit 6 (with differentiated scaffolding, not different standards).

### 3.1 Weekly writing cadence (all pathways)
- Session 1: Reading response note (120-180 words)
- Session 2: Analytical paragraph draft (180-250 words)
- Session 3: Revision and expansion (250-400 words)

### 3.2 Across-cycle accumulation
- Weeks 1-2: paragraph quality and evidence use
- Weeks 3-4: multi-paragraph cohesion and counter-argument
- Weeks 5-6: integrated short essay/policy brief section

### 3.2a Unit 1-6 accelerated writing progression (essay by Unit 6)
- Unit 1: Diagnostic paragraph (150-200 words): claim + one reason + reflection sentence.
- Unit 2: Structured paragraph set (2 x 180-220 words): claim-evidence-explain in two linked paragraphs.
- Unit 3: Mini-response (300-400 words): intro + one body paragraph + short conclusion.
- Unit 4: Comparative response (400-500 words): two-source comparison with in-text citation.
- Unit 5: Argument build (500-650 words): thesis + two body paragraphs + counterpoint sentence.
- Unit 6: Full essay benchmark (700-900 words): introduction, 3 body paragraphs, counter-argument/rebuttal, conclusion, reference list.

Pathway differentiation at Unit 6 (same outcome, different support):
- Supported: full essay with scaffolded outline, paragraph frames, mandatory drafting conference.
- Core: full essay with standard outline guide and one feedback cycle.
- Advanced: full essay with independent structure, stronger synthesis requirement, and explicit transfer section.

Essay quality gate at Unit 6 (applies to all pathways):
- clear thesis and argument line,
- minimum evidence threshold (at least 3 credible sources),
- counter-argument engagement,
- citation and referencing accuracy,
- revision evidence (draft -> feedback -> revision).

### 3.3 Revision as compulsory evidence
Submission check must include:
- initial draft,
- feedback notes (AI/tutor/peer),
- revised draft,
- 80-120 word change log explaining what changed and why.

---

## 4) Extensive Reading Spine (Foregrounded)

### 4.1 Core structure
Every unit cluster includes:
- one in-module text,
- one cross-module chapter extract,
- one optional enrichment reading by pathway.

### 4.2 Reading outputs
Each student produces:
- chapter reading log (key concept, claim, evidence, critique, transfer),
- synthesis response linking chapter to current unit objective,
- vocabulary and concept bank updates.

### 4.3 Difficulty by pathway
- Supported: shorter extracts + guided questions + glossary scaffolds.
- Core: standard chapter extracts + synthesis prompts.
- Advanced: longer extracts + debate prompts + contrasting author views.

---

## 5) Resource Library Stocking Logic

## 5.1 Minimum inventory standard (per objective)
Per objective in each phase, stock at least:
- 3 Supported resources
- 3 Core resources
- 3 Advanced resources

Resource types should include at minimum:
- explainer (concept support)
- model/example (worked quality)
- practice task (application)
- challenge text/chapter (critical extension)

### 5.2 Resource metadata schema
Add fields to each resource item (or maintain in companion map):
- objectiveId
- pathwayLevel: supported | core | advanced
- skillDomain: reading | writing | argument | source-eval | citation | revision
- softSkillFocus: collaboration | communication | self-management | ethical judgement | adaptability
- cognitiveLevel: understand | apply | analyze | evaluate | create
- readingLoad: light | medium | heavy
- estimatedMinutes
- prerequisiteIds
- evidenceOutputType

Example metadata object:

```json
{
  "id": "r_new_101",
  "objectiveId": "phase3.argument.integration",
  "pathwayLevel": "advanced",
  "skillDomain": ["writing", "argument"],
  "softSkillFocus": ["communication", "ethical judgement"],
  "cognitiveLevel": "evaluate",
  "readingLoad": "heavy",
  "estimatedMinutes": 35,
  "prerequisiteIds": ["u12", "u13"],
  "evidenceOutputType": "counter-argument paragraph"
}
```

### 5.3 Resource quality gate
Before publication in library:
- objective alignment check,
- pathway fit check,
- accessibility check,
- source credibility check,
- output linkage check (what learner must produce after using it).

---

## 6) ILP Model (Student-Tutor-Lecturer-AI)

### 6.1 ILP structure (one page per student)
Required fields:
- current pathway + reason
- strengths and growth priorities
- fortnight targets (reading, writing, soft-skill target)
- learner contract fields (inquiry question, chosen evidence mode, success criteria)
- agreed supports/resources
- evidence checkpoints and due dates
- review outcome and next-step decision

### 6.2 Four-party roles
- Student: sets personal target and reflection evidence.
- Tutor: coaching notes, resource prescription, pathway recommendation.
- Lecturer: moderation, fairness check, final pathway decision.
- AI: daily nudges, retrieval prompts, feedback summaries, revision suggestions.

### 6.3 ILP cadence
- Weekly: 10-minute student-tutor check.
- Fortnightly: formal ILP review with tutor + lecturer sign-off.
- Monthly: cohort fairness and progression audit.

### 6.4 ILP meeting protocol
1. Review evidence from last cycle.
2. Compare outcomes vs targets.
3. Decide pathway action: hold, stretch, or intensify support.
4. Set next 2-week reading/writing targets.
5. Assign exact resources and accountability dates.

### 6.5 Heutagogy checkpoints in ILP review
- Student explains why the chosen inquiry/output was selected.
- Student submits double-loop reflection (content insight + strategy shift).
- Tutor and lecturer verify transfer evidence in capability portfolio.
- AI feedback logs are reviewed for quality of prompt use and revision decisions.

---

## 7) Soft Skills Integration (Implicit by Design)

Soft skills are not separate lessons; they are embedded in task design:
- Communication: audience-aware writing, peer review clarity.
- Collaboration: group synthesis tasks and accountable contribution logs.
- Self-management: staged deadlines, revision planning, ILP commitments.
- Critical judgement: source verification, counter-argument handling, ethical AI use.
- Adaptability: genre shifts, transfer tasks, pathway movement.

For each unit task, include one implicit soft-skill signal in rubric descriptors.

---

## 8) Mapping to the Reviewed Module (Phase + Unit Clusters)

## Phase 1: Understanding the Landscape (Units 1-3 + Assessment 1)
Current emphasis:
- AI world, information ecosystem, digital critical thinking.
Differentiation overlay:
- Supported: guided misinformation identification + scaffolded logs.
- Core: independent ecosystem analysis with cited examples.
- Advanced: competing interpretation analysis and policy implications.
Foregrounded writing:
- daily observation logs -> analytical paragraphs -> mini-response draft (Unit 3).
Foregrounded reading:
- foundational chapter extracts on digital literacy and media influence.
Soft skills:
- self-awareness, ethical judgement, communication.

## Phase 2: Finding and Evaluating Knowledge (Units 4-9 + Assessments 2-3)
Current emphasis:
- deep work, source hierarchy, search tools, SIFT, citation ethics.
Differentiation overlay:
- Supported: structured source-verification templates.
- Core: independent source comparison and verdict writing.
- Advanced: multi-source conflict resolution and methodological critique.
Foregrounded writing:
- Unit 4-6 essay acceleration: comparative response -> argument build -> full essay benchmark (Unit 6), then claim verdict drafts -> methodological note -> editorial synthesis.
Foregrounded reading:
- chapter extracts on research methods and evidence standards from partner modules.
Soft skills:
- analytical discipline, persistence, decision quality.

## Phase 3: Academic Communication (Units 10-15 + Assessments 4-5)
Current emphasis:
- strategic reading, note-taking, argument structure, voice/register, visual argument, feedback literacy.
Differentiation overlay:
- Supported: paragraph scaffolds and model-based revision.
- Core: integrated multi-paragraph argument.
- Advanced: lens synthesis, genre transfer, critical stance with trade-off analysis.
Foregrounded writing:
- note-to-paragraph pipeline -> text autopsy and genre translation outputs.
Foregrounded reading:
- discipline chapter extracts for argument and methodology interpretation.
Soft skills:
- collaboration, constructive feedback, audience adaptation.

## Phase 4: AI as a Scholarly Tool (Units 16-18 + Assessment 6)
Current emphasis:
- prompting, literature mapping, integrity in AI contexts.
Differentiation overlay:
- Supported: bounded prompt templates and verification checklists.
- Core: independent AI-assisted search with manual validation.
- Advanced: policy-level synthesis balancing ethics, equity, and rigor.
Foregrounded writing:
- position paper -> rebuttal -> synthesis recommendation.
Foregrounded reading:
- policy and ethics chapters from education, philosophy, and assessment modules.
Soft skills:
- ethical reasoning, negotiation, strategic communication.

## Phase 5: Future Scholar (Units 19-20)
Current emphasis:
- literature review synthesis and academic identity.
Differentiation overlay:
- Supported: structured synthesis matrices.
- Core: coherent literature review sections.
- Advanced: independent synthesis argument with methodological positioning.
Foregrounded writing:
- literature matrix -> synthesis paragraph chain -> reflective capstone.
Foregrounded reading:
- advanced scholarly chapters and recent peer-reviewed debates.
Soft skills:
- self-direction, reflective practice, professional identity.

---

## 9) Assessment-Level Differentiation and Fairness

Assessment anchors identified in module:
- A1 Media Intelligence Brief
- A2 Research Archaeology Report
- A3 Source Verification Dossier
- A4 Text Autopsy
- A5 Genre Translation Studio
- A6 AI Ethics Tribunal

Assessment fairness rules:
- Common rubric domains across pathways.
- Different complexity expectations in descriptors, not separate standards.
- Equal access to high grades from all pathways through demonstrated proficiency.
- Transparent evidence requirements published before task start.

---

## 10) Implementation Sequence (No Content Rewrite Yet)

1. Add pathway rubric and fortnight review workflow.
2. Build ILP template and review form (student/tutor/lecturer/AI inputs).
3. Add resource metadata tags and inventory dashboard by objective + pathway.
4. Attach writing spine checkpoints to each phase cluster.
5. Attach extensive reading chapter lists to each phase cluster.
6. Add heutagogy MVP fields to ILPs, pilot runbooks, and moderation notes.
7. Pilot for one phase (recommended: Phase 3), then scale.

---

## 11) Immediate Planning Outputs to Prepare Next

- Pathway moderation rubric form (operational use).
- ILP template (student-facing + staff-facing views).
- Resource tagging matrix and stock-take sheet.
- Phase 3 pilot plan with exact weekly checkpoints and evidence artifacts.

