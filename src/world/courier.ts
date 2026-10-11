import type { Point } from './math';

export interface DeliveryStop extends Point { id: string; name: string }
export interface CourierRun {
  remaining: number;
  score: number;
  deliveries: number;
  target?: DeliveryStop;
  over: boolean;
}

export function chooseDelivery(stops: DeliveryStop[], position: Point, previousId?: string, random = Math.random): DeliveryStop | undefined {
  const available = stops.filter(stop => stop.id !== previousId);
  const distant = available.filter(stop => Math.hypot(stop.x - position.x, stop.z - position.z) > 140);
  const pool = distant.length ? distant : available;
  return pool[Math.min(pool.length - 1, Math.floor(random() * pool.length))];
}

export function startCourier(stops: DeliveryStop[], position: Point, random = Math.random): CourierRun {
  const target = chooseDelivery(stops, position, undefined, random);
  return { remaining: 75, score: 0, deliveries: 0, target, over: !target };
}

// The delivery rule follows the reference: enter the 7m ring below 9m/s.
export function tickCourier(run: CourierRun, dt: number, position: Point, speed: number, stops: DeliveryStop[], random = Math.random) {
  if (run.over || !run.target) return { run, delivered: undefined, tooFast: false };
  let remaining = Math.max(0, run.remaining - Math.max(0, dt));
  if (remaining === 0) return { run: { ...run, remaining: 0, over: true }, delivered: undefined, tooFast: false };
  const distance = Math.hypot(run.target.x - position.x, run.target.z - position.z);
  if (distance >= 7 || Math.abs(speed) >= 9) {
    return { run: { ...run, remaining }, delivered: undefined, tooFast: distance < 7 };
  }
  const delivered = run.target, bonus = 100 + Math.round(remaining * 2);
  const target = chooseDelivery(stops, delivered, delivered.id, random);
  remaining += 6 + (target ? Math.hypot(target.x - delivered.x, target.z - delivered.z) : 300) / 14;
  return {
    run: { remaining, score: run.score + bonus, deliveries: run.deliveries + 1, target, over: !target },
    delivered: { ...delivered, bonus }, tooFast: false,
  };
}

export function formatTime(seconds: number) {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
