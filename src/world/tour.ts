import * as THREE from 'three';
import type { World } from './build';
import { buildOyeTourStops } from '../campuses/oye/tour.ts';

export interface TourStop {
  id: string;
  stepNumber: number;
  phaseBadge: string;
  category: string;
  title: string;
  railLabel?: string;
  subtitle: string;
  description: string;
  studentTip: string;
  highlights: string[];
  cameraPos: THREE.Vector3;
  targetPos: THREE.Vector3;
  walkSpawn: { x: number; z: number };
  orbitRadius: number;
  orbitHeight: number;
  baseAzimuth: number;
  buildingId?: string;
}

export interface TourFlightState {
  fromPos: THREE.Vector3;
  toPos: THREE.Vector3;
  fromTarget: THREE.Vector3;
  toTarget: THREE.Vector3;
  arcHeight: number;
  duration: number;
  elapsed: number;
}

/**
 * Computes a smooth cinematic camera position and look-at target along a flight
 * between two tour stops, adding a gentle parabolic altitude arc over long distances.
 */
export function evaluateTourFlight(
  flight: TourFlightState,
  progress: number
): { position: THREE.Vector3; target: THREE.Vector3 } {
  const t = THREE.MathUtils.clamp(progress, 0, 1);
  // Quintic smoothstep for ultra-smooth cinematic acceleration and deceleration
  const ease = t * t * t * (t * (t * 6 - 15) + 10);

  const position = new THREE.Vector3().lerpVectors(flight.fromPos, flight.toPos, ease);
  // Parabolic vertical arc peaks at mid-flight (4 * t * (1 - t) == 1 at t = 0.5)
  const arc = 4 * ease * (1 - ease) * flight.arcHeight;
  position.y += arc;

  const target = new THREE.Vector3().lerpVectors(flight.fromTarget, flight.toTarget, ease);
  return { position, target };
}

/** Legacy entry point for the Oye tour. Other campuses supply their own stop builder. */
export function buildGuidedTourStops(world: World): TourStop[] {
  return buildOyeTourStops(world);
}
