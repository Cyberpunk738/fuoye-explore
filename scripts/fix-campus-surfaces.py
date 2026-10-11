from pathlib import Path
p=Path('src/world/architecture.ts');s=p.read_text(encoding='utf-8-sig').replace('step=6,maxDepth=5)', 'step=6,maxDepth=5,uniform=false)').replace('if(depth<maxDepth&&longest>step)', 'if(depth<maxDepth&&(uniform||longest>step))')
a=s.index('  return drapedPolygon(rings,(x,z)=>{',s.index('export function compoundRoof'))
s=s[:a]+s[a:].replace('  return drapedPolygon(rings,(x,z)=>{','  const geometry=drapedPolygon(rings,(x,z)=>{',1).replace('return eave+Math.min(rise,distance*pitch);','return distance;',1).replace('  },5,4);','  },5,3,true);\n  const positions=geometry.attributes.position;let deepest=0;for(let i=0;i<positions.count;i++)deepest=Math.max(deepest,positions.getY(i));\n  const scale=deepest>0?Math.min(pitch,rise/deepest):0;for(let i=0;i<positions.count;i++)positions.setY(i,eave+positions.getY(i)*scale);geometry.computeVertexNormals();return geometry;',1)
s += '''
/** Clip a ground patch to the exact terrain triangles. Unlike an independently
 * subdivided overlay this cannot cut into the DEM or leave cracks at T-junctions. */
export function groundPolygon(rings:Point[][],height:(x:number,z:number)=>number,origin:Point,cell:Point,steps:number) {
  const vectors=rings.map(r=>r.map(p=>new THREE.Vector2(p.x,p.z))),vertices=rings.flat();
  const triangles=THREE.ShapeUtils.triangulateShape(vectors[0],vectors.slice(1)),positions:number[]=[];
  const side=(p:Point,a:Point,b:Point)=>(b.x-a.x)*(p.z-a.z)-(b.z-a.z)*(p.x-a.x);
  function clip(subject:Point[],boundary:Point[]){let result=subject;for(let i=0;i<boundary.length;i++){const input=result;result=[];const a=boundary[i],b=boundary[(i+1)%boundary.length];if(!input.length)break;let prev=input[input.length-1],dp=side(prev,a,b);for(const current of input){const dc=side(current,a,b);if((dc>=-1e-8)!==(dp>=-1e-8)){const t=dp/(dp-dc);result.push({x:prev.x+(current.x-prev.x)*t,z:prev.z+(current.z-prev.z)*t});}if(dc>=-1e-8)result.push(current);prev=current;dp=dc;}}return result;}
  for(const indexes of triangles){const triangle=indexes.map(i=>vertices[i]);const xs=triangle.map(p=>p.x),zs=triangle.map(p=>p.z);const x0=Math.max(0,Math.floor((Math.min(...xs)-origin.x)/cell.x)),x1=Math.min(steps-1,Math.floor((Math.max(...xs)-origin.x)/cell.x)),z0=Math.max(0,Math.floor((Math.min(...zs)-origin.z)/cell.z)),z1=Math.min(steps-1,Math.floor((Math.max(...zs)-origin.z)/cell.z));
    for(let row=z0;row<=z1;row++)for(let col=x0;col<=x1;col++){const a={x:origin.x+col*cell.x,z:origin.z+row*cell.z},b={x:a.x+cell.x,z:a.z},c={x:a.x+cell.x,z:a.z+cell.z},d={x:a.x,z:a.z+cell.z};for(const terrain of [[a,b,d],[b,c,d]]){const poly=clip(triangle,terrain);for(let i=1;i<poly.length-1;i++){const pts=[poly[0],poly[i],poly[i+1]];if(side(pts[2],pts[0],pts[1])>0)[pts[1],pts[2]]=[pts[2],pts[1]];for(const p of pts)positions.push(p.x,height(p.x,p.z),p.z);}}}
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.computeVertexNormals();return geometry;
}
'''
p.write_text(s,encoding='utf-8')
p=Path('src/world/build.ts');s=p.read_text(encoding='utf-8').replace('compoundRoof, drapedPolygon','compoundRoof, groundPolygon').replace('drapedPolygon([site.ring],(x,z)=>height(x,z)+.07,8,5)', 'groundPolygon([site.ring],(x,z)=>height(x,z)+.07,{x:worldBounds.min.x,z:worldBounds.min.y},{x:terrainSize.x/terrainSteps,z:terrainSize.y/terrainSteps},terrainSteps)')
# Photo glazing replaces the standard front windows rather than overlapping them.
s=s.replace('for(let floor=0;floor<b.floors;floor++){\n          const yy=', "for(let floor=0;floor<b.floors;floor++){\n          if(profile?.facade==='management'&&i===front&&floor>0)continue;\n          const yy=")
p.write_text(s,encoding='utf-8')
p=Path('src/world/materials.ts');s=p.read_text(encoding='utf-8').replace("soil:surface('soil','#aa8764',5)", "soil:surface('soil','#ad9b7f',5)");p.write_text(s,encoding='utf-8')
