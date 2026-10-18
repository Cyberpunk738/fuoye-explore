import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './style.css';
import { escapeHtml as esc, landmarks, namingSource, paperSource, persistNotes, readNotes, validateNotes, mergeCampusDataset, featureSource } from './data';
import type { Dataset, Feature, Notes } from './data';
import type { createScene } from './scene';
import type { TerrainGrid } from './world/math';

const app = document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML = `
  <header class="topbar">
    <a class="brand" href="/" aria-label="FUOYE Campus Explorer home"><span class="brand-mark">F<span>✦</span></span><span>FUOYE<span class="brand-sub">CAMPUS EXPLORER</span></span></a>
    <div class="campus-label"><span class="pulse"></span> Oye-Ekiti, Nigeria <span class="divider">/</span> Oye campus</div>
    <span class="version">CAMPUS STUDY <span>02</span></span>
  </header>
  <main>
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-head"><div class="eyebrow">A CAMPUS, IN CONTEXT</div><h1>Explore<br>Oye campus.</h1><p>Walk the paths. Explore the buildings.<br>A reconstruction grounded in maps.</p></div>
      <div class="tabs" role="tablist" aria-label="Review panels"><button id="places-tab" role="tab" aria-selected="true">Landmarks</button><button id="notes-tab" role="tab" aria-selected="false">My notes <span id="note-count">0</span></button></div>
      <div class="search-wrap"><span aria-hidden="true">⌕</span><input id="search" type="search" aria-label="Search landmarks and notes" placeholder="Find a building or place…" /></div>
      <div class="list-intro" id="list-intro">Places to locate <span>12</span></div>
      <div class="place-list" id="place-list"></div>
      <div class="sidebar-footer"><span class="small-label">YOUR REVIEW WORKSPACE</span><div class="file-actions"><button id="export">↓ Export notes</button><button id="import">↑ Import notes</button></div><input id="import-file" type="file" accept="application/json,.json" hidden /><p>Notes stay in this browser. Export a copy to keep or share your work.</p></div>
    </aside>
    <section class="workspace" aria-label="Oye area review map">
      <div id="map" aria-label="Interactive review map"></div><div id="scene" hidden aria-label="3D campus architectural study"></div>
      <div class="map-toolbar"><div class="mode-switch" aria-label="View mode"><button id="map-mode" class="active" aria-pressed="true">◇ Map</button><button id="scene-mode" aria-pressed="false">◈ 3D campus</button></div><button id="overview" class="tool-button">↗ Overview</button></div>
      <button id="mobile-panel" class="tool-button mobile-panel">☰ Landmarks</button>
      <div class="area-tag"><span class="eyebrow">EXPLORATORY MAP</span><h2>Oye campus & surroundings</h2><p id="view-caption">Real building outlines. Identities to be checked.</p></div>
      <div class="layer-controls" id="layer-controls"><label><input id="basemap" type="checkbox" /> Street map</label><label><input id="buildings" type="checkbox" checked /> Building outlines</label><label><input id="roads" type="checkbox" checked /> Roads & paths</label></div>
      <div id="map-error" class="map-error" hidden></div>
      <div class="north" id="north" aria-hidden="true">N<span>↑</span></div>
      <div class="map-bottom"><div class="legend"><span><i class="unverified"></i>Unverified</span><span><i class="candidate"></i>Candidate</span><span><i class="identified"></i>Identified</span></div><span id="visible-count">Loading outlines…</span></div>
      <div class="scope-note">Campus boundary not yet verified · Surrounding town buildings are included</div>
      <div id="preview-credit" hidden>© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OSM contributors</a> · ODbL · <a href="https://github.com/microsoft/GlobalMLBuildingFootprints" target="_blank" rel="noopener">Microsoft</a> · CDLA 2.0 · <a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain: Mapzen / USGS</a></div>
      <section class="inspector" id="inspector" hidden aria-label="Building identification"><button id="close-inspector" class="close" aria-label="Close building details">×</button><div id="inspector-content"></div></section>
    </section>
  </main>
  <div class="toast" id="toast" role="status" hidden></div>
  <dialog id="reference-dialog"><button id="close-reference" class="close" aria-label="Close landmark reference">×</button><div id="reference-content"></div></dialog>
`;

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
let dataset: Dataset;
let notes: Notes = readNotes();
let selected: Feature | undefined;
let panel: 'landmarks' | 'notes' = 'landmarks';
let mode: 'map' | 'scene' = 'map';
let scene: ReturnType<typeof createScene> | undefined;
let sceneRequest = 0;
let sceneBounds = L.latLngBounds([[7.7727, 5.3089], [7.7832, 5.3238]]);
const terrainRequest = fetch('/data/terrain.json').then(r => r.ok ? r.json() as Promise<TerrainGrid> : undefined).catch(() => undefined);
let buildingLayer: L.GeoJSON | undefined;
let roadsLayer: L.GeoJSON | undefined;
const featuresById = new Map<string, Feature>();
const layersById = new Map<string, L.Path>();
const map = L.map('map', { center: [7.777, 5.3143], zoom: 17, preferCanvas: true, zoomControl: false, maxZoom: 20, minZoom: 12 });
L.control.zoom({ position: 'bottomright' }).addTo(map);
L.control.scale({ imperial: false, position: 'bottomleft' }).addTo(map);
map.attributionControl.setPrefix(false);
map.attributionControl.addAttribution('Data: <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap contributors · ODbL</a>');
map.attributionControl.addAttribution('<a href="https://github.com/microsoft/GlobalMLBuildingFootprints" target="_blank" rel="noopener">Microsoft footprints · CDLA Permissive 2.0</a>');
const tiles = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxNativeZoom: 19, maxZoom: 20 });
let tileFailed = false;
tiles.on('tileerror', () => { if (!tileFailed) { tileFailed = true; $('map-error').hidden = false; $('map-error').textContent = 'Street tiles could not load. The downloaded outlines still work; you can turn Street map off.'; } });
tiles.on('tileload', () => { if (tileFailed) { tileFailed = false; $('map-error').hidden = true; } });

let toastTimer: number;
function toast(message: string) { $('toast').textContent = message; $('toast').hidden = false; clearTimeout(toastTimer); toastTimer = window.setTimeout(() => $('toast').hidden = true, 4500); }
function style(f: Feature): L.PathOptions {
  const status = notes[f.id]?.status;
  const active = selected?.id === f.id;
  return { color: active ? '#112f26' : status === 'identified' ? '#1c7764' : status === 'candidate' ? '#b37d24' : '#708c7b', weight: active ? 3 : 1, fillColor: status === 'identified' ? '#38937a' : status === 'candidate' ? '#deb665' : '#8da99b', fillOpacity: active ? 0.85 : 0.58 };
}
function visibleBuildings() { const bounds = mode === 'scene' ? sceneBounds : map.getBounds(); return dataset.features.filter(f => f.properties.kind === 'building' && bounds.contains([f.properties.center[1], f.properties.center[0]])); }
function updateCount() {
  if (!dataset) return;
  $('visible-count').textContent = `${visibleBuildings().length.toLocaleString()} outlines in view`;
  $('note-count').textContent = String(Object.keys(notes).length);
}
function refreshStyles() { layersById.forEach((layer, id) => layer.setStyle(style(featuresById.get(id)!))); updateCount(); }

function renderList() {
  const query = $('search') as HTMLInputElement;
  const term = query.value.toLowerCase().trim();
  $('places-tab').setAttribute('aria-selected', String(panel === 'landmarks'));
  $('notes-tab').setAttribute('aria-selected', String(panel === 'notes'));
  if (panel === 'landmarks') {
    if (mode === 'scene') {
      const assets = scene?.getBuildings().filter(b => `${b.name} ${b.style} ${b.id}`.toLowerCase().includes(term)) ?? [];
      $('list-intro').innerHTML = `Explore the scene <span>${assets.length}</span>`;
      const sites = scene?.getSites().filter(s => s.name.toLowerCase().includes(term)) ?? [];
      $('place-list').innerHTML = sites.map(s => `<button class="place scene-place" data-scene-site="${esc(s.name)}"><span class="place-number">◇</span><span><strong>${esc(s.name)}</strong><small>Illustrative site layout</small></span><span class="place-arrow">↗</span></button>`).join('') + (assets.map((b, i) => `<button class="place scene-place" data-scene-building="${esc(b.id)}"><span class="place-number">${String(i + 1).padStart(2, '0')}</span><span><strong>${esc(b.name)}</strong><small>${esc(b.style)}</small><span class="place-state">${b.floors} storey study · identity ${notes[b.id] ? 'reviewed' : 'unverified'}</span></span><span class="place-arrow">↗</span></button>`).join('') || '<div class="empty">No matching buildings.</div>');
      $('place-list').querySelectorAll<HTMLButtonElement>('[data-scene-building]').forEach(button => button.onclick = () => { scene?.focusFeature(button.dataset.sceneBuilding!); $('sidebar').classList.remove('mobile-open'); });
      $('place-list').querySelectorAll<HTMLButtonElement>('[data-scene-site]').forEach(button => button.onclick = () => { scene?.focusSite(button.dataset.sceneSite!); $('sidebar').classList.remove('mobile-open'); });
      return;
    }
    const matched=dataset?.features.filter(f=>f.properties.kind==='building'&&f.properties.campus?.id&&f.properties.campus.directory&&`${f.properties.tags.name} ${f.id}`.toLowerCase().includes(term))??[];
    const items = landmarks.filter(l => `${l.name} ${l.alias}`.toLowerCase().includes(term));
    $('list-intro').innerHTML = `Mapped places & references <span>${matched.length+items.length}</span>`;
    $('place-list').innerHTML = matched.map(f=>`<button class="place" data-campus-building="${esc(f.id)}"><span class="place-number">◇</span><span><strong>${esc(f.properties.tags.name)}</strong><small>Phase ${f.properties.campus!.phase} · ${esc(f.properties.campus!.match??'research match')}</small><span class="place-state">Source record available</span></span><span class="place-arrow">↗</span></button>`).join('') + items.map(l => {
      const index = landmarks.indexOf(l);
      const matches = Object.entries(notes).filter(([, n]) => n.name === l.name);
      return `<button class="place" data-landmark="${index}"><span class="place-number">${String(index + 1).padStart(2, '0')}</span><span><strong>${esc(l.name)}</strong><small>${esc(l.alias)}</small><span class="place-state ${matches.length ? 'has-note' : ''}">${matches.length ? `${matches.length} review note${matches.length > 1 ? 's' : ''}` : 'Footprint to locate'}</span></span><span class="place-arrow">↗</span></button>`;
    }).join('') || '<div class="empty">No matching landmarks.</div>';
    $('place-list').querySelectorAll<HTMLButtonElement>('[data-campus-building]').forEach(button=>button.onclick=()=>{const f=featuresById.get(button.dataset.campusBuilding!)!;map.setView([f.properties.center[1],f.properties.center[0]],19);selectFeature(f);$('sidebar').classList.remove('mobile-open');});
    $('place-list').querySelectorAll<HTMLButtonElement>('[data-landmark]').forEach(button => button.onclick = () => showReference(Number(button.dataset.landmark)));
  } else {
    const items = Object.entries(notes).filter(([id, n]) => `${id} ${n.name}`.toLowerCase().includes(term));
    $('list-intro').innerHTML = `Saved identifications <span>${items.length}</span>`;
    $('place-list').innerHTML = items.map(([id, n]) => `<button class="place" data-note="${id}"><span class="note-dot ${n.status}"></span><span><strong>${esc(n.name)}</strong><small>${id.startsWith('local/') ? 'Observation' : id.startsWith('ms/') ? 'Microsoft' : 'OSM'} ${esc(id)}</small><span class="place-state">${n.status === 'identified' ? 'Identified by reviewer' : 'Candidate · needs checking'}</span></span><span class="place-arrow">↗</span></button>`).join('') || '<div class="empty"><span>Nothing saved yet.</span>Click a building outline to add its name and the evidence that identifies it.</div>';
    $('place-list').querySelectorAll<HTMLButtonElement>('[data-note]').forEach(button => button.onclick = async () => { const f = featuresById.get(button.dataset.note!); if (!f) return; await setMode('map'); map.setView([f.properties.center[1], f.properties.center[0]], 18); selectFeature(f); $('sidebar').classList.remove('mobile-open'); });
  }
}
function showReference(index: number) {
  const l = landmarks[index];
  const matches = Object.entries(notes).filter(([, n]) => n.name === l.name);
  $('reference-content').innerHTML = `<div class="eyebrow">LANDMARK REFERENCE</div><h2>${esc(l.name)}</h2><p class="alias">${esc(l.alias)}</p><div class="reference-clue">${esc(l.clue)}</div><p>Use this reference to locate a candidate footprint. These names and relationships do not establish a precise position.</p><a class="source-link" href="${l.source}" target="_blank" rel="noopener">Open reference source ↗</a><a class="source-link" href="${namingSource}" target="_blank" rel="noopener">Check naming announcement ↗</a><button class="primary" id="use-landmark">${selected ? 'Use this name for selected building' : 'Return to map to select a building'}</button>${matches.map(([id]) => `<button class="secondary" data-open-note="${id}">Open saved match · ${id}</button>`).join('')}`;
  $('use-landmark').onclick = () => { ($('reference-dialog') as HTMLDialogElement).close(); if (selected) { ($('building-name') as HTMLInputElement).value = l.name; } else toast('Choose a building outline, then add its name.'); $('sidebar').classList.remove('mobile-open'); };
  $('reference-content').querySelectorAll<HTMLButtonElement>('[data-open-note]').forEach(button => button.onclick = async () => { ($('reference-dialog') as HTMLDialogElement).close(); await setMode('map'); const f = featuresById.get(button.dataset.openNote!)!; map.setView([f.properties.center[1], f.properties.center[0]], 18); selectFeature(f); });
  ($('reference-dialog') as HTMLDialogElement).showModal();
}
function selectFeature(f: Feature) {
  if (f.properties.kind !== 'building') return;
  selected = f; refreshStyles();
  if (mode === 'scene') {
    const asset = scene?.getBuildings().find(b => b.id === f.id);
    if (asset) {
      $('inspector-content').innerHTML = `<div class="eyebrow">ARCHITECTURAL STUDY</div><h2>${esc(asset.name)}</h2><p class="scene-detail-copy">${esc(asset.style)}. The footprint is mapped; facade and roof details are illustrative.</p><div class="building-facts"><div><span>Footprint</span><strong>≈ ${Math.round(f.properties.area)} m²</strong></div><div><span>Model height</span><strong>${asset.height.toFixed(1)} m · estimated</strong></div></div><button id="focus-asset" class="primary">Explore this building</button><button id="review-asset" class="secondary">Identify on map</button>`;
      $('focus-asset').onclick = () => { scene?.focusFeature(f.id); $('inspector').hidden = true; };
      $('review-asset').onclick = async () => { await setMode('map'); map.setView([f.properties.center[1], f.properties.center[0]], 19); selectFeature(f); };
      $('inspector').hidden = false;
      return;
    }
  }
  const note = notes[f.id];
  const [lon, lat] = f.properties.center;
  const source=featureSource(f),sourceName=source.name,sourceUrl=source.url;
  $('inspector-content').innerHTML = `<div class="eyebrow">BUILDING OUTLINE</div><h2>${esc(note?.name ?? f.properties.tags.name ?? 'Which building is this?')}</h2><div class="status-badge ${note?.status ?? 'unverified'}">${note ? note.status === 'identified' ? 'Identified by reviewer' : 'Candidate identification' : 'Identity unverified'}</div><div class="building-facts"><div><span>Footprint area</span><strong>≈ ${Math.round(f.properties.area).toLocaleString()} m²</strong></div><div><span>Height</span><strong>Unknown</strong></div></div><p class="coords">${lat.toFixed(6)}° N, ${lon.toFixed(6)}° E · OSM ${esc(f.id)}</p><a class="source-link" href="https://www.openstreetmap.org/${f.id}" target="_blank" rel="noopener">Inspect original map feature ↗</a><form id="note-form"><label for="building-name">Building name</label><input id="building-name" list="landmark-names" maxlength="160" required placeholder="e.g. Main administration" value="${esc(note?.name ?? f.properties.tags.name ?? '')}" /><datalist id="landmark-names">${landmarks.map(l => `<option value="${esc(l.name)}"></option>`).join('')}</datalist><label for="identification-status">Identification</label><select id="identification-status"><option value="candidate" ${note?.status !== 'identified' ? 'selected' : ''}>Candidate · still needs checking</option><option value="identified" ${note?.status === 'identified' ? 'selected' : ''}>Identified · evidence checked</option></select><label for="evidence">Evidence / reference</label><textarea id="evidence" maxlength="2000" rows="3" placeholder="Photo URL, map source, or what you checked…">${esc(note?.evidence ?? f.properties.campus?.source ?? '')}</textarea><p class="form-help">An identified building needs evidence. This is your review record, not university verification.</p><button type="submit" class="primary">Save identification</button>${note ? '<button type="button" class="secondary" id="remove-note">Remove identification</button>' : ''}</form>`;
  $('inspector-content').querySelector('.coords')!.textContent = `${lat.toFixed(6)}° N, ${lon.toFixed(6)}° E · ${sourceName} · ${f.id}`;
  const sourceLink = $('inspector-content').querySelector<HTMLAnchorElement>('.source-link')!;
  sourceLink.href = sourceUrl;
  sourceLink.textContent = `Inspect ${sourceName} source ↗`;
  const evidence=document.createElement('div');evidence.className='reference-clue';
  const detail=document.createElement('p');detail.textContent=source.note;evidence.appendChild(detail);
  const campus=f.properties.campus;
  if(campus?.id){const match=document.createElement('p');match.textContent=`Research match: ${campus.match??campus.identity}. Checked ${campus.checkedOn??'date unrecorded'}. ${campus.note??'A listing match is not university verification.'}`;evidence.appendChild(match);if(campus.source?.startsWith('https://')){const link=document.createElement('a');link.href=campus.source;link.target='_blank';link.rel='noopener';link.textContent='Open place evidence ↗';evidence.appendChild(link);}if(campus.appearance?.evidence){const appearance=document.createElement('p');appearance.textContent=campus.appearance.evidence;evidence.appendChild(appearance);}}
  sourceLink.after(evidence);
  $('inspector').hidden = false;
  $('note-form').onsubmit = async event => {
    event.preventDefault();
    const name = ($('building-name') as HTMLInputElement).value.trim();
    const status = ($('identification-status') as HTMLSelectElement).value as 'candidate' | 'identified';
    const evidence = ($('evidence') as HTMLTextAreaElement).value.trim();
    if (!name) return;
    if (status === 'identified' && !evidence) { toast('Add the evidence you checked before marking this identified.'); $('evidence').focus(); return; }
    const next = { ...notes, [f.id]: { name, status, evidence, updatedAt: new Date().toISOString() } };
    try { persistNotes(next); notes = next; } catch { toast('Could not save in this browser. Storage may be full or disabled.'); return; }
    renderList(); selectFeature(f); toast('Identification saved in this browser.'); if (mode === 'scene') await rebuildScene();
  };
  if (note) $('remove-note').onclick = async () => { const next = { ...notes }; delete next[f.id]; try { persistNotes(next); notes = next; } catch { toast('Could not update browser storage.'); return; } renderList(); selectFeature(f); toast('Identification removed.'); if (mode === 'scene') await rebuildScene(); };
}
function closeInspector() { selected = undefined; $('inspector').hidden = true; refreshStyles(); }
async function rebuildScene() {
  const request = ++sceneRequest;
  scene?.destroy(); scene = undefined;
  $('scene').textContent = 'Building the campus scene…';
  try {
    const [{ createScene }, terrain] = await Promise.all([import('./scene'), terrainRequest]);
    if (request !== sceneRequest || mode !== 'scene') return;
    const bounds = sceneBounds;
    const buildings = visibleBuildings();
    if (!buildings.length) throw new Error('No building outlines in this view. Return to Map and choose a mapped area.');
    const subset = dataset.features.filter(f => f.properties.kind === 'building' ? bounds.contains([f.properties.center[1], f.properties.center[0]]) : f.geometry.type === 'LineString' && f.geometry.coordinates.some(c => bounds.contains([c[1], c[0]])));
    $('scene').replaceChildren();
    const center = bounds.getCenter();
    scene = createScene($('scene'), subset, [center.lng, center.lat], notes, id => selectFeature(featuresById.get(id)!), terrain);
    renderList(); updateCount();
  } catch (error) {
    if (request !== sceneRequest) return;
    $('scene').innerHTML = `<div class="scene-error"><h2>Preview unavailable</h2><p>${esc(error instanceof Error ? error.message : 'Your browser could not initialise 3D graphics.')}</p><button id="return-map" class="primary">Return to map</button></div>`;
    $('return-map').onclick = () => setMode('map');
  }
}
function loadMapLayers() {
  if (!dataset || buildingLayer) return;
    buildingLayer = L.geoJSON(dataset.features.filter(f => f.properties.kind === 'building') as never, {
      style: feature => style(feature as unknown as Feature),
      onEachFeature: (feature, layer) => { const f = feature as unknown as Feature; layersById.set(f.id, layer as L.Path); layer.on('click', () => selectFeature(f)); },
    }).addTo(map);
    roadsLayer = L.geoJSON(dataset.features.filter(f => f.properties.kind === 'road') as never, { style: { color: '#c09c65', weight: 2, opacity: 0.75 } }).addTo(map);
  if (!($('buildings') as HTMLInputElement).checked) map.removeLayer(buildingLayer);
  if (!($('roads') as HTMLInputElement).checked) map.removeLayer(roadsLayer);
  if (($('basemap') as HTMLInputElement).checked) tiles.addTo(map);
}
function releaseMapLayers() {
  if (buildingLayer) { map.removeLayer(buildingLayer); buildingLayer.clearLayers(); }
  if (roadsLayer) { map.removeLayer(roadsLayer); roadsLayer.clearLayers(); }
  buildingLayer = roadsLayer = undefined;
  layersById.clear();
  map.removeLayer(tiles);
}
async function setMode(next: 'map' | 'scene', keepArea = false) {
  if (next === 'scene' && mode === 'map' && !keepArea && map.getSize().x > 0) sceneBounds = map.getBounds();
  mode = next;
  document.querySelector('.workspace')!.classList.toggle('scene-active', next === 'scene');
  document.querySelector('.scope-note')!.textContent = next === 'scene' ? 'Mapped campus area · architecture & site details illustrative' : 'Campus boundary not yet verified · Surrounding town buildings are included';
  document.querySelector('.area-tag .eyebrow')!.textContent = next === 'scene' ? 'EXPLORE OYE' : 'EXPLORATORY MAP';
  $('places-tab').textContent = next === 'scene' ? 'Buildings' : 'Landmarks';
  $('mobile-panel').textContent = next === 'scene' ? '☰ Buildings' : '☰ Landmarks';
  $('north').hidden = next === 'scene';
  $('map').hidden = next === 'scene'; $('scene').hidden = next !== 'scene'; $('preview-credit').hidden = next !== 'scene'; $('layer-controls').hidden = next === 'scene';
  $('map-mode').classList.toggle('active', next === 'map'); $('scene-mode').classList.toggle('active', next === 'scene');
  $('map-mode').setAttribute('aria-pressed', String(next === 'map')); $('scene-mode').setAttribute('aria-pressed', String(next === 'scene'));
  $('view-caption').textContent = next === 'map' ? 'Real building outlines. Identities to be checked.' : 'Photo-informed architecture · estimated details · drag to explore';
  closeInspector();
  if (next === 'scene') { releaseMapLayers(); await rebuildScene(); } else { ++sceneRequest; scene?.destroy(); scene = undefined; map.invalidateSize(); loadMapLayers(); renderList(); }
}
$('search').oninput = renderList;
$('places-tab').onclick = () => { panel = 'landmarks'; renderList(); };
$('notes-tab').onclick = () => { panel = 'notes'; renderList(); };
$('close-inspector').onclick = closeInspector;
$('close-reference').onclick = () => ($('reference-dialog') as HTMLDialogElement).close();
$('reference-dialog').onclick = event => { if (event.target === $('reference-dialog')) ($('reference-dialog') as HTMLDialogElement).close(); };
document.addEventListener('keydown', event => { if (event.key === 'Escape') { closeInspector(); $('sidebar').classList.remove('mobile-open'); } });
$('map-mode').onclick = () => setMode('map');
$('scene-mode').onclick = () => setMode('scene');
$('overview').onclick = () => { if (mode === 'scene') scene?.reset(); else map.fitBounds([[7.765, 5.300], [7.810, 5.350]], { padding: [50, 50] }); };
$('mobile-panel').onclick = () => $('sidebar').classList.toggle('mobile-open');
$('basemap').onchange = () => { if (($('basemap') as HTMLInputElement).checked) tiles.addTo(map); else { map.removeLayer(tiles); $('map-error').hidden = true; } };
$('buildings').onchange = () => { if (!buildingLayer) return; if (($('buildings') as HTMLInputElement).checked) buildingLayer.addTo(map); else map.removeLayer(buildingLayer); };
$('roads').onchange = () => { if (!roadsLayer) return; if (($('roads') as HTMLInputElement).checked) roadsLayer.addTo(map); else map.removeLayer(roadsLayer); };
$('export').onclick = () => {
  const content = { schemaVersion: 1, exportedAt: new Date().toISOString(), source: 'FUOYE Oye campus review', notes };
  const url = URL.createObjectURL(new Blob([JSON.stringify(content, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a'); a.href = url; a.download = 'fuoye-oye-identifications.json'; a.click(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  toast(`Exported ${Object.keys(notes).length} identification notes.`);
};
$('import').onclick = () => ($('import-file') as HTMLInputElement).click();
$('import-file').onchange = async () => {
  const input = $('import-file') as HTMLInputElement; const file = input.files?.[0]; if (!file) return;
  try {
    if (!dataset) throw new Error('Wait for the map data to load.');
    if (file.size > 5_000_000) throw new Error('Notes file is too large.');
    const value = JSON.parse(await file.text()); if (value.schemaVersion !== 1) throw new Error('Unsupported notes format.');
    const incoming = validateNotes(value.notes);
    for (const id of Object.keys(incoming)) if (featuresById.get(id)?.properties.kind !== 'building') throw new Error(`Building ${id} is not in this dataset.`);
    // Existing notes win; importing a backup never silently replaces current work.
    const merged = { ...incoming, ...notes }; persistNotes(merged); notes = merged;
    renderList(); refreshStyles(); if (selected) selectFeature(selected); if (mode === 'scene') await rebuildScene(); toast('Notes imported. Existing identifications were kept.');
  } catch (error) { toast(error instanceof Error ? error.message : 'Could not import notes.'); }
  input.value = '';
};
map.on('moveend', updateCount);
renderList();
$('scene-mode',).setAttribute('disabled', '');
async function start() {
  try {
    const responses=await Promise.all([fetch('/data/oye.geojson'),fetch('/data/campus.geojson')]);
    if(responses.some(r=>!r.ok))throw new Error('Map data could not be loaded.');
    const [area,campus]=await Promise.all(responses.map(r=>r.json() as Promise<Dataset>));
    dataset=mergeCampusDataset(area,campus);
    dataset.features.forEach(f => featuresById.set(f.id, f));
    loadMapLayers();renderList();updateCount(); $('scene-mode').removeAttribute('disabled');
  } catch (error) { $('map-error').hidden = false; $('map-error').textContent = error instanceof Error ? error.message : 'Could not load the review map.'; $('visible-count').textContent = 'Data unavailable'; }
}
void start();


