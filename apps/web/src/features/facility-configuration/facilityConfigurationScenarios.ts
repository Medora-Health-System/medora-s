import type { FacilityRuntimeConfiguration } from "@medora/shared";
import { digitalCareVisibleTabs } from "@/features/digital-care/digitalCareWorkspaceView";
import { shouldAutoReleaseDiagnosticResult, type FacilityConfigurationSettings } from "@medora/shared";

export function providerMessagingTabVisible(runtime: Pick<FacilityRuntimeConfiguration, "digitalCare"> | null | undefined): boolean {
  return digitalCareVisibleTabs(runtime).includes("messages");
}

export function patientMessagingVisible(runtime: Pick<FacilityRuntimeConfiguration, "patientPortal" | "digitalCare" | "messaging"> | null | undefined): boolean {
  return Boolean(runtime?.digitalCare.secureMessaging && runtime?.patientPortal.messages && runtime?.messaging.enabled);
}

export function patientReceivesVerifiedResultImmediately(settings: FacilityConfigurationSettings): boolean {
  return shouldAutoReleaseDiagnosticResult({
    settings,
    kind: "LAB_TEST",
    critical: false,
    verifiedAt: new Date("2026-01-01T00:00:00Z"),
    now: new Date("2026-01-01T00:00:01Z"),
  });
}

export function providerApprovalRequiredForResult(settings: FacilityConfigurationSettings): boolean {
  return !patientReceivesVerifiedResultImmediately(settings);
}
