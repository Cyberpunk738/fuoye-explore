import * as THREE from 'three';
import { addCampusEntrance, addPhaseTwoEntrance, mainGatePosition, phase2GatePosition } from './entrance';
import { addPhaseOnePlanting } from './phase-one';
import { addPhaseOneSportsComplex } from './sports';
import { addPhaseOneMosque } from './mosque';
import { addCampusTransitParks } from './transit-park';
import type { WorldProfile } from '../../world/profile';

export const oyeWorldProfile: WorldProfile = {
  focusPlaceId: 'science',
  appearance(feature) {
    const profile = feature.properties.campus?.appearance;
    const id = feature.properties.campus?.id;
    return {
      facade: profile?.facade ?? (id === 'phase1-auditorium' ? 'hall' : id === 'senate' ? 'admin' : undefined),
      roof: profile?.roof ?? (feature.properties.campus?.phase === 3 ? 'blue' : 'green'),
    };
  },
  grade({project, rawHeight, buildingHeight}) {
    const gateGround=project(mainGatePosition),gateBase=rawHeight(gateGround.x,gateGround.z);
    const phase2Ground=project(phase2GatePosition),phase2Base=rawHeight(phase2Ground.x,phase2Ground.z);
    const sportsMinX = 575, sportsMaxX = 765, sportsMinZ = -540, sportsMaxZ = -380;
    const sportsLevelY = 1.4;
    const flatHeight=(x:number,z:number)=>{
      const distance=Math.hypot(x-gateGround.x,z-gateGround.z),base=buildingHeight(x,z),blend=1-THREE.MathUtils.smoothstep(distance,34,70);
      const gate1Graded = base+(gateBase-base)*blend;
      const distance2=Math.hypot(x-phase2Ground.x,z-phase2Ground.z),blend2=1-THREE.MathUtils.smoothstep(distance2,30,65);
      const gateGraded = gate1Graded+(phase2Base-gate1Graded)*blend2;
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
    return flatHeight;
  },
  signs: [
    {key:'gate',lines:['FEDERAL UNIVERSITY OYE-EKITI'],footer:'EKITI STATE, NIGERIA',stretch:2.5,background:'#dfae25',color:'#163b2b'},
    {key:'phase2-gate',lines:['FEDERAL UNIVERSITY OYE-EKITI'],footer:'PHASE 2 · MAIN CAMPUS ENTRANCE',stretch:2.3,background:'#174838',color:'#f5eedc'},
    {key:'gate-monument',lines:['FEDERAL UNIVERSITY','OYE-EKITI'],footer:'INNOVATION AND CHARACTER FOR NATIONAL TRANSFORMATION',stretch:1.6,background:'#f2ecdc',color:'#163b2b'},
    {key:'gate-safety',lines:['SPEED LIMIT','30 KM/H'],footer:'DRIVE SAFE · SLOW DOWN'},
    {key:'keke-park-1',lines:['CAMPUS KEKE & TAXI PARK'],footer:'SHUTTLE TO PHASE 1 · PHASE 2 · HOSTELS',stretch:2.2,background:'#dfae25',color:'#163b2b'},
    {key:'keke-park-2',lines:['PHASE 2 KEKE & TAXI STOP'],footer:'CAMPUS TRANSIT · SENATE · FACULTIES',stretch:2.2,background:'#174838',color:'#f5eedc'},
    {key:'phase1-mosque-sign',lines:['FUOYE CENTRAL MOSQUE'],footer:'PHASE 1 · PRAYER HALL & WUDU COURTYARD',stretch:2.2,background:'#174838',color:'#f5eedc'},
    ...[1,2,3].map(phase=>({key:'phase-'+phase,lines:['PHASE '+phase],footer:'CAMPUS GUIDE',background:'#184c3b',color:'#fff9dc'}))
  ],
  decorate({root,batch,m,signs,center,height,surfaceHeight,structureBounds,lamps,buildings,pickables,terrainClip,project,nearestRoad,groundSites,onRoad,blocked,ribbon}) {
    const sports=addPhaseOneSportsComplex(root,batch,m,center,height);
    structureBounds.push(...sports.obstacles);
    lamps.push(...sports.lamps);
    buildings.push(sports.building);
    pickables.push(sports.pickable);
    const mosque=addPhaseOneMosque(root,batch,m,signs,height);
    structureBounds.push(...mosque.obstacles);
    lamps.push(...mosque.lamps);
    buildings.push(mosque.building);
    pickables.push(mosque.pickable);
    const entrance=addCampusEntrance(batch,m,signs,center,height,terrainClip);
    structureBounds.push(...entrance.obstacles);
    const phase2Entrance=addPhaseTwoEntrance(batch,m,signs,center,height,terrainClip);
    structureBounds.push(...phase2Entrance.obstacles);
    const transit=addCampusTransitParks(root,batch,m,signs,height,surfaceHeight);
    structureBounds.push(...transit.obstacles);
    lamps.push(...transit.lamps);
    buildings.push(...transit.buildings);
    pickables.push(...transit.pickables);
    // App-added phase markers at the campus road edges; not surveyed existing signs.
    for(const [phase,lon,lat] of [[1,5.32144,7.78042],[2,5.31596,7.77855],[3,5.31165,7.77734]]){
      const p=project([lon,lat]),road=nearestRoad(p);if(!road.point)continue;
      const dx=p.x-road.point.x,dz=p.z-road.point.z,l=Math.hypot(dx,dz)||1,angle=Math.atan2(-dx,-dz);
      const q={x:road.point.x+dx/l*6,z:road.point.z+dz/l*6},y=height(q.x,q.z);
      signs.add(batch,'phase-'+phase,5.5,2,new THREE.Vector3(q.x,y+3,q.z),angle);
      for(const side of [-1,1]){const x=q.x+Math.cos(angle)*side*2.35,z=q.z-Math.sin(angle)*side*2.35;batch.cylinder(.065,.065,3,x,y+1.5,z,m.steel,5);structureBounds.push(new THREE.Box2(new THREE.Vector2(x-.1,z-.1),new THREE.Vector2(x+.1,z+.1)));}
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
    return {entrance, phase2Entrance, reserved: p => entrance.reserved(p)||phase2Entrance.reserved(p)||sports.reserved(p)||mosque.reserved(p)||transit.reserved(p), people: transit.peopleCount, parkingLots: transit.parkingLotsCount};
  },
  plant({features,center,batch,m,height,blocked,onRoad}) {
    return addPhaseOnePlanting(features,center,batch,m,height,p=>!blocked(p,2)&&!onRoad(p,1));
  },
};
