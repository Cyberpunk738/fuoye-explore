const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');

(async()=>{
  const browser=await chromium.launch({channel:'chrome',headless:true});
  const page=await browser.newPage();
  try {
    // Build the actual collision world without starting WebGL or the game loop.
    await page.route('**/src/main.ts',route=>route.fulfill({contentType:'application/javascript',body:''}));
    await page.goto(process.env.BASE_URL||'http://127.0.0.1:5173/');
    const report=await page.evaluate(async()=>{
      const [{buildWorld},{campusDeliveryStops,nearestDriveRoad},{tickCourier},data,terrain,cover]=await Promise.all([
        import('/src/world/build.ts'),import('/src/world/routes.ts'),import('/src/world/courier.ts'),
        ...['campus.geojson','terrain.json','landcover.json'].map(f=>fetch('/data/'+f).then(r=>r.json()))
      ]);
      const world=buildWorld(data.features,[5.3163,7.7772],{},terrain,cover);
      try {
        const stops=campusDeliveryStops(world.buildings,world.roads,world.blocked);
        const start=nearestDriveRoad(world.focus.position,world.roads,world.blocked).point;
        const trees=new Map();
        for(const t of world.treeTrunks){const k=`${Math.floor(t.x/12)},${Math.floor(t.z/12)}`;if(!trees.has(k))trees.set(k,[]);trees.get(k).push(t);}
        const clear=p=>{
          if(p.x<world.bounds.min.x||p.x>world.bounds.max.x||p.z<world.bounds.min.y||p.z>world.bounds.max.y||world.blocked(p,1.15))return false;
          const x=Math.floor(p.x/12),z=Math.floor(p.z/12);
          for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++)if(trees.get(`${x+dx},${z+dz}`)?.some(t=>Math.hypot(t.x-p.x,t.z-p.z)<1.45))return false;
          return true;
        };
        const segmentClear=(a,b)=>{
          const steps=Math.ceil(Math.hypot(b.x-a.x,b.z-a.z));
          for(let i=0;i<=steps;i++){const t=steps?i/steps:0;if(!clear({x:a.x+(b.x-a.x)*t,z:a.z+(b.z-a.z)*t}))return false;}
          return true;
        };
        // Flood a 6m grid, checking every edge at <=1m intervals. Off-road travel is
        // allowed by the game; this establishes collision reachability, not a map road route.
        const spacing=6,minX=world.bounds.min.x,minZ=world.bounds.min.y;
        const width=Math.floor((world.bounds.max.x-minX)/spacing)+1,depth=Math.floor((world.bounds.max.y-minZ)/spacing)+1;
        const point=index=>({x:minX+(index%width)*spacing,z:minZ+Math.floor(index/width)*spacing});
        const index=p=>Math.round((p.z-minZ)/spacing)*width+Math.round((p.x-minX)/spacing);
        const count=width*depth,parents=new Int32Array(count).fill(-1),free=new Int8Array(count),queue=new Int32Array(count);
        const startIndex=index(start);if(!segmentClear(start,point(startIndex)))throw Error('Spawn does not connect to audit grid');
        parents[startIndex]=startIndex;let head=0,tail=1;queue[0]=startIndex;
        const targets=stops.map(stop=>({stop,candidates:[],reached:-1}));
        for(const target of targets){const near=index(target.stop),row=Math.floor(near/width),col=near%width;for(let dz=-1;dz<=1;dz++)for(let dx=-1;dx<=1;dx++){const x=col+dx,z=row+dz;if(x>=0&&x<width&&z>=0&&z<depth){const i=z*width+x;if(segmentClear(point(i),target.stop))target.candidates.push(i);}}}
        const directions=[[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
        while(head<tail&&targets.some(t=>t.reached<0)){
          const current=queue[head++],a=point(current),row=Math.floor(current/width),col=current%width;
          for(const target of targets)if(target.reached<0&&target.candidates.includes(current))target.reached=current;
          for(const [dx,dz] of directions){const x=col+dx,z=row+dz;if(x<0||x>=width||z<0||z>=depth)continue;const next=z*width+x;if(parents[next]>=0)continue;const b=point(next);if(!free[next])free[next]=clear(b)?1:-1;if(free[next]<0||!segmentClear(a,b))continue;parents[next]=current;queue[tail++]=next;}
        }
        const routes=targets.map(({stop,reached})=>{
          if(reached<0)return {id:stop.id,name:stop.name,reachable:false,clear:clear(stop)};
          const path=[stop];for(let i=reached;;i=parents[i]){path.push(point(i));if(i===startIndex)break;}path.push(start);path.reverse();
          let distance=0;for(let i=1;i<path.length;i++)distance+=Math.hypot(path[i].x-path[i-1].x,path[i].z-path[i-1].z);
          // Exercise delivery, next-target and bonus rules at the actual audited stop.
          // This does not replace a full keyboard-driven journey and turning test.
          const result=tickCourier({remaining:30,score:0,deliveries:0,target:stop,over:false},.1,stop,5,stops,()=>0);
          return {id:stop.id,name:stop.name,reachable:true,clear:clear(stop),routeMetres:Math.round(distance),delivered:result.delivered?.id===stop.id,score:result.run.score,bonusApplied:result.run.remaining>29.9,nextDifferent:result.run.target?.id!==stop.id};
        });
        return {namedPrimaryCount:world.buildings.filter(b=>b.named&&b.directory).length,stopCount:stops.length,visited:head,method:'6m collision grid; 1m edge sampling; building/car padding 1.15m; tree padding 1.45m; off-road permitted',routes};
      } finally {world.dispose();}
    });
    await fs.mkdir('output',{recursive:true});
    await fs.writeFile('output/courier-routes.json',JSON.stringify(report,null,2));
    assert.equal(report.stopCount,report.namedPrimaryCount,'Some named places lack a roadside stop');
    for(const route of report.routes){assert.ok(route.reachable&&route.clear,route.name+' is blocked');assert.ok(route.delivered&&route.score>0&&route.bonusApplied&&route.nextDifferent,route.name+' delivery did not advance');}
    console.log('All courier stops reachable and delivery rules passed',report.routes.map(r=>({name:r.name,routeMetres:r.routeMetres})));
  } finally {await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
