/**
 * MEDUI.INP.2G — nursing medical-record projection (shared).
 */

import { describe, expect, it } from "vitest";
import { projectNursingAdmissionMedicalRecord } from "./nursingAdmissionMedicalRecordProjectionInp2g.js";

describe("MEDUI.INP.2G nursing medical-record projection", () => {
  it("omits empty fields and does not invent N/A", () => {
    const empty = projectNursingAdmissionMedicalRecord(null);
    expect(empty.availability).toBe("EMPTY");
    expect(empty.rows).toEqual([]);

    const ready = projectNursingAdmissionMedicalRecord({
      version: 1,
      schemaVersion: 1,
      facilityId: "f1",
      patientId: "p1",
      encounterId: "e1",
      expectedVersion: 1,
      updatedAt: new Date().toISOString(),
      clinicalDocumentedAt: "2026-01-01T12:00:00.000Z",
      updatedByUserId: "u1",
      sections: {
        OVERVIEW: {
          completionState: "COMPLETE",
          answers: {
            admissionSource: "ED",
            modeOfArrival: "AMBULANCE",
            conditionOnArrival: "STABLE",
          },
        },
      },
      belongings: [],
      wounds: [],
      headToToe: {},
      preloadedItems: [],
      nurseSignature: {
        signed: true,
        displayName: "UAT Nurse",
        credentials: "RN",
        signedAt: "2026-01-01T13:00:00.000Z",
      },
      amendments: [],
    } as never);
    expect(ready.availability).toBe("READY");
    expect(ready.rows.some((r) => r.fieldKey === "admissionSource" && r.value === "ED")).toBe(true);
    expect(ready.rows.every((r) => r.value && r.value !== "N/A" && r.value !== "Normal")).toBe(true);
    expect(ready.signed).toBe(true);
    expect(ready.nurseDisplayName).toBe("UAT Nurse");
  });
});
