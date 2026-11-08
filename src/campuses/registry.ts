import type { CampusDefinition } from './types';
export const campusOptions = [{id:'oye',label:'Oye'},{id:'ikole',label:'Ikole'}] as const;
export type CampusId = typeof campusOptions[number]['id'];
export function campusFromSearch(search: string): CampusId {
  return new URLSearchParams(search).get('campus') === 'ikole' ? 'ikole' : 'oye';
}
export async function loadCampus(id: CampusId): Promise<CampusDefinition> {
  return id === 'ikole' ? (await import('./ikole')).ikoleCampus : (await import('./oye')).oyeCampus;
}
