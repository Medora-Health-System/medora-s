import type { PlatformCapabilityCode } from "./platform-capabilities";

export type PlatformCapabilityDecision = {
  granted: boolean;
  reason: "GRANTED" | "USER_NOT_FOUND" | "INACTIVE_USER" | "NOT_MEDORA_STAFF" | "INACTIVE_STAFF" | "CAPABILITY_MISSING";
  capabilities: ReadonlySet<string>;
};
type Store = { user: { findUnique(args: any): Promise<any> } };

/** Global, facility-independent resolver. Email, role assignments, flags and request context are intentionally not queried. */
export async function resolvePlatformCapabilities(store: Store, userId: string): Promise<PlatformCapabilityDecision> {
  const user = await store.user.findUnique({
    where: { id: userId },
    select: {
      isActive: true,
      medoraStaffProfile: { select: { isActive: true } },
      platformCapabilityGrants: {
        where: { isActive: true, revokedAt: null, capability: { isActive: true } },
        select: { capability: { select: { code: true } } },
      },
    },
  });
  const empty = new Set<string>();
  if (!user) return { granted: false, reason: "USER_NOT_FOUND", capabilities: empty };
  if (!user.isActive) return { granted: false, reason: "INACTIVE_USER", capabilities: empty };
  if (!user.medoraStaffProfile) return { granted: false, reason: "NOT_MEDORA_STAFF", capabilities: empty };
  if (!user.medoraStaffProfile.isActive) return { granted: false, reason: "INACTIVE_STAFF", capabilities: empty };
  const capabilities = new Set<string>(user.platformCapabilityGrants.map((grant: any) => grant.capability.code));
  return { granted: capabilities.size > 0, reason: capabilities.size ? "GRANTED" : "CAPABILITY_MISSING", capabilities };
}

export function hasRequiredCapabilities(
  resolved: PlatformCapabilityDecision,
  required: readonly PlatformCapabilityCode[],
  mode: "ANY" | "ALL",
): boolean {
  if (!required.length) return false;
  return mode === "ALL"
    ? required.every((code) => resolved.capabilities.has(code))
    : required.some((code) => resolved.capabilities.has(code));
}
