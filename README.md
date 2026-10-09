# Little Artist

A simple drawing app for a toddler. Installable web app (PWA) for a Google Pixel Tablet, landscape, touch only. No accounts, no network, no saving.

Live: https://stonecrestpipes.github.io/little-artist/ (repo `stonecrestpipes/little-artist`, public)

## What it does

- Seven colors in one column of rounded squares: red, orange, yellow, green, blue, purple, black.
- Top: Eraser, Undo (also undoes a Clear), Clear (opens a big red X / green check confirm).
- Right: Pencil, Marker, Sparkle brush, and three sizes.
- Sound: soft synthesized tones, no audio files.
- Grown-ups corner: hold the small lock at the top center for about 1.2 seconds. It has sound on/off, full screen, and Install app.
- Kid-proofing: pinch-zoom, pull-to-refresh, long-press menus, and back swipe are blocked. The screen stays awake. Very large touches (palms) are ignored. Several fingers can draw at once.
- For a truly locked screen, use Android Screen pinning (a web app can't block system edge swipes).

Deferred to a later version: paint can (fill), stamps.

## Files

| File | Purpose |
|---|---|
| `index.html` | The whole app: HTML, CSS, JS, inline SVG icons (Tabler outline icons). No libraries, no build step |
| `manifest.webmanifest` | Fullscreen, landscape, separate `any` and `maskable` icons, all paths relative |
| `sw.js` | Service worker: network-first launch (3 s timeout), cache-first for everything else |
| `icon-192.png`, `icon-512.png`, `icon-maskable-512.png` | App icons (drawn with a throwaway PowerShell script, not kept in the repo) |
| `.nojekyll` | Tells GitHub Pages to skip Jekyll |
| `.github/workflows/pages.yml` | Deploys to Pages on every push to `main` |

## Install on the tablet (the part that took effort)

Open the live link in a normal Chrome tab, wait about 10 seconds, and tap the yellow **Install app** button in the top bar. Do not use Chrome's menu.

Why: Chrome Android's menu "Install app" treats a site as already installed when ANY installed app shares its origin. Every app on `stonecrestpipes.github.io` (Shakedown, Steel Squall, Little Engineer, ...) shares one origin, so once a sibling is installed the menu says "already installed". The page's own `beforeinstallprompt` prompt checks the start URL instead, so it still works. The button calls `prompt()` on the finger lifting (pointerup), because Chrome only counts the lift as a user gesture on touch. This is copied from Steel Squall (`src/game/install.ts` in `steelsquall-source`).

The button only shows when Chrome offers the install and the app isn't already running installed.

## Deploy and update

1. Edit files, and bump `CACHE` in `sw.js` (`little-artist-vN`) so installed copies update.
2. `git push` to `main`. The Actions workflow deploys.
3. Open the app once online, then close it fully and reopen. The first launch fetches the update and the next one uses it.

Gotchas hit while building this:
- The repo's automatic "Deploy from a branch" Pages build failed on every push after the first one ("Page build failed", no detail). Switching Pages to the GitHub Actions workflow fixed it (`build_type: workflow`).
- After a deploy, GitHub's CDN can serve the old files for up to about 10 minutes, and different edges can disagree. If the live site looks stale, re-run the workflow (`gh workflow run pages.yml`) and wait.
- All asset paths must stay relative (`./`) because the site lives under `/little-artist/`.

## Local testing

```bash
python -m http.server 8137
```

Then open http://localhost:8137/ (service worker and install only fully work over HTTPS, so test those on the live link).

## Tuning notes

- Palm rejection ignores touches wider and taller than 90 CSS px. Not yet confirmed on the Pixel Tablet; adjust `isPalm()` in `index.html` if it blocks small fingers or lets palms through.
- Undo keeps up to 40 live strokes, then bakes the oldest 10 into a background bitmap.
- Resizing or rotating the window keeps the picture but clears undo history.
