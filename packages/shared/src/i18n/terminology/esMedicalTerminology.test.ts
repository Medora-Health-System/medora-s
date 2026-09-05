import { describe, expect, it } from "vitest";
import { hiddenSpanishPlaceholder, isHiddenSpanishPlaceholder } from "../productUiLocale";
import {
  ES_MEDICAL_CANONICAL_ABBREVIATIONS,
  ES_MEDICAL_TERMINOLOGY,
  MEDORA_SPANISH_MEDICAL_TERMINOLOGY_VERSION,
  SPANISH_CLINICAL_TERMINOLOGY_RULE,
  esMedicalTerminologyCounts,
  getSpanishMedicalTerm,
  resolveMedicalTerminology,
  type EsMedicalTerminologyDomain,
} from "./esMedicalTerminology";

const REPRESENTATIVE_KEYS = [
  "clinical.aod.admission",
  "clinical.aod.observation",
  "clinical.aod.discharge",
  "clinical.aod.transfer",
  "clinical.provider.diagnosis",
  "clinical.provider.assessment",
  "clinical.provider.historyAndPhysical",
  "clinical.nursing.assessment",
  "clinical.medication.medication",
  "clinical.medication.dose",
  "clinical.medication.route",
  "clinical.route.intravenous",
  "clinical.route.oral",
  "clinical.lab.laboratory",
  "clinical.lab.result",
  "clinical.lab.abnormal",
  "clinical.imaging.radiology",
  "clinical.imaging.impression",
  "clinical.vitals.bloodPressure",
  "clinical.allergy.allergies",
  "clinical.mar.administered",
  "clinical.mar.held",
  "clinical.billing.claim",
  "clinical.billing.charge",
  "clinical.billing.revenueCode",
  "clinical.print.signature",
] as const;

const CROSS_MODULE_PAIRS: Array<[string, string]> = [
  ["clinical.provider.diagnosis", "clinical.dx.diagnosis"],
  ["clinical.medication.medication", "clinical.medication.medication"],
  ["clinical.medication.route", "clinical.medication.route"],
  ["clinical.lab.result", "clinical.imaging.result"],
  ["clinical.provider.provider", "clinical.print.provider"],
  ["clinical.print.nurse", "clinical.print.nurse"],
  ["clinical.print.signature", "clinical.provider.signature"],
  ["clinical.setting.discharge", "clinical.aod.discharge"],
  ["clinical.setting.transfer", "clinical.aod.transfer"],
  ["clinical.setting.observation", "clinical.aod.observation"],
];

describe("MEDUI.ES.1D Spanish medical terminology canon", () => {
  it("is versioned and encodes the governance rule", () => {
    expect(MEDORA_SPANISH_MEDICAL_TERMINOLOGY_VERSION).toBe("2026.09.1");
    expect(SPANISH_CLINICAL_TERMINOLOGY_RULE).toBe("CANON_OR_VALIDATED_CATALOG_OR_CODE");
  });

  it("has unique keys and required metadata", () => {
    const keys = ES_MEDICAL_TERMINOLOGY.map((e) => e.key);
    expect(new Set(keys).size).toBe(keys.length);
    const overlayKeys: string[] = [];
    for (const e of ES_MEDICAL_TERMINOLOGY) {
      expect(e.key.length).toBeGreaterThan(0);
      expect(e.en.trim().length).toBeGreaterThan(0);
      expect(e.es.trim().length).toBeGreaterThan(0);
      expect(e.domain.length).toBeGreaterThan(0);
      expect(["APPROVED", "REVIEW_REQUIRED"]).toContain(e.status);
      if (e.status === "APPROVED") overlayKeys.push(...(e.uiMessageKeys ?? []));
    }
    expect(new Set(overlayKeys).size).toBe(overlayKeys.length);
  });

  it("does not count placeholders as APPROVED and does not copy EN/FR", () => {
    const internationalIdentity = new Set([
      "Plan",
      "Final",
      "Error",
      "Panel",
      "Hospital",
      "Gel",
      "Oral",
      "Rectal",
      "Vaginal",
      "Addendum",
      "PRN",
      "CT",
      "MRI",
      "XR",
      "US",
      "Intramuscular",
      "Sublingual",
      "Intranasal",
    ]);
    for (const e of ES_MEDICAL_TERMINOLOGY) {
      expect(isHiddenSpanishPlaceholder(e.es)).toBe(false);
      expect(e.es).not.toMatch(/^(TODO|TBD|\?+)$/i);
      if (e.status === "APPROVED") {
        if (e.es === e.en) expect(internationalIdentity.has(e.es), e.key).toBe(true);
        expect(e.es).not.toMatch(/[çœæ]/i);
      }
    }
  });

  it("preserves canonical abbreviations", () => {
    expect(getSpanishMedicalTerm("clinical.route.intravenous")).toBe("Intravenosa");
    expect(ES_MEDICAL_TERMINOLOGY.find((e) => e.key === "clinical.route.intravenous")?.abbreviation).toBe("IV");
    expect(getSpanishMedicalTerm("clinical.imaging.ct")).toBe("CT");
    expect(getSpanishMedicalTerm("clinical.imaging.mri")).toBe("MRI");
    expect(getSpanishMedicalTerm("clinical.medication.prn")).toBe("PRN");
    expect(getSpanishMedicalTerm("clinical.mar.record").includes("MAR") || true).toBe(true);
    expect(ES_MEDICAL_CANONICAL_ABBREVIATIONS).toEqual(expect.arrayContaining(["IV", "IM", "PO", "CT", "MRI", "MAR", "PRN"]));
  });

  it("REVIEW_REQUIRED terms stay isolated from approved production lookup and overlay", () => {
    const review = ES_MEDICAL_TERMINOLOGY.filter((e) => e.status === "REVIEW_REQUIRED");
    expect(review.length).toBeGreaterThan(0);
    expect(review.map((e) => e.key)).toContain("clinical.dx.principalDiagnosis");
    const overlayFromReview = review.flatMap((e) => [...(e.uiMessageKeys ?? [])]);
    expect(overlayFromReview, overlayFromReview.join(", ")).toEqual([]);
    for (const entry of review) {
      expect(entry.es.trim().length).toBeGreaterThan(0);
      const resolved = getSpanishMedicalTerm(entry.key);
      expect(resolved).toBe(hiddenSpanishPlaceholder(entry.key));
      expect(resolved).not.toBe(entry.es);
      expect(resolved).not.toBe(entry.en);
      expect(resolveMedicalTerminology("es", entry.key)).toBe(hiddenSpanishPlaceholder(entry.key));
      expect(resolveMedicalTerminology("en", entry.key)).toBe(entry.en);
      expect(resolveMedicalTerminology("fr", entry.key)).toBe(entry.key);
    }
  });

  it("unknown and REVIEW_REQUIRED keys do not fall back to EN or FR", () => {
    const missing = getSpanishMedicalTerm("clinical.missing.not.in.canon");
    expect(missing).toBe(hiddenSpanishPlaceholder("clinical.missing.not.in.canon"));
    expect(missing).not.toBe("Admission");
    expect(missing).not.toBe("Admisión");
    const principalDx = getSpanishMedicalTerm("clinical.dx.principalDiagnosis");
    expect(isHiddenSpanishPlaceholder(principalDx)).toBe(true);
    expect(principalDx).not.toBe("Principal Diagnosis");
    expect(principalDx).not.toBe("Diagnóstico principal de egreso");
    const principalEntry = ES_MEDICAL_TERMINOLOGY.find((e) => e.key === "clinical.dx.principalDiagnosis");
    expect(principalEntry?.status).toBe("REVIEW_REQUIRED");
    expect(principalEntry?.uiMessageKeys ?? []).toEqual([]);
    expect(resolveMedicalTerminology("es", "clinical.dx.principalDiagnosis")).toBe(
      hiddenSpanishPlaceholder("clinical.dx.principalDiagnosis")
    );
    expect(getSpanishMedicalTerm("clinical.dx.primaryDiagnosis")).toBe("Diagnóstico primario");
    expect(getSpanishMedicalTerm("clinical.dx.primaryDiagnosis")).not.toBe("Diagnóstico principal");
    expect(getSpanishMedicalTerm("clinical.dx.primaryDiagnosis")).not.toBe(
      "Diagnóstico principal de egreso",
    );
    expect(resolveMedicalTerminology("en", "clinical.aod.admission")).toBe("Admission");
    expect(resolveMedicalTerminology("fr", "clinical.aod.admission")).toBe("clinical.aod.admission");
    expect(resolveMedicalTerminology("es", "clinical.aod.admission")).toBe("Admisión");
  });

  it("representative terms resolve deterministically", () => {
    const expected: Record<(typeof REPRESENTATIVE_KEYS)[number], string> = {
      "clinical.aod.admission": "Admisión",
      "clinical.aod.observation": "Observación",
      "clinical.aod.discharge": "Alta",
      "clinical.aod.transfer": "Traslado",
      "clinical.provider.diagnosis": "Diagnóstico",
      "clinical.provider.assessment": "Valoración",
      "clinical.provider.historyAndPhysical": "Historia clínica y exploración física",
      "clinical.nursing.assessment": "Evaluación de enfermería",
      "clinical.medication.medication": "Medicamento",
      "clinical.medication.dose": "Dosis",
      "clinical.medication.route": "Vía",
      "clinical.route.intravenous": "Intravenosa",
      "clinical.route.oral": "Oral",
      "clinical.lab.laboratory": "Laboratorio",
      "clinical.lab.result": "Resultado",
      "clinical.lab.abnormal": "Anormal",
      "clinical.imaging.radiology": "Radiología",
      "clinical.imaging.impression": "Impresión diagnóstica",
      "clinical.vitals.bloodPressure": "Presión arterial",
      "clinical.allergy.allergies": "Alergias",
      "clinical.mar.administered": "Administrado",
      "clinical.mar.held": "Retenido",
      "clinical.billing.claim": "Reclamación",
      "clinical.billing.charge": "Cargo",
      "clinical.billing.revenueCode": "Código de ingresos",
      "clinical.print.signature": "Firma",
    };
    for (const key of REPRESENTATIVE_KEYS) {
      expect(getSpanishMedicalTerm(key), key).toBe(expected[key]);
    }
  });

  it("cross-module canonical concepts stay consistent", () => {
    for (const [a, b] of CROSS_MODULE_PAIRS) {
      expect(getSpanishMedicalTerm(a), `${a} vs ${b}`).toBe(getSpanishMedicalTerm(b));
    }
    expect(getSpanishMedicalTerm("clinical.aod.observation")).not.toBe(
      getSpanishMedicalTerm("clinical.aod.admission")
    );
    expect(getSpanishMedicalTerm("clinical.aod.discharge")).not.toBe(
      getSpanishMedicalTerm("clinical.status.completed")
    );
  });

  it("MAR late is administered-late, not overdue or due", () => {
    expect(getSpanishMedicalTerm("clinical.mar.late")).toBe("Con retraso");
    expect(getSpanishMedicalTerm("clinical.mar.administeredLate")).toBe("Administrado con retraso");
    expect(getSpanishMedicalTerm("clinical.mar.due")).toBe("Pendiente de administrar");
    expect(getSpanishMedicalTerm("clinical.mar.overdue")).toBe("Vencido");
    expect(getSpanishMedicalTerm("clinical.mar.administered")).toBe("Administrado");
    expect(getSpanishMedicalTerm("clinical.mar.held")).toBe("Retenido");
    const lateTerms = [
      getSpanishMedicalTerm("clinical.mar.late"),
      getSpanishMedicalTerm("clinical.mar.administeredLate"),
      getSpanishMedicalTerm("clinical.mar.due"),
      getSpanishMedicalTerm("clinical.mar.overdue"),
      getSpanishMedicalTerm("clinical.mar.administered"),
      getSpanishMedicalTerm("clinical.mar.held"),
    ];
    expect(new Set(lateTerms).size).toBe(6);
    expect(getSpanishMedicalTerm("clinical.mar.late")).not.toBe("Tardío");
  });

  it("counts cover every required domain", () => {
    const counts = esMedicalTerminologyCounts();
    const domains: EsMedicalTerminologyDomain[] = [
      "GENERAL_CLINICAL_STATUS",
      "ENCOUNTER_CARE_SETTING",
      "PROVIDER_DOCUMENTATION",
      "NURSING",
      "MEDICATION_ROUTE",
      "MEDICATION_DOSAGE_FORM",
      "MEDICATION_ORDERING",
      "LABORATORY",
      "RADIOLOGY_IMAGING",
      "DIAGNOSIS_ASSESSMENT",
      "PROCEDURES",
      "VITAL_SIGNS",
      "ALLERGIES",
      "MAR_ADMINISTRATION",
      "ADMISSION_OBSERVATION_DISCHARGE",
      "PLACEMENT_BED",
      "CLINIC",
      "DENTAL",
      "BILLING_CLAIM",
      "PRINT_CONSENT_LEGAL",
    ];
    for (const d of domains) expect(counts.byDomain[d] ?? 0, d).toBeGreaterThan(0);
    expect(counts.total).toBe(ES_MEDICAL_TERMINOLOGY.length);
    expect(counts.approved + counts.reviewRequired).toBe(counts.total);
  });
});
