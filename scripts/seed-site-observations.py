from pathlib import Path
import json,math
root=Path('.'); inv=json.loads((root/'research/oye-campus-inventory.json').read_text(encoding='utf-8'))
# Digitised observations, not cadastral measurements. Pixel anchors use the displayed north-up map centre/zoom.
def geo(p,center,zoom):
 dx,dy=p[0]-720,p[1]-500;s=360/(256*2**zoom)
 return [round(center[0]+dx*s,8),round(center[1]-dy*s*math.cos(math.radians(center[1])),8)]
def ring(points,center,zoom):
 pts=[geo(p,center,zoom) for p in points];return pts+[pts[0]]
north=[5.3139,7.7793];west=[5.3135,7.777];east=[5.3221,7.7792]
observations=[]
def feature(id,kind,pixels,center,zoom,tags,note):
 coords=ring(pixels,center,zoom) if kind!='road' else [geo(p,center,zoom) for p in pixels]
 observations.append({'id':'local/'+id,'kind':kind,'coordinates':coords,'tags':tags,'evidence':note,'sourceUrl':f'https://www.google.com/maps/@{center[1]},{center[0]},{zoom}z/data=!3m1!1e3','checkedOn':'2026-10-10','accuracy':'Approximate visual trace; roof edges and path widths are not a ground survey.'})
feature('senate','building',[(568,232),(607,234),(602,332),(645,334),(651,234),(700,237),(688,374),(550,366)],north,19,{},'U-shaped blue roof visible at New Senate pin; missing from the downloaded building dataset.')
inv['places'].append({'id':'senate','name':'New Senate Building','phase':2,'featureIds':['local/senate'],'position':[5.3136294,7.7796474],'match':'satellite-outline','source':'https://www.google.com/maps/search/FUOYE+Senate+Building+New','checkedOn':'2026-10-10','appearance':{'roof':'blue','roofForm':'compound','wall':'ivory','frontBearing':180,'evidence':'U-shaped roof observed in satellite view. Height and facade details estimated; exterior photograph not available.'}})
inv['unresolved']=[x for x in inv['unresolved'] if x['name']!='New Senate Building']
# Ground surfaces follow visible clearings, with buildings cut out by the renderer.
feature('admin-forecourt','land',[(839,627),(1129,627),(1120,872),(846,872)],north,19,{'surface':'paving_stones'},'Admin paved forecourt and parking visible around three mapped wings; no invented stall layout.')
feature('science-forecourt','land',[(756,420),(811,413),(857,463),(942,437),(1004,450),(1098,466),(1127,552),(1110,613),(922,634),(848,582),(776,568)],west,18,{'surface':'compacted'},'Visible science compound clearing; exact surface boundaries approximate.')
feature('management-forecourt','land',[(1235,734),(1428,723),(1438,848),(1244,846)],west,18,{'surface':'compacted'},'Management Sciences courtyard/approach visible in satellite view and building photograph.')
feature('phase1-auditorium-grounds','land',[(607,281),(885,273),(893,327),(814,357),(789,473),(596,459)],east,18,{'surface':'compacted'},'Phase 1 auditorium enclosure and hardstanding; planting/lawns left visible as separate ground.')
# Paths and local access missing from the road extract; only visible routes are traced.
feature('phase1-loop','road',[(593,268),(592,459),(644,473),(743,476),(777,462),(790,423),(797,326),(832,306)],east,18,{'highway':'service','surface':'compacted','width':'4.5'},'Visible loop west/south/east of Phase 1 auditorium.')
feature('science-access','road',[(1010,430),(1007,445),(942,462),(863,484),(842,541),(870,607),(866,689)],west,18,{'highway':'service','surface':'compacted','width':'4'},'Visible access through Faculty of Science compound; approximate centre line.')
feature('science-south-path','road',[(865,616),(951,638),(1008,652),(1077,693),(1117,733),(1185,735)],west,18,{'highway':'footway','surface':'ground','width':'2'},'Visible worn path between science blocks and eastern road.')
# Park enclosure, paths and centre feature are visible beside administration.
feature('admin-park','land',[(1060,201),(1188,206),(1178,352),(1041,340)],west,18,{'surface':'grass','campus:landscape':'park'},'Rectangular park beside administration visible in satellite view; official park name unresolved.')
for i,(a,b) in enumerate([((1113,251),(1081,221)),((1113,251),(1165,224)),((1113,251),(1149,324)),((1113,251),(1073,324)),((1113,251),(1115,284))]):
 feature('park-path-'+str(i),'road',[a,b],west,18,{'highway':'footway','surface':'paving_stones','width':'1.6'},'Visible diagonal park path, approximate centre line.')
(root/'research/oye-campus-inventory.json').write_text(json.dumps(inv,ensure_ascii=False,indent=2),encoding='utf-8')
(root/'research/oye-site-observations.json').write_text(json.dumps({'notes':'Manual observations from Maps screenshots. Not surveyed or guaranteed current. Screenshot files are excluded from distribution. No Google imagery is used as a runtime texture.','observations':observations},indent=2),encoding='utf-8')
print(len(observations),'site observations')
