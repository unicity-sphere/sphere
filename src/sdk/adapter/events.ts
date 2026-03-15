/**
 * AdapterEventEmitter — lightweight local event emitter for adapters.
 *
 * Both DirectAdapter and ExtensionAdapter use this to provide
 * on()/off() event subscription to hooks like useSphereEvents.
 */

export type EventCallback = (data?: unknown) => void;

export class AdapterEventEmitter {
  private listeners = new Map<string, Set<EventCallback>>();

  on(event: string, cb: EventCallback): void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(cb);
  }

  off(event: string, cb: EventCallback): void {
    this.listeners.get(event)?.delete(cb);
  }

  emit(event: string, data?: unknown): void {
    const set = this.listeners.get(event);
    if (!set) return;
    for (const cb of set) {
      try {
        cb(data);
      } catch (err) {
        console.error(`[AdapterEventEmitter] Error in '${event}' listener:`, err);
      }
    }
  }

  removeAllListeners(): void {
    this.listeners.clear();
  }
}
