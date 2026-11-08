import type { CampusDefinition } from '../types';
import { oyeWorldProfile } from './world';
import { mainGatePosition, phase2GatePosition } from './entrance';
import { buildOyeTourStops } from './tour';

export const oyeCampus: CampusDefinition = {
  id: 'oye',
  name: 'Oye campus',
  location: 'Oye-Ekiti, Nigeria',
  center: [5.3163, 7.7772],
  data: {
    buildings: '/data/campus.geojson',
    terrain: '/data/terrain.json',
    landcover: '/data/landcover.json',
  },
  world: oyeWorldProfile,
  tour: {
    summary: 'Phase 1 Gate · Admin · Academic buildings · Faculties · Hostels',
    buildStops: buildOyeTourStops,
  },
  landmarks: [
    {id: 'main', label: 'Main gate · Phase 1', position:mainGatePosition},
    {id: 'phase2', label: 'Phase 2 gate · Falex Rd', position:phase2GatePosition},
  ],
  aboutHtml: `<h2>FUOYE in 3D</h2><p>The campus uses mapped building footprints and roads, actual terrain elevations, and satellite-derived vegetation coverage from ESA WorldCover 2021 (10 m).</p><p>The scene covers Phases 1, 2 and 3. Named places are matched to Maps pins and visible compounds; a listing is not an official building survey. <span id="place-count">Named places have source records.</span> Smaller supporting structures remain visible in the scene.</p><p><a href="https://maps.app.goo.gl/yDcJm6EFjyrKhLUY6" target="_blank" rel="noopener">FUOYE on Google Maps ↗</a> · <a href="/data/campus-places.json" target="_blank">Building evidence ↗</a></p><p>Maps imagery was inspected on 10 October 2026; its capture date is unavailable. Reviewed building photos date from 2021–2022. The main gate uses a wide entrance photo and satellite alignment checked on 11 October 2026; dimensions and sculpture details are approximate. Building nameplates and phase markers are navigation aids added for this explorer. The visual pass refines photo-informed Management Sciences, hostel and Administration facades, and separates observed Phase 1 lawns. Hall details, planting, building aprons and park/path edging include inferred treatments. Tree species and individual planting positions are estimates. Roof outlines, grounds and paths traced from imagery are approximate. Unobserved heights and facade details remain estimates.</p><p><a href="/review.html">Open map & identification workspace ↗</a></p><p class="small">Interface and game interactions follow <a href="https://mount-alison-3d.vercel.app/" target="_blank" rel="noopener">Mount Allison in 3D</a>. This is an independent student project, not an official university map.</p>`,
};
