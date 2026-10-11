"""Build the small main-campus runtime extract from open geometry and reviewed observations.
No network requests. The full Oye dataset remains available to the review workspace.
"""
from pathlib import Path
import json, math, copy
ROOT=Path(__file__).resolve().parents[1]
def inside(p,ring):
 x,y=p;hit=False
 for a,b in zip(ring,ring[1:]+ring[:1]):
  if (a[1]>y)!=(b[1]>y) and x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:hit=not hit
 return hit

def main():
 data=json.loads((ROOT/'public/data/oye.geojson').read_text(encoding='utf-8'))
 inventory=json.loads((ROOT/'research/oye-campus-inventory.json').read_text(encoding='utf-8'))
 observed=json.loads((ROOT/'research/oye-site-observations.json').read_text(encoding='utf-8'))
 features=[]
 for original in data['features']:
  f=copy.deepcopy(original);p=f['properties'];g=f['geometry'];x,y=p['center']
  if p['kind']=='building':
   if not inside([x,y],inventory['areaOfInterest']):continue
   # Keep numbered supporting structures, but do not turn small roof detections into destinations.
   p['campus']={'phase':1 if x>5.319 else 3 if x<5.3125 else 2,'directory':p['area']>=110,'identity':'unmatched'}
  elif p['kind']=='road':
   if not any(5.307<lon<5.325 and 7.771<lat<7.783 for lon,lat in g['coordinates']):continue
  else:continue
  features.append(f)
 for o in observed['observations']:
  coords=o['coordinates'];poly=o['kind']!='road';ring=coords[:-1] if poly else coords
  center=[sum(p[0] for p in ring)/len(ring),sum(p[1] for p in ring)/len(ring)]
  sx=111320*math.cos(math.radians(center[1]));xy=[((x-center[0])*sx,(y-center[1])*111320) for x,y in coords]
  area=abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(xy,xy[1:])))/2 if poly else 0
  features.append({'type':'Feature','id':o['id'],'geometry':{'type':'Polygon' if poly else 'LineString','coordinates':[coords] if poly else coords},'properties':{'osmId':'','source':'observation','kind':o['kind'],'tags':o['tags'],'sources':[o['sourceUrl']],'center':center,'area':round(area,1),'evidence':o['evidence'],'accuracy':o['accuracy'],'campus':{'phase':o.get('phase',2),'appearance':o.get('appearance'),'directory':o['kind']=='building' and area>=110,'identity':'unmatched'}}})
 byid={f['id']:f for f in features}
 for place in inventory['places']:
  for index,id in enumerate(place['featureIds']):
   if id not in byid:raise ValueError('Named footprint excluded from scene: '+id)
   f=byid[id];f['properties']['campus']={**place,'directory':index==0,'identity':place['match'],'primaryId':place['featureIds'][0]}
   f['properties']['tags']['name']=place['name'] if index==0 else place['name']+' · wing '+str(index+1)
 summary={kind:sum(f['properties']['kind']==kind for f in features) for kind in ['building','road','land']}
 meta={**data['metadata'],'preparedOn':'2026-10-11','scope':inventory['scope'],'summary':summary,'sceneCenter':[5.3163,7.7772],'inventory':'oye-campus-inventory.json','sourceDates':inventory['limitations']}
 output=ROOT/'public/data/campus.geojson';output.write_text(json.dumps({'type':'FeatureCollection','features':features,'metadata':meta},ensure_ascii=False,separators=(',',':')),encoding='utf-8')
 (ROOT/'public/data/campus-places.json').write_text(json.dumps(inventory,ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'summary':summary,'namedPlaces':len(inventory['places']),'bytes':output.stat().st_size}))
if __name__=='__main__':main()
