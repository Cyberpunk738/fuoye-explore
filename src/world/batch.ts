import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
export class GeometryBatch {
  bins=new Map<THREE.Material,THREE.BufferGeometry[]>();
  add(g:THREE.BufferGeometry,m:THREE.Material) {
    const normalized=g.index?g.toNonIndexed():g;if(normalized!==g)g.dispose();
    if(!normalized.attributes.normal)normalized.computeVertexNormals();
    const p=normalized.attributes.position,n=normalized.attributes.normal, uv=[];const scale=m.userData.uvScale??4;
    for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));if(ny>nx&&ny>nz)uv.push(p.getX(i)/scale,p.getZ(i)/scale);else if(nx>nz)uv.push(p.getZ(i)/scale,p.getY(i)/scale);else uv.push(p.getX(i)/scale,p.getY(i)/scale);}
    if(!m.userData.preserveUV||!normalized.attributes.uv)normalized.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));const list=this.bins.get(m)??[];list.push(normalized);this.bins.set(m,list);
  }
  box(w:number,h:number,d:number,x:number,y:number,z:number,m:THREE.Material,angle=0){const g=new THREE.BoxGeometry(w,h,d);g.rotateY(angle);g.translate(x,y,z);this.add(g,m);}
  cylinder(r1:number,r2:number,h:number,x:number,y:number,z:number,m:THREE.Material,segments=8){const g=new THREE.CylinderGeometry(r1,r2,h,segments);g.translate(x,y,z);this.add(g,m);}
  finish(root:THREE.Object3D){for(const [material,geometries]of this.bins){const g=mergeGeometries(geometries);geometries.forEach(g=>g.dispose());if(!g)throw new Error('Could not assemble scene geometry.');const mesh=new THREE.Mesh(g,material);mesh.castShadow=true;mesh.receiveShadow=Boolean(material.userData.groundReceiver);root.add(mesh);}this.bins.clear();}
}
