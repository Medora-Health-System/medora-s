/**
 * D3B HospitalEpisode foundation writer control.
 * Safe default: OFF (must be explicitly enabled).
 *
 * Env (any truthy match enables):
 * - HOSPITAL_EPISODE_FOUNDATION_ENABLED
 * - NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED
 *
 * When OFF: no automatic or service-gated writes that create episode rows in production
 * workflows; controlled service methods still refuse create unless flag ON (or test override).
 */

export const HOSPITAL_EPISODE_FOUNDATION_FLAG = "hospitalEpisodeFoundationEnabled" as const;

function isTruthyFlag(value: string | undefined | null): boolean {
  const v = (value ?? "").trim().toLowerCase();
  return v === "1" || v === "true" || v === "yes" || v === "on";
}

export type HospitalEpisodeFoundationFlagEnv = {
  HOSPITAL_EPISODE_FOUNDATION_ENABLED?: string | null;
  NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED?: string | null;
};

/** Pure resolver — pass env explicitly in tests; defaults OFF when unset. */
export function hospitalEpisodeFoundationEnabled(
  env?: HospitalEpisodeFoundationFlagEnv | null
): boolean {
  if (!env) return false;
  return (
    isTruthyFlag(env.HOSPITAL_EPISODE_FOUNDATION_ENABLED) ||
    isTruthyFlag(env.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED)
  );
}

/** Node/process helper for API (still defaults OFF). */
export function hospitalEpisodeFoundationEnabledFromProcessEnv(
  processEnv: NodeJS.ProcessEnv = typeof process !== "undefined" ? process.env : {}
): boolean {
  return hospitalEpisodeFoundationEnabled({
    HOSPITAL_EPISODE_FOUNDATION_ENABLED: processEnv.HOSPITAL_EPISODE_FOUNDATION_ENABLED,
    NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED:
      processEnv.NEXT_PUBLIC_HOSPITAL_EPISODE_FOUNDATION_ENABLED,
  });
}
