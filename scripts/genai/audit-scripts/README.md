# Audit Scripts Directory

This directory contains automated audit tools to validate generated practice JSON files against the rules specified in `GEMINI.md`.

## Available Scripts

### `audit_unit.py`

Audits all practice JSON files for a given unit folder (e.g. `Vocab Guide`, `Vocab Master`, `Spelling Hero`, `Sentence Architect`, `Recall Map`, `Text Navigator`).

#### Usage

```bash
python3 scripts/genai/audit-scripts/audit_unit.py <path_to_unit_folder>
```

#### Example

```bash
python3 scripts/genai/audit-scripts/audit_unit.py v2-data/B-PU1/b-pu1-u3
```

#### Outputs

Generates an audit report in markdown format at:  
`scripts/genai/audit-reports/<unit_name>-audit-report.md`
