/**
 * Phase 10A — Length of Stay (LOS) helpers for the ER trackboard.
 *
 * LOS source = `Encounter.createdAt` (the moment the encounter was opened).
 * The repo does not currently persist a separate `arrivalAt` / `intakeAt`
 * timestamp; `createdAt` is what the trackboard already labels as "Arrival".
 * If a more accurate arrival timestamp is added later, switch this single
 * helper — no other call sites need to change.
 *
 * Buckets:
 *   * normal    : LOS <  2 h
 *   * attention : 2 h ≤ LOS ≤ 4 h
 *   * high      : LOS >  4 h
 *
 * No PHI. No backend persistence. Display only.
 */

export type LosTier = "normal" | "attention" | "high";

export type LosResult = {
  ms: number;
  hours: number;
  minutes: number;
  tier: LosTier;
  /** Compact display: e.g. "0h47", "3h12", "5h08". Always 0-padded for the minutes part. */
  label: string;
};

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export function losTierFromMs(ms: number): LosTier {
  if (ms < TWO_HOURS_MS) return "normal";
  if (ms <= FOUR_HOURS_MS) return "attention";
  return "high";
}

/**
 * Compute LOS from an encounter's arrival source timestamp.
 *
 * @param arrivalLike - ISO string, Date, or anything coerceable to `new Date()`.
 * @param nowMs - Optional injected "now" for tests (default: `Date.now()`).
 */
export function computeLos(arrivalLike: unknown, nowMs?: number): LosResult | null {
  if (arrivalLike == null) return null;
  let arrival: Date;
  if (arrivalLike instanceof Date) {
    arrival = arrivalLike;
  } else if (typeof arrivalLike === "string" || typeof arrivalLike === "number") {
    arrival = new Date(arrivalLike);
  } else {
    return null;
  }
  const arrivedMs = arrival.getTime();
  if (!Number.isFinite(arrivedMs)) return null;

  const now = typeof nowMs === "number" && Number.isFinite(nowMs) ? nowMs : Date.now();
  const ms = Math.max(0, now - arrivedMs);
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const label = `${hours}h${minutes.toString().padStart(2, "0")}`;
  return {
    ms,
    hours,
    minutes,
    tier: losTierFromMs(ms),
    label,
  };
}

export const LOS_TIER_SOFT = {
  normal: { bg: "#ecfdf5", text: "#065f46", border: "#a7f3d0" },
  attention: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  high: { bg: "#fef2f2", text: "#991b1b", border: "#fecaca" },
} as const;
