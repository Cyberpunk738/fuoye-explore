from pathlib import Path
p=Path('src/data.ts');s=p.read_text(encoding='utf-8');s=s.replace("export interface Feature {", """export interface CampusProfile {
  id?:string; name?:string; phase:number; directory:boolean; identity:string; primaryId?:string;
  source?:string; checkedOn?:string; match?:string; note?:string;
  appearance?:{floors?:number;height?:number;wall?:string;roof?:string;roofForm?:string;facade?:string;frontBearing?:number;photoDate?:string;photoUrl?:string;evidence?:string};
}
export interface Feature {""").replace("source: 'osm' | 'microsoft'", "source: 'osm' | 'microsoft' | 'observation'").replace('center: Position; area: number }','center: Position; area: number; campus?:CampusProfile }').replace('ms\\/[a-f0-9]{16})$', 'ms\\/[a-f0-9]{16}|local\\/[a-z0-9-]{1,80})$');p.write_text(s,encoding='utf-8')
p=Path('src/explorer.ts');s=p.read_text(encoding='utf-8').replace("import type { Dataset, Feature }", "import type { Dataset }").replace("'/data/oye.geojson'","'/data/campus.geojson'")
a=s.index('    const inArea');b=s.index('    const buildings',a)
s=s[:a]+"    scene = module.createExplorerScene(document.querySelector('#scene')!, dataset.features, [5.3163,7.7772], readNotes(), select, terrain, cover);\n"+s[b:]
s=s.replace('[...scene.getBuildings()].sort((a,b) => a.name.localeCompare(b.name,undefined,{numeric:true}))',"[...scene.getBuildings()].filter(b=>b.directory).sort((a,b) => Number(b.named)-Number(a.named)||a.name.localeCompare(b.name,undefined,{numeric:true}))")
s=s.replace('Building heights, facade details, tree species and individual tree positions are reconstructions. Numbered buildings have not yet been matched to verified names. The university’s building names are never assigned to arbitrary footprints.','The scene covers Phases 1, 2 and 3. Named places are matched to Maps pins and visible compounds; a listing is not an official building survey. Ten places have source records. Smaller supporting structures remain visible in the scene.').replace('<a href="https://old.fuoye.edu.ng/physical-infrastructure-program-upgrade/" target="_blank" rel="noopener">FUOYE architectural references ↗</a>','<a href="https://maps.app.goo.gl/yDcJm6EFjyrKhLUY6" target="_blank" rel="noopener">FUOYE on Google Maps ↗</a> · <a href="/data/campus-places.json" target="_blank">Building evidence ↗</a>')
s=s.replace('<p><a href="/review.html">','<p>Maps imagery was inspected on 10 October 2026; its capture date is unavailable. Reviewed facade photos date from 2021–2022. Roof outlines, grounds and paths traced from imagery are approximate. Unobserved heights and facade details remain estimates.</p><p><a href="/review.html">')
p.write_text(s,encoding='utf-8')
p=Path('src/world/materials.ts');s=p.read_text(encoding='utf-8');s=s.replace("roofs:[surface('roof','#385f51',2),surface('roof','#596462',2),surface('roof','#815447',2)],", "roofs:[surface('roof','#4f776d',2),surface('roof','#7d8580',2),surface('roof','#815447',2),surface('roof','#697c9c',2),surface('roof','#b4b097',2)],\n    accent:plain('#b77843'),hostelInset:plain('#ae7963'),ivory:surface('plaster','#e8e1d2',6),")
s=s.replace("materials.pavers.userData.groundReceiver=true;","materials.pavers.userData.groundReceiver=true;\n  materials.soil.userData.groundReceiver=true;")
p.write_text(s,encoding='utf-8')
p=Path('package.json');import json;d=json.loads(p.read_text());d['scripts']['data:campus']='python scripts/prepare_campus.py';p.write_text(json.dumps(d,indent=2)+'\n',encoding='utf-8')
