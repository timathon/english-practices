# english-practices

## Automation
This project automatically updates `index.html` before each commit using a git pre-commit hook. 
The hook runs `scripts/update_index.py`, which:
1. Lists the latest 10 practices added.
2. Generates a tree view of all practices.

To manually update the index, run:
```bash
python3 scripts/update_index.py
```