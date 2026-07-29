import { describe, expect, it } from "vitest";
import {
  classifyMarAllergyDocumentationSummary,
  evaluateMarAllergySafetyForAdministration,
  getEncounterAllergyDocumentationSummary,
  isMarAllergyAcknowledgementServerMessage,
  isNoKnownAllergyDocumentationText,
  MAR_ALLERGY_ACKNOWLEDGEMENT_VERSION,
} from "../encounter-allergy-safety.js";
import {
  CLINIC_ENTERPRISE_MAR_SAFETY_RX_PRINT_CERTIFICATION_ID,
  D4C7H_FORBIDDEN_CLINIC_AUTHORITIES,
  D4C7H_RX_PRINT_ERROR_CODES,
  evaluateRxPrintFacilityIdentity,
  formatRxPrintFacilityAddressLines,
  isRxPrintHtmlDocumentReady,
  isUnsafeNoopenerPrintWindowOpenFeatures,
} from "../auth/enterpriseMarSafetyAckRxPrintAuthorityD4c7h.js";

describe("MEDUI.D4C.7H MAR allergy safety classification", () => {
  it("exports certification id and forbids Clinic* engines", () => {
    expect(CLINIC_ENTERPRISE_MAR_SAFETY_RX_PRINT_CERTIFICATION_ID).toBe("MEDUI.D4C.7H");
    expect(D4C7H_FORBIDDEN_CLINIC_AUTHORITIES).toContain("ClinicMarAllergyConfirmation");
    expect(D4C7H_FORBIDDEN_CLINIC_AUTHORITIES).toContain("ClinicPrescriptionPrint");
  });

  it("classifies known allergy, NKDA, and unknown distinctly", () => {
    expect(classifyMarAllergyDocumentationSummary("Pénicilline — urticaire")).toBe(
      "KNOWN_ALLERGY_OR_INTOLERANCE"
    );
    expect(classifyMarAllergyDocumentationSummary("Aucune allergie connue")).toBe("NO_KNOWN_ALLERGIES");
    expect(classifyMarAllergyDocumentationSummary("NKDA")).toBe("NO_KNOWN_ALLERGIES");
    expect(classifyMarAllergyDocumentationSummary("Statut allergique non vérifié")).toBe(
      "STATUS_UNKNOWN"
    );
    expect(classifyMarAllergyDocumentationSummary(null)).toBe("NONE");
  });

  it("requires acknowledgement for NKDA and known documentation", () => {
    const known = evaluateMarAllergySafetyForAdministration({
      vitals: { allergyNote: "Pénicilline" },
    });
    expect(known.acknowledgementRequired).toBe(true);
    expect(known.category).toBe("KNOWN_ALLERGY_OR_INTOLERANCE");
    expect(known.acknowledgementVersion).toBe(MAR_ALLERGY_ACKNOWLEDGEMENT_VERSION);

    const nkda = evaluateMarAllergySafetyForAdministration({
      vitals: { allergyNote: "Aucune allergie connue" },
    });
    expect(nkda.acknowledgementRequired).toBe(true);
    expect(nkda.category).toBe("NO_KNOWN_ALLERGIES");
    expect(isNoKnownAllergyDocumentationText(nkda.summary)).toBe(true);

    const none = evaluateMarAllergySafetyForAdministration({});
    expect(none.acknowledgementRequired).toBe(false);
    expect(none.category).toBe("NONE");
  });

  it("reads triage ER allergy free-text for the gate summary", () => {
    const summary = getEncounterAllergyDocumentationSummary({
      triageVitalsJson: {
        medoraErTriageV1: {
          medicationAllergiesDetail: "Latex",
          additionalAllergyInfo: "",
        },
      },
    });
    expect(summary).toContain("Latex");
  });

  it("detects server allergy acknowledgement messages", () => {
    expect(
      isMarAllergyAcknowledgementServerMessage(
        "Des allergies ou intolérances sont documentées pour cette visite. Confirmez avant d’enregistrer l’administration."
      )
    ).toBe(true);
    expect(isMarAllergyAcknowledgementServerMessage("Dose invalide")).toBe(false);
  });
});

describe("MEDUI.D4C.7H Rx print readiness / facility identity", () => {
  it("rejects noopener print window features (blank about:blank root cause)", () => {
    expect(isUnsafeNoopenerPrintWindowOpenFeatures("noopener,noreferrer")).toBe(true);
    expect(isUnsafeNoopenerPrintWindowOpenFeatures(undefined)).toBe(false);
    expect(isUnsafeNoopenerPrintWindowOpenFeatures("width=800")).toBe(false);
  });

  it("validates printable HTML readiness", () => {
    expect(isRxPrintHtmlDocumentReady("<html><body></body></html>")).toBe(false);
    expect(
      isRxPrintHtmlDocumentReady(
        "<!DOCTYPE html><html><body><h2>Ordonnance</h2><p>Patient</p></body></html>"
      )
    ).toBe(true);
    expect(isRxPrintHtmlDocumentReady("")).toBe(false);
  });

  it("requires facility display name and formats international address lines", () => {
    expect(evaluateRxPrintFacilityIdentity({ name: null })).toEqual({
      ok: false,
      code: D4C7H_RX_PRINT_ERROR_CODES.RX_PRINT_FACILITY_IDENTITY_MISSING,
      missingFields: ["name"],
    });
    expect(evaluateRxPrintFacilityIdentity({ name: "Clinique Test" }).ok).toBe(true);
    expect(
      formatRxPrintFacilityAddressLines({
        name: "Clinique Test",
        line1: "12 Rue Principale",
        city: "Port-au-Prince",
        country: "Haïti",
        phone: "+509 1234",
      })
    ).toEqual(["12 Rue Principale", "Port-au-Prince", "Haïti"]);
  });
});
