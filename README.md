# English Practices

A collection of interactive English educational exercises (Grade 3-7) designed for self-study and classroom use. This project is hosted as a static site on GitHub Pages.

## Project Overview

This repository contains various types of interactive practices:
- **Sentence Builders**: Interactive word-reordering games with IPA support and local progress tracking.
- **Reading Practices**: Split-pane reading comprehension exercises built with Tailwind CSS.
- **Grammar & Vocabulary**: Specialized exercises like "典中点" (Dianzhongdian) grammar training.

## Navigation Architecture

Navigation is hierarchical and automated:
1. **Root Index**: The main entry point (`index.html`) featuring "Latest Practices" and a full "Tree View".
2. **Subfolder Indexes**: Each category (e.g., `A5A`, `A7B`, `RAZ-B`) has its own `index.html` for focused browsing.
3. **Exercise Files**: Individual HTML files that link back to their parent index via a consistent "🏠" icon.

## Automation

This project automatically updates navigation indexes before each commit using a git pre-commit hook. 
The hook runs `scripts/update_index.py`, which:
1. Scans the repository for all HTML exercise files.
2. Lists the latest 10 practices added based on modification time.
3. Generates a tree view of the entire directory structure.
4. Creates/updates `index.html` in each subfolder.

To manually update the index, run:
```bash
python3 scripts/update_index.py
```

Another utility, `scripts/add_emoji_link.py`, is used to ensure all exercise files have the necessary navigation links and mobile-responsive styles.

## GitHub Pages Deployment

This project is configured to deploy to GitHub Pages using GitHub Actions (`.github/workflows/deploy.yml`).

**First-time Setup:**
1. Go to your repository **Settings**.
2. Click **Pages** in the left sidebar.
3. Under **Build and deployment** > **Source**, select **GitHub Actions**.
