import * as THREE from 'three';
import type { Position } from '../data';
import type { Point } from './math';
import { projectPosition, randomFrom } from './math';
import type { Materials } from './materials';
import { broadleafCrown, broadleafWood } from './tree-shapes';

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

export function buildVegetation(cover:LandCover|undefined,center:Position,height:(x:number,z:number)=>number,reserved:(p:Point)=>boolean,m:Materials,planted:Point[]=[]) {
  const root=new THREE.Group(),rng=randomFrom(91273),trunks:Point[]=[];
  if(!cover)return {root,trunks,count:0,updateDetail:(_camera:THREE.Vector3)=>false};
  const [west,south,east,north]=cover.bbox;
  const candidates:Point[]=[];
  // The raster establishes tree-cover areas, not surveyed individual trees.
  for(let row=0;row<cover.height;row+=2)for(let col=0;col<cover.width;col+=2){
    if(cover.values[row*cover.width+col]!==10)continue;
    const lon=west+(col+.2+rng()*.6)/cover.width*(east-west),lat=north-(row+.2+rng()*.6)/cover.height*(north-south);
    const p=projectPosition([lon,lat],center);
    if(!reserved(p))candidates.push(p);
  }
  // Spread a bounded sample across the full area rather than filling one corner.
  for(let i=candidates.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[candidates[i],candidates[j]]=[candidates[j],candidates[i]];}
  // 480m cells bound full-view draw calls while retaining spatial culling nearby.
  const points=[...planted,...candidates.slice(0,Math.max(0,3200-planted.length))],clusters=new Map<string,Point[]>();
  for(const p of points){const key=`${Math.floor(p.x/480)},${Math.floor(p.z/480)}`;const group=clusters.get(key)??[];group.push(p);clusters.set(key,group);}
  const crown=broadleafCrown(false),nearCrown=broadleafCrown(true),nearTrunk=broadleafWood();
  const trunk=new THREE.CylinderGeometry(.07,.12,1.5,3);trunk.translate(0,.75,0);
  m.leaves[1].vertexColors=true;
  const groves:{leaves:THREE.InstancedMesh;wood:THREE.InstancedMesh;center:THREE.Vector3;count:number}[]=[];
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
  for(const group of clusters.values()){
    const palms:Point[]=[],broadleaf:Point[]=[];group.forEach(p=>(!planted.includes(p)&&rng()<.12?palms:broadleaf).push(p));
    for(const [points,isPalm] of [[broadleaf,false],[palms,true]] as [Point[],boolean][]){
      if(!points.length)continue;
      const leaves=new THREE.InstancedMesh(isPalm?palmCrown:crown,isPalm?m.palmLeaves[1]:m.leaves[1],points.length),wood:THREE.InstancedMesh=new THREE.InstancedMesh(isPalm?palmTrunk:trunk,m.wood,points.length);
      points.forEach((p,i)=>{
        const scale=isPalm?3.1+rng()*1.4:3.2+rng()*2.1,y=height(p.x,p.z);
        dummy.position.set(p.x,y,p.z);dummy.rotation.y=rng()*Math.PI*2;dummy.scale.set(scale,scale*(.9+rng()*.3),scale);dummy.updateMatrix();
        leaves.setMatrixAt(i,dummy.matrix);wood.setMatrixAt(i,dummy.matrix);
        leaves.setColorAt(i,color.setHSL(.23+rng()*.075,.16+rng()*.22,.75+rng()*.22));trunks.push(p);
      });
      leaves.castShadow=true;wood.castShadow=true;
      leaves.computeBoundingSphere();wood.computeBoundingSphere();root.add(leaves,wood);if(!isPalm){leaves.geometry=nearCrown;leaves.computeBoundingSphere();wood.geometry=nearTrunk;wood.computeBoundingSphere();leaves.geometry=crown;wood.geometry=trunk;groves.push({leaves,wood,center:leaves.boundingSphere!.center.clone(),count:points.length});}
    }
  }
  root.userData.sharedGeometries=[crown,nearCrown,trunk,nearTrunk,palmCrown,palmTrunk];
  let lastCamera=new THREE.Vector3(Infinity,Infinity,Infinity);
  function updateDetail(camera:THREE.Vector3){
    if(lastCamera.distanceToSquared(camera)<25)return false;lastCamera.copy(camera);let budget=480,changed=false;
    for(const grove of [...groves].sort((a,b)=>a.center.distanceToSquared(camera)-b.center.distanceToSquared(camera))){
      const close=grove.center.distanceTo(camera)<380&&camera.y-height(camera.x,camera.z)<110&&grove.count<=budget;
      const next=close?nearCrown:crown;changed ||= grove.leaves.geometry!==next;grove.leaves.geometry=next;grove.wood.geometry=close?nearTrunk:trunk;if(close)budget-=grove.count;
    }
    root.userData.detailedTrees=480-budget;return changed;
  }
  return {root,trunks,count:points.length,updateDetail};
}
