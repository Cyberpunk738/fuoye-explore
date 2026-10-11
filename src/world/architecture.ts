import * as THREE from 'three';
import type { Point } from './math';

/** A bounded mesh for an irregular footprint. Subdivision shares the same height
 * function across triangle edges, preserving courtyards and avoiding roof boxes
 * spanning the empty corner of L/U-shaped buildings. */
export function drapedPolygon(rings:Point[][],height:(x:number,z:number)=>number,step=6,maxDepth=5,uniform=false) {
  const vectors=rings.map(r=>r.map(p=>new THREE.Vector2(p.x,p.z)));
  const vertices=rings.flat(), triangles=THREE.ShapeUtils.triangulateShape(vectors[0],vectors.slice(1));
  const positions:number[]=[];
  const midpoint=(a:Point,b:Point)=>({x:(a.x+b.x)/2,z:(a.z+b.z)/2});
  const emit=(a:Point,b:Point,c:Point,depth:number)=>{
    const longest=Math.max(Math.hypot(a.x-b.x,a.z-b.z),Math.hypot(b.x-c.x,b.z-c.z),Math.hypot(c.x-a.x,c.z-a.z));
    if(depth<maxDepth&&(uniform||longest>step)){const ab=midpoint(a,b),bc=midpoint(b,c),ca=midpoint(c,a);emit(a,ab,ca,depth+1);emit(ab,b,bc,depth+1);emit(ca,bc,c,depth+1);emit(ab,bc,ca,depth+1);return;}
    // Clockwise in x/z has an upward normal in the y-up world.
    if((b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x)>0)[b,c]=[c,b];
    for(const p of [a,b,c])positions.push(p.x,height(p.x,p.z),p.z);
  };
  triangles.forEach(([a,b,c])=>emit(vertices[a],vertices[b],vertices[c],0));
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return geometry;
}

export function compoundRoof(rings:Point[][],eave:number,rise=4,pitch=.5) {
  const edges=rings.flatMap(r=>r.map((a,i)=>[a,r[(i+1)%r.length]]));
  const geometry=drapedPolygon(rings,(x,z)=>{
    let distance=Infinity;
    for(const [a,b] of edges){const dx=b.x-a.x,dz=b.z-a.z,length=dx*dx+dz*dz,t=length?THREE.MathUtils.clamp(((x-a.x)*dx+(z-a.z)*dz)/length,0,1):0;distance=Math.min(distance,Math.hypot(x-a.x-dx*t,z-a.z-dz*t));}
    return distance;
  },5,3,true);
  const positions=geometry.attributes.position;let deepest=0;for(let i=0;i<positions.count;i++)deepest=Math.max(deepest,positions.getY(i));
  const scale=deepest>0?Math.min(pitch,rise/deepest):0;for(let i=0;i<positions.count;i++)positions.setY(i,eave+positions.getY(i)*scale);geometry.computeVertexNormals();return geometry;
}

/** Clip a ground patch to the exact terrain triangles. Unlike an independently
 * subdivided overlay this cannot cut into the DEM or leave cracks at T-junctions. */
export function groundPolygon(rings:Point[][],height:(x:number,z:number)=>number,origin:Point,cell:Point,steps:number) {
  const vectors=rings.map(r=>r.map(p=>new THREE.Vector2(p.x,p.z))),vertices=rings.flat();
  const triangles=THREE.ShapeUtils.triangulateShape(vectors[0],vectors.slice(1)),positions:number[]=[];
  const side=(p:Point,a:Point,b:Point)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
  function clip(subject:Point[],boundary:Point[]){let result=subject;for(let i=0;i<boundary.length;i++){const input=result;result=[];const a=boundary[i],b=boundary[(i+1)%boundary.length];if(!input.length)break;let prev=input[input.length-1],dp=side(prev,a,b);for(const current of input){const dc=side(current,a,b);if((dc>=-1e-8)!==(dp>=-1e-8)){const t=dp/(dp-dc);result.push({x:prev.x+(current.x-prev.x)*t,z:prev.z+(current.z-prev.z)*t});}if(dc>=-1e-8)result.push(current);prev=current;dp=dc;}}return result;}
  for(const indexes of triangles){const triangle=indexes.map(i=>vertices[i]);const xs=triangle.map(p=>p.x),zs=triangle.map(p=>p.z);const x0=Math.max(0,Math.floor((Math.min(...xs)-origin.x)/cell.x)),x1=Math.min(steps-1,Math.floor((Math.max(...xs)-origin.x)/cell.x)),z0=Math.max(0,Math.floor((Math.min(...zs)-origin.z)/cell.z)),z1=Math.min(steps-1,Math.floor((Math.max(...zs)-origin.z)/cell.z));
    for(let row=z0;row<=z1;row++)for(let col=x0;col<=x1;col++){const a={x:origin.x+col*cell.x,z:origin.z+row*cell.z},b={x:a.x+cell.x,z:a.z},c={x:a.x+cell.x,z:a.z+cell.z},d={x:a.x,z:a.z+cell.z};for(const terrain of [[a,b,d],[b,c,d]]){const poly=clip(triangle,terrain);for(let i=1;i<poly.length-1;i++){const pts=[poly[0],poly[i],poly[i+1]];if(side(pts[2],pts[0],pts[1])>0)[pts[1],pts[2]]=[pts[2],pts[1]];for(const p of pts)positions.push(p.x,height(p.x,p.z),p.z);}}}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return geometry;
}
