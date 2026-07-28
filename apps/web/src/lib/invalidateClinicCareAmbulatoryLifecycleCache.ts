import {
  invalidateGetRequestDedupeForPath,
  invalidateGetRequestDedupeMatching,
} from "@/lib/getRequestDedupe";
import { ambulatoryLifecycleCacheInvalidationPaths } from "@medora/shared";
import { invalidateClinicFollowUpProjectionCache } from "@/lib/invalidateClinicFollowUpProjectionCache";

/**
 * MEDUI.D4C.7D — invalidate Clinic Care + encounter GET dedupe after enterprise close.
 * Reuses getRequestDedupe + follow-up projection invalidation (typed cache drop only).
 */
export function invalidateClinicCareAmbulatoryLifecycleCache(input: {
  facilityId: string;
  encounterId: string;
}): void {
  const { facilityId, encounterId } = input;
  for (const path of ambulatoryLifecycleCacheInvalidationPaths({ encounterId })) {
    invalidateGetRequestDedupeForPath(path, facilityId);
  }
  invalidateClinicFollowUpProjectionCache(facilityId);
  invalidateGetRequestDedupeMatching(
    (key) =>
      key.includes(`GET:/encounters/${encounterId}`) && key.includes(`:${facilityId}`)
  );
}
