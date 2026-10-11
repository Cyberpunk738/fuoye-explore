"""Prepare local OSM extracts without network requests or guessed building identities."""
import json
import math
from pathlib import Path
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1]
FILES = ["oye-area.osm", "oye-south-area.osm", "oye-campus-west.osm"]
BBOX = [5.300, 7.765, 5.350, 7.810]
nodes, ways, counts = {}, {}, {}
for filename in FILES:
    tree = ET.parse(ROOT / "research" / "data" / filename).getroot()
    for node in tree.findall("node"):
        nodes[node.attrib["id"]] = [float(node.attrib["lon"]), float(node.attrib["lat"])]
    counts[filename] = {"nodes": len(tree.findall("node")), "ways": len(tree.findall("way"))}
    for way in tree.findall("way"):
        entry = ways.setdefault(way.attrib["id"], {"element": way, "sources": []})
        entry["sources"].append(filename)

features, skipped = [], 0
for osm_id, entry in ways.items():
    way = entry["element"]
    tags = {tag.attrib["k"]: tag.attrib["v"] for tag in way.findall("tag")}
    kind = "building" if "building" in tags and tags["building"] != "no" else "road" if "highway" in tags else "land" if "landuse" in tags else None
    if kind is None:
        continue
    refs = [nd.attrib["ref"] for nd in way.findall("nd")]
    if not refs or any(ref not in nodes for ref in refs):
        skipped += 1
        continue
    coords = [nodes[ref] for ref in refs]
    if len(coords) < 2:
        skipped += 1
        continue
    # Exclude complete ways whose bbox does not intersect the combined download extent.
    xs, ys = zip(*coords)
    if max(xs) < BBOX[0] or min(xs) > BBOX[2] or max(ys) < BBOX[1] or min(ys) > BBOX[3]:
        continue
    closed = refs[0] == refs[-1] and len(coords) >= 4
    if kind in ("building", "land") and not closed:
        skipped += 1
        continue
    ring = coords[:-1] if closed else coords
    center = [sum(c[0] for c in ring) / len(ring), sum(c[1] for c in ring) / len(ring)]
    # Local approximate footprint area, suitable for review rather than cadastral measurement.
    scale_x = 111320 * math.cos(math.radians(center[1]))
    xy = [((c[0] - center[0]) * scale_x, (c[1] - center[1]) * 111320) for c in coords]
    area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(xy, xy[1:]))) / 2 if closed else 0
    properties = {"osmId": osm_id, "source": "osm", "kind": kind, "tags": tags, "sources": entry["sources"], "center": center, "area": round(area, 1), "identityStatus": "unverified"}
    features.append({"type": "Feature", "id": f"way/{osm_id}", "properties": properties, "geometry": {"type": "Polygon" if kind != "road" else "LineString", "coordinates": [coords] if kind != "road" else coords}})

def point_inside(point, ring):
    x, y = point
    inside = False
    for a, b in zip(ring, ring[1:]):
        if (a[1] > y) != (b[1] > y) and x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]:
            inside = not inside
    return inside

supplement_path = ROOT / "research/data/microsoft-oye-subset.geojson"
supplement_added, supplement_duplicates = 0, 0
if supplement_path.exists():
    supplement = json.loads(supplement_path.read_text(encoding="utf-8"))
    osm_buildings = [f for f in features if f["properties"]["kind"] == "building"]
    for f in supplement["features"]:
        coords = f["geometry"]["coordinates"][0]
        ring = coords[:-1]
        center = [sum(c[0] for c in ring) / len(ring), sum(c[1] for c in ring) / len(ring)]
        # Conservative overlap heuristic: preserve OSM when either centroid is inside
        # the other footprint or their centres are within 8m. Remaining overlaps need review.
        duplicate = any(point_inside(center, o["geometry"]["coordinates"][0]) or point_inside(o["properties"]["center"], coords) or math.hypot((center[0] - o["properties"]["center"][0]) * 110300, (center[1] - o["properties"]["center"][1]) * 111320) < 8 for o in osm_buildings)
        if duplicate:
            supplement_duplicates += 1
            continue
        sx = 111320 * math.cos(math.radians(center[1]))
        xy = [((c[0] - center[0]) * sx, (c[1] - center[1]) * 111320) for c in coords]
        area = abs(sum(a[0] * b[1] - b[0] * a[1] for a, b in zip(xy, xy[1:]))) / 2
        f["properties"] = {"osmId": "", "source": "microsoft", "kind": "building", "tags": {}, "sources": ["microsoft-oye-subset.geojson"], "center": center, "area": round(area, 1), "identityStatus": "unverified"}
        features.append(f)
        supplement_added += 1

summary = {kind: sum(f["properties"]["kind"] == kind for f in features) for kind in ("building", "road", "land")}
summary.update({"microsoftAdded": supplement_added, "microsoftDuplicatesSkipped": supplement_duplicates})
result = {"type": "FeatureCollection", "features": features, "metadata": {"preparedOn": "2026-10-08", "bbox": BBOX, "source": "OpenStreetMap", "license": "ODbL-1.0", "attribution": "© OpenStreetMap contributors", "sourceFiles": counts, "summary": summary, "skipped": skipped, "scope": "Exploratory Oye-area extracts; campus boundary and building identities unverified."}}
output = ROOT / "public" / "data"
result["metadata"]["sources"] = [
    {"name": "OpenStreetMap", "license": "ODbL-1.0", "url": "https://www.openstreetmap.org/copyright"},
    {"name": "Microsoft Global ML Building Footprints", "license": "CDLA-Permissive-2.0", "url": "https://github.com/microsoft/GlobalMLBuildingFootprints", "release": "2026-07-24"},
] if supplement_path.exists() else [{"name": "OpenStreetMap", "license": "ODbL-1.0"}]
result["metadata"]["scope"] = "Exploratory Oye-area geometry from separately attributed sources; campus boundary and building identities unverified."
output.mkdir(parents=True, exist_ok=True)
(output / "oye.geojson").write_text(json.dumps(result, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
print(json.dumps({"summary": summary, "skipped": skipped, "bytes": (output / "oye.geojson").stat().st_size}))
