# FUOYE Oye campus: research and implementation brief

Researched 8 October 2026. Scope: Oye campus only. This is an initial source and data audit, not a completed campus survey.

## Finding

A browser-based, stylised 3D campus is feasible. Public geographic data can provide a starting layout, but an accurate FUOYE model requires matching footprints to named buildings, verifying the campus boundary, and gathering architectural references. Available datasets must not be treated as a complete, current campus inventory.

## What the reference creator actually advised

[Turk's follow-up post](https://x.com/0xbigturk/status/2107815454664274293?s=20) was read in the browser. Its recommendations are to begin with OpenStreetMap; obtain elevation from open datasets, with LiDAR particularly available in North America; expect an initial low-detail model; supply more pictures and request more detail; repeatedly correct errors; and optimise at the end. The post mentions Opus as the author's tool. These are workflow tips, not a requirement to use a particular model.

[The live reference](https://mount-alison-3d.vercel.app/) was inspected. It shows selectable campus buildings, an aerial overview, walking/driving controls, and a night option. No source repository or exact implementation was verified.

Application to FUOYE: establish geographic evidence first, create a simple model from that evidence, then improve recognisable landmarks with photographs. Profile performance from the beginning, while leaving final compression and quality tuning until the geometry is reasonably stable.

## Geographic data actually retrieved

Two raw OSM XML extracts are saved in `research/data`. Longitude and latitude are WGS84. Bounding boxes below are exploratory rectangles, NOT campus boundaries. Counts overlap and must not be added together.

| File | Requested bbox: west, south, east, north | Nodes returned | Ways returned | Ways tagged building |
|---|---|---:|---:|---:|
| oye-area.osm | 5.315, 7.785, 5.340, 7.810 | 22,369 | 4,346 | 4,093 |
| oye-south-area.osm | 5.315, 7.765, 5.350, 7.790 | 2,736 | 380 | 335 |

These are surrounding Oye-area features, including town development. They do not establish that FUOYE has 4,093 or 335 buildings. API map responses may include the complete nodes of ways intersecting the requested rectangle, so returned geometry can extend outside it.

Inspection found no ways with `height` or `building:levels` in the first extract and very sparse way names: two named ways, both town streets. The southern extract had no named ways. Building functions, roofs, colours, and storeys remain unverified. No campus polygon was identified in this pass. Nominatim searches for the full university name and FUOYE returned no results in the browser; that does not prove the campus is absent from OSM. Nominatim and Overpass HTTP attempts failed; the direct OSM map API worked.

Retrieval URLs:

- https://api.openstreetmap.org/api/0.6/map?bbox=5.315,7.785,5.34,7.81
- https://api.openstreetmap.org/api/0.6/map?bbox=5.315,7.765,5.35,7.79

[OSM's licence page](https://www.openstreetmap.org/copyright) explains attribution and ODbL requirements. Keep the original data and its provenance; include attribution in the eventual map and review derived-database obligations before distribution.

## Additional usable data sources

| Source | Potential use | Verified limitation |
|---|---|---|
| [Google Open Buildings V3](https://sites.research.google/gr/open-buildings/) | Fill gaps in footprint geometry | Nigeria is covered at country level. Exact campus detections have not been downloaded or audited. Machine detections can be missing, shifted or false. V3 inference took place in May 2023 and source imagery may be older. |
| [Open Buildings 2.5D](https://sites.research.google/gr/open-buildings/temporal/) | Supplement height estimates | Annual raster data spans 2016–2023. Exact campus height quality has not been checked; this is not a collection of detailed 3D buildings. |
| [Copernicus via OpenTopography](https://opentopography.org/news/updated-copernicus-30m-DEM-available) | Broad terrain relief | GLO-30 has roughly 30 m resolution and is a surface model including vegetation/infrastructure. It cannot resolve steps, kerbs, drains or individual paths. API access requires a key; no elevation tile was fetched. |

Google Open Buildings is separately distributed under a choice of CC BY 4.0 or ODbL. It does not include the underlying satellite imagery. Choose and document the licence before combining data. Do not confuse this downloadable dataset with unrestricted reuse of Google Maps content.

No freely downloadable campus-scale LiDAR dataset was verified for Oye. The creator's North American LiDAR advice cannot be assumed to apply here. Begin with broad terrain, and correct ground levels around buildings and roads when supported by evidence.

## FUOYE-specific evidence

[FUOYE's official contact page](https://fuoye.edu.ng/contact/) distinguishes the Oye main campus from Ikole. Use it for scope and address context, not as a building survey.

[The university's July 2025 naming announcement](https://news.fuoye.edu.ng/vc-fasina-inaugurates-national-recognition-scheme-in-fuoye/) provides names and aliases. Useful candidates include the main library/Adesuyi Lanre Library, main administration/Mohammed Yahuza Admin Block, new senate/Bola Ahmed Tinubu Senate Building, health centre/Ameyo Stella Adadevoh Building, sports arena/Samuel Oparaji Sport Arena, and Millennium Park/Obafemi Awolowo Freedom Park. It explicitly distinguishes some Oye and Ikole hostels. The article covers multiple campuses; do not assign every entry to Oye or to a footprint without checking.

[Olaseeni and colleagues' Phase 2 study](https://repository.run.edu.ng/server/api/core/bitstreams/154faad4-eb62-4298-9b59-baf33406e0aa/content) contains a base map (PDF page 4), names several Phase 2 facilities, and describes access by major/minor roads. It is supporting historical context rather than a current authoritative campus boundary.

[Fagbemigun and colleagues' 2024 study](https://lafiascijournals.org.ng/index.php/ljsir/en/article/download/321/276/1237) contains an Oye campus map (PDF page 2) and discusses the proposed Phase II Faculty of Law building opposite administration. Its coordinate text is inconsistent with other sources and includes malformed geographic notation. Do not feed those coordinates directly into the model. The figures were located but their detailed building labels were not transcribed or visually audited in this pass.

[A 2019 study's campus figure](https://www.researchgate.net/figure/a-Administrative-Map-of-Ekiti-State-Showing-Oye-Local-Government-Area-and-b-Map-of_fig1_337589769) gives another location reference. Published coordinates differ across papers. Confirm at least two recognisable landmarks against a current map before setting the scene origin.

[FUOYE's public campus-video announcement](https://www.linkedin.com/posts/federal-university-oye-ekiti_catch-a-glimpse-of-our-campusfuoye-activity-7263302823633711104-xXRI) is a lead for visual references. The announcement was read, but the video itself was not inspected, downloaded or licensed for reuse. Official news photographs and local photos may supply facade references after location and date checks.

Some redesigned university pages contain obvious placeholder content, including the `about-keep-temp` page. Treat an official domain as a source to evaluate, not proof that every statistic, image, or template section is reliable.

## Proposed data workflow

1. **Anchor and boundary.** Confirm the main gate and a second recognisable landmark on current imagery. Identify Oye's Phase 1/Phase 2 relationship and outline the intended model extent. A surveyed/property boundary and a rendering extent are different things.
2. **Coverage audit.** Clip and deduplicate OSM buildings and roads by ID. Cross-check against Open Buildings and imagery that permits the intended use. Record missing and suspected false footprints. Do not merge nearby rectangles and call the result the campus.
3. **Building registry.** For each candidate store a stable ID, footprint, name, aliases, function, roof form, storeys/height, reference URLs, dates, and confidence per field. Keep unknown fields unknown. A known name does not establish its position.
4. **References.** Gather roof and facade evidence for recognisable landmarks. Record which view each photo supports. Recent photos or a short student walkthrough can fill gaps later; they are not required to begin the source audit.
5. **Terrain.** Fetch the relevant elevation subset, transform it into metres, and compare it with ground observations. Smooth/correct surface-model effects carefully. Mark any correction that is estimated.
6. **Review map.** Produce a 2D overlay of identified footprints and routes for local review before investing in detailed architecture.

## Proposed implementation

Use TypeScript, Vite and Three.js for the custom repository. Convert longitude/latitude into a local metric coordinate system; UTM zone 31N is a candidate for this longitude, with datum explicitly set to WGS84. Keep geographic source files separate from render assets.

Extrude verified building footprints for the first scene. Implement orbit/pan/zoom, selection and a searchable directory first. Replace key landmarks with custom roofs and facade details as evidence becomes available. Generic estimated heights must be recorded as estimates.

Walking mode follows once entrances, paths and collision geometry are credible. Directions require a connected pedestrian graph, including actual entrances and walkable links; road lines alone are insufficient. Add night lighting after the daytime scene is readable. Driving is optional and comes after the core campus experience.

Use instancing for repeated vegetation/windows and distance-based detail for landmark models. Plan mobile controls and a low-quality setting early. Proposed targets, subject to profiling: a useful first view within a few seconds on ordinary mobile data, a small compressed initial download, and comfortable interaction on a representative Android phone. Desktop-only testing cannot establish mobile performance.

## Next concrete deliverable

An audited 2D campus overlay with identified landmarks, uncertain features and source links. Then a geographically grounded Three.js overview of a small verified section, expanded across the Oye campus. The main remaining uncertainty is geographic identification and source completeness, rather than the rendering technology.

## Implementation pass: 8 October 2026

The first local prototype now has a 2D review map, a source-linked landmark checklist, browser-local identification records, JSON export/import, and a Three.js massing preview of the map's current view. Identities are not automatically assigned. Identified records require reviewer evidence. The 3D view uses flat ground and a uniform 6m placeholder height, not measured architecture.

Figure 1 of the Phase 2 paper was rendered and visually inspected in this pass. It distinguishes administration, the park, Science, Education, Management Sciences, TMA, FUOYE Water, hostels and roads toward other phases. These historical relationships support review, but do not establish current exact building matches. The diagram was not redistributed or used to invent footprint geometry.

The Google Maps search for the university showed the Oye-Are Road university listing at approximately 7.778621 N, 5.314686 E, consistent with the southern area being investigated. This is a listing location, not a surveyed main-gate coordinate or campus boundary. No Google imagery or building geometry was extracted into the app.

A third OSM extract, `oye-campus-west.osm`, was fetched from https://api.openstreetmap.org/api/0.6/map?bbox=5.300,7.765,5.325,7.787 to include western surroundings. It did not add unique buildings after ID deduplication. The OSM scene left a noticeable building-coverage gap in the apparent Phase 2 area.

[Microsoft's Global ML Building Footprints](https://github.com/microsoft/GlobalMLBuildingFootprints) provided a useful additional source under CDLA Permissive 2.0. A 13.5MB compressed Nigeria tile (`122220311`, release 2026-07-24) was downloaded. The subset rectangle 5.307–5.323 E, 7.770–7.785 N yielded 169 machine-detected candidate outlines. A conservative centroid/8m overlap filter retained 118 additional features and skipped 51 likely duplicates. This filter is not a full geometric overlap audit and may suppress close neighbouring buildings or retain shifted overlaps.

The combined prepared dataset now contains 4,416 building features, 242 road/path features and 3 land-use features across the exploratory region, not just campus. Each building retains source provenance. The raw supplemental subset is saved in `research/data/microsoft-oye-subset.geojson`; raw archives are unnecessary to run the app. Exact image dates and identities remain unverified. See the project README for run commands and next-stage work.

### Architectural scene — 8 October 2026
The 3D view now renders facade modules against downloaded polygon edges, estimated one/two-storey heights, green hip roofs on approximately rectangular outlines, road ribbons with estimated class-based widths, batched illustrative trees, directional shadows and a close building-study camera. The cream/green palette follows the visible campus photograph at https://cdn.businessday.ng/2020/09/fuoye-campus.jpg (article: https://businessday.ng/education/article/fuoye-not-open-for-academic-activities-yet-fasina/). The university gallery https://old.fuoye.edu.ng/physical-infrastructure-program-upgrade/ supplies landmark captions, but its Central Admin image returned HTTP 500 during this session, so no facade is claimed as a verified reconstruction of that building.

The initial study camera focuses footprint ms/f0fb2b3536f87a09, whose identity remains unverified. Its veranda is an architectural approximation informed by the photo, not an observed feature of that exact footprint. Roof slopes, storey counts, window spacing and illustrative tree positions are not measurements. Terrain remains flat. Ground view supports keyboard movement with conservative footprint-box collision checks; it is not a surveyed pedestrian route. Photo copyrights remain with their owners; reference photos are not shipped as application assets.

### Full scene rebuild — 8 October 2026

Replaced the initial massing scene with a modular world builder (`src/world`) and an exploration renderer. The initial scene includes 85 mapped outlines in the fixed Oye study rectangle. Variants retain original footprint geometry and estimate hip/gable/terrace roofs, storeys where untagged, entrances, balconies, facade modules and fittings. Canvas-generated textures supply surface detail without redistributing source photos.

Actual Terrarium tiles from Mapzen Terrain Tiles were decoded into `public/data/terrain.json` (97 × 97 grid; region 5.304–5.325 E, 7.768–7.787 N). Four zoom-14 tiles were downloaded using the encoding documented at https://github.com/tilezen/joerd/blob/master/docs/formats.md. The sampled region ranges approximately 492–573 m above the dataset datum. Values are displayed relative to the scene centre, with no exaggeration. Ground around buildings is flattened for visual foundations. Objects sample ground triangles to avoid intersecting the DEM; mapped roads are clipped to its coverage.

Vegetation, connecting footpaths, planted courtyards, cars, people, signs, flags, benches and streetlights are illustrative. Three parking plots, a garden pavilion and a sports layout are clearly labelled as concepts; they do not establish the position or dimensions of actual FUOYE facilities. The garden is not claimed as Millennium Park and the sports concept is not claimed as the Samuel Oparaji Sport Arena. No pond or lake was invented to copy the Canadian reference.

Exploration now supports smooth building/site fly-to, a guided camera tour, terrain-following walking and vehicle navigation with collision limits, touch inputs, moving traffic/pedestrians, day/night lighting, glowing windows and vehicle headlights. Shadows and optional SSAO add depth; SSAO switches off after sustained low frame rates. Original map review and evidence-backed identification notes remain available. `public/data/scene-sources.json` records assumptions separately from sourced geometry.
