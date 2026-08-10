import { SetMetadata } from "@nestjs/common";
import type { PlatformCapabilityCode } from "./platform-capabilities";
export const PLATFORM_CAPABILITIES_METADATA = "platform-capabilities";
export type PlatformMutationDenialAudit = {
  event: "PLATFORM_CAPABILITY_GRANT_DENIED" | "PLATFORM_CAPABILITY_REVOKE_DENIED" | "MEDORA_STAFF_CLASSIFICATION_DENIED";
  sourceOperation: string;
  requestedCapabilityFrom: "BODY" | "ROUTE" | "NONE";
};
export type PlatformCapabilityRequirement = {
  codes: PlatformCapabilityCode[];
  mode: "ANY" | "ALL";
  allowPlatformPrincipal: boolean;
  requireRecentMfa?: boolean;
  denialAudit?: PlatformMutationDenialAudit;
};
export const RequirePlatformCapabilities = (codes: PlatformCapabilityCode[], options: { mode?: "ANY" | "ALL"; allowPlatformPrincipal?: boolean } = {}) =>
  SetMetadata(PLATFORM_CAPABILITIES_METADATA, { codes, mode: options.mode ?? "ANY", allowPlatformPrincipal: options.allowPlatformPrincipal ?? true } satisfies PlatformCapabilityRequirement);
export const RequirePlatformPrincipal = (denialAudit?: PlatformMutationDenialAudit) =>
  SetMetadata(PLATFORM_CAPABILITIES_METADATA, { codes: [], mode: "ALL", allowPlatformPrincipal: true, requireRecentMfa: true, denialAudit } satisfies PlatformCapabilityRequirement);
