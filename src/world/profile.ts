import type * as THREE from 'three';
import type { Feature, Position } from '../data';
import type { BuildingAsset } from './engine';
import type { GeometryBatch } from './batch';
import type { Materials } from './materials';
import type { Point } from './math';
import type { createSignage, SignEntry } from './signage';

export type HeightSampler = (x: number, z: number) => number;
export interface CampusEntrance {
  position: THREE.Vector3;
  approach: THREE.Vector3;
}
export interface CampusWorldContext {
  root: THREE.Group;
  batch: GeometryBatch;
  m: Materials;
  signs: ReturnType<typeof createSignage>;
  center: Position;
  features: Feature[];
  height: HeightSampler;
  surfaceHeight: HeightSampler;
  structureBounds: THREE.Box2[];
  lamps: THREE.Vector3[];
  buildings: BuildingAsset[];
  pickables: THREE.Mesh[];
  terrainClip: { origin: Point; cell: Point; steps: number };
  project: (position: Position) => Point;
  nearestRoad: (point: Point) => { point: Point | undefined; distance: number };
  groundSites: { feature: Feature; ring: Point[] }[];
  onRoad: (point: Point, padding?: number) => boolean;
  blocked: (point: Point, padding?: number) => boolean;
  ribbon: (a: Point, b: Point, width: number, material: THREE.Material, offset?: number) => void;
}

/** Campus-specific scenery is injected into the shared terrain/building engine. */
export interface WorldProfile {
  focusPlaceId?: string;
  customGroundFeatures?: string[];
  appearance: (feature: Feature) => { facade?: string; roof?: string };
  grade: (context: {
    project: (position: Position) => Point;
    rawHeight: HeightSampler;
    buildingHeight: HeightSampler;
  }) => HeightSampler;
  signs: SignEntry[];
  decorate: (context: CampusWorldContext) => {
    entrance: CampusEntrance;
    phase2Entrance?: CampusEntrance;
    reserved: (point: Point) => boolean;
    people: number;
    parkingLots: number;
  };
  plant: (context: CampusWorldContext) => { trees: Point[]; bushes: Point[] };
}
