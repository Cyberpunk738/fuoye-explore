# Reference comparison — 9 October 2026

Reference: https://mount-alison-3d.vercel.app/

User's posts: https://x.com/0xbigturk/status/2107583015496953876 and https://x.com/0xbigturk/status/2107815454664274293 . X did not expose readable post bodies during research; no tips are attributed to unread content.

## Inspection

Compared the supplied screenshots, live DOM and public frontend assets. Live headless inspection confirmed Campus Courier and its Start / Free drive / Exit menu. The reference's heavy renderer stalled subsequent interactions under software WebGL: a complete manual playthrough was **not achieved**. Behavior below was established from its public application code. Our implementation and textures are original; downloaded reference bundles are an ignored research cache, never served or built.

## Feature comparison

| Reference | FUOYE implementation | Verification |
| --- | --- | --- |
| Fullscreen world, serif title, subtitle | FUOYE / Oye-Ekiti, Nigeria | Screenshot |
| Floating collapsible directory | 85 mapped buildings, reviewer names where present | Browser selection/mobile collapse |
| Drive / Walk / Night / Full view | Same order, positioning and mode visibility | Browser |
| Hover highlight, tooltip, click-to-fly | Canvas and directory interactions | Selection tested; hover inspected |
| Orbit, pan, wheel/pinch zoom | OrbitControls with directory view offset | Shared controls, visual check |
| Campus Courier menu | Start / Free drive / Exit | Browser |
| 75-second run, objective and distance | Timer, score, gold ring/beacon and direction arrow | Browser start + unit rules |
| Delivery score / time | 100 + round(remaining × 2); time +6 + next-stop distance/14 | Unit tests |
| Delivery conditions | Less than 7 m and less than 9 m/s | Unit tests |
| Distant next stops | Prefer >140 m, avoid immediate repetition | Unit tests |
| Best score / results / retry | localStorage best, deliveries/points, retry/free/exit | Browser expiry/retry; scoring rules tested separately |
| WASD/arrows, drift, reset, Escape | Acceleration, lateral grip, road reset, exit | Browser + physics tests |
| Following camera / collision | Building/tree collision, camera obstruction handling | Implemented; polygon math tested |
| Walk/run/jump/mouse-look | 1.65 m eye, 3.2/8 m/s, jump gravity, pointer lock/drag | Browser walking/jump |
| Touch walk/look | Left joystick, right-hand look | Browser touch movement |
| Walk HUD and exit | Crosshair, prompt, nearby building label | Browser |
| Night and illuminated world | Stars, moonlight, windows/lamps, headlight | Screenshot + toggle |
| FPS and attribution | Visible FPS, source credits | Browser |
| Continuous idle animation | On-demand rendering, no idle spin | Deliberate performance accommodation |

Canada's buildings, trees, roads and sports grounds are not transplanted into Oye. No fictitious FUOYE landmarks are added to resemble them.

## Geographic accuracy

The scene retains mapped FUOYE-area footprints, OSM roads and the unexaggerated DEM. ESA WorldCover 2021 v200 was range-read from its public GeoTIFF: a 252 × 228-cell Oye extract at approximately 10 m. Class 10 establishes eligible tree-cover zones. This is not an individual tree inventory or current campus survey.

The accessible published campus photo supports cream walls, green corrugated roofs, verandas, glazing, palms and green/white kerbs. It does not identify specific footprints. Official captions confirm library, administration, science/pharmacy and other facilities, but photographs/coordinates were insufficient to identify each polygon confidently. Numbered names avoid false identities.

Accurate individual replicas still require geolocated photos, verified footprint/name matches, heights and roof measurements, updated paths/ground cover and an official boundary. About and the source JSON record these limitations.
