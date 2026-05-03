# SKU packaging

Tools for building a **stripped, per-licensee copy** of the app (static build-time capabilities + optional filesystem removal of feature modules).

## Concepts

- **Feature keys** match `org.features` in [`src/config/org.ts`](../src/config/org.ts) and each `registerFeature({ key: ... })` in [`src/config/featureRegistrations.ts`](../src/config/featureRegistrations.ts).
- **`paths`** on each registration are repo-relative paths removed when that feature is disabled for a SKU (directories or a single file).
- **`dependsOn`**: if feature A is disabled, any feature that lists A in `dependsOn` (transitively) is also treated as disabled for the SKU (`expandDisabledKeys`).

## Build-time capability overrides

In managed builds you can set `VITE_DISABLED_FEATURES` to a comma-separated list of feature keys (same names as `org.features`). These are applied in [`src/config/capabilities.ts`](../src/config/capabilities.ts) on top of `org.features` defaults.

## Commands

| Command | Purpose |
|--------|---------|
| `npm run packaging:audit` | Validates cross-feature `dependsOn` imports under `src/features/**` and restricted `src/core` / `src/pages` imports (see allowlist). |
| `npm run packaging:build-sku -- packaging/skus/<name>.yaml` | Copies the repo to `dist-sku/<sku>/`, removes disabled feature paths, rewrites registrations + `org.ts`, runs audit + `npm ci` + `npm run typecheck` + `npm run build`, then writes `dist-sku/<sku>.tgz`. |

## SKU file format

YAML (subset) or JSON. Supported fields:

- **`sku`** (required): directory name under `dist-sku/` and tarball base name.
- **`disabledFeatures`**: array of feature keys to turn off and strip (may expand transitively via `dependsOn`).
- **`brand`** (optional): overrides string fields in `org.ts` via regex replace — `shortName`, `domain`, `name`, `chapterName` when present.

Example: [`skus/example.yaml`](skus/example.yaml) uses `disabledFeatures: []` so the pipeline is a safe smoke test (brand-only). Disabling real features often requires **removing static imports** from `src/core`, `src/pages`, and shared components first; otherwise `typecheck` / `build` in the SKU copy will fail (by design).

## Adding a feature

1. Add the key under `org.features` in `org.ts`.
2. Register it in `featureRegistrations.ts` with **`paths`** (every path removed when the feature is stripped) and **`dependsOn`** if the module imports other licensed feature folders under `src/features/<name>/`.
3. Gate UI with `isCapabilityEnabled()` / `useCapability()` from [`src/config/capabilities.ts`](../src/config/capabilities.ts) — do not read `org.features` outside `capabilities.ts` (ESLint enforces this).

## Core / pages imports

Files under `src/core/**` and `src/pages/**` may not import `@/features/*` except:

- [`src/App.tsx`](../src/App.tsx) and [`src/config/featureRegistrations.ts`](../src/config/featureRegistrations.ts), and
- paths listed in [`audit-core-pages-allowlist.json`](audit-core-pages-allowlist.json) (shrink this list over time by moving imports behind lazy loaders or registry entrypoints).

## Supabase migrations

SKU builds **do not** trim `supabase/migrations/`. Disabled features may still have tables/policies in the database; cleaning that up is a separate migration effort if you need minimal schemas per SKU.

## Copy exclusions

`packaging/build-sku.mjs` skips `node_modules`, `dist`, `dist-sku`, `.git`, and `.cursor` when cloning the tree into `dist-sku/<sku>/`.
