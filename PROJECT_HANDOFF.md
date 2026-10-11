# FUOYE Explore — project handoff

Last updated: **11 October 2026**. This file records the state after the first five grouped commits were pushed. It is a continuation guide, not a claim that the project is finished.

## Start here

We are building a lightweight 3D explorer/game of **Federal University Oye-Ekiti, Oye campus, Nigeria**. The user wants the layout, controls, gameplay and visual polish of **Mount Allison in 3D**, with FUOYE's actual buildings and campus geography. They rejected the earlier generic models and dashboard layout. The fullscreen reference-style interface is implemented; the campus-specific reconstruction is still being refined.

**Do not restart the project or redesign its interface.** Continue from the existing code and evidence. The next useful work is mostly offline: improve the current models, fix stale validation/documentation, and test the expanded campus.

The user has limited internet data and previously reported that the game froze their PC. Avoid new downloads or repeated web research unless needed for a specific unresolved fact. Do not increase graphics cost just to make screenshots more impressive. Most recent requests were to save the existing work in grouped conventional commits, push it, and create this handoff. No new implementation was done while writing this file.

## Location, repository and running it

- Actual project folder: `C:\Users\cyberdev\Desktop\fuoye-3js`
- GitHub: https://github.com/Cyberpunk738/fuoye-explore
- Branch: `main`, tracking `origin/main`.
- The coding session may still open in `C:\Users\cyberdev\Documents\ChatGPT\fuoye-3js`. That is an empty legacy workspace, **not** the project. Use the Desktop folder explicitly.
- In the prior environment, Desktop writes required sandbox escalation. Do not move the project back or create a junction to bypass permissions.
- Stack: TypeScript, Vite, Three.js; Leaflet for the separate review map. No backend/account is needed.
- Node, npm, installed dependencies and Chrome were available on this PC. Playwright is a dev dependency.

From the Desktop project folder:

```powershell
npm run dev
```

Open http://127.0.0.1:5173/ for the game; http://127.0.0.1:5173/review.html for the map/review workspace. These are **local URLs**, not a public deployment. No deployed FUOYE site was verified. No process was listening on port 5173 when this handoff was checked; start the server if needed.

Only run `npm ci` if dependencies are missing; it consumes data. Use the lockfile rather than upgrading packages as part of continuation.

## User's references

- Playable reference: https://mount-alison-3d.vercel.app/
- Original demo post: https://x.com/0xbigturk/status/2107583015496953876?s=20
- Creator's tips post: https://x.com/0xbigturk/status/2107815454664274293?s=20
- User-supplied FUOYE Maps link: https://maps.app.goo.gl/yDcJm6EFjyrKhLUY6
- Reference comparison notes: [research/reference-parity.md](research/reference-parity.md)

The reference was inspected during earlier work. The user particularly wants its fullscreen scene, floating building list, serif heading, Drive / Walk / Night / Full view controls, and gameplay. Reproduce behavior with our own code and FUOYE geometry; do not ship the reference's downloaded code or buildings. Historical research notes differ about whether the X tips were successfully read. Do not claim that every tip has been verified without checking the evidence.

## What is implemented

### Interface and gameplay

- Fullscreen 3D scene, FUOYE title, floating collapsible building directory, attribution/About, four reference-style controls, FPS display.
- Orbit, pan, zoom, building hover highlight and click-to-focus; full-campus view.
- Walk mode: WASD/arrows, Shift run, Space jump, pointer-lock or drag look; touch joystick and touch look.
- Drive mode: WASD/arrows, Space drift/handbrake, R road reset, follow camera, building/tree collision.
- Campus Courier: Start / Free drive / Exit; 75-second starting timer; gold destination ring, beacon and direction arrow; score/time bonuses, retry and saved best score.
- Night/day: sky, stars, emissive windows, lamp glows, one unshadowed headlight.
- Separate review map with local identification notes and JSON import/export.

### Current campus reconstruction

The current runtime extract contains **108 building polygons, 24 road/path features and 5 ground-area polygons**. These are feature counts, not road segment counts or a claim that all campus buildings are captured.

- Coverage expanded from the old western crop to include **Phases 1, 2 and 3**.
- **11 named places** in the inventory. Latest visual check showed **62 directory entries** because smaller supporting structures and secondary wings remain visible but are omitted from the directory.
- Original OSM/Microsoft polygons retain their IDs. New imagery observations use `local/...` IDs and `source: observation`.
- Added an approximate U-shaped Senate roof outline plus eight visibly missing, unnamed roofs. Traces are observations, not surveyed wall coordinates.
- Management Sciences: two storeys, cream finish, green roof, tall front columns, upper glazing and nameplate based on its Maps photograph.
- Boys' hostel: four storeys, cream/terracotta facade panels, green roof and stacked balconies based on its Maps photograph.
- Central Administration: a compound of three mapped wings, cream/orange facade treatment informed by its Maps photograph.
- Compound roof generation for irregular outlines; courtyards and footprint shapes are retained.
- Approximate observed forecourts, science access paths, Phase 1 loop and the park beside administration. Their dimensions/materials still need refinement.
- Roads use mapped centre lines plus recorded observations; estimated kerbs/markings are not a road survey.
- Real DEM elevations, smoothed and locally graded at foundations; vegetation follows ESA WorldCover 2021, with estimated individual trees.
- Explorer data reduced from the full ~2 MB Oye file to **102,821 bytes** for the current campus extract. The intermediate 94 KB figure predates the eight extra roof observations and theatre grouping.
- Courier now selects named primary buildings near roads; the changed destination set still needs a full gameplay regression check.

### Performance measures already in place

- Low-power WebGL, no antialiasing or post-processing, Lambert materials and shared generated textures.
- Merged static geometry and instanced trees, maximum 3,200 trees.
- 1280 × 720 rendering ceiling and 24 fps navigation cap.
- Rendering stops when idle, hidden or offscreen; reduced-motion support.
- One cached 1024² shadow map; slow-frame fallback reduces resolution and disables shadows.
- Latest opening-view visual capture reported **178,883 triangles and 143 draw calls**, with idle rendering stopped. These are headless software-WebGL observations, **not a measured FPS guarantee on the user's PC**.

## Current named-place inventory

The full evidence, coordinates, feature IDs, appearance notes and match types are in [research/oye-campus-inventory.json](research/oye-campus-inventory.json). Names are based on listing/imagery matches, not university certification.

| Place | Main feature ID | Important qualification |
| --- | --- | --- |
| Faculty of Management Sciences | `ms/1b77ae9be7b6829b` | Pin inside footprint; visible facade photo from Nov 2021 |
| Faculty of Science | `ms/f36a67c7baf5405c` | Pin/footprint match; height/facade estimated |
| Faculty of Education | `way/951581878` | Phase 1; pin adjacent to footprint, not inside |
| Faculty of Basic Medical Sciences | `ms/a4a5711314210e9e` | Phase 3; roof observation, facade not verified |
| Faculty of Social Sciences | `ms/5ad0a4312cd48f1b` | Phase 3; do not apply the town-geotagged photo as proof of this facade |
| Boys' hostel | `ms/f21e378e2871efba` | Four storeys observed in Nov 2022 photo |
| Old girls' hostel | `ms/0d54a652d9b95b28` | Pin/footprint match; facade estimated |
| Phase 1 Main Auditorium | `way/951581888` | Roof/outline matched; reviewed May 2022 photo shows interior |
| Central Administration | `ms/8d79d312faf8d996` | Courtyard pin; grouped with `ms/8e441f4da274c677` and `ms/268546222d2d761c` |
| New Senate Building | `local/senate` | Satellite-traced U shape; storeys/facade remain estimates |
| Theatre and Media Arts | `ms/76ef234c1ad990c6` | Compound match with western annex `ms/ea4308eda7502c7e`; needs independent confirmation |

Do not automatically assign each Maps pin to the nearest polygon. Some pins identify a department compound, courtyard, entire university, or an off-campus site.

## Remaining work, in recommended order

### 1. Fix validation and documentation drift — offline

- [ ] Replace the stale `assert.equal(count,85)` in `scripts/explorer-smoke.cjs` with checks derived from the current dataset/directory rules, plus checks for important named destinations and Phase 1 coverage. Do not blindly change it to 108; many polygons intentionally have no directory entry.
- [ ] Add meaningful tests for new compound roofs/ground clipping: finite geometry, courtyard preservation, adjoining surfaces, and bounded triangle counts.
- [ ] Test the compact dataset/inventory relationship: every named ID exists, groups have one primary entry, observations retain provenance, and excluded locations do not become campus destinations.
- [ ] Update README's obsolete 85-building description and old photo-led explanation.
- [ ] Update `public/data/scene-sources.json`: it still describes the old scene and old blog photograph, omits newer observations, and has stale landscape/identity statements.
- [ ] Replace About's hard-coded "Ten places" with the actual inventory count (currently 11).
- [ ] Clearly distinguish researched names, visual observations and estimated architecture in source notes.

### 2. Improve visual fidelity — mostly offline with saved evidence

- [ ] Refine roof ridges, intersecting wings and eaves. Uniform subdivision removed major cracks, but compound roofs still look faceted/patchy and do not yet resemble carefully modeled roof assemblies.
- [ ] Improve Management Sciences' frontage proportions and integration of glazing/columns/canopy. The current version is photo-informed, not an exact replica.
- [ ] Refine hostel window rhythm, central balconies/roof feature and proportions using the cached photo.
- [ ] Refine Administration and Senate models; do not silently promote guessed Senate storeys to verified facts.
- [ ] Improve forecourt boundaries/material transitions and building contact with sloping terrain. The latest exact ground clipping fix needs close inspection at several sites.
- [ ] Improve coarse shadow appearance without sacrificing the low-power budget.
- [ ] Match woodland coverage more closely to the inspected satellite view. Larger tree crowns were implemented; **new satellite-derived forest polygons were only being considered and were NOT implemented**. Preserve bounded instancing if adding them.
- [ ] Check entrance direction and road access for each named destination. An estimated entrance is not proof of the real doorway.
- [ ] Continue comparing with the reference. The scene still does **not** reach its visual polish; do not present the whole campus as a finished digital twin.

### 3. Complete place matching where evidence supports it

- [ ] Faculty of Arts was found at `[5.3215416, 7.7788916]` (longitude, latitude), near `way/951581882` and `way/951581883` in Phase 1. Its cached Maps result exists, but it is **not yet in the inventory**. Validate the compound before naming it.
- [ ] Security Unit appears north of the Phase 1 auditorium; cached listing gives plus code `Q8JC+3XV`. `way/951581889` is a candidate from the overlay, not a verified match.
- [ ] New Faculty of Science Auditorium pin `[5.3136376, 7.77927]` falls on apparently open ground in inspected imagery. Leave unresolved until a better source reconciles this.
- [ ] Main-campus library identity remains unresolved. The Maps "University Library, FUOYE" listing is at `[5.328548, 7.7978432]` in town, not the current campus scene.
- [ ] ICT listing `[5.342974, 7.7991459]` is also outside the modeled main campus.
- [ ] Keep Ikole faculty/hostel results, private hostels east of University Road and suspect generic-pin listings out of the Oye campus directory.
- [ ] Treat the area-of-interest polygon as scene coverage, not an official property boundary.

Any additional internet research should answer a specific unresolved question. The user prefers the supplied Maps evidence to generic or outdated blog posts. Even current Maps pages contain older photographs.

### 4. Integrate the review workspace with the new evidence

- [ ] `/review.html` still loads the full `oye.geojson`, so new `local/...` observations and campus metadata are not automatically available there.
- [ ] Merge/select the campus records appropriately without duplicating shared footprints.
- [ ] Review inspector source handling currently recognizes Microsoft versus OSM only; add observation provenance before showing local traced features.
- [ ] Preserve existing saved note IDs and localStorage notes. Validation now permits bounded `local/...` IDs alongside existing OSM/Microsoft IDs.

### 5. Run end-to-end checks and measure performance

- [ ] Run TypeScript/production build after the final geometry changes.
- [ ] Run unit tests and the corrected browser suite.
- [ ] Check directory focus, all named sites, Full view, walking/jumping/collision, touch controls, night/day, road reset, courier delivery success, timer expiry/retry and review routing.
- [ ] Confirm all selected delivery rings are reachable and not inside buildings; travel distances and time bonuses must still work across the expanded campus.
- [ ] Check roof/ground appearance at street level and from the opening view, not just from one aerial screenshot.
- [ ] Check idle/hidden-tab rendering, sustained navigation, resource disposal/HMR and memory use. Test on the user's device where possible.
- [ ] Review the larger full-campus view's geometry/draw-call cost as well as the close opening view.
- [ ] Only after local quality is acceptable, address public deployment if the user wants it. Pushing GitHub did not deploy a site.

## What was actually tested

- Before the map-driven expansion, unit tests, build and the full browser suite passed for the **old 85-building scene**.
- A production build passed after the first implementation of the expanded data/model system, **before the final extra-roof and ground-clipping changes**.
- After those later changes, `scripts/campus-visual.cjs` ran successfully against Vite. It captured the overview, Management Sciences, hostel, Senate and Phase 1 auditorium and reported the 62 entries / 178,883 triangles / 143 draw calls noted above.
- The complete suite has **not** been rerun against the final expanded scene. Do not claim otherwise.
- `output/explorer-checks.json` is the old successful report: it still says 85 entries and 140,059 triangles. It is not evidence for the current scene.

Useful commands, after fixing the stale browser assertion:

```powershell
npm test
npm run build
npm run test:browser
node scripts/campus-visual.cjs
```

Browser scripts use installed Chrome with headless software WebGL and need a local dev server. `explorer-smoke.cjs` supports `BASE_URL`. They write screenshots/reports into ignored `output/`.

## Code and data guide

| File/path | Role |
| --- | --- |
| `src/main.ts`, `src/explorer.ts`, `src/explorer.css` | Main entry, compact data loading, reference-style UI/directory/About |
| `src/explorer-scene.ts` | Three.js scene, camera, input, modes, courier HUD, rendering lifecycle |
| `src/world/build.ts` | Buildings, observed profiles, roads, grounds, terrain, collision data |
| `src/world/architecture.ts` | Compound roofs and ground patches clipped to terrain triangles |
| `src/world/materials.ts`, `batch.ts`, `vegetation.ts` | Shared textures/materials, batching, bounded instancing |
| `src/world/math.ts`, `motion.ts`, `courier.ts`, `render-loop.ts` | Geometry/elevation, movement, game rules and frame scheduler |
| `src/review.ts`, `src/style.css`, `src/scene.ts` | Separate map/notes workspace and its legacy optional 3D view |
| `src/data.ts` | Shared types, note validation/storage and older landmark checklist |
| `research/oye-campus-inventory.json` | Editable named-place records and appearance evidence |
| `research/oye-site-observations.json` | Editable traced roofs, paths and ground surfaces with provenance |
| `scripts/prepare_campus.py` | Repeatable offline generator of the compact runtime extract |
| `public/data/campus.geojson`, `campus-places.json` | Generated runtime campus geometry and evidence inventory |
| `public/data/oye.geojson`, `research/data/` | Full Oye-area geometry and original open-data inputs |
| `public/data/terrain.json`, `landcover.json` | Prepared elevation and vegetation rasters |

After editing the inventory or observations:

```powershell
npm run data:campus
```

This regenerates the two campus runtime files **offline**. Preserve stable IDs and source metadata. The main scene center is `[5.3163, 7.7772]`; coordinates are `[longitude, latitude]`. Terrain bounds are `[5.304, 7.768, 5.325, 7.787]`. Expansion outside that domain needs explicit terrain/cover handling.

**Do not rerun one-off editing scripts blindly.** `apply-campus-models.py`, `apply-campus-world.py`, `fix-campus-surfaces.py`, `seed-campus-inventory.py`, `seed-site-observations.py` and `extend-observed-buildings.py` record how earlier edits were made. Some use non-idempotent string replacements, overwrite newer records or append duplicate places. They are not the normal build pipeline. Edit the canonical files and use `prepare_campus.py` instead.

`npm run data` rebuilds the full Oye dataset from existing raw inputs. Terrain/land-cover preparation scripts can access the network and need extra Python packages; do not run them just to start the app.

## Research evidence and dates

Maps satellite and place pages were inspected on **10 October 2026**. Screenshot copyright labels saying 2026 do not establish image acquisition dates. Inspected facade photos were dated Nov 2021 (Management), Oct 2021 (Administration), Nov 2022 (boys' hostel); the auditorium photo showed an interior captured May 2022. These dates are recorded rather than presented as new photos.

Supplementary official university sources already consulted:

- https://news.fuoye.edu.ng/fasina-delivers-160-projects-in-5-years/ — February 2026 infrastructure context.
- https://news.fuoye.edu.ng/how-fuoye-faculties-rose-from-eight-to-eighteen-students-enrolment-to-60-000-under-prof-fasina/ — February 2026, Blue-Roof initiative and facilities.
- https://news.fuoye.edu.ng/vc-fasina-inaugurates-national-recognition-scheme-in-fuoye/ — honorary building names; naming alone does not locate a footprint.
- https://news.fuoye.edu.ng/fuoye-to-commence-college-system-in-october-as-registrar-unveils-major-administrative-reforms-2/ — 2026 administrative/relocation context; avoid assuming old occupancy remains current.

Locally cached evidence, **not included in Git**:

- `tmp/maps/`: Maps listing JSON, page snapshots and research screenshots. In particular `west-detail.png`, `north-detail.png`, `east-detail.png`, `satellite-campus-detail.png`, `management-detail.png`, `fuoye-boys-hostel-detail.png`, `fuoye-central-administrative-building-detail.png`, `phase1-detail.png`.
- `tmp/maps/fuoye-faculty-of-arts.json`, `fuoye-security-unit.json`: latest unmatched Phase 1 search results.
- `output/*-footprint-audit.jpg` and corresponding JSON: yellow open-footprint overlays compared with satellite views; useful for checking geometry alignment.
- `output/campus-map-update.png`, `campus-management.png`, `campus-hostel.png`, `campus-senate.png`, `campus-phase1.png`: latest app captures.

A fresh Git clone will not contain these caches. The tracked inventories/source links still explain the research. Keep local caches on this PC to avoid downloading them again. Do not upload browser session/cookie files or research imagery indiscriminately. Google/reference imagery is not used as runtime texture assets.

If new Maps research is unavoidable, the public-page Playwright scripts in `scripts/` were used. `--disable-webgl` worked more reliably for satellite research. Scripts conditionally honor `HTTPS_PROXY`/`HTTP_PROXY`; some sessions had neither. Never print proxy credentials or browser storage contents. Map pages sometimes partially load, so inspect the capture and its timestamp before treating it as evidence.

## Git checkpoint

These five commits were pushed to `origin/main`, then local/remote HEAD were verified equal and the working tree was clean:

| Commit | Conventional message |
| --- | --- |
| `dc5715a` | `chore(project): initialize Vite and TypeScript tooling` |
| `bb9e750` | `feat(data): add mapped FUOYE campus datasets and research` |
| `b44d813` | `feat(explorer): add lightweight campus exploration and courier gameplay` |
| `7daa50d` | `test(explorer): add geometry gameplay and browser checks` |
| `9fd0856` | `docs(project): document controls research and reconstruction limits` |

This handoff is a subsequent documentation change. Check `git status` and `git log` for the exact latest state before continuing. Preserve the user's changes and continue using logical conventional commits when asked to commit. No force-push is needed.

Ignored folders include `node_modules/`, `dist/`, `tmp/`, `output/` and `research/reference/`.

## Suggested message for the next model

> Read PROJECT_HANDOFF.md in my FUOYE Explore repository before doing anything. Continue the existing Oye-campus reconstruction toward the Mount Allison reference. Start with the offline remaining-work checklist, preserve the reference interface, and keep the game lightweight because it previously froze my PC. My internet data is limited: use the existing project, evidence and cached screenshots first. Do not restart or invent buildings. Explain any uncertainty honestly, and do not claim the current expanded scene has passed tests that only ran on the older version.
