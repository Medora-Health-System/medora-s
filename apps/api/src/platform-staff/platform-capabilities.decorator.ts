import { SetMetadata } from "@nestjs/common";
import type { PlatformCapabilityCode } from "./platform-capabilities";
export const PLATFORM_CAPABILITIES_METADATA = "platform-capabilities";
export type PlatformCapabilityRequirement = { codes: PlatformCapabilityCode[]; mode: "ANY" | "ALL"; allowPlatformPrincipal: boolean };
export const RequirePlatformCapabilities = (codes: PlatformCapabilityCode[], options: { mode?: "ANY" | "ALL"; allowPlatformPrincipal?: boolean } = {}) =>
  SetMetadata(PLATFORM_CAPABILITIES_METADATA, { codes, mode: options.mode ?? "ANY", allowPlatformPrincipal: options.allowPlatformPrincipal ?? true } satisfies PlatformCapabilityRequirement);
export const RequirePlatformPrincipal = () => SetMetadata(PLATFORM_CAPABILITIES_METADATA, { codes: [], mode: "ALL", allowPlatformPrincipal: true } satisfies PlatformCapabilityRequirement);
