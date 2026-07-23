/**
 * D4A.2.8-HF3 — Client helper for server-owned facility switch.
 */

export type SwitchActiveFacilityResult =
  | { ok: true; facilityId: string; previousFacilityId: string | null }
  | { ok: false; status: number; code: string | null; message: string };

export async function switchActiveFacility(facilityId: string): Promise<SwitchActiveFacilityResult> {
  const requested = String(facilityId ?? "").trim();
  if (!requested) {
    return { ok: false, status: 400, code: "FACILITY_REQUIRED", message: "Facility ID required." };
  }

  const res = await fetch("/api/auth/facility", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ facilityId: requested }),
  });

  let data: Record<string, unknown> | null = null;
  try {
    data = (await res.json()) as Record<string, unknown>;
  } catch {
    data = null;
  }

  if (!res.ok) {
    return {
      ok: false,
      status: res.status,
      code: typeof data?.code === "string" ? data.code : null,
      message:
        typeof data?.error === "string"
          ? data.error
          : typeof data?.message === "string"
            ? data.message
            : "Facility switch failed.",
    };
  }

  const resolved =
    typeof data?.facilityId === "string" && data.facilityId.trim()
      ? data.facilityId.trim()
      : requested;
  const previous =
    typeof data?.previousFacilityId === "string" && data.previousFacilityId.trim()
      ? data.previousFacilityId.trim()
      : null;

  return { ok: true, facilityId: resolved, previousFacilityId: previous };
}
