import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {compoundRoof,groundPolygon} from '../src/world/architecture.ts';
import {pointInRing} from '../src/world/math.ts';
const read=(p:string)=>JSON.parse(readFileSync(new URL(p,import.meta.url),'utf8'));

test('campus inventory has unique source-backed identities and exactly one primary per compound',()=>{
 const data=read('../public/data/campus.geojson'),inventory=read('../research/oye-campus-inventory.json');
 const byId=new Map(data.features.map((f:any)=>[f.id,f]));assert.equal(byId.size,data.features.length);
 assert.ok(readFileSync(new URL('../public/data/campus.geojson',import.meta.url)).byteLength<200000);
 for(const place of inventory.places){assert.match(place.source,/^https:\/\/www.google.com\/maps\//);let primary=0;for(const id of place.featureIds){const f:any=byId.get(id);assert.ok(f,`${place.name}: ${id}`);assert.equal(f.properties.campus.id,place.id);assert.equal(f.properties.campus.primaryId,place.featureIds[0]);if(f.properties.campus.directory)primary++;}assert.equal(primary,1,place.name);}
 for(const f of data.features){if(f.properties.source==='observation'){assert.match(f.id,/^local\//);assert.ok(f.properties.evidence&&f.properties.accuracy);assert.ok(f.properties.sources[0].startsWith('https://www.google.com/maps/'));}if(f.properties.kind==='building'){const [lon,lat]=f.properties.center;assert.ok(lon>5.30&&lon<5.325&&lat>7.77&&lat<7.7835);}}
 assert.ok(inventory.places.some((p:any)=>p.phase===1));
 assert.ok(inventory.places.some((p:any)=>p.id==='faculty-of-law'&&p.phase===2));
 assert.ok(inventory.places.some((p:any)=>p.id==='chapel-of-transformation'&&p.phase===2));
 assert.ok(inventory.places.some((p:any)=>p.id==='science-lab'&&p.phase===2));
 assert.ok(!inventory.places.some((p:any)=>/Ikole|Tourism|ICT|Library/i.test(p.name)));
});

test('compound roofs preserve a courtyard, keep boundary elevations and have a bounded mesh',()=>{
 const outer=[{x:0,z:0},{x:30,z:0},{x:30,z:30},{x:0,z:30}],hole=[{x:10,z:10},{x:10,z:20},{x:20,z:20},{x:20,z:10}];
 const g=compoundRoof([outer,hole],8,4),p=g.attributes.position;let area=0;const heights=new Map<string,number>();
 assert.ok(p.count/3<3000);
 for(let i=0;i<p.count;i++){const x=p.getX(i),y=p.getY(i),z=p.getZ(i);assert.ok(Number.isFinite(x+y+z));assert.ok(y>=8-1e-5&&y<=12+1e-5);const key=`${x.toFixed(5)},${z.toFixed(5)}`;if(heights.has(key))assert.ok(Math.abs(heights.get(key)!-y)<1e-5);heights.set(key,y);if(x===0||x===30||z===0||z===30)assert.equal(y,8);}
 for(let i=0;i<p.count;i+=3){const c={x:(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z:(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3};assert.ok(!pointInRing(c,hole));area+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getZ(i+2)-p.getZ(i))-(p.getZ(i+1)-p.getZ(i))*(p.getX(i+2)-p.getX(i)))/2;}
 assert.ok(Math.abs(area-800)<.01);g.dispose();
});

test('ground clipping follows each terrain plane through a sloping diagonal without gaps',()=>{
 const ring=[{x:.2,z:.2},{x:1.8,z:.2},{x:1.8,z:1.8},{x:.2,z:1.8}];
 const h=(x:number,z:number)=>{const ix=Math.min(1,Math.floor(x)),iz=Math.min(1,Math.floor(z)),fx=x-ix,fz=z-iz;const a=ix*iz,b=(ix+1)*iz,c=(ix+1)*(iz+1),d=ix*(iz+1);return .07+(fx+fz<=1?a+(b-a)*fx+(d-a)*fz:c+(d-c)*(1-fx)+(b-c)*(1-fz));};
 const g=groundPolygon([ring],h,{x:0,z:0},{x:1,z:1},2),p=g.attributes.position;let area=0;
 for(let i=0;i<p.count;i+=3){const cx=(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,cz=(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3,cy=(p.getY(i)+p.getY(i+1)+p.getY(i+2))/3;assert.ok(Math.abs(cy-h(cx,cz))<1e-5);area+=Math.abs((p.getX(i+1)-p.getX(i))*(p.getZ(i+2)-p.getZ(i))-(p.getZ(i+1)-p.getZ(i))*(p.getX(i+2)-p.getX(i)))/2;}
 assert.ok(Math.abs(area-2.56)<1e-5);g.dispose();
});

test('review overlay preserves IDs and observations without mutating either dataset',async()=>{
 const {mergeCampusDataset,featureSource,validateNotes}=await import('../src/data.ts');
 const area=read('../public/data/oye.geojson'),campus=read('../public/data/campus.geojson'),before=area.features.length;
 const merged=mergeCampusDataset(area,campus);assert.equal(new Set(merged.features.map(f=>f.id)).size,merged.features.length);assert.equal(area.features.length,before);
 const senate=merged.features.find(f=>f.id==='local/senate')!;assert.equal(senate.properties.tags.name,'New Senate Building');assert.equal(featureSource(senate).name,'Visual satellite observation');assert.ok(!featureSource(senate).url.includes('openstreetmap.org/local'));
 assert.ok(merged.features.find(f=>f.id==='ms/1b77ae9be7b6829b')?.properties.campus);
 const notes={'local/senate':{name:'Senate note',status:'candidate' as const,evidence:'Inspecting source',updatedAt:'2026-10-11'}};assert.deepEqual(validateNotes(notes),notes);
});

test('planar roof wings cover an L-shaped footprint without spanning its empty corner',async()=>{
 const {sectionedRoof}=await import('../src/world/architecture.ts');
 const ring=[{x:0,z:0},{x:30,z:0},{x:30,z:10},{x:10,z:10},{x:10,z:30},{x:0,z:30}],g=sectionedRoof([ring],7.2,4),p=g.attributes.position;
 assert.ok(g.userData.sections>=2);assert.ok(p.count/3<200);
 for(let i=0;i<p.count;i+=3){const center={x:(p.getX(i)+p.getX(i+1)+p.getX(i+2))/3,z:(p.getZ(i)+p.getZ(i+1)+p.getZ(i+2))/3};assert.ok(pointInRing(center,ring));for(let j=0;j<3;j++)assert.ok(p.getY(i+j)>=7.2-1e-5&&p.getY(i+j)<=11.2+1e-5);}
 // A regular sample must meet at least one roof triangle everywhere inside the L.
 for(let x=.5;x<30;x+=2)for(let z=.5;z<30;z+=2){const q={x,z};if(!pointInRing(q,ring))continue;let covered=false;for(let i=0;i<p.count;i+=3){const tri=[0,1,2].map(j=>({x:p.getX(i+j),z:p.getZ(i+j)}));if(pointInRing(q,tri)){covered=true;break;}}assert.ok(covered,`Missing roof at ${x},${z}`);}
 g.dispose();
});
