import * as THREE from 'three';
import type { Point } from './math';
import type { GeometryBatch } from './batch';
import type { Materials } from './materials';
import type { createSignage } from './signage';
import type { BuildingAsset } from './build';

export interface MosqueResult {
  obstacles: THREE.Box2[];
  reserved: (p: Point) => boolean;
  lamps: THREE.Vector3[];
  position: THREE.Vector3;
  bounds: THREE.Box2;
  pickable: THREE.Mesh;
  building: BuildingAsset;
}

// Positioned at (744, -488), directly aligned in front of the Phase 1 Basketball Court (712, -488)
// along the East-West axis (not side-by-side along the sideline).
export const PHASE1_MOSQUE_CENTER = { x: 744, z: -488 };
export const PHASE1_MOSQUE_ROTATION = 0; // 0 = entrance faces South (+z) toward Main Gate road, Mihrab faces East (+x, Qibla)

/**
 * Builds the FUOYE Phase 1 Central Mosque complex:
 * - Paved compound courtyard with low decorative boundary walls and entrance piers
 * - Main Prayer Hall (ivory walls, emerald-green frieze bands, arched Islamic windows, roof parapet)
 * - 5-bay arched entrance verandah (portico) with shoe racks along the South facade
 * - Projecting Qibla Mihrab niche on the East wall
 * - Octagonal clerestory drum, central emerald-green dome, and golden crescent moon (Hilal) finial
 * - Twin corner minarets with muezzin balconies (sherefe), green domed caps, and crescent finials
 * - Covered Ablution (Wudu) pavilion with tiled wash trough, taps, and washing stools
 * - Connecting paved walkway to the Basketball Court plaza and Phase 1 concourse
 */
export function addPhaseOneMosque(
  root: THREE.Group,
  batch: GeometryBatch,
  m: Materials,
  signs: ReturnType<typeof createSignage>,
  height: (x: number, z: number) => number
): MosqueResult {
  const obstacles: THREE.Box2[] = [];
  const lamps: THREE.Vector3[] = [];

  const cx = PHASE1_MOSQUE_CENTER.x;
  const cz = PHASE1_MOSQUE_CENTER.z;
  const angle = PHASE1_MOSQUE_ROTATION;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  const toWorld = (lx: number, lz: number): Point => ({
    x: cx + lx * cos + lz * sin,
    z: cz - lx * sin + lz * cos,
  });

  const groundY = height(cx, cz) + 0.05;

  const box = (
    w: number,
    h: number,
    d: number,
    lx: number,
    ly: number,
    lz: number,
    mat: THREE.Material,
    localRot = 0
  ) => {
    const p = toWorld(lx, lz);
    batch.box(w, h, d, p.x, groundY + ly, p.z, mat, angle + localRot);
  };

  const cyl = (
    rt: number,
    rb: number,
    h: number,
    lx: number,
    ly: number,
    lz: number,
    mat: THREE.Material,
    seg = 8
  ) => {
    const p = toWorld(lx, lz);
    batch.cylinder(rt, rb, h, p.x, groundY + ly, p.z, mat, seg);
  };

  const addObstacle = (lx: number, lz: number, rx: number, rz: number) => {
    const p = toWorld(lx, lz);
    obstacles.push(
      new THREE.Box2(new THREE.Vector2(p.x - rx, p.z - rz), new THREE.Vector2(p.x + rx, p.z + rz))
    );
  };

  // Dedicated golden crescent material
  const goldMat = new THREE.MeshLambertMaterial({
    color: '#e7b82d',
    emissive: '#8c6910',
    emissiveIntensity: 0.3,
  });
  goldMat.userData.ownedMaterial = true;

  /**
   * Adds a 3D golden Islamic Crescent Moon (Hilal) and spire finial at (lx, ly, lz).
   */
  const addCrescentFinial = (lx: number, ly: number, lz: number, scale = 1.0) => {
    const p = toWorld(lx, lz);
    // Vertical brass spire rod
    batch.cylinder(0.03 * scale, 0.05 * scale, 0.95 * scale, p.x, groundY + ly + 0.45 * scale, p.z, goldMat, 6);
    // Decorative brass orbs along spire
    const orb = new THREE.SphereGeometry(0.11 * scale, 8, 6);
    orb.translate(p.x, groundY + ly + 0.28 * scale, p.z);
    batch.add(orb, goldMat);

    // 3D Crescent shape facing South/East
    const crescent = new THREE.Shape();
    const rOuter = 0.36 * scale;
    const rInner = 0.27 * scale;
    crescent.absarc(0, 0, rOuter, -Math.PI * 0.35, Math.PI * 1.35, false);
    crescent.absarc(0.11 * scale, 0.09 * scale, rInner, Math.PI * 1.25, -Math.PI * 0.25, true);
    crescent.closePath();

    const cGeo = new THREE.ExtrudeGeometry(crescent, {
      depth: 0.06 * scale,
      bevelEnabled: false,
      curveSegments: 12,
    });
    cGeo.translate(0, 0, -0.03 * scale);
    cGeo.rotateY(angle);
    cGeo.translate(p.x, groundY + ly + 1.05 * scale, p.z);
    batch.add(cGeo, goldMat);
  };

  // ==========================================================================
  // 1. COURTYARD APRON, CONNECTING WALKWAYS & LOW PERIMETER BOUNDARY WALL
  // ==========================================================================
  const courtW = 24.0;
  const courtD = 22.0;

  // Main stone-paved mosque courtyard
  box(courtW, 0.1, courtD, 0, 0.05, 0, m.pavers);

  // Connecting paved walkway from the Mosque South entrance gate (x = 744, z = -477)
  // straight along z = -478.5 into the Basketball Court approach plaza (x = 712..728, z = -478.5):
  batch.box(19.0, 0.1, 2.8, 736.5, groundY + 0.05, -476.2, m.pavers);
  batch.box(3.2, 0.1, 4.0, 728.0, groundY + 0.05, -477.4, m.pavers);

  // Perimeter kerbs and low dwarf wall with emerald-green coping
  const wallH = 0.85;
  // North boundary wall
  box(courtW, wallH, 0.26, 0, wallH / 2, -courtD / 2, m.ivory);
  box(courtW + 0.1, 0.12, 0.32, 0, wallH + 0.04, -courtD / 2, m.green);
  // West boundary wall
  box(0.26, wallH, courtD, -courtW / 2, wallH / 2, 0, m.ivory);
  box(0.32, 0.12, courtD, -courtW / 2, wallH + 0.04, 0, m.green);
  // East boundary wall
  box(0.26, wallH, courtD, courtW / 2, wallH / 2, 0, m.ivory);
  box(0.32, 0.12, courtD, courtW / 2, wallH + 0.04, 0, m.green);
  // South boundary wall with 5.4m central entrance gateway opening
  for (const side of [-1, 1]) {
    const segW = (courtW - 5.4) / 2;
    const segX = side * (5.4 / 2 + segW / 2);
    box(segW, wallH, 0.26, segX, wallH / 2, courtD / 2, m.ivory);
    box(segW + 0.1, 0.12, 0.32, segX, wallH + 0.04, courtD / 2, m.green);
    // Entrance gate piers with green pyramid caps
    const pierX = side * 2.7;
    box(0.55, 1.85, 0.55, pierX, 0.92, courtD / 2, m.ivory);
    box(0.65, 0.16, 0.65, pierX, 1.9, courtD / 2, m.green);
  }

  // Overhead Mosque Entrance Signboard at the South courtyard gate
  const signWorld = toWorld(0, courtD / 2 + 0.18);
  signs.add(
    batch,
    'phase1-mosque-sign',
    6.4,
    0.92,
    new THREE.Vector3(signWorld.x, groundY + 2.85, signWorld.z),
    angle
  );
  box(6.6, 0.98, 0.12, 0, 2.85, courtD / 2 + 0.1, m.steel);
  for (const side of [-1, 1]) {
    cyl(0.06, 0.06, 2.8, side * 2.7, 1.4, courtD / 2 + 0.1, m.steel, 6);
  }

  // ==========================================================================
  // 2. MAIN PRAYER HALL & ARCHED FRONT VERANDAH (PORTICO)
  // ==========================================================================
  const hallW = 14.4;
  const hallD = 11.2;
  const hallH = 5.2;
  const hallZ = -2.2; // Shifted slightly North in courtyard to leave South forecourt open

  // Raised tiled prayer terrace plinth
  box(hallW + 1.2, 0.32, hallD + 3.4, 0, 0.16, hallZ + 1.1, m.stone);
  // Stepped front entrance stairs
  box(6.4, 0.16, 0.8, 0, 0.08, hallZ + hallD / 2 + 3.0, m.pavers);

  // Main prayer hall body
  box(hallW, hallH, hallD, 0, 0.32 + hallH / 2, hallZ, m.ivory);

  // Lower emerald-green dado band & upper frieze band
  box(hallW + 0.12, 0.45, hallD + 0.12, 0, 0.55, hallZ, m.green);
  box(hallW + 0.16, 0.32, hallD + 0.16, 0, 0.32 + hallH - 0.55, hallZ, m.green);
  // Roofline parapet cornice
  box(hallW + 0.35, 0.28, hallD + 0.35, 0, 0.32 + hallH + 0.14, hallZ, m.trim);

  // Decorative crenellated roof merlons along top parapet
  for (let i = -3; i <= 3; i++) {
    box(1.1, 0.38, 0.24, i * 1.9, 0.32 + hallH + 0.45, hallZ + hallD / 2 + 0.05, m.ivory);
    box(1.1, 0.38, 0.24, i * 1.9, 0.32 + hallH + 0.45, hallZ - hallD / 2 - 0.05, m.ivory);
  }

  // Projecting Qibla Mihrab apse on the East wall (+x = Qibla direction)
  const mihrabX = hallW / 2 + 0.85;
  box(1.7, hallH - 0.5, 3.6, mihrabX, 0.32 + (hallH - 0.5) / 2, hallZ, m.ivory);
  box(1.82, 0.28, 3.75, mihrabX, 0.32 + hallH - 0.5, hallZ, m.green);
  cyl(1.4, 1.6, 0.9, mihrabX + 0.1, 0.32 + hallH - 0.05, hallZ, m.roofs[0], 6);

  // Tall Arched Windows on North, South, East, and West facades
  for (const sideZ of [-1, 1]) {
    const wz = hallZ + sideZ * (hallD / 2 + 0.06);
    for (const wx of [-4.4, -1.6, 1.6, 4.4]) {
      if (sideZ === 1 && Math.abs(wx) < 2.0) continue; // Leave center South bay for main double prayer doors
      box(1.25, 2.35, 0.12, wx, 2.8, wz, m.trim);
      box(1.02, 2.1, 0.16, wx, 2.75, wz, m.windows);
      box(1.15, 0.22, 0.18, wx, 3.95, wz, m.green);
    }
  }
  for (const sideX of [-1, 1]) {
    const wx = sideX * (hallW / 2 + 0.06);
    for (const wz of [hallZ - 3.2, hallZ + 3.2]) {
      box(0.12, 2.35, 1.25, wx, 2.8, wz, m.trim);
      box(0.16, 2.1, 1.02, wx, 2.75, wz, m.windows);
      box(0.18, 0.22, 1.15, wx, 3.95, wz, m.green);
    }
  }

  // Main Double Entrance Doors on South facade
  box(2.5, 3.1, 0.16, 0, 1.88, hallZ + hallD / 2 + 0.06, m.green);
  box(2.1, 2.75, 0.2, 0, 1.8, hallZ + hallD / 2 + 0.08, m.wood);
  box(2.6, 0.28, 0.24, 0, 3.52, hallZ + hallD / 2 + 0.08, goldMat);

  // Covered South Entrance Verandah (5-bay arched colonnade, depth = 2.6m)
  const verZ = hallZ + hallD / 2 + 1.35;
  const verH = 3.85;
  // Verandah roof slab & green fascia
  box(hallW - 0.6, 0.22, 2.8, 0, 0.32 + verH, verZ, m.ivory);
  box(hallW - 0.4, 0.2, 2.95, 0, 0.32 + verH + 0.16, verZ, m.roofs[0]);

  // 6 Verandah columns and arch spandrel headers along the front edge
  const colCount = 6;
  const verSpan = hallW - 1.6;
  for (let i = 0; i < colCount; i++) {
    const colX = -verSpan / 2 + (i / (colCount - 1)) * verSpan;
    const frontZ = hallZ + hallD / 2 + 2.55;
    box(0.38, verH, 0.38, colX, 0.32 + verH / 2, frontZ, m.ivory);
    box(0.46, 0.24, 0.46, colX, 0.44, frontZ, m.green);
    box(0.46, 0.22, 0.46, colX, 0.32 + verH - 0.2, frontZ, m.green);
    if (i < colCount - 1) {
      const midBayX = colX + verSpan / (colCount - 1) / 2;
      // Arched spandrel lintel between columns
      box(verSpan / (colCount - 1), 0.55, 0.32, midBayX, 0.32 + verH - 0.28, frontZ, m.ivory);
      box(verSpan / (colCount - 1) - 0.35, 0.18, 0.36, midBayX, 0.32 + verH - 0.58, frontZ, m.green);
    }
  }

  // Footwear racks on the verandah sides
  for (const side of [-1, 1]) {
    box(2.2, 0.65, 0.42, side * 4.2, 0.65, hallZ + hallD / 2 + 0.55, m.wood);
  }

  // ==========================================================================
  // 3. CENTRAL OCTAGONAL DRUM, EMERALD GREEN DOME & GOLDEN CRESCENT
  // ==========================================================================
  const roofTopY = 0.32 + hallH;
  // Octagonal drum base
  cyl(3.55, 3.65, 1.35, 0, roofTopY + 0.68, hallZ, m.ivory, 8);
  cyl(3.7, 3.7, 0.2, 0, roofTopY + 1.38, hallZ, m.trim, 8);

  // Main Emerald Green Dome (upper hemisphere)
  const domePos = toWorld(0, hallZ);
  const domeGeo = new THREE.SphereGeometry(3.45, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.52);
  domeGeo.scale(1, 0.92, 1);
  domeGeo.translate(domePos.x, groundY + roofTopY + 1.38, domePos.z);
  batch.add(domeGeo, m.roofs[0]);

  // Golden Crescent Moon Finial atop the central dome
  addCrescentFinial(0, roofTopY + 1.38 + 3.45 * 0.92, hallZ, 1.25);

  // ==========================================================================
  // 4. TWIN CORNER MINARETS (SOUTH-WEST & SOUTH-EAST CORNERS)
  // ==========================================================================
  for (const side of [-1, 1]) {
    const minX = side * (hallW / 2 + 0.55);
    const minZ = hallZ + hallD / 2 + 0.55;
    // Square plinth base (height 5.8m)
    box(1.75, 5.8, 1.75, minX, 2.9, minZ, m.ivory);
    box(1.88, 0.28, 1.88, minX, 5.75, minZ, m.green);

    // Octagonal upper tower shaft (from y = 5.8 to y = 9.8)
    cyl(0.68, 0.76, 4.0, minX, 7.8, minZ, m.ivory, 8);
    // Decorative green shaft ring
    cyl(0.75, 0.75, 0.24, minX, 7.9, minZ, m.green, 8);

    // Projecting Muezzin Balcony (Sherefe) at y = 9.8
    cyl(1.08, 0.85, 0.32, minX, 9.85, minZ, m.trim, 8);
    cyl(1.12, 1.12, 0.42, minX, 10.2, minZ, m.green, 8);

    // Upper lantern & conical green minaret cap (y = 10.2 to 11.9)
    cyl(0.52, 0.56, 1.05, minX, 10.7, minZ, m.ivory, 8);
    cyl(0.04, 0.66, 1.15, minX, 11.75, minZ, m.roofs[0], 8);

    // Golden Crescent Finial atop each minaret
    addCrescentFinial(minX, 12.3, minZ, 0.82);
  }

  // ==========================================================================
  // 5. ABLUTION (WUDU) PAVILION & COURTYARD AMENITIES
  // ==========================================================================
  // Positioned in the South-East courtyard quadrant (lx = +7.4, lz = +6.4)
  const wuduX = 7.4;
  const wuduZ = 6.4;
  const wuduW = 5.6;
  const wuduD = 3.2;
  const wuduH = 2.85;

  // Raised tiled wash floor
  box(wuduW, 0.14, wuduD, wuduX, 0.12, wuduZ, m.stone);
  // Central water tap wall & trough
  box(wuduW - 0.8, 1.15, 0.28, wuduX, 0.68, wuduZ, m.ivory);
  box(wuduW - 0.7, 0.16, 0.34, wuduX, 1.28, wuduZ, m.green);
  // Wash basins & concrete ablution stools on both sides
  for (let i = -2; i <= 2; i++) {
    const tx = wuduX + i * 0.95;
    for (const s of [-1, 1]) {
      // Chrome tap spout
      box(0.06, 0.06, 0.22, tx, 0.92, wuduZ + s * 0.2, m.steel);
      // Seated washing stool
      box(0.38, 0.38, 0.38, tx, 0.3, wuduZ + s * 0.88, m.stone);
    }
  }
  // Ablution canopy columns & green hipped roof
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      cyl(0.07, 0.07, wuduH, wuduX + sx * (wuduW / 2 - 0.3), wuduH / 2 + 0.1, wuduZ + sz * (wuduD / 2 - 0.3), m.steel, 6);
    }
  }
  box(wuduW + 0.6, 0.18, wuduD + 0.6, wuduX, wuduH + 0.12, wuduZ, m.roofs[0]);
  box(wuduW + 0.7, 0.12, wuduD + 0.7, wuduX, wuduH + 0.02, wuduZ, m.trim);

  // Courtyard benches on the South-West side (lx = -7.4, lz = +6.4)
  for (const bz of [5.2, 7.6]) {
    box(2.2, 0.1, 0.48, -7.4, 0.45, bz, m.wood);
    box(2.2, 0.42, 0.08, -7.4, 0.72, bz + 0.22, m.wood);
    for (const s of [-0.85, 0.85]) {
      box(0.08, 0.45, 0.44, -7.4 + s, 0.22, bz, m.steel);
    }
  }

  // Two courtyard solar lamps at the South entrance corners
  for (const side of [-1, 1]) {
    const lp = toWorld(side * 9.5, courtD / 2 - 1.2);
    const ly = height(lp.x, lp.z);
    batch.cylinder(0.07, 0.11, 5.6, lp.x, ly + 2.8, lp.z, m.steel, 6);
    batch.box(1.0, 0.08, 0.12, lp.x - side * 0.42, ly + 5.5, lp.z, m.steel);
    batch.box(0.46, 0.1, 0.28, lp.x - side * 0.82, ly + 5.44, lp.z, m.glow);
    lamps.push(new THREE.Vector3(lp.x - side * 0.82, ly + 5.4, lp.z));
  }

  // Collision obstacles for main hall, minarets, and ablution pavilion
  addObstacle(0, hallZ, hallW / 2 + 1.2, hallD / 2 + 2.6);
  addObstacle(wuduX, wuduZ, wuduW / 2 + 0.3, wuduD / 2 + 0.3);

  // Complex Bounds & Vegetation Reservation
  const mosqueBounds = new THREE.Box2(
    new THREE.Vector2(cx - courtW / 2 - 3, cz - courtD / 2 - 3),
    new THREE.Vector2(cx + courtW / 2 + 3, cz + courtD / 2 + 4)
  );

  // Invisible pickable mesh for hovering/clicking the Mosque in Orbit mode
  const pickGeo = new THREE.BoxGeometry(hallW + 3, hallH + 4.5, hallD + 4);
  const pickMat = new THREE.MeshBasicMaterial({ visible: false });
  const pickMesh = new THREE.Mesh(pickGeo, pickMat);
  pickMesh.position.set(cx, groundY + (hallH + 4.5) / 2, cz + hallZ);
  pickMesh.userData.id = 'local/phase1-mosque';
  pickMesh.userData.noHighlight = true;
  root.add(pickMesh);

  const entranceWorld = toWorld(0, courtD / 2 + 3.5);
  const building: BuildingAsset = {
    id: 'local/phase1-mosque',
    name: 'FUOYE Phase 1 Central Mosque',
    position: new THREE.Vector3(cx, groundY + 2.2, cz + hallZ),
    ring: [
      { x: cx - courtW / 2, z: cz - courtD / 2 },
      { x: cx + courtW / 2, z: cz - courtD / 2 },
      { x: cx + courtW / 2, z: cz + courtD / 2 },
      { x: cx - courtW / 2, z: cz + courtD / 2 },
    ],
    bounds: mosqueBounds,
    height: 9.8,
    floors: 1,
    style: 'central dome, twin minarets, arched verandah & ablution courtyard',
    entrance: new THREE.Vector3(entranceWorld.x, height(entranceWorld.x, entranceWorld.z), entranceWorld.z),
    source: 'Phase 1 campus religious landmark & ground observation',
    directory: true,
    named: true,
    placeId: 'phase1-mosque',
  };

  return {
    obstacles,
    reserved: (p: Point) => mosqueBounds.containsPoint(new THREE.Vector2(p.x, p.z)),
    lamps,
    position: new THREE.Vector3(cx, groundY, cz),
    bounds: mosqueBounds,
    pickable: pickMesh,
    building,
  };
}
