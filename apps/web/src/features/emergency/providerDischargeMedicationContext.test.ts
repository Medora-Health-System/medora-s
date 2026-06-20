import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import {
  buildProviderDischargeCardFromDiagnosis,
} from "./providerDischargeTemplateRegistry";
import {
  emptyProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  normalizeProviderDischargeDiagnosisCards,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
} from "./providerDischargeDocumentationSummary";
import { getErPrintPacketHtml } from "./erPrintPacket";
import type { ErEdSummaryMedicationOrderRow } from "./erEdSummaryMedicationMar";
import {
  dedupeMedicationNames,
  extractMedicationNamesFromHomeMedications,
  extractMedicationNamesFromHomeMedicationsSummary,
  extractMedicationNamesFromMarEvents,
  extractMedicationNamesFromOrders,
  isActiveMedicationOrderStatus,
  mergeMedicationNamesForDischargeContext,
  MEDICATION_SOURCE_WIRING_AUDIT,
} from "./providerDischargeMedicationContext";
import {
  resolvePatientSpecificDischargeAdditions,
  extractTemplateIdsFromDiagnosisCards,
} from "./providerDischargePatientSpecificAdditions";
import type { HomeMedicationEntryForm } from "./homeMedicationEntry";
import { emptyHomeMedicationEntryForm } from "./homeMedicationEntry";

function homeMed(name: string, status: HomeMedicationEntryForm["status"] = "active"): HomeMedicationEntryForm {
  return { ...emptyHomeMedicationEntryForm(), medicationName: name, status };
}

function orderRow(name: string, status: string): ErEdSummaryMedicationOrderRow {
  return {
    id: `ord-${name}`,
    medicationName: name,
    dose: "—",
    route: "PO",
    instructions: "—",
    orderedBy: "Dr Test",
    orderedAt: "2026-06-03",
    status,
  };
}

function savedDischargeFormWithDiagnosis(code: string, label: string) {
  const card = buildProviderDischargeCardFromDiagnosis({
    sourceEncounterDiagnosisId: "dx-1",
    code,
    displayName: label,
    displayOrder: 0,
    isPrimaryDiagnosis: true,
    applyTemplateSuggestion: true,
    locale: "en",
  });
  return normalizeProviderDischargeDiagnosisCards({
    patientLeftEdAt: "2026-06-03T18:00:00.000Z",
    diagnosisRefs: [{ encounterDiagnosisId: "dx-1", code, label, isPrimary: true }],
    diagnosisDocs: [card],
    returnPrecautions: "Return if worse.",
    returnWorkSchool: "",
    followUps: [{ id: "fu-1", specialty: "PRIMARY_CARE", providerOrFacility: "", timing: "within 1–2 days", phone: "", address: "", comments: "" }],
  });
}

function medicationAdditionsForMeds(meds: string[], code = "R11.2", label = "Nausea and vomiting") {
  const form = savedDischargeFormWithDiagnosis(code, label);
  const templateIds = extractTemplateIdsFromDiagnosisCards(form.diagnosisDocs);
  return resolvePatientSpecificDischargeAdditions({
    templateIds,
    context: {
      medicationNames: meds,
      diagnosisCodes: [code],
      diagnosisLabels: [label],
      patientAgeYears: 55,
    },
    locale: "en",
  });
}

describe("MEDUI.ED.DISCHARGE.PATIENT_SPECIFIC_ADDITIONS.4 — medication context wiring", () => {
  describe("Phase 1 — medication source audit", () => {
    it("01 — documents key medication sources", () => {
      expect(MEDICATION_SOURCE_WIRING_AUDIT.length).toBeGreaterThanOrEqual(8);
      const sources = MEDICATION_SOURCE_WIRING_AUDIT.map((r) => r.source);
      expect(sources.some((s) => s.includes("Home medication"))).toBe(true);
      expect(sources.some((s) => s.includes("Active medication orders"))).toBe(true);
    });
  });

  describe("Phase 2 — context builder", () => {
    it("02 — home med Ozempic extracted", () => {
      const names = extractMedicationNamesFromHomeMedications([homeMed("Ozempic")]);
      expect(names).toEqual(["Ozempic"]);
    });

    it("03 — home med Eliquis extracted", () => {
      const names = extractMedicationNamesFromHomeMedications([homeMed("Eliquis 5 mg")]);
      expect(names[0]).toContain("Eliquis");
    });

    it("04 — home med insulin extracted", () => {
      const names = extractMedicationNamesFromHomeMedications([homeMed("Lantus insulin")]);
      expect(names[0]?.toLowerCase()).toContain("insulin");
    });

    it("05 — active order Lasix triggers name extraction", () => {
      const names = extractMedicationNamesFromOrders([orderRow("Lasix", "IN_PROGRESS")]);
      expect(names).toEqual(["Lasix"]);
    });

    it("06 — discontinued Lasix order excluded", () => {
      expect(isActiveMedicationOrderStatus("PROVIDER_DISCONTINUED")).toBe(false);
      const names = extractMedicationNamesFromOrders([orderRow("Lasix", "PROVIDER_DISCONTINUED")]);
      expect(names).toEqual([]);
    });

    it("07 — canceled opioid order excluded", () => {
      const names = extractMedicationNamesFromOrders([orderRow("Morphine", "CANCELLED")]);
      expect(names).toEqual([]);
    });

    it("08 — duplicate medication names dedupe", () => {
      expect(dedupeMedicationNames(["Ozempic", "ozempic", " Ozempic "])).toEqual(["Ozempic"]);
    });

    it("09 — empty medication names ignored", () => {
      expect(
        mergeMedicationNamesForDischargeContext({ explicitMedicationNames: ["", "  ", "—"] })
      ).toEqual([]);
    });

    it("10 — triage summary line parses medication display name", () => {
      const names = extractMedicationNamesFromHomeMedicationsSummary("Metformin 500 mg PO BID\nEliquis 5 mg PO daily");
      expect(names).toContain("Metformin");
      expect(names).toContain("Eliquis");
    });
  });

  describe("Phase 3–5 — medication-aware additions and surfaces", () => {
    it("11 — Ozempic triggers GLP-1 addition", () => {
      const additions = medicationAdditionsForMeds(["Ozempic"]);
      expect(additions.some((a) => a.id === "glp1_clinician_contact_persisting_symptoms")).toBe(true);
    });

    it("12 — Eliquis triggers anticoagulant addition", () => {
      const additions = medicationAdditionsForMeds(["Eliquis"]);
      expect(additions.some((a) => a.id === "anticoagulant_bleeding_neurologic_warning")).toBe(true);
    });

    it("13 — insulin triggers insulin medication addition", () => {
      const additions = medicationAdditionsForMeds(["Lantus insulin"]);
      expect(additions.some((a) => a.id === "medication_insulin_oral_intake_glucose_monitoring")).toBe(true);
    });

    it("14 — Lasix active order triggers diuretic addition via merge", () => {
      const names = mergeMedicationNamesForDischargeContext({
        medicationOrderRows: [orderRow("Lasix", "ACTIVE")],
      });
      const additions = medicationAdditionsForMeds(names);
      expect(additions.some((a) => a.id === "medication_diuretic_dehydration_monitoring")).toBe(true);
    });

    it("15 — no med list produces no medication-specific additions", () => {
      const additions = medicationAdditionsForMeds([]);
      expect(additions.filter((a) => a.id.startsWith("medication_"))).toHaveLength(0);
    });

    it("16 — ED discharge preview receives medication context", () => {
      const form = savedDischargeFormWithDiagnosis("R11.2", "Nausea and vomiting");
      const preview = buildProviderDischargeDocumentationPreviewSections(form, {}, "en", {
        patientContext: {
          medicationNames: ["Ozempic"],
          diagnosisCodes: ["R11.2"],
          diagnosisLabels: ["Nausea and vomiting"],
          patientAgeYears: 55,
        },
      });
      const blob = JSON.stringify(preview);
      expect(blob.toLowerCase()).toMatch(/glp|clinician|persisting symptoms/);
    });

    it("17 — print HTML receives medication context when sources supplied", () => {
      const form = savedDischargeFormWithDiagnosis("R11.2", "Nausea and vomiting");
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const html = getDischargePrintHtml({
        patient: { firstName: "Test", lastName: "Patient", dob: "1970-01-01" },
        encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
        language: "en",
        dischargeMedicationSources: {
          explicitMedicationNames: ["Eliquis"],
        },
      });
      expect(html.toLowerCase()).toMatch(/bleed|anticoag|eliquis/);
    });

    it("18 — ER packet receives medication context when orders available", () => {
      const form = savedDischargeFormWithDiagnosis("R11.2", "Nausea and vomiting");
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const html = getErPrintPacketHtml({
        patient: { firstName: "Test", lastName: "Patient", dob: "1970-01-01" },
        encounter: {
          createdAt: "2026-06-03T17:00:00.000Z",
          dischargeSummaryJson: merged,
          nursingAssessment: null,
        },
        triageSnapshot: {},
        language: "en",
        medicationOrderRows: [orderRow("Insulin glargine", "IN_PROGRESS")],
      });
      expect(html.toLowerCase()).toMatch(/insulin|blood sugar/);
    });

    it("19 — ER packet does not guess medication additions without orders", () => {
      const form = savedDischargeFormWithDiagnosis("R11.2", "Nausea and vomiting");
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form, {
        documentedAt: "2026-06-03T18:00:00.000Z",
        documentedByDisplayName: "Dr Test",
      });
      const htmlWithout = getErPrintPacketHtml({
        patient: { firstName: "Test", lastName: "Patient", dob: "1970-01-01" },
        encounter: { createdAt: "2026-06-03T17:00:00.000Z", dischargeSummaryJson: merged },
        triageSnapshot: {},
        language: "en",
      });
      expect(htmlWithout.toLowerCase()).not.toContain("medication_insulin_oral_intake_glucose_monitoring");
    });
  });

  describe("Phase 6 — safety guardrails", () => {
    it("20 — medication context does not mutate saved discharge JSON", () => {
      const form = savedDischargeFormWithDiagnosis("R11.2", "Nausea and vomiting");
      const before = JSON.stringify(form);
      mergeMedicationNamesForDischargeContext({
        dischargeSummaryJson: mergeProviderDischargeDocumentationIntoDischargeJson({}, form),
        medicationOrderRows: [orderRow("Lasix", "ACTIVE")],
      });
      expect(JSON.stringify(form)).toBe(before);
    });

    it("21 — provider custom card text unchanged by context builder", () => {
      const card = buildProviderDischargeCardFromDiagnosis({
        sourceEncounterDiagnosisId: "dx-custom",
        code: "R11.2",
        displayName: "Nausea and vomiting",
        displayOrder: 0,
        isPrimaryDiagnosis: true,
        applyTemplateSuggestion: true,
        locale: "en",
      });
      const custom = { ...card, description: "Provider custom description only" };
      mergeMedicationNamesForDischargeContext({ providerDischargeForm: { ...emptyProviderDischargeDocumentationForm(), diagnosisDocs: [custom] } });
      expect(custom.description).toBe("Provider custom description only");
    });

    it("22 — no medication dosing language in additions", () => {
      const additions = medicationAdditionsForMeds(["Lasix", "Insulin glargine", "Oxycodone"]);
      for (const addition of additions) {
        const blob = addition.text.toLowerCase();
        expect(blob).not.toMatch(/\b\d+\s*mg\b/);
        expect(blob).not.toMatch(/take \d+/);
      }
    });

    it("23 — no stop/change-medication language in additions", () => {
      const additions = medicationAdditionsForMeds(["Warfarin", "Morphine", "Prednisone"]);
      for (const addition of additions) {
        const blob = addition.text.toLowerCase();
        expect(blob).not.toMatch(/stop your/);
        expect(blob).not.toMatch(/change your dose/);
        expect(blob).not.toMatch(/do not take/);
      }
    });

    it("24 — MAR withheld events excluded", () => {
      const names = extractMedicationNamesFromMarEvents([
        {
          id: "mar-1",
          medicationName: "Morphine",
          action: "Not given — refused",
          dose: "—",
          route: "PO",
          injectionSite: "—",
          administeredBy: "RN",
          administeredAt: "2026-06-03",
          notes: "",
        },
      ]);
      expect(names).toEqual([]);
    });

    it("25 — existing diabetes diagnosis rule still works without meds", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: {
          diagnosisCodes: ["E11.9"],
          diagnosisLabels: ["Type 2 diabetes"],
          patientAgeYears: 55,
        },
      });
      expect(additions.some((a) => a.id === "diabetes_glucose_monitoring_reduced_intake")).toBe(true);
    });
  });
});
