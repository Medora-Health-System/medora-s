import { describe, expect, it } from "vitest";
import { getDischargePrintHtml } from "@/components/encounters/DischargePrintLayout";
import { getErPrintPacketHtml } from "./erPrintPacket";
import {
  applyProviderDischargeTemplateToCard,
  buildProviderDischargeCardFromDiagnosis,
  ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
  PROVIDER_DISCHARGE_TEMPLATE_REGISTRY,
  resolveProviderDischargeTemplateForDiagnosis,
} from "./providerDischargeTemplateRegistry";
import { getProviderDischargeSuggestedTextBody } from "./providerDischargeTemplateLocale";
import {
  emptyProviderDischargeDocumentationForm,
  mergeProviderDischargeDocumentationIntoDischargeJson,
  newDefaultFollowUpRow,
  normalizeProviderDischargeDiagnosisCards,
} from "./providerDischargeDocumentationModel";
import {
  buildProviderDischargeDocumentationPreviewSections,
  buildProviderDischargeDocumentationSummaryBlock,
} from "./providerDischargeDocumentationSummary";
import {
  buildPatientSpecificDischargeContext,
  detectCkdFromContext,
  detectDiabetesFromContext,
  detectGlp1MedicationFromContext,
  PATIENT_SPECIFIC_ADDITION_FORBIDDEN_PHRASES,
  patientSpecificAdditionContainsForbiddenLanguage,
  resolvePatientSpecificDischargeAdditions,
} from "./providerDischargePatientSpecificAdditions";

const R11_2_CODE = "R11.2";
const R11_2_DISPLAY = "Nausea and vomiting";

function r112CardWithTemplateApplied() {
  const card = buildProviderDischargeCardFromDiagnosis({
    sourceEncounterDiagnosisId: "dx-r112",
    code: R11_2_CODE,
    displayName: R11_2_DISPLAY,
    displayOrder: 0,
    isPrimaryDiagnosis: true,
  });
  const resolved = resolveProviderDischargeTemplateForDiagnosis({
    code: R11_2_CODE,
    displayName: R11_2_DISPLAY,
  });
  return applyProviderDischargeTemplateToCard(card, resolved, {
    locale: "en",
    overwriteExisting: true,
  });
}

function r112SavedForm(customMedicationTreatment?: string) {
  const card = r112CardWithTemplateApplied();
  if (customMedicationTreatment) card.medicationTreatment = customMedicationTreatment;
  const nauseaTemplate = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!;
  return normalizeProviderDischargeDiagnosisCards({
    patientLeftEdAt: "2026-06-03T18:00:00.000Z",
    diagnosisRefs: [
      {
        encounterDiagnosisId: "dx-r112",
        code: R11_2_CODE,
        label: R11_2_DISPLAY,
        isPrimary: true,
      },
    ],
    diagnosisDocs: [card],
    returnPrecautions: getProviderDischargeSuggestedTextBody(nauseaTemplate, "en").returnPrecautions,
    returnWorkSchool: "",
    followUps: [
      {
        ...newDefaultFollowUpRow(),
        id: "fu-r112",
        specialty: "PRIMARY_CARE",
        timing: ED_DEFAULT_PCP_FOLLOW_UP_TIMING,
      },
    ],
  });
}

function renderOptions(context: Parameters<typeof buildPatientSpecificDischargeContext>[0]) {
  return { patientContext: buildPatientSpecificDischargeContext(context) };
}

describe("MEDUI.ED.DISCHARGE.PATIENT_SPECIFIC_ADDITIONS.1", () => {
  describe("rule resolution", () => {
    it("1 — R11.2 + diabetes adds glucose monitoring instruction", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({
          diagnosisCodes: ["E11.9"],
          diagnosisLabels: ["Type 2 diabetes mellitus"],
        }),
      });
      expect(additions.some((a) => a.id === "diabetes_glucose_monitoring_reduced_intake")).toBe(true);
    });

    it("2 — R11.2 + CKD adds hydration warning", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({
          diagnosisCodes: ["N18.3"],
          diagnosisLabels: ["Chronic kidney disease, stage 3"],
        }),
      });
      expect(additions.some((a) => a.id === "ckd_hydration_importance")).toBe(true);
    });

    it("3 — R11.2 + diabetes adds provider-contact instruction", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({ diagnosisCodes: ["E11.65"] }),
      });
      expect(additions.some((a) => a.id === "diabetes_contact_if_poor_intake")).toBe(true);
    });

    it("4 — R11.2 + Ozempic adds GLP-1 clinician-contact instruction", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({ medicationNames: ["Ozempic 0.5 mg weekly"] }),
      });
      expect(additions.some((a) => a.id === "glp1_clinician_contact_persisting_symptoms")).toBe(true);
    });

    it("5 — R11.2 + age 72 adds older adult dehydration warning", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({ patientAgeYears: 72 }),
      });
      expect(additions.some((a) => a.id === "older_adult_dehydration_risk")).toBe(true);
    });

    it("6 — combined risk factors include all expected additions", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({
          patientAgeYears: 72,
          diagnosisCodes: ["E11.9", "N18.3"],
          medicationNames: ["semaglutide (Ozempic)"],
        }),
      });
      const ids = additions.map((a) => a.id);
      expect(ids).toContain("diabetes_glucose_monitoring_reduced_intake");
      expect(ids).toContain("ckd_hydration_importance");
      expect(ids).toContain("diabetes_contact_if_poor_intake");
      expect(ids).toContain("glp1_clinician_contact_persisting_symptoms");
      expect(ids).toContain("older_adult_dehydration_risk");
    });

    it("7 — R11.2 without risk factors adds no patient-specific additions", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({ patientAgeYears: 40 }),
      });
      expect(additions).toEqual([]);
    });

    it("8 — CKD rule does not trigger without CKD evidence", () => {
      expect(
        detectCkdFromContext(buildPatientSpecificDischargeContext({ diagnosisCodes: ["I10"] }))
      ).toBe(false);
    });

    it("9 — diabetes rule does not trigger without diabetes evidence", () => {
      expect(
        detectDiabetesFromContext(buildPatientSpecificDischargeContext({ diagnosisCodes: ["R11.2"] }))
      ).toBe(false);
    });

    it("10 — GLP-1 rule does not trigger for unrelated medications", () => {
      expect(
        detectGlp1MedicationFromContext(
          buildPatientSpecificDischargeContext({ medicationNames: ["Amoxicillin 500 mg"] })
        )
      ).toBe(false);
    });

    it("11 — additions are not duplicated", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1", "nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({
          diagnosisCodes: ["E11.9", "E11.65"],
        }),
      });
      const ids = additions.map((a) => a.id);
      expect(new Set(ids).size).toBe(ids.length);
    });

    it("19 — unknown patient context does not guess diabetes or CKD", () => {
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: {},
      });
      expect(additions).toEqual([]);
    });
  });

  describe("rendering order and surfaces", () => {
    const fullContext = renderOptions({
      patientAgeYears: 72,
      diagnosisCodes: ["E11.9", "N18.3"],
      medicationNames: ["Ozempic"],
    });

    it("12 — additions render after medication/treatment", () => {
      const form = r112SavedForm();
      const block = buildProviderDischargeDocumentationSummaryBlock(
        mergeProviderDischargeDocumentationIntoDischargeJson({}, form),
        "en",
        fullContext
      )!;
      const blob = block.lines.join("\n");
      const medIdx = blob.indexOf("Diagnosis medication / treatment");
      const patientIdx = blob.indexOf("Patient-specific instructions");
      expect(medIdx).toBeGreaterThan(-1);
      expect(patientIdx).toBeGreaterThan(medIdx);
    });

    it("13 — additions render before return precautions", () => {
      const form = r112SavedForm();
      const block = buildProviderDischargeDocumentationSummaryBlock(
        mergeProviderDischargeDocumentationIntoDischargeJson({}, form),
        "en",
        fullContext
      )!;
      const blob = block.lines.join("\n");
      const patientIdx = blob.indexOf("Patient-specific instructions");
      const returnIdx = blob.indexOf("Discharge planning");
      expect(patientIdx).toBeGreaterThan(-1);
      expect(returnIdx).toBeGreaterThan(patientIdx);
    });

    it("14 — additions appear in preview", () => {
      const form = r112SavedForm();
      const sections = buildProviderDischargeDocumentationPreviewSections(form, {}, "en", fullContext);
      const patientSection = sections.find((s) => s.id === "providerPatientSpecific");
      expect(patientSection?.lines.some((l) => l.includes("diabetes"))).toBe(true);
    });

    it("15 — additions appear in summary display", () => {
      const form = r112SavedForm();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en", fullContext);
      expect(block!.lines.join("\n")).toContain("chronic kidney disease");
    });

    it("16 — additions appear in discharge print HTML", () => {
      const form = r112SavedForm();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
      const html = getDischargePrintHtml({
        patient: { firstName: "Jean", lastName: "Test", dob: "1954-01-15" },
        encounter: { createdAt: "2026-06-03T12:00:00.000Z", dischargeSummaryJson: merged },
        language: "en",
        patientSpecificDischargeContext: buildPatientSpecificDischargeContext({
          diagnosisCodes: ["E11.9", "N18.3"],
          medicationNames: ["Ozempic"],
        }),
      });
      expect(html).toContain("Patient-specific instructions");
      expect(html).toContain("GLP-1 medication");
    });

    it("17 — additions appear in ER packet patient-facing output", () => {
      const form = r112SavedForm();
      form.diagnosisRefs.push({
        encounterDiagnosisId: "dx-diabetes",
        code: "E11.9",
        label: "Type 2 diabetes mellitus",
        isPrimary: false,
      });
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
      const html = getErPrintPacketHtml({
        patient: { firstName: "Jean", lastName: "Test", dob: "1954-01-15", sex: "M" },
        encounter: {
          createdAt: "2026-06-03T12:00:00.000Z",
          dischargeSummaryJson: merged,
        },
        triageSnapshot: {},
        language: "en",
      });
      expect(html).toContain("Patient-specific instructions");
      expect(html).toContain("monitor blood glucose closely");
    });

    it("21 — French section label renders correctly", () => {
      const form = r112SavedForm();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
      const block = buildProviderDischargeDocumentationSummaryBlock(
        merged,
        "fr",
        renderOptions({ diagnosisCodes: ["E11.9"] })
      )!;
      expect(block.lines.join("\n")).toContain("Instructions propres au patient");
      expect(block.lines.join("\n")).toContain("diabète");
    });

    it("22 — R11.2 core template text remains unchanged", () => {
      const template = PROVIDER_DISCHARGE_TEMPLATE_REGISTRY.find((t) => t.id === "nausea_vomiting_v1")!;
      const templateBody = getProviderDischargeSuggestedTextBody(template, "en");
      const card = r112CardWithTemplateApplied();
      expect(card.diagnosisInstructions).toContain(templateBody.diagnosisInstructions.slice(0, 40));
      const additions = resolvePatientSpecificDischargeAdditions({
        templateIds: ["nausea_vomiting_v1"],
        locale: "en",
        context: buildPatientSpecificDischargeContext({ diagnosisCodes: ["E11.9"] }),
      });
      for (const addition of additions) {
        expect(card.diagnosisInstructions).not.toContain(addition.text);
      }
    });

    it("additions are rendered dynamically not stored in diagnosis card", () => {
      const card = r112CardWithTemplateApplied();
      const baselineInstructions = card.diagnosisInstructions;
      const form = normalizeProviderDischargeDiagnosisCards({
        patientLeftEdAt: "2026-06-03T18:00:00.000Z",
        diagnosisRefs: [
          {
            encounterDiagnosisId: "dx-r112",
            code: R11_2_CODE,
            label: R11_2_DISPLAY,
            isPrimary: true,
          },
        ],
        diagnosisDocs: [card],
        returnPrecautions: "Return if worse.",
        returnWorkSchool: "",
        followUps: [{ ...newDefaultFollowUpRow(), id: "fu-1", specialty: "PRIMARY_CARE", timing: ED_DEFAULT_PCP_FOLLOW_UP_TIMING }],
      });
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
      buildProviderDischargeDocumentationSummaryBlock(
        merged,
        "en",
        renderOptions({ diagnosisCodes: ["E11.9"] })
      );
      expect(card.diagnosisInstructions).toBe(baselineInstructions);
    });

    it("18 — provider custom text remains unchanged", () => {
      const customMed = "Custom provider medication line — do not overwrite.";
      const form = r112SavedForm(customMed);
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en", fullContext)!;
      expect(block.lines.join("\n")).toContain(customMed);
    });
  });

  describe("safety guardrails", () => {
    it("19 — no medication stop/dose-change language appears in rules", () => {
      for (const rule of [
        ...resolvePatientSpecificDischargeAdditions({
          templateIds: ["nausea_vomiting_v1"],
          locale: "en",
          context: buildPatientSpecificDischargeContext({
            patientAgeYears: 72,
            diagnosisCodes: ["E11.9", "N18.3"],
            medicationNames: ["Ozempic", "Mounjaro", "tirzepatide"],
          }),
        }),
      ]) {
        expect(patientSpecificAdditionContainsForbiddenLanguage(rule.text)).toBe(false);
      }
      for (const phrase of PATIENT_SPECIFIC_ADDITION_FORBIDDEN_PHRASES) {
        expect(
          resolvePatientSpecificDischargeAdditions({
            templateIds: ["nausea_vomiting_v1"],
            locale: "en",
            context: buildPatientSpecificDischargeContext({ diagnosisCodes: ["E11.9"] }),
          }).every((a) => !a.text.toLowerCase().includes(phrase))
        ).toBe(true);
      }
    });
  });

  describe("no context — backward compatible", () => {
    it("summary without patient context has no patient-specific section", () => {
      const form = r112SavedForm();
      const merged = mergeProviderDischargeDocumentationIntoDischargeJson({}, form);
      const block = buildProviderDischargeDocumentationSummaryBlock(merged, "en");
      expect(block!.lines.join("\n")).not.toContain("Patient-specific instructions");
    });

    it("empty form unchanged", () => {
      expect(emptyProviderDischargeDocumentationForm().diagnosisDocs).toEqual([]);
    });
  });
});
