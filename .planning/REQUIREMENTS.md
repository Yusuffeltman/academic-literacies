# Requirements: Academic Literacies Learning Analytics

**Defined:** 2026-03-06
**Core Value:** Make student development toward academic community membership visible and measurable, so struggling students are identified early and supported through evidence-based, individually-tailored learning plans.

## v1 Requirements

### Privacy & Ethics

- [ ] **PRIV-01**: Data Protection Impact Assessment (DPIA) — POPIA-compliant privacy framework as foundation document
- [ ] **PRIV-02**: Data retention and deletion specification — data lifecycle rules and student deletion rights
- [ ] **PRIV-03**: Equity review framework — bias check process applied to every metric before dashboard inclusion

### Data Collection

- [ ] **DATA-01**: xAPI event schema for all trackable student interactions (reading modules, writing tasks, quizzes, discussion forums)
- [ ] **DATA-02**: Offline event queue and batch sync specification — capture events when offline, reconcile when connected
- [ ] **DATA-03**: Self-report instruments — student self-assessment of confidence, learning goals, and strategy use
- [ ] **DATA-04**: Writing sample collection — capture writing artifacts for academic discourse analysis (CoP indicator)

### Core Metrics

- [ ] **METR-01**: Engagement metrics — session frequency, duration, activity completion rates with formulas and thresholds
- [ ] **METR-02**: Performance trends — quiz scores and writing quality progression over time with trend analysis
- [ ] **METR-03**: Learning path progression — curriculum position and pace relative to expected trajectory
- [ ] **METR-04**: Time-on-task patterns — time distribution across activity types with normalization for connectivity constraints

### CoP Metrics

- [ ] **COP-01**: Participation trajectory — track movement from peripheral to full participation (posting frequency, reply depth, initiation vs response ratio)
- [ ] **COP-02**: Academic discourse adoption — evidence of students adopting academic register in writing and discussion (vocabulary, citation, argument structure)
- [ ] **COP-03**: Peer interaction quality — depth and reciprocity of student-to-student engagement (substantive vs surface interactions)
- [ ] **COP-04**: Cross-context transfer — evidence of applying academic literacy skills across different modules, tasks, and activity types

### SDL Metrics

- [ ] **SDL-01**: Scaffolding dependence index — measure how much support students need and track movement toward independence
- [ ] **SDL-02**: Self-regulation tracking — observable behaviors: goal-setting, planning, progress monitoring, reflection
- [ ] **SDL-03**: Calibration accuracy — correlation between student self-predicted and actual performance (metacognitive awareness)
- [ ] **SDL-04**: Help-seeking patterns — classify as strategic (targeted, timely), dependent (excessive), or avoidant (insufficient)

### Dashboards

- [ ] **DASH-01**: Student self-reflection dashboard — personal growth visualization, goal tracking, next-step suggestions (mobile-first, works offline)
- [ ] **DASH-02**: Tutor consultation dashboard — individual student evidence view for one-on-one meetings and learning plan development
- [ ] **DASH-03**: Teaching team cohort dashboard — cohort-level patterns, at-risk student identification, system health metrics
- [ ] **DASH-04**: Early warning system — automated flags when students cross defined risk thresholds across multiple indicators

### Interventions

- [ ] **INTV-01**: Automated student nudges — context-sensitive prompts triggered by behavior patterns (inactivity, declining engagement, missed milestones)
- [ ] **INTV-02**: Tutor alert triggers — notification rules when students cross risk thresholds, with prioritization
- [ ] **INTV-03**: Individual learning plan templates — evidence-based frameworks for tutor-student goal setting informed by analytics
- [ ] **INTV-04**: Intervention logging — track what interventions were applied, by whom, and their outcomes over time

## v2 Requirements

### Privacy & Ethics

- **PRIV-04**: Granular consent model — students control what data is collected and who can access it

### Advanced Analytics

- **ADV-01**: Predictive modeling — early identification of at-risk trajectories using machine learning
- **ADV-02**: Social network analysis — map peer interaction networks for CoP structure visualization
- **ADV-03**: NLP-based discourse analysis — automated assessment of academic register adoption in writing

## Out of Scope

| Feature | Reason |
|---------|--------|
| Competitive leaderboards | Antithetical to CoP — creates competition where collaboration is needed |
| Punitive engagement scores | Surveillance framing kills student trust and engagement |
| Automated "will fail" predictions | Stigmatizing, ethically problematic, reinforces deficit framing |
| Gamification (badges, points, streaks) | Undermines intrinsic motivation central to SDL approach |
| Real-time surveillance feeds | Monitoring framing, not learning framing — anti-pattern per research |
| Automated punitive actions | Human judgment required for interventions — no automated penalties |
| Automated writing grading | Writing quality requires human assessment; automated grading is unreliable for academic literacy |
| Coding/implementation | This project produces specifications, not code |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PRIV-01 | Phase 1 | Pending |
| PRIV-02 | Phase 1 | Pending |
| PRIV-03 | Phase 1 | Pending |
| DATA-01 | Phase 2 | Pending |
| DATA-02 | Phase 3 | Pending |
| DATA-03 | Phase 3 | Pending |
| DATA-04 | Phase 2 | Pending |
| METR-01 | Phase 4 | Pending |
| METR-02 | Phase 4 | Pending |
| METR-03 | Phase 4 | Pending |
| METR-04 | Phase 4 | Pending |
| COP-01 | Phase 5 | Pending |
| COP-02 | Phase 5 | Pending |
| COP-03 | Phase 5 | Pending |
| COP-04 | Phase 5 | Pending |
| SDL-01 | Phase 6 | Pending |
| SDL-02 | Phase 6 | Pending |
| SDL-03 | Phase 6 | Pending |
| SDL-04 | Phase 6 | Pending |
| DASH-01 | Phase 7 | Pending |
| DASH-02 | Phase 7 | Pending |
| DASH-03 | Phase 7 | Pending |
| DASH-04 | Phase 7 | Pending |
| INTV-01 | Phase 8 | Pending |
| INTV-02 | Phase 8 | Pending |
| INTV-03 | Phase 8 | Pending |
| INTV-04 | Phase 8 | Pending |

**Coverage:**
- v1 requirements: 27 total
- Mapped to phases: 27
- Unmapped: 0

---
*Requirements defined: 2026-03-06*
*Last updated: 2026-03-06 after roadmap creation*
