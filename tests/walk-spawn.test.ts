import test from 'node:test';
import assert from 'node:assert/strict';
import {resolveWalkSpawn} from '../src/world/walk-spawn.ts';
const bounds={min:{x:-100,z:-100},max:{x:100,z:100}};
test('walking keeps the chosen clear ground point rather than snapping to roads',()=>{assert.deepEqual(resolveWalkSpawn({x:13.27,z:-24.9},bounds,()=>true),{x:13.27,z:-24.9});});
test('blocked walking targets move only to nearby clear ground',()=>{const allowed=(p:{x:number;z:number})=>Math.abs(p.x)>8.35||Math.abs(p.z)>12.35;const p=resolveWalkSpawn({x:0,z:0},bounds,allowed)!;assert.ok(allowed(p));assert.ok(Math.hypot(p.x,p.z)<9.1);});
test('walking clamps outside terrain and fails safely if no free ground exists',()=>{const p=resolveWalkSpawn({x:120,z:-200},bounds,()=>true)!;assert.deepEqual(p,{x:99.5,z:-99.5});assert.equal(resolveWalkSpawn({x:NaN,z:0},bounds,()=>true),undefined);assert.equal(resolveWalkSpawn({x:0,z:0},{min:{x:-1,z:-1},max:{x:1,z:1}},()=>false),undefined);});
