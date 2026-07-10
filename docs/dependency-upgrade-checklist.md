# Dependency Upgrade Checklist

What to verify after bumping dependency versions. CI (typecheck, build) passing is a prerequisite — this document covers what CI does **not** catch.

> **Why CI alone is insufficient:** The biome lint step runs with `continue-on-error: true`, so lint regressions pass silently. There is no test runner. GitHub Pages-specific path resolution and runtime behavior are never exercised in CI.

## All Packages

### Check dev/build output for new warnings

Run `npm run dev` and `npm run build`, then inspect the output for new warnings. CI only checks whether the build succeeds, not the presence of warnings.

Watch for:

- Deprecation notices
- Future flag warnings
- Schema version mismatches
- Experimental feature stability changes

Warnings left unaddressed become breaking changes in the next major release — fix them immediately.

### Keep `.npmrc` and dependabot cooldown in sync

`.npmrc` sets `min-release-age=14` and `.github/dependabot.yml` sets `cooldown.default-days: 14`. These must stay at the same value. A mismatch causes Dependabot to open PRs for versions that `npm ci` rejects (or vice versa).

## react-router / @react-router/\*

### Exact peer dependency synchronization

`@react-router/serve` and `@react-router/node` declare an **exact** peer dependency on `react-router` (e.g. `react-router@7.16.0`, not `^7.16.0`). Bumping packages individually breaks `npm ci` with `ERESOLVE`. Always upgrade `react-router`, `@react-router/serve`, `@react-router/node`, and `@react-router/dev` together in one commit with a single lockfile regeneration.

Dependabot is configured to group these packages (`.github/dependabot.yml` `react-router` group), but manual upgrades must follow the same rule.

### Future flags

`react-router.config.ts` opts into v8 future flags. On upgrade:

- **New flag warnings** — run `npm run dev` and enable any new `⚠️ Future Flag Warning` that appears.
- **v8 release** — remove the `future` block entirely. Flags become defaults and the config key itself may error.
- **`v8_passThroughRequests`** — this flag changes loader/action signatures to receive a `url` parameter instead of `new URL(request.url)`. This repo currently has no loaders or actions, but if any are added, run `rg 'request\.url' app/` to check for required migration.

### SPA routing on GitHub Pages

`react-router.config.ts` `buildEnd` copies `index.html` to `404.html` so that GitHub Pages serves the SPA shell for unknown paths (sub-route direct access, browser reload). A React Router major update could change the `buildEnd` API or `reactRouterConfig` shape.

Verify:

1. `build/client/404.html` exists after `npm run build`
2. `npm run preview` — navigate to a sub-route (`/sample`) directly in the address bar and confirm the page renders
3. Client-side navigation (link clicks, browser back/forward) works
4. An unknown path shows the ErrorBoundary

## Biome

### Schema version match

`biome.json` `$schema` must match the installed biome version. A mismatch emits an info diagnostic that CI ignores (`continue-on-error`).

```bash
npx @biomejs/biome migrate --write
```

### Rule syntax migration

Major upgrades may change configuration syntax. Always run `biome migrate` after bumping.

Example: biome 2.5.0 requires `"recommended": true` → `"preset": "recommended"`.

## Vite / @tailwindcss/vite

### GitHub Pages base path

Both `vite.config.ts` and `react-router.config.ts` derive the base path from `GITHUB_REPOSITORY`. A Vite major update could change how `base` is interpreted, breaking asset loading on GitHub Pages. CI builds without this environment variable, so it cannot detect the issue.

Verify: after deploying to GitHub Pages, confirm assets (CSS, JS) load correctly and the page renders.
