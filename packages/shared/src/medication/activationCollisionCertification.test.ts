import { describe, expect, it } from "vitest";
import { certifyMedicationActivationCollision } from "./medicationCanonicalNormalization.js";
import { buildUnifiedOrderabilityMap } from "./medicationOrderabilityCertification.js";
import type { MedicationOrderabilityRecord } from "./medicationOrderabilityGovernance.js";

function row(partial: Partial<MedicationOrderabilityRecord> & Pick<MedicationOrderabilityRecord, "catalogCode">): MedicationOrderabilityRecord {
  return {
    catalogCode: partial.catalogCode,
    genericName: partial.genericName ?? "Testmed",
    displayNameEn: partial.displayNameEn ?? partial.genericName ?? "Testmed",
    displayNameFr: partial.displayNameFr ?? partial.displayNameEn ?? partial.genericName ?? "Testmed",
    route: partial.route ?? "orale",
    dosageForm: partial.dosageForm ?? "comprimé",
    strength: partial.strength ?? "10 mg",
    orderabilityStatus: partial.orderabilityStatus ?? "CATALOG_ONLY_NOT_ORDERABLE",
    allowedCareSettings: ["OUTPATIENT"],
    allowedRoutes: ["PO"],
    requiresPharmacyReview: false,
    requiresClinicalReview: false,
    restrictedReason: null,
    notOrderableReason: partial.notOrderableReason ?? "staged activation required",
    marDocumentationRequirements: [],
    inventoryNdcLinked: true,
    orderSearchEnabled: partial.orderSearchEnabled ?? false,
    marEnabled: true,
    source: partial.source ?? "enterprise",
  };
}

describe("ActivationCollisionCertification", () => {
  it("returns SAFE for a clean single non-orderable candidate", () => {
    const cert = certifyMedicationActivationCollision(["TESTMED_10"], [row({ catalogCode: "TESTMED_10" })]);
    expect(cert.decision).toBe("SAFE");
    expect(cert.blockers).toEqual([]);
  });

  it("blocks already-orderable catalog rows", () => {
    const cert = certifyMedicationActivationCollision([
      "AMLODIPINE_5_MG_COMPRIME_ORAL",
    ], [...buildUnifiedOrderabilityMap().values()]);
    expect(cert.decision).toBe("BLOCKED");
    expect(cert.blockers.some((b) => b.includes("ALREADY_ORDERABLE"))).toBe(true);
  });

  it("blocks exact duplicate products", () => {
    const rows = [row({ catalogCode: "DUP_A" }), row({ catalogCode: "DUP_B" })];
    const cert = certifyMedicationActivationCollision(["DUP_A"], rows);
    expect(cert.decision).toBe("BLOCKED");
    expect(cert.duplicateFindings.some((f) => f.kind === "EXACT_DUPLICATE")).toBe(true);
  });

  it("blocks Haiti and Enterprise overlap activation", () => {
    const cert = certifyMedicationActivationCollision([
      "BOTH_A",
    ], [row({ catalogCode: "BOTH_A", source: "both" })]);
    expect(cert.decision).toBe("BLOCKED");
    expect(cert.duplicateFindings.some((f) => f.kind === "CATALOG_COLLISION")).toBe(true);
  });

  it("blocks family overlap when two strengths are activated together", () => {
    const rows = [
      row({ catalogCode: "LISINOPRIL_5_SYNTH", genericName: "Lisinopril", strength: "5 mg" }),
      row({ catalogCode: "LISINOPRIL_10_SYNTH", genericName: "Lisinopril", strength: "10 mg" }),
    ];
    const cert = certifyMedicationActivationCollision(["LISINOPRIL_5_SYNTH", "LISINOPRIL_10_SYNTH"], rows);
    expect(cert.decision).toBe("BLOCKED");
    expect(cert.blockers.some((b) => b.includes("FAMILY_OVERLAP_ACTIVATION"))).toBe(true);
  });

  it("does not block unselected family peers by itself", () => {
    const rows = [
      row({ catalogCode: "LOSARTAN_50_SYNTH", genericName: "Losartan", strength: "50 mg" }),
      row({ catalogCode: "LOSARTAN_100_SYNTH", genericName: "Losartan", strength: "100 mg" }),
    ];
    const cert = certifyMedicationActivationCollision(["LOSARTAN_50_SYNTH"], rows);
    expect(cert.decision).toBe("SAFE");
  });

  it("returns SAFE for an empty simulation cohort", () => {
    const cert = certifyMedicationActivationCollision([]);
    expect(cert.decision).toBe("SAFE");
    expect(cert.catalogCodes).toEqual([]);
  });

  it("does not mutate orderSearchEnabled during certification", () => {
    const candidate = row({ catalogCode: "SAFE_NO_MUTATION" });
    certifyMedicationActivationCollision(["SAFE_NO_MUTATION"], [candidate]);
    expect(candidate.orderSearchEnabled).toBe(false);
  });
});
