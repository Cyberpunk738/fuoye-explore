import './explorer.css';
import { escapeHtml, readNotes } from './data';
import type { Dataset } from './data';
import type { TerrainGrid } from './world/math';
import type { LandCover } from './world/vegetation';
import type { createExplorerScene } from './explorer-scene';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.className = 'app';
const compact = matchMedia('(max-width: 640px)').matches;
app.innerHTML = `
  <div id="scene" class="scene" aria-label="Interactive 3D model of FUOYE Oye campus"></div>
  <aside class="panel" aria-label="Campus building directory">
    <header><h1>FUOYE<span>.</span></h1><p class="where">Oye-Ekiti, Nigeria</p></header>
    <details class="list" ${compact ? '' : 'open'}><summary>Campus buildings</summary><ul id="building-list"></ul></details>
    <p class="hint">${matchMedia('(pointer: coarse)').matches ? 'Drag to turn, pinch to zoom. Tap open ground to center your view and set a starting point.' : 'Drag to orbit, right-drag to pan, scroll to zoom. Click open ground to move your view; click buildings to inspect. W to walk, D to drive.'}</p>
  </aside>
  <p class="credit">Map data © <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap contributors</a> / <a href="https://github.com/microsoft/GlobalMLBuildingFootprints" target="_blank" rel="noopener">Microsoft</a>. Elevation: <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain Tiles</a>. Trees: <a href="https://esa-worldcover.org/en/data-access" target="_blank" rel="noopener">ESA WorldCover</a>. <button id="about-open">About</button></p>
  <p class="loading" role="status">Building the campus…</p>
  <dialog id="about"><button class="dialog-close" aria-label="Close source notes">×</button><h2>FUOYE in 3D</h2><p>The campus uses mapped building footprints and roads, actual terrain elevations, and satellite-derived vegetation coverage from ESA WorldCover 2021 (10 m).</p><p>The scene covers Phases 1, 2 and 3. Named places are matched to Maps pins and visible compounds; a listing is not an official building survey. <span id="place-count">Named places have source records.</span> Smaller supporting structures remain visible in the scene.</p><p><a href="https://maps.app.goo.gl/yDcJm6EFjyrKhLUY6" target="_blank" rel="noopener">FUOYE on Google Maps ↗</a> · <a href="/data/campus-places.json" target="_blank">Building evidence ↗</a></p><p>Maps imagery was inspected on 10 October 2026; its capture date is unavailable. Reviewed building photos date from 2021–2022. The main gate uses a wide entrance photo and satellite alignment checked on 11 October 2026; dimensions and sculpture details are approximate. Building nameplates and phase markers are navigation aids added for this explorer. The visual pass refines photo-informed Management Sciences, hostel and Administration facades, and separates observed Phase 1 lawns. Hall details, planting, building aprons and park/path edging include inferred treatments. Tree species and individual planting positions are estimates. Roof outlines, grounds and paths traced from imagery are approximate. Unobserved heights and facade details remain estimates.</p><p><a href="/review.html">Open map & identification workspace ↗</a></p><p class="small">Interface and game interactions follow <a href="https://mount-alison-3d.vercel.app/" target="_blank" rel="noopener">Mount Allison in 3D</a>. This is an independent student project, not an official university map.</p></dialog>
`;

let scene: ReturnType<typeof createExplorerScene> | undefined;
let disposed=false;
const directory = document.querySelector<HTMLUListElement>('#building-list')!;
const buttons = new Map<string, HTMLButtonElement>();
function select(id: string) {
  buttons.forEach((button, key) => button.setAttribute('aria-current', String(key === id)));
}
const about = document.querySelector<HTMLDialogElement>('#about')!;
document.querySelector<HTMLButtonElement>('#about-open')!.onclick = () => about.showModal();
about.querySelector<HTMLButtonElement>('.dialog-close')!.onclick = () => about.close();
about.onclick = event => { if (event.target === about) about.close(); };

async function loadJson<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json() as Promise<T>;
}
async function start() {
  try {
    const [dataset, terrain, cover, module] = await Promise.all([
      loadJson<Dataset>('/data/campus.geojson'),
      loadJson<TerrainGrid>('/data/terrain.json').catch(() => undefined),
      loadJson<LandCover>('/data/landcover.json').catch(() => undefined),
      import('./explorer-scene'),
    ]);
    if(disposed)return;
    const placeCount=new Set(dataset.features.map(f=>f.properties.campus?.id).filter(Boolean)).size;
    document.querySelector('#place-count')!.textContent=`${placeCount} named places have source records.`;
    scene = module.createExplorerScene(document.querySelector('#scene')!, dataset.features, [5.3163,7.7772], readNotes(), select, terrain, cover);
    const buildings = [...scene.getBuildings()].filter(b=>b.directory).sort((a,b) => Number(b.named)-Number(a.named)||a.name.localeCompare(b.name,undefined,{numeric:true}));
    directory.innerHTML = '<li><button type="button" data-landmark="main-gate">Main gate · Phase 1</button></li>'+buildings.map(b => `<li><button type="button" data-building="${escapeHtml(b.id)}" aria-current="false" title="${escapeHtml(b.name)}">${escapeHtml(b.name)}</button></li>`).join('');
    directory.querySelector<HTMLButtonElement>('[data-landmark="main-gate"]')!.onclick=()=>scene?.gateView();
    directory.querySelectorAll<HTMLButtonElement>('[data-building]').forEach(button => {
      const id = button.dataset.building!;
      buttons.set(id,button);
      button.onclick = () => { select(id); scene?.focusFeature(id); if (compact) directory.closest('details')!.open = false; };
      button.onpointerenter = () => scene?.highlight(id);
      button.onpointerleave = () => scene?.highlight();
      button.onfocus = () => scene?.highlight(id);
      button.onblur = () => scene?.highlight();
    });
    app.querySelector('.loading')?.remove();
  } catch (error) {
    if(disposed)return;
    const loading = app.querySelector('.loading')!;
    loading.classList.add('load-error');
    loading.innerHTML = `<strong>Campus preview unavailable</strong><span>${escapeHtml(error instanceof Error ? error.message : 'The scene could not start.')}</span><a href="/review.html">Open the map workspace</a>`;
  }
}
function cleanup(){disposed=true;scene?.destroy();scene=undefined;}
function restore(event:PageTransitionEvent){if(event.persisted)location.reload();}
addEventListener('pagehide',cleanup,{once:true});
addEventListener('pageshow',restore);
if(import.meta.hot)import.meta.hot.dispose(()=>{removeEventListener('pagehide',cleanup);removeEventListener('pageshow',restore);cleanup();});
void start();
