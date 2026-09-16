import { describe, expect, it, afterEach } from "vitest";
import {
  facilityConfigurationIsValid,
  listFacilityConfigurationDependencies,
  registerFacilityConfigurationDependency,
  resetFacilityConfigurationDependencyRegistry,
  validateFacilityConfiguration,
} from "./facilityConfigurationDependencies.js";
import { defaultFacilityConfigurationSettings as defaultsFromConfig } from "./facilityConfiguration.js";

describe("Facility configuration dependency graph", () => {
  afterEach(() => {
    resetFacilityConfigurationDependencyRegistry();
  });

  it("accepts the default hospital configuration", () => {
    expect(validateFacilityConfiguration(defaultsFromConfig())).toEqual([]);
    expect(facilityConfigurationIsValid(defaultsFromConfig())).toBe(true);
  });

  it("rejects Patient Portal messaging while Digital Care is off", () => {
    const settings = defaultsFromConfig();
    settings.modules.digitalCare.enabled = false;
    settings.modules.digitalCare.hidden = true;
    settings.patientPortal.enabled = true;
    settings.digitalCare.secureMessaging = true;
    settings.patientPortal.messages = true;
    const issues = validateFacilityConfiguration(settings);
    expect(issues.some((issue) => issue.id === "messaging-requires-digital-care")).toBe(true);
  });

  it("rejects medication reconciliation while pharmacy is disabled", () => {
    const settings = defaultsFromConfig();
    settings.modules.pharmacy.enabled = false;
    settings.modules.pharmacy.hidden = true;
    settings.clinicalRules.medicationReconciliation = true;
    expect(validateFacilityConfiguration(settings).some((issue) => issue.id === "medication-reconciliation-requires-pharmacy")).toBe(true);
  });

  it("rejects auto release while result release is off", () => {
    const settings = defaultsFromConfig();
    settings.digitalCare.resultRelease = false;
    settings.digitalCare.autoRelease = true;
    expect(validateFacilityConfiguration(settings).some((issue) => issue.id === "auto-release-requires-result-release")).toBe(true);
  });

  it("rejects video visits while telehealth is disabled", () => {
    const settings = defaultsFromConfig();
    settings.modules.telemedicine.enabled = false;
    settings.modules.telemedicine.hidden = true;
    settings.digitalCare.videoVisits = true;
    expect(validateFacilityConfiguration(settings).some((issue) => issue.id === "video-visits-require-telehealth")).toBe(true);
  });

  it("rejects billing portal invoices while billing is disabled", () => {
    const settings = defaultsFromConfig();
    settings.modules.billing.enabled = false;
    settings.modules.billing.hidden = true;
    settings.patientPortal.invoices = true;
    expect(validateFacilityConfiguration(settings).some((issue) => issue.id === "billing-portal-requires-billing")).toBe(true);
  });

  it("lets future modules register a dependency", () => {
    registerFacilityConfigurationDependency({
      id: "future-wound-requires-hospital",
      childPath: "featureFlags.experimentalWorkspace",
      parentPath: "modules.hospital",
      messageKey: "facilityConfig.validation.future",
      childOn: (s) => s.featureFlags.experimentalWorkspace,
      parentOn: (s) => s.modules.hospital.enabled,
    });
    const settings = defaultsFromConfig();
    settings.featureFlags.experimentalWorkspace = true;
    settings.modules.hospital.enabled = false;
    settings.modules.hospital.hidden = true;
    expect(listFacilityConfigurationDependencies().some((row) => row.id === "future-wound-requires-hospital")).toBe(true);
    expect(validateFacilityConfiguration(settings).some((issue) => issue.id === "future-wound-requires-hospital")).toBe(true);
  });
});
