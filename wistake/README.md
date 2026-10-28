# Wistake (错题本) - Flip Mistakes into Ws

Wistake turns mistakes upside down ($\text{M} \to \text{W}$), helping students transform errors into wisdom, growth, and mastery.

## Workspace Architecture (Modeled after `czg`)

- `web/`: Frontend React 19 + Vite SPA (Vanilla CSS / Tailwind-free rich design, Lucide icons, KaTeX support).
- `api/`: Cloudflare Workers + Hono + Cloudflare D1 SQL backend.
- `data/`: Curated mistake taxonomy, syllabus tags, practice sources, or static dictionaries.
- `scripts/`: Data ingestion, migration, and automation utilities.
- `plan/`: Design specifications, UI wireframes, and feature roadmaps.
- `temp/`: Scratch and intermediate calculation files (do not commit).
