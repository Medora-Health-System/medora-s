import { randomUUID } from "node:crypto";
import {
  ICD10_CM_CODE_SYSTEM,
  ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE,
  ICD10_SOURCE_PRIORITY,
  type Icd10TerminologyDisplayRow,
} from "@medora/shared";
import {
  createInMemoryIcd10EffectiveRecomputeStore,
  recomputeIcd10EffectiveClinicianLabels,
  type Icd10EffectiveRecomputeRow,
} from "./icd10-terminology-effective";

const SCALE_IDENTITIES = 2500;
const RECOMPUTE_BATCH = ICD10_EFFECTIVE_RECOMPUTE_DEFAULT_BATCH_SIZE;

function term(partial: Partial<Icd10EffectiveRecomputeRow> & Pick<Icd10TerminologyDisplayRow, "code" | "locale" | "preferredLabel" | "provenance" | "sourceId">): Icd10EffectiveRecomputeRow {
  return {
    id: partial.id ?? randomUUID(),
    codeSystem: partial.codeSystem ?? ICD10_CM_CODE_SYSTEM,
    releaseVersion: partial.releaseVersion ?? "FY2026",
    code: partial.code,
    locale: partial.locale,
    preferredLabel: partial.preferredLabel,
    labelRegister: "CLINICIAN_PREFERRED",
    provenance: partial.provenance,
    exactness: partial.provenance === "MEDORA_GOVERNED" ? "EXACT_GOVERNED" : "EXACT_SOURCE",
    status: partial.status ?? "APPROVED",
    sourceId: partial.sourceId,
    terminologyVersion: partial.terminologyVersion ?? "V1",
    sourcePriority: partial.sourcePriority ?? ICD10_SOURCE_PRIORITY[partial.provenance],
    isEffective: partial.isEffective ?? false,
  };
}

describe("P3-F.2A batched effective recompute", () => {
  it("preserves governed > vendor > official across 2500 identities with bounded DB ops", async () => {
    const seed: Icd10EffectiveRecomputeRow[] = [];
    const identities = [];
    for (let i = 0; i < SCALE_IDENTITIES; i += 1) {
      const code = `X${i}`;
      identities.push({
        codeSystem: ICD10_CM_CODE_SYSTEM,
        releaseVersion: "FY2026",
        code,
        locale: "fr" as const,
      });
      seed.push(
        term({
          code,
          locale: "fr",
          preferredLabel: `TEST_SYNTHETIC_OFFICIAL_${i}`,
          provenance: "OFFICIAL_SOURCE",
          sourceId: "CDC",
          isEffective: true,
        }),
        term({
          code,
          locale: "fr",
          preferredLabel: `TEST_SYNTHETIC_VENDOR_${i}`,
          provenance: "LICENSED_VENDOR",
          sourceId: "TEST_P3F2_SYNTHETIC",
        }),
        term({
          code,
          locale: "fr",
          preferredLabel: `TEST_SYNTHETIC_GOVERNED_${i}`,
          provenance: "MEDORA_GOVERNED",
          sourceId: "MEDORA_DX_GOVERNED",
        }),
      );
    }
    const { store, rows } = createInMemoryIcd10EffectiveRecomputeStore(seed);
    const stats = await recomputeIcd10EffectiveClinicianLabels({} as never, identities, {
      batchSize: RECOMPUTE_BATCH,
      store,
    });
    expect(stats.identityCount).toBe(SCALE_IDENTITIES);
    expect(stats.batchSize).toBe(250);
    expect(stats.batchCount).toBe(10);
    expect(stats.selectOperations).toBe(10);
    expect(stats.clearOperations).toBe(10);
    expect(stats.setOperations).toBe(10);
    expect(stats.winnerCount).toBe(SCALE_IDENTITIES);
    const effective = [...rows.values()].filter((row) => row.isEffective === true);
    expect(effective).toHaveLength(SCALE_IDENTITIES);
    expect(effective.every((row) => row.provenance === "MEDORA_GOVERNED")).toBe(true);
    console.log(
      [
        `RECOMPUTE_TEST_IDENTITIES=${SCALE_IDENTITIES}`,
        `RECOMPUTE_BATCH_SIZE=${stats.batchSize}`,
        `RECOMPUTE_BATCH_COUNT=${stats.batchCount}`,
        `RECOMPUTE_SELECT_OPERATIONS=${stats.selectOperations}`,
        `RECOMPUTE_CLEAR_OPERATIONS=${stats.clearOperations}`,
        `RECOMPUTE_SET_OPERATIONS=${stats.setOperations}`,
        `RECOMPUTE_TOTAL_DB_OPERATIONS_APPROX=${stats.selectOperations + stats.clearOperations + stats.setOperations}`,
        `PROJECTED_IDENTITIES_149438=149438`,
        `PROJECTED_BATCH_COUNT=${Math.ceil(149438 / 250)}`,
        `PROJECTED_DB_OPERATION_CLASS=${Math.ceil(149438 / 250) * 3} (select+clear+set per batch; not production runtime)`,
      ].join("\n"),
    );
  });

  it("resumes after a failed recompute batch without duplicate effective winners", async () => {
    const identities = Array.from({ length: 20 }, (_, i) => ({
      codeSystem: ICD10_CM_CODE_SYSTEM,
      releaseVersion: "FY2026",
      code: `X${i}`,
      locale: "es" as const,
    }));
    const seed = identities.map((identity) =>
      term({
        code: identity.code,
        locale: "es",
        preferredLabel: `TEST_SYNTHETIC_ES_${identity.code}`,
        provenance: "LICENSED_VENDOR",
        sourceId: "TEST_P3F2_SYNTHETIC",
      }),
    );
    const { store, rows } = createInMemoryIcd10EffectiveRecomputeStore(seed);
    let findCalls = 0;
    const failingStore = {
      findClinicianPreferred: async (filter: Parameters<typeof store.findClinicianPreferred>[0]) => {
        findCalls += 1;
        if (findCalls === 2) throw new Error("injected recompute failure");
        return store.findClinicianPreferred(filter);
      },
      clearEffective: store.clearEffective,
      setEffective: store.setEffective,
    };
    await expect(
      recomputeIcd10EffectiveClinicianLabels({} as never, identities, {
        batchSize: 10,
        store: failingStore,
      }),
    ).rejects.toThrow(/EFFECTIVE_RECOMPUTE_BATCH_2_FAILED/);
    const afterFail = [...rows.values()].filter((row) => row.isEffective).length;
    expect(afterFail).toBe(10);
    await recomputeIcd10EffectiveClinicianLabels({} as never, identities, { batchSize: 10, store });
    const effective = [...rows.values()].filter((row) => row.isEffective);
    expect(effective).toHaveLength(20);
    expect(new Set(effective.map((row) => `${row.code}|${row.locale}`)).size).toBe(20);
  });

  it("does not mix FY2025 and FY2026 or FR and ES when clearing", async () => {
    const fr2026 = term({
      code: "R10.85",
      locale: "fr",
      preferredLabel: "FR2026",
      provenance: "LICENSED_VENDOR",
      sourceId: "V",
      isEffective: true,
    });
    const es2026 = term({
      code: "R10.85",
      locale: "es",
      preferredLabel: "ES2026",
      provenance: "LICENSED_VENDOR",
      sourceId: "V",
      isEffective: true,
    });
    const fr2025 = term({
      code: "R10.85",
      locale: "fr",
      preferredLabel: "FR2025",
      provenance: "LICENSED_VENDOR",
      sourceId: "V",
      releaseVersion: "FY2025",
      isEffective: true,
    });
    const { store, rows } = createInMemoryIcd10EffectiveRecomputeStore([fr2026, es2026, fr2025]);
    await recomputeIcd10EffectiveClinicianLabels(
      {} as never,
      [{ codeSystem: ICD10_CM_CODE_SYSTEM, releaseVersion: "FY2026", code: "R10.85", locale: "fr" }],
      { store },
    );
    expect(rows.get(fr2026.id)?.isEffective).toBe(true);
    expect(rows.get(es2026.id)?.isEffective).toBe(true);
    expect(rows.get(fr2025.id)?.isEffective).toBe(true);
  });
});
