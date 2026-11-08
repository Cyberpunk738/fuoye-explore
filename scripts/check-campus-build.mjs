import {readFileSync,readdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),dir=new URL('dist/assets/campus-data/',root);
const files=readdirSync(dir),chunks=readdirSync(new URL('dist/assets/',root)).filter(f=>f.endsWith('.js')).map(f=>readFileSync(new URL('dist/assets/'+f,root),'utf8')).join('\n');
for(const source of ['campus.geojson','terrain.json','landcover.json','ikole/campus.geojson','ikole/terrain.json','ikole/landcover.json']) {
  const stem=source.replaceAll('/','-').replace(/\.[^.]+$/,'');
  const emitted=files.find(f=>f.startsWith(stem+'-')&&/[-][a-f0-9]{16}\./.test(f));
  assert.ok(emitted,'Missing build-addressed data: '+source);
  assert.deepEqual(readFileSync(new URL(emitted,dir)),readFileSync(new URL('public/data/'+source,root)),'Built map must match current source');
  assert.ok(chunks.includes('/assets/campus-data/'+emitted),'App must request the emitted asset, not the old public JSON URL');
}
const ikole=files.find(f=>/^ikole-campus-[a-f0-9]{16}\.geojson$/.test(f));
const data=JSON.parse(readFileSync(new URL(ikole,dir),'utf8'));
for(const id of ['local/ikole-gate-entry','local/ikole-gate-exit'])assert.ok(data.features.some(f=>f.id===id),'Built data needs both gate roads');
console.log('Verified all six content-addressed campus assets, bundle references and both Ikole gate roads.');
