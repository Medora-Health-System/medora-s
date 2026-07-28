/** PERF.1D — short-lived GET in-flight + result dedupe (no PHI in keys/logs). */

export const DEFAULT_GET_DEDUPE_TTL_MS = 10_000;

type DedupeEntry = {
  promise?: Promise<unknown>;
  result?: { value: unknown; settledAt: number };
};

const entries = new Map<string, DedupeEntry>();

export function buildGetDedupeKey(path: string, facilityId?: string): string {
  return `GET:${path}:${facilityId ?? ""}`;
}

export function resetGetRequestDedupeForTests(): void {
  entries.clear();
}

export function invalidateGetRequestDedupeKey(key: string): void {
  entries.delete(key);
}

export function invalidateGetRequestDedupeForPath(path: string, facilityId?: string): void {
  invalidateGetRequestDedupeKey(buildGetDedupeKey(path, facilityId));
}

/** Drop all dedupe entries whose key matches the predicate (path prefix / facility). */
export function invalidateGetRequestDedupeMatching(predicate: (key: string) => boolean): number {
  let n = 0;
  for (const key of [...entries.keys()]) {
    if (predicate(key)) {
      entries.delete(key);
      n += 1;
    }
  }
  return n;
}

/** Verification helper — true when a fresh GET would return cached payload. */
export function hasGetDedupeCachedResult(
  key: string,
  ttlMs: number = DEFAULT_GET_DEDUPE_TTL_MS
): boolean {
  const entry = entries.get(key);
  if (!entry?.result) return false;
  return Date.now() - entry.result.settledAt < ttlMs;
}

export function getGetDedupeCachedValue<T>(key: string): T | undefined {
  return entries.get(key)?.result?.value as T | undefined;
}

export async function dedupeGetRequest<T>(
  key: string,
  fn: () => Promise<T>,
  ttlMs: number = DEFAULT_GET_DEDUPE_TTL_MS
): Promise<T> {
  const now = Date.now();
  const entry = entries.get(key);

  if (entry?.result && now - entry.result.settledAt < ttlMs) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[perf] GET dedupe cache hit", { key });
    }
    return entry.result.value as T;
  }

  if (entry?.promise) {
    if (process.env.NODE_ENV !== "production") {
      console.debug("[perf] GET dedupe in-flight reused", { key });
    }
    return entry.promise as Promise<T>;
  }

  const promise = fn()
    .then((value) => {
      entries.set(key, { result: { value, settledAt: Date.now() } });
      return value;
    })
    .catch((err) => {
      entries.delete(key);
      throw err;
    });

  entries.set(key, { promise });
  return promise as Promise<T>;
}
