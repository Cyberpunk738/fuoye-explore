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
