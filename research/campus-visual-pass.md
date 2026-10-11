# Campus visual refinement — 11 October 2026

This extends the [Phase 1 pass](phase1-visual-pass.md) using already saved evidence. Wema is excluded at the user’s request. No new research downloads or dependencies were needed.

## Observed features and interpretation

- Management Sciences: saved `tmp/maps/management-detail.png` (November 2021) shows cream walls, tall rectangular columns, broad upper glazing and paired entrance bays. The model now uses the corresponding composition, a middle beam/sign and paired doors. Exact spacing and dimensions remain inferred.
- Boys’ hostel: saved `tmp/maps/fuoye-boys-hostel-detail.png` (November 2022) shows four floors, ivory walls, terracotta recesses, turquoise louvres and stacked balconies with horizontal white rails. These details now use shared geometry/materials and a small procedural louvre texture. Unseen elevations repeat the estimated rhythm.
- Administration: saved `tmp/maps/fuoye-central-administrative-building-detail.png` (October 2021) shows projecting orange rectangular framing and wide dark windows. Deeper frames, intermediate beams and broad louvre panels reflect that composition. Roof and dimensions remain approximate.
- Other named buildings retain their mapped outlines and existing estimated profiles; window reveals, roof shading and narrow ground-contact aprons improve depth. Senate’s height and facade have not been verified by a new photograph.
- Existing observed park and paved paths receive low edging with gaps at roads and paths. Edging and aprons are illustrative treatments, not confirmed physical assets. No additional grass or garden polygons were added in this extension. The Phase 1 pass supplies the three recorded lawn/verge observations.

Saved source links and confidence remain in the building inventory and [scene metadata](../public/data/scene-sources.json). These older contributor photographs cannot establish the exact condition of campus in 2026.

## Runtime constraints

No extra network assets, post-processing, dynamic shadow lights or background traffic. Retain 3,200 total trees, at most 480 detailed nearby crowns, 24fps navigation cap, 1280×720 render ceiling and stopped idle rendering. Shared materials and merged geometry keep the Full view under the existing 350,000 triangle / 250 draw-call limits.

## Validation

The expanded `npm run test:landscape` captures the gate, auditorium, Science, Management Sciences, hostel, Administration, Senate and Full view, and checks rendering budgets, near/far tree detail, walking, day/night and stopped idle rendering. Final results are recorded after execution in the local ignored handoff.

Visual/build results: 28 unit tests and production build passed. All eight landscape views passed; Full view uses 267,714 triangles / 236 draw calls, with no detailed tree crowns active. Gate uses 256,066 / 160, with 177 detailed trees. Idle rendering stops. Screenshots were reviewed for Management Sciences, hostel and Administration. These are geometry checks under software WebGL, not a hardware FPS guarantee.

Final regressions also passed: full desktop/mobile explorer, exact-point Walk/Drive and nearby exits, all 11 courier route/collision and scoring checks, and both gate lanes. The route audit allows off-road paths; it is not a complete keyboard-driven delivery run.
