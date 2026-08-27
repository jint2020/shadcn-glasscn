# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

`glasscn` — a **Liquid Glass theme layer for shadcn/ui**. Dark-first, pure CSS, zero runtime, carries no business logic. It restyles existing shadcn components in place by hooking their `data-slot` attributes; consumers don't re-run `shadcn add` or touch a single `.tsx`.

pnpm monorepo (`packages/*`, `apps/*`). Requires pnpm 10.x and Node ≥ 22. **Source comments, docs (`README.md`, `self-managed.md`), and commit-facing text are in Chinese**; match that when editing existing files.

## Commands

```bash
pnpm install
pnpm exec playwright install chromium   # once — verify/screenshot drive a real browser

pnpm dev                 # Vite preview site (apps/playground, default :5173)
pnpm build               # build the preview site
pnpm registry:build      # regenerate registry.json from CSS, then `shadcn build` → apps/playground/public/r
pnpm verify              # pnpm build + browser-pixel assertions (scripts/verify.mjs; README cites 32 checks)
pnpm screenshot          # pnpm build + regenerate docs/screenshots/

# local registry testing with absolute refs pointed at a local server:
REGISTRY_URL=http://localhost:5055/r pnpm registry:build
```

There is no unit-test runner and no lint step. **`pnpm verify` is the test suite** — it serves the built playground and asserts the invariants below against real rendered pixels (glass is composited, so `getComputedStyle` returns the translucent source color, not the real one). Run it after any CSS change.

## The one invariant everything else protects

> **Glass has no color of its own.** The fill is *always* `rgba(255,255,255,N)` — white-neutral. To change the overall mood you change the **background blobs** (palette), never the glass fill.

Break this and glass becomes "tinted translucent plastic." Two automated gates guard it: `pnpm verify` asserts all six palettes share an identical fill, and the CI registry check fails the build if any `--glass-fill*` / `--glass-white` variable in the generated registry carries a color value. When touching `tokens/primitives.css` or any palette, never introduce a hue into the fill.

## Architecture

**`packages/core/`** (`@glasscn/core`, npm-publishable, pure CSS, no build step, ships only `src/`):
- `src/tokens/` — material primitives (white glass / blur / highlight / motion / radius), `palette.css` (default Ember & Slate), `elevation.css` (the five-tier blur ladder), `typography.css` (defines font tokens only — **does not load fonts**; consumers link their own), `bridge.css` (takes over shadcn's `--card`/`--popover`/… surface tokens + shadow scale).
- `src/primitives/` — `surface.css`, `interaction.css`, `backdrop.css` (the three drifting light blobs), `reveal.css` (scroll reveal), `fallback.css` (six degradation paths — see below).
- `src/bridge/auto.css` — the zero-intrusion layer: a **hand-picked** list of `data-slot` selectors, all inside `@layer components` so Tailwind utilities always win and users can override. Never widen this to a `[data-slot]` wildcard — that spawns a compositing layer per cell in long lists.
- `src/palettes/` — six palettes + `switchable.css`. Each palette sets only ~8 values (two ground levels, three blobs, two accents, text tint). **Never touch the glass fill here.**
- Entry points: `src/index.css` (full: tokens + primitives + auto-bridge), `src/headless.css` (utilities only, no auto-takeover), plus granular per-file exports in `package.json`.

**`packages/registry/`** — generates the shadcn registry:
- **`registry.json` at the repo root is generated, never hand-edited.** `build-registry.mjs` parses `packages/core/src/**/*.css` (CSS is the single source of truth) — `css-to-json.mjs` converts `@utility`/`@keyframes`/`@layer components` blocks into the registry `css` field. Edit CSS, then run `pnpm registry:build`; hand-editing drifts silently and `shadcn add` users get stale rules with no error.
- `src/ui/*.ts` — the only JavaScript in the library: `use-glass-reveal` (IntersectionObserver fallback for old browsers), `use-glass-tilt` (Expressive-tier 3D tilt), `use-glass-perf` (frame-rate probe that sets `data-glass-perf="lite"`).

**`apps/playground/`** (`@glasscn/playground`) — Vite + React 19 + Tailwind v4 preview with ~20 vendored shadcn components. `vite.config.ts` base is `process.env.BASE_PATH ?? "/"` (GitHub Pages serves under a subpath; dev and CI preview use `/`).

**`scripts/`** — `verify.mjs`, `screenshot.mjs`, shared `browser.mjs` (Playwright Chromium launcher). Each spins up its own static server (verify :4190, screenshot :4173) over `apps/playground/dist`.

## Non-obvious rules that will bite you

- **The fallback layer ships via the registry `files` field, not `css`.** `fallback.css` is `@media`/`@supports` top-level rules that must land in *unlayered* scope to outrank the `cssVars` written into `:root`; inside a `@layer` it loses specificity and silently dies — and with `backdrop-filter` a dead fallback means text sitting directly on the animated background (unreadable). Consumers must manually add `@import "./glass-fallback.css";` — the CLI won't. The whole fallback layer carries `!important` so palette selectors (`:root[data-glass-palette]`, specificity 0,2,0) can't override the accessibility degradations on `:root` (0,1,0).
- **Dark-first, so `cssVars.dark` is intentionally empty.** The default (Ember & Slate) lives in `:root` with no `.dark` variant. "Light" is the `liquid-light` *palette* via `data-glass-palette`, not shadcn's `.dark` class. Don't fill `dark` with a duplicate.
- **Elevation is a ladder, not one blur.** flat 16px → raised 20px → overlay 24px → menu 28px+saturate → modal 28px+saturate. All derive from `--glass-blur-base`; change that one value to rescale.
- **Performance is load-bearing, not polish:** max three stacked blur layers (nested glass auto-falls back to thin glass), list items / table rows only swap fill (no transform, no blur), blob animation only ever touches `transform` (never `color`/`filter`, which re-rasterize the blur each frame).
- **One base-URL source of truth:** `HOMEPAGE` in `build-registry.mjs`. Changing domain/repo name also means updating `BASE_PATH` in the CI workflow and the links/badges in `README.md`.
- Runtime toggles: `data-glass-palette` (six palettes), `data-glass-density` (`sheer`/`frosted`/`heavy` — an axis independent of palette), `data-glass-perf="lite"` (whole-tree fallback to solid), `data-glass="off"` (opt one element out).

## Repo state

This working copy is a pre-push snapshot (not a git repo here; no `.github/` present). CI behavior, the registry-validation gates, and the GitHub Pages / npm-publish flow are documented in **`self-managed.md`** — read it before anything involving CI thresholds, publishing, or the base URL. Note some inline `docs` strings in `build-registry.mjs` and `self-managed.md`'s appendix still use the older `preset`/`presets` wording; the current taxonomy is `palettes` (six) switched via `data-glass-palette`.
