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

/** Partition near-orthogonal footprints into overlapping rectangular wings.
 * Each wing has four planar hip faces, clipped back to the original outline.
 * The depth buffer resolves intersecting roof planes into valleys; no roof spans
 * a courtyard. Non-orthogonal footprints retain the bounded general fallback. */
export function sectionedRoof(rings:Point[][],eave:number,rise=4):THREE.BufferGeometry {
  const outer=rings[0];let longest=0,ux=1,uz=0;
  outer.forEach((a,i)=>{const b=outer[(i+1)%outer.length],dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz);if(l>longest){longest=l;ux=dx/l;uz=dz/l;}});
  const origin=outer[0],local=rings.map(r=>r.map(p=>({x:(p.x-origin.x)*ux+(p.z-origin.z)*uz,z:-(p.x-origin.x)*uz+(p.z-origin.z)*ux})));
  const fallback=()=>compoundRoof(rings,eave,rise);
  if(local.some(r=>r.some((a,i)=>{const b=r[(i+1)%r.length],dx=Math.abs(b.x-a.x),dz=Math.abs(b.z-a.z);return Math.hypot(dx,dz)>1&&Math.min(dx,dz)>Math.hypot(dx,dz)*.12;})))return fallback();
  const cluster=(values:number[])=>{values.sort((a,b)=>a-b);const groups:number[][]=[];for(const v of values){const group=groups.at(-1);if(group&&v-group[0]<.6)group.push(v);else groups.push([v]);}return groups.map(g=>g.reduce((a,b)=>a+b,0)/g.length);};
  const xs=cluster(local.flat().map(p=>p.x)),zs=cluster(local.flat().map(p=>p.z));
  if(xs.length>24||zs.length>24||xs.length<2||zs.length<2)return fallback();
  const inside=(p:Point,r:Point[])=>{let hit=false;for(let i=0,j=r.length-1;i<r.length;j=i++){const a=r[i],b=r[j];if((a.z>p.z)!==(b.z>p.z)&&p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)hit=!hit;}return hit;};
  const width=xs.length-1,depth=zs.length-1,solid:boolean[]=[],covered:boolean[]=[];
  for(let row=0;row<depth;row++)for(let col=0;col<width;col++){const p={x:(xs[col]+xs[col+1])/2,z:(zs[row]+zs[row+1])/2};solid.push(inside(p,local[0])&&!local.slice(1).some(r=>inside(p,r)));covered.push(false);}
  type Rect={left:number;right:number;top:number;bottom:number;cells:number[]};const choices:Rect[]=[];
  for(let top=0;top<depth;top++){const active=Array(width).fill(true);for(let bottom=top;bottom<depth;bottom++){for(let col=0;col<width;col++)active[col]&&=solid[bottom*width+col];for(let left=0;left<width;){if(!active[left]){left++;continue;}let right=left+1;while(right<width&&active[right])right++;const cells=[];for(let row=top;row<=bottom;row++)for(let col=left;col<right;col++)cells.push(row*width+col);choices.push({left,right,top,bottom:bottom+1,cells});left=right;}}}
  const cellArea=(index:number)=>{const row=Math.floor(index/width),col=index%width;return (xs[col+1]-xs[col])*(zs[row+1]-zs[row]);};
  const sections:Rect[]=[];
  while(solid.some((value,i)=>value&&!covered[i])&&sections.length<12){let best:Rect|undefined,score=0;for(const rect of choices){const value=rect.cells.reduce((sum,index)=>sum+(covered[index]?0:cellArea(index)),0);if(value>score){score=value;best=rect;}}if(!best)break;sections.push(best);best.cells.forEach(i=>covered[i]=true);}
  if(!sections.length||solid.some((value,i)=>value&&!covered[i]))return fallback();
  const vertices=local.flat(),indices=THREE.ShapeUtils.triangulateShape(local[0].map(p=>new THREE.Vector2(p.x,p.z)),local.slice(1).map(r=>r.map(p=>new THREE.Vector2(p.x,p.z))));
  const cross=(a:Point,b:Point,c:Point)=>(b.x-a.x)*(c.z-a.z)-(b.z-a.z)*(c.x-a.x);
  const clip=(subject:Point[],boundary:Point[])=>{if(cross(boundary[0],boundary[1],boundary[2])<0)boundary=[...boundary].reverse();let result=subject;for(let i=0;i<boundary.length;i++){const input=result;result=[];if(!input.length)break;const a=boundary[i],b=boundary[(i+1)%boundary.length];let prev=input.at(-1)!,dp=cross(a,b,prev);for(const curr of input){const dc=cross(a,b,curr);if((dc>=-1e-7)!==(dp>=-1e-7)){const t=dp/(dp-dc);result.push({x:prev.x+(curr.x-prev.x)*t,z:prev.z+(curr.z-prev.z)*t});}if(dc>=-1e-7)result.push(curr);prev=curr;dp=dc;}}return result;};
  const positions:number[]=[];
  for(const rect of sections){const left=xs[rect.left]-.6,right=xs[rect.right]+.6,top=zs[rect.top]-.6,bottom=zs[rect.bottom]+.6,cx=(left+right)/2,cz=(top+bottom)/2,wide=right-left>=bottom-top,w=wide?right-left:bottom-top,d=wide?bottom-top:right-left;
    const point=(x:number,z:number,y:number)=>({x:cx+(wide?x:z),z:cz+(wide?z:x),y});
    const h=Math.min(rise,d*.24),inset=Math.min(w,d)/2,a=point(-w/2,-d/2,eave),b=point(w/2,-d/2,eave),c=point(w/2,d/2,eave),d0=point(-w/2,d/2,eave),r1=point(-w/2+inset,0,eave+h),r2=point(w/2-inset,0,eave+h);
    for(const face of [[a,b,r2,r1],[b,c,r2],[c,d0,r1,r2],[d0,a,r1]]){const fa=face[0],fb=face[1],fc=face[2],det=cross(fa,fb,fc);if(Math.abs(det)<1e-8)continue;
      const height=(p:Point)=>fa.y+((fb.y-fa.y)*((p.x-fa.x)*(fc.z-fa.z)-(p.z-fa.z)*(fc.x-fa.x))+(fc.y-fa.y)*((fb.x-fa.x)*(p.z-fa.z)-(fb.z-fa.z)*(p.x-fa.x)))/det;
      for(const tri of indices){const clipped=clip(face,tri.map(i=>vertices[i]));for(let i=1;i<clipped.length-1;i++){const pts=[clipped[0],clipped[i],clipped[i+1]];if(Math.abs(cross(...pts as [Point,Point,Point]))<1e-6)continue;if(cross(...pts as [Point,Point,Point])>0)[pts[1],pts[2]]=[pts[2],pts[1]];for(const p of pts)positions.push(origin.x+p.x*ux-p.z*uz,height(p),origin.z+p.x*uz+p.z*ux);}}
    }
  }
  if(!positions.length)return fallback();
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();geometry.userData.sections=sections.length;return geometry;
}
