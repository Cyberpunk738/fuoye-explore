import * as THREE from 'three';
import type { Feature, Position } from '../data';
import type { Point } from './math';
import { projectPosition, pointInRing, randomFrom } from './math';
import type { GeometryBatch } from './batch';
import type { Materials } from './materials';

/** Planting extents follow the saved satellite view; kerbs/species are estimates.
 * See research/phase1-visual-pass.md. Keep the actual loop and approaches clear. */
export function addPhaseOnePlanting(features:Feature[],center:Position,batch:GeometryBatch,m:Materials,height:(x:number,z:number)=>number,clear:(p:Point)=>boolean){
  const trees:Point[]=[],rng=randomFrom(51011);
  const lawns=features.filter(f=>f.geometry.type==='Polygon'&&/^local\/phase1-(south-lawn|east-garden|north-verge)$/.test(f.id));
  const sphere=new THREE.IcosahedronGeometry(1,1);
  for(const f of lawns){
    if(f.geometry.type!=='Polygon')continue;
    const ring=f.geometry.coordinates[0].slice(0,-1).map(p=>projectPosition(p,center));
    // Modest edging and low planting only on the two garden patches, not the tree verge.
    if(f.id.endsWith('north-verge'))continue;
    for(let edge=0;edge<ring.length;edge++){
      const a=ring[edge],b=ring[(edge+1)%ring.length],dx=b.x-a.x,dz=b.z-a.z,length=Math.hypot(dx,dz),steps=Math.ceil(length/2.5),angle=-Math.atan2(dz,dx);
      for(let i=0;i<steps;i++){
        const t=(i+.5)/steps,p={x:a.x+dx*t,z:a.z+dz*t};if(!clear(p))continue;
        batch.box(length/steps+.03,.15,.18,p.x,height(p.x,p.z)+.17,p.z,m.base,angle);
        // Broken low hedge runs leave approach gaps rather than fencing the lawn.
        if(edge%2!==0||i%9===0)continue;
        let nx=-dz/length,nz=dx/length;if(!pointInRing({x:p.x+nx,z:p.z+nz},ring)){nx=-nx;nz=-nz;}
        const q={x:p.x+nx*.7,z:p.z+nz*.7};if(!clear(q))continue;
        for(const shift of [-.55,.45]){const x=q.x+dx/length*shift,z=q.z+dz/length*shift,g=sphere.clone();g.scale(.8,.35+rng()*.12,.68);g.rotateY(rng()*Math.PI);g.translate(x,height(x,z)+.36,z);batch.add(g,m.leaves[edge%3]);}
      }
    }
  }
  sphere.dispose();
  // Approximate canopy row visible immediately south of the main road.
  for(let i=0;i<11;i++){
    const p=projectPosition([5.32155+i*.000077,7.780345+Math.sin(i)*.000009],center);
    if(clear(p))trees.push(p);
  }
  // Scattered crowns visible inside the southern lawn, not decorative flower beds.
  for(const p of [[5.32204,7.77972],[5.32229,7.77964],[5.32220,7.77947]] as Position[]){const q=projectPosition(p,center);if(clear(q))trees.push(q);}
  return {trees,lawns:lawns.length};
}
