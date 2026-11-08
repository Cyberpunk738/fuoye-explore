import * as THREE from 'three';
import type { World } from '../../world/engine';
import type { TourStop } from '../../world/tour';

const stops = [
  {placeId:'ikole-engineering',title:'Faculty of Engineering',category:'Engineering',subtitle:'The Engineering compound and its gear-and-wrench landmark',description:'The northwestern academic cluster is identified on the map as the Faculty of Engineering. Its yellow gear and green wrench monument, turquoise base and tall white frontage columns are interpreted from a 2022 campus photograph.',note:'The monument is photo-informed. Its exact position, building dimensions and unseen elevations are approximate.',highlights:['Engineering compound','Gear & wrench monument'],direction:[.8,1]},
  {placeId:'ikole-library',title:'Central Library Building',category:'Library',subtitle:'A map-matched stop beside the academic spine',description:'The Central Library Building is labelled beside the north–south academic road. The model follows the roof outline visible beneath that map pin, with estimated floors and facade details.',note:'Check current signage for library services and access. Opening hours and facilities have not been verified.',highlights:['Central Library map pin','Academic spine'],direction:[1,.4]},
  {placeId:'ikole-hostel',title:'Student Hostel Complex',category:'Residence',subtitle:'The northeastern residential cluster',description:'Several mapped low-rise wings form the hostel compound in the northeast of this campus view. The location follows the School Hostel map listing; no gender allocation or hall name is assumed.',note:'Accommodation assignments and access rules should be confirmed with the university.',highlights:['Mapped residential wings','Northeastern campus'],direction:[.6,1]},
  {placeId:'ikole-new-faculty',title:'New Faculty Building',category:'Academic buildings',subtitle:'A distinctive roof cluster on the eastern loop',description:'This roof cluster is labelled “New Faculty Building” in the inspected map. Its irregular outline gives this part of the eastern loop a distinctive shape.',note:'The faculty identity and present use are unconfirmed. The explorer retains the general map label.',highlights:['Irregular mapped footprint','Eastern academic loop'],direction:[1,.7]},
  {placeId:'ikole-agriculture',title:'Faculty of Agriculture',category:'Agriculture',subtitle:'The U-shaped compound on the southern approach',description:'The Faculty of Agriculture map pin corresponds to the U-shaped compound just inside the southern campus approach. Its open courtyard and surrounding road loop are preserved in this reconstruction.',note:'The footprint is mapped; facade treatments, floor counts and entrance details remain estimates.',highlights:['U-shaped compound','Southern campus approach'],direction:[.7,1]},
  {placeId:'ikole-sports',title:'Ikole Sports Ground',category:'Sports',subtitle:'An open football ground with striped grass',description:'The sports ground sits west of the campus approach. The model shares Oye’s striped grass and white football markings on Ikole’s own approximate field footprint, with simple goal frames.',note:'The playing area is approximate. Grass is a requested visual treatment; source imagery shows earth.',highlights:['Striped grass and football markings','Open campus grounds'],direction:[1,.4]},
  {placeId:'ikole-environmental',title:'Environmental Faculty Building',category:'Environmental studies',subtitle:'The blue-roof cluster in the southwest',description:'The Environmental building map label sits on a blue-roofed group southwest of the academic core. A branching access road connects this area to the rest of campus.',note:'The main compound is matched to the map label; the ownership of supporting wings and facade details is inferred.',highlights:['Blue-roofed academic cluster','Southwestern campus'],direction:[.5,1]},
];

export function buildIkoleTourStops(world: World): TourStop[] {
  const gate=world.entrance;
  const target=gate.position.clone().add(new THREE.Vector3(0,3,0));
  const position=gate.approach.clone().add(new THREE.Vector3(12,14,12));
  position.y=Math.max(position.y,world.height(position.x,position.z)+10);
  const result:TourStop[]=[{
    id:'ikole-main-gate',stepNumber:1,phaseBadge:'Ikole · South entrance',category:'Gateway',title:'Ikole Campus Entrance',railLabel:'Entrance',
    subtitle:'The approach from Ifaki–Ikole–Omuo Road',
    description:'Enter the campus from the highway along the southern approach. The twin arches, sloping cream wings, yellow pillars and green gates follow a labelled 2021 Ikole photograph. Separate entry and exit lanes pass through both open arches and join the main approach on either side.',
    studentTip:'The frontage reference is from 2021. Dimensions and sculpture details are approximate. This is an independent reconstruction, not an official navigation map.',
    highlights:['Southern campus approach','Open gatehouse passage'],cameraPos:position,targetPos:target,
    walkSpawn:{x:gate.approach.x,z:gate.approach.z},orbitRadius:position.distanceTo(target),orbitHeight:position.y-target.y,baseAzimuth:Math.atan2(position.x-target.x,position.z-target.z),
  }];
  for(const record of stops) {
    const building=world.buildings.find(b=>b.placeId===record.placeId&&b.directory);
    if(!building)continue; // Never present a tour stop without a modelled destination.
    const size=building.bounds.getSize(new THREE.Vector2()),radius=Math.max(48,Math.max(size.x,size.y)*1.1);
    const direction=new THREE.Vector2(...record.direction as [number,number]).normalize();
    const target=building.position.clone().add(new THREE.Vector3(0,Math.max(3,building.height*.5),0));
    const x=target.x+direction.x*radius,z=target.z+direction.y*radius;
    const camera=new THREE.Vector3(x,Math.max(world.height(x,z)+16,building.position.y+radius*.65),z);
    result.push({id:record.placeId,stepNumber:result.length+1,phaseBadge:'Ikole campus',category:record.category,title:record.title,railLabel:record.title.replace('Faculty of ',''),subtitle:record.subtitle,description:record.description,studentTip:record.note,highlights:record.highlights,cameraPos:camera,targetPos:target,walkSpawn:{x:building.entrance.x,z:building.entrance.z},orbitRadius:camera.distanceTo(target),orbitHeight:camera.y-target.y,baseAzimuth:Math.atan2(camera.x-target.x,camera.z-target.z),buildingId:building.id});
  }
  return result;
}
