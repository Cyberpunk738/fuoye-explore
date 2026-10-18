import * as THREE from 'three';
import { randomFrom } from './math';
export function makeMaterials() {
  const textures: THREE.Texture[]=[];
  function texture(kind: 'plaster'|'roof'|'pavers'|'grass'|'asphalt'|'brick'|'soil',color: string, seed=1) {
    const canvas=document.createElement('canvas'); canvas.width=canvas.height=256; const c=canvas.getContext('2d')!;
    c.fillStyle=color; c.fillRect(0,0,256,256); const rand=randomFrom(seed);
    for(let i=0;i<1200;i++) { const v=rand()>.5?255:0; c.fillStyle=`rgba(${v},${v},${v},${rand()*.09})`;c.fillRect(rand()*256,rand()*256,1+rand()*2,1+rand()*2); }
    if(kind==='roof') { for(let x=0;x<256;x+=8) {c.fillStyle='#ffffff16';c.fillRect(x,0,2,256);c.fillStyle='#00000020';c.fillRect(x+3,0,1,256);} }
    if(kind==='pavers'||kind==='brick') { const bh=kind==='brick'?16:32, bw=kind==='brick'?64:32; c.strokeStyle=kind==='brick'?'#cfb6a2':'#9c9c87';c.lineWidth=1.5;for(let y=0;y<256;y+=bh)for(let x=-bw;x<256;x+=bw){c.strokeRect(x+(y/bh%2)*bw/2,y,bw,bh);} }
    if(kind==='grass') {for(let i=0;i<600;i++){c.strokeStyle=rand()>.5?'#a3af672a':'#526c3430';c.beginPath();const x=rand()*256,y=rand()*256;c.moveTo(x,y);c.lineTo(x+1,y+4);c.stroke();}}
    const map=new THREE.CanvasTexture(canvas);map.colorSpace=THREE.SRGBColorSpace;map.wrapS=map.wrapT=THREE.RepeatWrapping;map.anisotropy=1;textures.push(map);return map;
  }
  const surface=(kind: Parameters<typeof texture>[0],color: string,scale: number,roughness=.9)=> {const map=texture(kind,color);const m=new THREE.MeshLambertMaterial({map});m.userData.uvScale=scale;return m;};
  const plain=(color:string,roughness=.8)=>new THREE.MeshLambertMaterial({color});
  const frondCanvas=document.createElement('canvas');frondCanvas.width=frondCanvas.height=256;const fc=frondCanvas.getContext('2d')!;fc.fillStyle='#000';fc.fillRect(0,0,256,256);fc.strokeStyle='#fff';fc.lineWidth=4;fc.beginPath();fc.moveTo(128,4);fc.lineTo(128,251);fc.stroke();
  for(let y=10;y<248;y+=7){const reach=Math.sin(y/256*Math.PI)*118;fc.lineWidth=4;for(const side of[-1,1]){fc.beginPath();fc.moveTo(128,y);fc.lineTo(128+side*reach,y-14);fc.stroke();}}
  const frondTexture=new THREE.CanvasTexture(frondCanvas);textures.push(frondTexture);
  const palmLeaves=['#486a36','#5e8144','#73944a'].map(color=>{const material=new THREE.MeshLambertMaterial({color,alphaMap:frondTexture,alphaTest:.45,side:THREE.DoubleSide});material.userData.preserveUV=true;return material;});
  const materials={
    palmLeaves,
    walls:[surface('plaster','#ecd5a0',6),surface('plaster','#e4ddd0',6),surface('plaster','#dfc78f',6),surface('plaster','#ddc1a6',6)],
    roofs:[surface('roof','#4f776d',2),surface('roof','#7d8580',2),surface('roof','#815447',2),surface('roof','#697c9c',2),surface('roof','#b4b097',2)],
    accent:plain('#b77843'),hostelInset:plain('#ae7963'),ivory:surface('plaster','#e8e1d2',6),
    brick:surface('brick','#a07554',2),stone:surface('brick','#bbb3a1',2),pavers:surface('pavers','#d0c4ae',4),asphalt:surface('asphalt','#535952',5),soil:surface('soil','#ad9b7f',5),grass:surface('grass','#ffffff',18),
    trim:plain('#f6eee0'),base:plain('#a6997f'),wood:plain('#796043'),steel:plain('#364c48'),white:plain('#eeeede'),green:plain('#226746'),turf:[surface('grass','#8ba366',8),surface('grass','#98ac75',8)],rubber:plain('#262b29'),glass:new THREE.MeshLambertMaterial({color:'#678a91'}),
    leaves:[plain('#3e673f'),plain('#779658'),plain('#62884b'),plain('#779351'),plain('#365c40')],
    carPaint:[plain('#b5b6a8',.3),plain('#284a58',.3),plain('#aa5c47',.3),plain('#ebe8db',.3),plain('#49514d',.3)],
    kekeYellow:plain('#ebb820',.35),
    people:[plain('#af674c'),plain('#3c6d90'),plain('#e5d3a1'),plain('#526544')],skin:plain('#6b4735'),
    flowers:[plain('#bd7290'),plain('#d2b55d'),plain('#c66c42')],
    glow:new THREE.MeshLambertMaterial({color:'#fff4d3',emissive:'#ffc269',emissiveIntensity:0}),
    tail:new THREE.MeshLambertMaterial({color:'#bf4332',emissive:'#d83f2b',emissiveIntensity:.3}),
    louvres:new THREE.MeshLambertMaterial({color:'#8dc4b0',emissive:'#ffcb80',emissiveIntensity:0}),
    adminWindows:new THREE.MeshLambertMaterial({color:'#82918a',emissive:'#ffcb80',emissiveIntensity:0}),
    windows:new THREE.MeshLambertMaterial({color:'#3d5657',emissive:'#ffcb80',emissiveIntensity:0}),
  };
  // A single textured panel supplies frame, mullion and glass reflection detail.
  const pane=document.createElement('canvas');pane.width=128;pane.height=160;
  const pc=pane.getContext('2d')!,reflection=pc.createLinearGradient(0,0,128,160);
  reflection.addColorStop(0,'#87abb0');reflection.addColorStop(.42,'#4c7379');reflection.addColorStop(.45,'#a3bcb8');reflection.addColorStop(.5,'#46686b');reflection.addColorStop(1,'#213c43');
  pc.fillStyle=reflection;pc.fillRect(0,0,128,160);pc.strokeStyle='#e8e1cf';pc.lineWidth=7;pc.strokeRect(3,3,122,154);pc.lineWidth=4;pc.beginPath();pc.moveTo(64,4);pc.lineTo(64,156);pc.moveTo(4,102);pc.lineTo(124,102);pc.stroke();
  const paneTexture=new THREE.CanvasTexture(pane);paneTexture.colorSpace=THREE.SRGBColorSpace;textures.push(paneTexture);
  materials.windows.map=paneTexture;materials.windows.color.set('#ffffff');materials.windows.userData.preserveUV=true;
  const louvreCanvas=document.createElement('canvas');louvreCanvas.width=128;louvreCanvas.height=160;const lctx=louvreCanvas.getContext('2d')!;
  lctx.fillStyle='#3c585a';lctx.fillRect(0,0,128,160);
  for(let y=8;y<156;y+=19){lctx.fillStyle='#a1b9b4';lctx.fillRect(7,y,114,4);lctx.fillStyle='#56736f';lctx.fillRect(7,y+4,114,8);lctx.fillStyle='#263d3c';lctx.fillRect(7,y+12,114,6);}
  lctx.strokeStyle='#e8e1cf';lctx.lineWidth=7;lctx.strokeRect(3,3,122,154);lctx.fillRect(61,3,5,154);
  const louvreTexture=new THREE.CanvasTexture(louvreCanvas);louvreTexture.colorSpace=THREE.SRGBColorSpace;textures.push(louvreTexture);
  for(const material of [materials.louvres,materials.adminWindows]){material.map=louvreTexture;material.userData.preserveUV=true;}
  // A small shared leaf-cluster texture breaks up solid crowns without extra meshes.
  const foliage=document.createElement('canvas');foliage.width=foliage.height=256;const lc=foliage.getContext('2d')!,leafRandom=randomFrom(415);
  lc.fillStyle='#aeb8a1';lc.fillRect(0,0,256,256);
  for(let i=0;i<1500;i++){const x=leafRandom()*256,y=leafRandom()*256,shade=Math.floor(148+leafRandom()*95);lc.fillStyle=`rgb(${shade},${Math.min(255,shade+7)},${Math.max(0,shade-12)})`;lc.beginPath();lc.ellipse(x,y,1.5+leafRandom()*3,.9+leafRandom()*1.8,leafRandom()*Math.PI,0,Math.PI*2);lc.fill();}
  const foliageTexture=new THREE.CanvasTexture(foliage);foliageTexture.colorSpace=THREE.SRGBColorSpace;textures.push(foliageTexture);
  materials.leaves.forEach(material=>{material.map=foliageTexture;material.userData.preserveUV=true;});
  materials.turf.forEach(m=>m.userData.groundReceiver=true);
  materials.asphalt.userData.groundReceiver=true;
  materials.pavers.userData.groundReceiver=true;
  materials.soil.userData.groundReceiver=true;
  materials.roofs.forEach(m=>m.side=THREE.DoubleSide);
  return { ...materials, dispose() { textures.forEach(t=>t.dispose()); Object.values(materials).flat().forEach(m=>m.dispose()); } };
}
export type Materials=ReturnType<typeof makeMaterials>;
