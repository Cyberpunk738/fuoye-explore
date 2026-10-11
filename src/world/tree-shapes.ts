import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Shared silhouettes, not species identifications. Detail is chosen per grove. */
export function broadleafCrown(detailed:boolean) {
  const lobes=detailed?[
    [0,1.85,0,1.1,.9,1.05],[-.85,1.55,.15,.9,.67,.92],
    [.75,1.62,.35,.97,.7,.85],[.15,1.5,-.8,.92,.7,.9],[-.2,2.35,-.1,.8,.65,.78]
  ]:[[0,1.8,0,1.65,1.05,1.55]];
  const pieces=lobes.map(([x,y,z,sx,sy,sz])=>{
    const g=new THREE.IcosahedronGeometry(1,0),p=g.attributes.position,n=g.attributes.normal,colors:number[]=[];
    for(let i=0;i<p.count;i++){
      // Smooth individual lobes, retaining their asymmetrical outline.
      const normal=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).normalize();n.setXYZ(i,normal.x,normal.y,normal.z);
      const light=.72+(p.getY(i)+1)*.14;colors.push(light*.95,light,light*.87);
    }
    g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.scale(sx,sy,sz);g.translate(x,y,z);return g;
  });
  const crown=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());return crown;
}

export function broadleafWood(){
  const pieces:THREE.BufferGeometry[]=[];
  const branch=(a:THREE.Vector3,b:THREE.Vector3,r:number)=>{const direction=b.clone().sub(a),g=new THREE.CylinderGeometry(r*.55,r,direction.length(),4);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());pieces.push(g);};
  branch(new THREE.Vector3(),new THREE.Vector3(.04,1.8,0),.12);
  branch(new THREE.Vector3(0,1,0),new THREE.Vector3(-.85,1.7,.15),.065);
  branch(new THREE.Vector3(.02,1.25,0),new THREE.Vector3(.85,1.8,.25),.055);
  const wood=mergeGeometries(pieces)!;pieces.forEach(g=>g.dispose());return wood;
}
