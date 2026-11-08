"""Build Ikole runtime data offline from OSM and explicitly recorded observations.

Run after editing research/ikole-site-observations.json. No network requests.
Unknown buildings remain numbered; map labels identify compounds, not occupancy.
"""
from pathlib import Path
import copy, json, math, xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]

def inside(point, ring):
    x, y = point
    hit = False
    for a, b in zip(ring, ring[1:] + ring[:1]):
        if (a[1] > y) != (b[1] > y) and x < (b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]:
            hit = not hit
    return hit

def feature(identity, kind, coords, tags, source, sources, **extra):
    points = coords[:-1] if kind != 'road' else coords
    center = [sum(p[i] for p in points)/len(points) for i in range(2)]
    sx = 111320*math.cos(math.radians(center[1]))
    xy = [((x-center[0])*sx, (y-center[1])*111320) for x, y in coords]
    area = abs(sum(a[0]*b[1]-b[0]*a[1] for a,b in zip(xy,xy[1:])))/2 if kind != 'road' else 0
    return {'type':'Feature', 'id':identity,
            'geometry':{'type':'LineString' if kind == 'road' else 'Polygon', 'coordinates':coords if kind == 'road' else [coords]},
            'properties':{'osmId':identity.split('/')[-1] if source == 'osm' else '', 'source':source, 'kind':kind, 'tags':tags, 'sources':sources,
                          'center':center, 'area':round(area,1), 'campus':{'phase':0, 'directory':kind=='building' and area>=110, 'identity':'unmatched'}, **extra}}

def main():
    observed = json.loads((ROOT/'research/ikole-site-observations.json').read_text())
    osm = ET.parse(ROOT/'research/data/ikole-area.osm').getroot()
    nodes = {n.attrib['id']:[float(n.attrib['lon']),float(n.attrib['lat'])] for n in osm.findall('node')}
    features = []
    # These mapped roofs cross the entry lane. Replace with the open gatehouse
    # assembly so roof footprints do not become solid collision walls.
    gate_roofs = {'1498910997', '1498901626'}
    west, south, east, north = observed['terrainBbox']
    for way in osm.findall('way'):
        tags = {t.attrib['k']:t.attrib['v'] for t in way.findall('tag')}
        coords = [nodes[n.attrib['ref']] for n in way.findall('nd')]
        identity = 'way/'+way.attrib['id']
        if 'building' in tags and len(coords)>=4 and coords[0]==coords[-1]:
            f = feature(identity, 'building', coords, tags, 'osm', ['https://www.openstreetmap.org/'+identity])
            if inside(f['properties']['center'], observed['areaOfInterest']) and way.attrib['id'] not in gate_roofs:
                features.append(f)
        # Campus roads are visual traces; include only the short public-highway
        # context at the entrance, rather than unrelated residential town roads.
        elif tags.get('highway')=='primary':
            segments=[];current=[]
            for a,b in zip(coords,coords[1:]):
                if min(a[0],b[0])<=east and max(a[0],b[0])>=west and min(a[1],b[1])<=north and max(a[1],b[1])>=south:
                    if not current:current=[a]
                    current.append(b)
                elif current:
                    segments.append(current);current=[]
            if current:segments.append(current)
            for i,segment in enumerate(segments):
                f=feature(identity if i==0 else 'local/ikole-highway-segment-'+str(i),'road',segment,tags,'osm',['https://www.openstreetmap.org/'+identity])
                features.append(f)
    for record in observed['observations']:
        f = feature(record['id'],record['kind'],record['coordinates'],record['tags'],'observation',[record['sourceUrl']],evidence=record['evidence'],accuracy=record['accuracy'])
        if record.get('appearance'):f['properties']['campus']['appearance']=record['appearance']
        features.append(f)
    by_id={f['id']:f for f in features}
    if len(by_id)!=len(features):raise ValueError('Duplicate feature IDs')
    for place in observed['places']:
        for index,identity in enumerate(place['featureIds']):
            if identity not in by_id:raise ValueError('Missing named footprint: '+identity)
            f=by_id[identity]
            f['properties']['campus']={**f['properties']['campus'],**copy.deepcopy(place),'primaryId':place['featureIds'][0],'directory':index==0,'identity':place['match']}
            f['properties']['tags']['name']=place['name'] if index==0 else place['name']+' · wing '+str(index+1)
    summary={kind:sum(f['properties']['kind']==kind for f in features) for kind in ['building','road','land']}
    dest=ROOT/'public/data/ikole';dest.mkdir(parents=True,exist_ok=True)
    dataset={'type':'FeatureCollection','features':features,'metadata':{'campusId':'ikole','preparedOn':observed['checkedOn'],'bbox':observed['terrainBbox'],'sceneCenter':observed['sceneCenter'],'scope':observed['scope'],'summary':summary,'sources':[{'name':'OpenStreetMap','license':'ODbL-1.0','url':'https://www.openstreetmap.org/copyright'},{'name':'Local visual observations','url':observed['source'],'notes':'Approximate visual traces; no satellite tiles or photographs are bundled.'}]}}
    (dest/'campus.geojson').write_text(json.dumps(dataset,separators=(',',':'),ensure_ascii=False)+'\n')
    inventory={k:v for k,v in observed.items() if k!='observations'}
    inventory['replacedGateRoofs']=['way/'+identity for identity in sorted(gate_roofs)]
    inventory['limitations']='Scene extent is not a property boundary. Maps labels do not certify current occupancy. Road traces and roof outlines are approximate. Most heights, floors, facades, individual trees and gate elevations are estimates.'
    (dest/'campus-places.json').write_text(json.dumps(inventory,indent=2,ensure_ascii=False)+'\n')
    print(json.dumps({'summary':summary,'namedPlaces':len(observed['places']),'bytes':(dest/'campus.geojson').stat().st_size}))

if __name__=='__main__':main()
