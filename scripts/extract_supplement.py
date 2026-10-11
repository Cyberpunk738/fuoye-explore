"""Extract a small campus-area subset from the downloaded Microsoft building tile."""
import gzip
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BBOX = [5.307, 7.770, 5.323, 7.785]
features = []
with gzip.open(ROOT / "tmp/oye-footprints.geojsonl.gz", "rt", encoding="utf-8") as stream:
    for line in stream:
        f = json.loads(line)
        geometry = f.get("geometry", {})
        if geometry.get("type") != "Polygon":
            continue
        ring = geometry["coordinates"][0][:-1]
        if not ring:
            continue
        lon = sum(c[0] for c in ring) / len(ring)
        lat = sum(c[1] for c in ring) / len(ring)
        if not (BBOX[0] <= lon <= BBOX[2] and BBOX[1] <= lat <= BBOX[3]):
            continue
        f["id"] = "ms/" + hashlib.sha256(json.dumps(geometry, separators=(",", ":")).encode()).hexdigest()[:16]
        features.append(f)
result = {"type": "FeatureCollection", "features": features, "metadata": {"source": "Microsoft Global ML Building Footprints", "sourceUrl": "https://github.com/microsoft/GlobalMLBuildingFootprints", "tile": "122220311", "release": "2026-07-24", "license": "CDLA-Permissive-2.0", "retrievedOn": "2026-10-08", "bbox": BBOX, "scope": "Exploratory rectangle around apparent Phase 2, not a campus boundary. Machine-generated geometry, identities and exact freshness unverified."}}
(ROOT / "research/data/microsoft-oye-subset.geojson").write_text(json.dumps(result, separators=(",", ":")), encoding="utf-8")
print(f"Extracted {len(features)} candidate footprints")
