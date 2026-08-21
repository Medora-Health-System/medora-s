/**
 * MEDUI.RES.2A.1 — canonical Lab/Rad template restoration + ack reliability proofs.
 */
import { describe, expect, it } from "vitest";
import {
  buildImagingStructuredResultData,
  buildLabStructuredResultData,
  hasStructuredDiagnosticResultContent,
  parseClinicalStructuredResultData,
  projectResultDataForListRead,
} from "@medora/shared";
import { clinicalResultFromChartOrderItem, clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import {
  DEFAULT_GET_DEDUPE_TTL_MS,
  buildGetDedupeKey,
  dedupeGetRequest,
  hasGetDedupeCachedResult,
  invalidateGetRequestDedupeForPath,
  resetGetRequestDedupeForTests,
} from "@/lib/getRequestDedupe";

describe("MEDUI.RES.2A.1 canonical diagnostic result restoration", () => {
  it("projects chart/encounter resultData so ClinicalResultViewer receives LAB observations", () => {
    const structured = buildLabStructuredResultData({
      observations: [
        {
          name: "White Blood Cell (WBC)",
          value: "7.04",
          unit: "×10³/µL",
          referenceText: "4.5–11.0",
          flag: null,
        },
        {
          name: "Hemoglobin",
          value: "14.2",
          unit: "g/dL",
          referenceText: "12.0–16.0",
          flag: null,
        },
      ],
    });
    const projected = projectResultDataForListRead({
      ...structured,
      attachments: [{ fileName: "cbc.pdf", dataBase64: "AAA" }],
    });
    expect(hasStructuredDiagnosticResultContent(projected)).toBe(true);
    const parsed = parseClinicalStructuredResultData(projected);
    expect(parsed?.resultType).toBe("LAB");
    if (parsed?.resultType !== "LAB") throw new Error("expected LAB");
    expect(parsed.observations).toHaveLength(2);

    const fromEncounter = clinicalResultFromOrderItemLike({
      displayLabel: "CBC",
      catalogItemType: "LAB_TEST",
      status: "RESULTED",
      result: {
        resultText: "legacy smash wall",
        resultData: projected,
        verifiedAt: "2026-08-20T12:00:00.000Z",
        criticalValue: false,
      },
    });
    expect(fromEncounter.resultData).toBeTruthy();
    const encParsed = parseClinicalStructuredResultData(fromEncounter.resultData);
    expect(encParsed?.resultType).toBe("LAB");
    if (encParsed?.resultType !== "LAB") throw new Error("expected LAB");
    expect(encParsed.observations[0]?.name).toMatch(/WBC/i);

    const fromChart = clinicalResultFromChartOrderItem(
      {
        displayLabel: "CBC",
        status: "RESULTED",
        catalogItemType: "LAB_TEST",
        result: {
          resultText: "legacy smash wall",
          resultData: projected,
          verifiedAt: "2026-08-20T12:00:00.000Z",
          criticalValue: false,
          attachments: [],
        },
      },
      "fr"
    );
    const chartParsed = parseClinicalStructuredResultData(fromChart.resultData);
    expect(chartParsed?.resultType).toBe("LAB");
    if (chartParsed?.resultType !== "LAB") throw new Error("expected LAB");
    expect(chartParsed.observations).toHaveLength(2);
  });

  it("projects imaging report{} for Findings + Impression authority", () => {
    const structured = buildImagingStructuredResultData({
      indication: "Chest pain",
      technique: "PA/LAT",
      comparison: "None",
      findings: "Clear lungs",
      impression: "No acute cardiopulmonary process",
    });
    const projected = projectResultDataForListRead(structured);
    const parsed = parseClinicalStructuredResultData(projected);
    expect(parsed?.resultType).toBe("IMAGING");
    if (parsed?.resultType !== "IMAGING") throw new Error("expected IMAGING");
    expect(parsed.report.findings).toMatch(/Clear lungs/i);
    expect(parsed.report.impression).toMatch(/No acute/i);
  });

  it("does not TTL-cache mutable encounter-order GETs after settle (ack stale-read root cause)", async () => {
    resetGetRequestDedupeForTests();
    const path = "/encounters/enc-1/orders";
    const key = buildGetDedupeKey(path, "fac-1");
    let calls = 0;
    await dedupeGetRequest(key, async () => {
      calls += 1;
      return [{ id: "stale" }];
    }, 0);
    expect(hasGetDedupeCachedResult(key, 0)).toBe(false);
    expect(hasGetDedupeCachedResult(key, DEFAULT_GET_DEDUPE_TTL_MS)).toBe(true);
    invalidateGetRequestDedupeForPath(path, "fac-1");
    expect(hasGetDedupeCachedResult(key, DEFAULT_GET_DEDUPE_TTL_MS)).toBe(false);
    await dedupeGetRequest(key, async () => {
      calls += 1;
      return [{ id: "fresh-ack" }];
    }, 0);
    expect(calls).toBe(2);
  });
});
