import * as THREE from 'three';
import type { Position } from '../data';
import type { Point } from './math';
import type { GeometryBatch } from './batch';
import type { Materials } from './materials';

export interface SportsComplexResult {
  obstacles: THREE.Box2[];
  reserved: (p: Point) => boolean;
  lamps: THREE.Vector3[];
  position: THREE.Vector3;
  bounds: THREE.Box2;
  pickable: THREE.Mesh;
  building: {
    id: string;
    name: string;
    position: THREE.Vector3;
    ring: Point[];
    bounds: THREE.Box2;
    height: number;
    floors: number;
    style: string;
    entrance: THREE.Vector3;
    source: string;
    directory: boolean;
    named: boolean;
    placeId: string;
  };
}

/** Creates procedural textures for East-West football pitch, basketball court, and volleyball court. */
function makeSportsTextures() {
  // 1. Football pitch texture (1024 x 512) - East goal faces the gate
  const pitchCanvas = document.createElement('canvas');
  pitchCanvas.width = 1024;
  pitchCanvas.height = 512;
  const pc = pitchCanvas.getContext('2d')!;

  // Alternating lawn mower grass stripes (vertical stripes across width)
  const stripes = 20;
  const stripeWidth = 1024 / stripes;
  for (let i = 0; i < stripes; i++) {
    pc.fillStyle = i % 2 === 0 ? '#437837' : '#4d853e';
    pc.fillRect(i * stripeWidth, 0, stripeWidth, 512);
  }

  // White regulation pitch markings
  pc.strokeStyle = '#ffffff';
  pc.fillStyle = '#ffffff';
  pc.lineWidth = 4;

  const marginX = 36;
  const marginY = 28;
  const pitchW = 1024 - marginX * 2;
  const pitchH = 512 - marginY * 2;
  const midX = 1024 / 2;
  const midY = 512 / 2;

  // Touchlines (North & South) and goal lines (West & East)
  pc.strokeRect(marginX, marginY, pitchW, pitchH);

  // Halfway line (North-South across the middle)
  pc.beginPath();
  pc.moveTo(midX, marginY);
  pc.lineTo(midX, marginY + pitchH);
  pc.stroke();

  // Center circle and kickoff spot
  pc.beginPath();
  pc.arc(midX, midY, pitchH * 0.18, 0, Math.PI * 2);
  pc.stroke();
  pc.beginPath();
  pc.arc(midX, midY, 4, 0, Math.PI * 2);
  pc.fill();

  // Penalty areas and goal areas (West at left, East at right)
  const penW = pitchW * 0.16;
  const penH = pitchH * 0.58;
  const goalBoxW = pitchW * 0.055;
  const goalBoxH = pitchH * 0.32;

  // West penalty area & goal area (back of the pitch)
  pc.strokeRect(marginX, midY - penH / 2, penW, penH);
  pc.strokeRect(marginX, midY - goalBoxH / 2, goalBoxW, goalBoxH);
  pc.beginPath();
  pc.arc(marginX + penW * 0.65, midY, 3.5, 0, Math.PI * 2);
  pc.fill();
  pc.beginPath();
  pc.arc(marginX + penW * 0.65, midY, pitchH * 0.18, -0.65, 0.65);
  pc.stroke();

  // East penalty area & goal area (facing the gate!)
  pc.strokeRect(1024 - marginX - penW, midY - penH / 2, penW, penH);
  pc.strokeRect(1024 - marginX - goalBoxW, midY - goalBoxH / 2, goalBoxW, goalBoxH);
  pc.beginPath();
  pc.arc(1024 - marginX - penW * 0.65, midY, 3.5, 0, Math.PI * 2);
  pc.fill();
  pc.beginPath();
  pc.arc(1024 - marginX - penW * 0.65, midY, pitchH * 0.18, Math.PI - 0.65, Math.PI + 0.65);
  pc.stroke();

  // Corner arcs
  const cornerR = 12;
  for (const [cx, cy, sAng, eAng] of [
    [marginX, marginY, 0, Math.PI / 2],
    [1024 - marginX, marginY, Math.PI / 2, Math.PI],
    [1024 - marginX, 512 - marginY, Math.PI, Math.PI * 1.5],
    [marginX, 512 - marginY, Math.PI * 1.5, Math.PI * 2]
  ] as [number, number, number, number][]) {
    pc.beginPath();
    pc.arc(cx, cy, cornerR, sAng, eAng);
    pc.stroke();
  }

  const pitchTex = new THREE.CanvasTexture(pitchCanvas);
  pitchTex.colorSpace = THREE.SRGBColorSpace;

  // 2. Basketball court texture (1024 x 512) - One full regulation court with both halves fully marked
  const bballCanvas = document.createElement('canvas');
  bballCanvas.width = 1024;
  bballCanvas.height = 512;
  const bc = bballCanvas.getContext('2d')!;

  // Perimeter dark green runoff apron
  bc.fillStyle = '#263b36';
  bc.fillRect(0, 0, 1024, 512);

  // Single full-regulation playing court (royal blue)
  const padMarginX = 48;
  const padMarginY = 32;
  const courtW = 1024 - padMarginX * 2;
  const courtH = 512 - padMarginY * 2;
  const bMidX = 1024 / 2;
  const bMidY = 512 / 2;
  const keyW = courtW * 0.18;
  const keyH = courtH * 0.38;

  bc.fillStyle = '#24527a';
  bc.fillRect(padMarginX, padMarginY, courtW, courtH);

  // Terracotta painted keys on BOTH ends (West & East)
  bc.fillStyle = '#b75b35';
  bc.fillRect(padMarginX, bMidY - keyH / 2, keyW, keyH);
  bc.fillRect(1024 - padMarginX - keyW, bMidY - keyH / 2, keyW, keyH);

  // Center circle paint
  const centerR = courtH * 0.18;
  bc.beginPath();
  bc.arc(bMidX, bMidY, centerR, 0, Math.PI * 2);
  bc.fill();

  // White regulation court lines
  bc.strokeStyle = '#ffffff';
  bc.fillStyle = '#ffffff';
  bc.lineWidth = 4;

  // Perimeter boundary line
  bc.strokeRect(padMarginX, padMarginY, courtW, courtH);

  // Half-court line
  bc.beginPath();
  bc.moveTo(bMidX, padMarginY);
  bc.lineTo(bMidX, padMarginY + courtH);
  bc.stroke();

  // Center circle outline
  bc.beginPath();
  bc.arc(bMidX, bMidY, centerR, 0, Math.PI * 2);
  bc.stroke();

  // Key outlines & free-throw semi-circles (West & East)
  bc.strokeRect(padMarginX, bMidY - keyH / 2, keyW, keyH);
  bc.strokeRect(1024 - padMarginX - keyW, bMidY - keyH / 2, keyW, keyH);

  // West free-throw semi-circle
  bc.beginPath();
  bc.arc(padMarginX + keyW, bMidY, centerR, -Math.PI / 2, Math.PI / 2);
  bc.stroke();
  bc.beginPath();
  bc.setLineDash([8, 8]);
  bc.arc(padMarginX + keyW, bMidY, centerR, Math.PI / 2, Math.PI * 1.5);
  bc.stroke();
  bc.setLineDash([]);

  // East free-throw semi-circle
  bc.beginPath();
  bc.arc(1024 - padMarginX - keyW, bMidY, centerR, Math.PI / 2, Math.PI * 1.5);
  bc.stroke();
  bc.beginPath();
  bc.setLineDash([8, 8]);
  bc.arc(1024 - padMarginX - keyW, bMidY, centerR, -Math.PI / 2, Math.PI / 2);
  bc.stroke();
  bc.setLineDash([]);

  // 3-point arcs on BOTH ends (West & East)
  const threePtR = courtH * 0.44;
  const threePtAngle = 0.38 * Math.PI;

  // West 3-point arc & straight corner lines
  bc.beginPath();
  bc.arc(padMarginX + keyW * 0.35, bMidY, threePtR, -threePtAngle, threePtAngle);
  bc.stroke();
  const arcEndX = padMarginX + keyW * 0.35 + threePtR * Math.cos(threePtAngle);
  const arcEndY1 = bMidY - threePtR * Math.sin(threePtAngle);
  const arcEndY2 = bMidY + threePtR * Math.sin(threePtAngle);
  bc.beginPath();
  bc.moveTo(padMarginX, arcEndY1); bc.lineTo(arcEndX, arcEndY1);
  bc.moveTo(padMarginX, arcEndY2); bc.lineTo(arcEndX, arcEndY2);
  bc.stroke();

  // East 3-point arc & straight corner lines
  bc.beginPath();
  bc.arc(1024 - padMarginX - keyW * 0.35, bMidY, threePtR, Math.PI - threePtAngle, Math.PI + threePtAngle);
  bc.stroke();
  const eastArcEndX = 1024 - padMarginX - keyW * 0.35 - threePtR * Math.cos(threePtAngle);
  bc.beginPath();
  bc.moveTo(1024 - padMarginX, arcEndY1); bc.lineTo(eastArcEndX, arcEndY1);
  bc.moveTo(1024 - padMarginX, arcEndY2); bc.lineTo(eastArcEndX, arcEndY2);
  bc.stroke();

  const bballTex = new THREE.CanvasTexture(bballCanvas);
  bballTex.colorSpace = THREE.SRGBColorSpace;

  // 3. Volleyball court texture (512 x 256) - East-West orientation
  const vballCanvas = document.createElement('canvas');
  vballCanvas.width = 512;
  vballCanvas.height = 256;
  const vc = vballCanvas.getContext('2d')!;

  // Perimeter runoff
  vc.fillStyle = '#39533f';
  vc.fillRect(0, 0, 512, 256);

  // Court field
  const vMarginX = 32;
  const vMarginY = 20;
  const vCourtW = 512 - vMarginX * 2;
  const vCourtH = 256 - vMarginY * 2;
  const vMidX = 512 / 2;

  vc.fillStyle = '#dca34b';
  vc.fillRect(vMarginX, vMarginY, vCourtW, vCourtH);

  // White boundary lines
  vc.strokeStyle = '#ffffff';
  vc.lineWidth = 4;
  vc.strokeRect(vMarginX, vMarginY, vCourtW, vCourtH);

  // Center line (dividing court in two 9x9 halves)
  vc.beginPath();
  vc.moveTo(vMidX, vMarginY);
  vc.lineTo(vMidX, vMarginY + vCourtH);
  vc.stroke();

  // 3m attack lines on both sides
  const attackDist = vCourtW / 6;
  vc.beginPath();
  vc.moveTo(vMidX - attackDist, vMarginY);
  vc.lineTo(vMidX - attackDist, vMarginY + vCourtH);
  vc.moveTo(vMidX + attackDist, vMarginY);
  vc.lineTo(vMidX + attackDist, vMarginY + vCourtH);
  vc.stroke();

  const vballTex = new THREE.CanvasTexture(vballCanvas);
  vballTex.colorSpace = THREE.SRGBColorSpace;

  return { pitchTex, bballTex, vballTex };
}

/**
 * Builds the complete Phase 1 Sports Complex:
 * 1. Full-sized football field (East-West length, East goal faces the Main Gate).
 * 2. Mini stadium stand situated along the RIGHT-HAND SIDE (North sideline, facing South onto the pitch).
 * 3. Basketball court situated on the RIGHT-HAND SIDE of the pitch near the gate (NOT at the back!).
 * 4. Volleyball court situated at the BACK of the pitch (behind the far West goal).
 * 5. Entire ground completely flat and leveled.
 * 6. Clean perimeter walkways connecting facilities with ZERO paths crossing the football pitch.
 */
export function addPhaseOneSportsComplex(
  root: THREE.Group,
  batch: GeometryBatch,
  m: Materials,
  center: Position,
  height: (x: number, z: number) => number
): SportsComplexResult {
  const obstacles: THREE.Box2[] = [];
  const lamps: THREE.Vector3[] = [];
  const obstacle = (minX: number, minZ: number, maxX: number, maxZ: number) => {
    obstacles.push(new THREE.Box2(new THREE.Vector2(minX, minZ), new THREE.Vector2(maxX, maxZ)));
  };

  const { pitchTex, bballTex, vballTex } = makeSportsTextures();

  // Helper shortcuts for batch
  const box = (...args: Parameters<GeometryBatch['box']>) => batch.box(...args);
  const cyl = (...args: Parameters<GeometryBatch['cylinder']>) => batch.cylinder(...args);

  // Leveled height for the sports ground (matches build.ts flatHeight)
  const sportsBaseY = 1.4;
  const groundY = sportsBaseY + 0.05;

  // ==========================================
  // 1. FULL-SIZED FOOTBALL FIELD (PITCH)
  // ==========================================
  // One goal post directly FACING THE GATE (East goal at x ~ 712, facing East toward x = 772 gate).
  // Pitch dimensions: 96m long along X (East-West), 60m wide along Z (North-South).
  // Center: x = 665, z = -440.
  // X spans: [617, 713]. Z spans: [-470, -410].
  const pitchCenterX = 665;
  const pitchCenterZ = -440;
  const pitchW = 96;
  const pitchD = 60;
  const pitchY = groundY + 0.03;

  const pitchGeo = new THREE.PlaneGeometry(pitchW, pitchD);
  pitchGeo.rotateX(-Math.PI / 2);
  pitchGeo.translate(pitchCenterX, pitchY, pitchCenterZ);

  const pitchMat = new THREE.MeshLambertMaterial({ map: pitchTex });
  pitchMat.userData.ownedMaterial = true;
  pitchMat.userData.ownedTexture = pitchTex;

  const pitchMesh = new THREE.Mesh(pitchGeo, pitchMat);
  pitchMesh.receiveShadow = true;
  root.add(pitchMesh);

  // Curb border around football field
  box(pitchW + 1.2, 0.18, 0.28, pitchCenterX, pitchY - 0.02, pitchCenterZ - pitchD / 2 - 0.14, m.base);
  box(pitchW + 1.2, 0.18, 0.28, pitchCenterX, pitchY - 0.02, pitchCenterZ + pitchD / 2 + 0.14, m.base);
  box(0.28, 0.18, pitchD + 1.2, pitchCenterX - pitchW / 2 - 0.14, pitchY - 0.02, pitchCenterZ, m.base);
  box(0.28, 0.18, pitchD + 1.2, pitchCenterX + pitchW / 2 + 0.14, pitchY - 0.02, pitchCenterZ, m.base);

  // Goal Posts:
  // West Goal at x = 618.2 (at the back of the pitch)
  // East Goal at x = 711.8 (FACING THE GATE SIDE!)
  const goalWidth = 7.32;
  const goalHeight = 2.44;
  const goalDepth = 1.6;

  for (const side of [-1, 1]) {
    // side = 1 is East goal (facing the gate!), side = -1 is West goal
    const gx = pitchCenterX + side * (pitchW / 2 - 1.2);
    const postR = 0.06;

    // Upright posts
    for (const postZ of [-goalWidth / 2, goalWidth / 2]) {
      const gz = pitchCenterZ + postZ;
      cyl(postR, postR, goalHeight, gx, pitchY + goalHeight / 2, gz, m.white, 8);
      // Back support stanchion angling away from pitch
      const backX = gx - side * goalDepth;
      cyl(
        postR * 0.7,
        postR * 0.7,
        Math.hypot(goalDepth, goalHeight),
        (gx + backX) / 2,
        pitchY + goalHeight / 2,
        gz,
        m.steel,
        6
      );
    }

    // Crossbar
    box(0.12, 0.12, goalWidth + 0.12, gx, pitchY + goalHeight, pitchCenterZ, m.white);

    // Back ground bar
    const backX = gx - side * goalDepth;
    box(0.1, 0.1, goalWidth, backX, pitchY + 0.06, pitchCenterZ, m.steel);

    // Net side triangle panels
    const netShape = new THREE.Shape();
    netShape.moveTo(0, 0);
    netShape.lineTo(0, goalHeight);
    netShape.lineTo(-side * goalDepth, 0);
    netShape.closePath();
    const netGeo = new THREE.ShapeGeometry(netShape);
    netGeo.rotateY(Math.PI / 2);
    netGeo.translate(gx, pitchY, pitchCenterZ - goalWidth / 2);
    batch.add(netGeo, m.trim);

    const netGeo2 = netGeo.clone();
    netGeo2.translate(0, 0, goalWidth);
    batch.add(netGeo2, m.trim);

    obstacle(gx - 1, pitchCenterZ - goalWidth / 2 - 0.5, gx + 1, pitchCenterZ + goalWidth / 2 + 0.5);
  }

  // Corner Flags at 4 corners
  for (const sx of [-1, 1]) {
    for (const sz of [-1, 1]) {
      const fx = pitchCenterX + sx * (pitchW / 2 - 0.8);
      const fz = pitchCenterZ + sz * (pitchD / 2 - 0.8);
      cyl(0.02, 0.02, 1.5, fx, pitchY + 0.75, fz, m.white, 5);
      box(0.3, 0.2, 0.02, fx + 0.15, pitchY + 1.35, fz, m.accent);
    }
  }

  // Team Benches / Dugouts along the South sideline
  for (const side of [-1, 1]) {
    const dx = pitchCenterX + side * 15;
    const dz = pitchCenterZ + pitchD / 2 + 3.5;
    // Dugout base & bench
    box(6.8, 0.15, 2.4, dx, groundY + 0.08, dz, m.pavers);
    box(6.2, 0.45, 0.45, dx, groundY + 0.4, dz + 0.35, m.wood);
    // Dugout shelter canopy
    box(7.2, 0.08, 2.6, dx, groundY + 2.2, dz, m.roofs[0]);
    for (const cx of [dx - 3.2, dx + 3.2]) {
      cyl(0.05, 0.05, 2.2, cx, groundY + 1.1, dz - 1.0, m.steel, 6);
      cyl(0.05, 0.05, 2.2, cx, groundY + 1.1, dz + 1.0, m.steel, 6);
    }
    obstacle(dx - 3.6, dz - 1.4, dx + 3.6, dz + 1.4);
  }

  // ==============================================================
  // 2. MINI STADIUM STAND (ON THE RIGHT-HAND SIDE / NORTH SIDELINE)
  // ==============================================================
  // "also the stand should be in the right hand side not left hand side."
  // When looking from the gate (East) toward the pitch (West):
  // Right-hand side is the North sideline!
  // Center: x = 665, z = -476.
  // Dimensions: 38m long along X, 6.8m deep along Z.
  // Spectators sit on stepped tiers facing SOUTH directly onto the pitch.
  const standCenterX = 665;
  const standCenterZ = -476;
  const standWidthX = 38;
  const standDepthZ = 6.8;

  const tiers = 4;
  const tierRise = 0.44;
  const tierRun = 1.25;

  // Stepped seating tiers facing South (low tier at South, high tier at North)
  for (let t = 0; t < tiers; t++) {
    const tierZ = standCenterZ + standDepthZ / 2 - t * tierRun - tierRun / 2;
    const tierH = (t + 1) * tierRise;
    const tierY = groundY + tierH / 2;
    box(standWidthX, tierH, tierRun + 0.04, standCenterX, tierY, tierZ, m.stone);

    // Colorful stadium seats (FUOYE green, gold, ivory)
    const seatsCount = 24;
    const seatSpacing = (standWidthX - 3) / seatsCount;
    for (let s = 0; s < seatsCount; s++) {
      if (s === 11 || s === 12) continue; // center aisle stair gap
      const sx = standCenterX - (standWidthX - 3) / 2 + (s + 0.5) * seatSpacing;
      const seatColor = (s + t) % 3 === 0 ? m.roofs[0] : (s + t) % 3 === 1 ? m.accent : m.walls[0];
      box(0.48, 0.08, 0.42, sx, groundY + (t + 1) * tierRise + 0.04, tierZ + 0.08, seatColor);
      box(0.48, 0.32, 0.06, sx, groundY + (t + 1) * tierRise + 0.22, tierZ - 0.16, seatColor);
    }
  }

  // Back wall behind top tier (North side)
  const backWallH = 3.2;
  const backWallZ = standCenterZ - standDepthZ / 2 - 0.25;
  box(standWidthX, backWallH, 0.35, standCenterX, groundY + backWallH / 2, backWallZ, m.walls[1]);

  // Side enclosure walls (West and East ends)
  for (const side of [-1, 1]) {
    const wallX = standCenterX + side * (standWidthX / 2 + 0.15);
    box(0.3, backWallH, standDepthZ, wallX, groundY + backWallH / 2, standCenterZ, m.walls[1]);
  }

  // Cantilevered Canopy Roof over the stand (FUOYE Phase 1 green)
  const canopyH = groundY + 4.3;
  const canopyWX = standWidthX + 2;
  const canopyWZ = standDepthZ + 1.2;
  box(canopyWX, 0.18, canopyWZ, standCenterX, canopyH, standCenterZ, m.roofs[0], 0);

  // Roof support columns along back and front
  for (let i = 0; i <= 6; i++) {
    const colX = standCenterX - standWidthX / 2 + (i / 6) * standWidthX;
    // Back columns
    cyl(0.09, 0.09, 4.0, colX, groundY + 2.0, backWallZ + 0.12, m.steel, 6);
    // Front corner columns
    if (i === 0 || i === 6) {
      cyl(0.08, 0.08, 4.0, colX, groundY + 2.0, standCenterZ + standDepthZ / 2 - 0.2, m.steel, 6);
    }
  }

  // Safety railings along side steps
  for (const side of [-1, 1]) {
    const railX = standCenterX + side * (standWidthX / 2 - 0.2);
    box(0.06, 0.06, standDepthZ * 0.9, railX, groundY + 1.45, standCenterZ, m.steel);
    box(0.06, 0.06, standDepthZ * 0.9, railX, groundY + 2.0, standCenterZ, m.steel);
  }

  // Front barrier railing between stand apron and pitch
  const frontRailZ = standCenterZ + standDepthZ / 2 + 0.3;
  box(standWidthX, 0.9, 0.06, standCenterX, groundY + 0.45, frontRailZ, m.steel);

  // Stand collision obstacle
  obstacle(
    standCenterX - standWidthX / 2 - 0.5,
    standCenterZ - standDepthZ / 2 - 0.5,
    standCenterX + standWidthX / 2 + 0.5,
    standCenterZ + standDepthZ / 2 + 0.5
  );

  // Stand inspection pickable mesh
  const standPickGeo = new THREE.BoxGeometry(standWidthX + 2, 5, standDepthZ + 2);
  const standPickMat = new THREE.MeshBasicMaterial({ visible: false });
  const standPickMesh = new THREE.Mesh(standPickGeo, standPickMat);
  standPickMesh.position.set(standCenterX, groundY + 2.5, standCenterZ);
  standPickMesh.userData.id = 'local/phase1-sports-complex';
  standPickMesh.userData.noHighlight = true;
  root.add(standPickMesh);

  // ==============================================================
  // 3. BASKETBALL COURT (ONE SINGLE FULL REGULATION COURT: 30m x 16m)
  // ==============================================================
  // Positioned in the open space to the right of the stand and East goal, completely clear of the pitch.
  // Center: x = 712, z = -488.
  // Pad size: 30m wide along X, 16m deep along Z.
  const bballCenterX = 712;
  const bballCenterZ = -488;
  const bballPadW = 30;
  const bballPadD = 16;
  const bballY = groundY + 0.04;

  const bballGeo = new THREE.PlaneGeometry(bballPadW, bballPadD);
  bballGeo.rotateX(-Math.PI / 2);
  bballGeo.translate(bballCenterX, bballY, bballCenterZ);

  const bballMat = new THREE.MeshLambertMaterial({ map: bballTex });
  bballMat.userData.ownedMaterial = true;
  bballMat.userData.ownedTexture = bballTex;

  const bballMesh = new THREE.Mesh(bballGeo, bballMat);
  bballMesh.receiveShadow = true;
  root.add(bballMesh);

  // Curb border around basketball court
  box(bballPadW + 0.4, 0.18, 0.22, bballCenterX, bballY - 0.03, bballCenterZ - bballPadD / 2 - 0.11, m.base);
  box(bballPadW + 0.4, 0.18, 0.22, bballCenterX, bballY - 0.03, bballCenterZ + bballPadD / 2 + 0.11, m.base);
  box(0.22, 0.18, bballPadD + 0.4, bballCenterX - bballPadW / 2 - 0.11, bballY - 0.03, bballCenterZ, m.base);
  box(0.22, 0.18, bballPadD + 0.4, bballCenterX + bballPadW / 2 + 0.11, bballY - 0.03, bballCenterZ, m.base);

  // Exactly TWO (2) 3D Basketball Hoops (West hoop & East hoop, one at each end)
  for (const side of [-1, 1]) {
    const poleX = bballCenterX + side * (bballPadW / 2 - 1.2);
    const armX = bballCenterX + side * (bballPadW / 2 - 2.4);
    const hoopY = bballY + 3.05;

    // Upright steel support pole
    cyl(0.08, 0.09, 3.8, poleX, bballY + 1.9, bballCenterZ, m.steel, 8);
    // Extension gooseneck boom
    box(Math.abs(poleX - armX), 0.08, 0.08, (poleX + armX) / 2, bballY + 3.5, bballCenterZ, m.steel);
    // Backboard (1.8m x 1.05m)
    box(0.06, 1.05, 1.8, armX, hoopY + 0.4, bballCenterZ, m.white);
    // Inner red target box
    box(0.08, 0.45, 0.58, armX - side * 0.01, hoopY + 0.3, bballCenterZ, m.accent);

    // Rim & Net
    const rimX = armX - side * 0.42;
    const rimGeo = new THREE.TorusGeometry(0.23, 0.02, 6, 16);
    rimGeo.rotateX(Math.PI / 2);
    rimGeo.translate(rimX, hoopY, bballCenterZ);
    batch.add(rimGeo, m.accent);

    // White net cylinder
    cyl(0.2, 0.12, 0.42, rimX, hoopY - 0.22, bballCenterZ, m.trim, 8);

    obstacle(poleX - 0.4, bballCenterZ - 0.4, poleX + 0.4, bballCenterZ + 0.4);
  }

  // ==============================================================
  // 4. VOLLEYBALL COURT (AT THE BACK OF THE PITCH / BEHIND WEST GOAL)
  // ==============================================================
  // "while the volleyball court should be at the back of the pitch ."
  // Positioned behind the far West goal post at the back of the pitch.
  // Center: x = 598, z = -440 (aligned with the center line of the pitch).
  // Pad size: 22m wide along X, 14m deep along Z.
  const vballCenterX = 598;
  const vballCenterZ = -440;
  const vballPadW = 22;
  const vballPadD = 14;
  const vballY = groundY + 0.04;

  const vballGeo = new THREE.PlaneGeometry(vballPadW, vballPadD);
  vballGeo.rotateX(-Math.PI / 2);
  vballGeo.translate(vballCenterX, vballY, vballCenterZ);

  const vballMat = new THREE.MeshLambertMaterial({ map: vballTex });
  vballMat.userData.ownedMaterial = true;
  vballMat.userData.ownedTexture = vballTex;

  const vballMesh = new THREE.Mesh(vballGeo, vballMat);
  vballMesh.receiveShadow = true;
  root.add(vballMesh);

  // Volleyball court border curb
  box(vballPadW + 0.4, 0.18, 0.22, vballCenterX, vballY - 0.03, vballCenterZ - vballPadD / 2 - 0.11, m.base);
  box(vballPadW + 0.4, 0.18, 0.22, vballCenterX, vballY - 0.03, vballCenterZ + vballPadD / 2 + 0.11, m.base);
  box(0.22, 0.18, vballPadD + 0.4, vballCenterX - vballPadW / 2 - 0.11, vballY - 0.03, vballCenterZ, m.base);
  box(0.22, 0.18, vballPadD + 0.4, vballCenterX + vballPadW / 2 + 0.11, vballY - 0.03, vballCenterZ, m.base);

  // Volleyball Net across the center of the court at x = 598
  const netLen = 10.5;
  const netH = 1.0;
  const netTopY = vballY + 2.43; // regulation 2.43m net height

  // Upright steel net posts at North and South sidelines
  for (const postZ of [-netLen / 2 - 0.3, netLen / 2 + 0.3]) {
    cyl(0.06, 0.06, 2.7, vballCenterX, vballY + 1.35, vballCenterZ + postZ, m.steel, 8);
    obstacle(vballCenterX - 0.2, vballCenterZ + postZ - 0.2, vballCenterX + 0.2, vballCenterZ + postZ + 0.2);
  }

  // Taut net mesh
  box(0.04, netH, netLen, vballCenterX, netTopY - netH / 2, vballCenterZ, m.trim);
  // White top & bottom bands
  box(0.06, 0.08, netLen + 0.1, vballCenterX, netTopY, vballCenterZ, m.white);
  box(0.06, 0.06, netLen + 0.1, vballCenterX, netTopY - netH, vballCenterZ, m.white);

  // Referee elevated platform stand
  const refZ = vballCenterZ + netLen / 2 + 0.6;
  box(0.9, 1.6, 0.9, vballCenterX, vballY + 0.8, refZ, m.steel);
  box(1.0, 0.08, 1.0, vballCenterX, vballY + 1.64, refZ, m.wood);
  box(0.04, 0.9, 0.8, vballCenterX + 0.45, vballY + 2.1, refZ, m.steel);
  obstacle(vballCenterX - 0.6, refZ - 0.6, vballCenterX + 0.6, refZ + 0.6);

  // ==============================================================
  // 5. CONNECTING PAVED WALKWAYS (PERIMETER ONLY, ZERO PITCH CUTS)
  // ==============================================================
  // Path 1: Entrance walkway from the main road (z ~ -382) leading into the sports concourse
  box(3.2, 0.1, 24, 718, groundY + 0.05, -394, m.pavers);

  // Path 2: Concourse running along the South sideline of the pitch to the volleyball court at the back
  box(145, 0.1, 2.8, 662, groundY + 0.05, -406, m.pavers);

  // Path 3: Concourse running North on the right-hand side to the basketball court entrance
  box(3.0, 0.1, 72, 712, groundY + 0.05, -442, m.pavers);

  // Path 4: Concourse connecting South walkway to the volleyball court at the back
  box(3.0, 0.1, 30, 608, groundY + 0.05, -425, m.pavers);

  // Path 5: Concourse connecting the grandstand to the basketball court plaza
  box(15, 0.1, 3.0, 690, groundY + 0.05, -488, m.pavers);

  // Path 6: Basketball court approach plaza along South curb
  box(32, 0.1, 2.6, 712, groundY + 0.05, -478.5, m.pavers);

  // Spectator Benches along concourses
  for (const [bx, bz] of [
    [718, -406],
    [688, -406],
    [640, -406],
    [608, -450],
    [702, -477],
    [722, -477]
  ] as [number, number][]) {
    box(2.2, 0.1, 0.5, bx, groundY + 0.45, bz, m.wood);
    box(2.2, 0.45, 0.08, bx, groundY + 0.75, bz - 0.22, m.wood);
    for (const s of [-0.9, 0.9]) {
      box(0.08, 0.45, 0.48, bx + s, groundY + 0.22, bz, m.steel);
    }
  }

  // ==============================================================
  // 6. STADIUM FLOODLIGHT TOWERS (4 CORNERS OF THE COMPLEX)
  // ==============================================================
  const floodlightPositions = [
    [584, -406], // South-West (behind volleyball)
    [584, -486], // North-West (behind volleyball)
    [734, -512], // North-East (behind basketball court)
    [734, -406]  // South-East (gate side)
  ];

  for (const [lx, lz] of floodlightPositions) {
    const mastH = 14;
    cyl(0.24, 0.4, mastH, lx, groundY + mastH / 2, lz, m.steel, 8);
    box(2.6, 0.25, 0.4, lx, groundY + mastH, lz, m.steel);
    box(2.4, 0.35, 0.35, lx, groundY + mastH + 0.2, lz, m.glow);
    lamps.push(new THREE.Vector3(lx, groundY + mastH + 0.2, lz));
    obstacle(lx - 0.5, lz - 0.5, lx + 0.5, lz + 0.5);
  }

  // Complex Bounds & Vegetation Reservation
  const complexBounds = new THREE.Box2(
    new THREE.Vector2(575, -518),
    new THREE.Vector2(740, -386)
  );

  const sportsBuilding = {
    id: 'local/phase1-sports-complex',
    name: 'Phase 1 Sports Field & Mini Stadium',
    position: new THREE.Vector3(665, groundY + 2.0, -440),
    ring: [
      { x: 575, z: -518 },
      { x: 740, z: -518 },
      { x: 740, z: -386 },
      { x: 575, z: -386 }
    ],
    bounds: complexBounds,
    height: 5.2,
    floors: 1,
    style: 'covered grandstand pavilion & athletic fields',
    entrance: new THREE.Vector3(735, groundY, -380),
    source: 'Phase 1 recreation complex ground survey',
    directory: true,
    named: true,
    placeId: 'sports-arena'
  };

  return {
    obstacles,
    reserved: (p: Point) =>
      p.x >= complexBounds.min.x &&
      p.x <= complexBounds.max.x &&
      p.z >= complexBounds.min.y &&
      p.z <= complexBounds.max.y,
    lamps,
    position: new THREE.Vector3(665, groundY, -440),
    bounds: complexBounds,
    pickable: standPickMesh,
    building: sportsBuilding
  };
}
