import type { Position } from '../data';
import type { World } from '../world/engine';
import type { WorldProfile } from '../world/profile';
import type { TourStop } from '../world/tour';

export interface CampusDefinition {
  id: string;
  name: string;
  location: string;
  center: Position;
  data: { buildings: string; terrain?: string; landcover?: string };
  world: WorldProfile;
  tour: { summary: string; buildStops: (world: World) => TourStop[] };
  landmarks: { id: 'main' | 'phase2'; label: string; position?:Position }[];
  creditsHtml?: string;
  aboutHtml: string;
}

export interface CampusExperience {
  getBuildings(): {id:string;name:string;directory:boolean;named:boolean}[];
  getTourStops(): TourStop[];
  startTour(index?:number): void;
  focusFeature(id:string): void;
  highlight(id?:string): void;
  gateView(which?:'main'|'phase2'): void;
  destroy(): void;
}
