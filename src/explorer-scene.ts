import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { escapeHtml } from './data';
import type { Feature, Notes, Position } from './data';
import { buildWorld } from './world/build';
import type { BuildingAsset } from './world/build';
import { nearestDriveRoad, campusDeliveryStops } from './world/routes';
import type { Point, TerrainGrid } from './world/math';
import type { LandCover } from './world/vegetation';
import { makeVehicle } from './world/actors';
import { createRenderLoop } from './world/render-loop';
import { chooseDelivery, formatTime, startCourier, tickCourier } from './world/courier';
import type { CourierRun, DeliveryStop } from './world/courier';
import { stepCar, stepJump } from './world/motion';
import { resolveWalkSpawn } from './world/walk-spawn';

export function createExplorerScene(host:HTMLElement,features:Feature[],center:Position,notes:Notes,onSelect:(id:string)=>void,terrain?:TerrainGrid,cover?:LandCover) {
  const app=host.closest<HTMLElement>('.app')!;
  const coarse=matchMedia('(pointer: coarse)').matches,reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  let loop:ReturnType<typeof createRenderLoop>|undefined;
  const request=()=>loop?.invalidate();
  const renderer=new THREE.WebGLRenderer({antialias:false,powerPreference:'low-power'});
  renderer.domElement.className='world';renderer.domElement.tabIndex=0;
  renderer.domElement.setAttribute('aria-label','3D model of Federal University Oye-Ekiti, Oye campus');
  renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;renderer.shadowMap.autoUpdate=false;
  host.appendChild(renderer.domElement);
  const scene=new THREE.Scene();scene.background=new THREE.Color('#cbdfe4');scene.fog=new THREE.Fog('#cbdfe4',1000,3000);
  const skyGeometry=new THREE.SphereGeometry(4500,16,10),skyColors=new Float32Array(skyGeometry.attributes.position.count*3);
  skyGeometry.setAttribute('color',new THREE.BufferAttribute(skyColors,3));
  const sky=new THREE.Mesh(skyGeometry,new THREE.MeshBasicMaterial({vertexColors:true,side:THREE.BackSide,depthWrite:false,fog:false}));sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
  function paintSky(dark:boolean){const top=new THREE.Color(dark?'#0c152b':'#81b5cf'),horizon=new THREE.Color(dark?'#273749':'#d4ded7'),color=new THREE.Color();for(let i=0;i<skyGeometry.attributes.position.count;i++){const elevation=skyGeometry.attributes.position.getY(i)/4500,t=Math.pow(Math.max(0,elevation),.55);color.copy(horizon).lerp(top,t);skyColors.set([color.r,color.g,color.b],i*3);}skyGeometry.attributes.color.needsUpdate=true;}paintSky(false);
  const world=buildWorld(features,center,notes,terrain,cover);scene.add(world.root);
  const camera=new THREE.PerspectiveCamera(38,1,.15,8000);
  const labels=document.createElement('div');labels.className='building-labels';host.appendChild(labels);
  const buildingLabels=world.buildings.filter(b=>b.named&&b.directory).map(building=>{const element=document.createElement('span');element.className='building-label';element.dataset.label=building.id;element.textContent=building.name;element.hidden=true;labels.appendChild(element);return {building,element};});
  function updateLabels(){
    const used:{x:number;y:number;width:number}[]=[];const rect=host.getBoundingClientRect();
    for(const item of [...buildingLabels].sort((a,b)=>camera.position.distanceToSquared(a.building.position)-camera.position.distanceToSquared(b.building.position))){
      const {building,element}=item;element.hidden=true;if(mode!=='orbit'||used.length>=4)continue;
      const size=building.bounds.getSize(new THREE.Vector2()),distance=camera.position.distanceTo(building.position);
      if(distance>Math.max(145,Math.max(size.x,size.y)*3.2))continue;
      const point=building.position.clone().add(new THREE.Vector3(0,building.height+6,0)).project(camera),x=(point.x+1)/2*rect.width,y=(1-point.y)/2*rect.height;
      if(point.z< -1||point.z>1||x<(rect.width>640?340:90)||x>rect.width-90||y<100||y>rect.height-80)continue;
      const width=Math.min(260,building.name.length*7+24);if(used.some(p=>Math.abs(p.x-x)<(p.width+width)/2+8&&Math.abs(p.y-y)<42))continue;
      element.style.left=`${x}px`;element.style.top=`${y}px`;element.hidden=false;used.push({x,y,width});
    }
  }

  const controls=new OrbitControls(camera,renderer.domElement);
  controls.enableDamping=false;controls.screenSpacePanning=false;controls.minDistance=6;controls.maxDistance=1800;
  controls.minPolarAngle=.1;controls.maxPolarAngle=1.53;
  const hemi=new THREE.HemisphereLight('#d8eafa','#66744e',1.05);scene.add(hemi);
  const sun=new THREE.DirectionalLight('#fff1dc',1.65);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.normalBias=1.2;sun.shadow.bias=-.0008;
  const mid=world.cameraBounds.getCenter(new THREE.Vector2()),extent=world.cameraBounds.getSize(new THREE.Vector2());
  const shadowRadius=Math.max(extent.x,extent.y)*.58;
  Object.assign(sun.shadow.camera,{left:-shadowRadius,right:shadowRadius,top:shadowRadius,bottom:-shadowRadius,near:1,far:2200});
  sun.target.position.set(mid.x,0,mid.y);sun.position.set(mid.x-500,900,mid.y+350);scene.add(sun,sun.target);
  function fitShadow(target:THREE.Vector3,radius:number){
    const r=THREE.MathUtils.clamp(radius,160,shadowRadius);sun.target.position.copy(target);sun.position.copy(target).add(new THREE.Vector3(-500,900,350));Object.assign(sun.shadow.camera,{left:-r,right:r,top:r,bottom:-r});sun.shadow.camera.updateProjectionMatrix();renderer.shadowMap.needsUpdate=true;
  }
  const starPositions:number[]=[];
  for(let i=0;i<600;i++){const a=i*2.399963,y=.1+(i%80)/90,r=Math.sqrt(1-y*y)*3300;starPositions.push(Math.cos(a)*r,y*3300,Math.sin(a)*r);}
  const stars=new THREE.Points(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(starPositions,3)),new THREE.PointsMaterial({color:'#d8e4ff',size:1.6,sizeAttenuation:false,depthWrite:false}));stars.visible=false;scene.add(stars);
  const vehicle=makeVehicle(world.materials,2);vehicle.visible=false;scene.add(vehicle);
  const headlights=new THREE.SpotLight('#fff0c6',45,55,.48,.65,1.2);headlights.position.set(0,1,1.8);headlights.target.position.set(0,.3,24);headlights.visible=false;vehicle.add(headlights,headlights.target);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=64;const gc=glowCanvas.getContext('2d')!,gradient=gc.createRadialGradient(32,32,0,32,32,32);gradient.addColorStop(0,'rgba(255,222,154,.9)');gradient.addColorStop(.2,'rgba(255,198,109,.35)');gradient.addColorStop(1,'rgba(255,198,109,0)');gc.fillStyle=gradient;gc.fillRect(0,0,64,64);
  const glowTexture=new THREE.CanvasTexture(glowCanvas),glowMaterial=new THREE.SpriteMaterial({map:glowTexture,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const lampGlows=new THREE.Group();lampGlows.visible=false;world.lamps.forEach(p=>{const sprite=new THREE.Sprite(glowMaterial);sprite.position.copy(p);sprite.scale.set(3.5,3.5,1);lampGlows.add(sprite);});scene.add(lampGlows);
  const ringMaterial=new THREE.MeshBasicMaterial({color:'#ffcf5a',side:THREE.DoubleSide,transparent:true,opacity:.55,depthWrite:false});
  const beacon=new THREE.Group();
  const ring=new THREE.Mesh(new THREE.RingGeometry(5.2,6,32),ringMaterial);ring.rotation.x=-Math.PI/2;ring.position.y=.2;beacon.add(ring);
  const beamMaterial=new THREE.MeshBasicMaterial({color:'#ffcf5a',side:THREE.DoubleSide,transparent:true,opacity:.13,depthWrite:false,blending:THREE.AdditiveBlending});
  const beam=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.2,60,16,1,true),beamMaterial);beam.position.y=30;beacon.add(beam);beacon.visible=false;scene.add(beacon);
  const arrowShape=new THREE.Shape();arrowShape.moveTo(0,1.3);arrowShape.lineTo(.9,0);arrowShape.lineTo(.35,0);arrowShape.lineTo(.35,-1);arrowShape.lineTo(-.35,-1);arrowShape.lineTo(-.35,0);arrowShape.lineTo(-.9,0);arrowShape.closePath();
  const arrow=new THREE.Mesh(new THREE.ExtrudeGeometry(arrowShape,{depth:.12,bevelEnabled:false}),new THREE.MeshBasicMaterial({color:'#e0b64a'}));arrow.geometry.rotateX(Math.PI/2);arrow.rotation.order='YXZ';arrow.rotation.x=-.6;arrow.visible=false;scene.add(arrow);

  const tools=document.createElement('div');tools.className='tools';
  tools.innerHTML='<button type="button" class="drive">Drive</button><button type="button" class="walk">Walk</button><button type="button" class="night" aria-pressed="false">Night</button><button type="button" class="full-view">Full view</button>';host.appendChild(tools);
  const tip=document.createElement('div');tip.className='tip';tip.hidden=true;host.appendChild(tip);
  const fps=document.createElement('output');fps.className='fps';fps.textContent='0 fps';fps.title='Renders on demand; navigation is capped at 24 fps';host.appendChild(fps);
  const driveHud=document.createElement('div');driveHud.className='hud drive-hud';driveHud.hidden=true;
  driveHud.innerHTML=`<div class="objective"><span class="job">Campus Courier</span><span class="dist"></span></div><div class="stats"><div><small>Time</small><output class="time">1:15</output></div><div><small>Score</small><output class="score">0</output></div></div><output class="speed"><b>0</b> km/h</output><p class="toast" role="status" hidden></p><p class="keys">WASD or arrows to drive · Space to drift · R to reset · Esc to exit</p><div class="card"></div><div class="drive-touch"><div><button data-key="a" aria-label="Steer left">←</button><button data-key="d" aria-label="Steer right">→</button></div><div><button data-key=" " aria-label="Handbrake">⏸</button><button data-key="s" aria-label="Reverse">↓</button><button data-key="w" aria-label="Accelerate">↑</button><button data-exit aria-label="Exit driving">×</button></div></div>`;host.appendChild(driveHud);
  const walkHud=document.createElement('div');walkHud.className='hud walk-hud';walkHud.hidden=true;
  walkHud.innerHTML=`<div class="objective"><b>FUOYE Oye campus</b></div><span class="crosshair" aria-hidden="true"></span><p class="prompt">${coarse?'Left thumb to walk, right thumb to look':'Click to look around'}</p><div class="stick" hidden><span></span></div><button class="exit" type="button">Exit walk</button><p class="keys">WASD to walk · Shift to run · Space to jump · Esc to exit</p>`;host.appendChild(walkHud);
  const job=driveHud.querySelector<HTMLElement>('.job')!,distanceOutput=driveHud.querySelector<HTMLElement>('.dist')!,timeOutput=driveHud.querySelector<HTMLOutputElement>('.time')!,scoreOutput=driveHud.querySelector<HTMLOutputElement>('.score')!,speedOutput=driveHud.querySelector<HTMLOutputElement>('.speed')!,card=driveHud.querySelector<HTMLElement>('.card')!,toast=driveHud.querySelector<HTMLElement>('.toast')!;
  const prompt=walkHud.querySelector<HTMLElement>('.prompt')!,stick=walkHud.querySelector<HTMLElement>('.stick')!;
  let mode:'orbit'|'walk'|'drive'='orbit',driveState:'menu'|'run'|'free'|'over'='menu',night=false;
  let yaw=0,pitch=0,speed=0,lateral=0,jumpHeight=0,jumpVelocity=0,jumpQueued=false,bobTime=0,elapsed=0;
  let run:CourierRun|undefined,courierAt=performance.now(),toastUntil=0,hidden=document.hidden,onScreen=true,renderCount=0,lowFrames=0,renderScale=1;
  const player=new THREE.Vector3(),keys=new Set<string>(),stickInput=new THREE.Vector2();
  type Flight={from:THREE.Vector3;to:THREE.Vector3;targetFrom:THREE.Vector3;targetTo:THREE.Vector3;t:number};
  let flight:Flight|undefined,hovered:THREE.Mesh|undefined;
  let walkPoint:Point|undefined,walkPointer:THREE.Vector2|undefined,lastWalkSample=0;
  const removers:(()=>void)[]=[];
  function listen(target:EventTarget,type:string,handler:EventListener,options?:AddEventListenerOptions){target.addEventListener(type,handler,options);removers.push(()=>target.removeEventListener(type,handler,options));}
  function resize(){const {width,height}=host.getBoundingClientRect();if(!width||!height)return;camera.aspect=width/height;renderer.setPixelRatio(Math.min(renderScale,1280/width,720/height));renderer.setSize(width,height,false);if(width>640&&mode==='orbit')camera.setViewOffset(width,height,-165,0,width,height);else camera.clearViewOffset();camera.updateProjectionMatrix();request();}
  const resizeObserver=new ResizeObserver(resize);resizeObserver.observe(host);
  function fly(to:THREE.Vector3,target:THREE.Vector3){walkPoint=undefined;walkPointer=undefined;delete walkHud.dataset.targetX;delete walkHud.dataset.targetZ;flight={from:camera.position.clone(),to,targetFrom:controls.target.clone(),targetTo:target,t:0};request();}
  function highlight(id?:string){const mesh=world.pickables.find(m=>m.userData.id===id);if(mesh===hovered)return;if(hovered){hovered.material=(hovered.userData.originalMaterial as THREE.Material);delete hovered.userData.originalMaterial;}hovered=mesh;if(mesh){mesh.userData.originalMaterial=mesh.material;mesh.material=highlightMaterial;}request();}
  const highlightMaterial=new THREE.MeshLambertMaterial({color:'#f0dfae'});
  function orbit(){mode='orbit';delete app.dataset.mode;speed=lateral=0;keys.clear();stickInput.set(0,0);vehicle.visible=false;headlights.visible=false;beacon.visible=arrow.visible=false;driveHud.hidden=walkHud.hidden=true;controls.enabled=true;camera.fov=38;camera.near=.15;camera.updateProjectionMatrix();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();resize();onSelect('');}
  function reset(){orbit();highlight();tip.hidden=true;fitShadow(new THREE.Vector3(mid.x,0,mid.y),shadowRadius);const target=new THREE.Vector3(mid.x,world.height(mid.x,mid.y)+5,mid.y),size=Math.max(extent.x,extent.y);fly(target.clone().add(new THREE.Vector3(size*.32,size*.55,size*.57)),target);}
  function focusFeature(id:string){const b=world.buildings.find(b=>b.id===id);if(!b)return;orbit();onSelect(id);const size=b.bounds.getSize(new THREE.Vector2()),d=Math.max(45,Math.max(size.x,size.y)*1.45);fitShadow(b.position,d*2.5);const front=b.entrance.clone().sub(b.position).setY(0).normalize(),side=new THREE.Vector3(-front.z,0,front.x);fly(b.position.clone().addScaledVector(front,d).addScaledVector(side,d*.45).add(new THREE.Vector3(0,d*.6,0)),b.position.clone().add(new THREE.Vector3(0,b.height/2,0)));}
  function closestRoad(p:Point,minWidth=4){const road=nearestDriveRoad(p,world.roads,world.blocked,minWidth);return {...road,point:road.point??{x:world.focus?.entrance.x??mid.x,z:world.focus?.entrance.z??mid.y}};}
  const stops:DeliveryStop[]=campusDeliveryStops(world.buildings,world.roads,world.blocked);
  function spawn(){const target=controls.target;const s=closestRoad({x:target.x,z:target.z});player.set(s.point.x,world.surfaceHeight(s.point.x,s.point.z),s.point.z);yaw=s.heading;speed=lateral=0;keys.clear();jumpHeight=jumpVelocity=0;updateVehicle(0,true);}
  function setMode(next:'walk'|'drive'){mode=next;app.dataset.mode=next;flight=undefined;controls.enabled=false;vehicle.visible=next==='drive';headlights.visible=night&&next==='drive';highlight();tip.hidden=true;driveHud.hidden=next!=='drive';walkHud.hidden=next!=='walk';camera.fov=next==='walk'?72:58;camera.near=.1;resize();if(next==='drive')spawn();renderer.domElement.focus();request();}
  function getBest(){try{const n=Number(localStorage.getItem('fuoye-courier-best'));return Number.isFinite(n)&&n>0?n:0;}catch{return 0;}}
  function showCard(title:string,text:string,actions:[string,()=>void][]){card.replaceChildren();const h=document.createElement('h2');h.textContent=title;const p=document.createElement('p');p.textContent=text;const row=document.createElement('div');row.className='actions';actions.forEach(([name,action],i)=>{const b=document.createElement('button');b.type='button';b.textContent=name;if(i===0)b.className='primary';b.onclick=action;row.appendChild(b);});card.append(h,p,row);card.hidden=false;row.querySelector('button')?.focus();request();}
  function notify(text:string){toast.textContent=text;toast.hidden=false;toastUntil=elapsed+1.8;request();}
  function positionTarget(){if(!run?.target)return;const p=run.target;beacon.position.set(p.x,world.surfaceHeight(p.x,p.z),p.z);beacon.visible=arrow.visible=true;job.innerHTML=`Deliver to <b>${escapeHtml(p.name)}</b>`;}
  function startDrive(state:'run'|'free'){driveState=state;courierAt=performance.now();driveHud.dataset.state=state;card.hidden=true;spawn();renderer.domElement.focus();if(state==='run'){run=startCourier(stops,player);positionTarget();timeOutput.textContent='1:15';scoreOutput.textContent='0';notify('Go!');if(run.over)finishRun();}else{run=undefined;job.textContent='Free drive';distanceOutput.textContent='';beacon.visible=arrow.visible=false;}request();}
  function finishRun(){toast.hidden=true;driveState='over';driveHud.dataset.state='over';beacon.visible=arrow.visible=false;speed=lateral=0;keys.clear();const best=getBest(),score=run?.score??0;if(score>best){try{localStorage.setItem('fuoye-courier-best',String(score));}catch{/* Gameplay works when storage is unavailable. */}}showCard("Time's up",`${run?.deliveries??0} deliveries, ${score.toLocaleString()} points. ${score>best?'New best!':`Best: ${best.toLocaleString()}.`}`,[['Drive again',()=>startDrive('run')],['Free drive',()=>startDrive('free')],['Exit',reset]]);}
  function openDrive(){setMode('drive');driveState='menu';driveHud.dataset.state='menu';job.textContent='Campus Courier';distanceOutput.textContent='';const best=getBest();showCard('Campus Courier',`Deliver to as many campus buildings as you can before time runs out. Each drop adds time. Stop inside the gold ring to deliver.${best?` Best: ${best.toLocaleString()}.`:''}`,[['Start',()=>startDrive('run')],['Free drive',()=>startDrive('free')],['Exit',reset]]);}
  function openWalk(){
    if(mode==='walk')return;
    if(mode==='orbit'&&walkPointer)refreshWalkPoint();
    const direction=camera.getWorldDirection(new THREE.Vector3());
    const requested=mode==='drive'?{x:player.x,z:player.z}:walkPoint??{x:controls.target.x,z:controls.target.z};
    const position=resolveWalkSpawn(requested,{min:{x:world.bounds.min.x,z:world.bounds.min.y},max:{x:world.bounds.max.x,z:world.bounds.max.y}},p=>!world.blocked(p,.35)&&!treeBlocked(p,.35));
    if(!position){tip.textContent='Choose an open ground area to start walking';tip.style.left='50%';tip.style.top='100px';tip.hidden=false;return;}
    setMode('walk');player.set(position.x,world.surfaceHeight(position.x,position.z),position.z);
    yaw=Math.atan2(direction.x,direction.z);pitch=0;speed=lateral=jumpHeight=jumpVelocity=0;keys.clear();stickInput.set(0,0);jumpQueued=false;
    fitShadow(player,220);walkHud.dataset.jumpPeak='0';walkHud.dataset.spawnAdjusted=String(Math.hypot(position.x-requested.x,position.z-requested.z)>.05);
    walkHud.dataset.requestedX=String(requested.x);walkHud.dataset.requestedZ=String(requested.z);
    prompt.hidden=false;updateWalker(0);request();
  }
  function toggleNight(){night=!night;paintSky(night);app.dataset.night=String(night);const b=tools.querySelector<HTMLButtonElement>('.night')!;b.textContent=night?'Day':'Night';b.setAttribute('aria-pressed',String(night));hemi.intensity=night?.55:1.05;hemi.color.set(night?'#8aa1ca':'#d8eafa');sun.intensity=night?.48:1.65;sun.color.set(night?'#a4b9e2':'#fff1dc');stars.visible=night;lampGlows.visible=night;headlights.visible=night&&mode==='drive';scene.background=new THREE.Color(night?'#111e32':'#cbdfe4');(scene.fog as THREE.Fog).color.copy(scene.background);world.materials.windows.emissiveIntensity=night?1.2:0;world.materials.glow.emissiveIntensity=night?2:0;request();}
  tools.querySelector<HTMLButtonElement>('.drive')!.onclick=openDrive;
  tools.querySelector<HTMLButtonElement>('.walk')!.onclick=openWalk;
  tools.querySelector<HTMLButtonElement>('.night')!.onclick=toggleNight;
  tools.querySelector<HTMLButtonElement>('.full-view')!.onclick=reset;
  walkHud.querySelector<HTMLButtonElement>('.exit')!.onclick=reset;
  driveHud.querySelector<HTMLButtonElement>('[data-exit]')!.onclick=reset;

  function movementInput(){return {forward:keys.has('w')||keys.has('arrowup'),back:keys.has('s')||keys.has('arrowdown'),left:keys.has('a')||keys.has('arrowleft'),right:keys.has('d')||keys.has('arrowright'),run:keys.has('shift'),brake:keys.has(' ')};}
  const trunkCells=new Map<string,Point[]>();world.treeTrunks.forEach(p=>{const key=`${Math.floor(p.x/12)},${Math.floor(p.z/12)}`;const cell=trunkCells.get(key)??[];cell.push(p);trunkCells.set(key,cell);});
  function treeBlocked(p:Point,padding:number){const cx=Math.floor(p.x/12),cz=Math.floor(p.z/12);for(let x=cx-1;x<=cx+1;x++)for(let z=cz-1;z<=cz+1;z++)if(trunkCells.get(`${x},${z}`)?.some(t=>Math.hypot(p.x-t.x,p.z-t.z)<padding+.3))return true;return false;}
  function move(dx:number,dz:number,padding:number){const next={x:player.x+dx,z:player.z+dz};const allowed=(p:Point)=>world.bounds.containsPoint(new THREE.Vector2(p.x,p.z))&&!world.blocked(p,padding)&&!treeBlocked(p,padding);if(allowed(next)){player.x=next.x;player.z=next.z;return false;}if(allowed({x:next.x,z:player.z}))player.x=next.x;if(allowed({x:player.x,z:next.z}))player.z=next.z;return true;}
  function updateVehicle(dt:number,immediate=false){vehicle.position.copy(player);const s=Math.sin(yaw),c=Math.cos(yaw),front=world.height(player.x+s*1.4,player.z+c*1.4),back=world.height(player.x-s*1.4,player.z-c*1.4),right=world.height(player.x+c*.9,player.z-s*.9),left=world.height(player.x-c*.9,player.z+s*.9);vehicle.rotation.set(-Math.atan2(front-back,2.8),yaw,Math.atan2(right-left,1.8),'YXZ');const follow=8.5+Math.abs(speed)*.08;let clear=follow;for(let d=1.5;d<follow;d+=.75){if(world.blocked({x:player.x-s*d,z:player.z-c*d},.3)){clear=Math.max(1.5,d-.75);break;}}const ideal=new THREE.Vector3(player.x-s*clear,player.y+3.4+Math.abs(speed)*.02,player.z-c*clear);ideal.y=Math.max(ideal.y,world.surfaceHeight(ideal.x,ideal.z)+1.6);if(immediate)camera.position.copy(ideal);else camera.position.lerp(ideal,1-Math.exp(-dt*6));camera.lookAt(player.x+s*5,player.y+1.1,player.z+c*5);speedOutput.innerHTML=`<b>${Math.round(Math.hypot(speed,lateral)*3.6)}</b> km/h`;}
  function updateWalker(dt:number){const input=movementInput(),forward=Number(input.forward)-Number(input.back)+stickInput.y,side=Number(input.right)-Number(input.left)+stickInput.x,norm=Math.max(1,Math.hypot(forward,side)),travel=(input.run||stickInput.length()>.95?8:3.2)*dt;const dx=(Math.sin(yaw)*forward-Math.cos(yaw)*side)*travel/norm,dz=(Math.cos(yaw)*forward+Math.sin(yaw)*side)*travel/norm;move(dx,dz,.35);player.y=world.surfaceHeight(player.x,player.z);const jump=stepJump(jumpHeight,jumpVelocity,jumpQueued,dt);jumpHeight=jump.height;jumpVelocity=jump.velocity;jumpQueued=false;bobTime+=Math.hypot(dx,dz)*2.2;const bob=reduced||jumpHeight>0?0:Math.sin(bobTime)*.025*Math.min(1,Math.hypot(forward,side));camera.position.set(player.x,player.y+1.65+jumpHeight+bob,player.z);camera.rotation.set(-pitch,yaw+Math.PI,0,'YXZ');const nearby=world.buildings.reduce<BuildingAsset|undefined>((best,b)=>b.bounds.distanceToPoint(new THREE.Vector2(player.x,player.z))<14&&(!best||b.position.distanceToSquared(player)<best.position.distanceToSquared(player))?b:best,undefined);walkHud.querySelector('.objective b')!.textContent=nearby?.name??'FUOYE Oye campus';walkHud.dataset.jump=String(jumpHeight);walkHud.dataset.jumpPeak=String(Math.max(Number(walkHud.dataset.jumpPeak)||0,jumpHeight));}
  function key(e:KeyboardEvent){if(e.target instanceof HTMLInputElement||e.target instanceof HTMLTextAreaElement)return;const k=e.key.toLowerCase();if(mode==='orbit'){if(e.type==='keydown'&&k==='escape')reset();return;}if((mode==='walk'||driveState==='run'||driveState==='free')&&['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift',' '].includes(k)){e.preventDefault();if(e.type==='keydown')keys.add(k);else keys.delete(k);if(k===' '&&e.type==='keydown'&&!e.repeat&&mode==='walk')jumpQueued=true;request();}if(e.type==='keydown'&&k==='escape'){if(document.pointerLockElement!==renderer.domElement)reset();}if(e.type==='keydown'&&k==='r'&&mode==='drive'&&(driveState==='run'||driveState==='free')){const s=closestRoad(player);player.set(s.point.x,world.surfaceHeight(s.point.x,s.point.z),s.point.z);yaw=s.heading;speed=lateral=0;updateVehicle(0,true);notify('Back on the road');}}
  listen(window,'keydown',key as EventListener);listen(window,'keyup',key as EventListener);
  function clearInput(){keys.clear();stickInput.set(0,0);speed=lateral=0;stick.hidden=true;request();}
  listen(window,'blur',clearInput);
  driveHud.querySelectorAll<HTMLButtonElement>('[data-key]').forEach(b=>{listen(b,'pointerdown',((e:PointerEvent)=>{e.preventDefault();b.setPointerCapture(e.pointerId);keys.add(b.dataset.key!);request();})as EventListener);for(const type of ['pointerup','pointercancel','lostpointercapture'])listen(b,type,()=>{keys.delete(b.dataset.key!);request();});});
  let down={x:0,y:0},dragPointer:number|undefined,last={x:0,y:0},movePointer:number|undefined,lookPointer:number|undefined,stickOrigin={x:0,y:0},lastHover=0;
  const raycaster=new THREE.Raycaster();
  function pick(e:PointerEvent){const r=renderer.domElement.getBoundingClientRect();raycaster.setFromCamera(new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1),camera);return raycaster.intersectObjects(world.pickables,false)[0]?.object.userData.id as string|undefined;}
  function refreshWalkPoint(){
    if(!walkPointer)return;
    raycaster.setFromCamera(walkPointer,camera);
    const hit=raycaster.intersectObjects([world.ground,...world.pickables],false)[0];
    if(hit){walkPoint={x:hit.point.x,z:hit.point.z};walkHud.dataset.targetX=String(walkPoint.x);walkHud.dataset.targetZ=String(walkPoint.z);}
  }
  function rememberWalkPoint(e:PointerEvent){
    const r=renderer.domElement.getBoundingClientRect();walkPointer=new THREE.Vector2((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);
    // Limit preview raycasts; Walk always resolves the latest pointer exactly.
    const now=performance.now();if(now-lastWalkSample<60&&e.type==='pointermove')return;lastWalkSample=now;refreshWalkPoint();
  }
  function look(dx:number,dy:number){yaw-=dx*.0022;pitch=THREE.MathUtils.clamp(pitch+dy*.0022,-1.4,1.4);request();}
  listen(renderer.domElement,'pointerdown',((e:PointerEvent)=>{down={x:e.clientX,y:e.clientY};if(lookPointer===undefined)last={x:e.clientX,y:e.clientY};dragPointer=e.pointerId;if(mode==='orbit'){flight=undefined;tip.hidden=true;return;}if(mode!=='walk')return;if(coarse||e.pointerType==='touch'){renderer.domElement.setPointerCapture(e.pointerId);if(e.clientX<innerWidth*.45&&movePointer===undefined){movePointer=e.pointerId;stickOrigin={x:e.clientX,y:e.clientY};stick.style.left=`${e.clientX}px`;stick.style.top=`${e.clientY}px`;stick.hidden=false;}else{lookPointer=e.pointerId;last={x:e.clientX,y:e.clientY};}prompt.hidden=true;}else if(document.pointerLockElement!==renderer.domElement){renderer.domElement.requestPointerLock()?.catch(()=>{prompt.textContent='Drag to look around';});}request();})as EventListener);
  listen(renderer.domElement,'pointermove',((e:PointerEvent)=>{if(mode==='walk'){if(document.pointerLockElement===renderer.domElement)return;if(e.pointerId===movePointer){const x=(e.clientX-stickOrigin.x)/50,y=(stickOrigin.y-e.clientY)/50;stickInput.set(x,y).divideScalar(Math.max(1,Math.hypot(x,y)));stick.firstElementChild!.setAttribute('style',`transform:translate(${stickInput.x*34}px,${-stickInput.y*34}px)`);request();}else if(e.pointerId===lookPointer||e.buttons&&dragPointer===e.pointerId){look(e.clientX-last.x,e.clientY-last.y);last={x:e.clientX,y:e.clientY};}return;}if(mode!=='orbit'||e.buttons)return;rememberWalkPoint(e);const now=performance.now();if(now-lastHover<100)return;lastHover=now;const id=pick(e),b=world.buildings.find(b=>b.id===id);highlight(id);tip.hidden=!b;renderer.domElement.classList.toggle('pointing',!!b);if(b){tip.textContent=b.name;tip.style.left=`${THREE.MathUtils.clamp(e.clientX,80,innerWidth-80)}px`;tip.style.top=`${e.clientY}px`;}})as EventListener);
  function pointerUp(e:PointerEvent){if(e.pointerId===movePointer){movePointer=undefined;stickInput.set(0,0);stick.hidden=true;request();}if(e.pointerId===lookPointer)lookPointer=undefined;dragPointer=undefined;if(e.type!=='pointercancel'&&mode==='orbit')rememberWalkPoint(e);if(e.type!=='pointercancel'&&mode==='orbit'&&Math.hypot(e.clientX-down.x,e.clientY-down.y)<5){const id=pick(e);if(id)focusFeature(id);}}
  listen(renderer.domElement,'pointerup',pointerUp as EventListener);listen(renderer.domElement,'pointercancel',pointerUp as EventListener);
  listen(renderer.domElement,'pointerleave',()=>{tip.hidden=true;highlight();});
  listen(document,'mousemove',((e:MouseEvent)=>{if(mode==='walk'&&document.pointerLockElement===renderer.domElement)look(e.movementX,e.movementY);})as EventListener);
  listen(document,'pointerlockchange',()=>{prompt.hidden=coarse||document.pointerLockElement===renderer.domElement;request();});
  controls.addEventListener('change',request);removers.push(()=>controls.removeEventListener('change',request));
  controls.addEventListener('start',()=>{flight=undefined;});
  const active=()=>{courierAt=performance.now();loop?.setActive(!hidden&&onScreen);};
  listen(document,'visibilitychange',()=>{hidden=document.hidden;clearInput();active();});
  const visibilityObserver=new IntersectionObserver(entries=>{onScreen=entries[0]?.isIntersecting??false;active();});visibilityObserver.observe(host);
  loop=createRenderLoop(dt=>{
    elapsed+=dt;
    if(mode==='orbit'){
      if(flight){flight.t=Math.min(1,flight.t+dt/(reduced?.05:1.2));const t=flight.t*flight.t*(3-2*flight.t);camera.position.lerpVectors(flight.from,flight.to,t);controls.target.lerpVectors(flight.targetFrom,flight.targetTo,t);if(flight.t>=1)flight=undefined;}
      controls.update();camera.position.y=Math.max(camera.position.y,world.height(camera.position.x,camera.position.z)+1.7);
    }else if(mode==='walk')updateWalker(dt);
    else if(driveState==='run'||driveState==='free'){
      const road=closestRoad(player),onRoad=road.distance<5;
      const step=stepCar({speed,lateral,yaw},movementInput(),dt,onRoad);speed=step.speed;lateral=step.lateral;yaw=step.yaw;
      if(move(step.x,step.z,1.15)){speed*=-.2;lateral*=.2;}
      player.y=world.surfaceHeight(player.x,player.z);updateVehicle(dt);
      if(run&&driveState==='run'){
        const now=performance.now(),courierDt=Math.max(0,(now-courierAt)/1000);courierAt=now;const result=tickCourier(run,courierDt,player,Math.hypot(speed,lateral),stops);run=result.run;
        if(result.delivered){positionTarget();notify(`Delivered to ${result.delivered.name}! +${result.delivered.bonus}`);}
        else if(result.tooFast)notify('Slow down to deliver');
        timeOutput.textContent=formatTime(run.remaining);timeOutput.dataset.low=String(run.remaining<10);scoreOutput.textContent=run.score.toLocaleString();
        if(run.target){const target=run.target;distanceOutput.textContent=`${Math.round(Math.hypot(target.x-player.x,target.z-player.z))} m`;arrow.position.set(player.x,player.y+3.1+Math.sin(elapsed*4)*.12,player.z);arrow.rotation.y=Math.atan2(target.x-player.x,target.z-player.z);beamMaterial.opacity=.13+Math.sin(elapsed*5)*.025;}
        if(run.over)finishRun();
      }
    }
    if(elapsed>toastUntil)toast.hidden=true;
    driveHud.dataset.x=walkHud.dataset.x=String(player.x);driveHud.dataset.z=walkHud.dataset.z=String(player.z);
    updateLabels();sky.position.copy(camera.position);const started=performance.now();renderer.render(scene,camera);const cost=performance.now()-started;
    if(renderCount>10&&cost>70)lowFrames++;else lowFrames=Math.max(0,lowFrames-1);
    if(lowFrames>8&&renderScale> .75){renderScale=.75;renderer.shadowMap.enabled=false;resize();lowFrames=0;}
    const moving=!!flight||(mode==='walk'&&(keys.size>0||stickInput.lengthSq()>.001||jumpHeight>0||jumpQueued))||(mode==='drive'&&(driveState==='run'||driveState==='free'&&(keys.size>0||Math.abs(speed)>.02||Math.abs(lateral)>.02)))||!toast.hidden;
    if(!moving&&mode==='drive')speed=lateral=0;
    fps.textContent=moving?`${Math.min(24,Math.round(1/Math.max(dt,.001)))} fps`:'0 fps';fps.dataset.slow=String(moving&&cost>60);fps.dataset.renderCount=String(++renderCount);fps.dataset.triangles=String(renderer.info.render.triangles);fps.dataset.drawCalls=String(renderer.info.render.calls);fps.dataset.idle=String(!moving);fps.dataset.nameplates=String(world.signageCount);
    return moving;
  },24);
  function gateView(){
    orbit();highlight();tip.hidden=true;
    const target=world.entrance.position.clone().add(new THREE.Vector3(0,4.5,0));
    fitShadow(target,220);
    fly(world.entrance.approach.clone().add(new THREE.Vector3(10,14,10)),target);
    walkPoint={x:world.entrance.approach.x,z:world.entrance.approach.z};
  }
  const gateTarget=world.entrance.position.clone().add(new THREE.Vector3(0,4.5,0));
  walkPoint={x:world.entrance.approach.x,z:world.entrance.approach.z};
  controls.target.copy(gateTarget);camera.position.copy(world.entrance.approach).add(new THREE.Vector3(10,14,10));
  fitShadow(gateTarget,220);controls.update();renderer.shadowMap.needsUpdate=true;resize();active();
  return {
    getBuildings:()=>world.buildings,focusFeature,highlight,reset,gateView,
    destroy(){loop?.dispose();resizeObserver.disconnect();visibilityObserver.disconnect();removers.forEach(remove=>remove());controls.dispose();if(document.pointerLockElement===renderer.domElement)document.exitPointerLock();highlight();world.dispose();scene.remove(world.root);const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>();scene.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.Points){geometries.add(o.geometry);(Array.isArray(o.material)?o.material:[o.material]).forEach(m=>materials.add(m));}});geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());glowTexture.dispose();glowMaterial.dispose();highlightMaterial.dispose();renderer.dispose();renderer.forceContextLoss();host.replaceChildren();},
  };
}
