/**
 * Bounded short-interval duplicate suppression for repetitive non-critical logs.
 * Never use for unique ERROR / security / controlled-medication safety events.
 */

export type DedupGate = {
  /** Returns true if this emission should proceed. */
  allow(key: string): boolean;
  reset(): void;
  size(): number;
};

export function createLogDedupGate(options?: {
  intervalMs?: number;
  maxKeys?: number;
  now?: () => number;
}): DedupGate {
  const intervalMs = options?.intervalMs ?? 60_000;
  const maxKeys = options?.maxKeys ?? 256;
  const now = options?.now ?? Date.now;
  const lastByKey = new Map<string, number>();

  return {
    allow(key: string): boolean {
      const t = now();
      const prev = lastByKey.get(key);
      if (prev !== undefined && t - prev < intervalMs) {
        return false;
      }
      lastByKey.set(key, t);
      if (lastByKey.size > maxKeys) {
        // Drop oldest entries (insertion order).
        const overflow = lastByKey.size - maxKeys;
        let i = 0;
        for (const k of lastByKey.keys()) {
          lastByKey.delete(k);
          i += 1;
          if (i >= overflow) break;
        }
      }
      return true;
    },
    reset(): void {
      lastByKey.clear();
    },
    size(): number {
      return lastByKey.size;
    },
  };
}
