import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
import * as THREE from 'three';

import { textureCanvas } from './helpers/canvas.ts';

test('a second world profile builds its own grounds without Oye landmarks or terrain flattening', async () => {
  const previous = Object.getOwnPropertyDescriptor(globalThis, 'document');
  Object.defineProperty(globalThis, 'document', {configurable: true, value: {createElement: textureCanvas}});
  const server = await createServer({configFile: false, optimizeDeps: {noDiscovery: true, include: []}, server: {middlewareMode: true, hmr: false, ws: false}, appType: 'custom'});
  let world: any;
  try {
    const {buildCampusWorld} = await server.ssrLoadModule('/src/world/engine.ts');
    const center = [5.497, 7.804];
    const feature = {
      type: 'Feature', id: 'way/123',
      geometry: {type: 'Polygon', coordinates: [[[5.497,7.804],[5.4972,7.804],[5.4972,7.8042],[5.497,7.8042],[5.497,7.804]]]},
      properties: {kind: 'building', source: 'osm', area: 490, tags: {}, center, sources: [], osmId: '123'},
    };
    const entrance = {position: new THREE.Vector3(20, 12, 30), approach: new THREE.Vector3(24, 12, 35)};
    world = buildCampusWorld([feature], center, {}, {
      signs: [], appearance: () => ({roof: 'grey'}),
      grade: () => () => 12,
      decorate: () => ({entrance, reserved: () => false, people: 0, parkingLots: 0}),
      plant: () => ({trees: [], bushes: []}),
    });
    assert.equal(world.buildings.length, 1, 'No Oye sports, mosque or transit landmarks may leak into a second campus');
    assert.equal(world.buildings[0].id, 'way/123');
    assert.equal(world.phase2Entrance, undefined, 'A second gate must not be required');
    assert.equal(world.entrance, entrance);
    assert.equal(world.height(0, 0), 12);
    assert.equal(world.height(665, -440), 12, 'Oye sports-field grading must not flatten another campus');
    assert.equal(world.stats.people, 0);
    assert.equal(world.signageCount, 0);
    assert.equal(world.blocked({x: 10, z: -10}), true);
    assert.equal(world.blocked({x: 80, z: 80}), false);
    assert.ok(world.root.children.length > 0);
    world.dispose();
    assert.equal(world.root.children.length, 0);
    world = undefined;
  } finally {
    world?.dispose();
    await server.close();
    if (previous) Object.defineProperty(globalThis, 'document', previous);
    else Reflect.deleteProperty(globalThis, 'document');
  }
});
