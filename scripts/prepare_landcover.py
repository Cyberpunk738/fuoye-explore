"""Read only the selected campus window of ESA WorldCover's public cloud-optimized raster.

Requires rasterio. Never downloads the full global/tile dataset.
"""
from pathlib import Path
import json, argparse
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'tmp' / 'geo-deps'))
import rasterio
from rasterio.windows import from_bounds, bounds
import certifi, ssl

root = Path(__file__).resolve().parents[1]
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--python-http',action='store_true',help='Read bounded HTTPS ranges through Python instead of GDAL/libcurl')
parser.add_argument('--campus',choices=['oye','ikole'],default='oye')
args=parser.parse_args()
bbox=json.loads((root/'research/ikole-site-observations.json').read_text())['terrainBbox'] if args.campus=='ikole' else [5.304,7.768,5.325,7.787]
url = 'https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_N06E003_Map.tif'
cache={}
def python_open(path, mode='rb'):
    if path!=url:raise FileNotFoundError(path)
    from http_range import HTTPRangeReader
    return HTTPRangeReader(url,cache)
with rasterio.Env(GDAL_DISABLE_READDIR_ON_OPEN='EMPTY_DIR', CPL_VSIL_CURL_ALLOWED_EXTENSIONS='.tif', GDAL_HTTP_TIMEOUT='30', GDAL_HTTP_CAINFO=ssl.get_default_verify_paths().cafile or certifi.where()):
    with rasterio.open(url if args.python_http else '/vsicurl/'+url,**({'opener':python_open} if args.python_http else {})) as dataset:
        window = from_bounds(*bbox, dataset.transform).round_offsets().round_lengths()
        data = dataset.read(1, window=window)
        bbox = bounds(window, dataset.transform)

document = {
    'bbox': list(bbox), 'width': int(data.shape[1]), 'height': int(data.shape[0]),
    'values': data.ravel().tolist(),
    'metadata': {
        'source': 'ESA WorldCover 10 m 2021 v200', 'url': url, 'year': 2021,
        'license': 'CC BY 4.0', 'doi': 'https://doi.org/10.5281/zenodo.7254221',
        'notes': 'Satellite-derived 10m land-cover classes. Class 10 is tree cover. Tree species, heights and individual render positions are estimates. This is 2021 coverage, not a current campus tree survey.',
    },
}
destination = root / ('public/data/ikole/landcover.json' if args.campus=='ikole' else 'public/data/landcover.json')
destination.parent.mkdir(parents=True,exist_ok=True)
destination.write_text(json.dumps(document, separators=(',', ':')), encoding='utf-8')
print(f'{destination}: {document["width"]} x {document["height"]}, {sum(v == 10 for v in document["values"])} tree-cover cells', flush=True)
