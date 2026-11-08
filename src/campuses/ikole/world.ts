import * as THREE from 'three';
import { groundPolygon } from '../../world/architecture';
import { createFootballPitchTexture } from '../../world/football-texture';
import type { Position } from '../../data';
import type { WorldProfile, CampusWorldContext } from '../../world/profile';

export const ikoleGate: Position = [5.496065, 7.801126];
const gateBearing = 22 * Math.PI / 180;

/** Independent Ikole scenery; dimensions not visible in imagery are estimates. */
export const ikoleWorldProfile: WorldProfile = {
  focusPlaceId: 'ikole-engineering',
  customGroundFeatures: ['local/ikole-sports-ground'],
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
    {key:'ikole-gate',lines:['FEDERAL UNIVERSITY','OYE-EKITI'],footer:'IKOLE CAMPUS',background:'#174838',color:'#fff7de',stretch:1.5},
    {key:'ikole-engineering-monument',lines:['FACULTY OF ENGINEERING'],background:'#80bfb0',color:'#174b36',stretch:2},
    {key:'ikole-sports',lines:['IKOLE SPORTS GROUND'],footer:'CAMPUS EXPLORER',background:'#174838',color:'#fff7de'},
  ],
  decorate(context) {
    const {batch,m,project,height,structureBounds,signs,ribbon}=context;
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
    // Samuel Ajala's labelled 2021 Ikole photograph: twin arches, sloping
    // cream wings, yellow piers and green/white gates. Metre dimensions are estimates.
    // The map's entrance point remains the centre of the open left-hand lane.
    const facade=new THREE.Shape();
    facade.moveTo(-15,0);facade.lineTo(29,0);facade.lineTo(29,3);
    facade.lineTo(11,10);facade.lineTo(11,8.5);facade.lineTo(3,8.5);
    facade.lineTo(3,10);facade.lineTo(-15,3);facade.closePath();
    for(const cx of [0,14]) {
      const arch=new THREE.Path();arch.moveTo(cx-5,0);arch.lineTo(cx-5,1.5);
      arch.absarc(cx,1.5,5,Math.PI,0,true);arch.lineTo(cx+5,0);arch.closePath();facade.holes.push(arch);
    }
    for(const cx of [-11,25]) {
      const door=new THREE.Path();door.moveTo(cx-1.1,0);door.lineTo(cx-1.1,1.7);
      door.absarc(cx,1.7,1.1,Math.PI,0,true);door.lineTo(cx+1.1,0);door.closePath();facade.holes.push(door);
    }
    const clerestory=new THREE.Path();clerestory.moveTo(3.4,4.8);clerestory.lineTo(3.4,7.6);clerestory.lineTo(10.6,7.6);clerestory.lineTo(10.6,4.8);clerestory.closePath();facade.holes.push(clerestory);
    const wall=new THREE.ExtrudeGeometry(facade,{depth:.7,bevelEnabled:false,curveSegments:24});
    // Local positive z points inward; facade faces the southern approach.
    wall.rotateY(-gateBearing);wall.translate(gate.x,y,gate.z);batch.add(wall,m.walls[0]);
    for(const cx of [-5.4,5.4,8.6,19.4]) {
      const p=local(cx,0);batch.cylinder(.45,.5,3.3,p.x,y+1.65,p.z,m.kekeYellow,12);
      reserve(cx,0,.95,.95);
    }
    for(const cx of [-8,22])reserve(cx,0,4,.7);
    for(const cx of [-14,28])reserve(cx,0,2,.7);
    // Central security booth and green pitched roof between the two lanes.
    box(3.1,3.5,4,7,1.75,1,m.walls[0]);reserve(7,1,3.1,4);
    box(1.8,1.3,.08,7,2,-1.05,m.windows);
    const roof=new THREE.BufferGeometry(),vertices:number[]=[];
    const vertex=(x:number,yy:number,z:number)=>{const p=local(x,z);return [p.x,y+yy,p.z];};
    for(const points of [[[4.9,3.6,-1.5],[9.1,3.6,-1.5],[9.1,4.6,1]],[[4.9,3.6,-1.5],[9.1,4.6,1],[4.9,4.6,1]],[[9.1,3.6,3.5],[4.9,3.6,3.5],[4.9,4.6,1]],[[9.1,3.6,3.5],[4.9,4.6,1],[9.1,4.6,1]]])for(const [x,yy,z]of points)vertices.push(...vertex(x,yy,z));
    roof.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));roof.computeVertexNormals();batch.add(roof,m.roofs[0]);
    // Green gate leaves with white pickets and diagonal motifs. All four
    // leaves are swung inward, clearing the separate entry and exit lanes.
    const leaf=(hinge:number,side:number,open:boolean)=>{
      const angle=open?Math.PI/2:0,span=4.8;
      const leafPoint=(u:number,v:number)=>local(hinge+side*u*Math.cos(angle),.15+u*Math.sin(angle)+v);
      const g=new THREE.Group();const at=leafPoint(span/2,0);g.position.set(at.x,y,at.z);
      g.rotation.y=-gateBearing-side*angle;
      const panel=new THREE.Mesh(new THREE.BoxGeometry(span,2.4,.09),m.green);panel.position.y=1.2;g.add(panel);
      for(let i=0;i<=18;i++) {const bar=new THREE.Mesh(new THREE.BoxGeometry(.045,.8,.055),m.white);bar.position.set(-span/2+i*span/18,2.8,0);g.add(bar);}
      for(const tilt of [-.6,.6]) {const stripe=new THREE.Mesh(new THREE.BoxGeometry(3,.12,.11),m.white);stripe.position.set(0,1.2,-.07);stripe.rotation.z=tilt;g.add(stripe);}
      g.updateMatrixWorld(true);for(const child of g.children){const mesh=child as THREE.Mesh;const geometry=mesh.geometry;geometry.applyMatrix4(mesh.matrixWorld);batch.add(geometry,mesh.material as THREE.Material);}
      if(!open)reserve(hinge+side*span/2,0,span,.2);
      else reserve(hinge,span/2,.2,span);
    };
    leaf(-4.9,1,true);leaf(4.9,-1,true);leaf(9.1,1,true);leaf(18.9,-1,true);
    // Sculpture silhouette in front of the booth: a figure lifting a globe.
    box(2.1,.65,1.7,7,.325,-3,m.stone);reserve(7,-3,2.1,1.7);
    for(const x of [6.75,7.25]){const p=local(x,-3);batch.cylinder(.12,.14,1.5,p.x,y+1.4,p.z,m.steel,8);}
    box(.65,1,.4,7,2.5,-3,m.steel);
    for(const [x,yy,r]of [[7,3.25,.27],[7.7,4.1,.65]]){const p=local(x,-3);const geo=new THREE.IcosahedronGeometry(r,1);geo.translate(p.x,y+yy,p.z);batch.add(geo,m.steel);}
    for(const x of [6.8,7.2]){const p=local(x,-3);batch.cylinder(.1,.1,1.3,p.x,y+3.5,p.z,m.steel,6);}
    // Mount the name on the approach-facing side, clear of the facade thickness.
    box(16,1.25,.12,7,8.2,-.8,m.green);
    const nameplate=local(7,-.88);
    signs.add(batch,'ikole-gate',15.8,1.15,new THREE.Vector3(nameplate.x,y+8.2,nameplate.z),-gateBearing);
    for(const [lane,direction]of [[0,1],[14,-1]])for(const z of [-15,15]) {
      const p=(x:number,t:number)=>local(lane+x,z+direction*t);
      ribbon(p(0,-2),p(0,2),.22,m.white,.47);
      ribbon(p(-.9,.7),p(0,2),.22,m.white,.47);
      ribbon(p(.9,.7),p(0,2),.22,m.white,.47);
    }
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

function addSportsGround({root,features,project,height,surfaceHeight,batch,m,buildings,pickables,signs,structureBounds,terrainClip}:CampusWorldContext) {
  const feature=features.find(f=>f.id==='local/ikole-sports-ground');
  if(!feature||feature.geometry.type!=='Polygon')return;
  const ring=feature.geometry.coordinates[0].slice(0,-1).map(project);
  const bounds=new THREE.Box2().setFromPoints(ring.map(p=>new THREE.Vector2(p.x,p.z))),center=bounds.getCenter(new THREE.Vector2());
  const a=ring[0],b=ring[1],d=ring[3],along={x:(b.x-a.x),z:(b.z-a.z)},across={x:(d.x-a.x),z:(d.z-a.z)};
  const width=Math.hypot(along.x,along.z),length=Math.hypot(across.x,across.z);
  along.x/=width;along.z/=width;across.x/=length;across.z/=length;
  const direction=width>=length?along:across,transverse=width>=length?across:along,pitchLength=Math.max(width,length),pitchWidth=Math.min(width,length);
  // Requested visual treatment: share Oye's exact grass/markings canvas while
  // retaining Ikole's own footprint and terrain triangles.
  const geometry=groundPolygon([ring],(x,z)=>height(x,z)+.08,terrainClip.origin,terrainClip.cell,terrainClip.steps);
  const positions=geometry.attributes.position,uv:number[]=[];
  for(let i=0;i<positions.count;i++) {
    const x=positions.getX(i)-center.x,z=positions.getZ(i)-center.y;
    const determinant=direction.x*transverse.z-direction.z*transverse.x;
    uv.push(.5+(x*transverse.z-z*transverse.x)/determinant/pitchLength,.5+(direction.x*z-direction.z*x)/determinant/pitchWidth);
  }
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));
  const material=new THREE.MeshLambertMaterial({map:createFootballPitchTexture()});
  material.userData.ownedMaterial=true;material.userData.ownedTexture=material.map;
  const pitch=new THREE.Mesh(geometry,material);pitch.name='ikole-football-pitch';pitch.receiveShadow=true;root.add(pitch);
  for(const end of [-1,1]) {
    const goal={x:center.x+direction.x*pitchLength*(.5-36/1024)*end,z:center.y+direction.z*pitchLength*(.5-36/1024)*end};
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
  buildings.push({id,name:'Ikole Sports Ground',position:new THREE.Vector3(center.x,y,center.y),ring:[],bounds,height:0,floors:0,style:'Oye-style grass pitch · approximate observed extent',entrance:new THREE.Vector3(bounds.max.x+8,height(bounds.max.x+8,center.y),center.y),source:'observation',directory:true,named:true,placeId:'ikole-sports'});
  const sign={x:bounds.max.x+4,z:bounds.max.y};
  signs.add(batch,'ikole-sports',5,1.2,new THREE.Vector3(sign.x,height(sign.x,sign.z)+2,sign.z),Math.PI/2);
}
