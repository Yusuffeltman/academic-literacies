# Governance Framework

Data governance framework for the Academic Literacies Learning Analytics system. These documents constrain all subsequent design decisions.

## Regulatory Framework

**Primary regulation:** POPIA -- Protection of Personal Information Act (Act 4 of 2013)

These documents are specification artifacts intended for legal review before implementation. They define the privacy, security, fairness, and access constraints that every technical design decision must satisfy.

### Reference Frameworks

- **POPIA 8 Conditions** -- Accountability, Processing Limitation, Purpose Specification, Further Processing Limitation, Information Quality, Openness, Security Safeguards, Data Subject Participation
- **Jisc Code of Practice for Learning Analytics** -- UK-origin principles adapted for SA context
- **DELICATE Checklist** -- Determination, Explain, Legitimate, Involve, Consent, Anonymise, Technical, External
- **USAf POPIA Code of Conduct** -- Universities South Africa sector-specific guidance

## Documents

### Data Protection Impact Assessment (DPIA)

| Document | Path | Purpose |
|----------|------|---------|
| Processing Description | `governance/dpia/01-processing-description.md` | Description of all data collection activities and their pedagogical purposes |
| Lawful Basis | `governance/dpia/02-lawful-basis.md` | POPIA 8 conditions mapping for each data activity |
| Risk Assessment | `governance/dpia/03-risk-assessment.md` | Privacy risk identification and impact assessment |
| Safeguards | `governance/dpia/04-safeguards.md` | Technical and organizational mitigation measures |
| Data Subject Rights | `governance/dpia/05-data-subject-rights.md` | Student rights under POPIA with implementation procedures |

### Data Retention

| Document | Path | Purpose |
|----------|------|---------|
| Data Lifecycle Spec | `governance/retention/data-lifecycle-spec.md` | Data categories, retention periods, and deletion procedures |

### Access Control

| Document | Path | Purpose |
|----------|------|---------|
| Access Control Matrix | `governance/access-control/access-control-matrix.md` | Role-data permission mapping for all audiences |

### Equity

| Document | Path | Purpose |
|----------|------|---------|
| Equity Review Framework | `governance/equity/equity-review-framework.md` | Per-metric bias check process with SA-specific equity criteria |
