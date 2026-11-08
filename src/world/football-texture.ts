import * as THREE from 'three';

/** Shared Oye/Ikole striped grass and football markings. */
export function createFootballPitchTexture() {
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

  return pitchTex;
}
