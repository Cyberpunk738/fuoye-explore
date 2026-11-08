// Backward-compatible Oye entry point for the review workspace and existing tools.
// The explorer passes a campus profile directly to the campus-independent engine.
import type { Feature, Notes, Position } from '../data';
import type { TerrainGrid } from './math';
import type { LandCover } from './vegetation';
import type { WorldProfile } from './profile';
import { buildCampusWorld } from './engine';
import { oyeWorldProfile } from '../campuses/oye/world';

export type { BuildingAsset, RoadSegment, World } from './engine';
export { buildCampusWorld } from './engine';
export function buildWorld(features: Feature[], center: Position, notes: Notes, grid?: TerrainGrid, cover?: LandCover, profile: WorldProfile = oyeWorldProfile) {
  return buildCampusWorld(features, center, notes, profile, grid, cover);
}
