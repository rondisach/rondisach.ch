# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

Website of rondisach Pizza Catering (rondisach.ch), a static Astro site. The owner is not a professional developer and writes in (Swiss) German: code comments, commit messages and all site copy are German, using "ss" instead of "ß".

## Commands

```bash
npm install
npm run dev       # http://localhost:4321 (also: .claude/launch.json → "rondisach")
npm run build     # output in dist/
npm run preview
```

There are no tests and no linter. `npm run build` is the check: it fails on type errors in `.astro` frontmatter and on missing imports.

`node guide/build-guide.mjs` regenerates `guide/pizza-guide.html` (template for the PDF that oven renters receive; printed to PDF by hand, A4, no margins). It is not part of the site build.

## Deploy

Every push to `main` is built and published to GitHub Pages by `.github/workflows/deploy.yml` (`withastro/action`). Work happens on feature branches; merging to `main` means going live.

## Content model

Content is edited by non-developers through Pages CMS (app.pagescms.org), configured in `.pages.yml`. That file and the data files must stay in sync: if you add, rename or remove a field in `src/data/*.json` or in the album frontmatter, update the matching entry in `.pages.yml` too.

- `src/data/*.json`: all copy, prices, pizzas, FAQ, dates, banner, contact data and the Umami ID. Pages import these JSON files directly.
- `src/content/impressionen/*.md`: event photo albums (frontmatter only). They are loaded via `import.meta.glob` in `src/lib/albums.ts`, not through Astro content collections.
- `src/assets/uploads/`: CMS uploads. Data files store images as path strings (`/src/assets/uploads/x.webp`); `upload()` in `src/lib/images.ts` resolves them to `ImageMetadata` for `astro:assets` and warns when a file is missing.
- `src/data/kontakt.json` `email` is also the recipient of the enquiry form (posted to formsubmit.co in `src/pages/index.astro`).
- Past entries in `termine.json` are hidden automatically at build time.

## Pages and layout

`build.format: 'file'` outputs `/impressum.html` etc. so old links keep working; internal links use the `.html` form. `buchung-storno` is excluded from the sitemap. `Layout.astro` renders the banner, nav, footer, JSON-LD and the Umami script (only when `umamiWebsiteId` is set); legal pages use `LegalLayout.astro`. Analytics events go through `src/lib/umami.ts` (`track`, `trackPage`) or `data-umami-event` attributes.

## 3D hero (`src/components/Hero.astro` + `src/scripts/hero/`)

A scroll-driven Three.js scene: the camera walks through a low-poly garden at golden hour, past guests eating pizza, to the rondisach stand where a pizza is baked. Everything is built from primitive geometry, with no external models or textures.

- `Hero.astro` dynamically imports `scene.ts` only on desktop (>760px), with WebGL and without `prefers-reduced-motion`. Otherwise the static image fallback stays. It maps scroll progress through the tall section to `scene.setProgress(p)` (starting at `START = 0.22`), and uses the `onProgress` callback to fade captions (`data-from`/`data-to`) and to position the "Jetzt anfragen" button over the stand's projected screen anchor.
- `scene.ts`: the timeline. Progress `0..WALK_END (0.74)` is the walk along a `CatmullRomCurve3`; `WALK_END..1` is the oven sequence. Sub-phases use `seg(p, a, b)` (eased clamp from `oven.ts`). Rendering runs only while the stage is visible (IntersectionObserver → `start()`/`stop()`).
- `garden.ts` (sky, ground, trees, people and `animatePerson`, tables, stand, lights), `props.ts` (house, fence, shed, trampoline…), `oven.ts` (oven, peel, pizza, `COLORS`, `ease`/`seg`), `pizzas.ts` (the seven menu pizzas as 3D variants, matching `pizzen.json`).
- `batch.ts` `batchStatic(root, dynamic)` merges all non-moving meshes into a few large meshes, because the garden has 2000+ parts. **Anything that animates must be passed in the `dynamic` list**, or it gets baked into a static mesh and stops moving. See the `batchStatic` calls in `scene.ts`.
- Randomness is seeded (`rng(seed)`), so the layout is deterministic across reloads.
- Performance on Safari and laptops matters (recent commits were about load and smoothness). Avoid per-frame allocations and per-frame DOM style writes (Hero.astro caches style values for this reason).
- In dev, `window.__hero.jump(p)` jumps straight to a progress value. Use it to inspect a specific moment in the browser preview.
