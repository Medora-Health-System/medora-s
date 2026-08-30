/** Bounded exponential backoff with jitter for transient auth/backend outages. */

export const AUTH_TRANSIENT_BACKOFF_MS = [1_000, 2_000, 4_000, 8_000, 15_000, 30_000] as const;

export function nextAuthTransientBackoffMs(
  attempt: number,
  random: () => number = Math.random
): number {
  const idx = Math.max(0, Math.min(attempt, AUTH_TRANSIENT_BACKOFF_MS.length - 1));
  const base = AUTH_TRANSIENT_BACKOFF_MS[idx]!;
  const jitter = Math.floor(base * 0.25 * Math.max(0, Math.min(1, random())));
  return base + jitter;
}

export function isTransientAuthFailureKind(
  kind: string | null | undefined
): boolean {
  return kind === "unavailable" || kind === "network" || kind === "timeout";
}
