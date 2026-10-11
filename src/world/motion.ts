import type { MovementInput } from './navigation';

export interface CarMotion { speed: number; lateral: number; yaw: number }
export function stepCar(state: CarMotion, input: MovementInput, dt: number, onRoad: boolean) {
  const throttle = Number(input.forward) - Number(input.back);
  let speed = state.speed + throttle * (throttle < 0 && state.speed > .5 ? 22 : throttle < 0 ? 8 : 11) * dt;
  speed *= Math.exp(-(throttle ? .28 : 1.4) * dt);
  speed = Math.max(-9, Math.min(onRoad ? 28 : 14, speed));
  const steer = Number(input.left) - Number(input.right);
  const yaw = state.yaw + steer * speed / 2.7 * .6 / (1 + Math.abs(speed) / 14) * dt;
  const lateral = (state.lateral - (yaw - state.yaw) * speed) * Math.exp(-(input.brake ? 1.1 : 10) * dt);
  if (input.brake) speed *= Math.exp(-.9 * dt);
  return { speed, lateral, yaw,
    x: (Math.sin(yaw) * speed + Math.cos(yaw) * lateral) * dt,
    z: (Math.cos(yaw) * speed - Math.sin(yaw) * lateral) * dt };
}

export function stepJump(height: number, velocity: number, jump: boolean, dt: number) {
  if (height <= 0 && jump) velocity = 4.6;
  velocity -= 16 * dt;
  height += velocity * dt;
  if (height <= 0) return { height: 0, velocity: 0 };
  return { height, velocity };
}
