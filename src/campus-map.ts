import * as L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { escapeHtml } from './data';
import type { Dataset, Notes } from './data';
import type { CampusDefinition, CampusExperience } from './campuses/types';

/** A local-data map keeps both campuses usable on browsers without WebGL. */
export function createCampusMap(host:HTMLElement,dataset:Dataset,campus:CampusDefinition,notes:Notes,retry:()=>void):CampusExperience {
  host.classList.add('map-fallback');
  const canvas=document.createElement('div');canvas.className='campus-map';canvas.setAttribute('aria-label',`${campus.name} map`);host.appendChild(canvas);
  const map=L.map(canvas,{zoomControl:false,attributionControl:false,maxZoom:21,minZoom:14,zoomSnap:.25,zoomDelta:.5}).setView([campus.center[1],campus.center[0]],16);
  const layers=new Map<string,L.Layer>();
  const directory=dataset.features.filter(f=>f.properties.kind==='building').map((f,index)=>({id:f.id,name:notes[f.id]?.name??f.properties.tags.name??`Building ${String(index+1).padStart(2,'0')}`,directory:f.properties.campus?.directory??true,named:!!f.properties.campus?.id}));
  const names=new Map(directory.map(b=>[b.id,b.name]));
  const overview=L.latLngBounds([]);
  const geometry=L.geoJSON(dataset as Parameters<typeof L.geoJSON>[0],{
    style:feature=>feature?.properties.kind==='road'?{color:'#c4b389',weight:feature.properties.tags.highway==='primary'?6:3,opacity:.9}:feature?.properties.kind==='land'?{color:feature.properties.tags['render:surface']==='grass'?'#437837':'#b29b79',fillColor:feature.properties.tags['render:surface']==='grass'?'#4d853e':'#c8b48d',fillOpacity:.6,weight:1}:{color:'#466b60',fillColor:feature?.properties.campus?.id?'#467e69':'#a6b9ab',fillOpacity:.85,weight:1},
    onEachFeature:(feature,layer)=>{
      layers.set(String(feature.id),layer);
      if(feature.properties.kind!=='building')return;
      if('getBounds'in layer)overview.extend((layer as L.Polygon).getBounds());
      const title=names.get(String(feature.id))??'Building';
      const note=feature.properties.campus?.identity==='pin-inside'?'This location matches the map listing. Building details and current services may need confirmation.':feature.properties.campus?.id?'This name identifies the surrounding compound. Exact wing assignments and building details are approximate.':'The outline is mapped, but this building’s identity has not been confirmed.';
      layer.bindPopup(`<strong>${escapeHtml(title)}</strong><p>${escapeHtml(note)}</p>`);
      if(feature.properties.campus?.id)layer.bindTooltip(title,{direction:'top'});
    },
  }).addTo(map);
  function fit(){const compact=host.clientWidth<=640;if(overview.isValid())map.fitBounds(overview.pad(.08),{paddingTopLeft:compact?[18,170]:[340,50],paddingBottomRight:compact?[18,210]:[30,110],maxZoom:18,animate:false});}
  for(const landmark of campus.landmarks)if(landmark.position){const [lon,lat]=landmark.position;L.circleMarker([lat,lon],{radius:5,color:'#8b1e2d',fillColor:'#fff7de',fillOpacity:1}).bindTooltip(landmark.label).addTo(map);}
  fit();
  const notice=document.createElement('div');notice.className='map-notice';notice.setAttribute('role','status');
  notice.innerHTML='<strong>Campus map</strong><span>3D is unavailable in this browser. Explore the mapped buildings here.</span><button type="button">Try 3D again</button>';
  notice.querySelector('button')!.onclick=retry;host.appendChild(notice);
  const controls=document.createElement('div');controls.className='tools map-tools';
  controls.innerHTML='<button type="button" data-map-zoom="in" aria-label="Zoom in">+</button><button type="button" data-map-zoom="out" aria-label="Zoom out">−</button><button type="button" class="full-view">Full view</button>';
  controls.querySelector('[data-map-zoom="in"]')!.addEventListener('click',()=>map.zoomIn());
  controls.querySelector('[data-map-zoom="out"]')!.addEventListener('click',()=>map.zoomOut());
  controls.querySelector('.full-view')!.addEventListener('click',fit);host.appendChild(controls);
  return {
    getBuildings:()=>directory,getTourStops:()=>[],startTour:()=>{},
    focusFeature(id){const layer=layers.get(id);if(!layer)return;if('getBounds'in layer)map.fitBounds((layer as L.Polygon).getBounds().pad(.8),{maxZoom:19,animate:false});layer.openPopup();},
    highlight(id){for(const building of directory){const layer=layers.get(building.id);if(layer instanceof L.Path)layer.setStyle({weight:building.id===id?3:1});}},
    gateView(which='main'){const position=campus.landmarks.find(l=>l.id===which)?.position;if(position)map.setView([position[1],position[0]],19,{animate:false});else fit();},
    destroy(){map.remove();host.classList.remove('map-fallback');host.replaceChildren();},
  };
}
