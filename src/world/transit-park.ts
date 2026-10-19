import * as THREE from 'three';
import type { Point } from './math';
import type { GeometryBatch } from './batch';
import type { Materials } from './materials';
import type { createSignage } from './signage';
import type { BuildingAsset } from './build';

export interface TransitParksResult {
  obstacles: THREE.Box2[];
  reserved: (p: Point) => boolean;
  lamps: THREE.Vector3[];
  buildings: BuildingAsset[];
  pickables: THREE.Mesh[];
  peopleCount: number;
  parkingLotsCount: number;
}

/**
 * Adds FUOYE's Campus Keke Napep (tricycle) & Taxi Mini-Parks:
 * 1. Phase 1 Main Gate Keke & Taxi Mini-Park (in the open turnaround bay just inside Phase 1 Gate,
 *    east of FUOYE Security Unit and Phase 1 Main Auditorium, at x = 654.5, z = -310.5).
 * 2. Phase 2 Junction & Boulevard Keke & Taxi Shuttle Park (at the Phase 2 Boulevard / Central Admin
 *    junction bay at x = -216.0, z = -148.0, plus an arrival lay-by inside the Phase 2 Gate).
 */
export function addCampusTransitParks(
  root: THREE.Group,
  batch: GeometryBatch,
  m: Materials,
  signs: ReturnType<typeof createSignage>,
  height: (x: number, z: number) => number,
  surfaceHeight: (x: number, z: number) => number
): TransitParksResult {
  const obstacles: THREE.Box2[] = [];
  const lamps: THREE.Vector3[] = [];
  const buildings: BuildingAsset[] = [];
  const pickables: THREE.Mesh[] = [];
  const reservedBoxes: THREE.Box2[] = [];
  let peopleCount = 0;

  const box = (...args: Parameters<GeometryBatch['box']>) => batch.box(...args);
  const cyl = (...args: Parameters<GeometryBatch['cylinder']>) => batch.cylinder(...args);

  const addObstacle = (cx: number, cz: number, rx: number, rz: number) => {
    obstacles.push(new THREE.Box2(new THREE.Vector2(cx - rx, cz - rz), new THREE.Vector2(cx + rx, cz + rz)));
  };

  const toWorld = (cx: number, cz: number, lx: number, lz: number, angle: number) => {
    const c = Math.cos(angle), s = Math.sin(angle);
    return {
      x: cx + lx * c + lz * s,
      z: cz - lx * s + lz * c
    };
  };

  /**
   * Batches an authentic low-poly Nigerian Keke Napep (commercial passenger tricycle).
   * Local +z is forward; local +x is right.
   */
  function addKeke(cx: number, cz: number, angle: number, greenCanopy = false) {
    const y = surfaceHeight(cx, cz) + 0.03;
    const partBox = (w: number, h: number, d: number, lx: number, ly: number, lz: number, mat: THREE.Material) => {
      const p = toWorld(cx, cz, lx, lz, angle);
      box(w, h, d, p.x, y + ly, p.z, mat, angle);
    };
    const partWheel = (r: number, w: number, lx: number, ly: number, lz: number) => {
      const p = toWorld(cx, cz, lx, lz, angle);
      const g = new THREE.CylinderGeometry(r, r, w, 8);
      g.rotateZ(Math.PI / 2);
      g.rotateY(angle);
      g.translate(p.x, y + ly, p.z);
      batch.add(g, m.rubber);
      const hub = new THREE.CylinderGeometry(r * 0.48, r * 0.48, w + 0.015, 6);
      hub.rotateZ(Math.PI / 2);
      hub.rotateY(angle);
      hub.translate(p.x, y + ly, p.z);
      batch.add(hub, m.white);
    };

    const canopyMat = greenCanopy ? m.green : m.rubber;

    // 1. Three Wheels: 1 front wheel (lz = +0.98) + 2 rear wheels (lx = ±0.58, lz = -0.78)
    partWheel(0.23, 0.14, 0, 0.23, 0.98);
    partWheel(0.24, 0.15, -0.58, 0.24, -0.78);
    partWheel(0.24, 0.15, 0.58, 0.24, -0.78);

    // 2. Front mudguard, steering column, and yellow nose apron
    partBox(0.28, 0.16, 0.44, 0, 0.44, 0.96, m.kekeYellow);
    partBox(0.76, 0.66, 0.36, 0, 0.62, 0.66, m.kekeYellow);
    partBox(0.54, 0.07, 0.08, 0, 0.96, 0.50, m.rubber); // handlebar

    // Central round headlight & front white plate
    partBox(0.18, 0.18, 0.07, 0, 0.66, 0.85, m.glow);
    partBox(0.32, 0.10, 0.04, 0, 0.40, 0.85, m.white);

    // 3. Angled front windshield & yellow header visor
    partBox(0.92, 0.48, 0.06, 0, 1.18, 0.62, m.glass);
    partBox(1.02, 0.14, 0.12, 0, 1.46, 0.62, m.kekeYellow);

    // 4. Lower chassis floor & yellow rear passenger body tub
    partBox(1.24, 0.12, 1.75, 0, 0.28, -0.14, m.steel);
    // Rear engine/tail panel
    partBox(1.28, 0.76, 0.38, 0, 0.68, -0.86, m.kekeYellow);
    // Left and right rear wheel-arch side panels (leaving open side doorways at lz = -0.05)
    for (const side of [-1, 1]) {
      partBox(0.10, 0.68, 0.72, side * 0.60, 0.64, -0.68, m.kekeYellow);
      partBox(0.10, 0.34, 0.58, side * 0.60, 0.47, 0.02, m.kekeYellow);
      // Side mirror
      partBox(0.12, 0.08, 0.05, side * 0.52, 1.08, 0.62, m.steel);
    }

    // 5. Interior driver & passenger cushioned bench seats
    partBox(0.42, 0.14, 0.34, 0, 0.62, 0.24, m.rubber); // driver seat
    partBox(1.10, 0.16, 0.44, 0, 0.66, -0.54, m.rubber); // passenger seat cushion
    partBox(1.10, 0.38, 0.10, 0, 0.90, -0.72, m.rubber); // passenger backrest

    // 6. Steel canopy support struts & arched tarpaulin roof
    for (const side of [-1, 1]) {
      for (const zPos of [0.54, -0.18, -0.94]) {
        partBox(0.045, 0.78, 0.045, side * 0.58, 1.24, zPos, m.steel);
      }
      // Side weather valence flap along roof edge
      partBox(0.05, 0.16, 1.78, side * 0.62, 1.58, -0.16, canopyMat);
    }
    partBox(1.28, 0.12, 1.82, 0, 1.66, -0.16, canopyMat);
    partBox(1.14, 0.07, 1.62, 0, 1.73, -0.16, canopyMat);
    // Rear tarpaulin back curtain with small clear window
    partBox(1.22, 0.62, 0.06, 0, 1.32, -1.03, canopyMat);
    partBox(0.64, 0.26, 0.08, 0, 1.36, -1.03, m.glass);

    // 7. Rear bumper & taillights
    partBox(1.24, 0.10, 0.08, 0, 0.34, -1.06, m.steel);
    for (const side of [-1, 1]) {
      partBox(0.22, 0.12, 0.06, side * 0.42, 0.56, -1.06, m.tail);
    }
    partBox(0.36, 0.14, 0.05, 0, 0.54, -1.06, m.white);

    addObstacle(cx, cz, 1.15, 1.15);
  }

  /**
   * Batches a Campus Shuttle Taxi with commercial yellow/green stripe and rooftop TAXI light box.
   */
  function addCampusTaxi(cx: number, cz: number, angle: number, paintIdx: number) {
    const y = surfaceHeight(cx, cz) + 0.04;
    const partBox = (w: number, h: number, d: number, lx: number, ly: number, lz: number, mat: THREE.Material) => {
      const p = toWorld(cx, cz, lx, lz, angle);
      box(w, h, d, p.x, y + ly, p.z, mat, angle);
    };
    const bodyMat = m.carPaint[paintIdx % m.carPaint.length];

    // Main lower body & commercial yellow belt stripe
    partBox(1.80, 0.68, 4.10, 0, 0.68, 0, bodyMat);
    partBox(1.83, 0.16, 3.85, 0, 0.72, 0, m.kekeYellow);

    // Greenhouse cabin & roof
    partBox(1.56, 0.62, 2.15, 0, 1.26, -0.10, m.glass);
    partBox(1.62, 0.12, 1.72, 0, 1.61, -0.10, bodyMat);

    // Rooftop TAXI sign box
    partBox(0.68, 0.20, 0.24, 0, 1.76, 0.08, m.kekeYellow);
    partBox(0.62, 0.14, 0.26, 0, 1.76, 0.08, m.glow);

    // Wheels
    for (const side of [-1, 1]) {
      for (const front of [-1, 1]) {
        const p = toWorld(cx, cz, side * 0.90, front * 1.25, angle);
        const g = new THREE.CylinderGeometry(0.33, 0.33, 0.18, 8);
        g.rotateZ(Math.PI / 2);
        g.rotateY(angle);
        g.translate(p.x, y + 0.36, p.z);
        batch.add(g, m.rubber);
        const hub = new THREE.CylinderGeometry(0.16, 0.16, 0.20, 6);
        hub.rotateZ(Math.PI / 2);
        hub.rotateY(angle);
        hub.translate(p.x, y + 0.36, p.z);
        batch.add(hub, m.white);
      }
      // Headlights & Taillights
      partBox(0.34, 0.16, 0.08, side * 0.56, 0.70, 2.06, m.glow);
      partBox(0.34, 0.16, 0.08, side * 0.56, 0.72, -2.06, m.tail);
    }
    // Bumpers & number plates
    partBox(1.72, 0.12, 0.12, 0, 0.42, 2.06, m.steel);
    partBox(1.72, 0.12, 0.12, 0, 0.42, -2.06, m.steel);
    partBox(0.48, 0.14, 0.06, 0, 0.56, 2.07, m.white);
    partBox(0.48, 0.14, 0.06, 0, 0.56, -2.07, m.white);

    addObstacle(cx, cz, 1.35, 1.85);
  }

  /**
   * Batches a waiting student/passenger figure with a backpack.
   */
  function addPassenger(cx: number, cz: number, angle: number, colorIdx: number) {
    const y = surfaceHeight(cx, cz);
    const shirt = m.people[colorIdx % m.people.length];
    cyl(0.19, 0.22, 0.68, cx, y + 0.98, cz, shirt, 7);
    const head = new THREE.SphereGeometry(0.15, 7, 5);
    head.translate(cx, y + 1.50, cz);
    batch.add(head, m.skin);
    // Backpack
    const bp = toWorld(cx, cz, 0, -0.18, angle);
    box(0.28, 0.36, 0.14, bp.x, y + 1.02, bp.z, m.steel, angle);
    for (const s of [-1, 1]) {
      const lp = toWorld(cx, cz, s * 0.11, 0, angle);
      box(0.12, 0.64, 0.14, lp.x, y + 0.32, lp.z, m.rubber, angle);
    }
    peopleCount++;
  }

  /**
   * Batches a solar/LED park streetlamp.
   */
  function addParkLamp(lx: number, lz: number, armDir = 1) {
    const y = height(lx, lz);
    cyl(0.075, 0.12, 6.2, lx, y + 3.1, lz, m.steel, 6);
    box(1.2, 0.08, 0.12, lx + armDir * 0.48, y + 6.1, lz, m.steel);
    box(0.52, 0.10, 0.30, lx + armDir * 0.95, y + 6.04, lz, m.glow);
    lamps.push(new THREE.Vector3(lx + armDir * 0.95, y + 6.0, lz));
    addObstacle(lx, lz, 0.25, 0.25);
  }

  // ============================================================================
  // 1. PHASE 1 MAIN GATE KEKE & TAXI MINI-PARK (x = 751.0, z = -354.0)
  // ============================================================================
  // Situated at the exact roadside park location (751, -352) along the main entrance
  // approach road by the Main Gate, where town taxis and Keke Napep tricycles convey
  // students arriving and departing from FUOYE Phase 1.
  const p1X = 751.0;
  const p1Z = -354.0;
  const p1W = 18.0;
  const p1D = 12.0;
  const p1Y = height(p1X, p1Z) + 0.10;

  // Main asphalt parking & maneuvering apron
  box(p1W, 0.08, p1D, p1X, p1Y, p1Z, m.asphalt);
  // Turnout driveway connecting park apron directly to the road
  box(14.0, 0.08, 3.5, p1X, p1Y, p1Z - p1D / 2 - 1.75, m.asphalt);

  // Paved student promenade along the South edge where the waiting shelter sits
  box(p1W - 2.0, 0.12, 3.2, p1X, p1Y + 0.04, p1Z + p1D / 2 - 1.6, m.pavers);

  // Perimeter kerbs
  box(p1W, 0.18, 0.24, p1X, p1Y + 0.06, p1Z + p1D / 2, m.base); // South kerb behind shelter
  box(0.24, 0.18, p1D, p1X - p1W / 2, p1Y + 0.06, p1Z, m.base); // West kerb facing gate
  box(0.24, 0.18, p1D, p1X + p1W / 2, p1Y + 0.06, p1Z, m.base); // East kerb facing University Rd

  // Painted white parking bay markings for Taxis & Keke Napep
  for (let i = 0; i <= 4; i++) {
    const bx = p1X - 6.0 + i * 3.0;
    // Taxi bays (North row, facing North)
    box(0.12, 0.03, 4.4, bx, p1Y + 0.05, p1Z - 2.2, m.white);
    if (i < 4) {
      box(1.8, 0.14, 0.22, bx + 1.5, p1Y + 0.08, p1Z - 4.3, m.stone);
    }
  }
  for (let i = 0; i <= 6; i++) {
    const bx = p1X - 7.5 + i * 2.5;
    // Keke bays (Central loading row)
    box(0.10, 0.03, 2.8, bx, p1Y + 0.05, p1Z + 1.0, m.white);
  }

  // Covered Student Waiting & Dispatch Shelter Pavilion along South edge (facing North)
  const shX = p1X;
  const shZ = p1Z + p1D / 2 - 1.6;
  const shLen = 12.0;
  const shDepth = 2.4;
  const shH = 3.2;

  // Shelter dwarf back wall & accent band (on the South side)
  box(shLen, 1.25, 0.24, shX, p1Y + 0.68, shZ + shDepth / 2 - 0.15, m.ivory);
  box(shLen + 0.1, 0.18, 0.28, shX, p1Y + 1.32, shZ + shDepth / 2 - 0.15, m.accent);

  // Steel shelter columns along back and front
  for (let i = 0; i <= 4; i++) {
    const cx = shX - shLen / 2 + 0.4 + (i / 4) * (shLen - 0.8);
    cyl(0.07, 0.07, shH, cx, p1Y + shH / 2, shZ + shDepth / 2 - 0.25, m.steel, 6);
    cyl(0.07, 0.07, shH - 0.15, cx, p1Y + (shH - 0.15) / 2, shZ - shDepth / 2 + 0.25, m.steel, 6);
  }

  // Sloped green shelter roof & fascia trim
  box(shLen + 0.8, 0.16, shDepth + 0.8, shX, p1Y + shH, shZ, m.roofs[0]);
  box(shLen + 0.9, 0.14, shDepth + 0.9, shX, p1Y + shH - 0.10, shZ, m.trim);

  // Overhead Park Signboard facing North toward arriving students and the open park
  signs.add(
    batch,
    'keke-park-1',
    7.5,
    0.95,
    new THREE.Vector3(shX, p1Y + shH + 0.42, shZ - shDepth / 2 - 0.18),
    Math.PI
  );
  box(7.7, 1.02, 0.12, shX, p1Y + shH + 0.42, shZ - shDepth / 2 - 0.10, m.steel);

  // Waiting benches inside shelter facing North
  for (const bx of [shX - 3.4, shX, shX + 3.4]) {
    box(2.0, 0.10, 0.48, bx, p1Y + 0.48, shZ + 0.15, m.wood);
    box(2.0, 0.45, 0.08, bx, p1Y + 0.76, shZ + 0.38, m.wood);
    for (const s of [-0.75, 0.75]) {
      box(0.08, 0.45, 0.44, bx + s, p1Y + 0.25, shZ + 0.15, m.steel);
    }
  }
  addObstacle(shX, shZ, shLen / 2 + 0.2, shDepth / 2 + 0.2);

  // 4 Parked Campus Taxis in the North Row facing North (rotated 180 degrees)
  addCampusTaxi(p1X - 4.5, p1Z - 2.2, Math.PI, 1);
  addCampusTaxi(p1X - 1.5, p1Z - 2.2, Math.PI, 3);
  addCampusTaxi(p1X + 1.5, p1Z - 2.2, Math.PI, 0);
  addCampusTaxi(p1X + 4.5, p1Z - 2.2, Math.PI, 2);

  // 6 Keke Napep Tricycles in loading queue facing North (rotated 180 degrees)
  addKeke(p1X - 6.25, p1Z + 1.0, Math.PI, false);
  addKeke(p1X - 3.75, p1Z + 1.0, Math.PI, true);
  addKeke(p1X - 1.25, p1Z + 1.0, Math.PI, false);
  addKeke(p1X + 1.25, p1Z + 1.0, Math.PI, false);
  addKeke(p1X + 3.75, p1Z + 1.0, Math.PI, true);
  addKeke(p1X + 6.25, p1Z + 1.0, Math.PI, false);

  // Waiting Students & Passengers facing North
  addPassenger(shX - 3.4, shZ - 0.3, Math.PI, 0);
  addPassenger(shX - 1.2, shZ - 0.4, Math.PI, 1);
  addPassenger(shX + 1.2, shZ - 0.3, Math.PI, 2);
  addPassenger(shX + 3.4, shZ - 0.4, Math.PI, 3);
  addPassenger(p1X - 4.2, p1Z - 0.6, Math.PI, 1);
  addPassenger(p1X + 2.4, p1Z - 0.6, Math.PI, 0);

  // Park Streetlamps
  addParkLamp(p1X - p1W / 2 + 1.0, p1Z - p1D / 2 + 1.0, 1);
  addParkLamp(p1X + p1W / 2 - 1.0, p1Z - p1D / 2 + 1.0, -1);

  const p1Bounds = new THREE.Box2(
    new THREE.Vector2(p1X - p1W / 2 - 1, p1Z - p1D / 2 - 1),
    new THREE.Vector2(p1X + p1W / 2 + 1, p1Z + p1D / 2 + 1)
  );
  reservedBoxes.push(p1Bounds);

  buildings.push({
    id: 'local/phase1-keke-park',
    name: 'Phase 1 Main Gate Keke & Taxi Mini-Park',
    position: new THREE.Vector3(p1X, p1Y, p1Z),
    ring: [
      { x: p1X - p1W / 2, z: p1Z - p1D / 2 },
      { x: p1X + p1W / 2, z: p1Z - p1D / 2 },
      { x: p1X + p1W / 2, z: p1Z + p1D / 2 },
      { x: p1X - p1W / 2, z: p1Z + p1D / 2 }
    ],
    bounds: p1Bounds,
    height: 3.8,
    floors: 1,
    style: 'campus tricycle (keke) & taxi transit hub',
    entrance: new THREE.Vector3(p1X, p1Y, p1Z - p1D / 2),
    source: 'Campus transit observation & Phase 1 main gate entry park',
    directory: true,
    named: true,
    placeId: 'phase1-keke-park'
  });

  // ============================================================================
  // 2. PHASE 2 GATE ROADSIDE KEKE & TAXI LAY-BY (x = -114.5, z = -516.0)
  // ============================================================================
  // Situated on the western roadside shoulder just inside Phase 2 Gate (Falex Rd),
  // completely clear of the divided carriageways so incoming students can board.
  const g2Angle = Math.atan2(0.26796, -0.96343); // matches Phase 2 Boulevard angle
  const g2X = -114.5;
  const g2Z = -516.0;
  const g2Y = height(g2X, g2Z) + 0.08;
  box(5.2, 0.08, 15.5, g2X, g2Y, g2Z, m.pavers, g2Angle);
  addKeke(g2X + 1.1, g2Z - 4.2, g2Angle + Math.PI, false);
  addKeke(g2X + 0.2, g2Z - 0.8, g2Angle + Math.PI, true);
  addCampusTaxi(g2X - 1.0, g2Z + 3.8, g2Angle + Math.PI, 2);
  addPassenger(g2X - 1.2, g2Z - 2.2, g2Angle + Math.PI / 2, 1);
  addPassenger(g2X - 1.8, g2Z + 0.5, g2Angle + Math.PI / 2, 0);
  reservedBoxes.push(new THREE.Box2(new THREE.Vector2(g2X - 6, g2Z - 9), new THREE.Vector2(g2X + 6, g2Z + 9)));

  return {
    obstacles,
    reserved: (p: Point) => reservedBoxes.some(b => b.containsPoint(new THREE.Vector2(p.x, p.z))),
    lamps,
    buildings,
    pickables,
    peopleCount,
    parkingLotsCount: 1
  };
}
