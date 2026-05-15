import { apiFetch } from "@/lib/apiClient";

export type PlatformAnnouncementDto = {
  id: string;
  title: string;
  body: string;
  severity: string | null;
  versionKey: string;
  startsAt: string | null;
  expiresAt: string | null;
  createdAt: string;
};

function isAnnouncementRecord(v: unknown): v is PlatformAnnouncementDto {
  if (!v || typeof v !== "object" || Array.isArray(v)) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.id === "string" &&
    typeof o.title === "string" &&
    typeof o.body === "string" &&
    (o.severity === null || typeof o.severity === "string") &&
    typeof o.versionKey === "string"
  );
}

/** GET /platform-announcements/active — JWT via proxy; facilityId optional (MSPP-only). */
export async function fetchActivePlatformAnnouncements(
  facilityId?: string
): Promise<PlatformAnnouncementDto[]> {
  const raw = await apiFetch("/platform-announcements/active", {
    method: "GET",
    ...(facilityId ? { facilityId } : {}),
  });
  if (!Array.isArray(raw)) return [];
  return raw.filter(isAnnouncementRecord);
}

/** POST /platform-announcements/:id/acknowledge — idempotent on server. */
export async function acknowledgePlatformAnnouncement(
  id: string,
  facilityId?: string
): Promise<{ ok: true }> {
  return (await apiFetch(`/platform-announcements/${encodeURIComponent(id)}/acknowledge`, {
    method: "POST",
    ...(facilityId ? { facilityId } : {}),
    body: JSON.stringify({}),
  })) as { ok: true };
}
