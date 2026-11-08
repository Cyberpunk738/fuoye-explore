import type { Dataset } from '../data';

declare const __CAMPUS_DATA_URLS__: Record<string,string>;

export function campusDataUrl(path:string):string {
  return typeof __CAMPUS_DATA_URLS__==='undefined'?path:__CAMPUS_DATA_URLS__[path]??path;
}

export async function loadCampusJson<T>(path:string,signal:AbortSignal):Promise<T> {
  const response=await fetch(campusDataUrl(path),{signal,cache:'no-store'});
  if(!response.ok)throw new Error(`Could not load ${path}`);
  return response.json() as Promise<T>;
}

/** Reject stale/incomplete map data before mounting scenery over missing roads. */
export function requireCampusFeatures(dataset:Dataset,required:string[]=[]):void {
  const ids=new Set(dataset.features.map(feature=>feature.id));
  if(required.some(id=>!ids.has(id)))throw new Error('Campus map data is out of date. Reload to get the latest campus.');
}
