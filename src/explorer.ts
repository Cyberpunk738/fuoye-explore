import './explorer.css';
import { escapeHtml, readNotes } from './data';
import type { Dataset } from './data';
import type { TerrainGrid } from './world/math';
import type { LandCover } from './world/vegetation';
import { campusOptions, campusFromSearch, loadCampus } from './campuses/registry';
import type { CampusId } from './campuses/registry';
import type { CampusExperience } from './campuses/types';
import { createCampusSession } from './campuses/session';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.className='app';
const compact=matchMedia('(max-width:640px)').matches;
const defaultCredits='Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> / <a href="https://github.com/microsoft/GlobalMLBuildingFootprints" target="_blank" rel="noopener">Microsoft</a>. Elevation: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles</a>. Trees: <a href="https://esa-worldcover.org/en/data-access" target="_blank" rel="noopener">ESA WorldCover</a>.';
app.innerHTML=`
  <div id="scene" class="scene" aria-label="Interactive campus explorer"></div>
  <aside class="panel" aria-label="Campus building directory">
    <header><h1>FUOYE<span>.</span></h1><p class="where"></p>
      <nav class="campus-switcher" aria-label="Choose campus">${campusOptions.map(c=>`<button type="button" data-campus="${c.id}" aria-pressed="false">${c.label}<span> campus</span></button>`).join('')}</nav>
    </header>
    <button type="button" class="tour-banner" id="start-guided-tour" disabled>
      <span class="tour-banner-kicker">EXPLORE THE CAMPUS</span><strong>Start Guided Campus Tour →</strong><small></small>
    </button>
    <details class="list" ${compact?'':'open'}><summary>Campus buildings</summary><ul id="building-list"></ul></details>
    <p class="hint">${matchMedia('(pointer:coarse)').matches?'Drag to turn, pinch to zoom. Tap open ground to choose a starting point.':'Drag to orbit, right-drag to pan, scroll to zoom. Click a building to inspect. T for tour, W to walk, D to drive.'}</p>
  </aside>
  <p class="credit"><span data-credits></span> <button id="about-open" type="button">About</button></p>
  <p id="load-status" class="loading" role="status"></p>
  <dialog id="about"><button class="dialog-close" aria-label="Close source notes">×</button><div data-about-content></div></dialog>
`;
const host=document.querySelector<HTMLDivElement>('#scene')!;
const directory=document.querySelector<HTMLUListElement>('#building-list')!;
const loading=document.querySelector<HTMLParagraphElement>('#load-status')!;
const about=document.querySelector<HTMLDialogElement>('#about')!;
const aboutButton=document.querySelector<HTMLButtonElement>('#about-open')!;
const tourButton=document.querySelector<HTMLButtonElement>('#start-guided-tour')!;
const buttons=new Map<string,HTMLButtonElement>();
let scene:CampusExperience|undefined, selected:CampusId=campusFromSearch(location.search),disposed=false;
function selectBuilding(id:string){buttons.forEach((button,key)=>button.setAttribute('aria-current',String(key===id)));}
function closeDirectory(){if(matchMedia('(max-width:640px)').matches)directory.closest('details')!.open=false;}
aboutButton.onclick=()=>about.showModal();
about.querySelector<HTMLButtonElement>('.dialog-close')!.onclick=()=>about.close();
about.onclick=event=>{if(event.target===about)about.close();};
tourButton.onclick=()=>{scene?.startTour(0);closeDirectory();};
async function loadJson<T>(path:string,signal:AbortSignal):Promise<T>{
  const response=await fetch(path,{signal});
  if(!response.ok)throw new Error(`Could not load ${path}`);
  return response.json() as Promise<T>;
}
const session=createCampusSession(async(id,signal)=>{
  const campus=await loadCampus(id as CampusId);
  signal.throwIfAborted();
  const [dataset,terrain,cover,module]=await Promise.all([
    loadJson<Dataset>(campus.data.buildings,signal),
    campus.data.terrain?loadJson<TerrainGrid>(campus.data.terrain,signal).catch(error=>{signal.throwIfAborted();return undefined;}):undefined,
    campus.data.landcover?loadJson<LandCover>(campus.data.landcover,signal).catch(error=>{signal.throwIfAborted();return undefined;}):undefined,
    import('./explorer-scene'),
  ]);
  if(dataset.metadata.campusId&&dataset.metadata.campusId!==id)throw new Error('Campus data does not match the selected campus.');
  return {campus,dataset,terrain,cover,module};
},async(id,{campus,dataset,terrain,cover,module},signal)=>{
  host.setAttribute('aria-label',`Interactive 3D model of FUOYE ${campus.name}`);
  let experience:CampusExperience;
  let fallback=false;
  try {
    experience=module.createExplorerScene(host,dataset.features,campus.center,readNotes(campus.id),selectBuilding,campus,terrain,cover);
  } catch(error) {
    if(!(error instanceof Error)||!/WebGL|graphics context/i.test(error.message))throw error;
    fallback=true;const {createCampusMap}=await import('./campus-map');
    signal.throwIfAborted();host.replaceChildren();
    experience=createCampusMap(host,dataset,campus,readNotes(campus.id),()=>{void openCampus(selected);});
  }
  if(signal.aborted){experience.destroy();return {destroy(){}};}
  scene=experience;aboutButton.disabled=false;app.dataset.experience=fallback?'map':'3d';
  host.setAttribute('aria-label',`Interactive ${fallback?'map':'3D model'} of FUOYE ${campus.name}`);
  app.querySelector('.hint')!.textContent=fallback?'Drag the map and zoom to explore. Choose a building to see its name and evidence notes.':matchMedia('(pointer:coarse)').matches?'Drag to turn, pinch to zoom. Tap open ground to choose a starting point.':'Drag to orbit, right-drag to pan, scroll to zoom. Click a building to inspect. T for tour, W to walk, D to drive.';
  document.title=`FUOYE Explore · ${campus.name}`;
  app.dataset.campus=campus.id;
  app.querySelector('.where')!.textContent=campus.location;
  tourButton.querySelector('small')!.textContent=campus.tour.summary;
  const tourStops=experience.getTourStops();
  tourButton.disabled=!tourStops.length;tourButton.hidden=fallback;
  tourButton.querySelector('strong')!.textContent=tourStops.length?'Start Guided Campus Tour →':'3D tour unavailable';
  app.querySelector('[data-credits]')!.innerHTML=campus.creditsHtml??defaultCredits;
  app.querySelector('[data-about-content]')!.innerHTML=campus.aboutHtml;
  const placeCount=new Set(dataset.features.map(f=>f.properties.campus?.id).filter(Boolean)).size;
  const count=app.querySelector('#place-count');if(count)count.textContent=`${placeCount} named places have source records.`;
  const buildings=experience.getBuildings().filter(b=>b.directory).sort((a,b)=>Number(b.named)-Number(a.named)||a.name.localeCompare(b.name,undefined,{numeric:true}));
  directory.innerHTML=(tourStops.length?`<li><button type="button" data-landmark="guided-tour">Guided tour · All ${tourStops.length} stops</button></li>`:'')+campus.landmarks.map(l=>`<li><button type="button" data-gate="${l.id}">${escapeHtml(l.label)}</button></li>`).join('')+buildings.map(b=>`<li><button type="button" data-building="${escapeHtml(b.id)}" aria-current="false" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</button></li>`).join('');
  directory.querySelector<HTMLButtonElement>('[data-landmark="guided-tour"]')?.addEventListener('click',()=>{experience.startTour(0);closeDirectory();});
  directory.querySelectorAll<HTMLButtonElement>('[data-gate]').forEach(button=>{button.onclick=()=>{experience.gateView(button.dataset.gate as 'main'|'phase2');closeDirectory();};});
  directory.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(button=>{
    const id=button.dataset.building!;buttons.set(id,button);
    button.onclick=()=>{selectBuilding(id);experience.focusFeature(id);closeDirectory();};
    button.onpointerenter=()=>experience.highlight(id);button.onpointerleave=()=>experience.highlight();
    button.onfocus=()=>experience.highlight(id);button.onblur=()=>experience.highlight();
  });
  return {destroy(){experience.destroy();if(scene===experience)scene=undefined;buttons.clear();}};
});
async function openCampus(id:CampusId,updateHistory=false){
  if(disposed)return;
  selected=id;
  if(updateHistory){const url=new URL(location.href);url.searchParams.set('campus',id);history.pushState({},'',url);}
  if(about.open)about.close();
  const result=session.select(id); // Releases the previous scene before loading.
  delete app.dataset.mode;delete app.dataset.night;
  buttons.clear();directory.replaceChildren();tourButton.disabled=true;tourButton.hidden=false;aboutButton.disabled=true;app.querySelector('[data-credits]')!.textContent='';
  app.querySelector('.where')!.textContent=id==='ikole'?'Ikole-Ekiti, Nigeria':'Oye-Ekiti, Nigeria';
  tourButton.querySelector('strong')!.textContent='Loading campus tour…';tourButton.querySelector('small')!.textContent='';
  app.querySelectorAll<HTMLButtonElement>('[data-campus]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.campus===id)));
  loading.hidden=false;loading.className='loading';loading.textContent=`Loading ${id==='ikole'?'Ikole':'Oye'} campus…`;
  app.setAttribute('aria-busy','true');
  try {
    if(await result){loading.hidden=true;loading.className='load-status';app.setAttribute('aria-busy','false');}
  } catch(error) {
    if(disposed)return;
    app.setAttribute('aria-busy','false');loading.className='loading load-error';
    loading.innerHTML=`<strong>Campus could not load</strong><span>${escapeHtml(error instanceof Error?error.message:'Please try again.')}</span><button type="button">Try again</button>`;
    loading.querySelector('button')!.onclick=()=>{void openCampus(selected);};
  }
}
app.querySelectorAll<HTMLButtonElement>('[data-campus]').forEach(button=>{button.onclick=()=>{if(button.dataset.campus!==selected)void openCampus(button.dataset.campus as CampusId,true);};});
function onHistory(){void openCampus(campusFromSearch(location.search));}
function cleanup(){disposed=true;session.dispose();}
function restore(event:PageTransitionEvent){if(event.persisted)location.reload();}
addEventListener('popstate',onHistory);addEventListener('pagehide',cleanup,{once:true});addEventListener('pageshow',restore);
if(import.meta.hot)import.meta.hot.dispose(()=>{removeEventListener('popstate',onHistory);removeEventListener('pagehide',cleanup);removeEventListener('pageshow',restore);cleanup();});
void openCampus(selected);
