import * as THREE from 'three';
import type { BuildingAsset, World } from './build';

export interface TourStop {
  id: string;
  stepNumber: number;
  phaseBadge: string;
  category: string;
  title: string;
  subtitle: string;
  description: string;
  studentTip: string;
  highlights: string[];
  cameraPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  walkSpawn: { x: number; z: number };
  orbitRadius: number;
  orbitHeight: number;
  baseAzimuth: number;
  buildingId?: string;
}

export interface TourFlightState {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  arcHeight: number;
  duration: number;
  elapsed: number;
}

/**
 * Computes a smooth cinematic camera position and look-at target along a flight
 * between two tour stops, adding a gentle parabolic altitude arc over long distances.
 */
export function evaluateTourFlight(
  flight: TourFlightState,
  progress: number
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  // Quintic smoothstep for ultra-smooth cinematic acceleration and deceleration
  const ease = t * t * t * (t * (t * 6 - 15) + 10);

  const position = new THREE.Vector3().lerpVectors(flight.fromPos, flight.toPos, ease);
  // Parabolic vertical arc peaks at mid-flight (4 * t * (1 - t) == 1 at t = 0.5)
  const arc = 4 * ease * (1 - ease) * flight.arcHeight;
  position.y += arc;

  const target = new THREE.Vector3().lerpVectors(flight.fromTarget, flight.toTarget, ease);
  return { position, target };
}

/**
 * Helper to compute a camera framing for a building asset from a given offset direction.
 */
function frameBuildingStop(
  world: World,
  building: BuildingAsset | undefined,
  fallbackPos: { x: number; z: number; h?: number },
  offsetDir: { x: number; z: number },
  distanceScale = 1.45,
  elevationScale = 0.58
): {
  cameraPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  walkSpawn: { x: number; z: number };
  orbitRadius: number;
  orbitHeight: number;
  baseAzimuth: number;
} {
  if (building) {
    const size = building.bounds.getSize(new THREE.Vector2());
    const radius = Math.max(48, Math.max(size.x, size.y) * distanceScale);
    const dir = new THREE.Vector2(offsetDir.x, offsetDir.z).normalize();
    const targetY = building.position.y + Math.max(3.5, building.height * 0.55);
    const targetPos = new THREE.Vector3(building.position.x, targetY, building.position.z);
    const camX = building.position.x + dir.x * radius;
    const camZ = building.position.z + dir.y * radius;
    const groundY = world.height(camX, camZ);
    const camY = Math.max(groundY + 12, building.position.y + radius * elevationScale);
    const cameraPos = new THREE.Vector3(camX, camY, camZ);
    const walkSpawn =
      building.entrance.lengthSq() > 0
        ? { x: building.entrance.x, z: building.entrance.z }
        : { x: building.position.x + dir.x * 16, z: building.position.z + dir.y * 16 };
    return {
      cameraPos,
      targetPos,
      walkSpawn,
      orbitRadius: radius,
      orbitHeight: camY - targetY,
      baseAzimuth: Math.atan2(camX - targetPos.x, camZ - targetPos.z),
    };
  }

  const baseH = world.height(fallbackPos.x, fallbackPos.z);
  const h = fallbackPos.h ?? 6;
  const targetPos = new THREE.Vector3(fallbackPos.x, baseH + h * 0.5, fallbackPos.z);
  const dir = new THREE.Vector2(offsetDir.x, offsetDir.z).normalize();
  const radius = 58;
  const camX = fallbackPos.x + dir.x * radius;
  const camZ = fallbackPos.z + dir.y * radius;
  const camY = Math.max(world.height(camX, camZ) + 14, baseH + 28);
  const cameraPos = new THREE.Vector3(camX, camY, camZ);
  return {
    cameraPos,
    targetPos,
    walkSpawn: { x: fallbackPos.x + dir.x * 14, z: fallbackPos.z + dir.y * 14 },
    orbitRadius: radius,
    orbitHeight: camY - targetPos.y,
    baseAzimuth: Math.atan2(camX - targetPos.x, camZ - targetPos.z),
  };
}

/**
 * Builds the ordered list of First-Time Student / Visitor Guided Tour stops
 * from Phase 1 Main Gate across key campus landmarks through Phases 1, 2, and 3.
 */
export function buildGuidedTourStops(world: World): TourStop[] {
  const byId = (id: string) => world.buildings.find(b => b.id === id);
  const byPlace = (placeId: string) => world.buildings.find(b => b.placeId === placeId);

  // 1. Phase 1 Main Gate & Transit Hub
  const gate1Pos = world.entrance.position.clone();
  const gate1Target = gate1Pos.clone().add(new THREE.Vector3(-8, 4.2, -3));
  const gate1Cam = world.entrance.approach.clone().add(new THREE.Vector3(16, 15, 14));
  gate1Cam.y = Math.max(gate1Cam.y, world.height(gate1Cam.x, gate1Cam.z) + 10);

  // 2. Phase 1 Sports Complex & Mini Stadium
  const sportsBuilding = byId('local/phase1-sports-complex') ?? byPlace('sports-arena');
  const sportsFrame = frameBuildingStop(
    world,
    sportsBuilding,
    { x: 665, z: -440, h: 6 },
    { x: 0.72, z: 0.68 },
    0.72,
    0.42
  );

  // 3. Phase 1 Main Auditorium, Faculty of Arts & Education
  const auditoriumBuilding = byPlace('phase1-auditorium') ?? byId('way/951581888');
  const auditoriumFrame = frameBuildingStop(
    world,
    auditoriumBuilding,
    { x: 620.2, z: -310.3, h: 6 },
    { x: 0.65, z: -0.76 },
    1.55,
    0.55
  );

  // 4. University Library & Phase 1 Academic Commons (way/951581887 beside Main Auditorium)
  const libraryBuilding = byId('way/951581887') ?? byPlace('faculty-of-arts');
  const libraryFrame = frameBuildingStop(
    world,
    libraryBuilding,
    { x: 522.1, z: -331.5, h: 7.2 },
    { x: 0.55, z: -0.82 },
    1.65,
    0.58
  );

  // 5. Phase 2 Main Gate (Falex Rd) & Faculty of Law
  const gate2Pos = world.phase2Entrance.position.clone();
  const gate2Target = gate2Pos.clone().add(new THREE.Vector3(-4, 4.5, 18));
  const gate2Cam = world.phase2Entrance.approach.clone().add(new THREE.Vector3(14, 18, -16));
  gate2Cam.y = Math.max(gate2Cam.y, world.height(gate2Cam.x, gate2Cam.z) + 12);

  // 6. Central Administration Block
  const adminBuilding = byId('ms/8d79d312faf8d996') ?? byPlace('central-admin');
  const adminFrame = frameBuildingStop(
    world,
    adminBuilding,
    { x: -178, z: -146.5, h: 7.5 },
    { x: 0.42, z: -0.91 },
    1.55,
    0.54
  );

  // 7. New Senate Building
  const senateBuilding = byPlace('senate') ?? byId('local/senate');
  const senateFrame = frameBuildingStop(
    world,
    senateBuilding,
    { x: -294.3, z: -295.0, h: 11 },
    { x: 0.58, z: 0.81 },
    1.55,
    0.54
  );

  // 8. Faculty of Science & 3-in-1 Science Laboratory
  const scienceBuilding = byPlace('science') ?? byId('ms/f36a67c7baf5405c');
  const scienceFrame = frameBuildingStop(
    world,
    scienceBuilding,
    { x: -156.3, z: 0.3, h: 7.5 },
    { x: 0.65, z: -0.75 },
    1.5,
    0.56
  );

  // 9. Faculty of Management Sciences
  const managementBuilding = byPlace('management') ?? byId('ms/1b77ae9be7b6829b');
  const managementFrame = frameBuildingStop(
    world,
    managementBuilding,
    { x: 23.2, z: 185.3, h: 7.5 },
    { x: -0.55, z: -0.83 },
    1.55,
    0.54
  );

  // 10. Phase 3 · Student Hostels, Social Sciences & Basic Medical Sciences
  const hostelBuilding = byPlace('boys-hostel') ?? byId('ms/f21e378e2871efba');
  const hostelFrame = frameBuildingStop(
    world,
    hostelBuilding,
    { x: -512.7, z: 361.3, h: 14.4 },
    { x: 0.62, z: -0.78 },
    1.6,
    0.55
  );

  const stops: Omit<TourStop, 'stepNumber'>[] = [
    {
      id: 'phase1-main-gate',
      phaseBadge: 'Phase 1 · Main Entrance',
      category: 'Gateway & Transit',
      title: 'Phase 1 Main Gate & Keke Mini-Park',
      subtitle: 'University Road Ceremonial Archway & Campus Shuttle Hub',
      description:
        'Your campus journey begins at the Phase 1 Main Gate off University Road. Just inside the twin entry arches on the left stands the Keke Napep & Campus Taxi Mini-Park where students board shuttles across all three phases.',
      studentTip:
        'First-time visitors and freshers can board a campus Keke or taxi right inside the gate for direct drops to Central Admin, Faculties, or Hostels.',
      highlights: ['Twin Entrance Arches', 'Keke & Taxi Mini-Park', 'Security Unit Post'],
      cameraPos: gate1Cam,
      targetPos: gate1Target,
      walkSpawn: { x: world.entrance.approach.x, z: world.entrance.approach.z },
      orbitRadius: gate1Cam.distanceTo(gate1Target),
      orbitHeight: gate1Cam.y - gate1Target.y,
      baseAzimuth: Math.atan2(gate1Cam.x - gate1Target.x, gate1Cam.z - gate1Target.z),
    },
    {
      id: 'phase1-sports-complex',
      phaseBadge: 'Phase 1 · Athletics',
      category: 'Sports & Recreation',
      title: 'Phase 1 Sports Field & Mini Stadium',
      subtitle: 'Football Pitch, Covered Grandstand, Basketball & Volleyball Courts',
      description:
        'Immediately north of the Phase 1 entry boulevard lies the university sports complex, featuring a regulation East-West football pitch, 4-tier covered spectator pavilion, athletics track lane, and floodlit courts.',
      studentTip:
        'Vice-Chancellor’s Cup games, Freshers’ tournaments, and evening fitness sessions are held here throughout the academic calendar.',
      highlights: ['Covered Pavilion', 'Football Pitch', 'Basketball & Volleyball'],
      ...sportsFrame,
      buildingId: sportsBuilding?.id,
    },
    {
      id: 'phase1-auditorium',
      phaseBadge: 'Phase 1 · Pioneer Core',
      category: 'Auditorium & Humanities',
      title: 'Phase 1 Main Auditorium, Arts & Education',
      subtitle: 'Matriculation Hall, Orientation Lawns & Pioneer Faculties',
      description:
        'Framed by manicured lawns along the Phase 1 avenue, the tall pilastered Main Auditorium sits alongside the Faculties of Arts and Education—serving as the primary venue for freshers’ orientation and university-wide assemblies.',
      studentTip:
        'Check your faculty orientation schedule during resumption week—most 100-level welcome briefings and GST orientations take place in this auditorium.',
      highlights: ['Main Auditorium', 'Faculty of Arts', 'Faculty of Education'],
      ...auditoriumFrame,
      buildingId: auditoriumBuilding?.id,
    },
    {
      id: 'phase1-library',
      phaseBadge: 'Phase 1 · Academic Commons',
      category: 'Library & Study Centre',
      title: 'University Library & Study Commons',
      subtitle: 'Adesuyi Lanre Library Wing & Phase 1 Reading Halls',
      description:
        'Situated at the western end of the Phase 1 academic row just past the Main Auditorium, the Library & Academic Commons block offers quiet reading rooms, reference collections, and digital research terminals.',
      studentTip:
        'Complete your library registration early with your admission letter and student ID to access reading halls and e-library resources.',
      highlights: ['Reference & Reading Halls', 'E-Library Access', 'Quiet Study Zone'],
      ...libraryFrame,
      buildingId: libraryBuilding?.id,
    },
    {
      id: 'phase2-gate-law',
      phaseBadge: 'Phase 2 · Northern Gateway',
      category: 'Boulevard & Faculty of Law',
      title: 'Phase 2 Gate & Faculty of Law',
      subtitle: 'Falex Road Divided Boulevard & Faculty of Law Complex',
      description:
        'Entering Phase 2 from Falex Road, a tree-lined dual carriageway leads past the three-pavilion gatehouse and the columned Faculty of Law complex and twin law lecture halls on the western side.',
      studentTip:
        'Students commuting from Falex Road enter here and can use the roadside Keke lay-by just inside the gate.',
      highlights: ['Phase 2 Gatehouse', 'Faculty of Law', 'Twin Law Lecture Halls'],
      cameraPos: gate2Cam,
      targetPos: gate2Target,
      walkSpawn: { x: world.phase2Entrance.approach.x, z: world.phase2Entrance.approach.z },
      orbitRadius: gate2Cam.distanceTo(gate2Target),
      orbitHeight: gate2Cam.y - gate2Target.y,
      baseAzimuth: Math.atan2(gate2Cam.x - gate2Target.x, gate2Cam.z - gate2Target.z),
    },
    {
      id: 'central-admin',
      phaseBadge: 'Phase 2 · Admin Core',
      category: 'Administration & Clearance',
      title: 'Central Administration Block',
      subtitle: 'Mohammed Yahuza Admin Compound, Registry, Bursary & Student Affairs',
      description:
        'The three-wing Central Administration compound forms the operational hub of Phase 2, surrounded by a paved forecourt and landscaped park. It houses the Registry, Bursary, Student Affairs, and admissions clearance offices.',
      studentTip:
        'Bring copies of your credentials and payment receipts here for central registration, bursary stamping, and medical/faculty routing.',
      highlights: ['Admissions & Registry', 'Bursary & Student Affairs', 'Three-Wing Admin Compound'],
      ...adminFrame,
      buildingId: adminBuilding?.id,
    },
    {
      id: 'new-senate',
      phaseBadge: 'Phase 2 · Governance',
      category: 'University Senate',
      title: 'New Senate Building',
      subtitle: 'Office of the Vice-Chancellor, Council & Senate Chambers',
      description:
        'Anchoring the western administrative axis, the monumental U-shaped New Senate Building features an ivory facade and blue compound roof, housing the Vice-Chancellor’s office and university senate.',
      studentTip:
        'A landmark orientation point on campus—follow the main avenue west from Central Admin to reach the Senate forecourt.',
      highlights: ['Vice-Chancellor’s Office', 'Senate Chambers', 'Ceremonial Forecourt'],
      ...senateFrame,
      buildingId: senateBuilding?.id,
    },
    {
      id: 'science-complex',
      phaseBadge: 'Phase 2 · Science Precinct',
      category: 'Laboratories & Lecture Halls',
      title: 'Faculty of Science & 3-in-1 Laboratory',
      subtitle: 'Science Complex, 3-in-1 Science Lab & Lecture Hall 2',
      description:
        'South of Central Administration stands the Faculty of Science precinct, combining the main Science building, the multi-wing 3-in-1 Science Laboratory with ochre pilasters, and Science Lecture Hall 2.',
      studentTip:
        '100-level students across Science, Agriculture, and Basic Medical programs take foundational laboratory practicals here.',
      highlights: ['Faculty of Science', '3-in-1 Science Lab', 'Science Lecture Hall 2'],
      ...scienceFrame,
      buildingId: scienceBuilding?.id,
    },
    {
      id: 'management-sciences',
      phaseBadge: 'Phase 2 · Southern Precinct',
      category: 'Management & Media Arts',
      title: 'Faculty of Management Sciences',
      subtitle: 'Columned Portico Complex, Theatre & Media Arts Precinct',
      description:
        'Recognizable by its tall columned portico and upper-floor curtain glazing, the Faculty of Management Sciences anchors the southern road corridor near Theatre & Media Arts and the Old Girls’ Hostel.',
      studentTip:
        'Home to Accounting, Business Administration, Finance, and Public Administration—check the ground-floor lobby for lecture timetables.',
      highlights: ['Management Sciences', 'Theatre & Media Arts', 'Old Girls’ Hostel Nearby'],
      ...managementFrame,
      buildingId: managementBuilding?.id,
    },
    {
      id: 'phase3-hostels-faculties',
      phaseBadge: 'Phase 3 · Western Campus',
      category: 'Hostels & Western Faculties',
      title: 'Phase 3 · Hostels, Social & Medical Sciences',
      subtitle: 'Boys’ Hostel Quadrangle, Social Sciences & Basic Medical Sciences',
      description:
        'The tour concludes in Phase 3 across the western campus ridge, featuring the four-storey Boys’ Hostel residential block alongside the Faculties of Social Sciences and Basic Medical Sciences.',
      studentTip:
        'Students allocated on-campus accommodation complete room check-in with hall supervisors at the hostel porters’ lodge.',
      highlights: ['Boys’ Hostel (4 Floors)', 'Faculty of Social Sciences', 'Basic Medical Sciences'],
      ...hostelFrame,
      buildingId: hostelBuilding?.id,
    },
  ];

  return stops.map((stop, idx) => ({
    ...stop,
    stepNumber: idx + 1,
  }));
}
