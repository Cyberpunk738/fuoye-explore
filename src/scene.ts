import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import type { Feature, Notes, Position } from './data';
import { escapeHtml } from './data';
import { buildWorld } from './world/build';
import type { BuildingAsset } from './world/build';
import type { TerrainGrid } from './world/math';
import { nearestPoint } from './world/math';
import { makeVehicle } from './world/actors';
import { vehicleStep, walkingStep } from './world/navigation';
import { createRenderLoop } from './world/render-loop';

export function createScene(host:HTMLElement,features:Feature[],center:Position,notes:Notes,onSelect:(id:string)=>void,terrain?:TerrainGrid){
  let renderLoop:ReturnType<typeof createRenderLoop>|undefined;
  const invalidate=()=>renderLoop?.invalidate();
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power'});
  renderer.setPixelRatio(.75);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
  renderer.shadowMap.enabled=false;renderer.domElement.tabIndex=0;renderer.domElement.setAttribute('aria-label','Interactive 3D Oye campus');host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#d4e2dc');scene.fog=new THREE.Fog('#d4e2dc',1300,3200);
  const world=buildWorld(features,center,notes,terrain);scene.add(world.root);
  const camera=new THREE.PerspectiveCamera(43,1,.15,8000),controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=false;controls.maxPolarAngle=Math.PI/2.08;controls.minDistance=8;controls.maxDistance=2200;
  const hemi=new THREE.HemisphereLight('#fff9e9','#566c49',2.2);scene.add(hemi);
  const mid=world.cameraBounds.getCenter(new THREE.Vector2()),extent=world.cameraBounds.getSize(new THREE.Vector2());
  const sun=new THREE.DirectionalLight('#ffeed7',3);sun.position.set(mid.x-300,500,mid.y+240);sun.target.position.set(mid.x,0,mid.y);scene.add(sun,sun.target);
  const starsGeo=new THREE.BufferGeometry(),starPositions:number[]=[];for(let i=0;i<600;i++){const angle=i*2.399963,yy=.15+(i%80)/95,r=Math.sqrt(1-yy*yy)*3200;starPositions.push(mid.x+Math.cos(angle)*r,yy*3200,mid.y+Math.sin(angle)*r);}starsGeo.setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3));const stars=new THREE.Points(starsGeo,new THREE.PointsMaterial({color:'#e1e8ff',size:2.5,sizeAttenuation:true}));stars.visible=false;scene.add(stars);
  let night=false,navMode:'orbit'|'walk'|'drive'='orbit',yaw=0,pitch=0,speed=0,tour=false,tourIndex=0,tourTime=0;
  const vehicle=makeVehicle(world.materials,1);vehicle.visible=false;scene.add(vehicle);
  const player=new THREE.Vector3();
  const ui=document.createElement('div');ui.className='explore-controls';ui.innerHTML=`<div class="explore-bar"><button data-view="orbit" aria-pressed="true">◈ Orbit</button><button data-view="walk" aria-pressed="false">Walk</button><button data-view="drive" aria-pressed="false">Drive</button><span class="control-divider"></span><button data-action="tour" aria-pressed="false">Tour</button><button data-action="night" aria-pressed="false">☾ Night</button><button data-action="pause" aria-pressed="false">Pause</button></div><div class="explore-help" role="status"></div><div class="touch-nav" hidden><button data-key="w" aria-label="Move forward">↑</button><div><button data-key="a" aria-label="Move left">←</button><button data-key="s" aria-label="Move backward">↓</button><button data-key="d" aria-label="Move right">→</button></div></div>`;host.appendChild(ui);
  const info=document.createElement('div');info.className='world-info';info.innerHTML=`<span class="world-info-title">OYE / IN 3D · LIGHTWEIGHT</span><span>${world.stats.buildings} mapped outlines · ${world.stats.trees.toLocaleString()} trees</span><details><summary>Scene sources & accuracy</summary><p>Footprints and roads: OpenStreetMap / Microsoft. ${terrain?'Elevation: Mapzen Terrain Tiles / USGS, at actual vertical scale.':'Elevation unavailable: flat fallback.'} Building designs, paths, parking, vegetation and street objects are illustrative reconstructions. They are not surveyed locations.</p><a href="https://businessday.ng/education/article/fuoye-not-open-for-academic-activities-yet-fasina/" target="_blank" rel="noopener">Campus photo reference ↗</a><a href="https://registry.opendata.aws/terrain-tiles/" target="_blank" rel="noopener">Terrain source ↗</a></details>`;host.appendChild(info);
  const label=document.createElement('div');label.className='scene-label';label.hidden=true;host.appendChild(label);
  const positionIndicator=document.createElement('div');positionIndicator.className='navigation-readout';positionIndicator.hidden=true;host.appendChild(positionIndicator);
  const keys=new Set<string>();
  const listeners: (()=>void)[]=[];
  function listen(target:EventTarget,type:string,handler:EventListener,options?:AddEventListenerOptions){const wrapped:EventListener=e=>{handler(e);invalidate();};target.addEventListener(type,wrapped,options);listeners.push(()=>target.removeEventListener(type,wrapped,options));}
  function help(){ui.querySelector('.explore-help')!.textContent=navMode==='orbit'?(tour?'Campus tour · choose any building to stop':'Drag to orbit · right-drag to pan · scroll to zoom · click a building'):navMode==='walk'?'Drag to look · WASD / arrows to walk · Shift to run · Esc to orbit':'W / ↑ accelerate · S / ↓ reverse · A D steer · Space brake · Esc to orbit';ui.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===navMode)));(ui.querySelector('.touch-nav')as HTMLElement).hidden=navMode==='orbit';positionIndicator.hidden=navMode==='orbit';}
  type Transition={from:THREE.Vector3;to:THREE.Vector3;targetFrom:THREE.Vector3;targetTo:THREE.Vector3;t:number;};let transition:Transition|undefined;
  function fly(position:THREE.Vector3,target:THREE.Vector3){transition={from:camera.position.clone(),to:position,targetFrom:controls.target.clone(),targetTo:target,t:0};invalidate();}
  function orbit(){navMode='orbit';speed=0;keys.clear();vehicle.visible=false;controls.enabled=true;controls.enableZoom=controls.enablePan=true;controls.maxPolarAngle=Math.PI/2.08;help();}
  function reset(){tour=false;ui.querySelector('[data-action="tour"]')!.setAttribute('aria-pressed','false');orbit();const e=Math.max(extent.x,extent.y);const target=new THREE.Vector3(mid.x,world.height(mid.x,mid.y),mid.y);fly(new THREE.Vector3(mid.x+e*.35,target.y+e*.6,mid.y+e*.68),target);}
  function buildingCamera(b:BuildingAsset,distance:number){const front=b.entrance.clone().sub(b.position);front.y=0;front.normalize();const side=new THREE.Vector3(-front.z,0,front.x);return b.position.clone().addScaledVector(front,distance).addScaledVector(side,distance*.6).add(new THREE.Vector3(0,distance*.65,0));}
  function focusFeature(id:string){const b=world.buildings.find(b=>b.id===id);if(!b)return;tour=false;ui.querySelector('[data-action="tour"]')!.setAttribute('aria-pressed','false');orbit();const p=b.position;const size=b.bounds.getSize(new THREE.Vector2());const distance=Math.max(42,Math.max(size.x,size.y)*1.25);fly(buildingCamera(b,distance),p.clone().add(new THREE.Vector3(0,b.height*.5,0)));}
  function focusSite(name:string){const site=world.sites.find(s=>s.name===name);if(!site)return;tour=false;tourButton.setAttribute('aria-pressed','false');orbit();fly(site.position.clone().add(new THREE.Vector3(55,65,85)),site.position);}
  function closestSpawn(){const focus=world.focus?.entrance??new THREE.Vector3(mid.x,0,mid.y);let best=Infinity,point={x:focus.x,z:focus.z},direction=0;for(const r of world.roads){if(r.width<4)continue;const q=nearestPoint({x:focus.x,z:focus.z},r.a,r.b),dist=Math.hypot(q.x-focus.x,q.z-focus.z);if(dist<best&&!world.blocked(q,2)){best=dist;point=q;direction=Math.atan2(r.b.x-r.a.x,r.b.z-r.a.z);}}return {point,direction};}
  function enter(mode:'walk'|'drive'){tour=false;transition=undefined;ui.querySelector('[data-action="tour"]')!.setAttribute('aria-pressed','false');navMode=mode;controls.enabled=false;keys.clear();speed=0;pitch=0;const spawn=closestSpawn();player.set(spawn.point.x,world.height(spawn.point.x,spawn.point.z),spawn.point.z);yaw=spawn.direction;if(mode==='drive')camera.position.copy(player).add(new THREE.Vector3(-Math.sin(yaw)*10,5,-Math.cos(yaw)*10));vehicle.visible=mode==='drive';renderer.domElement.focus();help();}
  ui.querySelectorAll<HTMLButtonElement>('[data-view]').forEach(button=>button.onclick=()=>{const mode=button.dataset.view;if(mode==='orbit')reset();else enter(mode as 'walk'|'drive');});
  const nightButton=ui.querySelector<HTMLButtonElement>('[data-action="night"]')!;
  nightButton.onclick=()=>{night=!night;nightButton.setAttribute('aria-pressed',String(night));nightButton.textContent=night?'☀ Day':'☾ Night';hemi.intensity=night?.65:2.2;hemi.color.set(night?'#829ccf':'#fff9e9');sun.intensity=night?.7:3;sun.color.set(night?'#c2d3ff':'#ffeed7');stars.visible=night;scene.background=new THREE.Color(night?'#101d31':'#d4e2dc');scene.fog=new THREE.Fog(night?'#101d31':'#d4e2dc',1300,3200);world.materials.windows.emissiveIntensity=night?1.4:0;world.materials.glow.emissiveIntensity=night?3:0;renderer.toneMappingExposure=night?1.4:1.1;invalidate();};
  const tourStops=world.buildings.filter(b=>b.height>5).sort((a,b)=>b.bounds.getSize(new THREE.Vector2()).length()-a.bounds.getSize(new THREE.Vector2()).length()).slice(0,6);
  const tourButton=ui.querySelector<HTMLButtonElement>('[data-action="tour"]')!;
  function tourStop(b:BuildingAsset){const distance=Math.max(70,b.bounds.getSize(new THREE.Vector2()).length());fly(buildingCamera(b,distance),b.position.clone().add(new THREE.Vector3(0,b.height/2,0)));label.innerHTML=`<strong>${escapeHtml(b.name)}</strong><small>${escapeHtml(b.style)} · estimated architecture</small>`;label.hidden=false;label.style.left='50%';label.style.top='18%';}
  tourButton.onclick=()=>{if(tour){reset();return;}orbit();tour=true;tourIndex=0;tourTime=0;label.hidden=false;if(tourStops[0])tourStop(tourStops[0]);tourButton.setAttribute('aria-pressed','true');help();};
  ui.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(button=>{const key=button.dataset.key!;listen(button,'pointerdown',((e:PointerEvent)=>{e.preventDefault();button.setPointerCapture(e.pointerId);keys.add(key);})as EventListener);for(const type of['pointerup','pointercancel','lostpointercapture'])listen(button,type,(()=>keys.delete(key))as EventListener);});
  listen(window,'keydown',((e:KeyboardEvent)=>{if(navMode==='orbit'||!(host.contains(document.activeElement)))return;if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement||e.target instanceof HTMLSelectElement)return;const key=e.key.length===1?e.key.toLowerCase():e.key;if(key==='Escape'){reset();return;}if(['w','a','s','d','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Shift',' '].includes(key)){keys.add(key);e.preventDefault();}})as EventListener);
  listen(window,'keyup',((e:KeyboardEvent)=>{keys.delete(e.key.length===1?e.key.toLowerCase():e.key);})as EventListener);listen(window,'blur',(()=>{keys.clear();speed=0;})as EventListener);
  let down={x:0,y:0},pointer:number|undefined,last={x:0,y:0};const raycaster=new THREE.Raycaster();
  const selectionOutline=new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(1,1,1)),new THREE.LineBasicMaterial({color:'#d8ba6c',transparent:true,opacity:.8}));selectionOutline.visible=false;scene.add(selectionOutline);
  let lastHover=0;
  function pick(e:PointerEvent){const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return raycaster.intersectObjects(world.pickables)[0];}
  listen(renderer.domElement,'pointerdown',((e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};last=down;pointer=e.pointerId;if(navMode!=='orbit')renderer.domElement.setPointerCapture(e.pointerId);else{transition=undefined;if(tour){tour=false;tourButton.setAttribute('aria-pressed','false');help();}}})as EventListener);
  listen(renderer.domElement,'pointermove',((e:PointerEvent)=>{if(navMode!=='orbit'&&pointer===e.pointerId){yaw-=(e.clientX-last.x)*.004;pitch=THREE.MathUtils.clamp(pitch-(e.clientY-last.y)*.003,-.75,.65);last={x:e.clientX,y:e.clientY};return;}if(navMode!=='orbit'||tour)return;const now=performance.now();if(now-lastHover<100)return;lastHover=now;const hit=pick(e);if(hit){const b=world.buildings.find(b=>b.id===hit.object.userData.id)!;label.innerHTML=`<strong>${escapeHtml(b.name)}</strong><small>${b.floors} storey study · click to inspect</small>`;const r=host.getBoundingClientRect();label.style.left=`${THREE.MathUtils.clamp(e.clientX-r.left,90,r.width-100)}px`;label.style.top=`${e.clientY-r.top-65}px`;label.hidden=false;renderer.domElement.style.cursor='pointer';}else{label.hidden=true;renderer.domElement.style.cursor='grab';}})as EventListener);
  listen(renderer.domElement,'pointerup',((e:PointerEvent)=>{pointer=undefined;if(navMode!=='orbit'||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5)return;const hit=pick(e);if(hit){const b=world.buildings.find(b=>b.id===hit.object.userData.id)!;const size=b.bounds.getSize(new THREE.Vector2());selectionOutline.position.copy(b.position).add(new THREE.Vector3(0,b.height/2,0));selectionOutline.scale.set(size.x+.5,b.height+.3,size.y+.5);selectionOutline.visible=true;onSelect(b.id);}})as EventListener);
  listen(renderer.domElement,'pointercancel',(()=>{pointer=undefined;keys.clear();})as EventListener);
  const fps=document.createElement('span');fps.className='scene-fps';host.appendChild(fps);
  let paused=false,onScreen=true,hidden=document.hidden;
  const resize=()=>{const {width,height}=host.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;camera.updateProjectionMatrix();renderer.setPixelRatio(Math.min(.75,960/width,540/height));renderer.setSize(width,height);invalidate();};const observer=new ResizeObserver(resize);observer.observe(host);resize();
  reset();
  if(world.focus){const p=world.focus.position;camera.position.set(p.x+270,p.y+295,p.z+350);controls.target.copy(p).add(new THREE.Vector3(45,0,-30));}
  transition=undefined;controls.update();help();
  const updateActive=()=>renderLoop?.setActive(!paused&&!hidden&&onScreen);
  listen(document,'visibilitychange',(()=>{hidden=document.hidden;keys.clear();speed=0;updateActive();})as EventListener);
  function movePlayer(dt:number){const forward=keys.has('w')||keys.has('ArrowUp'),back=keys.has('s')||keys.has('ArrowDown'),left=keys.has('a')||keys.has('ArrowLeft'),right=keys.has('d')||keys.has('ArrowRight');let dx=0,dz=0;
    const input={forward,back,left,right,run:keys.has('Shift'),brake:keys.has(' ')};
    if(navMode==='walk'){const step=walkingStep(yaw,input,dt);dx=step.x;dz=step.z;}
    else{const step=vehicleStep(speed,yaw,input,dt);speed=step.speed;yaw=step.yaw;dx=step.x;dz=step.z;}
    const next={x:player.x+dx,z:player.z+dz},padding=navMode==='drive'?1.15:.35;
    if(world.bounds.containsPoint(new THREE.Vector2(next.x,next.z))&&!world.blocked(next,padding)){player.x=next.x;player.z=next.z;}else speed=0;
    player.y=world.surfaceHeight(player.x,player.z);
    if(navMode==='walk'){camera.position.copy(player).add(new THREE.Vector3(0,1.72,0));camera.lookAt(player.x+Math.sin(yaw)*10,player.y+1.72+Math.sin(pitch)*10,player.z+Math.cos(yaw)*10);positionIndicator.textContent='WALKING  /  eye height 1.72 m';}
    else{vehicle.position.copy(player);const front=world.height(player.x+Math.sin(yaw)*1.5,player.z+Math.cos(yaw)*1.5),back=world.height(player.x-Math.sin(yaw)*1.5,player.z-Math.cos(yaw)*1.5),right=world.height(player.x+Math.cos(yaw)*.7,player.z-Math.sin(yaw)*.7),left=world.height(player.x-Math.cos(yaw)*.7,player.z+Math.sin(yaw)*.7);vehicle.rotation.set(-Math.atan2(front-back,3),yaw,Math.atan2(right-left,1.4),'YXZ');const ideal=player.clone().add(new THREE.Vector3(-Math.sin(yaw)*10,5,-Math.cos(yaw)*10));ideal.y=Math.max(ideal.y,world.height(ideal.x,ideal.z)+2);camera.position.lerp(ideal,1-Math.exp(-dt*6));camera.lookAt(player.clone().add(new THREE.Vector3(Math.sin(yaw)*5,1,Math.cos(yaw)*5)));positionIndicator.textContent=`DRIVING  /  ${Math.round(Math.abs(speed)*3.6)} km/h`;}
  }
  let renderCount=0;
  renderLoop=createRenderLoop(dt=>{
    if(navMode==='orbit'){
      if(transition){transition.t=Math.min(1,transition.t+dt/.9);const t=transition.t*transition.t*(3-2*transition.t);camera.position.lerpVectors(transition.from,transition.to,t);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,t);if(transition.t>=1)transition=undefined;}
      controls.update();
      if(tour&&tourStops.length){tourTime+=dt;if(tourTime>6){tourTime=0;tourIndex=(tourIndex+1)%tourStops.length;tourStop(tourStops[tourIndex]);}}
    }else movePlayer(dt);
    renderer.render(scene,camera);
    const moving=!!transition||tour||(navMode!=='orbit'&&(keys.size>0||Math.abs(speed)>.02));
    if(!moving&&navMode==='drive')speed=0;
    fps.textContent=moving?'24 fps limit · lightweight':'Idle · lightweight';
    fps.dataset.renderCount=String(++renderCount);
    fps.dataset.triangles=String(renderer.info.render.triangles);
    fps.dataset.drawCalls=String(renderer.info.render.calls);
    return moving;
  });
  controls.addEventListener('change',invalidate);
  listeners.push(()=>controls.removeEventListener('change',invalidate));
  listen(ui,'click',invalidate);
  const pauseButton=ui.querySelector<HTMLButtonElement>('[data-action="pause"]')!;
  pauseButton.onclick=()=>{paused=!paused;keys.clear();speed=0;pauseButton.setAttribute('aria-pressed',String(paused));pauseButton.textContent=paused?'Resume':'Pause';renderer.domElement.style.pointerEvents=paused?'none':'';fps.textContent=paused?'Paused · lightweight':'Idle · lightweight';updateActive();};
  const visibilityObserver=new IntersectionObserver(entries=>{onScreen=entries[0]?.isIntersecting??false;updateActive();});
  visibilityObserver.observe(host);
  updateActive();
  return {reset,focusFeature,focusSite,getBuildings:()=>world.buildings,getSites:()=>world.sites,getStats:()=>world.stats,destroy(){renderLoop?.dispose();observer.disconnect();visibilityObserver.disconnect();listeners.forEach(fn=>fn());controls.dispose();world.dispose();scene.remove(world.root);scene.traverse(o=>{if(o instanceof THREE.Mesh&&!world.root.children.includes(o)){o.geometry.dispose();}if(o instanceof THREE.Points||o instanceof THREE.LineSegments){o.geometry.dispose();(o.material as THREE.Material).dispose();}});renderer.dispose();renderer.forceContextLoss();host.replaceChildren();}};
}

