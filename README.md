# React Router SPA Template

A modern template for building single-page applications with React Router v8, TypeScript, and Tailwind CSS. Pre-configured for GitHub Pages deployment.

**Demo**: https://pokutuna.github.io/react-router-spa-starter/

## Features

- React Router v8, React 19, TypeScript
- Tailwind CSS v4, Vite
- Biome (linting and formatting)
- GitHub Pages ready with auto base path detection
- GitHub Actions for deployment and testing

## Quick Start

```bash
# Use this template on GitHub, then clone
npm install
npm run dev
```

Open http://localhost:5173

## Commands

```bash
npm run dev       # Start dev server
npm run build     # Build for production
npm run typecheck # Type checking
npm run check     # Lint + format with auto-fix
```

## Deployment

Fork this repository and enable GitHub Pages in repository settings. The `.github/workflows/deploy-pages.yml` workflow automatically deploys on push to main.

Base path is auto-detected from repository name via `GITHUB_REPOSITORY` environment variable.

## Adding Routes

1. Create `app/routes/[name].tsx` with default export
2. Add route to `app/routes.ts`

Example:

```typescript
// app/routes/about.tsx
export default function About() {
  return <div>About Page</div>;
}
```

```typescript
// app/routes.ts
import { type RouteConfig, index, route } from "@react-router/dev/routes";

export default [
  index("routes/home.tsx"),
  route("about", "routes/about.tsx"),
] satisfies RouteConfig;
```

## Project Structure

```
app/
├── routes/          # Route components
├── root.tsx         # Root layout
├── routes.ts        # Route configuration
└── app.css          # Global styles with Tailwind theme
```

## License

MIT
