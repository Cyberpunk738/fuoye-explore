# FUOYE in 3D

A fullscreen Three.js explorer of Federal University Oye-Ekiti's Oye campus area, following the layout and interactions of [Mount Allison in 3D](https://mount-alison-3d.vercel.app/).

## Run

```sh
npm install
npm run dev
```

Open http://127.0.0.1:5173/. `npm run build` builds the explorer and `/review.html`; `npm run preview` serves that build.

## Controls

- **Orbit:** drag to rotate, right-drag to pan, scroll/pinch to zoom. Hover highlights a building. Click a building or directory entry to fly closer. Full view fits the campus.
- **Drive:** Campus Courier offers Start, Free drive and Exit. WASD/arrows drive, Space drifts, R resets to a road, Escape exits. Timed runs start at 75 seconds. Follow the gold arrow/beacon and slow down inside the ring to deliver. Deliveries add points and time; best score persists in this browser.
- **Walk:** WASD/arrows move, Shift runs, Space jumps. Click for mouse-look, or drag if pointer lock is unavailable. Escape releases mouse-look; Escape again exits. On touch screens, the left thumb moves and the right thumb looks.
- **Night:** moonlight, stars, illuminated windows/lamps and a driving headlight. Day restores daylight.

The main page uses the reference's floating directory, serif title, four controls, mode-specific HUD and attribution footer. The map and notes workspace remains at `/review.html`, accessible through About.

## Evidence and limits

The current main-campus extract includes 108 building polygons across Phases 1, 2 and 3, with 11 named places and 62 directory entries. Small supporting structures and secondary wings stay visible without cluttering the directory. Names are tied to Maps pins or visible compounds, with match confidence and source links in the inventory; they are not official university verification. Unknown buildings remain numbered.

OSM/Microsoft outlines establish most geometry. The new Senate and eight unnamed roofs use explicitly recorded approximate satellite traces. Management Sciences, the four-storey boys' hostel and Administration have photo-informed facade profiles. Reviewed contributor photos date from 2021–2022; satellite acquisition dates are unavailable. Unobserved heights, dimensions, entrances and facade details remain estimates.

ESA WorldCover **2021** guides vegetation coverage, not individual tree positions. Recorded forecourts, paths and the park beside Administration follow inspected imagery. Roads/terrain use real DEM elevations without vertical exaggeration; foundation grading is estimated. Ground patches are clipped to the rendered terrain triangles. This remains a reconstruction in progress, not a finished digital twin.

See [source metadata](public/data/scene-sources.json), [campus research](research/oye-campus-research.md) and [reference comparison](research/reference-parity.md). Reference photos and downloaded reference source are not redistributed in the app.

## Performance

Low-power WebGL, Lambert materials, shared textures, spatially chunked tree instances, a 1280 × 720 resolution ceiling and a 24 fps navigation cap. Idle, hidden and offscreen scenes stop rendering. Reduced-motion preferences shorten flights and remove walking bob. A slow-frame fallback reduces resolution and disables shadows.

The static world uses one cached 1024² shadow map, fitted more closely when focusing a building. Buildings cast onto the ground without facade self-shadowing. The terrain has 96 × 96 cells; at most 3200 trees share small crowns and trunks. Night uses emissive surfaces, lamp sprites and one unshadowed headlight. No ambient occlusion, post-processing, animated crowds or background traffic. Actual speed depends on the device.

## Validation

```sh
npm test
npm run build
npm run test:browser
npm run test:review
npm run test:routes
```

The browser check expects installed Chrome and a dev server on port 5173; set `BASE_URL` for a different origin. Headless software WebGL checks directory selection, courier start, free driving, reset, walking/jumping, night/day, mobile layout/touch movement, review routing, a geometry budget and idle rendering. Reports/screenshots go to ignored `output/`. Unit tests cover notes, geometry, elevation, the scheduler, car/jump physics, delivery rules and source provenance.

The review check verifies visible outlines, source links, note persistence and zero external requests by default. The route check builds the actual collision world without WebGL, verifies access to all 11 roadside drop-offs and exercises scoring/bonus/next-target rules at each. It permits off-road travel and does not replace a keyboard-driven delivery run.

The reference inspection script is a research aid; its heavy renderer can time out under software graphics. It is not a required application test.

## Map notes and data

At `/review.html`, the current campus evidence is merged into the wider map. Street-map tiles are opt-in; the default view uses bundled data and system fonts. Select a footprint and save its name, status and evidence. Export/import JSON backups. Reload the explorer after editing to update directory names. No backend or account is needed.

`npm run data:campus` regenerates the compact runtime extract offline from the canonical inventory and site observations. Do not rerun the one-off seed/apply/fix scripts as a build pipeline; some overwrite later work.

`npm run data` rebuilds footprints from downloaded inputs. `scripts/prepare_terrain.py` needs Python/Pillow. `scripts/prepare_landcover.py` reads only the Oye window of ESA's public cloud-optimized GeoTIFF and needs Python/rasterio/certifi. Prepared JSON files are included; the main explorer makes no runtime map/elevation API calls.

## Sources

- [OpenStreetMap](https://www.openstreetmap.org/copyright), ODbL.
- [Microsoft Global ML Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints), CDLA Permissive 2.0.
- [Mapzen Terrain Tiles](https://registry.opendata.aws/terrain-tiles/), elevation courtesy of USGS; resolution varies.
- [ESA WorldCover 2021 v200](https://doi.org/10.5281/zenodo.7254221), CC BY 4.0.
- [Published FUOYE campus photograph](https://businessday.ng/education/article/fuoye-not-open-for-academic-activities-yet-fasina/).
- [FUOYE infrastructure captions](https://old.fuoye.edu.ng/physical-infrastructure-program-upgrade/).
- [FUOYE naming announcement](https://news.fuoye.edu.ng/vc-fasina-inaugurates-national-recognition-scheme-in-fuoye/).
- [Mount Allison in 3D](https://mount-alison-3d.vercel.app/), layout/interaction reference by 0xbigturk.
