# Movie Connect

A tiny installable PWA game: tap **New Pair** to get two random actors, then
try to connect them through a chain of shared movies with friends.

Rebuilt from an old Movie Connect prototype, with a cleaner UI and the
ability to add your own actors to the list right from the app.

## Features

- Random actor pair generator (never picks the same actor twice in a pair)
- Add / remove actors, stored in your browser's `localStorage`
- Actor headshots, looked up live from Wikipedia (see below)
- Installable PWA (manifest + service worker) with offline support
- No build step, no backend — plain HTML/CSS/JS

## Running locally

Just serve the folder statically, e.g.:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Deploying to GitHub Pages

1. Push this repo to GitHub.
2. In the repo settings, go to **Pages**.
3. Under **Build and deployment**, set **Source** to `Deploy from a branch`,
   pick the branch (e.g. `main`) and the `/ (root)` folder, then save.
4. Your app will be live at `https://<username>.github.io/<repo-name>/`.

Everything is relative-pathed, so it works fine whether the site is served
from the domain root or a `/<repo-name>/` subpath.

## Notes

- Actors you add are personal to your browser (stored via `localStorage`),
  so they won't sync across devices — this keeps the app fully static and
  free to host.
- The starter list (`js/actors.js`) is carried over from the original app.
- Actor photos are fetched client-side from Wikipedia's free public API
  (`en.wikipedia.org/api/rest_v1/page/summary/...`), no key required. Each
  lookup result (including "no photo found") is cached in `localStorage`
  and the image itself is cached by the service worker, so an actor is
  only ever looked up once per browser and photos keep working offline
  after that. If no photo is found (or the device is offline), the app
  falls back to a circle with the actor's initials.
