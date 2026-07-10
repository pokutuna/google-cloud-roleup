# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Template repository for building SPAs with React Router v8, TypeScript, and Tailwind CSS. Fork this repository to create your own SPA and deploy it to GitHub Pages with zero configuration.

## Technology Stack

React Router v8, React 19, TypeScript, Tailwind CSS v4, Vite, Biome

## Architecture

- **SPA mode**: `ssr: false` in `react-router.config.ts`
- **GitHub Pages**: Base path auto-detected from repository name via `GITHUB_REPOSITORY` environment variable
- **File-based routing**: Routes defined in `app/routes/` and configured in `app/routes.ts`

## Key Files

- `app/routes/`: Route components
- `app/routes.ts`: Route configuration
- `app/root.tsx`: Root layout with HTML structure
- `app/app.css`: Global styles with Tailwind theme
- `vite.config.ts`: Base path detection for GitHub Pages
- `react-router.config.ts`: SPA mode configuration
- `biome.json`: Linting rules with Tailwind support

## Development Commands

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run typecheck # Type checking
npm run check     # Lint + format with auto-fix
```

## Adding a New Route

1. Create `app/routes/[name].tsx` with a default export component
2. Add the route to `app/routes.ts`
3. Optionally export a `meta` function for page metadata

## GitHub Actions

- **`deploy-pages.yml`**: Deploys `build/client/` to GitHub Pages on push to main
- **`test.yaml`**: Type check, lint (warnings only), and build on push/PR

## Dependency Upgrades

See [docs/dependency-upgrade-checklist.md](docs/dependency-upgrade-checklist.md) for what to verify beyond CI when bumping dependency versions.
