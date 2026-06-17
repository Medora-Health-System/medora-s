import { describe, expect, it } from "vitest";
import {
  parseMarScheduleTimingDocumentationFromNotes,
  reconstructMarAdministrationVarianceFromNotes,
} from "./marVarianceReconstructionGovernance.js";
import { buildMarScheduleTimingDocumentation } from "./marAdministrationSafetyGovernance.js";
import { normalizeMedicationAdministrationHistoryMarRow } from "./medicationAdministrationHistoryNormalization.js";
import { resolveMarMedicationTimingOverrideReasonLabel } from "./marMedicationTimingOverrideGovernance.js";

describe("marVarianceReconstructionGovernance", () => {
  it("parses structured early administration notes", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "early",
      reasonCode: "CLINICAL_CONDITION",
      otherText: "Patient deteriorating",
      minutesDelta: 120,
    });
    const parsed = parseMarScheduleTimingDocumentationFromNotes(notes);
    expect(parsed?.kind).toBe("early");
    expect(parsed?.minutesDelta).toBe(120);
    expect(parsed?.reasonCode).toBe("CLINICAL_CONDITION");
  });

  it("parses OTHER detail from schedule timing notes", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "late",
      reasonCode: "OTHER",
      otherText: "Patient in imaging suite",
      minutesDelta: 150,
    });
    const reconstructed = reconstructMarAdministrationVarianceFromNotes(notes);
    expect(reconstructed?.reasonCode).toBe("OTHER");
    expect(reconstructed?.reasonDetail).toBe("Patient in imaging suite");
    expect(reconstructed?.documentedKind).toBe("late");
  });

  it("normalizes legacy reason codes to canonical codes", () => {
    const notes = "MAR_SCHEDULE_TIMING: EARLY 90m — PROVIDER_INSTRUCTION";
    const reconstructed = reconstructMarAdministrationVarianceFromNotes(notes);
    expect(reconstructed?.reasonCode).toBe("PROVIDER_REQUEST");
  });

  it("reconstructs history row with performer and variance reason", () => {
    const notes = buildMarScheduleTimingDocumentation({
      kind: "late",
      reasonCode: "PATIENT_OFF_UNIT",
      minutesDelta: 165,
    });
    const entry = normalizeMedicationAdministrationHistoryMarRow({
      id: "mar-1",
      encounterId: "enc-1",
      orderItemId: "oi-1",
      administeredAt: "2026-06-03T12:45:00.000Z",
      medicationLabelSnapshot: "Lasix",
      route: "IV",
      marAction: "administered",
      notes,
      doseScheduledAt: "2026-06-03T10:00:00.000Z",
      performedByFirstName: "Jane",
      performedByLastName: "Smith",
      performedByRole: "RN",
    });
    expect(entry.eventType).toBe("LATE_ADMINISTRATION");
    expect(entry.reasonCode).toBe("PATIENT_OFF_UNIT");
    expect(entry.performedByDisplay).toBe("Jane Smith");
    expect(entry.varianceMinutes).toBe(165);
    expect(entry.varianceSeverity).toBe("HIGH");
    expect(entry.reviewRecommended).toBe(true);
  });

  it("resolves EN and FR reason labels for reconstruction", () => {
    expect(resolveMarMedicationTimingOverrideReasonLabel("CLINICAL_CONDITION", "en")).toBe(
      "Clinical condition"
    );
    expect(resolveMarMedicationTimingOverrideReasonLabel("CLINICAL_CONDITION", "fr")).toBe(
      "Condition clinique"
    );
  });
});
