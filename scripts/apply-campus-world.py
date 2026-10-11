from pathlib import Path
p=Path('src/world/build.ts');s=p.read_text(encoding='utf-8')
s=s.replace("import { GeometryBatch }", "import { compoundRoof, drapedPolygon } from './architecture';\nimport { GeometryBatch }")
s=s.replace("source:string;}","source:string;directory:boolean;named:boolean;placeId?:string;}",1)
s=s.replace('width:number;length:number;}','width:number;length:number;surface:string;}')
s=s.replace("const explicit=Number(f.properties.tags['building:levels']);const floors=Number.isFinite(explicit)&&explicit>0?Math.min(5,explicit):f.properties.area>350?2:1;", "const profile=f.properties.campus?.appearance;const explicit=profile?.floors??Number(f.properties.tags['building:levels']);const floors=Number.isFinite(explicit)&&explicit>0?Math.min(5,explicit):f.properties.area>350?2:1;")
s=s.replace('height:floors*3.6,floors', 'height:profile?.height??floors*3.6,floors')
s=s.replace('source:f.properties.source});','source:f.properties.source,directory:f.properties.campus?.directory??true,named:!!f.properties.campus?.id,placeId:f.properties.campus?.id});')
s=s.replace("const width=['footway','path','steps'].includes(f.properties.tags.highway)?2:f.properties.tags.highway==='service'?4.5:7;", "const width=Number(f.properties.tags.width)||(['footway','path','steps'].includes(f.properties.tags.highway)?2:f.properties.tags.highway==='service'?4.5:7);const surface=f.properties.tags.surface??(width<3?'ground':'asphalt');")
s=s.replace('roads.push({a,b,width,length});','roads.push({a,b,width,length,surface});')
s=s.replace('let offset=onRoad(p)? .4:0;',"let offset=0;for(const s of roads){const q=nearestPoint(p,s.a,s.b);if(Math.hypot(p.x-q.x,p.z-q.z)<s.width/2)offset=Math.max(offset,s.surface==='asphalt'?.4:.13);}for(const site of groundSites)if(pointInRing(p,site.ring))offset=Math.max(offset,.08);")
s=s.replace("  function ribbon(","""  const groundSites=features.filter(f=>f.properties.kind==='land'&&f.geometry.type==='Polygon').map(f=>({feature:f,ring:f.geometry.type==='Polygon'?f.geometry.coordinates[0].slice(0,-1).map(project):[]}));
  for(const site of groundSites){const surface=site.feature.properties.tags.surface,material=surface==='grass'?m.turf[0]:surface==='paving_stones'?m.pavers:m.soil;batch.add(drapedPolygon([site.ring],(x,z)=>height(x,z)+.07,8,5),material);}
  function ribbon(""")
s=s.replace("  const heroIds=new Set(['ms/f0fb2b3536f87a09','ms/8e441f4da274c677','ms/1b77ae9be7b6829b','ms/04bb754dd858094c']);", "  const heroIds=new Set(sourceBuildings.filter(f=>f.properties.campus?.id).map(f=>f.id));")
s=s.replace("const rng=randomFrom(hashSeed(b.id));const wall=m.walls[Math.floor(rng()*m.walls.length)];const roof=m.roofs[rng()<.78?0:rng()<.7?1:2];const y=b.position.y,h=b.height;", "const rng=randomFrom(hashSeed(b.id)),profile=f.properties.campus?.appearance;const wall=profile?.wall==='ivory'?m.ivory:m.walls[profile?.wall==='cream'?0:Math.floor(rng()*m.walls.length)];const roofIndex=({green:0,grey:1,red:2,blue:3,sand:4} as Record<string,number>)[profile?.roof??'']??(f.properties.campus?.phase===3?3:0);const roof=m.roofs[roofIndex];const y=b.position.y,h=b.height;")
s=s.replace("const score=nearestRoad(p).distance+(length<longest*.5?25:0);", "let score=nearestRoad(p).distance+(length<longest*.5?25:0);if(profile?.frontBearing!==undefined){const bearing=profile.frontBearing*Math.PI/180,dx=(c.x-a.x)/length,dz=(c.z-a.z)/length;let nx=-dz,nz=dx;if(pointInRing({x:p.x+nx*.3,z:p.z+nz*.3},b.ring)){nx=-nx;nz=-nz;}score=(1-(nx*Math.sin(bearing)-nz*Math.cos(bearing)))*1000-length;}")
s=s.replace("const rectangular=f.properties.area/(w*d)>.78;", "const rectangular=f.properties.area/(w*d)>.94&&profile?.roofForm!=='compound';")
s=s.replace("const roofType=rectangular?(heroIds.has(b.id)?'hip':rng()<.68?'hip':'gable'):'terrace';b.style=roofType==='terrace'?'Terrace / parapet study':roofType==='hip'?'Hip roof / veranda study':'Gable roof study';", "const roofType=profile?.roofForm==='terrace'?'terrace':rectangular?(profile?.roofForm==='gable'?'gable':'hip'):'compound';b.style=profile?.facade?profile.facade+' · photo-informed':roofType+' roof · estimated height';")
s=s.replace("    if(rectangular){const rise", "    if(rectangular&&roofType!=='terrace'){const rise")
s=s.replace("    }else{const g=new THREE.ShapeGeometry(shape);", "    }else if(roofType==='compound'){const rings=f.geometry.coordinates.map(r=>r.slice(0,-1).map(project));batch.add(compoundRoof(rings,y+h+.12,Math.min(4.5,Math.max(1.4,d*.25))),roof);\n    }else{const g=new THREE.ShapeGeometry(shape);")
s=s.replace("if(n.dot(midEdge.clone().sub(center2))<0)n.negate();", "if(pointInRing({x:midEdge.x+n.x*.3,z:midEdge.y+n.y*.3},b.ring))n.negate();")
s=s.replace("if(!rectangular)box(length,.55", "if(roofType==='terrace')box(length,.55")
s=s.replace("const windowSpacing=heroIds.has(b.id)?3.7:4.8+rng();", "const windowSpacing=profile?.facade==='hostel'?3.1:heroIds.has(b.id)?3.7:4.8+rng();")
s=s.replace("const yy=y+1.95+floor*3.6;\n          panel(1.55,1.75,p.x,yy,p.y,m.trim,angle);panel(1.32,1.48,p.x+n.x*.035,yy,p.y+n.y*.035,m.windows,angle);", "const yy=y+1.95+floor*3.6;const admin=profile?.facade==='admin',ww=admin?2.3:1.32,wh=admin?1.1:1.48;\n          if(profile?.facade==='hostel'&&floor>0&&j%4<2)panel(2.9,2.8,p.x-n.x*.02,yy,p.y-n.y*.02,m.hostelInset,angle);\n          panel(ww+.23,wh+.27,p.x,yy,p.y,m.trim,angle);panel(ww,wh,p.x+n.x*.035,yy,p.y+n.y*.035,m.windows,angle);")
s=s.replace("      if(i===front){", """      if(profile?.facade==='admin'&&length>5){
        const ncols=Math.max(2,Math.floor(length/5));
        for(let j=0;j<=ncols;j++){const q=midEdge.clone().addScaledVector(direction,(j/ncols-.5)*length).addScaledVector(n,.24);box(.35,h+.3,.5,q.x,y+h/2,q.y,m.accent,angle);}
        box(length,.55,.55,midEdge.x+n.x*.25,y+h-.05,midEdge.y+n.y*.25,m.accent,angle);
      }
      if(i===front){""")
s=s.replace("b.entrance.set(entry.x,height(entry.x,entry.y),entry.y);const large", "b.entrance.set(entry.x,height(entry.x,entry.y),entry.y);if(f.properties.area<110)continue;const large")
s=s.replace("const canopyHeight=large?3.55:2.9;", "const canopyHeight=profile?.facade==='management'?h-.15:large?3.55:2.9;")
s=s.replace("cyl(.17,.21,canopyHeight,p.x,y+canopyHeight/2,p.y,m.trim);", "if(profile?.facade==='management')box(.55,canopyHeight,.55,p.x,y+canopyHeight/2,p.y,wall,angle);else cyl(.17,.21,canopyHeight,p.x,y+canopyHeight/2,p.y,m.trim);")
s=s.replace("        if(large&&b.floors>1){", """        if(profile?.facade==='management'){
          const columns=Math.max(3,Math.floor(porticoWidth/1.5));
          for(let j=0;j<columns;j++){const q=midEdge.clone().addScaledVector(direction,(j+.5)/columns*porticoWidth-porticoWidth/2).addScaledVector(n,.22);panel(porticoWidth/columns-.08,2.9,q.x,y+5.25,q.y,m.windows,angle);}
          const plate=document.createElement('canvas');plate.width=512;plate.height=64;const ctx=plate.getContext('2d')!;ctx.fillStyle='#f3ecdc';ctx.fillRect(0,0,512,64);ctx.fillStyle='#183775';ctx.font='bold 28px sans-serif';ctx.textAlign='center';ctx.fillText('FACULTY OF MANAGEMENT SCIENCES',256,42,496);const texture=new THREE.CanvasTexture(plate);texture.colorSpace=THREE.SRGBColorSpace;const material=new THREE.MeshLambertMaterial({map:texture,side:THREE.DoubleSide});material.userData.ownedTexture=texture;const mesh=new THREE.Mesh(new THREE.PlaneGeometry(Math.min(porticoWidth,12),.8),material);mesh.rotation.y=angle;mesh.position.set(midEdge.x+n.x*.32,y+3.7,midEdge.y+n.y*.32);root.add(mesh);
        }
        if(profile?.facade==='hostel'){
          const balconyWidth=Math.min(10,length*.28),depth=2;
          for(let floor=1;floor<b.floors;floor++){const q=midEdge.clone().addScaledVector(n,depth/2);box(balconyWidth,.18,depth,q.x,y+floor*3.6,q.y,m.trim,angle);const rail=midEdge.clone().addScaledVector(n,depth);for(const offset of [.4,.9])box(balconyWidth,.06,.07,rail.x,y+floor*3.6+offset,rail.y,m.trim,angle);for(let j=0;j<=8;j++){const post=rail.clone().addScaledVector(direction,(j/8-.5)*balconyWidth);box(.045,.95,.045,post.x,y+floor*3.6+.5,post.y,m.trim);}}
          const q=midEdge.clone().addScaledVector(n,1.2);box(balconyWidth+1,.2,3,q.x,y+h,q.y,roof,angle);
        }
        if(large&&b.floors>1&&profile?.facade!=='management'&&profile?.facade!=='hostel'){""")
s=s.replace("for(const s of roads){ribbon(s.a,s.b,s.width+2.5,m.pavers,.16);ribbon(s.a,s.b,s.width,m.asphalt,.38);if(s.width>4)", "for(const s of roads){if(s.surface!=='asphalt'){ribbon(s.a,s.b,s.width,s.surface==='paving_stones'?m.pavers:m.soil,.12);continue;}ribbon(s.a,s.b,s.width+1,m.pavers,.16);ribbon(s.a,s.b,s.width,m.asphalt,.38);if(s.width>4)")
s=s.replace("Math.floor(t/4)%2===0?m.white:m.green", "Math.floor(t/4)%2===0?m.white:m.steel")
s=s.replace("p=>blocked(p,14)||onRoad(p,7)", "p=>blocked(p,8)||onRoad(p,3)||groundSites.some(site=>pointInRing(p,site.ring))")
s=s.replace("land===10?'#82a679'", "land===10?'#66885d'")
s=s.replace("const selected=buildings.find(b=>b.id==='ms/f0fb2b3536f87a09')", "const selected=buildings.find(b=>b.placeId==='science')")
p.write_text(s,encoding='utf-8')
p=Path('src/explorer-scene.ts');s=p.read_text(encoding='utf-8').replace('world.buildings.flatMap(b=>{const q=', 'world.buildings.filter(b=>b.named&&b.directory).flatMap(b=>{const q=');s=s.replace('return q.distance<100?', 'return q.distance<150?');p.write_text(s,encoding='utf-8')
p=Path('src/world/vegetation.ts');s=p.read_text(encoding='utf-8').replace('crown.scale(1,.85,1);','crown.scale(1.7,.95,1.7);');p.write_text(s,encoding='utf-8')
