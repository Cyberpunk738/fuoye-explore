import type { Point } from './math';

/** Keep a clear requested point exactly. Search outward only for an obstacle or
 * a point beyond the terrain. Callers provide walking or vehicle clearance;
 * neither mode is snapped to a road. */
export function resolveWalkSpawn(requested: Point, bounds: {min: Point; max: Point}, allowed: (p: Point) => boolean): Point | undefined {
  if (!Number.isFinite(requested.x + requested.z)) return undefined;
  const p = {x: Math.max(bounds.min.x + .5, Math.min(bounds.max.x - .5, requested.x)), z: Math.max(bounds.min.z + .5, Math.min(bounds.max.z - .5, requested.z))};
  const valid = (q: Point) => q.x >= bounds.min.x + .35 && q.x <= bounds.max.x - .35 && q.z >= bounds.min.z + .35 && q.z <= bounds.max.z - .35 && allowed(q);
  if (valid(p)) return p;
  for (let radius = .75; radius <= 120; radius += .75) {
    const count = Math.ceil(2 * Math.PI * radius / .75);
    for (let i = 0; i < count; i++) {
      const angle = i / count * Math.PI * 2;
      const candidate = {x: p.x + Math.cos(angle) * radius, z: p.z + Math.sin(angle) * radius};
      if (valid(candidate)) return candidate;
    }
  }
  return undefined;
}
