# Ikole campus reconstruction

Updated 8 November 2026. Ikole is now available through `/?campus=ikole` and the campus selector. This is an approximate, independent reconstruction, not a surveyed digital twin or official property map.

## Campus reference and entrance

The user's supplied link, https://maps.app.goo.gl/2Gt5Y47yTNwXkimb6, resolves to Fuoye Campus at **7.8055315 N, 5.4952357 E**. It is an internal campus reference point, not the main entrance.

The southern approach connects to Ifaki–Ikole–Omuo Road. Gatehouse roofs crossing that approach were inspected at closer scale, and the map coordinate readout gives the central passage at approximately **7.801126 N, 5.496065 E**. The frontage now follows [Samuel Ajala’s labelled Ikole photograph, published November 2021](https://campusreporter.africa/ekiti-communities-sue-for-peace-despite-controversies-surrounding-the-establishment-of-fuoye/): twin arches, sloping cream wings, yellow piers, green/white gates, central green-roof booth and sculpture silhouette. Dimensions, sculpture details and current condition remain unverified. The recorded entrance coordinate aligns with the open lane; both leaves there swing inward for walking and driving. No photograph is redistributed. Two OSM roof footprints crossing the passage are replaced by the open procedural gatehouse assembly so they do not become solid collision walls.

The exact source URLs, coordinates, match types, notes and observation calibration are retained in [the canonical record](ikole-site-observations.json). The published [inventory](../public/data/ikole/campus-places.json) exposes those limitations to visitors.

## Evidence and modelling

- OpenStreetMap supplies mapped roofs and highway context. Its 8 November extract is retained at `research/data/ikole-area.osm` under ODbL attribution. Campus coverage is a manually selected scene extent, not an ownership boundary.
- Satellite imagery was inspected north-up through Google Maps on 8 November. Source image acquisition dates are unavailable; the displayed 2026 copyright year is not an image capture date.
- Internal road centre lines and missing roof outlines are explicitly attributed approximate visual traces. Pixel-to-coordinate conversion uses the supplied pin and was checked against a map coordinate readout. Expected visual tracing uncertainty is roughly 5–15 m.
- Engineering, Library, Agriculture, Environmental and Hostel compounds are matched to map listings. The Library and Agriculture pins lie within their primary footprints. Engineering and Environmental use compound-level matches; wing assignment is inferred.
- “New Faculty Building” retains the general map label. Its faculty identity and current use are unconfirmed. No guessed gender allocation or hall names are attached to the hostel compound.
- A February 2022 campus gallery photograph shows a yellow upright gear and green open-ended wrench on a turquoise Engineering plinth, with tall white columns on the cream building behind it. The procedural monument and column treatment use that evidence; exact dimensions and monument placement are estimates. No photo or satellite tile is bundled as a runtime asset.
- The sports field retains its approximate observed extent, with Oye’s striped grass and football markings applied at the owner’s request. The data keeps `surface: ground` and records `render:surface: grass` separately; this is a visual treatment, not a claim that current turf was verified. No stadium, spectator stands or floodlights have been assumed.
- Terrain is a 97 × 97 Mapzen Terrarium elevation window. The model keeps source elevation scale, with foundation/gate grading. The downloaded elevation range is about 529–567 m.
- Vegetation uses a separate Ikole window of ESA WorldCover 10 m 2021 v200, with CC BY 4.0 attribution. This is 2021 land-cover classification, not a current tree survey. Individual trees, heights and species are procedural estimates.

FUOYE's own sites establish institutional context, not precise footprint assignments:

- https://fuoye.edu.ng/contact/
- https://fuoye.edu.ng/rt-faculty/faculty-of-engineering/
- https://agriculture.fuoye.edu.ng/
- https://news.fuoye.edu.ng/vc-fasina-inaugurates-national-recognition-scheme-in-fuoye/

## Current scope

The prepared dataset contains **47 building outlines**, **13 road records**, **one sports-ground surface** and **six named compound records**. The 3D scene adds the gate, Engineering monument and a selectable sports landmark. The guided tour contains eight stops: entrance, Engineering, Library, Hostel, New Faculty Building, Agriculture, Sports and Environmental.

The established walking, driving, courier, lighting and tour systems are reused. Campus selection loads only the selected scenery, cancels obsolete requests and releases the previous experience. Notes and scores remain separate; old Oye keys are preserved. No fresher missions, new search/navigation feature or discovery passport was added.

## Validation and remaining limits

- 39 Node tests pass, including data attribution/geometry, pin-containment claims, complete terrain/land-cover coverage, latest-selection cancellation, resource disposal, passable entrance and valid tour spawns.
- Collision reachability is checked from the entrance to every courier destination using a 6 m grid with metre-spaced edge sampling, vehicle clearance and tree obstacles. Off-road movement is allowed by the game. This does not replace a keyboard-driven driving check.
- Production TypeScript checking and Vite build pass.
- Browser checks verified Oye/Ikole switching, repeated rapid selection leaving one active map, building popups and a 390 × 844 iframe viewport with no page overflow. Selecting a building closes the compact directory.
- The cloud browser cannot create a WebGL context. It correctly opens the campus-specific map fallback. **3D appearance, touch walking/driving and graphics-quality controls still require visual/device verification in a WebGL-capable browser.** Geometry tests paint stub textures and do not establish rendered appearance.

Further accuracy work can improve individual facades and update compound identities as current photos or university-confirmed plans become available.

## Entrance lane correction

The approach trace is connected to the mapped public highway. Its central 50 m follows the gate bearing through the open arch; farther inside campus it rejoins the approximate observed trace. The front-facing school nameplate is an owner-requested addition. These are scene corrections, not surveyed road geometry. Road surfaces and markings are clipped to the terrain triangles to avoid intersections on uneven ground.
