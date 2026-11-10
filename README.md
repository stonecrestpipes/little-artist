# Little Artist

A simple drawing app for a toddler. Installable web app (PWA) for a Google Pixel Tablet, landscape, touch only. No accounts, no network, no saving.

Live: https://stonecrestpipes.github.io/little-artist/ (repo `stonecrestpipes/little-artist`, public)

## What it does

- Look: Shakedown brand style. Pixel font and pixel icons, square cyan-outlined buttons, navy field, drawn on a white canvas.
- Seven colors in one column of squares: red, orange, yellow, green, blue, purple, black.
- Top: Eraser, Undo (also undoes a Clear), Clear (opens a big red X / green check confirm).
- Right: Pencil, Marker, Sparkle brush, and three sizes.
- Trace: the Trace button (top bar) swaps the canvas for a letter/number tracing board. Sets: ABC, abc, 123. It shows a model beside the board (or one big board via the layout button), checks that the child covered the glyph, then cheers and moves on. Previous/Next, Say it again (spoken name via speech synthesis), Try again. Eraser is hidden in trace mode; Clear restarts the glyph.
- Sound: soft synthesized tones, no audio files.
- Grown-ups corner: hold the small lock at the top center for about 1.2 seconds. It has sound on/off, full screen, and Install app.
- Kid-proofing: pinch-zoom, pull-to-refresh, long-press menus, and back swipe are blocked. The screen stays awake. Very large touches (palms) are ignored. Several fingers can draw at once.
- For a truly locked screen, use Android Screen pinning (a web app can't block system edge swipes).

Deferred to a later version: paint can (fill), stamps, trace shapes/animals.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app: HTML, CSS, JS, pixel-art icons drawn from character maps in a canvas. No libraries, no build step |
| `manifest.webmanifest` | Fullscreen, landscape, separate `any` and `maskable` icons, all paths relative |
| `sw.js` | Service worker: network-first launch (3 s timeout), cache-first for everything else |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | App icons (drawn with a throwaway PowerShell script, not kept in the repo) |
| `.nojekyll` | Tells GitHub Pages to skip Jekyll |
| `.github/workflows/pages.yml` | Runs the checks, then deploys to Pages on every push to `main` |
| `tests/browser.test.cjs` | Optional browser regression tests (see Checks and tests) |
| `scripts/check.mjs` | Pre-deploy checks, no dependencies: scripts parse, manifest and icons valid, `CACHE` bumped when app files change |

## Install on the tablet (the part that took effort)

Open the live link in a normal Chrome tab, wait about 10 seconds, and tap the cyan **Install app** button in the top bar. Do not use Chrome's menu.

Why: Chrome Android's menu "Install app" treats a site as already installed when ANY installed app shares its origin. Every app on `stonecrestpipes.github.io` (Shakedown, Steel Squall, Little Engineer, ...) shares one origin, so once a sibling is installed the menu says "already installed". The page's own `beforeinstallprompt` prompt checks the start URL instead, so it still works. The button calls `prompt()` on the finger lifting (pointerup), because Chrome only counts the lift as a user gesture on touch. This is copied from Steel Squall (`src/game/install.ts` in `steelsquall-source`).

The button only shows when Chrome offers the install and the app isn't already running installed.

## Deploy and update

1. Edit files, and bump `CACHE` in `sw.js` (`little-artist-vN`) so installed copies update. `node scripts/check.mjs` (run before pushing; CI runs it too) fails if you forget.
2. `git push` to `main`. The Actions workflow deploys.
3. Open the app once online, then close it fully and reopen. The first launch fetches the update and the next one uses it.

Gotchas hit while building this:
- The repo's automatic "Deploy from a branch" Pages build failed on every push after the first one ("Page build failed", no detail). Switching Pages to the GitHub Actions workflow fixed it (`build_type: workflow`).
- After a deploy, GitHub's CDN can serve the old files for up to about 10 minutes, and different edges can disagree. If the live site looks stale, re-run the workflow (`gh workflow run pages.yml`) and wait.
- All asset paths must stay relative (`./`) because the site lives under `/little-artist/`.

## Local testing

```bash
python -m http.server 8137 --bind 127.0.0.1
```

Then open http://localhost:8137/ (service worker and install only fully work over HTTPS, so test those on the live link).

## Checks and tests

```bash
node scripts/check.mjs
```

Fast static checks, no install. CI runs them before every deploy.

```bash
npm i --no-save playwright-core && node tests/browser.test.cjs
```

Browser regression tests (Trace layout, canvas refit, label fit, Undo) using your installed Chrome. Set `CHROME_PATH` if Chrome is somewhere unusual. Not run in CI.

## Tuning notes

- Palm rejection ignores touches wider and taller than 90 CSS px. Not yet confirmed on the Pixel Tablet; adjust `isPalm()` in `index.html` if it blocks small fingers or lets palms through.
- Undo keeps up to 40 live strokes, then bakes the oldest 10 into a background bitmap.
- Resizing or rotating the window keeps the picture and Undo history (strokes are stored as vectors in CSS px). Only a change of screen density bakes the strokes into the bitmap and clears history.

## To verify on the devices

- Phone landscape: Eraser, Undo, Clear labels sit beside their icons without clipping (fixed in the last two commits, not yet seen on hardware).
- Pixel Tablet: palm rejection, and Undo after rotating.
