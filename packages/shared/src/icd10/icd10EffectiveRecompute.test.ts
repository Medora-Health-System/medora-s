import { describe, expect, it } from "vitest";
import { pickRankedEligibleClinicianLabel } from "./icd10DisplayResolver.js";
import {
  chunkIcd10EffectiveIdentityGroups,
  ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE,
  icd10EffectiveIdentityKey,
  planIcd10EffectiveClinicianWinners,
} from "./icd10EffectiveRecompute.js";
import type { Icd10TerminologyDisplayRow } from "./icd10TerminologyTypes.js";
import {
  ICD10_CM_CODE_SYSTEM,
  ICD10_GOVERNED_SOURCE_ID,
  ICD10_SOURCE_PRIORITY,
} from "./icd10TerminologyTypes.js";

const SYSTEM = ICD10_CM_CODE_SYSTEM;

function row(
  extras: Partial<Icd10TerminologyDisplayRow> & Pick<Icd10TerminologyDisplayRow, "code" | "locale" | "preferredLabel">,
): Icd10TerminologyDisplayRow {
  return {
    id: extras.id ?? `${extras.code}-${extras.locale}-${extras.provenance ?? "MEDORA_GOVERNED"}-${extras.sourceId ?? "g"}`,
    codeSystem: extras.codeSystem ?? SYSTEM,
    releaseVersion: extras.releaseVersion ?? "FY2026",
    code: extras.code,
    locale: extras.locale,
    preferredLabel: extras.preferredLabel,
    labelRegister: extras.labelRegister ?? "CLINICIAN_PREFERRED",
    provenance: extras.provenance ?? "MEDORA_GOVERNED",
    exactness: extras.exactness ?? "EXACT_GOVERNED",
    status: extras.status ?? "APPROVED",
    sourceId: extras.sourceId ?? ICD10_GOVERNED_SOURCE_ID,
    terminologyVersion: extras.terminologyVersion ?? "V1",
    sourcePriority: extras.sourcePriority ?? ICD10_SOURCE_PRIORITY.MEDORA_GOVERNED,
    isEffective: extras.isEffective,
  };
}

function assertSameWinner(rows: Icd10TerminologyDisplayRow[]) {
  const canonical = pickRankedEligibleClinicianLabel(rows);
  const planned = planIcd10EffectiveClinicianWinners(rows).get(icd10EffectiveIdentityKey(rows[0]!));
  expect(planned?.id ?? null).toBe(canonical?.id ?? null);
  expect(planned?.preferredLabel ?? null).toBe(canonical?.preferredLabel ?? null);
  expect(planned?.provenance ?? null).toBe(canonical?.provenance ?? null);
  expect(planned?.sourceId ?? null).toBe(canonical?.sourceId ?? null);
  expect(planned?.terminologyVersion ?? null).toBe(canonical?.terminologyVersion ?? null);
}

describe("P3-F.2A batched effective-winner planning parity", () => {
  it("selects MEDORA_GOVERNED over LICENSED_VENDOR over OFFICIAL_SOURCE", () => {
    const governed = row({ code: "R10.85", locale: "fr", preferredLabel: "G" });
    const vendor = row({
      code: "R10.85",
      locale: "fr",
      preferredLabel: "V",
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "VENDOR_A",
      sourcePriority: ICD10_SOURCE_PRIORITY.LICENSED_VENDOR,
    });
    const official = row({
      code: "R10.85",
      locale: "fr",
      preferredLabel: "O",
      provenance: "OFFICIAL_SOURCE",
      exactness: "EXACT_SOURCE",
      sourceId: "CDC",
      sourcePriority: ICD10_SOURCE_PRIORITY.OFFICIAL_SOURCE,
    });
    assertSameWinner([official, vendor, governed]);
    expect(pickRankedEligibleClinicianLabel([official, vendor, governed])?.provenance).toBe("MEDORA_GOVERNED");
    assertSameWinner([official, vendor]);
    expect(pickRankedEligibleClinicianLabel([official, vendor])?.provenance).toBe("LICENSED_VENDOR");
    assertSameWinner([official]);
  });

  it("uses sourcePriority then sourceId within the same provenance", () => {
    const high = row({
      code: "R10.85",
      locale: "es",
      preferredLabel: "high",
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "IMO_A",
      sourcePriority: 40,
    });
    const low = row({
      code: "R10.85",
      locale: "es",
      preferredLabel: "low",
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "OTHER_B",
      sourcePriority: 60,
    });
    assertSameWinner([low, high]);
    expect(pickRankedEligibleClinicianLabel([low, high])?.sourceId).toBe("IMO_A");
  });

  it("ignores PENDING_REVIEW, REJECTED, and SUPERSEDED rows", () => {
    const vendor = row({
      code: "R10.85",
      locale: "fr",
      preferredLabel: "vendor",
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "V",
      sourcePriority: 50,
    });
    for (const status of ["PENDING_REVIEW", "REJECTED", "SUPERSEDED"] as const) {
      const governed = row({
        code: "R10.85",
        locale: "fr",
        preferredLabel: "governed",
        status,
      });
      assertSameWinner([governed, vendor]);
      expect(pickRankedEligibleClinicianLabel([governed, vendor])?.sourceId).toBe("V");
    }
  });

  it("ranks same-source versions by sourcePriority, not terminologyVersion text", () => {
    const v1 = row({
      code: "R10.85",
      locale: "es",
      preferredLabel: "2026.1",
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "TEST_VENDOR",
      terminologyVersion: "2026.1",
      sourcePriority: 50,
    });
    const v2 = row({
      code: "R10.85",
      locale: "es",
      preferredLabel: "2026.2",
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "TEST_VENDOR",
      terminologyVersion: "2026.2",
      sourcePriority: 40,
    });
    assertSameWinner([v1, v2]);
    expect(pickRankedEligibleClinicianLabel([v1, v2])?.terminologyVersion).toBe("2026.2");
  });

  it("isolates FR vs ES and FY2025 vs FY2026 identities", () => {
    const fr = row({ code: "R10.85", locale: "fr", preferredLabel: "FR" });
    const es = row({
      code: "R10.85",
      locale: "es",
      preferredLabel: "ES vendor",
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "V",
      sourcePriority: 50,
    });
    const fy2025 = row({
      code: "R10.85",
      locale: "fr",
      preferredLabel: "old",
      releaseVersion: "FY2025",
      provenance: "LICENSED_VENDOR",
      exactness: "EXACT_SOURCE",
      sourceId: "V",
      sourcePriority: 50,
    });
    const planned = planIcd10EffectiveClinicianWinners([fr, es, fy2025]);
    expect(planned.get(icd10EffectiveIdentityKey(fr))?.preferredLabel).toBe("FR");
    expect(planned.get(icd10EffectiveIdentityKey(es))?.preferredLabel).toBe("ES vendor");
    expect(planned.get(icd10EffectiveIdentityKey(fy2025))?.preferredLabel).toBe("old");
    expect(planned.size).toBe(3);
  });

  it("chunks identities by locale/release without mixing them", () => {
    const identities = [
      { codeSystem: SYSTEM, releaseVersion: "FY2026", code: "A", locale: "fr" },
      { codeSystem: SYSTEM, releaseVersion: "FY2026", code: "B", locale: "fr" },
      { codeSystem: SYSTEM, releaseVersion: "FY2026", code: "A", locale: "es" },
      { codeSystem: SYSTEM, releaseVersion: "FY2025", code: "A", locale: "fr" },
    ];
    const batches = chunkIcd10EffectiveIdentityGroups(identities, 250);
    expect(batches).toHaveLength(3);
    expect(batches.every((batch) => new Set([batch.locale]).size === 1)).toBe(true);
    expect(ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE).toBe(250);
    expect(chunkIcd10EffectiveIdentityGroups(
      Array.from({ length: 2500 }, (_, i) => ({
        codeSystem: SYSTEM,
        releaseVersion: "FY2026",
        code: `X${i}`,
        locale: "fr",
      })),
      250,
    )).toHaveLength(10);
  });
});
