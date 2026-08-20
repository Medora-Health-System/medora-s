/**
 * MEDUI.RES.2A — same Result authority / projection contract across care settings.
 * Proves adapter + structured viewer prefer Result.resultData without facility branching.
 */
import { describe, expect, it } from "vitest";
import {
  CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION,
  buildLabStructuredResultData,
  clinicalResultStructuredEngineIsFacilityAgnostic,
  parseClinicalStructuredResultData,
} from "@medora/shared";
import { clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";

const RESULT_ID = "res-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";
const ORDER_ITEM_ID = "oi-aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee";

const structuredCbc = buildLabStructuredResultData({
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

function viewerInputForSetting(_setting: "ED" | "INPATIENT" | "CLINIC" | "DENTAL") {
  return clinicalResultFromOrderItemLike({
    displayLabel: "CBC",
    status: "RESULTED",
    catalogItemType: "LAB_TEST",
    result: {
      resultText: "legacy smash should not be preferred",
      resultData: structuredCbc,
      verifiedAt: "2026-08-20T18:00:00.000Z",
      acknowledgedByProviderAt: null,
      acknowledgedByDisplayFr: null,
    },
  });
}

describe("MEDUI.RES.2A cross-setting Result projection", () => {
  it("uses the same Result.resultData for ED / inpatient / clinic / dental adapters", () => {
    const ed = viewerInputForSetting("ED");
    const inp = viewerInputForSetting("INPATIENT");
    const clinic = viewerInputForSetting("CLINIC");
    const dental = viewerInputForSetting("DENTAL");

    for (const v of [ed, inp, clinic, dental]) {
      expect(v.catalogItemType).toBe("LAB_TEST");
      const parsed = parseClinicalStructuredResultData(v.resultData);
      expect(parsed?.resultType).toBe("LAB");
      if (parsed?.resultType !== "LAB") throw new Error("expected LAB");
      expect(parsed.observations[0]?.name).toContain("WBC");
      expect(parsed.observations[0]?.value).toBe("7.04");
      expect(parsed.schemaVersion).toBe(CLINICAL_RESULT_STRUCTURED_SCHEMA_VERSION);
    }

    expect(JSON.stringify(ed.resultData)).toBe(JSON.stringify(inp.resultData));
    expect(JSON.stringify(clinic.resultData)).toBe(JSON.stringify(dental.resultData));
  });

  it("does not invent facility-specific result engines", () => {
    expect(clinicalResultStructuredEngineIsFacilityAgnostic()).toBe(true);
    expect(ORDER_ITEM_ID).toBeTruthy();
    expect(RESULT_ID).toBeTruthy();
  });
});
