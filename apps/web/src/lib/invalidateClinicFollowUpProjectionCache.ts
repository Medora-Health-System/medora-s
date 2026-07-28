import {
  invalidateGetRequestDedupeForPath,
  invalidateGetRequestDedupeMatching,
} from "@/lib/getRequestDedupe";

const DASHBOARD_PERIODS = ["TODAY", "WEEK", "MONTH"] as const;

/**
 * MEDUI.D4C.5B.1 — drop cached Clinic dashboard / trackboard / follow-up GETs
 * after FollowUp create / complete / cancel so KPIs never stay stale.
 */
export function invalidateClinicFollowUpProjectionCache(facilityId: string): void {
  for (const period of DASHBOARD_PERIODS) {
    invalidateGetRequestDedupeForPath(
      `/clinic-care/dashboard?period=${encodeURIComponent(period)}`,
      facilityId
    );
  }
  invalidateGetRequestDedupeForPath("/clinic-care/trackboard", facilityId);
  invalidateGetRequestDedupeMatching(
    (key) => key.includes("GET:/follow-ups/upcoming") && key.includes(`:${facilityId}`)
  );
}
