import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { buildGuidedTourStops, evaluateTourFlight } from '../src/world/tour.ts';
import { projectPosition } from '../src/world/math.ts';
import type { World, BuildingAsset } from '../src/world/build.ts';

const read = (p: string) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

test('guided tour builds 10 ordered stops from Phase 1 Main Gate across Admin, Management Sciences, Library, Hostels, Phase 2 & 3', () => {
  const dataset = read('../public/data/campus.geojson');
  const center: [number, number] = [5.3163, 7.7772];

  const buildings: BuildingAsset[] = dataset.features
    .filter((f: any) => f.properties.kind === 'building' && f.geometry.type === 'Polygon')
    .map((f: any, idx: number) => {
      const ring = f.geometry.coordinates[0].slice(0, -1).map((p: [number, number]) => projectPosition(p, center));
      const b = new THREE.Box2().setFromPoints(ring.map((p: any) => new THREE.Vector2(p.x, p.z)));
      const p = b.getCenter(new THREE.Vector2());
      return {
        id: f.id,
        name: f.properties.tags.name ?? `Building ${idx + 1}`,
        position: new THREE.Vector3(p.x, 0, p.y),
        ring,
        bounds: b,
        height: 7.2,
        floors: 2,
        style: 'campus',
        entrance: new THREE.Vector3(p.x + 8, 0, p.y + 8),
        source: f.properties.source,
        directory: f.properties.campus?.directory ?? true,
        named: !!f.properties.campus?.id,
        placeId: f.properties.campus?.id,
      };
    });

  const mockWorld = {
    buildings,
    height: () => 0,
    entrance: {
      position: new THREE.Vector3(716.9, 0, -339.4),
      approach: new THREE.Vector3(704.0, 0, -339.4),
    },
    phase2Entrance: {
      position: new THREE.Vector3(-97.5, 0, -545.2),
      approach: new THREE.Vector3(-103.8, 0, -522.0),
    },
  } as unknown as World;

  const stops = buildGuidedTourStops(mockWorld);

  assert.equal(stops.length, 10);
  assert.equal(stops[0].id, 'phase1-main-gate');
  assert.match(stops[0].title, /Phase 1 Main Gate/i);

  const ids = stops.map(s => s.id);
  assert.ok(ids.includes('central-admin'), 'Tour must include Admin Block');
  assert.ok(ids.includes('management-sciences'), 'Tour must include Management Sciences');
  assert.ok(ids.includes('phase1-library'), 'Tour must include Library');
  assert.ok(ids.includes('phase3-hostels-faculties'), 'Tour must include Hostels & Phase 3');
  assert.ok(ids.includes('phase2-gate-law'), 'Tour must include Phase 2 Gate');

  for (const [idx, stop] of stops.entries()) {
    assert.equal(stop.stepNumber, idx + 1);
    assert.ok(stop.title.length > 5);
    assert.ok(stop.subtitle.length > 5);
    assert.ok(stop.description.length > 20);
    assert.ok(stop.studentTip.length > 15);
    assert.ok(stop.highlights.length >= 2);
    assert.ok(Number.isFinite(stop.cameraPos.x + stop.cameraPos.y + stop.cameraPos.z));
    assert.ok(Number.isFinite(stop.targetPos.x + stop.targetPos.y + stop.targetPos.z));
    assert.ok(stop.cameraPos.y > 4, `Camera at ${stop.id} must stay well above terrain`);
  }
});

test('evaluateTourFlight interpolates start, parabolic mid-flight arc, and destination accurately', () => {
  const fromPos = new THREE.Vector3(700, 20, -340);
  const toPos = new THREE.Vector3(-170, 30, -150);
  const fromTarget = new THREE.Vector3(716, 5, -339);
  const toTarget = new THREE.Vector3(-170, 6, -149);

  const startPose = evaluateTourFlight(
    { fromPos, toPos, fromTarget, toTarget, arcHeight: 40, duration: 2.5, elapsed: 0 },
    0
  );
  assert.ok(startPose.position.distanceTo(fromPos) < 1e-6);
  assert.ok(startPose.target.distanceTo(fromTarget) < 1e-6);

  const midPose = evaluateTourFlight(
    { fromPos, toPos, fromTarget, toTarget, arcHeight: 40, duration: 2.5, elapsed: 1.25 },
    0.5
  );
  assert.ok(Math.abs(midPose.position.y - 65) < 1e-5);

  const endPose = evaluateTourFlight(
    { fromPos, toPos, fromTarget, toTarget, arcHeight: 40, duration: 2.5, elapsed: 2.5 },
    1
  );
  assert.ok(endPose.position.distanceTo(toPos) < 1e-6);
  assert.ok(endPose.target.distanceTo(toTarget) < 1e-6);
});
