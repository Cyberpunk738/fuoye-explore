/** Collision reachability only, not a keyboard-driven vehicle test. */
export function reachableDestinations(world:any,stops:{id:string;x:number;z:number}[]):Set<string> {
  const spacing=6,minX=world.bounds.min.x,minZ=world.bounds.min.y;
  const width=Math.floor((world.bounds.max.x-minX)/spacing)+1,depth=Math.floor((world.bounds.max.y-minZ)/spacing)+1;
  const point=(i:number)=>({x:minX+i%width*spacing,z:minZ+Math.floor(i/width)*spacing});
  const index=(p:{x:number;z:number})=>Math.round((p.z-minZ)/spacing)*width+Math.round((p.x-minX)/spacing);
  const trees=new Map<string,{x:number;z:number}[]>();
  for(const tree of world.treeTrunks){const key=`${Math.floor(tree.x/12)},${Math.floor(tree.z/12)}`;trees.set(key,[...(trees.get(key)??[]),tree]);}
  const clear=(p:{x:number;z:number})=>{
    if(world.blocked(p,1.15))return false;
    const x=Math.floor(p.x/12),z=Math.floor(p.z/12);
    for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(trees.get(`${x+dx},${z+dz}`)?.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<1.45))return false;
    return true;
  };
  const edge=(a:{x:number;z:number},b:{x:number;z:number})=>{
    const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
    for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(!clear({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false;}
    return true;
  };
  const candidates=new Map<number,string[]>();
  for(const stop of stops){const n=index(stop),row=Math.floor(n/width),col=n%width;for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){const x=col+dx,z=row+dz;if(x<0||x>=width||z<0||z>=depth)continue;const i=z*width+x;if(edge(point(i),stop))candidates.set(i,[...(candidates.get(i)??[]),stop.id]);}}
  const start={x:world.entrance.approach.x,z:world.entrance.approach.z},near=index(start);
  const visited=new Uint8Array(width*depth),queue=new Int32Array(width*depth),reached=new Set<string>();
  if(!edge(start,point(near)))throw new Error('Entrance does not connect to collision-audit grid');
  let head=0,tail=1;queue[0]=near;visited[near]=1;
  while(head<tail&&reached.size<stops.length){
    const current=queue[head++],row=Math.floor(current/width),col=current%width;
    for(const id of candidates.get(current)??[])reached.add(id);
    for(const [dx,dz] of [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]]){
      const x=col+dx,z=row+dz;if(x<0||x>=width||z<0||z>=depth)continue;
      const next=z*width+x;if(visited[next]||!edge(point(current),point(next)))continue;visited[next]=1;queue[tail++]=next;
    }
  }
  return reached;
}
