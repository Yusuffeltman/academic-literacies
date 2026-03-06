# Phase 1: Privacy & Ethics Foundation - Research

**Researched:** 2026-03-06
**Domain:** Data governance, privacy regulation (POPIA), equity frameworks for learning analytics
**Confidence:** HIGH (regulatory framework well-documented; established LA ethics literature)

## Summary

This phase produces four governance documents: a Data Protection Impact Assessment (DPIA), a data retention and deletion specification, an equity review framework, and an access control matrix. All documents constrain every subsequent phase of the analytics specification.

The primary regulatory framework is South Africa's Protection of Personal Information Act (POPIA), which defines eight conditions for lawful processing. For a university offering learning analytics as part of course delivery, the strongest lawful basis is **legitimate interest** (Section 11(1)(f)) combined with **contractual necessity** (Section 11(1)(b)), rather than standalone consent. This aligns with the locked decision that analytics are part of the course experience, not a separate opt-in. The established learning analytics ethics literature (Jisc Code of Practice, DELICATE checklist, SHEILA framework) provides tested structures for each governance document.

The South African educational context introduces specific equity concerns -- load-shedding disrupting connectivity, mobile data costs, multilingual student populations, and the legacy of unequal access to prior education -- that must be embedded in the equity review framework rather than treated as edge cases.

**Primary recommendation:** Structure the DPIA around POPIA's eight conditions mapped to learning analytics activities, use the Jisc Code of Practice areas as the governance backbone, and build the equity checklist around the four identified SA-specific bias risks.

## Standard Stack

This is a specification/document project, not a code project. "Stack" here means the reference frameworks and standards that structure the governance documents.

### Core Frameworks
| Framework | Source | Purpose | Why Standard |
|-----------|--------|---------|--------------|
| POPIA (Act 4 of 2013) | SA Government | Primary legal compliance framework | Mandatory for SA institutions |
| POPIA 8 Conditions | Sections 8-25 | Structure for assessing lawful processing | Required by law |
| USAf POPIA Code of Conduct | Universities South Africa | University-specific POPIA guidance | Sector-specific interpretation |
| Jisc Code of Practice for LA | Jisc (updated 2023) | 8-area ethics framework for learning analytics | Most widely adopted LA ethics framework globally |
| DELICATE Checklist | Drachsler & Greller (2016) | 8-point trust checklist for LA implementation | Standard academic reference for LA privacy |

### Supporting References
| Framework | Source | Purpose | When to Use |
|-----------|--------|---------|-------------|
| GDPR DPIA Template | EU/ICO | DPIA section structure (adaptable to POPIA) | DPIA document structure |
| SHEILA Framework | EU project | Institutional strategy for LA adoption | Policy-level governance |
| Open University LA Policy | OU UK | Exemplar institutional LA policy | Reference for access control and consent models |
| Fairlearn Fairness Metrics | Microsoft | Bias measurement concepts | Equity review criteria definitions |

### Not Needed
| Instead of | Don't Use | Reason |
|------------|-----------|--------|
| GDPR compliance | GDPR-specific templates verbatim | POPIA is the governing law; GDPR structure is adaptable but requirements differ |
| Algorithmic fairness tools | Fairlearn/AIF360 code tools | This phase produces documents, not code; concepts are useful, tooling is not |
| Granular consent frameworks | Complex consent management | Locked decision: simple consent model for v1 |

## Architecture Patterns

### Recommended Document Structure

```
governance/
  dpia/
    01-processing-description.md      # What data, why, how
    02-lawful-basis.md                 # POPIA conditions mapping
    03-risk-assessment.md              # Privacy risks and impacts
    04-safeguards.md                   # Mitigation measures
    05-data-subject-rights.md          # Student rights implementation
  retention/
    data-lifecycle-spec.md             # Categories, periods, deletion procedures
  equity/
    equity-review-framework.md         # Bias checklist and review process
  access-control/
    access-control-matrix.md           # Role-data permission mapping
```

### Pattern 1: DPIA Structured Around POPIA 8 Conditions

**What:** Organize the DPIA so that each of POPIA's eight conditions for lawful processing is explicitly addressed for every data collection activity in the analytics system.

**When to use:** This is the primary structure for the DPIA document.

**Structure:**

```markdown
## Data Collection Activity: [Activity Name]

### 1. Accountability (Section 8)
- Responsible party: [institution name]
- Information Officer: [role, not individual]
- Delegated processing: [any third parties]

### 2. Processing Limitation (Sections 9-12)
- Lawful basis: [legitimate interest / contractual necessity]
- Adequacy: [why this data is needed, not excessive]
- Relevance: [connection to pedagogical purpose]

### 3. Purpose Specification (Sections 13-14)
- Specific purpose: [pedagogical rationale]
- Retention limit: [end of academic year]
- Student notification: [how students are informed]

### 4. Further Processing Limitation (Section 15)
- Permitted secondary uses: [aggregated cohort analysis]
- Prohibited uses: [punitive, surveillance, third-party commercial]

### 5. Information Quality (Section 16)
- Accuracy measures: [validation, correction procedures]
- Completeness: [handling missing data, connectivity gaps]

### 6. Openness (Sections 17-18)
- Privacy notice: [plain language description]
- Collection notification: [when and how students are told]

### 7. Security Safeguards (Sections 19-22)
- Technical measures: [encryption, access controls]
- Organizational measures: [policies, training]
- Breach notification: [procedures]

### 8. Data Subject Participation (Sections 23-25)
- Access requests: [full export in readable format]
- Correction requests: [process]
- Deletion requests: [available after course ends]
- Objection rights: [Section 11(3) process]
```

### Pattern 2: Role-Based Access Control Matrix

**What:** A simple matrix mapping data categories to audience roles with clear read/no-access permissions.

**When to use:** For the access control specification document.

**Structure:**

```markdown
| Data Category | Student (own data) | Assigned Tutor | Teaching Team | System Admin |
|---------------|-------------------|----------------|---------------|--------------|
| Engagement metrics | Read | Read | Aggregated only | Technical access |
| Performance trends | Read | Read | Aggregated only | Technical access |
| CoP indicators | Read | Read | Aggregated only | Technical access |
| SDL indicators | Read | Read | Aggregated only | Technical access |
| Self-report responses | Read | Read | Aggregated only | Technical access |
| Writing samples | Read | Read | No access | Technical access |
| Raw event logs | No access | No access | No access | Technical access |
```

Key rules:
- Student sees ONLY their own data
- Tutor sees ONLY their assigned students (fixed mapping)
- Teaching team sees ONLY aggregated cohort data (no individual identification)
- "Aggregated only" means minimum group size must be enforced to prevent re-identification

### Pattern 3: Equity Review Checklist (Per-Metric)

**What:** A repeatable checklist applied to every metric before dashboard inclusion, structured around the four SA-specific bias risks.

**When to use:** Before any metric is approved for the analytics specification.

**Structure:**

```markdown
## Metric Equity Review: [Metric Name]

### Connectivity Bias Check
- [ ] Does this metric penalize students with intermittent connectivity?
- [ ] Does load-shedding affect data collection for this metric?
- [ ] Is offline activity captured and reconciled?
- [ ] Are time-based measures adjusted for connectivity interruptions?

### Language Bias Check
- [ ] Does this metric disadvantage multilingual students?
- [ ] Are vocabulary-based measures normed for L2 speakers?
- [ ] Does academic discourse measurement account for code-switching?
- [ ] Is the metric validated across language backgrounds?

### Prior Education Bias Check
- [ ] Does this metric conflate prior schooling quality with current effort?
- [ ] Does baseline measurement separate starting point from growth?
- [ ] Are thresholds set relative to individual trajectory, not cohort norms?
- [ ] Does the metric account for different entry-level preparedness?

### Device Limitation Bias Check
- [ ] Does this metric disadvantage smartphone-only users?
- [ ] Are interaction patterns normalized for small-screen constraints?
- [ ] Does data cost affect willingness to engage with measured activities?
- [ ] Is the metric measurable on low-bandwidth connections?

### Review Decision
- [ ] APPROVED: No significant bias risk identified
- [ ] APPROVED WITH MITIGATION: Bias risk identified, mitigation documented
- [ ] FLAGGED FOR REVIEW: Significant bias risk, requires human review
- [ ] REJECTED: Metric cannot be fairly applied across student population
```

### Anti-Patterns to Avoid

- **Consent-as-compliance theater:** Presenting a consent form that students cannot meaningfully refuse is not genuine consent. Use legitimate interest as the legal basis and focus on transparency and objection rights instead.
- **One-size-fits-all DPIA:** A generic DPIA template that does not address each specific data collection activity fails the "specific, explicitly defined purpose" requirement of POPIA Section 13.
- **Equity as afterthought:** Adding equity review after metrics are designed leads to retrofitting. The checklist must be applied before metric inclusion.
- **Over-aggregation at teaching team level:** Aggregating so aggressively that data becomes useless defeats the purpose. Define minimum group sizes (typically 5-10) rather than removing all granularity.

## Don't Hand-Roll

Problems that have established solutions in the LA governance literature:

| Problem | Don't Build From Scratch | Use Instead | Why |
|---------|--------------------------|-------------|-----|
| DPIA structure | Custom privacy assessment | GDPR DPIA template adapted to POPIA 8 conditions | Legally tested structure; maps directly to regulatory requirements |
| Ethics framework | Custom ethics principles | Jisc Code of Practice 8 areas + DELICATE checklist | 10+ years of institutional adoption; covers all key concerns |
| Consent model rationale | Custom legal argument | POPIA Section 11(1)(b)+(f) legitimate interest analysis | USAf guideline supports this approach for universities |
| Bias detection categories | Generic fairness metrics | SA-specific equity risks (connectivity, language, prior education, device) from context decisions | Context-specific risks are already identified and locked |
| Access control model | Complex RBAC system | Simple 4-role matrix (student, tutor, teaching team, admin) | Locked decision: must be explainable to students in plain language |
| Retention policy | Complex tiered retention | Uniform end-of-academic-year deletion | Locked decision: same rules for all data types |

**Key insight:** The governance literature for learning analytics is mature. The Jisc Code of Practice, DELICATE checklist, and GDPR DPIA templates provide tested structures. The work is adapting these to POPIA and the South African educational context, not inventing from scratch.

## Common Pitfalls

### Pitfall 1: Relying on Consent as Sole Lawful Basis
**What goes wrong:** Under POPIA Section 11(2), consent can be withdrawn at any time. If consent is the sole basis for processing analytics data, a student withdrawal mid-course creates an operational and legal problem -- you must stop processing but analytics may be integral to the course experience.
**Why it happens:** Teams default to consent because it feels most transparent.
**How to avoid:** Use legitimate interest (Section 11(1)(f)) and/or contractual necessity (Section 11(1)(b)) as the primary basis. Document the legitimate interest assessment. Consent is still obtained via enrollment terms, but is not the sole legal ground.
**Warning signs:** DPIA lists only "consent" under lawful basis without mentioning legitimate interest.

### Pitfall 2: Ignoring POPIA Section 11(3) Objection Rights
**What goes wrong:** Even with legitimate interest as the basis, POPIA Section 11(3) gives data subjects the right to object to processing on "reasonable grounds relating to his, her or its particular situation." The DPIA must document how objections are handled.
**Why it happens:** Teams assume legitimate interest is irrevocable.
**How to avoid:** Document a clear objection process: how students object, what happens to their data, what the consequences are for their course participation, and who decides.
**Warning signs:** No objection process documented in the DPIA.

### Pitfall 3: Conflating "No Individual Data at Team Level" With Full Anonymization
**What goes wrong:** Teaching team sees "aggregated cohort patterns only," but small cohort sizes or specific demographic filters can make individuals identifiable through aggregated data. A cohort of 3 students with a specific characteristic is not anonymous.
**Why it happens:** Aggregation is assumed to equal anonymization.
**How to avoid:** Define minimum group sizes for aggregation (typically 5-10 students). Suppress or redact cells where group size falls below the threshold. Document this rule in the access control matrix.
**Warning signs:** Access control matrix says "aggregated only" without specifying minimum group size.

### Pitfall 4: Equity Checklist That Cannot Be Applied Consistently
**What goes wrong:** Vague checklist items like "consider bias" produce inconsistent results depending on who applies them. Two analysts reviewing the same metric reach different conclusions.
**Why it happens:** Checklist items are aspirational rather than operational.
**How to avoid:** Each checklist item should be a specific, answerable question with clear criteria for pass/fail. Include worked examples. Define what evidence is needed to answer each question.
**Warning signs:** Checklist items use words like "consider," "be aware of," or "think about" instead of concrete questions.

### Pitfall 5: DPIA Without Pedagogical Purpose Documentation
**What goes wrong:** The DPIA documents data collection but not why each activity serves learning. This fails both POPIA's purpose specification (Section 13) and the project's own requirement that every collection has a pedagogical rationale.
**Why it happens:** Privacy assessments focus on risk, not educational purpose.
**How to avoid:** Every data collection activity in the DPIA must have a "Pedagogical Purpose" field that answers: "How does collecting this data help the student learn?" This is a locked decision from context.
**Warning signs:** DPIA sections describe data flows but not learning outcomes.

### Pitfall 6: Retention Policy Without Deletion Procedure
**What goes wrong:** Specifying "delete at end of academic year" without defining how deletion works operationally -- what triggers it, who is responsible, how completeness is verified, what happens to derived/aggregated data.
**Why it happens:** Retention is treated as a policy statement rather than an operational specification.
**How to avoid:** The retention spec must include: deletion trigger (date/event), responsible role, verification process, handling of derived data, handling of backups, and confirmation to data subject.
**Warning signs:** Retention spec states time periods but has no deletion procedures section.

## Code Examples

Not applicable -- this phase produces governance documents, not code. See Architecture Patterns above for document structure templates.

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Consent-only legal basis for LA | Legitimate interest + transparency | GDPR era (2018) / POPIA enforcement (2021) | More stable legal basis; focus shifts to transparency and objection rights |
| Ethics as add-on approval | Ethics embedded in design (DPIA before implementation) | Jisc CoP update (2023) | DPIA must precede any data collection design |
| Generic DPIA templates | Sector-specific DPIAs with purpose documentation | 2020-2023 | Education-specific templates include pedagogical rationale |
| Fairness as demographic parity | Context-specific equity (connectivity, language, device) | 2023-2025 LA literature | SA context demands infrastructure-aware bias assessment |
| Blanket data retention | Purpose-limited retention with documented deletion | POPIA Section 14 | Retention must be justified per purpose, deletion must be operationalized |

**Deprecated/outdated:**
- Blanket consent forms without specific purpose documentation (fails POPIA Section 13)
- DPIA as a one-time compliance exercise rather than living document
- "Anonymization solves everything" (re-identification risks in small cohorts are well-documented)

## Open Questions

1. **Minimum group size for aggregation at teaching team level**
   - What we know: Literature recommends 5-10 as minimum; exact number depends on cohort size
   - What's unclear: Optimal threshold for this specific institution's cohort sizes
   - Recommendation: Default to 10, document rationale, allow institutional review to adjust

2. **POPIA Information Regulator guidance specific to higher education analytics**
   - What we know: The Information Regulator published updated regulations in January 2025; USAf published voluntary guidelines in 2020
   - What's unclear: Whether the 2025 regulations contain education-specific provisions
   - Recommendation: Reference USAf guidelines; flag for legal team review of 2025 regulations

3. **Handling of objection under Section 11(3) for course-integrated analytics**
   - What we know: Students can object on reasonable grounds; once objection is made, processing must stop
   - What's unclear: What "reasonable grounds" means when analytics are part of the course experience
   - Recommendation: Document a process but flag that legal review is needed for the specific scenario where a student objects but analytics are integral to course delivery

4. **Derived/aggregated data treatment after individual deletion**
   - What we know: POPIA requires deletion of personal information; aggregated statistics may no longer be "personal information"
   - What's unclear: Whether cohort aggregates that included the student's data need recalculation after deletion
   - Recommendation: Specify that aggregated statistics are retained (no longer personal information) but individual-level data and any data linkable to the individual is deleted

## Sources

### Primary (HIGH confidence)
- [POPIA Section 11 - Consent, Justification and Objection](https://popia.co.za/section-11-consent-justification-and-objection/) - Full text of lawful processing grounds
- [POPIA Section 14 - Retention and Restriction of Records](https://popia.co.za/section-14-retention-and-restriction-of-records/) - Retention and deletion requirements
- [POPIA 8 Conditions for Lawful Processing](https://tuffiassandberg.co.za/popia-understanding-the-8-conditions-for-lawful-processing-of-personal-information/) - Detailed explanation of all 8 conditions
- [Jisc Code of Practice for Learning Analytics](https://www.jisc.ac.uk/guides/code-of-practice-for-learning-analytics) - 8-area ethics framework (updated 2023)
- [USAf POPIA Code of Conduct for Public Universities](https://www.usaf.ac.za/wp-content/uploads/2020/09/USAf-POPIA-Guideline_Final-version_1-September-2020.pdf) - University-specific POPIA guidance

### Secondary (MEDIUM confidence)
- [GDPR DPIA Template](https://gdpr.eu/data-protection-impact-assessment-template/) - Adaptable DPIA structure
- [DELICATE Checklist - Drachsler & Greller (2016)](https://doi.org/10.1145/2883851.2883893) - LA privacy checklist
- [SHEILA Framework](https://sheilaproject.eu/wp-content/uploads/2018/09/JLA_accepted-manuscript.pdf) - Institutional LA strategy
- [Fairness, Trust, Transparency, Equity, and Responsibility in LA](https://learning-analytics.info/index.php/JLA/article/view/7983) - JLA special section on equity
- [Werksmans: Moving beyond the consent myth under POPIA](https://werksmans.com/privacy-day-2026-moving-beyond-the-consent-myth-under-popia/) - Legitimate interest analysis
- [Learning Analytics Framework for SA Higher Education](https://link.springer.com/chapter/10.1007/978-3-031-98185-2_27) - SA-specific LA adoption challenges

### Tertiary (LOW confidence)
- [Digital Inequality in SA Higher Education](https://link.springer.com/article/10.1057/s41307-025-00416-0) - Load-shedding and digital divide impact
- [Load-shedding Impact on LMS in SA Universities](https://www.researchgate.net/publication/379560271) - Connectivity disruption research
- [FairAIED: Navigating Fairness in Educational AI](https://arxiv.org/pdf/2407.18745) - Broader fairness frameworks

## Metadata

**Confidence breakdown:**
- POPIA requirements: HIGH - Primary legislation text verified directly
- DPIA structure: HIGH - GDPR template well-established, adaptable to POPIA with clear section mapping
- Equity framework: MEDIUM - LA equity literature is growing but no single standard checklist exists; SA-specific bias risks are from locked context decisions
- Access control: HIGH - Simple role-based model is a locked decision; matrix format is standard
- Retention/deletion: HIGH - POPIA Section 14 is explicit; locked decision simplifies to uniform policy

**Research date:** 2026-03-06
**Valid until:** 2026-04-06 (30 days -- regulatory framework is stable; no major POPIA amendments expected)
