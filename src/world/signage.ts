import * as THREE from 'three';
import type { GeometryBatch } from './batch';

export interface SignEntry { key: string; lines: string[]; footer?: string; background?: string; color?: string; stretch?:number }
/** All campus lettering shares one bounded texture and one batched material. */
export function createSignage(entries: SignEntry[]) {
  if(entries.length>32)throw new Error('Campus sign atlas capacity exceeded');
  const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;
  const c=canvas.getContext('2d')!;const cells=new Map<string,number>();
  entries.forEach((entry,index)=>{
    cells.set(entry.key,index);const x=index%4*256,y=Math.floor(index/4)*128;
    c.fillStyle=entry.background??'#f1eddc';c.fillRect(x,y,256,128);
    c.strokeStyle=entry.color??'#123e31';c.lineWidth=3;c.strokeRect(x+5,y+5,246,118);
    c.fillStyle=entry.color??'#123e31';c.textAlign='center';c.textBaseline='middle';
    const lines=entry.lines,step=lines.length>2?25:30,center=y+(entry.footer?51:64);
    lines.forEach((line,i)=>{let size=24;c.font=`800 ${size}px Arial`;while(c.measureText(line).width>230&&size>9){size--;c.font=`800 ${size}px Arial`;}c.save();c.translate(x+128,center+(i-(lines.length-1)/2)*step);c.scale(1,entry.stretch??1);c.fillText(line,0,0,230);c.restore();});
    if(entry.footer){c.font='bold 12px Arial';c.fillText(entry.footer,x+128,y+103,230);}
  });
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.generateMipmaps=false;texture.minFilter=THREE.LinearFilter;
  const material=new THREE.MeshBasicMaterial({map:texture,side:THREE.DoubleSide,toneMapped:false});
  material.userData.preserveUV=true;material.userData.ownedTexture=texture;
  return {material,add(batch:GeometryBatch,key:string,width:number,height:number,position:THREE.Vector3,angle:number){
    const index=cells.get(key);if(index===undefined)return;
    const geometry=new THREE.PlaneGeometry(width,height),uv=geometry.attributes.uv;
    const left=(index%4*256+2)/1024,bottom=1-(Math.floor(index/4)*128+126)/1024;
    for(let i=0;i<uv.count;i++)uv.setXY(i,left+uv.getX(i)*252/1024,bottom+uv.getY(i)*124/1024);
    geometry.rotateY(angle);geometry.translate(position.x,position.y,position.z);batch.add(geometry,material);
  }};
}
