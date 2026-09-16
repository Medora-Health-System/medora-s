import { describe, expect, it } from "vitest";
import {
  applyFacilityConsoleModulesToServiceLines,
  defaultFacilityConfigurationSettings,
  diffFacilityConfiguration,
  facilityConfigurationPatchDtoSchema,
  facilityModuleHidesHref,
  parseFacilityConfigurationSettings,
  resolveFacilityModuleLiveStatus,
  shouldAutoReleaseDiagnosticResult,
  synchronizeDerivedSettings,
} from "./facilityConfiguration.js";

describe("FacilityConfiguration", () => {
  it("keeps hospital A and hospital B independent after parse", () => {
    const hospitalA = parseFacilityConfigurationSettings(
      {
        digitalCare: { autoRelease: true, manualRelease: false, secureMessaging: false },
        patientPortal: { invoices: false },
      },
      { hospitalName: "Hospital A", serviceLines: ["CLINIC"] },
    );
    const hospitalB = parseFacilityConfigurationSettings(
      {
        digitalCare: { autoRelease: false, manualRelease: true, secureMessaging: true },
        patientPortal: { invoices: true },
      },
      { hospitalName: "Hospital B", serviceLines: ["EMERGENCY"] },
    );
    expect(hospitalA.digitalCare.secureMessaging).toBe(false);
    expect(hospitalB.digitalCare.secureMessaging).toBe(true);
    expect(hospitalA.digitalCare.autoRelease).toBe(true);
    expect(hospitalB.digitalCare.autoRelease).toBe(false);
    expect(hospitalA.patientPortal.invoices).toBe(false);
    expect(hospitalB.patientPortal.invoices).toBe(true);
    expect(hospitalA.modules.clinic.enabled).toBe(true);
    expect(hospitalB.modules.emergency.enabled).toBe(true);
  });

  it("auto-releases only when mode is AUTO, delay elapsed, and critical hold is off", () => {
    const settings = synchronizeDerivedSettings({
      ...defaultFacilityConfigurationSettings(),
      digitalCare: {
        ...defaultFacilityConfigurationSettings().digitalCare,
        autoRelease: true,
        manualRelease: false,
        criticalResultWorkflow: true,
      },
      clinicalRules: {
        ...defaultFacilityConfigurationSettings().clinicalRules,
        autoResultReleaseDelayMinutes: 0,
      },
    });
    expect(
      shouldAutoReleaseDiagnosticResult({
        settings,
        kind: "LAB_TEST",
        critical: false,
        verifiedAt: new Date("2026-01-01T00:00:00Z"),
        now: new Date("2026-01-01T00:01:00Z"),
      }),
    ).toBe(true);
    expect(
      shouldAutoReleaseDiagnosticResult({
        settings,
        kind: "LAB_TEST",
        critical: true,
        verifiedAt: new Date("2026-01-01T00:00:00Z"),
        now: new Date("2026-01-01T00:01:00Z"),
      }),
    ).toBe(false);
  });

  it("dual-writes service lines without touching unrelated dental lines", () => {
    const settings = defaultFacilityConfigurationSettings();
    settings.modules.emergency.enabled = false;
    settings.modules.emergency.hidden = true;
    settings.modules.clinic.enabled = true;
    const next = applyFacilityConsoleModulesToServiceLines(["EMERGENCY", "CLINIC", "DENTAL"], settings.modules);
    expect(next).toContain("CLINIC");
    expect(next).toContain("DENTAL");
    expect(next).not.toContain("EMERGENCY");
  });

  it("hides digital-care nav when the module is disabled", () => {
    const settings = defaultFacilityConfigurationSettings();
    settings.modules.digitalCare.enabled = false;
    settings.modules.digitalCare.hidden = true;
    expect(facilityModuleHidesHref("/app/digital-care", settings.modules)).toBe(true);
    expect(facilityModuleHidesHref("/app/patients", settings.modules)).toBe(false);
  });

  it("rejects patch payloads that include a facilityId", () => {
    const parsed = facilityConfigurationPatchDtoSchema.safeParse({
      revision: 1,
      settings: defaultFacilityConfigurationSettings(),
      facilityId: "00000000-0000-4000-8000-000000000099",
    });
    expect(parsed.success).toBe(false);
  });

  it("records a path-level diff for audit", () => {
    const before = defaultFacilityConfigurationSettings();
    const after = structuredClone(before);
    after.digitalCare.secureMessaging = false;
    const changes = diffFacilityConfiguration(before, after);
    expect(changes.some((change) => change.path === "digitalCare.secureMessaging")).toBe(true);
  });

  it("reports live vs maintenance status", () => {
    expect(resolveFacilityModuleLiveStatus(defaultFacilityConfigurationSettings().modules.clinic)).toBe("LIVE");
    expect(
      resolveFacilityModuleLiveStatus({
        enabled: true,
        visible: true,
        maintenance: true,
        readOnly: false,
        hidden: false,
      }),
    ).toBe("MAINTENANCE");
  });
});
