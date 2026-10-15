import * as THREE from 'three';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { Feature, Notes, Position } from '../data';
import { sectionedRoof, groundPolygon } from './architecture';
import { GeometryBatch } from './batch';
import { makeMaterials } from './materials';
import { createSignage } from './signage';
import { addCampusEntrance, mainGatePosition } from './entrance';
import { addPhaseOnePlanting } from './phase-one';
import { addPhaseOneSportsComplex } from './sports';
import { buildVegetation, sampleCover } from './vegetation';
import type { LandCover } from './vegetation';
import { clipSegment, hashSeed, nearestPoint, pointInRing, projectPosition, randomFrom, sampleElevation, unprojectPosition } from './math';
import type { Point, TerrainGrid } from './math';
export interface BuildingAsset {id:string;name:string;position:THREE.Vector3;ring:Point[];bounds:THREE.Box2;height:number;floors:number;style:string;entrance:THREE.Vector3;source:string;directory:boolean;named:boolean;placeId?:string;}
export interface RoadSegment {a:Point;b:Point;width:number;length:number;surface:string;}
export function buildWorld(features:Feature[],center:Position,notes:Notes,grid?:TerrainGrid,cover?:LandCover) {
  const root=new THREE.Group(), batch=new GeometryBatch(), m=makeMaterials();
  const buildings:BuildingAsset[]=[],pickables:THREE.Mesh[]=[],roads:RoadSegment[]=[],lamps:THREE.Vector3[]=[],exclusions:THREE.Box2[]=[];
  const sites:{name:string;position:THREE.Vector3}[]=[];
  const pavedPads:{bounds:THREE.Box2;offset:number}[]=[];
  const project=(p:Position)=>projectPosition(p,center);
  // A small elevation filter suppresses canopy/DEM noise without scaling heights.
  const smoothGrid=grid?{...grid,values:grid.values.map((value,index)=>{const col=index%grid.width,row=Math.floor(index/grid.width);let sum=0,weight=0;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const x=Math.max(0,Math.min(grid.width-1,col+dx)),z=Math.max(0,Math.min(grid.height-1,row+dz)),w=(dx===0?2:1)*(dz===0?2:1);sum+=grid.values[z*grid.width+x]*w;weight+=w;}return weight?sum/weight:value;})}:undefined;
  const baseElevation=sampleElevation(smoothGrid,center[0],center[1]);
  const rawHeight=(x:number,z:number)=>{const [lon,lat]=unprojectPosition({x,z},center);return sampleElevation(smoothGrid,lon,lat)-baseElevation;};
  const bounds=new THREE.Box2();
  const sourceBuildings=features.filter(f=>f.properties.kind==='building'&&f.geometry.type==='Polygon');
  for(const f of sourceBuildings){if(f.geometry.type!=='Polygon')continue;const ring=f.geometry.coordinates[0].slice(0,-1).map(project);ring.forEach(p=>bounds.expandByPoint(new THREE.Vector2(p.x,p.z)));const b=new THREE.Box2().setFromPoints(ring.map(p=>new THREE.Vector2(p.x,p.z)));const p=b.getCenter(new THREE.Vector2());const profile=f.properties.campus?.appearance;const explicit=profile?.floors??Number(f.properties.tags['building:levels']);const floors=Number.isFinite(explicit)&&explicit>0?Math.min(5,explicit):f.properties.area>350?2:1;buildings.push({id:f.id,name:notes[f.id]?.name??f.properties.tags.name??`Building ${String(buildings.length+1).padStart(2,'0')}`,position:new THREE.Vector3(p.x,rawHeight(p.x,p.y),p.y),ring,bounds:b,height:profile?.height??floors*3.6,floors,style:'',entrance:new THREE.Vector3(),source:f.properties.source,directory:f.properties.campus?.directory??true,named:!!f.properties.campus?.id,placeId:f.properties.campus?.id});}
  if(bounds.isEmpty())bounds.set(new THREE.Vector2(-400,-400),new THREE.Vector2(400,400));
  const mid=bounds.getCenter(new THREE.Vector2()),size=bounds.getSize(new THREE.Vector2());
  const cameraBounds=bounds.clone().expandByScalar(130);
  const worldBounds=grid?new THREE.Box2().setFromPoints([project([grid.bbox[0],grid.bbox[1]]),project([grid.bbox[2],grid.bbox[3]])].map(p=>new THREE.Vector2(p.x,p.z))):cameraBounds.clone();
  // Grade foundations gradually, using polygon distance rather than a bounding-box pad.
  const buildingHeight=(x:number,z:number)=>{const p={x,z},h=rawHeight(x,z);let total=0,weighted=0,influence=0;for(const b of buildings){if(b.bounds.distanceToPoint(new THREE.Vector2(x,z))>=35)continue;const inside=pointInRing(p,b.ring);if(inside)return b.position.y;const distance=Math.min(...b.ring.map((a,i)=>{const q=nearestPoint(p,a,b.ring[(i+1)%b.ring.length]);return Math.hypot(x-q.x,z-q.z);}));if(distance>=35)continue;const falloff=1-THREE.MathUtils.smoothstep(distance,0,35),weight=falloff/(distance+1)**2;total+=weight;weighted+=b.position.y*weight;influence=Math.max(influence,falloff);}return total?h+(weighted/total-h)*influence:h;};
  const gateGround=project(mainGatePosition),gateBase=rawHeight(gateGround.x,gateGround.z);
  const sportsMinX = 575, sportsMaxX = 765, sportsMinZ = -530, sportsMaxZ = -380;
  const sportsLevelY = 1.4;
  const flatHeight=(x:number,z:number)=>{
    const distance=Math.hypot(x-gateGround.x,z-gateGround.z),base=buildingHeight(x,z),blend=1-THREE.MathUtils.smoothstep(distance,34,70);
    const gateGraded = base+(gateBase-base)*blend;
    const dx = Math.max(0, sportsMinX - x, x - sportsMaxX);
    const dz = Math.max(0, sportsMinZ - z, z - sportsMaxZ);
    const sportsDist = Math.hypot(dx, dz);
    if (sportsDist === 0) return sportsLevelY;
    if (sportsDist < 14) {
      const t = sportsDist / 14, s = t * t * (3 - 2 * t);
      return sportsLevelY * (1 - s) + gateGraded * s;
    }
    return gateGraded;
  };
  const terrainSteps=96, terrainSize=worldBounds.getSize(new THREE.Vector2()), terrainValues:number[]=[];
  for(let row=0;row<=terrainSteps;row++)for(let col=0;col<=terrainSteps;col++)terrainValues.push(flatHeight(worldBounds.min.x+col/terrainSteps*terrainSize.x,worldBounds.min.y+row/terrainSteps*terrainSize.y));
  // Objects sample the actual rendered ground triangles, so terrain and ribbons
  // cannot intersect when the DEM bends between mesh vertices.
  const height=(x:number,z:number)=>{const gx=THREE.MathUtils.clamp((x-worldBounds.min.x)/terrainSize.x*terrainSteps,0,terrainSteps),gz=THREE.MathUtils.clamp((z-worldBounds.min.y)/terrainSize.y*terrainSteps,0,terrainSteps),ix=Math.min(terrainSteps-1,Math.floor(gx)),iz=Math.min(terrainSteps-1,Math.floor(gz)),fx=gx-ix,fz=gz-iz,stride=terrainSteps+1,a=terrainValues[iz*stride+ix],b=terrainValues[(iz+1)*stride+ix],c=terrainValues[(iz+1)*stride+ix+1],d=terrainValues[iz*stride+ix+1];return fx+fz<=1?a+(d-a)*fx+(b-a)*fz:c+(b-c)*(1-fx)+(d-c)*(1-fz);};
  buildings.forEach(b=>b.position.y=height(b.position.x,b.position.z));
  const structureBounds:THREE.Box2[]=[];
  const blocked=(p:Point,padding=0)=>structureBounds.some(b=>p.x>=b.min.x-padding&&p.x<=b.max.x+padding&&p.z>=b.min.y-padding&&p.z<=b.max.y+padding)||buildings.some(b=>{if(p.x<b.bounds.min.x-padding||p.x>b.bounds.max.x+padding||p.z<b.bounds.min.y-padding||p.z>b.bounds.max.y+padding)return false;if(pointInRing(p,b.ring))return true;return padding>0&&b.ring.some((a,i)=>{const q=nearestPoint(p,a,b.ring[(i+1)%b.ring.length]);return Math.hypot(p.x-q.x,p.z-q.z)<padding;});});
  const paths:{a:Point;b:Point;width:number}[]=[];
  const reserved=(p:Point,padding=0)=>blocked(p,padding)||exclusions.some(b=>b.clone().expandByScalar(padding).containsPoint(new THREE.Vector2(p.x,p.z)))||paths.some(s=>{const q=nearestPoint(p,s.a,s.b);return Math.hypot(p.x-q.x,p.z-q.z)<s.width/2+padding;});
  for(const f of features){if(f.properties.kind!=='road'||f.geometry.type!=='LineString')continue;const width=Number(f.properties.tags.width)||(['footway','path','steps'].includes(f.properties.tags.highway)?2:f.properties.tags.highway==='service'?4.5:7);const surface=f.properties.tags.surface??(width<3?'ground':'asphalt');
    for(let i=1;i<f.geometry.coordinates.length;i++){const start=project(f.geometry.coordinates[i-1]),end=project(f.geometry.coordinates[i]);const clipped=clipSegment(start,end,{x:worldBounds.min.x,z:worldBounds.min.y},{x:worldBounds.max.x,z:worldBounds.max.y});if(!clipped)continue;const [a,b]=clipped,length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.1)continue;roads.push({a,b,width,length,surface});}}
  const nearestRoad=(p:Point)=>{let best:Point|undefined,distance=Infinity;for(const s of roads){const q=nearestPoint(p,s.a,s.b),d=Math.hypot(q.x-p.x,q.z-p.z);if(d<distance){distance=d;best=q;}}return {point:best,distance};};
  const onRoad=(p:Point,pad=0)=>roads.some(s=>{const q=nearestPoint(p,s.a,s.b);return Math.hypot(p.x-q.x,p.z-q.z)<s.width/2+pad;});
  const surfaceHeight=(x:number,z:number)=>{const p={x,z};let offset=0;for(const s of roads){const q=nearestPoint(p,s.a,s.b);if(Math.hypot(p.x-q.x,p.z-q.z)<s.width/2)offset=Math.max(offset,s.surface==='asphalt'?.4:.13);}for(const site of groundSites)if(pointInRing(p,site.ring))offset=Math.max(offset,.08);for(const pad of pavedPads)if(pad.bounds.containsPoint(new THREE.Vector2(x,z)))offset=Math.max(offset,pad.offset);for(const path of paths){const q=nearestPoint(p,path.a,path.b);if(Math.hypot(q.x-x,q.z-z)<path.width/2)offset=Math.max(offset,.13);}return height(x,z)+offset;};
  const groundSites=features.filter(f=>f.properties.kind==='land'&&f.geometry.type==='Polygon').map(f=>({feature:f,ring:f.geometry.type==='Polygon'?f.geometry.coordinates[0].slice(0,-1).map(project):[]}));
  for(const site of groundSites){const surface=site.feature.properties.tags.surface,material=surface==='grass'?m.turf[0]:surface==='paving_stones'?m.pavers:m.soil;batch.add(groundPolygon([site.ring],(x,z)=>height(x,z)+(surface==='grass'?.10:.07),{x:worldBounds.min.x,z:worldBounds.min.y},{x:terrainSize.x/terrainSteps,z:terrainSize.y/terrainSteps},terrainSteps),material);}
  function ribbon(a:Point,b:Point,width:number,material:THREE.Material,offset=.12){const length=Math.hypot(b.x-a.x,b.z-a.z);if(length<.02)return;const nx=-(b.z-a.z)/length*width/2,nz=(b.x-a.x)/length*width/2,steps=Math.max(1,Math.ceil(length/6)),across=Math.max(1,Math.ceil(width/4)),vertices:number[]=[];
    for(let i=0;i<steps;i++){const t=i/steps,u=(i+1)/steps;const p={x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t},q={x:a.x+(b.x-a.x)*u,z:a.z+(b.z-a.z)*u};const v=(p:Point,k:number)=>[p.x+nx*k,height(p.x+nx*k,p.z+nz*k)+offset,p.z+nz*k];for(let j=0;j<across;j++){const lo=-1+j/across*2,hi=-1+(j+1)/across*2;vertices.push(...v(p,lo),...v(q,lo),...v(q,hi),...v(p,lo),...v(q,hi),...v(p,hi));}}
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();material.side=THREE.DoubleSide;batch.add(g,material);
  }
  function groundRect(p:Point,w:number,d:number,material:THREE.Material,angle=0,offset=.045){const along={x:Math.cos(angle),z:-Math.sin(angle)},across={x:Math.sin(angle),z:Math.cos(angle)};const a={x:p.x-along.x*w/2,z:p.z-along.z*w/2},b={x:p.x+along.x*w/2,z:p.z+along.z*w/2};ribbon(a,b,d,material,offset);const corners=[-1,1].flatMap(i=>[-1,1].map(j=>new THREE.Vector2(p.x+along.x*w/2*i+across.x*d/2*j,p.z+along.z*w/2*i+across.z*d/2*j)));const bounds=new THREE.Box2().setFromPoints(corners);exclusions.push(bounds);pavedPads.push({bounds,offset});}
  function panel(w:number,h:number,x:number,y:number,z:number,material:THREE.Material,angle:number){const g=new THREE.PlaneGeometry(w,h);g.rotateY(angle);g.translate(x,y,z);material.side=THREE.DoubleSide;batch.add(g,material);}
  const box=(...args:Parameters<GeometryBatch['box']>)=>batch.box(...args);
  const cyl=(...args:Parameters<GeometryBatch['cylinder']>)=>batch.cylinder(...args);
  function car(p:Point,angle:number,color:number){const y=surfaceHeight(p.x,p.z)+.05;box(1.8,.7,4.1,p.x,y+.7,p.z,m.carPaint[color%m.carPaint.length],angle);box(1.55,.65,2.15,p.x,y+1.28,p.z,m.glass,angle);box(1.62,.12,1.65,p.x,y+1.63,p.z,m.carPaint[color%m.carPaint.length],angle);for(const side of [-1,1])for(const front of [-1,1]){const x=side*.9,z=front*1.25,wx=p.x+Math.cos(angle)*x+Math.sin(angle)*z,wz=p.z-Math.sin(angle)*x+Math.cos(angle)*z;const g=new THREE.CylinderGeometry(.33,.33,.18,6);g.rotateZ(Math.PI/2);g.rotateY(angle);g.translate(wx,y+.38,wz);batch.add(g,m.rubber);}for(const side of[-1,1]){const x=side*.55,z=2.07;box(.35,.18,.07,p.x+Math.cos(angle)*x+Math.sin(angle)*z,y+.7,p.z-Math.sin(angle)*x+Math.cos(angle)*z,m.glow,angle);}}
  function lamp(p:Point){const y=height(p.x,p.z);cyl(.075,.13,6,p.x,y+3,p.z,m.steel);box(1.2,.08,.1,p.x+.45,y+5.9,p.z,m.steel);box(.5,.1,.28,p.x+.95,y+5.85,p.z,m.glow);lamps.push(new THREE.Vector3(p.x+.95,y+5.8,p.z));}
  function bench(p:Point,angle:number){const y=height(p.x,p.z);box(2,.12,.5,p.x,y+.5,p.z,m.wood,angle);box(2,.55,.09,p.x+Math.sin(angle)*.25,y+.8,p.z+Math.cos(angle)*.25,m.wood,angle);for(const s of[-1,1])box(.12,.5,.45,p.x+Math.cos(angle)*s*.7,y+.25,p.z-Math.sin(angle)*s*.7,m.steel,angle);}
  function sign(p:Point,text:string,angle=0){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d')!;ctx.fillStyle='#174c3d';ctx.fillRect(0,0,512,128);ctx.fillStyle='#f4eddc';ctx.font='bold 34px sans-serif';ctx.textAlign='center';ctx.fillText(text,256,76,480);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshLambertMaterial({map:tex});material.userData.ownedTexture=tex;const mesh=new THREE.Mesh(new THREE.BoxGeometry(5,.95,.12),material);mesh.rotation.y=angle;mesh.position.set(p.x,height(p.x,p.z)+2,p.z);root.add(mesh);for(const s of[-1,1])cyl(.055,.055,1.55,p.x+Math.cos(angle)*s*2,height(p.x,p.z)+.8,p.z-Math.sin(angle)*s*2,m.steel);}
  const namedBuildings=buildings.filter(b=>b.named&&b.directory);
  const signs=createSignage([
    ...namedBuildings.map(b=>({key:b.id,lines:[b.name.toUpperCase()],stretch:4})),
    {key:'gate',lines:['FEDERAL UNIVERSITY OYE-EKITI'],footer:'EKITI STATE, NIGERIA',stretch:2.5,background:'#dfae25',color:'#163b2b'},
    {key:'gate-safety',lines:['SPEED LIMIT','30 KM/H'],footer:'DRIVE SAFE · SLOW DOWN'},
    ...[1,2,3].map(phase=>({key:'phase-'+phase,lines:['PHASE '+phase],footer:'CAMPUS GUIDE',background:'#184c3b',color:'#fff9dc'}))
  ]);
  // Architectural profiles retain source outlines. Detail assemblies are illustrative.
  const heroIds=new Set(sourceBuildings.filter(f=>f.properties.campus?.id).map(f=>f.id));
  for(const [index,b] of buildings.entries()){
    const f=sourceBuildings[index];if(f.geometry.type!=='Polygon')continue;const rng=randomFrom(hashSeed(b.id)),profile=f.properties.campus?.appearance;const wall=profile?.wall==='ivory'?m.ivory:m.walls[profile?.wall==='cream'?0:Math.floor(rng()*m.walls.length)];const roofIndex=({green:0,grey:1,red:2,blue:3,sand:4} as Record<string,number>)[profile?.roof??'']??(f.properties.campus?.phase===3?3:0);const roof=m.roofs[roofIndex];const y=b.position.y,h=b.height,hall=b.placeId==='phase1-auditorium',hostel=profile?.facade==='hostel',admin=profile?.facade==='admin',management=profile?.facade==='management';
    const glazing=hostel?m.louvres:admin?m.adminWindows:m.windows;
    const shape=new THREE.Shape(b.ring.map(p=>new THREE.Vector2(p.x,-p.z)));for(const hole of f.geometry.coordinates.slice(1))shape.holes.push(new THREE.Path(hole.map(project).map(p=>new THREE.Vector2(p.x,-p.z))));
    const geo=new THREE.ExtrudeGeometry(shape,{depth:h,bevelEnabled:false});geo.rotateX(-Math.PI/2);geo.translate(0,y+.12,0);const body=new THREE.Mesh(geo,wall);body.castShadow=true;body.receiveShadow=false;body.userData.id=b.id;
    // Facade UVs are measured in metres, for consistent texture density.
    const pos=geo.attributes.position,normal=geo.attributes.normal,uv:number[]=[];for(let j=0;j<pos.count;j++)uv.push((Math.abs(normal.getX(j))>.5?pos.getZ(j):pos.getX(j))/6,pos.getY(j)/6);geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));root.add(body);pickables.push(body);
    let longest=0,edge=new THREE.Vector2(1,0),front=0,best=Infinity;const center2=new THREE.Vector2(b.position.x,b.position.z);
    for(let i=0;i<b.ring.length;i++){const a=b.ring[i],c=b.ring[(i+1)%b.ring.length];const length=Math.hypot(c.x-a.x,c.z-a.z);if(length>longest){longest=length;edge.set(c.x-a.x,c.z-a.z).normalize();}}
    for(let i=0;i<b.ring.length;i++){const a=b.ring[i],c=b.ring[(i+1)%b.ring.length],p={x:(a.x+c.x)/2,z:(a.z+c.z)/2};const length=Math.hypot(c.x-a.x,c.z-a.z);let score=nearestRoad(p).distance+(length<longest*.5?25:0);if(profile?.frontBearing!==undefined){const bearing=profile.frontBearing*Math.PI/180,dx=(c.x-a.x)/length,dz=(c.z-a.z)/length;let nx=-dz,nz=dx;if(pointInRing({x:p.x+nx*.3,z:p.z+nz*.3},b.ring)){nx=-nx;nz=-nz;}score=(1-(nx*Math.sin(bearing)-nz*Math.cos(bearing)))*1000-length;}if(score<best){best=score;front=i;}}
    const perpendicular=new THREE.Vector2(-edge.y,edge.x),u=b.ring.map(p=>p.x*edge.x+p.z*edge.y),v=b.ring.map(p=>p.x*perpendicular.x+p.z*perpendicular.y);const loU=Math.min(...u),hiU=Math.max(...u),loV=Math.min(...v),hiV=Math.max(...v),w=hiU-loU,d=hiV-loV,mU=(loU+hiU)/2,mV=(loV+hiV)/2;
    const rectangular=f.properties.area/(w*d)>.94&&profile?.roofForm!=='compound';
    const roofType=profile?.roofForm==='terrace'?'terrace':rectangular?(profile?.roofForm==='gable'?'gable':'hip'):'compound';b.style=profile?.facade?profile.facade+' · photo-informed':roofType+' roof · estimated height';
    if(rectangular&&roofType!=='terrace'){const rise=Math.min(d*.28,5);const vertex=(x:number,z:number,yy:number)=>{const p=edge.clone().multiplyScalar(mU+x).addScaledVector(perpendicular,mV+z);return[p.x,y+yy,p.y];};const cs=[vertex(-w/2-.7,-d/2-.7,h),vertex(w/2+.7,-d/2-.7,h),vertex(w/2+.7,d/2+.7,h),vertex(-w/2-.7,d/2+.7,h)];const inset=roofType==='hip'?Math.min(d/2,w/2):0;const r1=vertex(-w/2+inset,0,h+rise),r2=vertex(w/2-inset,0,h+rise);const vertices=[...cs[0],...cs[1],...r2,...cs[0],...r2,...r1,...cs[1],...cs[2],...r2,...cs[2],...cs[3],...r1,...cs[2],...r1,...r2,...cs[3],...cs[0],...r1];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));g.computeVertexNormals();batch.add(g,roof);
      const ridge=edge.clone().multiplyScalar(mU).addScaledVector(perpendicular,mV);box(Math.max(.4,w-inset*2),.18,.2,ridge.x,y+h+rise+.04,ridge.y,m.trim,-Math.atan2(edge.y,edge.x));
      if(roofType==='gable'){for(const s of[-1,1]){const verts=[...vertex(s*w/2,-d/2,h),...vertex(s*w/2,d/2,h),...vertex(s*w/2,0,h+rise)];const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(verts,3));g.computeVertexNormals();wall.side=THREE.DoubleSide;batch.add(g,wall);}}
    }else if(roofType==='compound'){const rings=f.geometry.coordinates.map(r=>r.slice(0,-1).map(project));let roofGeometry=sectionedRoof(rings,y+h+.12,Math.min(4.5,Math.max(1.4,d*.25)));
      if(b.named&&!roofGeometry.userData.sections){roofGeometry.deleteAttribute('normal');const smooth=mergeVertices(roofGeometry,.001);roofGeometry.dispose();smooth.computeVertexNormals();roofGeometry=smooth;}
      batch.add(roofGeometry,roof);
    }else{const g=new THREE.ShapeGeometry(shape);g.rotateX(-Math.PI/2);g.translate(0,y+h+.18,0);batch.add(g,m.roofs[1]);if(f.properties.area>400){box(5,1.3,4,b.position.x,y+h+.65,b.position.z,m.walls[1]);box(5.4,.15,4.4,b.position.x,y+h+1.4,b.position.z,m.roofs[1]);}}
    for(let i=0;i<b.ring.length;i++){
      const a=b.ring[i],c=b.ring[(i+1)%b.ring.length],dx=c.x-a.x,dz=c.z-a.z,length=Math.hypot(dx,dz);if(length<2)continue;const direction=new THREE.Vector2(dx,dz).normalize(),angle=-Math.atan2(dz,dx),midEdge=new THREE.Vector2((a.x+c.x)/2,(a.z+c.z)/2);let n=new THREE.Vector2(-direction.y,direction.x);if(pointInRing({x:midEdge.x+n.x*.3,z:midEdge.y+n.y*.3},b.ring))n.negate();
      box(length,.5,.24,midEdge.x+n.x*.04,y+.28,midEdge.y+n.y*.04,m.base,angle);box(length,.22,.35,midEdge.x,y+h-.12,midEdge.y,m.trim,angle);
      if(b.named&&length>3){const aa={x:a.x+n.x*.5,z:a.z+n.y*.5},bb={x:c.x+n.x*.5,z:c.z+n.y*.5};ribbon(aa,bb,.7,m.pavers,.11);}
      if(roofType==='terrace')box(length,.55,.25,midEdge.x,y+h+.27,midEdge.y,m.walls[1],angle);
      for(let floor=1;floor<b.floors;floor++)box(length,.18,.32,midEdge.x,y+floor*3.6,midEdge.y,m.trim,angle);
      const windowSpacing=hall?4.6:profile?.facade==='hostel'?3.1:heroIds.has(b.id)?3.7:4.8+rng();const count=Math.floor(length/windowSpacing);
      for(let j=0;j<count;j++){
        const p=new THREE.Vector2(a.x,a.z).lerp(new THREE.Vector2(c.x,c.z),(j+.5)/count).addScaledVector(n,.1);
        for(let floor=0;floor<b.floors;floor++){
          if(profile?.facade==='management'&&i===front&&floor>0)continue;
          const yy=y+(hall?2.85:1.95)+floor*3.6;const ww=hall?1.6:admin?2.3:hostel?1.15:management?1.6:1.32,wh=hall?2.75:admin?1.1:hostel?1.7:management?2.0:1.48;
          if(profile?.facade==='hostel'&&floor>0&&j%4<2)panel(2.9,2.8,p.x-n.x*.02,yy,p.y-n.y*.02,m.hostelInset,angle);
          panel(ww+.23,wh+.27,p.x,yy,p.y,m.trim,angle);panel(ww,wh,p.x+n.x*.035,yy,p.y+n.y*.035,glazing,angle);if(heroIds.has(b.id)){box(.055,wh,.2,p.x+n.x*.07,yy,p.y+n.y*.07,m.trim,angle);box(1.6,.1,.38,p.x+n.x*.1,yy-wh/2-.15,p.y+n.y*.1,m.base,angle);}
          if(b.named&&!hall){
            // Projecting reveals and hoods supply depth; unseen dimensions are estimates.
            box(ww+.36,.09,.38,p.x+n.x*.14,yy+wh/2+.16,p.y+n.y*.14,m.trim,angle);
            if(hostel&&floor===0&&j%4===2)box(.22,h-.35,.22,p.x-direction.x*1.5,y+h/2,p.y-direction.y*1.5,m.trim,angle);
          }
          if(heroIds.has(b.id)&&(admin||management)&&(j+index)%5===0){box(.65,.42,.38,p.x+n.x*.4,y+.95+floor*3.6,p.y+n.y*.4,m.white,angle);box(.5,.27,.02,p.x+n.x*.6,y+.95+floor*3.6,p.y+n.y*.6,m.steel,angle);}
        }
      }
      if(hall){
        // Recess shadow, sill and narrow pilasters give the tall hall a distinct rhythm.
        const bays=Math.max(1,Math.floor(length/4.6));
        for(let j=0;j<=bays;j++){const q=midEdge.clone().addScaledVector(direction,(j/bays-.5)*length).addScaledVector(n,.13);box(.26,h-.3,.26,q.x,y+(h-.3)/2,q.y,m.trim,angle);}
        box(length,.12,.62,midEdge.x+n.x*.12,y+h-.3,midEdge.y+n.y*.12,m.base,angle);
        for(let j=0;j<count;j++){const q=new THREE.Vector2(a.x,a.z).lerp(new THREE.Vector2(c.x,c.z),(j+.5)/count).addScaledVector(n,.2);box(1.95,.1,.65,q.x,y+4.35,q.y,m.trim,angle);}
      }
      if(heroIds.has(b.id)&&length>6){for(const s of[-1,1]){const p=midEdge.clone().addScaledVector(direction,s*(length/2-.3)).addScaledVector(n,.2);cyl(.055,.055,h,p.x,y+h/2,p.y,m.steel,5);}}
      if(profile?.facade==='admin'&&length>5){
        const ncols=Math.max(2,Math.floor(length/5));
        for(let j=0;j<=ncols;j++){const q=midEdge.clone().addScaledVector(direction,(j/ncols-.5)*length).addScaledVector(n,.24);box(.45,h+.4,.85,q.x+n.x*.22,y+h/2,q.y+n.y*.22,m.accent,angle);}
        box(length,.75,.85,midEdge.x+n.x*.45,y+h-.05,midEdge.y+n.y*.45,m.accent,angle);
        box(length,.24,.55,midEdge.x+n.x*.35,y+3.6,midEdge.y+n.y*.35,m.accent,angle);
      }
      if(i===front){if(b.named&&b.directory){const q=midEdge.clone().addScaledVector(n,4.05),signY=profile?.facade==='management'?3.95:3.4;signs.add(batch,b.id,hall?Math.min(8,length*.65):Math.min(15,length*.6),1.15,new THREE.Vector3(q.x,y+signY,q.y),Math.atan2(n.x,n.y));}
        const entry=midEdge.clone().addScaledVector(n,3.7);b.entrance.set(entry.x,height(entry.x,entry.y),entry.y);if(f.properties.area<110)continue;const large=f.properties.area>300,porticoWidth=hall?Math.min(length*.65,8):large?Math.min(length*.6,15):3.5;
        if(!management)box(2,2.8,.2,midEdge.x+n.x*.13,y+1.4,midEdge.y+n.y*.13,m.glass,angle);
        const deck=midEdge.clone().addScaledVector(n,1.8);box(porticoWidth,.18,3.7,deck.x,y+.25,deck.y,m.pavers,angle);
        const canopyHeight=management?h-.15:large?3.55:2.9;box(porticoWidth+.6,.2,4,deck.x,y+canopyHeight,deck.y,roof,angle);
        const columnCount=large?5:2;for(let j=0;j<columnCount;j++){const p=midEdge.clone().addScaledVector(direction,(j/(columnCount-1)-.5)*(porticoWidth-.6)).addScaledVector(n,3.3);if(Math.abs(j/(columnCount-1)-.5)<.1)continue;if(profile?.facade==='management')box(.55,canopyHeight,.55,p.x,y+canopyHeight/2,p.y,wall,angle);else cyl(.17,.21,canopyHeight,p.x,y+canopyHeight/2,p.y,m.trim);}
        if(profile?.facade==='management'){
          box(porticoWidth,.28,3.7,deck.x,y+3.6,deck.y,wall,angle);
          // Two door bays under the photographed tall column/glazing composition.
          for(const side of [-1,1]){const q=midEdge.clone().addScaledVector(direction,side*1.3).addScaledVector(n,.18);box(1.35,2.65,.12,q.x,y+1.4,q.y,m.steel,angle);box(.045,.45,.08,q.x+direction.x*.48,y+1.45,q.y+direction.y*.48,m.trim,angle);}
          const columns=Math.max(3,Math.floor(porticoWidth/1.5));
          for(let j=0;j<columns;j++){const q=midEdge.clone().addScaledVector(direction,(j+.5)/columns*porticoWidth-porticoWidth/2).addScaledVector(n,.22);panel(porticoWidth/columns-.08,2.9,q.x,y+5.25,q.y,m.windows,angle);}

        }
        if(profile?.facade==='hostel'){
          const balconyWidth=Math.min(10,length*.28),depth=2;
          for(let floor=1;floor<b.floors;floor++){const q=midEdge.clone().addScaledVector(n,depth/2);box(balconyWidth,.18,depth,q.x,y+floor*3.6,q.y,m.trim,angle);const rail=midEdge.clone().addScaledVector(n,depth);for(const offset of [.25,.5,.75,1.0])box(balconyWidth,.06,.07,rail.x,y+floor*3.6+offset,rail.y,m.trim,angle);for(let j=0;j<=8;j++){const post=rail.clone().addScaledVector(direction,(j/8-.5)*balconyWidth);box(.045,.95,.045,post.x,y+floor*3.6+.5,post.y,m.trim);}}
          const q=midEdge.clone().addScaledVector(n,1.2);box(balconyWidth+1,.2,3,q.x,y+h,q.y,roof,angle);
        }
        if(large&&b.floors>1&&profile?.facade!=='management'&&profile?.facade!=='hostel'){box(porticoWidth,.13,3.7,deck.x,y+3.6,deck.y,m.trim,angle);const p=midEdge.clone().addScaledVector(n,3.5);box(porticoWidth,.07,.08,p.x,y+4.5,p.y,m.steel,angle);for(let j=0;j<Math.floor(porticoWidth/1.4);j++){const q=p.clone().addScaledVector(direction,(j+.5)*1.4-porticoWidth/2);box(.04,.9,.04,q.x,y+4.05,q.y,m.steel);} }
        for(let j=0;j<(hall?4:3);j++){const p=midEdge.clone().addScaledVector(n,3.8+j*.3);box(b.named?Math.min(porticoWidth,6):3,.12,.5,p.x,y+.23-j*.07,p.y,m.pavers,angle);}

      }
    }
  }

  // Roads drape over the DEM. Centre lines and verge strips provide legible scale.
  let roadDistance=0;
  for(const s of roads){if(s.surface!=='asphalt'){ribbon(s.a,s.b,s.width,s.surface==='paving_stones'?m.pavers:m.soil,.12);
      if(s.surface==='paving_stones'){const nx=-(s.b.z-s.a.z)/s.length,nz=(s.b.x-s.a.x)/s.length;for(const side of [-1,1])ribbon({x:s.a.x+nx*side*(s.width/2+.08),z:s.a.z+nz*side*(s.width/2+.08)},{x:s.b.x+nx*side*(s.width/2+.08),z:s.b.z+nz*side*(s.width/2+.08)},.16,m.base,.17);}continue;}ribbon(s.a,s.b,s.width+1,m.pavers,.16);ribbon(s.a,s.b,s.width,m.asphalt,.38);if(s.width>4){const dx=(s.b.x-s.a.x)/s.length,dz=(s.b.z-s.a.z)/s.length;
      for(let t=2;t<s.length;t+=11){const a={x:s.a.x+dx*t,z:s.a.z+dz*t},b={x:s.a.x+dx*Math.min(t+3,s.length),z:s.a.z+dz*Math.min(t+3,s.length)};ribbon(a,b,.12,m.white,.47);}
      for(let t=0;t<s.length;t+=4){for(const side of[-1,1]){const a={x:s.a.x+dx*t-dz*side*(s.width/2+.2),z:s.a.z+dz*t+dx*side*(s.width/2+.2)},b={x:s.a.x+dx*Math.min(t+4,s.length)-dz*side*(s.width/2+.2),z:s.a.z+dz*Math.min(t+4,s.length)+dx*side*(s.width/2+.2)};ribbon(a,b,.3,Math.floor(t/4)%2===0?m.white:m.steel,.47);}}
      for(let t=12;t<s.length;t+=100){const p={x:s.a.x+dx*t-dz*(s.width/2+1.1),z:s.a.z+dz*t+dx*(s.width/2+1.1)};if(!blocked(p,2))lamp(p);}
      if(s.length>45&&roadDistance%3===0){const p={x:(s.a.x+s.b.x)/2-dz*1.7,z:(s.a.z+s.b.z)/2+dx*1.7};if(!blocked(p))car(p,Math.atan2(dx,dz),roadDistance);}
    }roadDistance++;}
  const sports=addPhaseOneSportsComplex(root,batch,m,center,height);
  structureBounds.push(...sports.obstacles);
  lamps.push(...sports.lamps);
  buildings.push(sports.building);
  pickables.push(sports.pickable);
  const entrance=addCampusEntrance(batch,m,signs,center,height,{origin:{x:worldBounds.min.x,z:worldBounds.min.y},cell:{x:terrainSize.x/terrainSteps,z:terrainSize.y/terrainSteps},steps:terrainSteps});
  structureBounds.push(...entrance.obstacles);
  // App-added phase markers at the campus road edges; not surveyed existing signs.
  for(const [phase,lon,lat] of [[1,5.32144,7.78042],[2,5.31596,7.77855],[3,5.31165,7.77734]]){
    const p=project([lon,lat]),road=nearestRoad(p);if(!road.point)continue;
    const dx=p.x-road.point.x,dz=p.z-road.point.z,l=Math.hypot(dx,dz)||1,angle=Math.atan2(-dx,-dz);
    const q={x:road.point.x+dx/l*6,z:road.point.z+dz/l*6},y=height(q.x,q.z);
    signs.add(batch,'phase-'+phase,5.5,2,new THREE.Vector3(q.x,y+3,q.z),angle);
    for(const side of [-1,1]){const x=q.x+Math.cos(angle)*side*2.35,z=q.z-Math.sin(angle)*side*2.35;cyl(.065,.065,3,x,y+1.5,z,m.steel,5);structureBounds.push(new THREE.Box2(new THREE.Vector2(x-.1,z-.1),new THREE.Vector2(x+.1,z+.1)));}
  }
  // Vegetation density follows the satellite land-cover mask, with bounded instancing.
  // Low edging follows only the observed park boundary. Open gaps at mapped
  // paths/roads; kerb dimensions are illustrative, not surveyed infrastructure.
  for(const site of groundSites.filter(s=>s.feature.id==='local/admin-park')){
    for(let edge=0;edge<site.ring.length;edge++){
      const a=site.ring[edge],b=site.ring[(edge+1)%site.ring.length],length=Math.hypot(b.x-a.x,b.z-a.z),steps=Math.ceil(length/2);
      for(let j=0;j<steps;j++){
        const p={x:a.x+(b.x-a.x)*j/steps,z:a.z+(b.z-a.z)*j/steps},q={x:a.x+(b.x-a.x)*(j+1)/steps,z:a.z+(b.z-a.z)*(j+1)/steps};
        if(onRoad(p,1.2)||onRoad(q,1.2)||blocked(p,2)||blocked(q,2))continue;
        ribbon(p,q,.22,m.base,.19);
      }
    }
  }
  const planting=addPhaseOnePlanting(features,center,batch,m,height,p=>!blocked(p,2)&&!onRoad(p,1));
  const vegetation=buildVegetation(cover,center,height,p=>entrance.reserved(p)||sports.reserved(p)||blocked(p,8)||onRoad(p,3)||groundSites.some(site=>pointInRing(p,site.ring)),m,planting.trees);
  root.add(vegetation.root);
  const trees=vegetation.count,people=0,parkingLots=0;
  // Terrain mesh with subtle natural variation, sampled at real metre scale.
  const groundSize=worldBounds.getSize(new THREE.Vector2()),groundMid=worldBounds.getCenter(new THREE.Vector2());
  const terrain=new THREE.PlaneGeometry(groundSize.x,groundSize.y,terrainSteps,terrainSteps);terrain.rotateX(-Math.PI/2);terrain.translate(groundMid.x,0,groundMid.y);const p=terrain.attributes.position,colors:number[]=[];
  for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,height(x,z)-.025);const variation=Math.sin(x*.011)*Math.cos(z*.009)*.055+Math.sin(x*.05+z*.02)*.025;const [lon,lat]=unprojectPosition({x,z},center),land=sampleCover(cover,lon,lat);const color=new THREE.Color(land===10?'#66885d':land===40?'#acb28a':land===50?'#b9b7a6':land===60?'#b7a789':'#a0b58b').offsetHSL(0,0,variation*.4);colors.push(color.r,color.g,color.b);}
  terrain.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));const tuv=[];for(let i=0;i<p.count;i++)tuv.push(p.getX(i)/8,p.getZ(i)/8);terrain.setAttribute('uv',new THREE.Float32BufferAttribute(tuv,2));terrain.computeVertexNormals();m.grass.vertexColors=true;const ground=new THREE.Mesh(terrain,m.grass);ground.receiveShadow=true;root.add(ground);
  // A low terrain skirt keeps the landscape readable as a continuous model.
  const distant=new THREE.Mesh(new THREE.PlaneGeometry(6000,6000),new THREE.MeshLambertMaterial({color:'#b3bea0'}));distant.rotation.x=-Math.PI/2;distant.position.set(mid.x,-85,mid.y);distant.material.userData.ownedMaterial=true;root.add(distant);
  batch.finish(root);
  const selected=buildings.find(b=>b.placeId==='science')??buildings[0];
  return {root,ground,entrance,updateVegetation:vegetation.updateDetail,vegetationDetail:()=>vegetation.root.userData.detailedTrees??0,signageCount:namedBuildings.length,materials:m,buildings,pickables,roads,lamps,treeTrunks:vegetation.trunks,sites,bounds:worldBounds,cameraBounds,focus:selected,height,surfaceHeight,baseElevation,stats:{trees,people,buildings:buildings.length,roads:roads.length,parkingLots},blocked,dispose(){const geometries=new Set<THREE.BufferGeometry>(vegetation.root.userData.sharedGeometries??[]);root.traverse(o=>{if(o instanceof THREE.Mesh){geometries.add(o.geometry);const materials=Array.isArray(o.material)?o.material:[o.material];for(const material of materials){if(material.userData.ownedMaterial)material.dispose();if(material.userData.ownedTexture){material.userData.ownedTexture.dispose();material.dispose();}}}});geometries.forEach(g=>g.dispose());m.dispose();root.clear();}};
}
export type World=ReturnType<typeof buildWorld>;





