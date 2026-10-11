import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRenderLoop } from '../src/world/render-loop.ts';

function fakeClock() {
  let time = 0, id = 0;
  const tasks = new Map<number, { at: number; callback: () => void }>();
  return {
    now: () => time,
    schedule(callback: () => void, delay: number) {
      const handle = ++id;
      tasks.set(handle, { at: time + delay, callback });
      return handle;
    },
    cancel(handle: unknown) { tasks.delete(handle as number); },
    advance(ms: number) {
      const end = time + ms;
      for (;;) {
        const next = [...tasks].sort((a, b) => a[1].at - b[1].at)[0];
        if (!next || next[1].at > end) break;
        time = next[1].at;
        tasks.delete(next[0]);
        next[1].callback();
      }
      time = end;
    },
    pending: () => tasks.size,
  };
}

test('idle scene renders once and leaves no background work', () => {
  const clock = fakeClock(); let frames = 0;
  const loop = createRenderLoop(() => { frames++; return false; }, 24, clock);
  for (let i = 0; i < 100; i++) loop.invalidate();
  assert.equal(clock.pending(), 1);
  clock.advance(60_000);
  assert.equal(frames, 1);
  assert.equal(clock.pending(), 0);
  loop.invalidate(); clock.advance(100);
  assert.equal(frames, 2);
});

test('continuous navigation is capped and immediately stops when inactive', () => {
  const clock = fakeClock(); const times: number[] = [], deltas: number[] = [];
  const loop = createRenderLoop(dt => { times.push(clock.now()); deltas.push(dt); return true; }, 24, clock);
  loop.invalidate(); clock.advance(1000);
  assert.ok(times.length >= 23 && times.length <= 25);
  assert.ok(times.slice(1).every((t, i) => t - times[i] >= 1000 / 24 - .001));
  loop.setActive(false);
  const stopped = times.length;
  loop.invalidate(); clock.advance(60_000);
  assert.equal(times.length, stopped);
  assert.equal(clock.pending(), 0);
  loop.setActive(true); clock.advance(50);
  assert.ok(times.length > stopped);
  assert.ok(deltas.every(dt => dt <= .05));
  loop.dispose(); loop.setActive(true); loop.invalidate(); clock.advance(1000);
  assert.equal(clock.pending(), 0);
});

test('an update requested during a render is not lost', () => {
  const clock = fakeClock(); let frames = 0;
  const loop = createRenderLoop(() => { if (++frames === 1) loop.invalidate(); return false; }, 24, clock);
  loop.invalidate(); clock.advance(1000);
  assert.equal(frames, 2);
  assert.equal(clock.pending(), 0);
});
