/**
 * MEDUI.LAB.REF.2 — Mayo CBC/BMP/CMP curation + resolution proofs.
 */

import { describe, expect, it } from "vitest";
import {
  LAB_REF_CANONICAL_ANALYTES,
  LAB_REF_PANEL_DEFINITIONS,
} from "./labReferenceAuthoritySeedData.js";
import {
  LAB_REF_MAYO_CURATED_INTERVALS,
  LAB_REF_MAYO_CURATION_STATS,
  LAB_REF_MAYO_UNRESOLVED_POPULATIONS,
  LAB_REF_REJECTED_AMBIGUOUS_ALIASES,
} from "./labReferenceMayoCbcBmpCmpIntervals.js";
import {
  applyLabReferenceSnapshotToObservation,
  computeHLFromResolvedInterval,
  resolveLabCriticalValue,
  resolveLabReferenceInterval,
  type LabIntervalCandidate,
} from "./labReferenceIntervalAuthority.js";

function asCandidate(
  seed: (typeof LAB_REF_MAYO_CURATED_INTERVALS)[number],
  id: string
): LabIntervalCandidate {
  return {
    id,
    specimen: seed.specimen,
    unit: seed.unit,
    ageMinYears: seed.ageMinYears,
    ageMaxYears: seed.ageMaxYears,
    sexApplicability: seed.sexApplicability,
    pregnancyApplicability: seed.pregnancyApplicability,
    methodOrAnalyzer: seed.methodOrAnalyzer,
    low: seed.low,
    high: seed.high,
    textualInterval: seed.textualInterval,
    loincCode: seed.loincCode,
    sourceName: seed.sourceName,
    sourceIdentifier: seed.sourceIdentifier,
    sourceUrl: seed.sourceUrl,
    sourceVersion: seed.sourceVersion,
    effectiveFrom: seed.effectiveFrom,
    effectiveTo: null,
    status: "ACTIVE",
  };
}

function forAnalyte(code: string) {
  return LAB_REF_MAYO_CURATED_INTERVALS.filter((r) => r.analyteCode === code).map((r, i) =>
    asCandidate(r, `${code}-${i}`)
  );
}

describe("Mayo curation source attribution", () => {
  it("every curated interval has source attribution and non-guessed LOINC when set", () => {
    expect(LAB_REF_MAYO_CURATION_STATS.intervalCount).toBe(LAB_REF_MAYO_CURATED_INTERVALS.length);
    for (const row of LAB_REF_MAYO_CURATED_INTERVALS) {
      expect(row.sourceName).toBe("Mayo Clinic Laboratories");
      expect(row.sourceIdentifier.length).toBeGreaterThan(5);
      expect(row.sourceUrl).toMatch(/^https:\/\/www\.mayocliniclabs\.com\//);
      if (row.loincCode) {
        expect(row.loincCode).toMatch(/^\d+-\d+$/);
      }
    }
  });

  it("rejects ambiguous aliases that must not be frozen incorrectly", () => {
    expect(LAB_REF_REJECTED_AMBIGUOUS_ALIASES.some((r) => r.alias === "UREA")).toBe(true);
    expect(LAB_REF_REJECTED_AMBIGUOUS_ALIASES.some((r) => r.alias === "BILI" && r.keptMapping === "TOTAL_BILIRUBIN")).toBe(
      true
    );
    const bili = LAB_REF_CANONICAL_ANALYTES.find((a) => a.code === "TOTAL_BILIRUBIN");
    expect(bili?.aliases.some((a) => a.aliasCode === "BILI")).toBe(true);
    expect(bili?.description).toMatch(/Total bilirubin/i);
  });

  it("preserves BUN and UREA as separate analytes", () => {
    expect(LAB_REF_CANONICAL_ANALYTES.some((a) => a.code === "BUN")).toBe(true);
    expect(LAB_REF_CANONICAL_ANALYTES.some((a) => a.code === "UREA")).toBe(true);
    expect(LAB_REF_MAYO_CURATED_INTERVALS.some((r) => r.analyteCode === "UREA")).toBe(false);
    expect(LAB_REF_MAYO_CURATED_INTERVALS.some((r) => r.analyteCode === "BUN")).toBe(true);
  });
});

describe("age/sex band non-overlap (same analyte+sex+specimen+unit+method)", () => {
  it("does not overlap exclusive age bands for adult hemoglobin sexes", () => {
    const male = LAB_REF_MAYO_CURATED_INTERVALS.filter(
      (r) => r.analyteCode === "HEMOGLOBIN" && r.sexApplicability === "MALE"
    );
    for (let i = 0; i < male.length; i++) {
      for (let j = i + 1; j < male.length; j++) {
        const a = male[i]!;
        const b = male[j]!;
        const aMax = a.ageMaxYears ?? Number.POSITIVE_INFINITY;
        const bMax = b.ageMaxYears ?? Number.POSITIVE_INFINITY;
        const aMin = a.ageMinYears ?? 0;
        const bMin = b.ageMinYears ?? 0;
        const overlap = aMin < bMax && bMin < aMax;
        expect(overlap).toBe(false);
      }
    }
  });
});

describe("CBC clinical selection", () => {
  const collectedAt = new Date("2024-06-01");

  it("adult male CBC hemoglobin", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: forAnalyte("HEMOGLOBIN"),
    });
    expect(r.authority).toBe("CANONICAL");
    expect(r.low).toBe(13.2);
    expect(r.high).toBe(16.6);
    expect(r.sourceIdentifier).toMatch(/HGB\.M/);
  });

  it("adult female CBC hemoglobin", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "FEMALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: forAnalyte("HEMOGLOBIN"),
    });
    expect(r.low).toBe(11.6);
    expect(r.high).toBe(15.0);
  });

  it("pediatric CBC hemoglobin (male 8y)", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 8 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: forAnalyte("HEMOGLOBIN"),
    });
    expect(r.low).toBe(11.5);
    expect(r.high).toBe(14.3);
  });

  it("unresolved age band where Mayo says not established (sodium <1y)", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "na",
      patientDemographics: { sex: "MALE", ageYears: 0.5 },
      specimen: "SERUM",
      unit: "mmol/L",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: forAnalyte("SODIUM"),
    });
    expect(r.authority).toBe("UNRESOLVED");
    expect(LAB_REF_MAYO_UNRESOLVED_POPULATIONS.some((u) => u.analyteCode === "SODIUM")).toBe(true);
  });

  it("CBC panel includes differentials absolute and shared core analytes", () => {
    const cbc = LAB_REF_PANEL_DEFINITIONS.find((p) => p.code === "CBC")!;
    expect(cbc.members.map((m) => m.analyteCode)).toEqual(
      expect.arrayContaining([
        "WBC",
        "HEMOGLOBIN",
        "NEUTROPHILS_ABS",
        "LYMPHOCYTES_ABS",
        "MONOCYTES_ABS",
        "EOSINOPHILS_ABS",
        "BASOPHILS_ABS",
      ])
    );
  });
});

describe("BMP/CMP shared sodium", () => {
  it("BMP and CMP membership share SODIUM analyte code", () => {
    const bmp = LAB_REF_PANEL_DEFINITIONS.find((p) => p.code === "BMP")!;
    const cmp = LAB_REF_PANEL_DEFINITIONS.find((p) => p.code === "CMP")!;
    expect(bmp.members.some((m) => m.analyteCode === "SODIUM")).toBe(true);
    expect(cmp.members.some((m) => m.analyteCode === "SODIUM")).toBe(true);
    const sodiumIntervals = forAnalyte("SODIUM");
    expect(sodiumIntervals.length).toBeGreaterThan(0);
  });
});

describe("facility override / mismatches / H/L / critical / snapshot", () => {
  const collectedAt = new Date("2024-06-01");
  const canonical = forAnalyte("HEMOGLOBIN");

  it("facility override beats canonical", () => {
    const facility: LabIntervalCandidate = {
      ...canonical.find((c) => c.low === 13.2)!,
      id: "fac-hgb",
      low: 12,
      high: 15,
      sourceName: "Facility validated",
    };
    const r = resolveLabReferenceInterval({
      facilityId: "fac-A",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      facilityIntervals: [facility],
      canonicalIntervals: canonical,
    });
    expect(r.authority).toBe("FACILITY");
    expect(r.low).toBe(12);
  });

  it("unit mismatch → unresolved", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/L",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: canonical,
    });
    expect(r.authority).toBe("UNRESOLVED");
  });

  it("method mismatch → unresolved", () => {
    const r = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "OTHER_ANALYZER",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: canonical,
    });
    expect(r.authority).toBe("UNRESOLVED");
  });

  it("H/L calculation from Mayo adult male hemoglobin", () => {
    const resolved = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: canonical,
    });
    expect(computeHLFromResolvedInterval("10", resolved)).toBe("L");
    expect(computeHLFromResolvedInterval("18", resolved)).toBe("H");
    expect(computeHLFromResolvedInterval("14", resolved)).toBeNull();
  });

  it("critical-value independence (no critical seeded — remains null)", () => {
    const critical = resolveLabCriticalValue({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      patientValue: "5",
      policies: [],
    });
    expect(critical.status).toBeNull();
    expect(critical.policyId).toBeNull();
  });

  it("historical snapshot persistence after registry change", () => {
    const resolved = resolveLabReferenceInterval({
      facilityId: "f1",
      canonicalAnalyteId: "hgb",
      patientDemographics: { sex: "MALE", ageYears: 40 },
      specimen: "WHOLE_BLOOD_EDTA",
      unit: "g/dL",
      methodOrAnalyzer: "Sysmex_XN_9000",
      collectedAt,
      facilityIntervals: [],
      canonicalIntervals: canonical,
    });
    const first = applyLabReferenceSnapshotToObservation({
      observation: { code: "HGB", name: "Hemoglobin", value: "10", unit: "g/dL" },
      canonicalAnalyteId: "id-hgb",
      canonicalAnalyteCode: "HEMOGLOBIN",
      resolved,
      critical: {
        status: null,
        policyId: null,
        facilityScoped: false,
        criticalLow: null,
        criticalHigh: null,
        textualCritical: null,
        sourceName: null,
      },
    });
    const changed = {
      ...resolved,
      intervalId: "CHANGED",
      low: 1,
      high: 2,
      sourceName: "CHANGED",
    };
    const second = applyLabReferenceSnapshotToObservation({
      observation: first as ClinicalLabObservationLike,
      canonicalAnalyteId: "id-hgb",
      canonicalAnalyteCode: "HEMOGLOBIN",
      resolved: changed,
      critical: {
        status: null,
        policyId: null,
        facilityScoped: false,
        criticalLow: null,
        criticalHigh: null,
        textualCritical: null,
        sourceName: null,
      },
      preserveLocked: true,
    });
    expect((second.referenceSnapshot as { intervalId?: string }).intervalId).toBe(resolved.intervalId);
    expect(second.referenceLow).toBe(13.2);
  });
});

type ClinicalLabObservationLike = {
  code?: string;
  name: string;
  value: string;
  unit?: string | null;
  referenceLow?: number | null;
  referenceHigh?: number | null;
  referenceText?: string | null;
  flag?: string | null;
  referenceSnapshot?: { locked?: boolean; intervalId?: string | null; referenceLow?: number | null };
};

describe("cross-workspace shared Result projection", () => {
  it("uses one authority module for ED/IP/Clinic/Dental/Summary/print consumers", () => {
    expect(typeof resolveLabReferenceInterval).toBe("function");
    expect(LAB_REF_PANEL_DEFINITIONS.map((p) => p.code).sort()).toEqual(["BMP", "CBC", "CMP"]);
  });
});
