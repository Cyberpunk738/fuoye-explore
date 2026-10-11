import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseDelivery, formatTime, startCourier, tickCourier } from '../src/world/courier.ts';
import { stepCar, stepJump } from '../src/world/motion.ts';

const stops=[{id:'a',name:'A',x:0,z:0},{id:'b',name:'B',x:200,z:0},{id:'c',name:'C',x:400,z:0}];
test('courier picks a distant reachable stop and avoids consecutive duplicates',()=>{
  assert.equal(chooseDelivery(stops,{x:0,z:0},undefined,()=>0)?.id,'b');
  assert.notEqual(chooseDelivery(stops,stops[1],'b',()=>0)?.id,'b');
  assert.equal(chooseDelivery([],stops[0]),undefined);
});
test('courier delivery requires slowing inside the ring; adds score, time and a different stop',()=>{
  const run=startCourier(stops,stops[0],()=>0);
  const fast=tickCourier(run,1,stops[1],9,stops,()=>0);
  assert.equal(fast.tooFast,true);assert.equal(fast.run.deliveries,0);
  const outside=tickCourier(run,1,{x:193,z:0},0,stops,()=>0);
  assert.equal(outside.delivered,undefined);
  const delivered=tickCourier(run,1,stops[1],0,stops,()=>0);
  assert.equal(delivered.run.deliveries,1);assert.equal(delivered.run.score,248);
  assert.ok(delivered.run.remaining>run.remaining);assert.notEqual(delivered.run.target?.id,'b');
});
test('expiry cannot score a late delivery; empty courses and completed games remain stable',()=>{
  const run={...startCourier(stops,stops[0],()=>0),remaining:.1};
  const result=tickCourier(run,.2,stops[1],0,stops);
  assert.equal(result.run.over,true);assert.equal(result.run.score,0);
  assert.equal(tickCourier(result.run,1,stops[1],0,stops).run,result.run);
  assert.equal(startCourier([],stops[0]).over,true);
  assert.equal(formatTime(75),'1:15');assert.equal(formatTime(-1),'0:00');
});
test('new car physics supports reverse, lower off-road speed and handbrake lateral slip',()=>{
  const input={forward:true,back:false,left:false,right:false,brake:false};
  let road={speed:0,lateral:0,yaw:0},grass={...road};
  for(let i=0;i<240;i++){road=stepCar(road,input,.05,true);grass=stepCar(grass,input,.05,false);}
  assert.ok(road.speed>grass.speed);assert.ok(road.speed<=28);assert.ok(grass.speed<=14);
  const turning={...input,left:true};
  const grip=stepCar(road,turning,.05,true),drift=stepCar(road,{...turning,brake:true},.05,true);
  assert.ok(Math.abs(drift.lateral)>Math.abs(grip.lateral));
  const reverse=stepCar({speed:0,lateral:0,yaw:0},{...input,forward:false,back:true},.05,true);
  assert.ok(reverse.speed<0);
});
test('jump is bounded and lands without sinking below the terrain',()=>{
  let state=stepJump(0,0,true,.04),peak=state.height;
  assert.ok(state.height>0);
  for(let i=0;i<80;i++){state=stepJump(state.height,state.velocity,false,.04);peak=Math.max(peak,state.height);assert.ok(state.height>=0);}
  assert.ok(peak>.4&&peak<1);assert.deepEqual(state,{height:0,velocity:0});
});
