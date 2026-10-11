"""Download and sample Mapzen Terrarium elevation for the Oye study area."""
import io,json,math,urllib.request
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[1]
BBOX=[5.304,7.768,5.325,7.787]
ZOOM=14
N=97
cache={}
urls=[]
def tile_xy(lon,lat):
 return ((lon+180)/360*2**ZOOM,(1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*2**ZOOM)
def elevation(lon,lat):
 x,y=tile_xy(lon,lat); tx,ty=int(x),int(y)
 if (tx,ty) not in cache:
  url=f'https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{ZOOM}/{tx}/{ty}.png'
  with urllib.request.urlopen(url,timeout=40) as response: raw=response.read()
  cache[tx,ty]=Image.open(io.BytesIO(raw)).convert('RGB'); urls.append(url)
  print('Downloaded',url,flush=True)
 im=cache[tx,ty]; px=(x-tx)*256; py=(y-ty)*256
 ix,iy=min(254,int(px)),min(254,int(py)); fx,fy=min(1,px-ix),min(1,py-iy)
 def h(dx,dy):
  r,g,b=im.getpixel((ix+dx,iy+dy)); return r*256+g+b/256-32768
 return (h(0,0)*(1-fx)+h(1,0)*fx)*(1-fy)+(h(0,1)*(1-fx)+h(1,1)*fx)*fy
values=[]
for row in range(N):
 lat=BBOX[3]-(BBOX[3]-BBOX[1])*row/(N-1)
 for col in range(N):
  lon=BBOX[0]+(BBOX[2]-BBOX[0])*col/(N-1)
  values.append(round(elevation(lon,lat),2))
result={'bbox':BBOX,'width':N,'height':N,'values':values,'metadata':{'source':'Mapzen Terrain Tiles','url':'https://registry.opendata.aws/terrain-tiles/','tileUrls':urls,'attribution':'Global terrain data courtesy of the U.S. Geological Survey; Mapzen Terrain Tiles','retrievedOn':'2026-10-08','notes':'Interpolated elevation grid; source resolution varies. Not a campus survey. No vertical exaggeration.'}}
(ROOT/'public/data/terrain.json').write_text(json.dumps(result,separators=(',',':')),encoding='utf-8')
print('Height range',min(values),max(values))

