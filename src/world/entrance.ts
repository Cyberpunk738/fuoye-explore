import * as THREE from 'three';
import type { Position } from '../data';
import { projectPosition } from './math';
import { groundPolygon } from './architecture';
import type { GeometryBatch } from './batch';
import type { Materials } from './materials';
import type { createSignage } from './signage';

// Phase 1 entrance, visually located on Maps satellite, 11 Oct 2026.
// See research/entrance-and-identification.md for evidence and limitations.
export const mainGatePosition:Position=[5.32330,7.78057];
// Phase 2 northern entrance (Falex Road boulevard), visually located on zoom-20 Maps satellite, 17 Oct 2026.
export const phase2GatePosition:Position=[5.3159531,7.782590];

export function addCampusEntrance(batch:GeometryBatch,m:Materials,signs:ReturnType<typeof createSignage>,center:Position,height:(x:number,z:number)=>number,terrain:{origin:{x:number;z:number};cell:{x:number;z:number};steps:number}) {
  const p=projectPosition(mainGatePosition,center),y=height(p.x,p.z),angle=Math.PI/2;
  // Local +z faces University Road (east); +x is north.
  const world=(x:number,z:number)=>({x:p.x+z,z:p.z-x});
  const box=(w:number,h:number,d:number,x:number,yy:number,z:number,material:THREE.Material)=>{const q=world(x,z);batch.box(w,h,d,q.x,y+yy,q.z,material,angle);};
  const obstacles:THREE.Box2[]=[];
  const obstacle=(x:number,z:number,w:number,d:number)=>{const q=world(x,z);obstacles.push(new THREE.Box2(new THREE.Vector2(q.x-d/2,q.z-w/2),new THREE.Vector2(q.x+d/2,q.z+w/2)));};
  const gold=new THREE.MeshLambertMaterial({color:'#e7b82d',emissive:'#997315',emissiveIntensity:.35});gold.userData.ownedMaterial=true;
  const roof=m.roofs[0];
  // The two solid wings have actual arched holes, not painted entrances.
  for(const side of [-1,1]){
    const shape=new THREE.Shape();const points=[[4,0],[20,0],[20,3.3],[7,10.2],[4,9.4]];
    points.forEach(([x,yy],i)=>i?shape.lineTo(side*x,yy):shape.moveTo(side*x,yy));shape.closePath();
    const opening=new THREE.Path();const cx=side*10.1,r=3.65;
    opening.moveTo(cx-r,.02);opening.lineTo(cx+r,.02);opening.lineTo(cx+r,3);
    for(let i=1;i<=20;i++){const a=i/20*Math.PI;opening.lineTo(cx+Math.cos(a)*r,3+Math.sin(a)*r);}opening.closePath();shape.holes.push(opening);
    const pedestrian=new THREE.Path();const pc=side*17.2;pedestrian.moveTo(pc-1,.02);pedestrian.lineTo(pc+1,.02);pedestrian.lineTo(pc+1,1.8);for(let i=1;i<=10;i++){const a=i/10*Math.PI;pedestrian.lineTo(pc+Math.cos(a),1.8+Math.sin(a));}pedestrian.closePath();shape.holes.push(pedestrian);
    const geometry=new THREE.ExtrudeGeometry(shape,{depth:.7,bevelEnabled:false});geometry.translate(0,0,-.35);geometry.rotateY(angle);geometry.translate(p.x,y,p.z);batch.add(geometry,gold);
    for(const [x,w] of [[4.85,1.7],[14.95,2.2],[19.1,1.8]])obstacle(side*x,0,w,.9);
    // Open green-and-white gate leaves lie back along the driveway.
    for(const edge of [-1,1]){
      const x=side*10.1+edge*3.55;
      box(.1,3.3,3.4,x,1.65,-1.75,m.white);
      // Green diamond-and-circle motif, approximated from the photographed gates.
      const emblem=new THREE.Shape();emblem.moveTo(0,1.5);emblem.lineTo(1.4,0);emblem.lineTo(0,-1.5);emblem.lineTo(-1.4,0);emblem.closePath();
      const cutout=new THREE.Path();cutout.absarc(0,0,.6,0,Math.PI*2,true);emblem.holes.push(cutout);
      const eg=new THREE.ShapeGeometry(emblem,12);eg.rotateY(angle+Math.PI/2);const eq=world(x, -1.75);eg.translate(eq.x,y+1.8,eq.z);m.green.side=THREE.DoubleSide;batch.add(eg,m.green);
      for(let i=0;i<9;i++)box(.13,3.6,.045,x,1.8,-.2-i*.38,m.white);
      obstacle(x,-1.75,.16,3.5);
    }
    // Boundary wall and railing follow the short visible entrance frontage.
    box(9,1,.5,side*24.5,.5,0,gold);obstacle(side*24.5,0,9,.5);
    box(9,.08,.1,side*24.5,2.1,0,m.steel);
    for(let i=0;i<=18;i++)box(.045,1.2,.045,side*(20+i*.5),1.6,0,m.steel);
  }
  box(8.2,1.5,.75,0,8.7,0,gold);
  // Central security lodge and green pitched roof seen behind the sign beam.
  box(7.5,3.6,5,0,1.8,-1.6,gold);obstacle(0,-1.6,7.5,5);
  for(const x of [-2.5,2.5]){box(1.8,1.1,.08,x,2.3,1,m.windows);box(2,.12,.2,x,1.68,1.04,m.white);}
  box(1.1,2.5,.08,0,1.25,1,m.green);
  const roofGeometry=new THREE.BufferGeometry(),verts:number[]=[];
  for(const tri of [[[ -4.2,3.8,1.4],[4.2,3.8,1.4],[4.2,5.4,-1.6]],[[-4.2,3.8,1.4],[4.2,5.4,-1.6],[-4.2,5.4,-1.6]],[[-4.2,5.4,-1.6],[4.2,5.4,-1.6],[4.2,3.8,-4.6]],[[-4.2,5.4,-1.6],[4.2,3.8,-4.6],[-4.2,3.8,-4.6]]])for(const [x,yy,z]of tri){const q=world(x,z);verts.push(q.x,y+yy,q.z);}
  roofGeometry.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));roof.side=THREE.DoubleSide;batch.add(roofGeometry,roof);
  const title=world(0,.42);signs.add(batch,'gate',7.9,1.25,new THREE.Vector3(title.x,y+8.7,title.z),angle);
  // Paved forecourt, retaining the two passable lanes around the central island.
  const ring=[world(-22,-18),world(22,-18),world(22,18),world(9,49),world(-9,49)];
  batch.add(groundPolygon([ring],(x,z)=>height(x,z)+.07,terrain.origin,terrain.cell,terrain.steps),m.asphalt);
  box(4.4,.5,8,0,.25,8,m.stone);obstacle(0,8,4.4,8);
  box(3.9,.1,7.4,0,.53,8,m.turf[0]);
  // Faceted approximation of the sculptural group: figures around a rocky base
  // and a spread-wing bird. No claim of a scanned or measured sculpture.
  const bronze=new THREE.MeshLambertMaterial({color:'#af9558'});bronze.userData.ownedMaterial=true;
  const rock=new THREE.IcosahedronGeometry(1.35,0);rock.scale(.8,1.15,1);const rq=world(0,7.2);rock.translate(rq.x,y+1.7,rq.z);batch.add(rock,m.steel);
  const limb=(a:number[],b:number[],radius:number)=>{const pa=world(a[0],a[2]),pb=world(b[0],b[2]),start=new THREE.Vector3(pa.x,y+a[1],pa.z),end=new THREE.Vector3(pb.x,y+b[1],pb.z),v=end.clone().sub(start),g=new THREE.CylinderGeometry(radius*.8,radius,v.length(),5);g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize()));g.translate(...start.add(end).multiplyScalar(.5).toArray());batch.add(g,bronze);};
  for(const [x,z,raise] of [[-.85,8.1,0],[.95,7.9,.15],[0,6.4,.7]]){
    const q=world(x,z);const body=new THREE.IcosahedronGeometry(.48,0);body.scale(.62,1.25,.6);body.translate(q.x,y+1.75+raise,q.z);batch.add(body,bronze);
    const head=new THREE.IcosahedronGeometry(.24,1);head.translate(q.x,y+2.58+raise,q.z);batch.add(head,bronze);
    for(const side of [-1,1]){limb([x+side*.18,1.5+raise,z],[x+side*.3,.9+raise,z+.5],.13);limb([x+side*.3,.9+raise,z+.5],[x+side*.3,.55,z+.8],.12);limb([x+side*.25,2.12+raise,z],[x+side*.55,1.75+raise,z+.45],.11);}
  }
  const birdShape=new THREE.Shape();birdShape.moveTo(0,.25);birdShape.lineTo(-1.8,.9);birdShape.lineTo(-1.3,.25);birdShape.lineTo(-.4,-.1);birdShape.lineTo(0,-.65);birdShape.lineTo(.4,-.1);birdShape.lineTo(1.3,.25);birdShape.lineTo(1.8,.9);birdShape.closePath();
  const birdGeometry=new THREE.ExtrudeGeometry(birdShape,{depth:.12,bevelEnabled:false});birdGeometry.rotateY(angle);const bird=world(0,7.2);birdGeometry.translate(bird.x,y+3.9,bird.z);batch.add(birdGeometry,bronze);
  for(const side of [-1,1]){const q=world(side*2.8,3.5);batch.cylinder(.035,.05,7.3,q.x,y+3.65,q.z,m.steel,5);box(1.1,.75,.02,side*2.8+.5,6.7,3.5,m.green);box(.37,.75,.025,side*2.8+.5,6.7,3.52,m.white);}
  // Safety signs are observed in the wide entrance photo.
  const speed=world(-3.8,9);signs.add(batch,'gate-safety',1.4,1.8,new THREE.Vector3(speed.x,y+2.2,speed.z),angle);box(.06,2.2,.06,-3.8,1.1,9,m.steel);obstacle(-3.8,9,.2,.2);
  const position=new THREE.Vector3(p.x,y,p.z),approach=world(-1,37);
  return {position,approach:new THREE.Vector3(approach.x,height(approach.x,approach.z),approach.z),obstacles,reserved:(q:{x:number;z:number})=>Math.abs(q.x-p.x)<52&&Math.abs(q.z-p.z)<33};
}

/**
 * Phase 2 Gate (Falex Road northern boulevard entrance).
 * Modeled from zoom-20 satellite view (three blue-grey hipped roof pavilions spanning the divided
 * boulevard) and the roadside FUOYE monument wall photo. Both carriageways remain clear for driving/walking.
 */
export function addPhaseTwoEntrance(batch:GeometryBatch,m:Materials,signs:ReturnType<typeof createSignage>,center:Position,height:(x:number,z:number)=>number,terrain:{origin:{x:number;z:number};cell:{x:number;z:number};steps:number}) {
  const p=projectPosition(phase2GatePosition,center),y=height(p.x,p.z);
  // Road unit direction (+z faces NNE toward Falex/town; +x faces ESE across the two carriageways).
  const ux=0.26796,uz=-0.96343,nx=-uz,nz=ux;
  const angle=Math.atan2(ux,uz);
  const world=(x:number,z:number)=>({x:p.x+x*nx+z*ux,z:p.z+x*nz+z*uz});
  const box=(w:number,h:number,d:number,x:number,yy:number,z:number,material:THREE.Material,rot=angle)=>{const q=world(x,z);batch.box(w,h,d,q.x,y+yy,q.z,material,rot);};
  const obstacles:THREE.Box2[]=[];
  const obstacle=(x:number,z:number,r:number)=>{const q=world(x,z);obstacles.push(new THREE.Box2(new THREE.Vector2(q.x-r,q.z-r),new THREE.Vector2(q.x+r,q.z+r)));};
  const roof=m.roofs[3]; // Blue-grey roof observed in zoom-20 satellite view

  function hipRoof(cx:number,cz:number,w:number,d:number,baseY:number,rise:number){
    const inset=Math.min(w,d)*.28;
    const v=(lx:number,ly:number,lz:number)=>{const q=world(cx+lx,cz+lz);return [q.x,y+ly,q.z];};
    const c0=v(-w/2,baseY,-d/2),c1=v(w/2,baseY,-d/2),c2=v(w/2,baseY,d/2),c3=v(-w/2,baseY,d/2);
    const r0=v(-w/2+inset,baseY+rise,0),r1=v(w/2-inset,baseY+rise,0);
    const verts=[...c0,...c1,...r1,...c0,...r1,...r0,...c1,...c2,...r1,...c2,...c3,...r0,...c2,...r0,...r1,...c3,...c0,...r0];
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();
    roof.side=THREE.DoubleSide;batch.add(g,roof);
  }

  // Paved gate apron across both carriageways
  const apronRing=[world(-17,-22),world(17,-22),world(17,24),world(-17,24)];
  batch.add(groundPolygon([apronRing],(x,z)=>height(x,z)+.065,terrain.origin,terrain.cell,terrain.steps),m.asphalt);

  // Central median island and central security lodge (x = 0, leaving lanes at x = -6.0 and x = +6.0 clear)
  box(3.8,.36,24,0,.18,0,m.stone);
  box(3.2,.08,23,0,.38,0,m.turf[0]);
  box(3.8,3.8,6.2,0,1.9,0,m.ivory);
  box(4.0,.25,6.4,0,3.75,0,m.trim);
  for(const sx of [-1.85,1.85])for(const sz of [-2.9,2.9])box(.32,3.8,.32,sx,1.9,sz,m.accent);
  for(const sz of [-3.12,3.12]){
    box(1.5,1.1,.08,0,2.3,sz,m.windows);
    box(1.7,.12,.18,0,1.7,sz,m.white);
  }
  for(const sx of [-1.92,1.92])box(.08,2.3,1.0,sx,1.2,0,m.green);
  hipRoof(0,0,4.8,7.2,3.85,1.65);
  for(const z of [-4,0,4])obstacle(0,z,1.85);

  // West (-12.5) and East (+12.5) outer gatehouse pavilions observed in satellite imagery
  for(const side of [-1,1]){
    const cx=side*12.5;
    box(4.8,3.8,6.2,cx,1.9,0,m.ivory);
    box(5.0,.25,6.4,cx,3.75,0,m.trim);
    for(const sx of [-2.25,2.25])for(const sz of [-2.9,2.9])box(.32,3.8,.32,cx+sx,1.9,sz,m.accent);
    for(const sz of [-3.12,3.12])box(1.6,1.1,.08,cx,2.3,sz,m.windows);
    hipRoof(cx,0,5.8,7.2,3.85,1.7);
    for(const z of [-2.2,2.2])obstacle(cx,z,2.1);

    // Portal support piers framing each 7.6m vehicle lane (at x = ±2.0 and x = ±9.9)
    for(const px of [side*2.0,side*9.9]){
      box(.75,6.6,.85,px,3.3,0,m.accent);
      box(.92,.35,1.0,px,6.55,0,m.trim);
      obstacle(px,0,.45);
    }

    // Open white-and-green metal gate leaves folded back along the piers
    for(const edge of [side*2.35,side*9.55]){
      box(.1,3.1,2.8,edge,1.6,-1.5,m.white);
      box(.14,1.2,1.2,edge,1.8,-1.5,m.green);
    }

    // White/cream perimeter boundary walls extending along the campus boundary
    box(8.5,1.2,.45,side*19.0,.6,0,m.ivory);
    box(8.5,.08,.12,side*19.0,2.1,0,m.steel);
    for(let i=0;i<=14;i++)box(.045,1.0,.045,side*(15.0+i*.55),1.6,0,m.steel);
    obstacle(side*18.5,0,1.8);
  }

  // Overhead structural portal beam spanning across both lanes with Phase 2 Gate signage
  box(21.6,1.25,.85,0,6.25,0,m.ivory);
  box(22.0,.22,1.05,0,6.92,0,m.accent);
  box(22.0,.18,1.0,0,5.6,0,m.trim);
  const frontTitle=world(0,.46),backTitle=world(0,-.46);
  signs.add(batch,'phase2-gate',10.5,1.08,new THREE.Vector3(frontTitle.x,y+6.25,frontTitle.z),angle);
  signs.add(batch,'phase2-gate',10.5,1.08,new THREE.Vector3(backTitle.x,y+6.25,backTitle.z),angle+Math.PI);

  // Photographed cream roadside FUOYE monument wall on brick plinth at the entrance approach
  const mx=-11.6,mz=12.5;
  box(4.8,.85,.75,mx,.42,mz,m.brick,angle+.22);
  box(5.4,2.15,.48,mx,1.88,mz,m.ivory,angle+.22);
  box(5.75,.18,.68,mx,3.02,mz,m.trim,angle+.22);
  const mw=world(mx-.12,mz+.28);
  signs.add(batch,'gate-monument',4.8,1.55,new THREE.Vector3(mw.x,y+1.92,mw.z),angle+.22);
  obstacle(mx,mz,1.6);

  const position=new THREE.Vector3(p.x,y,p.z),approach=world(-5.8,34);
  return {
    position,
    approach:new THREE.Vector3(approach.x,height(approach.x,approach.z),approach.z),
    obstacles,
    reserved:(q:{x:number;z:number})=>Math.hypot(q.x-p.x,q.z-p.z)<42
  };
}
