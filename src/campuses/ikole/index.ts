import type { CampusDefinition } from '../types';
import { ikoleWorldProfile, ikoleGate } from './world';
import { buildIkoleTourStops } from './tour';

export const ikoleCampus: CampusDefinition = {
  id:'ikole',name:'Ikole campus',location:'Ikole-Ekiti, Nigeria',center:[5.4957,7.805],
  data:{buildings:'/data/ikole/campus.geojson',terrain:'/data/ikole/terrain.json',landcover:'/data/ikole/landcover.json',requiredFeatures:['local/ikole-gate-entry','local/ikole-gate-exit']},
  world:ikoleWorldProfile,
  tour:{summary:'Entrance · Engineering · Library · Agriculture · Sports · Environmental',buildStops:buildIkoleTourStops},
  landmarks:[{id:'main',label:'Ikole campus entrance',position:ikoleGate}],
  creditsHtml:'Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a>. Elevation: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles</a>. Trees: <a href="https://esa-worldcover.org/en/data-access" target="_blank" rel="noopener">ESA WorldCover</a>.',
  aboutHtml:`<h2>Ikole, in three dimensions</h2>
    <p>Explore the academic core and southern campus approach. <span id="place-count">Named places have source records.</span> Building outlines combine OpenStreetMap with approximate visual traces. Roads and the entrance alignment follow the satellite view inspected on 8 November 2026.</p>
    <p>The Engineering gear-and-wrench monument and white columns are informed by a February 2022 photograph. Most building heights, floors, facades, individual trees and gate dimensions are estimates. The twin-arch entrance follows <a href="https://campusreporter.africa/ekiti-communities-sue-for-peace-despite-controversies-surrounding-the-establishment-of-fuoye/" target="_blank" rel="noopener">Samuel Ajala’s labelled 2021 Ikole photograph</a>. Maps labels identify compounds but do not certify current occupancy. Imagery capture dates are unavailable; the displayed copyright year is not its capture date.</p>
    <p>The sports field uses Oye’s grass and football markings as a requested visual treatment; source imagery shows earth. Unnamed buildings remain numbered. The scene extent is not an official university boundary.</p>
    <p><a href="https://maps.app.goo.gl/2Gt5Y47yTNwXkimb6" target="_blank" rel="noopener">Campus reference on Google Maps ↗</a> · <a href="/data/ikole/campus-places.json" target="_blank">Building evidence ↗</a></p>
    <p class="small">Independent student project. This is an approximate campus reconstruction, not an official university map or surveyed digital twin.</p>`,
};
