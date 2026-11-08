import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

export default defineConfig(({command}) => {
  // Public JSON paths can outlive a deployment in browser/CDN caches. Ship
  // content-addressed copies and bind their URLs into the matching JS bundle.
  const paths=['campus.geojson','terrain.json','landcover.json','ikole/campus.geojson','ikole/terrain.json','ikole/landcover.json'];
  const assets=paths.map(path=>{
    const source=readFileSync(fileURLToPath(new URL('./public/data/'+path,import.meta.url)));
    const hash=createHash('sha256').update(source).digest('hex').slice(0,16);
    const fileName='assets/campus-data/'+path.replaceAll('/','-').replace(/(\.[^.]+)$/,'-'+hash+'$1');
    return {path,source,fileName};
  });
  return {
  define:{__CAMPUS_DATA_URLS__:JSON.stringify(Object.fromEntries(assets.map(a=>['/data/'+a.path,command==='build'?'/'+a.fileName:'/data/'+a.path+'?v='+a.fileName.split('-').at(-1)])))},
  plugins:[{name:'campus-data-assets',apply:'build',buildStart(){for(const asset of assets)this.emitFile({type:'asset',fileName:asset.fileName,source:asset.source});}}],
  build: {
    rollupOptions: {
      input: {
        explorer: fileURLToPath(new URL('./index.html', import.meta.url)),
        review: fileURLToPath(new URL('./review.html', import.meta.url)),
      },
    },
  },
  };
});
