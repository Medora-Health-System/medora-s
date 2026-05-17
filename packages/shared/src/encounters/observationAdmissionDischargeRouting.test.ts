import { describe, expect, it } from "vitest";
import {
  DISCHARGE_MODE_FR_ADMISSION,
  dischargeSnapshotHasClinicalDischargeContent,
  dischargeSnapshotIsObservationAdmissionRoutingOnly,
  mislabeledDischargeEventIsObservationAdmission,
  resolveClinicalDocumentationDisplayEventType,
} from "./observationAdmissionDischargeRouting.js";

describe("observationAdmissionDischargeRouting", () => {
  it("detects routing-only admission mode without clinical discharge fields", () => {
    expect(
      dischargeSnapshotIsObservationAdmissionRoutingOnly({
        dischargeMode: DISCHARGE_MODE_FR_ADMISSION,
      })
    ).toBe(true);
    expect(
      dischargeSnapshotHasClinicalDischargeContent({
        dischargeMode: DISCHARGE_MODE_FR_ADMISSION,
        followUp: "Clinique dans 48h",
      })
    ).toBe(true);
    expect(
      dischargeSnapshotIsObservationAdmissionRoutingOnly({
        dischargeMode: DISCHARGE_MODE_FR_ADMISSION,
        followUp: "Clinique dans 48h",
      })
    ).toBe(false);
  });

  it("remaps mislabeled discharge events for observation admission", () => {
    const event = {
      eventType: "DISCHARGE_SUMMARY_SAVED",
      payloadJson: { snapshot: { dischargeMode: DISCHARGE_MODE_FR_ADMISSION } },
    };
    expect(mislabeledDischargeEventIsObservationAdmission(event)).toBe(true);
    expect(resolveClinicalDocumentationDisplayEventType(event)).toBe("OBSERVATION_ADMISSION_PACKET_SAVED");
  });

  it("keeps true discharge events as discharge", () => {
    const event = {
      eventType: "DISCHARGE_SUMMARY_SAVED",
      payloadJson: {
        snapshot: { dischargeMode: "Domicile", dischargeInstructions: "Repos" },
      },
    };
    expect(mislabeledDischargeEventIsObservationAdmission(event)).toBe(false);
    expect(resolveClinicalDocumentationDisplayEventType(event)).toBe("DISCHARGE_SUMMARY_SAVED");
  });
});
