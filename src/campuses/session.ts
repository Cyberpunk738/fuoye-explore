export interface DisposableExperience { destroy(): void }

/** Latest selection wins. Release GPU resources before starting another campus. */
export function createCampusSession<T>(
  load: (id: string, signal: AbortSignal) => Promise<T>,
  mount: (id: string, data: T, signal: AbortSignal) => DisposableExperience | Promise<DisposableExperience>,
) {
  let generation=0, controller:AbortController|undefined, active:DisposableExperience|undefined, disposed=false;
  return {
    async select(id:string):Promise<boolean> {
      if(disposed)return false;
      const request=++generation;
      controller?.abort();controller=new AbortController();
      const signal=controller.signal;
      active?.destroy();active=undefined;
      try {
        const data=await load(id,signal);
        if(disposed||signal.aborted||request!==generation)return false;
        const experience=await mount(id,data,signal);
        if(disposed||signal.aborted||request!==generation){experience.destroy();return false;}
        active=experience;
        return true;
      } catch(error) {
        if(disposed||signal.aborted||request!==generation)return false;
        throw error;
      }
    },
    dispose() {
      disposed=true;generation++;controller?.abort();active?.destroy();active=undefined;
    },
  };
}
