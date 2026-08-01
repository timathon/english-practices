python3 scripts/genai/gen_2_vm.py v2-data/A8A/a8a-u5/a8a-u5-vocab-guide.json
python3 scripts/genai/audit-scripts/audit_unit.py v2-data/A8A/a8a-u5
python3 scripts/genai/audit-scripts/apply_audit_fixes.py scripts/genai/audit-reports/a8a-u5-audit-report.md
manually check pending issues in the audit report



python3 scripts/genai/gen_3_sh.py v2-data/A8A/a8a-u5/a8a-u5-vocab-guide.json