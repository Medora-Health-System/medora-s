import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "@/i18n/messages/en";
import fr from "@/i18n/messages/fr";

const root = join(__dirname, "../../..");

function readSrc(rel: string): string {
  return readFileSync(join(root, "src", rel), "utf8");
}

function readApp(rel: string): string {
  return readFileSync(join(root, "app", rel), "utf8");
}

describe("MEDUI.D4C.7I facility identity onboarding + print projection (web)", () => {
  it("mirrors French and English facilityIdentityD4c7i keys", () => {
    const frKeys = fr.facilityIdentityD4c7i as Record<string, string>;
    const enKeys = en.facilityIdentityD4c7i as Record<string, string>;
    expect(Object.keys(frKeys).sort()).toEqual(Object.keys(enKeys).sort());
    expect(frKeys.country).toBe("Pays");
    expect(frKeys.line1).toBe("Adresse");
    expect(frKeys.line2).toBe("Complément d’adresse");
    expect(frKeys.cityHaiti).toBe("Ville / commune");
    expect(frKeys.phone).toBe("Téléphone");
    expect(frKeys.fax).toBe("Télécopieur");
    expect(frKeys.email).toBe("Courriel");
    expect(frKeys.website).toBe("Site Web");
    expect(enKeys.country).toBe("Country");
    expect(enKeys.sectionTitle).toMatch(/Facility address/i);
  });

  it("onboarding and edit UI use shared operational identity fields", () => {
    const admin = readApp("app/admin/users/page.tsx");
    const fields = readSrc("components/admin/FacilityOperationalIdentityFields.tsx");
    const modal = readSrc("components/admin/FacilityOperationalIdentityModal.tsx");
    expect(admin).toContain("FacilityOperationalIdentityFields");
    expect(admin).toContain("FacilityOperationalIdentityModal");
    expect(admin).toContain("operationalAddress");
    expect(fields).toContain("facilityIdentityD4c7i.sectionTitle");
    expect(modal).toContain("patchAdminFacilityServiceConfig");
    expect(modal).toContain("validateFacilityOperationalIdentityOnboarding");
  });

  it("does not hard-code a single facility name in print helpers", () => {
    const print = readSrc("lib/printFacilityHeader.ts");
    const rx = readSrc("components/pharmacy/RxPrintLayout.tsx");
    expect(print).not.toMatch(/Wayne Urgent Care Emergency Room/);
    expect(print).toContain("projectEnterpriseFacilityIdentity");
    expect(rx).toContain("buildRxPrintFacilityIdentity");
    expect(rx).toContain("projected.address.fax");
  });

  it("wires discharge, lab/rad, and Rx prints to enterprise facility identity", () => {
    const discharge = readSrc("features/clinic-care/ClinicCareAmbulatoryDischargeWorkflow.tsx");
    const panels = readSrc("features/clinic-care/ClinicCareAmbulatoryWorkspacePanels.tsx");
    const pharmacy = readApp("app/pharmacy-worklist/page.tsx");
    const rxPanel = readSrc("features/clinic-care/ClinicCareAmbulatoryPrescriptionPanel.tsx");
    expect(discharge).toContain("printFacilityInfoFromEnterpriseSource");
    expect(panels).toContain("printFacilityInfoFromEnterpriseSource");
    expect(panels).toContain("EmergencyResultsPanel");
    expect(pharmacy).toContain("docFacility?.careProfileJson");
    expect(rxPanel).toContain("buildRxPrintFacilityIdentity");
    expect(rxPanel).toContain("facilityCareProfileJson");
  });

  it("prefers document facility catalog identity for historical Rx print", () => {
    const pharmacy = readApp("app/pharmacy-worklist/page.tsx");
    expect(pharmacy).toContain("order?.facilityId");
    expect(pharmacy).toContain("documentFacilityId");
    const header = readSrc("lib/printFacilityHeader.ts");
    expect(header).toContain("resolveEnterprisePrintFacilityFromCatalog");
    expect(header).toContain("resolveDocumentFacilityIdentitySource");
  });

  it("forbids ClinicFacilityAddress forks in D4C.7I components", () => {
    const fields = readSrc("components/admin/FacilityOperationalIdentityFields.tsx");
    expect(fields).not.toContain("ClinicFacilityAddress");
    expect(fields).toContain("facilityCareProfileJson");
  });
});
