import { describe, expect, it } from "vitest";
import {
  CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION,
  buildEmptyLabObservationsFromPanel,
  buildImagingStructuredResultData,
  buildLabStructuredResultData,
  clinicalResultStructuredEngineIsFacilityAgnostic,
  hasStructuredDiagnosticResultContent,
  imagingReportToResultText,
  initialsFromDisplayName,
  labObservationsToResultText,
  parseClinicalStructuredResultData,
  projectResultDataForListRead,
  resolveLabPanelKeyFromCatalog,
  resolveStructuredLabObservationDisplayFlag,
} from "./clinicalResultStructured.js";

describe("clinicalResultStructured — RES.2A", () => {
  it("is facility-agnostic (no facility ID branching)", () => {
    expect(clinicalResultStructuredEngineIsFacilityAgnostic()).toBe(true);
  });

  it("resolves CBC/CMP panel keys from catalog code and labels without facility context", () => {
    expect(resolveLabPanelKeyFromCatalog({ catalogCode: "CBC" })).toBe("CBC");
    expect(resolveLabPanelKeyFromCatalog({ catalogCode: "ER_CMP" })).toBe("CMP");
    expect(resolveLabPanelKeyFromCatalog({ label: "Numération formule sanguine (NFS)" })).toBe("CBC");
    expect(resolveLabPanelKeyFromCatalog({ catalogCode: "TROP" })).toBeNull();
  });

  it("scaffolds CBC rows without inventing reference ranges", () => {
    const rows = buildEmptyLabObservationsFromPanel("CBC");
    expect(rows.length).toBeGreaterThan(4);
    expect(rows.every((r) => !r.referenceText && r.flag == null)).toBe(true);
    expect(rows[0]?.name).toMatch(/WBC/i);
  });

  it("round-trips LAB structured resultData and builds non-smash resultText", () => {
    const data = buildLabStructuredResultData({
      observations: [
        {
          name: "White Blood Cell (WBC)",
          value: "7.04",
          unit: "x10³/µL",
          referenceText: "4.5–11.0",
          flag: null,
        },
        {
          name: "Hemoglobin (Hgb)",
          value: "14.2",
          unit: "g/dL",
          referenceText: "12–16",
          flag: "NORMAL",
        },
      ],
    });
    expect(data.schemaVersion).toBe(CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION);
    expect(hasStructuredDiagnosticResultContent(data)).toBe(true);
    const parsed = parseClinicalStructuredResultData(data);
    expect(parsed?.resultType).toBe("LAB");
    if (parsed?.resultType !== "LAB") throw new Error("expected LAB");
    expect(parsed.observations).toHaveLength(2);

    const text = labObservationsToResultText(parsed.observations);
    expect(text).toContain("White Blood Cell (WBC) 7.04");
    expect(text).not.toMatch(/WBC\)7\.04/);
  });

  it("computes LOW/HIGH only from authoritative reference text; never invents critical from normal range", () => {
    const low = resolveStructuredLabObservationDisplayFlag({
      name: "WBC",
      value: "3.0",
      referenceText: "4.5–11.0",
      flag: null,
    });
    expect(low).toBe("L");

    const high = resolveStructuredLabObservationDisplayFlag({
      name: "WBC",
      value: "12.5",
      referenceText: "4.5–11.0",
      flag: null,
    });
    expect(high).toBe("H");

    const explicitCritical = resolveStructuredLabObservationDisplayFlag({
      name: "Lactate",
      value: "6.0",
      referenceText: "0.5–2.0",
      flag: "CRITICAL",
    });
    expect(explicitCritical).toBe("C");

    const noRange = resolveStructuredLabObservationDisplayFlag({
      name: "WBC",
      value: "99",
      referenceText: null,
      flag: null,
    });
    expect(noRange).toBeNull();
  });

  it("round-trips IMAGING structured report with Findings + Impression", () => {
    const data = buildImagingStructuredResultData({
      indication: "Cough",
      findings: "Clear lungs",
      impression: "No acute process",
    });
    const parsed = parseClinicalStructuredResultData(data);
    expect(parsed?.resultType).toBe("IMAGING");
    const text = imagingReportToResultText(data.report);
    expect(text).toContain("Findings:");
    expect(text).toContain("Impression:");
    expect(text).toContain("No acute process");
  });

  it("builds initials from acknowledging user display name", () => {
    expect(initialsFromDisplayName("Marie Claire")).toBe("MC");
    expect(initialsFromDisplayName("AB")).toBe("AB");
  });

  it("ignores attachment-only resultData without schema", () => {
    expect(
      hasStructuredDiagnosticResultContent({
        attachments: [{ fileName: "a.pdf", dataBase64: "xx" }],
      })
    ).toBe(false);
  });

  it("list-read projection keeps observations/report and strips attachment bytes", () => {
    const data = buildLabStructuredResultData({
      observations: [
        {
          name: "Hemoglobin",
          value: "14.2",
          unit: "g/dL",
          referenceText: "12.0–16.0",
          flag: null,
        },
      ],
    });
    const withAtt = {
      ...data,
      attachments: [{ fileName: "cbc.pdf", mimeType: "application/pdf", dataBase64: "AAA" }],
    };
    const projected = projectResultDataForListRead(withAtt) as Record<string, unknown>;
    expect(parseClinicalStructuredResultData(projected)?.observations?.[0]?.name).toMatch(/Hemoglobin/i);
    const atts = projected.attachments as Array<Record<string, unknown>>;
    expect(atts[0]?.fileName).toBe("cbc.pdf");
    expect(atts[0]?.dataBase64).toBeUndefined();
  });
});
