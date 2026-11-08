import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadCampusJson,requireCampusFeatures} from '../src/campuses/data.ts';
import type {Dataset} from '../src/data.ts';

test('an old Ikole dataset cannot mount new gate scenery without its roads',()=>{
  const current=JSON.parse(readFileSync(new URL('../public/data/ikole/campus.geojson',import.meta.url),'utf8')) as Dataset;
  const required=['local/ikole-gate-entry','local/ikole-gate-exit'];
  assert.doesNotThrow(()=>requireCampusFeatures(current,required));
  const stale={...current,features:current.features.filter(f=>f.id!=='local/ikole-gate-exit')};
  assert.throws(()=>requireCampusFeatures(stale,required),/out of date/);
});

test('campus loading avoids cached JSON and preserves cancellation and load errors',async()=>{
  const original=globalThis.fetch,controller=new AbortController();
  try {
    globalThis.fetch=async(_url,options)=>{assert.equal(options?.cache,'no-store');assert.equal(options?.signal,controller.signal);return new Response('{"ok":true}');};
    assert.deepEqual(await loadCampusJson('/data/ikole/campus.geojson',controller.signal),{ok:true});
    globalThis.fetch=async()=>new Response('',{status:404});
    await assert.rejects(loadCampusJson('/missing',controller.signal),/Could not load/);
    controller.abort();globalThis.fetch=async(_url,options)=>{options?.signal?.throwIfAborted();return new Response('{}');};
    await assert.rejects(loadCampusJson('/data/ikole/campus.geojson',controller.signal),{name:'AbortError'});
  } finally {globalThis.fetch=original;}
});
