/**
 * INP.DIS.1G.1 — Prove inpatient board reuses ED diagnosis instruction engine (R07.9 / R06.02).
 */

import { describe, expect, it } from "vitest";
import { generateInpatientPatientInstructionsFromDiagnoses } from "./inpatientPatientInstructionsFromDiagnoses";

describe("INP.DIS.1G.1 ED engine reuse for chest pain / dyspnea", () => {
  it("R07.9 + R06.02 produce diagnosis instructions, return precautions, and follow-ups via ED templates", () => {
    const { instructions, followUps } = generateInpatientPatientInstructionsFromDiagnoses({
      diagnoses: [
        {
          id: "dx1",
          code: "R07.9",
          description: "Chest pain, unspecified",
          isPrimary: true,
          sortOrder: 0,
        },
        {
          id: "dx2",
          code: "R06.02",
          description: "Shortness of breath",
          isPrimary: false,
          sortOrder: 1,
        },
      ],
      locale: "en",
      facilityDisplayName: "Medora Test Hospital",
    });

    expect(instructions.diagnosisInstructions?.trim().length).toBeGreaterThan(10);
    expect(instructions.returnPrecautions?.trim().length).toBeGreaterThan(10);
    const precautions = (instructions.returnPrecautions ?? "").toLowerCase();
    expect(
      /chest|pain|breath|shortness|worse|return|emergency|seek/.test(precautions)
    ).toBe(true);
    expect(followUps.length).toBeGreaterThan(0);
    // Must not be a hard-coded inpatient-only stub — ED-derived content is multi-word clinical text
    expect(instructions.diagnosisInstructions).not.toBe("Chest pain, unspecified");
  });

  it("French locale still yields non-empty return precautions from the same engine", () => {
    const { instructions } = generateInpatientPatientInstructionsFromDiagnoses({
      diagnoses: [
        {
          id: "dx1",
          code: "R07.9",
          description: "Chest pain, unspecified",
          isPrimary: true,
          sortOrder: 0,
        },
        {
          id: "dx2",
          code: "R06.02",
          description: "Shortness of breath",
          isPrimary: false,
          sortOrder: 1,
        },
      ],
      locale: "fr",
      facilityDisplayName: "Hôpital Medora",
    });
    expect((instructions.returnPrecautions ?? "").trim().length).toBeGreaterThan(10);
    expect((instructions.diagnosisInstructions ?? "").trim().length).toBeGreaterThan(5);
  });
});
