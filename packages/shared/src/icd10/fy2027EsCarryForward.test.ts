import { describe, expect, it } from "vitest";
import {
  ICD10_FY2027_ES_CARRY_FORWARD_TERMINOLOGY_VERSION,
} from "./icd10TerminologyTypes.js";
import {
  decideFy2027EsCarryForward,
  fy2027EsConceptUnchanged,
  summarizeFy2027EsCarryForward,
} from "./fy2027EsCarryForward.js";

const sameConcept = {
  code: "R10.85",
  shortDescription: "Abdominal pain, unspecified site",
  longDescription: "Abdominal pain, unspecified site",
  isSelectable: true,
  isBillable: true,
};

const fy2026Es = {
  preferredLabel: "Dolor abdominal en varios sitios",
  provenance: "MEDORA_GOVERNED",
  exactness: "EXACT_GOVERNED",
  sourceId: "MEDORA_DX_GOVERNED",
  terminologyVersion: "MEDORA.TRILANG.DX.P2.GOVERNED.89",
};

describe("FY2027 Spanish carry-forward eligibility", () => {
  it("carries a semantically unchanged selectable concept without mutating FY2026 identity", () => {
    const decision = decideFy2027EsCarryForward({
      fy2026: sameConcept,
      fy2027: { ...sameConcept },
      fy2026Es,
    });
    expect(decision.eligible).toBe(true);
    expect(decision.bucket).toBe("CARRY_FORWARD_ELIGIBLE");
    expect(decision.label).toBe(fy2026Es.preferredLabel);
    expect(decision.sourceId).toBe(fy2026Es.sourceId);
    expect(decision.exactness).toBe(fy2026Es.exactness);
    expect(decision.originalTerminologyVersion).toBe(fy2026Es.terminologyVersion);
    expect(decision.fy2027TerminologyVersion).toBe(ICD10_FY2027_ES_CARRY_FORWARD_TERMINOLOGY_VERSION);
  });

  it("rejects code-equal description changes even when FY2026 Spanish exists", () => {
    const fy2027 = {
      ...sameConcept,
      shortDescription: "Carbuncle of back [any part, except buttock and flank]",
      longDescription: "Carbuncle of back [any part, except buttock and flank]",
    };
    const fy2026 = {
      ...sameConcept,
      code: "L02.232",
      shortDescription: "Carbuncle of back [any part, except buttock]",
      longDescription: "Carbuncle of back [any part, except buttock]",
    };
    expect(fy2027EsConceptUnchanged(fy2026, { ...fy2026, code: "L02.232" })).toBe(true);
    const decision = decideFy2027EsCarryForward({
      fy2026,
      fy2027: { ...fy2027, code: "L02.232" },
      fy2026Es: { ...fy2026Es, preferredLabel: "Ántrax de espalda [cualquier parte, excepto la nalga]" },
    });
    expect(decision.eligible).toBe(false);
    expect(decision.bucket).toBe("DESCRIPTION_CHANGED");
  });

  it("rejects new FY2027 codes and missing Spanish", () => {
    expect(
      decideFy2027EsCarryForward({
        fy2027: { ...sameConcept, code: "J4B" },
        fy2026: null,
        fy2026Es,
      }).bucket,
    ).toBe("NEW_FY2027_CODE");
    expect(
      decideFy2027EsCarryForward({
        fy2026: sameConcept,
        fy2027: sameConcept,
        fy2026Es: null,
      }).bucket,
    ).toBe("MISSING_FY2026_SPANISH");
  });

  it("summarizes buckets without collapsing FY years", () => {
    const rows = [
      decideFy2027EsCarryForward({ fy2026: sameConcept, fy2027: sameConcept, fy2026Es }),
      decideFy2027EsCarryForward({
        fy2027: { ...sameConcept, code: "J4B", shortDescription: "Pulmonary mycetoma" },
        fy2026: null,
      }),
    ];
    expect(summarizeFy2027EsCarryForward(rows)).toMatchObject({
      TOTAL_FY2027_SELECTABLE: 2,
      CARRY_FORWARD_ELIGIBLE: 1,
      NEW_FY2027_CODE: 1,
    });
  });
});
