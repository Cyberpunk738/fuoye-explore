import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Shared silhouettes, not species identifications. Detail is chosen per grove. */
export function broadleafCrown(detailed:boolean) {
  const lobes=detailed?[
    [0,1.92,0,1.15,.92,1.1],[-.88,1.58,.18,.94,.68,.94],
    [.78,1.64,.36,.98,.72,.88],[.16,1.52,-.82,.94,.72,.92],[-.18,2.42,-.08,.84,.68,.82]
  ]:[[0,1.8,0,1.65,1.05,1.55]];
  const pieces=lobes.map(([x,y,z,sx,sy,sz])=>{
    const g=new THREE.IcosahedronGeometry(1,0),p=g.attributes.position,n=g.attributes.normal,colors:number[]=[];
    for(let i=0;i<p.count;i++){
      // Smooth individual lobes, retaining their asymmetrical outline.
      const normal=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);
      const light=.68+(p.getY(i)+1)*.16;colors.push(light*.94,light,light*.85);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.scale(sx,sy,sz);g.translate(x,y,z);return g;
  });
  const crown=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());return crown;
}

/** Low-slung multi-lobe shrub and bush cluster geometry with ground-hugging ambient shading. */
export function bushCrown(detailed:boolean) {
  const lobes=detailed?[
    [0,.44,0,.86,.5,.82],[-.56,.33,.2,.64,.39,.58],[.52,.36,-.18,.66,.41,.6]
  ]:[[0,.42,0,1.12,.48,1.04]];
  const pieces=lobes.map(([x,y,z,sx,sy,sz])=>{
    const g=new THREE.IcosahedronGeometry(1,0),p=g.attributes.position,n=g.attributes.normal,colors:number[]=[];
    for(let i=0;i<p.count;i++){
      const normal=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);
      const light=.62+(p.getY(i)+1)*.19;colors.push(light*.96,light,light*.82);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.scale(sx,sy,sz);g.translate(x,y,z);return g;
  });
  const bush=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());return bush;
}

export function broadleafWood(){
  const pieces:THREE.BufferGeometry[]=[];
  const branch=(a:THREE.Vector3,b:THREE.Vector3,r:number)=>{const direction=b.clone().sub(a),g=new THREE.CylinderGeometry(r*.55,r,direction.length(),4);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());pieces.push(g);};
  branch(new THREE.Vector3(),new THREE.Vector3(.04,1.8,0),.12);
  branch(new THREE.Vector3(0,1,0),new THREE.Vector3(-.85,1.7,.15),.065);
  branch(new THREE.Vector3(.02,1.25,0),new THREE.Vector3(.85,1.8,.25),.055);
  const wood=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());return wood;
}
