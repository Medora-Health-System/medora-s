import { describe, expect, it } from "vitest";
import {
  defaultFacilityConfigurationSettings,
  projectFacilityRuntimeConfiguration,
  synchronizeDerivedSettings,
} from "@medora/shared";
import {
  patientMessagingVisible,
  patientReceivesVerifiedResultImmediately,
  providerApprovalRequiredForResult,
  providerMessagingTabVisible,
} from "./facilityConfigurationScenarios";

describe("Facility configuration operational scenarios", () => {
  it("scenario 1: enabling messaging shows provider and patient messaging", () => {
    const settings = synchronizeDerivedSettings(defaultFacilityConfigurationSettings());
    const runtime = projectFacilityRuntimeConfiguration("hospital-a", settings, 1);
    expect(providerMessagingTabVisible(runtime)).toBe(true);
    expect(patientMessagingVisible(runtime)).toBe(true);
  });

  it("scenario 2: disabling messaging hides provider and patient messaging", () => {
    const settings = synchronizeDerivedSettings({
      ...defaultFacilityConfigurationSettings(),
      digitalCare: {
        ...defaultFacilityConfigurationSettings().digitalCare,
        secureMessaging: false,
        providerChat: false,
        patientChat: false,
      },
      patientPortal: { ...defaultFacilityConfigurationSettings().patientPortal, messages: false },
    });
    const runtime = projectFacilityRuntimeConfiguration("hospital-a", settings, 2);
    expect(providerMessagingTabVisible(runtime)).toBe(false);
    expect(patientMessagingVisible(runtime)).toBe(false);
  });

  it("scenario 3: auto release publishes a verified result immediately", () => {
    const settings = synchronizeDerivedSettings({
      ...defaultFacilityConfigurationSettings(),
      digitalCare: {
        ...defaultFacilityConfigurationSettings().digitalCare,
        resultRelease: true,
        autoRelease: true,
        manualRelease: false,
        criticalResultWorkflow: false,
      },
    });
    expect(patientReceivesVerifiedResultImmediately(settings)).toBe(true);
  });

  it("scenario 4: disabling auto release requires provider approval", () => {
    const settings = synchronizeDerivedSettings({
      ...defaultFacilityConfigurationSettings(),
      digitalCare: {
        ...defaultFacilityConfigurationSettings().digitalCare,
        resultRelease: true,
        autoRelease: false,
        manualRelease: true,
      },
    });
    expect(providerApprovalRequiredForResult(settings)).toBe(true);
    expect(patientReceivesVerifiedResultImmediately(settings)).toBe(false);
  });

  it("scenario 5: Hospital A and Hospital B stay isolated", () => {
    const hospitalA = synchronizeDerivedSettings(defaultFacilityConfigurationSettings());
    const hospitalB = synchronizeDerivedSettings({
      ...defaultFacilityConfigurationSettings(),
      digitalCare: {
        ...defaultFacilityConfigurationSettings().digitalCare,
        secureMessaging: false,
        providerChat: false,
        patientChat: false,
      },
      patientPortal: { ...defaultFacilityConfigurationSettings().patientPortal, messages: false },
    });
    const runtimeA = projectFacilityRuntimeConfiguration("hospital-a", hospitalA, 3);
    const runtimeB = projectFacilityRuntimeConfiguration("hospital-b", hospitalB, 3);
    expect(providerMessagingTabVisible(runtimeA)).toBe(true);
    expect(providerMessagingTabVisible(runtimeB)).toBe(false);
    expect(patientMessagingVisible(runtimeA)).toBe(true);
    expect(patientMessagingVisible(runtimeB)).toBe(false);
    expect(runtimeA.facilityId).not.toBe(runtimeB.facilityId);
  });
});
