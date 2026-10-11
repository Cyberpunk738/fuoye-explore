interface Clock {
  now(): number;
  schedule(callback: () => void, delay: number): unknown;
  cancel(handle: unknown): void;
}

const browserClock: Clock = {
  now: () => performance.now(),
  schedule: (callback, delay) => setTimeout(callback, delay),
  cancel: handle => clearTimeout(handle as ReturnType<typeof setTimeout>),
};

// No timer or animation frame remains running when the scene is idle.
export function createRenderLoop(render: (dt: number) => boolean, fps = 24, clock: Clock = browserClock) {
  let pending: unknown, active = true, disposed = false, dirty = false;
  let last = clock.now() - 1000 / fps;
  function invalidate() {
    dirty = true;
    if (!active || disposed || pending !== undefined) return;
    pending = clock.schedule(() => {
      pending = undefined;
      if (!active || disposed) return;
      dirty = false;
      const now = clock.now(), dt = Math.min(Math.max((now - last) / 1000, 0), .05);
      last = now;
      const moving = render(dt);
      if (moving || dirty) invalidate();
    }, Math.max(0, last + 1000 / fps - clock.now()));
  }
  function cancel() {
    if (pending !== undefined) clock.cancel(pending);
    pending = undefined;
  }
  return {
    invalidate,
    setActive(value: boolean) {
      active = value;
      if (!value) cancel();
      else if (!disposed) invalidate();
    },
    dispose() { disposed = true; active = false; cancel(); },
  };
}
