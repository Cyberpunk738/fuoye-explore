import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import type { Materials } from './materials';
export function makeVehicle(m:Materials,color=1){
  const group=new THREE.Group();
  const part=(g:THREE.BufferGeometry,material:THREE.Material,x:number,y:number,z:number)=>{const mesh=new THREE.Mesh(g,material);mesh.position.set(x,y,z);mesh.castShadow=true;group.add(mesh);return mesh;};
  part(new RoundedBoxGeometry(1.8,.65,4.1,2,.12),m.carPaint[color%m.carPaint.length],0,.75,0);
  part(new RoundedBoxGeometry(1.55,.6,2.05,2,.08),m.glass,0,1.35,-.15);
  part(new THREE.BoxGeometry(1.6,.1,1.55),m.carPaint[color%m.carPaint.length],0,1.69,-.15);
  for(const s of[-1,1])for(const f of[-1,1]){const wheel=part(new THREE.CylinderGeometry(.34,.34,.2,12),m.rubber,s*.9,.4,f*1.25);wheel.rotation.z=Math.PI/2;const hub=part(new THREE.CylinderGeometry(.18,.18,.215,10),m.white,s*.9,.4,f*1.25);hub.rotation.z=Math.PI/2;}
  for(const s of[-1,1]){part(new THREE.BoxGeometry(.28,.16,.1),m.glow,s*.55,.8,2.08);part(new THREE.BoxGeometry(.3,.16,.08),m.tail,s*.55,.8,-2.08);}
  part(new THREE.BoxGeometry(.55,.18,.06),m.white,0,.63,-2.09);
  part(new THREE.BoxGeometry(1.65,.1,.12),m.steel,0,.43,-2.09);
  return group;
}
export function makeWalker(m:Materials){const g=new THREE.Group();const body=new THREE.Mesh(new THREE.CylinderGeometry(.2,.23,.7,8),m.people[1]);body.position.y=1;g.add(body);const head=new THREE.Mesh(new THREE.SphereGeometry(.15,8,6),m.skin);head.position.y=1.54;g.add(head);const legs:THREE.Mesh[]=[];for(const s of[-1,1]){const leg=new THREE.Mesh(new THREE.BoxGeometry(.13,.65,.16),m.steel);leg.position.set(s*.13,.35,0);g.add(leg);legs.push(leg);}return {group:g,legs};}
