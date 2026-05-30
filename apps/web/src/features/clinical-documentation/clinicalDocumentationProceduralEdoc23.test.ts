import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  LUMBAR_PUNCTURE_MONITORING_CARD_ID,
  PROCEDURE_TIMEOUT_CARD_ID,
  TNK_ADMINISTRATION_CARD_ID,
  TPA_ADMINISTRATION_CARD_ID,
  getClinicalDocumentationCardById,
  listClinicalDocumentationCardsForCareSetting,
  searchClinicalDocumentationCards,
  summarizeProceduralSafetyThrombolyticPayload,
} from "@medora/shared";
import { describe, expect, it } from "vitest";

const webSrcRoot = join(import.meta.dirname, "..", "..");

describe("clinical documentation procedural safety (EDOC.23)", () => {
  const hub = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationHub.tsx"),
    "utf8"
  );
  const form = readFileSync(
    join(webSrcRoot, "features/clinical-documentation/ClinicalDocumentationProceduralSafetyForm.tsx"),
    "utf8"
  );
  const en = readFileSync(join(webSrcRoot, "i18n/messages/en.ts"), "utf8");
  const fr = readFileSync(join(webSrcRoot, "i18n/messages/fr.ts"), "utf8");

  it("hub wires EDOC.23 procedural safety form", () => {
    expect(hub).toContain("isEdoc23ProceduralSafetyThrombolyticDocumentationFormCard");
    expect(hub).toContain("ClinicalDocumentationProceduralSafetyForm");
  });

  it("procedure timeout form renders with structured dropdowns", () => {
    expect(form).toContain("clinical-documentation-procedural-safety-form");
    expect(form).toContain("PROC_TIMEOUT_PROCEDURE_TYPE_OPTIONS");
    expect(form).toContain("PROCEDURE_TIMEOUT_CARD_ID");
    expect(form).toContain("ClinicalDocumentationSelectField");
    expect(form).toContain('testId="proc-timeout-type"');
  });

  it("lumbar puncture form renders", () => {
    expect(form).toContain("LUMBAR_PUNCTURE_MONITORING_CARD_ID");
    expect(form).toContain("LP_POST_PROCEDURE_POSITION_OPTIONS");
    expect(form).toContain('testId="lp-position"');
  });

  it("TNK form renders", () => {
    expect(form).toContain("TNK_ADMINISTRATION_CARD_ID");
    expect(form).toContain("THROMBOLYTIC_HOLD_REASON_OPTIONS");
    expect(form).toContain("doseReferenceOnly");
  });

  it("tPA form renders with dose consistency warning", () => {
    expect(form).toContain("TPA_ADMINISTRATION_CARD_ID");
    expect(form).toContain("isTpaTotalDoseConsistent");
    expect(form).toContain("doseConsistencyWarning");
    expect(form).toContain("THROMBOLYTIC_INTERRUPTION_REASON_OPTIONS");
  });

  it("bilingual procedural/thrombolytic form keys mirrored", () => {
    expect(en).toContain("proceduralSafety:");
    expect(fr).toContain("proceduralSafety:");
    expect(en).toContain("thrombolytic:");
    expect(fr).toContain("thrombolytic:");
    expect(en).toContain("procedureHeld:");
    expect(fr).toContain("procedureHeld:");
    expect(en).toContain("holdReason:");
    expect(fr).toContain("holdReason:");
  });

  it("foundation cards upgraded to AVAILABLE — no duplicate visible titles", () => {
    for (const id of [
      PROCEDURE_TIMEOUT_CARD_ID,
      LUMBAR_PUNCTURE_MONITORING_CARD_ID,
      TNK_ADMINISTRATION_CARD_ID,
      TPA_ADMINISTRATION_CARD_ID,
    ]) {
      expect(getClinicalDocumentationCardById(id)?.implementationStatus).toBe("AVAILABLE");
    }
    const allEd = listClinicalDocumentationCardsForCareSetting("ED");
    const titles = allEd.map((c) => c.titleEn);
    const dupes = titles.filter((t, i) => titles.indexOf(t) !== i);
    expect(dupes).toEqual([]);
  });

  it("search TNK returns canonical TNK card", () => {
    const results = searchClinicalDocumentationCards("TNK", "en", { careSetting: "ED", category: "ALL" });
    expect(results.some((c) => c.id === TNK_ADMINISTRATION_CARD_ID)).toBe(true);
  });

  it("search tPA returns canonical tPA card", () => {
    const results = searchClinicalDocumentationCards("tPA", "en", { careSetting: "ED", category: "ALL" });
    expect(results.some((c) => c.id === TPA_ADMINISTRATION_CARD_ID)).toBe(true);
  });

  it("search procedure timeout returns canonical timeout card", () => {
    const results = searchClinicalDocumentationCards("procedure timeout", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(results.some((c) => c.id === PROCEDURE_TIMEOUT_CARD_ID)).toBe(true);
  });

  it("search lumbar puncture returns canonical LP card", () => {
    const results = searchClinicalDocumentationCards("lumbar puncture", "en", {
      careSetting: "ED",
      category: "ALL",
    });
    expect(results.some((c) => c.id === LUMBAR_PUNCTURE_MONITORING_CARD_ID)).toBe(true);
  });

  it("EN and FR summaries render", () => {
    const enSummary = summarizeProceduralSafetyThrombolyticPayload(
      PROCEDURE_TIMEOUT_CARD_ID,
      {
        timeoutTime: "2026-05-28T14:00:00.000Z",
        procedureType: "LUMBAR_PUNCTURE",
        patientIdentityConfirmed: "YES",
        procedureConfirmed: "YES",
        siteConfirmed: "YES",
        consentVerified: "YES",
        allergiesReviewed: "YES",
        anticoagulationReviewed: "NOT_APPLICABLE",
        imagingReviewed: "NOT_APPLICABLE",
        labsReviewed: "NOT_APPLICABLE",
        equipmentAvailable: "YES",
        bloodProductsAvailable: "NOT_APPLICABLE",
        participantsPresent: "YES",
        providerPresent: "YES",
        nursePresent: "YES",
        timeoutCompleted: "YES",
        procedureHeld: "NO",
        providerNotified: "NO",
      },
      "en"
    );
    expect(enSummary.some((l) => l.key === "Procedure type")).toBe(true);

    const frSummary = summarizeProceduralSafetyThrombolyticPayload(
      TNK_ADMINISTRATION_CARD_ID,
      {
        administrationTime: "2026-05-28T14:00:00.000Z",
        lastKnownWellTime: "2026-05-28T12:00:00.000Z",
        nihssScore: 8,
        patientWeightKg: 70,
        doseMg: 50,
        doseVerified: "YES",
        ctHeadReviewed: "YES",
        contraindicationChecklistReviewed: "YES",
        providerOrderVerified: "YES",
        neurologyConsulted: "NOT_APPLICABLE",
        bloodPressureWithinParameters: "YES",
        anticoagulantUseReviewed: "YES",
        bleedingRiskReviewed: "YES",
        patientFamilyEducationProvided: "NOT_APPLICABLE",
        medicationAdministered: "YES",
        administrationHeld: "NO",
        providerNotified: "NO",
      },
      "fr"
    );
    expect(frSummary.some((l) => l.key === "TNK administré")).toBe(true);
  });
});
