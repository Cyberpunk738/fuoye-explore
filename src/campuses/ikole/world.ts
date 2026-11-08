import * as THREE from 'three';
import type { Position } from '../../data';
import type { WorldProfile, CampusWorldContext } from '../../world/profile';

export const ikoleGate: Position = [5.496065, 7.801126];
const gateBearing = 22 * Math.PI / 180;

/** Independent Ikole scenery; dimensions not visible in imagery are estimates. */
export const ikoleWorldProfile: WorldProfile = {
  focusPlaceId: 'ikole-engineering',
  appearance: feature => ({
    facade: feature.properties.campus?.appearance?.facade,
    roof: feature.properties.campus?.appearance?.roof ?? 'green',
  }),
  grade({project,rawHeight,buildingHeight}) {
    const gate = project(ikoleGate), level = rawHeight(gate.x,gate.z);
    return (x,z) => {
      const blend = 1-THREE.MathUtils.smoothstep(Math.hypot(x-gate.x,z-gate.z),18,38);
      const ground=buildingHeight(x,z);
      return ground+(level-ground)*blend;
    };
  },
  signs: [
    {key:'ikole-gate',lines:['FEDERAL UNIVERSITY OYE-EKITI'],footer:'IKOLE CAMPUS',background:'#174838',color:'#fff7de',stretch:1.5},
    {key:'ikole-engineering-monument',lines:['FACULTY OF ENGINEERING'],background:'#80bfb0',color:'#174b36',stretch:2},
    {key:'ikole-sports',lines:['IKOLE SPORTS GROUND'],footer:'CAMPUS EXPLORER',background:'#174838',color:'#fff7de'},
  ],
  decorate(context) {
    const {batch,m,project,height,structureBounds,signs}=context;
    const gate=project(ikoleGate), y=height(gate.x,gate.z);
    const right={x:Math.cos(gateBearing),z:Math.sin(gateBearing)};
    const forward={x:Math.sin(gateBearing),z:-Math.cos(gateBearing)};
    const local=(x:number,z:number)=>({x:gate.x+right.x*x+forward.x*z,z:gate.z+right.z*x+forward.z*z});
    const box=(w:number,h:number,d:number,x:number,yy:number,z:number,material:THREE.Material)=>{
      const p=local(x,z);batch.box(w,h,d,p.x,y+yy,p.z,material,-gateBearing);
    };
    const reserve=(x:number,z:number,w:number,d:number)=>{
      const p=local(x,z),a=Math.abs(Math.cos(gateBearing)),b=Math.abs(Math.sin(gateBearing));
      structureBounds.push(new THREE.Box2(new THREE.Vector2(p.x-(w*a+d*b)/2,p.z-(w*b+d*a)/2),new THREE.Vector2(p.x+(w*a+d*b)/2,p.z+(w*b+d*a)/2)));
    };
    // Satellite-observed roof wings flank an open roadway. Elevations and sign
    // lettering are illustrative; this does not reuse Oye's ceremonial arch.
    for (const side of [-1,1]) {
      box(7,3.1,4.8,side*10,1.55,0,m.ivory);
      box(7.7,.16,5.5,side*10,3.2,0,m.roofs[1]);
      const vertex=(x:number,yy:number,z:number)=>{const p=local(side*10+x,z);return [p.x,y+yy,p.z];};
      const frontA=vertex(-3.85,3.28,-2.75),frontB=vertex(3.85,3.28,-2.75),backA=vertex(-3.85,3.28,2.75),backB=vertex(3.85,3.28,2.75),ridgeA=vertex(-3.85,4.05,0),ridgeB=vertex(3.85,4.05,0);
      const roof=new THREE.BufferGeometry();roof.setAttribute('position',new THREE.Float32BufferAttribute([...frontA,...frontB,...ridgeB,...frontA,...ridgeB,...ridgeA,...backB,...backA,...ridgeA,...backB,...ridgeA,...ridgeB],3));roof.computeVertexNormals();batch.add(roof,m.roofs[1]);
      box(2.4,1.1,.08,side*10,1.95,-2.43,m.windows);
      reserve(side*10,0,7,4.8);
      for(const edge of [-1,1])box(.35,3.55,.35,side*10+edge*3.3,1.775,-2.35,m.white);
      box(11,1.35,.45,side*19,.675,0,m.ivory);
      reserve(side*19,0,11,.45);
    }
    // A slender sign frame leaves the observed entry lane fully passable.
    for (const side of [-1,1]) {box(.4,5,.4,side*6.15,2.5,0,m.green);reserve(side*6.15,0,.45,.45);}
    box(12.7,.75,.45,0,4.75,0,m.green);
    const label=local(0,-.25);
    signs.add(batch,'ikole-gate',11.8,.72,new THREE.Vector3(label.x,y+4.75,label.z),-gateBearing);
    const approach=local(0,-24);
    addEngineeringLandmark(context);
    addSportsGround(context);
    return {
      entrance:{position:new THREE.Vector3(gate.x,y,gate.z),approach:new THREE.Vector3(approach.x,height(approach.x,approach.z),approach.z)},
      reserved:p=>structureBounds.some(b=>b.distanceToPoint(new THREE.Vector2(p.x,p.z))<5),
      people:0,parkingLots:0,
    };
  },
  plant:()=>({trees:[],bushes:[]}),
};

function addEngineeringLandmark({root,batch,m,buildings,height,nearestRoad,onRoad,structureBounds,signs}:CampusWorldContext) {
  const building=buildings.find(b=>b.placeId==='ikole-engineering');
  if(!building)return;
  const entry=building.entrance,normal=new THREE.Vector2(entry.x-building.position.x,entry.z-building.position.z).normalize();
  const tangent=new THREE.Vector2(normal.y,-normal.x),angle=Math.atan2(normal.x,normal.y);
  // Tall white frontage columns follow the reviewed Engineering photograph.
  for(let i=0;i<7;i++) {
    const p=new THREE.Vector2(entry.x,entry.z).addScaledVector(tangent,(i-3)*2.5);
    batch.box(.45,6.7,.6,p.x,building.position.y+3.35,p.y,m.white,angle);
  }
  let p=new THREE.Vector2(entry.x,entry.z).addScaledVector(normal,9).addScaledVector(tangent,9);
  if(onRoad({x:p.x,z:p.y},3))p.addScaledVector(tangent,10);
  const road=nearestRoad({x:p.x,z:p.y});
  if(road.point&&Math.hypot(p.x-road.point.x,p.y-road.point.z)<5)p.addScaledVector(normal,-6);
  const y=height(p.x,p.y),group=new THREE.Group();group.position.set(p.x,y,p.y);group.rotation.y=angle;
  const teal=new THREE.MeshLambertMaterial({color:'#82bfb1'}),gold=new THREE.MeshLambertMaterial({color:'#e9b83e'});
  teal.userData.ownedMaterial=gold.userData.ownedMaterial=true;
  const plinth=new THREE.Mesh(new THREE.BoxGeometry(8,1.6,1.6),teal);plinth.position.y=.8;group.add(plinth);
  const gear=new THREE.Shape();
  for(let i=0;i<48;i++) {
    const a=i/48*Math.PI*2,r=i%4===0||i%4===3?2.55:3.1;
    const x=Math.cos(a)*r,y=Math.sin(a)*r;
    if(i===0)gear.moveTo(x,y);else gear.lineTo(x,y);
  }
  gear.closePath();const hole=new THREE.Path();hole.absarc(0,0,1.45,0,Math.PI*2,true);gear.holes.push(hole);
  const wheel=new THREE.Mesh(new THREE.ExtrudeGeometry(gear,{depth:.4,bevelEnabled:false}),gold);wheel.position.set(-1,4.55,0);group.add(wheel);
  // Open-ended spanner silhouette, not a downloaded photo or mesh.
  const wrench=new THREE.Shape();
  const points=[[-.25,-2.2],[-.55,-2.35],[-.95,-2.05],[-1,-1.45],[-.65,-1.05],[-.55,-1.7],[.05,-1.85],[.5,-1.35],[.65,-1.7],[.55,-2.3],[.25,-2.5],[.25,1.65],[.65,1.8],[.95,2.4],[.7,2.9],[.45,2.35],[-.15,2.2],[-.55,2.75],[-.85,2.4],[-.8,1.85],[-.25,1.55]];
  points.forEach(([x,y],i)=>i?wrench.lineTo(x,y):wrench.moveTo(x,y));wrench.closePath();
  const spanner=new THREE.Mesh(new THREE.ExtrudeGeometry(wrench,{depth:.45,bevelEnabled:false}),teal);spanner.position.set(2.3,4.35,.25);spanner.rotation.z=.35;group.add(spanner);
  root.add(group);
  const face=new THREE.Vector3(0,.9,.82).applyAxisAngle(new THREE.Vector3(0,1,0),angle).add(new THREE.Vector3(p.x,y,p.y));
  signs.add(batch,'ikole-engineering-monument',7.3,1.05,face,angle);
  structureBounds.push(new THREE.Box2(new THREE.Vector2(p.x-4.5,p.y-4.5),new THREE.Vector2(p.x+4.5,p.y+4.5)));
}

function addSportsGround({root,features,project,height,surfaceHeight,batch,m,buildings,pickables,signs,structureBounds}:CampusWorldContext) {
  const feature=features.find(f=>f.id==='local/ikole-sports-ground');
  if(!feature||feature.geometry.type!=='Polygon')return;
  const ring=feature.geometry.coordinates[0].slice(0,-1).map(project);
  const bounds=new THREE.Box2().setFromPoints(ring.map(p=>new THREE.Vector2(p.x,p.z))),center=bounds.getCenter(new THREE.Vector2());
  const a=ring[0],b=ring[1],d=ring[3],along={x:(b.x-a.x),z:(b.z-a.z)},across={x:(d.x-a.x),z:(d.z-a.z)};
  const width=Math.hypot(along.x,along.z),length=Math.hypot(across.x,across.z);
  along.x/=width;along.z/=width;across.x/=length;across.z/=length;
  // Bare earth and sparse goal frames follow the visible pitch. Avoid inventing
  // a grass stadium, stands or floodlights absent from the reference.
  const direction=width>=length?along:across,transverse=width>=length?across:along,pitchLength=Math.max(width,length);
  for(const end of [-1,1]) {
    const goal={x:center.x+direction.x*pitchLength*.4*end,z:center.y+direction.z*pitchLength*.4*end};
    for(const side of [-1,1]) {
      const x=goal.x+transverse.x*3.65*side,z=goal.z+transverse.z*3.65*side,y=surfaceHeight(x,z);
      batch.cylinder(.07,.07,2.4,x,y+1.2,z,m.white,5);
      structureBounds.push(new THREE.Box2(new THREE.Vector2(x-.1,z-.1),new THREE.Vector2(x+.1,z+.1)));
    }
    batch.box(7.4,.12,.12,goal.x,surfaceHeight(goal.x,goal.z)+2.4,goal.z,m.white,-Math.atan2(transverse.z,transverse.x));
  }
  const y=height(center.x,center.y),id='local/ikole-sports-complex';
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(width,.1,length),new THREE.MeshBasicMaterial({visible:false}));
  mesh.material.userData.ownedMaterial=true;root.add(mesh);mesh.position.set(center.x,y+.1,center.y);mesh.userData={id,noHighlight:true,invisible:true};pickables.push(mesh);
  // The collision list excludes the playing field: it remains walkable.
  buildings.push({id,name:'Ikole Sports Ground',position:new THREE.Vector3(center.x,y,center.y),ring:[],bounds,height:0,floors:0,style:'Bare-earth pitch · approximate observed extent',entrance:new THREE.Vector3(bounds.max.x+8,height(bounds.max.x+8,center.y),center.y),source:'observation',directory:true,named:true,placeId:'ikole-sports'});
  const sign={x:bounds.max.x+4,z:bounds.max.y};
  signs.add(batch,'ikole-sports',5,1.2,new THREE.Vector3(sign.x,height(sign.x,sign.z)+2,sign.z),Math.PI/2);
}
