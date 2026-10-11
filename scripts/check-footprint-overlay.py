from pathlib import Path
import json,math
from PIL import Image,ImageDraw,ImageFont
root=Path('.');data=json.loads((root/'public/data/campus.geojson').read_text(encoding='utf-8'))
for name,center,zoom in [('west',(5.3135,7.777),18),('north',(5.3139,7.7793),19),('east',(5.3221,7.7792),18)]:
 image=Image.open(root/f'tmp/maps/{name}-detail.png').convert('RGB');draw=ImageDraw.Draw(image);lookup={};i=0
 def point(p):
  scale=360/(256*2**zoom);return (720+(p[0]-center[0])/scale,500-(p[1]-center[1])/(scale*math.cos(math.radians(center[1]))))
 for f in data['features']:
  if f['properties']['kind']!='building':continue
  xy=point(f['properties']['center'])
  if not(80<xy[0]<1420 and 160<xy[1]<960):continue
  i+=1;lookup[str(i)]=f['id'];poly=[point(p) for p in f['geometry']['coordinates'][0]];draw.line(poly,fill='#ffdd30',width=2);draw.rectangle([xy[0]-2,xy[1]-2,xy[0]+20,xy[1]+13],fill='black');draw.text(xy,str(i),fill='#ffed4b')
 image.save(root/f'output/{name}-footprint-audit.jpg',quality=90)
 (root/f'output/{name}-footprint-audit.json').write_text(json.dumps(lookup,indent=2))
print('Saved footprint comparisons')
