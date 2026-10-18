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

  // Phase 2 Gate divided boulevard: avenue trees along outer verges and low median shrubs.
  const bushes:Point[]=[];
  for(let i=0;i<16;i++){
    const t=i/15;
    // Median ornamental shrubs between the western and eastern carriageways
    const medLon=5.31499+t*(5.31586-5.31499),medLat=7.77918+t*(7.78222-7.77918);
    const mp=projectPosition([medLon,medLat],center);
    if(clear(mp))bushes.push(mp);
    if(i%2===0){
      // Outer boulevard avenue shade trees (west and east verges)
      const westVerge=projectPosition([medLon-0.00012,medLat+0.00003],center);
      const eastVerge=projectPosition([medLon+0.00013,medLat-0.00003],center);
      if(clear(westVerge))trees.push(westVerge);
      if(clear(eastVerge))trees.push(eastVerge);
    }else{
      const westBush=projectPosition([medLon-0.00010,medLat+0.00002],center);
      const eastBush=projectPosition([medLon+0.00011,medLat-0.00002],center);
      if(clear(westBush))bushes.push(westBush);
      if(clear(eastBush))bushes.push(eastBush);
    }
  }
  // Framing shade trees and shrubs around Senate, Central Admin, and Faculty of Law approaches
  for(const pos of [
    [5.31342,7.77948],[5.31398,7.77948],[5.31432,7.77892],[5.31482,7.77892],
    [5.31502,7.78122],[5.31508,7.78168],[5.31545,7.77962],[5.31552,7.78012],
    [5.31618,7.77582],[5.31655,7.77582],[5.31462,7.77745],[5.31515,7.77742]
  ] as Position[]){
    const q=projectPosition(pos,center);if(clear(q))trees.push(q);
  }
  for(const pos of [
    [5.31355,7.77952],[5.31385,7.77952],[5.31445,7.77888],[5.31468,7.77888],
    [5.31496,7.78135],[5.31499,7.78158],[5.31542,7.77975],[5.31546,7.78002],
    [5.32145,7.78048],[5.32175,7.78049],[5.32205,7.78051]
  ] as Position[]){
    const q=projectPosition(pos,center);if(clear(q))bushes.push(q);
  }
  return {trees,bushes,lawns:lawns.length};
}
