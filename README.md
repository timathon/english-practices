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

## GitHub Pages Deployment
This project is configured to deploy to GitHub Pages using GitHub Actions.

**First-time Setup:**
1. Go to your repository **Settings**.
2. Click **Pages** in the left sidebar.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
