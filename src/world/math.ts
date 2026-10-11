import type { Position } from '../data';
export interface TerrainGrid { bbox: [number, number, number, number]; width: number; height: number; values: number[]; metadata: { source: string; attribution: string; notes: string } }
export type Point = { x: number; z: number };
export function projectPosition(p: Position, center: Position): Point { return { x: (p[0]-center[0])*111320*Math.cos(center[1]*Math.PI/180), z: -(p[1]-center[1])*111320 }; }
export function unprojectPosition(p: Point, center: Position): Position { return [center[0]+p.x/(111320*Math.cos(center[1]*Math.PI/180)),center[1]-p.z/111320]; }
export function sampleElevation(grid: TerrainGrid | undefined, lon: number, lat: number): number {
  if (!grid) return 0;
  const [west,south,east,north]=grid.bbox;
  const x=Math.max(0,Math.min(grid.width-1,(lon-west)/(east-west)*(grid.width-1)));
  const y=Math.max(0,Math.min(grid.height-1,(north-lat)/(north-south)*(grid.height-1)));
  const ix=Math.min(grid.width-2,Math.floor(x)), iy=Math.min(grid.height-2,Math.floor(y)), fx=x-ix, fy=y-iy;
  const a=grid.values[iy*grid.width+ix], b=grid.values[iy*grid.width+ix+1], c=grid.values[(iy+1)*grid.width+ix], d=grid.values[(iy+1)*grid.width+ix+1];
  return (a*(1-fx)+b*fx)*(1-fy)+(c*(1-fx)+d*fx)*fy;
}
export function nearestPoint(p: Point,a: Point,b: Point): Point {
  const dx=b.x-a.x,dz=b.z-a.z, length=dx*dx+dz*dz;
  const t=length ? Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.z-a.z)*dz)/length)) : 0;
  return {x:a.x+dx*t,z:a.z+dz*t};
}
export function pointInRing(p: Point,ring: Point[]): boolean {
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++) {const a=ring[i],b=ring[j]; if((a.z>p.z)!==(b.z>p.z) && p.x<(b.x-a.x)*(p.z-a.z)/(b.z-a.z)+a.x)inside=!inside;}
  return inside;
}
export function hashSeed(text: string): number { let h=2166136261; for(const c of text) h=Math.imul(h^c.charCodeAt(0),16777619); return h>>>0; }
export function randomFrom(seed: number) { let s=seed>>>0; return ()=> {s=(Math.imul(s,1664525)+1013904223)>>>0;return s/4294967296;}; }
export function clipSegment(a:Point,b:Point,min:Point,max:Point):[Point,Point]|undefined {
  let start=0,end=1;
  for(const key of ['x','z'] as const){const delta=b[key]-a[key];if(Math.abs(delta)<1e-12){if(a[key]<min[key]||a[key]>max[key])return;continue;}let lo=(min[key]-a[key])/delta,hi=(max[key]-a[key])/delta;if(lo>hi)[lo,hi]=[hi,lo];start=Math.max(start,lo);end=Math.min(end,hi);if(start>end)return;}
  return [{x:a.x+(b.x-a.x)*start,z:a.z+(b.z-a.z)*start},{x:a.x+(b.x-a.x)*end,z:a.z+(b.z-a.z)*end}];
}
