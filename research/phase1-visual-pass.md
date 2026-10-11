# Phase 1 architecture and landscape pass — 11 October 2026

## Evidence and scope

Pilot: Phase 1 main auditorium and entrance surroundings. The existing ground loop, footprints and gate position remain the basis. The supplied Mount Allison screenshot and cached inspection show varied tree silhouettes, facade depth, coherent roofs and distinct landscaped surfaces. Live access was attempted but no browser connection was available; this is not a new complete playthrough. No reference code or assets are shipped.

The saved [Maps satellite view](https://www.google.com/maps/@7.7792,5.3221,18z/data=!3m1!1e3) (`tmp/maps/east-detail.png`) shows a southern lawn, separate planted strips east of the auditorium and a tree row near its northern edge. Three approximate vegetation patches now overlay the earlier broad compacted-ground observation. Individual planting positions and hedge edges are interpreted, not surveyed; plant species are illustrative. No decorative gardens are added to unobserved areas.

The saved Maps interior photograph (`tmp/maps/phase1-detail.png`, capture May 2022) supports a single tall hall, cream walls, tall rectangular windows and repeated doors. Exterior window reveals, louvres, canopy construction and trim are inferred architectural treatments, not a verified facade replica. The [university infrastructure gallery](https://old.fuoye.edu.ng/physical-infrastructure-program-upgrade/) lists an auditorium renovation photo, but its image endpoint returned a CAPTCHA page. The image was not viewed or used. A secondary exterior thumbnail failed to load and was also not used. Recent publication/crawl dates are not photo capture dates.

## Implementation constraints

Keep all 108 footprints and 62 directory destinations. Preserve collision paths, the gate lanes, exact-point Walk/Drive entry and nearby exits. Share materials and batch small geometry. Improve tree detail only near the camera, with bounded counts and simple distant crowns. Keep full-view budgets below 350,000 triangles / 250 draw calls, the 24fps cap, 1280×720 render ceiling and idle stop. Original procedural textures only; no new runtime downloads.

## Validation

Baseline images and rendering counters: `output/landscape-before-{gate,auditorium,full}.png` and `output/landscape-before.json`. Final checks and screenshots are recorded in the ignored project handoff.

Final validation: 28 unit tests, production build, landscape views/LOD/budgets, desktop/mobile gameplay, Walk/Drive transitions, all 11 courier collision routes and gate lanes passed. Final Full view: 257,894 triangles / 234 calls; no detailed tree crowns in that distant view. Up to 480 nearby trees use grouped crowns; 3,200 total trees and idle stop retained. These counters do not measure FPS on the user's GPU.
