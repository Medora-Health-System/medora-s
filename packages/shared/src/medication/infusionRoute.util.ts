/**
 * IVPB / infusion vs IV push — used by API infusion lifecycle (OrderEvent metadata only in Phase 1).
 * IVP and explicit push/bolus routes must remain false so one-step MAR push flow is unchanged.
 */
export function isIvpbInfusionRoute(route: string | null | undefined): boolean {
  const raw = route?.trim();
  if (!raw) return false;

  const n = raw
    .toLowerCase()
    .normalize("NFD")
    .replace(/\u0300-\u036f/g, "")
    .replace(/œ/g, "oe");

  if (n.includes("iv push") || n.includes("bolus")) return false;

  if (n.includes("ivpb")) return true;
  if (n.includes("infusion")) return true;
  /** Clinical synonym for IV piggyback / secondary IV line (distinct from IVP push). */
  if (n.includes("piggyback")) return true;

  if (n === "ivp") return false;
  if (/\bivp\b/.test(n) && !n.includes("ivpb")) return false;

  return false;
}
