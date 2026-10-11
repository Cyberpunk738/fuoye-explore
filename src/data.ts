export type Position = [number, number];
export interface CampusProfile {
  id?:string; name?:string; phase:number; directory:boolean; identity:string; primaryId?:string;
  source?:string; checkedOn?:string; match?:string; note?:string;
  appearance?:{floors?:number;height?:number;wall?:string;roof?:string;roofForm?:string;facade?:string;frontBearing?:number;photoDate?:string;photoUrl?:string;evidence?:string};
}
export interface Feature {
  type: 'Feature'; id: string;
  geometry: { type: 'Polygon'; coordinates: Position[][] } | { type: 'LineString'; coordinates: Position[] };
  properties: { osmId: string; source: 'osm' | 'microsoft' | 'observation'; kind: 'building' | 'road' | 'land'; tags: Record<string, string>; sources: string[]; center: Position; area: number; campus?:CampusProfile };
}
export interface Dataset { type: 'FeatureCollection'; features: Feature[]; metadata: { summary: Record<string, number>; bbox: number[]; scope: string } }
export interface Note { name: string; status: 'candidate' | 'identified'; evidence: string; updatedAt: string }
export type Notes = Record<string, Note>;
export const namingSource = 'https://news.fuoye.edu.ng/vc-fasina-inaugurates-national-recognition-scheme-in-fuoye/';
export const paperSource = 'https://repository.run.edu.ng/server/api/core/bitstreams/154faad4-eb62-4298-9b59-baf33406e0aa/content';
export const landmarks = [
  { name: 'Main administration', alias: 'Mohammed Yahuza Admin Block', clue: 'Phase 2 figure: west of the park, near the northern east–west road.', source: paperSource },
  { name: 'Faculty of Science', alias: 'Goodluck Ebele Jonathan Building', clue: 'Phase 2 figure: south of administration, west of the main north–south road.', source: paperSource },
  { name: 'Faculty of Education', alias: 'Peter Okebukola Building', clue: 'Phase 2 figure: in the southern part, east of the north–south road.', source: paperSource },
  { name: 'Faculty of Management Sciences', alias: 'Bisi Onasanya Building', clue: 'Phase 2 figure: east of the main road, near a twin hall.', source: paperSource },
  { name: 'Health centre', alias: 'Ameyo Stella Adadevoh Building', clue: 'Phase 2 figure: west of the main road, north of the girls’ hostel.', source: paperSource },
  { name: 'Theatre and Media Arts', alias: 'Wole Soyinka Auditorium', clue: 'Phase 2 figure: near FUOYE Water and the lower road toward Phase 1.', source: paperSource },
  { name: 'Main library', alias: 'Adesuyi Lanre Library', clue: 'Name established by university announcement; footprint still needs matching.', source: namingSource },
  { name: 'New senate building', alias: 'Bola Ahmed Tinubu Senate Building', clue: 'Name established by university announcement; footprint still needs matching.', source: namingSource },
  { name: 'Millennium Park', alias: 'Obafemi Awolowo Freedom Park', clue: 'Phase 2 figure labels a park next to administration. Confirm that this is the renamed park.', source: namingSource },
  { name: 'Sports arena', alias: 'Samuel Oparaji Sport Arena', clue: 'University announcement explicitly names the Oye sports arena.', source: namingSource },
  { name: 'Old female hostel', alias: 'Ibukun Awosika Hall', clue: 'University announcement explicitly places this hostel at Oye; match its footprint.', source: namingSource },
  { name: 'Old boys hostel', alias: 'Michael Opeyemi Bamidele Hall', clue: 'University announcement explicitly places this hostel at Oye; match its footprint.', source: namingSource },
];
export function escapeHtml(value: string): string { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]!)); }
const KEY = 'fuoye-oye-review-v1';
export function readNotes(): Notes {
  try { return validateNotes(JSON.parse(localStorage.getItem(KEY) ?? '{}')); } catch { return {}; }
}
export function validateNotes(value: unknown): Notes {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a notes object.');
  const result: Notes = {};
  for (const [id, note] of Object.entries(value)) {
    if (!/^(way\/\d+|ms\/[a-f0-9]{16}|local\/[a-z0-9-]{1,80})$/.test(id) || !note || typeof note !== 'object') throw new Error('Invalid building reference.');
    const n = note as Note;
    if (typeof n.name !== 'string' || !n.name.trim() || n.name.length > 160 || typeof n.evidence !== 'string' || n.evidence.length > 2000 || !['candidate', 'identified'].includes(n.status) || typeof n.updatedAt !== 'string') throw new Error('Invalid identification note.');
    if (n.status === 'identified' && !n.evidence.trim()) throw new Error('Identified buildings need evidence.');
    result[id] = { name: n.name, evidence: n.evidence, status: n.status, updatedAt: n.updatedAt };
  }
  return result;
}
export function persistNotes(notes: Notes): void { localStorage.setItem(KEY, JSON.stringify(notes)); }
