import * as THREE from 'three';
import type { Position } from '../data';
import type { Point } from './math';
import { projectPosition, randomFrom } from './math';
import type { Materials } from './materials';
import { broadleafCrown, broadleafWood, bushCrown } from './tree-shapes';

export interface LandCover {
  bbox: [number,number,number,number]; width:number; height:number; values:number[];
  metadata:{ source:string; license:string; year:number; notes:string };
}
export function sampleCover(cover:LandCover|undefined,lon:number,lat:number) {
  if(!cover)return 30;
  const [w,s,e,n]=cover.bbox;
  if(lon<w||lon>e||lat<s||lat>n)return 30;
  const x=Math.min(cover.width-1,Math.floor((lon-w)/(e-w)*cover.width));
  const y=Math.min(cover.height-1,Math.floor((n-lat)/(n-s)*cover.height));
  return cover.values[y*cover.width+x]??30;
}

export function buildVegetation(
  cover:LandCover|undefined,
  center:Position,
  height:(x:number,z:number)=>number,
  reserved:(p:Point)=>boolean,
  m:Materials,
  planted:Point[]=[],
  plantedBushes:Point[]=[],
  buildingDistance?:(p:Point)=>number,
  roadDistance?:(p:Point)=>number
) {
  const root=new THREE.Group(),rng=randomFrom(91273),trunks:Point[]=[];
  if(!cover)return {root,trunks,count:0,updateDetail:(_camera:THREE.Vector3)=>false};
  const [west,south,east,north]=cover.bbox;
  const treeCandidates:Point[]=[],bushCandidates:Point[]=[];
  // Separate the campus into cleared academic precincts, bush/scrub transition zones, and outer woodland groves.
  for(let row=0;row<cover.height;row+=2)for(let col=0;col<cover.width;col+=2){
    const val=cover.values[row*cover.width+col];
    if(val!==10&&val!==20&&val!==30&&val!==40)continue;
    const lon=west+(col+.18+rng()*.64)/cover.width*(east-west),lat=north-(row+.18+rng()*.64)/cover.height*(north-south);
    const p=projectPosition([lon,lat],center);
    if(reserved(p))continue;
    const bDist=buildingDistance?buildingDistance(p):120;
    const rDist=roadDistance?roadDistance(p):120;
    // Smooth spatial grove wave clumps woodland trees naturally and leaves open bush/grass glades between groves.
    const groveWave=Math.sin(p.x*.026+p.z*.017)*Math.cos(p.z*.029-p.x*.015)+Math.sin((p.x-p.z)*.011)*.45;

    if(bDist<28){
      // Zone 1: Cleared Campus Core — keep sightlines open around buildings; only place low verge/compound shrubs.
      if(bDist>9&&(rDist<14||rng()<.28)){
        bushCandidates.push(p);
      }
    }else if(bDist<72||rDist<15||val!==10){
      // Zone 2: Scrub & Bushland Transition (between Phase 1, Phase 2, and Phase 3, and along roads).
      if(val===10&&groveWave>.38&&rDist>8&&rng()<.34){
        treeCandidates.push(p);
      }else if(rng()<.78){
        bushCandidates.push(p);
        // Spawn a tight 2–3 shrub thicket around the bush point for organic scrub patches.
        const thicketCount=1+Math.floor(rng()*2);
        for(let k=0;k<thicketCount;k++){
          const angle=rng()*Math.PI*2,dist=2.2+rng()*3.2;
          const q={x:p.x+Math.cos(angle)*dist,z:p.z+Math.sin(angle)*dist};
          if(!reserved(q))bushCandidates.push(q);
        }
      }
    }else{
      // Zone 3: Outer Perimeter Woodland & Valleys — clumped forest groves with bushland borders.
      if(groveWave>-.22){
        treeCandidates.push(p);
        if(groveWave>.45&&rng()<.35){
          const angle=rng()*Math.PI*2,dist=4.5+rng()*4.5;
          const q={x:p.x+Math.cos(angle)*dist,z:p.z+Math.sin(angle)*dist};
          if(!reserved(q))treeCandidates.push(q);
        }
      }else if(rng()<.65){
        bushCandidates.push(p);
      }
    }
  }
  for(let i=treeCandidates.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[treeCandidates[i],treeCandidates[j]]=[treeCandidates[j],treeCandidates[i]];}
  for(let i=bushCandidates.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[bushCandidates[i],bushCandidates[j]]=[bushCandidates[j],bushCandidates[i]];}

  // 480m cells bound full-view draw calls while retaining spatial culling nearby.
  const plantedSet=new Set(planted);
  const points=[...planted,...treeCandidates.slice(0,Math.max(0,1900-planted.length))],clusters=new Map<string,Point[]>();
  for(const p of points){const key=`${Math.floor(p.x/480)},${Math.floor(p.z/480)}`;const group=clusters.get(key)??[];group.push(p);clusters.set(key,group);}
  const bushPoints=[...plantedBushes,...bushCandidates.slice(0,Math.max(0,1300-plantedBushes.length))],bushClusters=new Map<string,Point[]>();
  for(const p of bushPoints){const key=`${Math.floor(p.x/1400)},${Math.floor(p.z/1400)}`;const group=bushClusters.get(key)??[];group.push(p);bushClusters.set(key,group);}

  const crown=broadleafCrown(false),nearCrown=broadleafCrown(true),nearTrunk=broadleafWood();
  const bushLow=bushCrown(false),bushHigh=bushCrown(true);
  const trunk=new THREE.CylinderGeometry(.07,.12,1.5,3);trunk.translate(0,.75,0);
  m.leaves[0].vertexColors=true;
  m.leaves[1].vertexColors=true;
  const groves:{leaves:THREE.InstancedMesh;wood:THREE.InstancedMesh;center:THREE.Vector3;count:number}[]=[];
  const bushGroves:{mesh:THREE.InstancedMesh;center:THREE.Vector3}[]=[];
  const palmTrunk=new THREE.CylinderGeometry(.065,.1,2.7,4);palmTrunk.translate(0,1.35,0);
  const palmPositions:number[]=[],palmUV:number[]=[];
  for(let leaf=0;leaf<7;leaf++){
    const angle=leaf*Math.PI*2/7,c=Math.cos(angle),s=Math.sin(angle);
    const row=[{r:0,y:2.7,w:.08},{r:.95,y:3.05,w:.4},{r:1.85,y:2.45,w:.12}];
    const vertex=(i:number,side:number)=>{const p=row[i];return [c*p.r-s*p.w*side,p.y,s*p.r+c*p.w*side];};
    for(let j=0;j<2;j++){palmPositions.push(...vertex(j,-1),...vertex(j+1,-1),...vertex(j+1,1),...vertex(j,-1),...vertex(j+1,1),...vertex(j,1));palmUV.push(0,j/2,0,(j+1)/2,1,(j+1)/2,0,j/2,1,(j+1)/2,1,j/2);}
  }
  const palmCrown=new THREE.BufferGeometry();palmCrown.setAttribute('position',new THREE.Float32BufferAttribute(palmPositions,3));palmCrown.setAttribute('uv',new THREE.Float32BufferAttribute(palmUV,2));palmCrown.computeVertexNormals();
  const dummy=new THREE.Object3D(),color=new THREE.Color();
  const allPalms:Point[]=[];
  for(const group of clusters.values()){
    const broadleaf:Point[]=[];group.forEach(p=>(!plantedSet.has(p)&&rng()<.13?allPalms:broadleaf).push(p));
    if(!broadleaf.length)continue;
    const leaves=new THREE.InstancedMesh(crown,m.leaves[1],broadleaf.length),wood:THREE.InstancedMesh=new THREE.InstancedMesh(trunk,m.wood,broadleaf.length);
    broadleaf.forEach((p,i)=>{
      const isAvenue=plantedSet.has(p);
      const bDist=buildingDistance?buildingDistance(p):100;
      const scale=isAvenue?3.3+rng()*.85:bDist<70?2.6+rng()*1.45:3.1+rng()*2.3,y=height(p.x,p.z);
      dummy.position.set(p.x,y,p.z);dummy.rotation.y=rng()*Math.PI*2;dummy.scale.set(scale*(.92+rng()*.18),scale*(.88+rng()*.28),scale*(.92+rng()*.18));dummy.updateMatrix();
      leaves.setMatrixAt(i,dummy.matrix);wood.setMatrixAt(i,dummy.matrix);
      leaves.setColorAt(i,color.setHSL(.22+rng()*.085,.18+rng()*.24,.72+rng()*.23));trunks.push(p);
    });
    leaves.castShadow=true;wood.castShadow=true;
    leaves.computeBoundingSphere();wood.computeBoundingSphere();root.add(leaves,wood);
    leaves.geometry=nearCrown;leaves.computeBoundingSphere();wood.geometry=nearTrunk;wood.computeBoundingSphere();leaves.geometry=crown;wood.geometry=trunk;
    groves.push({leaves,wood,center:leaves.boundingSphere!.center.clone(),count:broadleaf.length});
  }
  if(allPalms.length){
    const leaves=new THREE.InstancedMesh(palmCrown,m.palmLeaves[1],allPalms.length),wood:THREE.InstancedMesh=new THREE.InstancedMesh(palmTrunk,m.wood,allPalms.length);
    allPalms.forEach((p,i)=>{
      const scale=3.1+rng()*1.4,y=height(p.x,p.z);
      dummy.position.set(p.x,y,p.z);dummy.rotation.y=rng()*Math.PI*2;dummy.scale.set(scale,scale*(.9+rng()*.3),scale);dummy.updateMatrix();
      leaves.setMatrixAt(i,dummy.matrix);wood.setMatrixAt(i,dummy.matrix);
      leaves.setColorAt(i,color.setHSL(.23+rng()*.075,.16+rng()*.22,.75+rng()*.22));trunks.push(p);
    });
    leaves.castShadow=true;wood.castShadow=true;
    leaves.computeBoundingSphere();wood.computeBoundingSphere();root.add(leaves,wood);
  }
  // Low-slung bush and scrub layer: grouped into large spatial cells for minimal draw calls.
  const plantedBushSet=new Set(plantedBushes);
  for(const group of bushClusters.values()){
    if(!group.length)continue;
    const mesh=new THREE.InstancedMesh(bushLow,m.leaves[0],group.length);
    group.forEach((p,i)=>{
      const isOrnamental=plantedBushSet.has(p);
      const sx=isOrnamental?1.15+rng()*.45:1.35+rng()*1.65;
      const sy=isOrnamental?.85+rng()*.35:.75+rng()*1.05;
      const sz=isOrnamental?1.15+rng()*.45:1.3+rng()*1.6;
      const y=height(p.x,p.z);
      dummy.position.set(p.x,y-.04,p.z);dummy.rotation.y=rng()*Math.PI*2;dummy.scale.set(sx,sy,sz);dummy.updateMatrix();
      mesh.setMatrixAt(i,dummy.matrix);
      // Varied olive, sage, and warm guinea-savanna scrub tints distinguish bushes from tall tree crowns.
      const hue=isOrnamental?.26+rng()*.05:.20+rng()*.095;
      const sat=isOrnamental?.24+rng()*.16:.16+rng()*.24;
      const lum=isOrnamental?.74+rng()*.16:.68+rng()*.24;
      mesh.setColorAt(i,color.setHSL(hue,sat,lum));
    });
    mesh.castShadow=true;mesh.receiveShadow=true;
    mesh.computeBoundingSphere();root.add(mesh);
    mesh.geometry=bushHigh;mesh.computeBoundingSphere();mesh.geometry=bushLow;
    bushGroves.push({mesh,center:mesh.boundingSphere!.center.clone()});
  }
  root.userData.sharedGeometries=[crown,nearCrown,trunk,nearTrunk,palmCrown,palmTrunk,bushLow,bushHigh];
  let lastCamera=new THREE.Vector3(Infinity,Infinity,Infinity);
  function updateDetail(camera:THREE.Vector3){
    if(lastCamera.distanceToSquared(camera)<25)return false;lastCamera.copy(camera);let budget=480,changed=false;
    const camHeight=camera.y-height(camera.x,camera.z);
    for(const grove of [...groves].sort((a,b)=>a.center.distanceToSquared(camera)-b.center.distanceToSquared(camera))){
      const close=grove.center.distanceTo(camera)<380&&camHeight<110&&grove.count<=budget;
      const next=close?nearCrown:crown;changed ||= grove.leaves.geometry!==next;grove.leaves.geometry=next;grove.wood.geometry=close?nearTrunk:trunk;if(close)budget-=grove.count;
    }
    for(const bg of bushGroves){
      const close=bg.center.distanceTo(camera)<340&&camHeight<110;
      const next=close?bushHigh:bushLow;changed ||= bg.mesh.geometry!==next;bg.mesh.geometry=next;
    }
    root.userData.detailedTrees=480-budget;return changed;
  }
  return {root,trunks,count:points.length+bushPoints.length,updateDetail};
}
