import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { nearestPoint, pointInRing, projectPosition, randomFrom, sampleElevation, unprojectPosition } from '../src/world/math.ts';
import type { TerrainGrid } from '../src/world/math.ts';
test('metre projection round-trips Oye coordinates and preserves north',()=>{const center:[number,number]=[5.3144,7.777];const location:[number,number]=[5.315,7.778];const p=projectPosition(location,center);assert.ok(p.x>0&&p.z<0);const result=unprojectPosition(p,center);assert.ok(Math.abs(result[0]-location[0])<1e-10&&Math.abs(result[1]-location[1])<1e-10);});
test('elevation uses north-first bilinear samples and clamps edges',()=>{const grid:TerrainGrid={bbox:[0,0,1,1],width:2,height:2,values:[100,120,140,160],metadata:{source:'fixture',attribution:'',notes:''}};assert.equal(sampleElevation(grid,.5,.5),130);assert.equal(sampleElevation(grid,0,1),100);assert.equal(sampleElevation(grid,-3,4),100);assert.equal(sampleElevation(grid,4,-3),160);assert.equal(sampleElevation(undefined,.5,.5),0);});
test('collision polygons preserve concave open space and nearest roads handle degenerate segments',()=>{const ring=[{x:0,z:0},{x:4,z:0},{x:4,z:1},{x:1,z:1},{x:1,z:4},{x:0,z:4}];assert.equal(pointInRing({x:.5,z:3},ring),true);assert.equal(pointInRing({x:3,z:3},ring),false);assert.deepEqual(nearestPoint({x:4,z:4},{x:0,z:0},{x:10,z:0}),{x:4,z:0});assert.deepEqual(nearestPoint({x:4,z:4},{x:2,z:2},{x:2,z:2}),{x:2,z:2});});
test('downloaded terrain is complete, finite and explicitly attributed',()=>{const grid=JSON.parse(fs.readFileSync(new URL('../public/data/terrain.json',import.meta.url),'utf8'))as TerrainGrid;assert.equal(grid.values.length,grid.width*grid.height);assert.ok(grid.values.every(h=>Number.isFinite(h)&&h>400&&h<700));assert.ok(grid.bbox[0]<5.314&&grid.bbox[2]>5.314);assert.ok(grid.metadata.attribution.includes('Geological Survey'));});
test('scene dressing is deterministic across revisits',()=>{const a=randomFrom(137),b=randomFrom(137);assert.deepEqual(Array.from({length:20},a),Array.from({length:20},b));});

test('roads clip to the terrain domain, including segments with both endpoints outside', async()=>{const {clipSegment}=await import('../src/world/math.ts');assert.deepEqual(clipSegment({x:-10,z:5},{x:20,z:5},{x:0,z:0},{x:10,z:10}),[{x:0,z:5},{x:10,z:5}]);assert.equal(clipSegment({x:-10,z:-5},{x:20,z:-5},{x:0,z:0},{x:10,z:10}),undefined);});

test('walking keeps diagonal speed constant and follows the camera coordinate system',async()=>{const {walkingStep}=await import('../src/world/navigation.ts');const forward={forward:true,back:false,left:false,right:false};const straight=walkingStep(0,forward,1);assert.ok(Math.abs(straight.z-2.8)<1e-9);const diagonal=walkingStep(0,{...forward,right:true},1);assert.ok(Math.abs(Math.hypot(diagonal.x,diagonal.z)-2.8)<1e-9);assert.ok(diagonal.x<0);assert.ok(walkingStep(Math.PI/2,forward,1).x>2.79);});
test('driving accelerates within limits, brakes and reverses safely',async()=>{const {vehicleStep}=await import('../src/world/navigation.ts');let speed=0,yaw=0;const idle={forward:false,back:false,left:false,right:false};for(let i=0;i<600;i++){const result=vehicleStep(speed,yaw,{...idle,forward:true},1/60);speed=result.speed;yaw=result.yaw;assert.ok(speed>=0&&speed<=17);}assert.equal(speed,17);for(let i=0;i<60;i++)speed=vehicleStep(speed,yaw,{...idle,brake:true},1/60).speed;assert.ok(speed<.1);for(let i=0;i<180;i++)speed=vehicleStep(speed,yaw,{...idle,back:true},1/60).speed;assert.ok(speed<0&&speed>=-5);});


test('land-cover extract is attributed, complete and covers the campus terrain domain',()=>{
  const cover=JSON.parse(fs.readFileSync(new URL('../public/data/landcover.json',import.meta.url),'utf8'));
  const terrain=JSON.parse(fs.readFileSync(new URL('../public/data/terrain.json',import.meta.url),'utf8'));
  assert.equal(cover.values.length,cover.width*cover.height);
  assert.ok(cover.values.every((v:number)=>[10,20,30,40,50,60,70,80,90,95,100].includes(v)));
  assert.equal(cover.metadata.year,2021);assert.equal(cover.metadata.license,'CC BY 4.0');
  assert.ok(cover.metadata.notes.includes('not a current'));
  assert.ok(cover.bbox[0]<=terrain.bbox[0]+.0001&&cover.bbox[1]<=terrain.bbox[1]+.0001);
  assert.ok(cover.bbox[2]>=terrain.bbox[2]-.0001&&cover.bbox[3]>=terrain.bbox[3]-.0001);
});
