import test from 'node:test';
import {Raycaster,Vector3} from 'three';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createServer} from 'vite';
import {reachableDestinations} from './helpers/reachable.ts';
import {textureCanvas} from './helpers/canvas.ts';
import {pointInRing,projectPosition,nearestPoint} from '../src/world/math.ts';
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

test('Ikole has separate entry and exit lanes joined to the highway and campus approach',()=>{
  const data=read('../public/data/ikole/campus.geojson'),source=read('../public/data/ikole/campus-places.json');
  const feature=(id:string)=>data.features.find((f:any)=>f.id===id);
  const entry=feature('local/ikole-gate-entry'),exit=feature('local/ikole-gate-exit');
  for(const lane of [entry,exit]){assert.equal(lane.properties.tags.oneway,'yes');assert.equal(lane.properties.tags.lanes,'1');}
  assert.deepEqual(entry.geometry.coordinates[0],exit.geometry.coordinates.at(-1));
  assert.deepEqual(entry.geometry.coordinates.at(-1),exit.geometry.coordinates[0]);
  assert.deepEqual(feature('local/ikole-highway-approach').geometry.coordinates.at(-1),entry.geometry.coordinates[0]);
  assert.deepEqual(feature('local/ikole-main-approach').geometry.coordinates[0],entry.geometry.coordinates.at(-1));
  const center:[number,number]=[5.4957,7.805],gate=projectPosition(source.entrance.position,center),angle=source.entrance.bearing*Math.PI/180;
  const local=(p:[number,number])=>{const q=projectPosition(p,center);return {x:(q.x-gate.x)*Math.cos(angle)+(q.z-gate.z)*Math.sin(angle),z:(q.x-gate.x)*Math.sin(angle)-(q.z-gate.z)*Math.cos(angle)};};
  for(const [lane,x]of [[entry,0],[exit,14]] as const)for(const p of lane.geometry.coordinates.map(local).filter((p:any)=>Math.abs(p.z)<=25.01))assert.ok(Math.abs(p.x-x)<.002,'Lane must run through its own arch');
  let distance=Infinity;const start=projectPosition(feature('local/ikole-highway-approach').geometry.coordinates[0],center);
  for(const f of data.features.filter((f:any)=>f.properties.tags.highway==='primary')) {
    const points=f.geometry.coordinates.map((p:[number,number])=>projectPosition(p,center));
    for(let i=1;i<points.length;i++){const q=nearestPoint(start,points[i-1],points[i]);distance=Math.min(distance,Math.hypot(q.x-start.x,q.z-start.z));}
  }
  assert.ok(distance<.001,'Highway approach must connect without a grass gap');
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
    // Check both complete branches, including split/merge bends, with car clearance.
    for(const id of ['local/ikole-gate-entry','local/ikole-gate-exit']) {
      const points=data.features.find((f:any)=>f.id===id).geometry.coordinates.map((p:[number,number])=>projectPosition(p,ikoleCampus.center));
      for(let i=1;i<points.length;i++) {
        const a=points[i-1],b=points[i],length=Math.hypot(b.x-a.x,b.z-a.z);
        for(let t=0;t<=length;t+=.5) {
          const p={x:a.x+(b.x-a.x)*t/length,z:a.z+(b.z-a.z)*t/length};
          for(const side of [-.8,0,.8]){const q={x:p.x-(b.z-a.z)/length*side,z:p.z+(b.x-a.x)/length*side};assert.equal(world.blocked(q,1.15),false,id+' must have car clearance at '+JSON.stringify(q));}
          assert.ok(world.roads.some((r:any)=>{const q=nearestPoint(p,r.a,r.b);return Math.hypot(q.x-p.x,q.z-p.z)<r.width/2;}),'Both routes need real road surfaces');
        }
      }
    }
    // A visually closed leaf must fail even if collision bounds were omitted.
    world.root.updateMatrixWorld(true);
    for(const lane of [0,14])for(const lateral of [-1,0,1]) {
      const x=gate.x+Math.cos(angle)*(lane+lateral)-Math.sin(angle)*6,z=gate.z+Math.sin(angle)*(lane+lateral)+Math.cos(angle)*6;
      const ray=new Raycaster(new Vector3(x,world.entrance.position.y+1.6,z),new Vector3(Math.sin(angle),0,-Math.cos(angle)),0,12);
      assert.equal(ray.intersectObject(world.root,true).length,0,'Both arches must be visually open at car height');
    }
    // Check the actual rendered asphalt, not just logical road segments.
    for(const lane of [0,14])for(const t of [-20,-10,0,10,20])for(const side of [-1,0,1]) {
      const x=gate.x+Math.cos(angle)*(lane+side)+Math.sin(angle)*t,z=gate.z+Math.sin(angle)*(lane+side)-Math.cos(angle)*t;
      const ray=new Raycaster(new Vector3(x,world.height(x,z)+2,z),new Vector3(0,-1,0),0,4);
      const hit=ray.intersectObject(world.root,true)[0];assert.ok(hit,'Road mesh must exist under both arches');
      assert.equal((hit.object as any).material,world.materials.asphalt,'Asphalt must be the visible ground surface in both lanes');
    }
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
    const roadMeshes=world.root.children.filter((mesh:any)=>mesh.material===world.materials.asphalt);assert.ok(roadMeshes.length);
    for(const mesh of roadMeshes){const positions=mesh.geometry.attributes.position;for(let i=0;i<positions.count;i++)assert.ok(Math.abs(positions.getY(i)-world.height(positions.getX(i),positions.getZ(i))-.38)<.002,'Asphalt must stay above the terrain at every triangle vertex');}
    const pitch=world.root.getObjectByName('ikole-football-pitch');assert.ok(pitch,'Grass pitch should be built');
    const vertices=pitch.geometry.attributes.position,uv=pitch.geometry.attributes.uv;
    assert.equal(uv.count,vertices.count);
    for(let i=0;i<vertices.count;i++) {
      assert.ok(Math.abs(vertices.getY(i)-world.height(vertices.getX(i),vertices.getZ(i))-.08)<.002,'Pitch must follow the terrain without sinking or floating');
      assert.ok(Number.isFinite(uv.getX(i)+uv.getY(i)));
    }
    let textureDisposed=false;pitch.material.map.addEventListener('dispose',()=>{textureDisposed=true;});
    assert.ok(world.root.children.length>0);world.dispose();assert.equal(textureDisposed,true,'Campus switch must release the pitch texture');assert.equal(world.root.children.length,0);world=undefined;
  } finally {
    world?.dispose();await server.close();if(previous)Object.defineProperty(globalThis,'document',previous);else Reflect.deleteProperty(globalThis,'document');
  }
});
