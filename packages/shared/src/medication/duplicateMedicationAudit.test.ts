import { describe, expect, it } from "vitest";
import {
  buildDuplicateMedicationAuditReport,
  canonicalMedicationFamilyKey,
  normalizeMedicationIdentityToken,
} from "./medicationCanonicalNormalization.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";

function records(): MedicationOrderabilityRecord[] {
  return [...buildUnifiedOrderabilityMap().values()];
}

function synthetic(partial: Partial<MedicationOrderabilityRecord> & Pick<MedicationOrderabilityRecord, "catalogCode">): MedicationOrderabilityRecord {
  return {
    catalogCode: partial.catalogCode,
    genericName: partial.genericName ?? "Acetaminophen",
    displayNameEn: partial.displayNameEn ?? partial.genericName ?? "Acetaminophen",
    displayNameFr: partial.displayNameFr ?? partial.displayNameEn ?? partial.genericName ?? "Acétaminophène",
    route: partial.route ?? "orale",
    dosageForm: partial.dosageForm ?? "comprimé",
    strength: partial.strength ?? "500 mg",
    orderabilityStatus: partial.orderabilityStatus ?? "CATALOG_ONLY_NOT_ORDERABLE",
    allowedCareSettings: partial.allowedCareSettings ?? ["OUTPATIENT"],
    allowedRoutes: partial.allowedRoutes ?? ["PO"],
    requiresPharmacyReview: partial.requiresPharmacyReview ?? false,
    requiresClinicalReview: partial.requiresClinicalReview ?? false,
    restrictedReason: partial.restrictedReason ?? null,
    notOrderableReason: partial.notOrderableReason ?? null,
    marDocumentationRequirements: partial.marDocumentationRequirements ?? [],
    inventoryNdcLinked: partial.inventoryNdcLinked ?? true,
    orderSearchEnabled: partial.orderSearchEnabled ?? false,
    marEnabled: partial.marEnabled ?? true,
    source: partial.source ?? "enterprise",
  };
}

describe("DuplicateMedicationAuditReport", () => {
  it("audits every medication record from unified catalog", () => {
    const report = buildDuplicateMedicationAuditReport();
    expect(report.totalMedicationsAudited).toBe(records().length);
    expect(report.totalFamilies).toBeGreaterThan(0);
  });

  it("detects exact duplicate generic-strength-form-route products", () => {
    const report = buildDuplicateMedicationAuditReport([
      synthetic({ catalogCode: "ACETAMINOPHEN_A" }),
      synthetic({ catalogCode: "ACETAMINOPHEN_B" }),
    ]);
    expect(report.exactDuplicates).toBe(1);
    expect(report.rows[0]?.blocksActivation).toBe(true);
  });

  it("detects brand/generic family relationships from alias manifest", () => {
    const report = buildDuplicateMedicationAuditReport(records().filter((r) => r.catalogCode === "LISINOPRIL_10"));
    expect(report.brandGenericDuplicates).toBeGreaterThan(0);
    expect(report.rows.some((r) => r.label.toLowerCase().includes("zestril"))).toBe(true);
  });

  it("classifies strength families without blocking activation by itself", () => {
    const report = buildDuplicateMedicationAuditReport([
      synthetic({ catalogCode: "LISINOPRIL_5", genericName: "Lisinopril", strength: "5 mg" }),
      synthetic({ catalogCode: "LISINOPRIL_10", genericName: "Lisinopril", strength: "10 mg" }),
    ]);
    const row = report.rows.find((r) => r.kind === "STRENGTH_FAMILY");
    expect(row?.blocksActivation).toBe(false);
  });

  it("classifies route variants as one family with distinct products", () => {
    const report = buildDuplicateMedicationAuditReport([
      synthetic({ catalogCode: "METOPROLOL_PO", genericName: "Metoprolol", route: "orale" }),
      synthetic({ catalogCode: "METOPROLOL_IV", genericName: "Metoprolol", route: "intraveineuse" }),
    ]);
    expect(report.routeVariants).toBe(1);
  });

  it("classifies formulation variants under the canonical family", () => {
    const report = buildDuplicateMedicationAuditReport([
      synthetic({ catalogCode: "ACETAMINOPHEN_TABLET", dosageForm: "comprimé" }),
      synthetic({ catalogCode: "ACETAMINOPHEN_LIQUID", dosageForm: "solution" }),
    ]);
    expect(report.formulationVariants).toBe(1);
  });

  it("flags Haiti and Enterprise overlap as catalog collision", () => {
    const report = buildDuplicateMedicationAuditReport([
      synthetic({ catalogCode: "AMLODIPINE_5_MG_COMPRIME_ORAL", genericName: "Amlodipine", source: "both" }),
    ]);
    expect(report.catalogCollisions).toBe(1);
    expect(report.activationBlockingFindings).toBe(1);
  });

  it("normalizes accent and punctuation tokens consistently", () => {
    expect(normalizeMedicationIdentityToken("Carvédilol 6.25 mg")).toBe("carvedilol_6_25_mg");
  });

  it("uses canonical generic family key for brand-style names", () => {
    const row = synthetic({ catalogCode: "ZESTRIL_SYNTH", genericName: "Zestril", displayNameEn: "Zestril" });
    expect(canonicalMedicationFamilyKey(row)).toBe("lisinopril");
  });

  it("reports activation-blocking findings separately from variant families", () => {
    const report = buildDuplicateMedicationAuditReport([
      synthetic({ catalogCode: "A1" }),
      synthetic({ catalogCode: "A2" }),
      synthetic({ catalogCode: "A3", strength: "250 mg" }),
    ]);
    expect(report.activationBlockingFindings).toBeGreaterThan(0);
    expect(report.strengthFamilyDuplicates).toBeGreaterThan(0);
  });
});
