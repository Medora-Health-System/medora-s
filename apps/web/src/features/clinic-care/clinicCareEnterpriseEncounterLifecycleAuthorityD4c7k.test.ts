import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  canCloseEncounter,
  canReopenEncounter,
  D4C7K_CERTIFICATION_ID,
  assertNoForbiddenD4c7kLifecycleAuthority,
  isAmbulatoryActiveOperationalEncounter,
  projectAmbulatoryLifecycleHeader,
} from "@medora/shared";

describe("MEDUI.D4C.7K web reopen affordance contracts", () => {
  it("exports certification id and shared reopen policy", () => {
    expect(D4C7K_CERTIFICATION_ID).toBe("MEDUI.D4C.7K");
    expect(canReopenEncounter(["ADMIN"])).toBe(true);
    expect(canReopenEncounter(["PROVIDER"])).toBe(false);
    expect(canCloseEncounter(["ADMIN"])).toBe(true);
  });

  it("forbids care-setting-specific reopen services", () => {
    expect(assertNoForbiddenD4c7kLifecycleAuthority("ClinicCloseService")).toBe(false);
    expect(assertNoForbiddenD4c7kLifecycleAuthority("EnterpriseEncounterLifecycleService")).toBe(true);
  });

  it("classifies a reopened encounter as OPEN even with a historical discharge timestamp", () => {
    const header = projectAmbulatoryLifecycleHeader({
      encounterStatus: "OPEN",
      workflowState: "IN_TREATMENT",
      providerDocumentationStatus: "SIGNED",
      dischargedAt: "2026-07-29T18:00:00.000Z",
    });
    expect(header.badgeStatusKey).toBe("OPEN");
    expect(header.kind).not.toBe("CLOSED");
    expect(isAmbulatoryActiveOperationalEncounter({ encounterStatus: "OPEN" })).toBe(true);
    expect(isAmbulatoryActiveOperationalEncounter({ encounterStatus: "CLOSED" })).toBe(false);
  });

  it("wires the shared reopen component into the Clinic Care closed-encounter surface", () => {
    const view = readFileSync(resolve(__dirname, "ClinicCareAmbulatoryEncountersView.tsx"), "utf8");
    expect(view).toContain("EnterpriseReopenEncounterAction");
    const component = readFileSync(
      resolve(__dirname, "../../components/encounters/EnterpriseReopenEncounterAction.tsx"),
      "utf8"
    );
    expect(component).toContain("canReopenEncounter");
    expect(component).toContain("reopenEncounterViaEnterprise");
    // French-only product UI: reopen copy comes from i18n, never hardcoded strings.
    expect(component).toContain("enterpriseEncounterLifecycleD4c7k.reopen");
  });
});
