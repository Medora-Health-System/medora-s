import { describe, expect, it } from "vitest";
import {
  classifyMarPrnReasonGroup,
  formatMarPrnReasonForLocale,
  isPrnMedicationOrder,
  marPrnAdministrationRequiresPainScore,
  marPrnReasonCodesForGroup,
  mergePrnAdministrationIntoMarNotes,
  parseMarPrnAdministrationFromNotes,
  parsePrnIndicationFromDirections,
  formatPrnMarAdministrationCellSummary,
  validatePrnAdministrationForMarCreate,
} from "./medicationAdministrationPrnGovernance.js";

describe("medicationAdministrationPrnGovernance (K.10B.7)", () => {
  it("parses PRN indication from Zofran q6h PRN nausea/vomiting", () => {
    expect(parsePrnIndicationFromDirections("4 mg IVP q6h PRN nausea/vomiting")).toBe(
      "nausea/vomiting"
    );
    expect(
      isPrnMedicationOrder({
        directionsSig: "4 mg IVP q6h PRN nausea/vomiting",
        frequencyCode: "Q6H",
      })
    ).toBe(true);
  });

  it("parses PRN indication from Morphine q4h PRN severe pain", () => {
    expect(parsePrnIndicationFromDirections("2 mg IVP q4h PRN severe pain")).toBe("severe pain");
    expect(
      isPrnMedicationOrder({
        directionsSig: "2 mg IVP q4h PRN severe pain",
      })
    ).toBe(true);
  });

  it("scheduled non-PRN medication is not PRN", () => {
    expect(
      isPrnMedicationOrder({
        frequencyCode: "BID",
        directionsSig: "1 tab PO BID",
      })
    ).toBe(false);
  });

  it("classifies pain PRN meds as requiring pain score", () => {
    expect(
      marPrnAdministrationRequiresPainScore({
        medicationLabel: "Morphine 10 mg/mL",
      })
    ).toBe(true);
    expect(
      marPrnAdministrationRequiresPainScore({
        medicationLabel: "Acetaminophen 500 mg",
      })
    ).toBe(true);
  });

  it("classifies antiemetics as antiemetic reason group", () => {
    expect(
      classifyMarPrnReasonGroup({
        medicationLabel: "Ondansetron 4 mg",
        prnIndication: "nausea/vomiting",
      })
    ).toBe("antiemetic");
    expect(marPrnReasonCodesForGroup("antiemetic")).toContain("nausea_vomiting");
  });

  it("validatePrnAdministrationForMarCreate requires reason and pain score", () => {
    expect(
      validatePrnAdministrationForMarCreate({
        marAction: "administered",
        directionsSig: "2 mg IVP q4h PRN severe pain",
        medicationLabel: "Morphine",
      })?.code
    ).toBe("prn_reason_required");

    expect(
      validatePrnAdministrationForMarCreate({
        marAction: "administered",
        directionsSig: "2 mg IVP q4h PRN severe pain",
        medicationLabel: "Morphine",
        prnReasonCode: "severe_pain",
      })?.code
    ).toBe("prn_pain_score_required");

    expect(
      validatePrnAdministrationForMarCreate({
        marAction: "administered",
        directionsSig: "2 mg IVP q4h PRN severe pain",
        medicationLabel: "Morphine",
        prnReasonCode: "severe_pain",
        painScore: 8,
      })
    ).toBeNull();
  });

  it("merge and parse PRN administration notes round-trip", () => {
    const merged = mergePrnAdministrationIntoMarNotes({
      notes: "Patient restless",
      prnReasonCode: "severe_pain",
      prnIndication: "severe pain",
      painScore: 8,
      painLocation: "Abdomen",
      locale: "en",
    });
    const parsed = parseMarPrnAdministrationFromNotes(merged);
    expect(parsed.reasonCode).toBe("severe_pain");
    expect(parsed.painScore).toBe(8);
    expect(parsed.painLocation).toBe("Abdomen");
    expect(formatPrnMarAdministrationCellSummary(merged, "en")).toBe("Pain 8/10");
  });

  it("formatMarPrnReasonForLocale maps legacy French labels to English", () => {
    expect(formatMarPrnReasonForLocale({ label: "Douleur modérée" }, "en")).toBe("Moderate pain");
    expect(formatMarPrnReasonForLocale({ label: "Vomissements" }, "en")).toBe("Vomiting");
  });

  it("formatMarPrnReasonForLocale maps stable codes to French", () => {
    expect(formatMarPrnReasonForLocale({ code: "moderate_pain" }, "fr")).toBe("Douleur modérée");
    expect(formatMarPrnReasonForLocale({ code: "vomiting" }, "fr")).toBe("Vomissements");
  });

  it("formatPrnMarAdministrationCellSummary prefers code over legacy French label", () => {
    const notes = [
      "MAR_PRN_REASON:moderate_pain",
      "MAR_PRN_REASON_LABEL:Douleur modérée",
    ].join("\n");
    expect(formatPrnMarAdministrationCellSummary(notes, "en")).toBe("Moderate pain");
  });
});
