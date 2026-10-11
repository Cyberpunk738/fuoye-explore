import { nearestPoint } from './math';
import type { Point } from './math';
import type { DeliveryStop } from './courier';

interface DriveRoad { a: Point; b: Point; width: number }
interface Destination { id: string; name: string; named: boolean; directory: boolean; position: Point }

/** Shared by spawning, road reset and courier stops. Footpaths are not drive roads. */
export function nearestDriveRoad(position: Point, roads: DriveRoad[], blocked: (p: Point, padding: number) => boolean, minWidth = 4) {
  let point: Point | undefined, distance = Infinity, heading = 0;
  for (const road of roads) {
    if (road.width < minWidth) continue;
    const candidate = nearestPoint(position, road.a, road.b);
    const d = Math.hypot(candidate.x - position.x, candidate.z - position.z);
    if (d < distance && !blocked(candidate, 2)) {
      point = candidate;
      distance = d;
      heading = Math.atan2(road.b.x - road.a.x, road.b.z - road.a.z);
    }
  }
  return { point, distance, heading };
}

/** Rings are roadside drop-offs, not claims about the buildings' real entrances. */
export function campusDeliveryStops(buildings: Destination[], roads: DriveRoad[], blocked: (p: Point, padding: number) => boolean): DeliveryStop[] {
  return buildings.filter(b => b.named && b.directory).flatMap(building => {
    const road = nearestDriveRoad(building.position, roads, blocked);
    return road.point && road.distance < 150
      ? [{ id: building.id, name: building.name, ...road.point }]
      : [];
  });
}
