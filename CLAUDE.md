# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Google Cloud RoleUp: a static SPA to explore, inspect and compare Google Cloud IAM roles and permissions. Design rationale lives in [iam-role-explorer-plan.md](iam-role-explorer-plan.md); read it before changing UI semantics (search qualifiers, selection model, comparison sections).

## Technology Stack

React Router v8, React 19, TypeScript, Tailwind CSS v4, Vite, Biome

## Architecture

- **SPA mode**: `ssr: false` in `react-router.config.ts`; single page (`app/routes/home.tsx`), no page transitions
- **GitHub Pages**: Base path auto-detected from repository name via `GITHUB_REPOSITORY` environment variable
- **Static data**: `public/data/roleup.json` is generated from IAM APIs by `scripts/generate-data.ts` and committed; the app is read-only
- **URL as state**: search query (`?q=`) and selection (`?i=`) are the only state sources; see `app/lib/url-state.ts`

## Key Files

- `app/routes/home.tsx`: Single page assembling all panes
- `app/lib/`: Core logic (data loading/indexes, bitset ops, qualifier search, URL state, badges)
- `app/components/`: Panes (detail / compare / reverse-lookup / guide), role list, omnibox
- `scripts/generate-data.ts`: Data pipeline (roles.list?view=FULL + queryTestablePermissions + Service Usage)
- `app/app.css`: Global styles with Tailwind theme
- `vite.config.ts`: Base path detection for GitHub Pages
- `biome.json`: Linting rules with Tailwind support

## Development Commands

```bash
npm run dev           # Start dev server
npm run build         # Build for production
npm run typecheck     # Type checking
npm test              # Run unit tests (vitest)
npm run check         # Lint + format with auto-fix
npm run generate-data # Regenerate public/data/roleup.json (needs gcloud login)
```

## GitHub Actions

- **`deploy-pages.yml`**: Deploys `build/client/` to GitHub Pages on push to main
- **`test.yaml`**: Type check, unit tests, lint (warnings only), and build on push/PR
- **`update-data.yml`**: Weekly cron (+ manual dispatch) that regenerates `public/data/roleup.json` via WIF-authenticated GCP access and opens an auto-merging PR; see [docs/data-update-automation.md](docs/data-update-automation.md)

## Dependency Upgrades

See [docs/dependency-upgrade-checklist.md](docs/dependency-upgrade-checklist.md) for what to verify beyond CI when bumping dependency versions.
