import test from 'node:test';
import assert from 'node:assert/strict';
import { createCampusSession } from '../src/campuses/session.ts';
import { campusFromSearch } from '../src/campuses/registry.ts';

function deferred<T>() {
  let resolve!:(value:T)=>void,reject!:(error:Error)=>void;
  const promise=new Promise<T>((yes,no)=>{resolve=yes;reject=no;});
  return {promise,resolve,reject};
}

test('rapid campus switching ignores stale data and aborts the superseded request',async()=>{
  const loads=new Map<string,ReturnType<typeof deferred<string>>>(),signals=new Map<string,AbortSignal>(),mounted:string[]=[],destroyed:string[]=[];
  const session=createCampusSession((id,signal)=>{signals.set(id,signal);const pending=deferred<string>();loads.set(id,pending);return pending.promise;},(id)=>{mounted.push(id);return {destroy(){destroyed.push(id);}};});
  const oye=session.select('oye'),ikole=session.select('ikole');
  assert.equal(signals.get('oye')!.aborted,true);
  loads.get('oye')!.resolve('old data');assert.equal(await oye,false);assert.deepEqual(mounted,[]);
  loads.get('ikole')!.resolve('new data');assert.equal(await ikole,true);assert.deepEqual(mounted,['ikole']);
  session.dispose();assert.deepEqual(destroyed,['ikole']);
});

test('the previous scene is released before another campus loads, and obsolete asynchronous mounts are disposed',async()=>{
  const slow=deferred<{destroy():void}>(),events:string[]=[];
  const session=createCampusSession(async id=>{events.push('load '+id);return id;},id=>{
    events.push('mount '+id);
    return id==='slow'?slow.promise:{destroy(){events.push('destroy '+id);}};
  });
  await session.select('oye');
  const pending=session.select('slow');
  await Promise.resolve();await Promise.resolve();
  assert.ok(events.indexOf('destroy oye')<events.indexOf('load slow'));
  await session.select('ikole');
  slow.resolve({destroy(){events.push('destroy slow');}});
  assert.equal(await pending,false);
  assert.ok(events.includes('destroy slow'));
  assert.equal(events.includes('destroy ikole'),false);
  session.dispose();assert.equal(events.filter(e=>e==='destroy ikole').length,1);
});

test('leaving during loading prevents a scene from mounting and current errors remain retryable',async()=>{
  const pending=deferred<string>();let mounts=0;
  const session=createCampusSession(()=>pending.promise,()=>{mounts++;return {destroy(){}};});
  const selected=session.select('ikole');session.dispose();pending.resolve('data');
  assert.equal(await selected,false);assert.equal(mounts,0);assert.equal(await session.select('oye'),false);
  let attempts=0;
  const retry=createCampusSession(async()=>{if(++attempts===1)throw new Error('Missing data');return 'ready';},()=>({destroy(){}}));
  await assert.rejects(retry.select('ikole'),/Missing data/);assert.equal(await retry.select('ikole'),true);retry.dispose();
});

test('campus links select Ikole explicitly and unknown parameters fall back to Oye',()=>{
  assert.equal(campusFromSearch('?campus=ikole'),'ikole');
  assert.equal(campusFromSearch('?campus=oye'),'oye');
  assert.equal(campusFromSearch('?campus=unknown'),'oye');
  assert.equal(campusFromSearch(''),'oye');
});
