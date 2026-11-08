import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {reachableDestinations} from './helpers/reachable.ts';
import {textureCanvas} from './helpers/canvas.ts';
import {pointInRing,projectPosition} from '../src/world/math.ts';
import {resolveWalkSpawn} from '../src/world/walk-spawn.ts';
const read=(path:string)=>JSON.parse(readFileSync(new URL(path,import.meta.url),'utf8'));

test('Ikole data has independent geography, valid attributed geometry and one primary per named compound',()=>{
  const data=read('../public/data/ikole/campus.geojson'),inventory=read('../public/data/ikole/campus-places.json');
  assert.equal(data.metadata.campusId,'ikole');
  const features=new Map<string,any>(data.features.map((f:any)=>[f.id,f]));assert.equal(features.size,data.features.length);
  assert.ok(data.features.filter((f:any)=>f.properties.kind==='building').length>25);
  for(const f of data.features){
    assert.ok(f.properties.sources.every((s:string)=>s.startsWith('https://')));
    assert.ok(f.properties.center[0]>5.48&&f.properties.center[0]<5.51);
    assert.ok(f.properties.center[1]>7.79&&f.properties.center[1]<7.82);
    if(f.geometry.type==='Polygon')for(const ring of f.geometry.coordinates){assert.ok(ring.length>=4);assert.deepEqual(ring[0],ring.at(-1));assert.ok(f.properties.area>0);}
    if(f.properties.source==='observation'){assert.ok(f.properties.evidence);assert.match(f.properties.accuracy,/Approximate/);}
  }
  for(const place of inventory.places){
    const parts=place.featureIds.map((id:string)=>features.get(id));assert.ok(parts.every(Boolean),place.name);
    assert.equal(parts.filter((f:any)=>f.properties.campus.directory).length,1,place.name);
    assert.ok(parts.every((f:any)=>f.properties.campus.primaryId===parts[0].id));
    if(place.match==='pin-inside')assert.ok(pointInRing({x:place.pin[0],z:place.pin[1]},parts[0].geometry.coordinates[0].map(([x,z]:number[])=>({x,z}))),place.name+' pin must lie within its claimed footprint');
  }
  for(const id of inventory.replacedGateRoofs)assert.equal(features.has(id),false,'Gate roof footprints must not block the entry lane');
  assert.ok(Math.hypot(inventory.entrance.position[0]-inventory.suppliedPin.position[0],inventory.entrance.position[1]-inventory.suppliedPin.position[1])>.003);
});

test('Ikole terrain and vegetation are complete, attributed and cover the campus',()=>{
  const terrain=read('../public/data/ikole/terrain.json'),cover=read('../public/data/ikole/landcover.json');
  assert.equal(terrain.values.length,terrain.width*terrain.height);assert.ok(terrain.values.every(Number.isFinite));
  assert.ok(Math.max(...terrain.values)-Math.min(...terrain.values)>5,'Use Ikole elevation, not a flat placeholder');
  assert.equal(cover.values.length,cover.width*cover.height);assert.equal(cover.metadata.year,2021);assert.equal(cover.metadata.license,'CC BY 4.0');
  assert.ok(cover.values.every((v:number)=>[10,20,30,40,50,60,70,80,90,95,100].includes(v)));
  for(let i=0;i<2;i++){assert.ok(cover.bbox[i]<=terrain.bbox[i]+.0001);assert.ok(cover.bbox[i+2]>=terrain.bbox[i+2]-.0001);}
});

test('Ikole builds without Oye scenery, has a passable entrance and provides real tour and courier destinations',async()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'document');Object.defineProperty(globalThis,'document',{configurable:true,value:{createElement:textureCanvas}});
  const server=await createServer({configFile:false,optimizeDeps:{noDiscovery:true,include:[]},server:{middlewareMode:true,hmr:false,ws:false},appType:'custom'});
  let world:any;
  try {
    const [{buildCampusWorld},{ikoleCampus},{campusDeliveryStops}]=await Promise.all([server.ssrLoadModule('/src/world/engine.ts'),server.ssrLoadModule('/src/campuses/ikole/index.ts'),server.ssrLoadModule('/src/world/routes.ts')]);
    const data=read('../public/data/ikole/campus.geojson');
    world=buildCampusWorld(data.features,ikoleCampus.center,{},ikoleCampus.world,read('../public/data/ikole/terrain.json'),read('../public/data/ikole/landcover.json'));
    assert.equal(world.phase2Entrance,undefined);
    assert.equal(world.buildings.some((b:any)=>/phase1|phase2|senate|management/.test(b.placeId??'')),false);
    const source=read('../public/data/ikole/campus-places.json');const gate=projectPosition(source.entrance.position,ikoleCampus.center);
    assert.ok(Math.hypot(world.entrance.position.x-gate.x,world.entrance.position.z-gate.z)<.01);
    const angle=source.entrance.bearing*Math.PI/180;
    for(let t=-30;t<=35;t+=1)assert.equal(world.blocked({x:gate.x+Math.sin(angle)*t,z:gate.z-Math.cos(angle)*t},1.15),false,'Entrance blocked at '+t+' m');
    const tour=ikoleCampus.tour.buildStops(world);assert.equal(tour.length,8);assert.equal(tour[0].id,'ikole-main-gate');
    for(const stop of tour){
      assert.ok(Number.isFinite(stop.cameraPos.x+stop.cameraPos.y+stop.cameraPos.z));
      assert.ok(stop.cameraPos.y>world.height(stop.cameraPos.x,stop.cameraPos.z)+8);
      if(stop.buildingId)assert.ok(world.buildings.some((b:any)=>b.id===stop.buildingId));
      const spawn=resolveWalkSpawn(stop.walkSpawn,{min:{x:world.bounds.min.x,z:world.bounds.min.y},max:{x:world.bounds.max.x,z:world.bounds.max.y}},p=>!world.blocked(p,.35));
      assert.ok(spawn,stop.title+' has no walking start');
      assert.ok(Math.hypot(spawn.x-stop.walkSpawn.x,spawn.z-stop.walkSpawn.z)<30,stop.title+' walking start is too far away');
    }
    const destinations=campusDeliveryStops(world.buildings,world.roads,world.blocked);
    assert.equal(destinations.length,world.buildings.filter((b:any)=>b.named&&b.directory).length,'Each named destination needs a clear roadside courier stop');
    for(const stop of destinations)assert.equal(world.blocked(stop,2),false,stop.name);
    const reached=reachableDestinations(world,destinations);
    for(const stop of destinations)assert.ok(reached.has(stop.id),stop.name+' is unreachable from the entrance with vehicle clearance');
    assert.ok(world.root.children.length>0);world.dispose();assert.equal(world.root.children.length,0);world=undefined;
  } finally {
    world?.dispose();await server.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');
  }
});
