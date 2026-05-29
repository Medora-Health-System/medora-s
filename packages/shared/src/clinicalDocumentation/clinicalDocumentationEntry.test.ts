import { describe, expect, it } from "vitest";
import {
  CLINICAL_DOCUMENTATION_PAYLOAD_MAX_BYTES,
  EDOC_BASIC_STRUCTURED_CARD_ID,
  assertClinicalDocumentationAuditMetadataSafe,
  assertClinicalDocumentationEntryCreateAllowed,
  buildClinicalDocumentationAuditMetadata,
  buildClinicalDocumentationWitnessAuditMetadata,
  clinicalDocumentationEntryCreateDtoSchema,
  mapClinicalDocumentationEntryForLegalChart,
  resolveClinicalDocumentationEntryTitles,
} from "./clinicalDocumentationEntry.js";

describe("clinicalDocumentationEntry (EDOC.2)", () => {
  const validBasic = {
    category: "OBSERVATION_DOCUMENTATION" as const,
    cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
    payloadJson: { items: [{ key: "Pain", value: "2/10" }] },
  };

  it("validates registry card in create DTO", () => {
    const parsed = clinicalDocumentationEntryCreateDtoSchema.parse(validBasic);
    expect(() => assertClinicalDocumentationEntryCreateAllowed(parsed)).not.toThrow();
  });

  it("rejects unknown cardId", () => {
    const parsed = clinicalDocumentationEntryCreateDtoSchema.parse({
      ...validBasic,
      cardId: "not_a_real_card",
    });
    expect(() => assertClinicalDocumentationEntryCreateAllowed(parsed)).toThrow(/Unknown/);
  });

  it("rejects category/card mismatch", () => {
    const parsed = clinicalDocumentationEntryCreateDtoSchema.parse({
      category: "FLOWSHEETS",
      cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
      payloadJson: validBasic.payloadJson,
    });
    expect(() => assertClinicalDocumentationEntryCreateAllowed(parsed)).toThrow(/Category/);
  });

  it("requires payload object", () => {
    expect(() =>
      clinicalDocumentationEntryCreateDtoSchema.parse({
        ...validBasic,
        payloadJson: "text",
      })
    ).toThrow();
  });

  it("enforces payload size limit", () => {
    const huge = "x".repeat(CLINICAL_DOCUMENTATION_PAYLOAD_MAX_BYTES + 1);
    const parsed = clinicalDocumentationEntryCreateDtoSchema.parse({
      ...validBasic,
      payloadJson: { items: [{ key: "note", value: huge }] },
    });
    expect(() => assertClinicalDocumentationEntryCreateAllowed(parsed)).toThrow(/maximum size/);
  });

  it("resolves response titles from registry", () => {
    const titles = resolveClinicalDocumentationEntryTitles(EDOC_BASIC_STRUCTURED_CARD_ID);
    expect(titles.cardTitleEn.length).toBeGreaterThan(0);
    expect(titles.cardTitleFr.length).toBeGreaterThan(0);
    const mapped = mapClinicalDocumentationEntryForLegalChart({
      id: "e1",
      encounterId: "enc1",
      category: validBasic.category,
      cardId: validBasic.cardId,
      authorUserId: "u1",
      authorDisplayNameSnapshot: "Jane",
      authorRoleSnapshot: "RN",
      createdAt: "2026-05-28T12:00:00.000Z",
      payloadJson: validBasic.payloadJson,
      voidedAt: null,
    });
    expect(mapped.cardTitleEn).toBe(titles.cardTitleEn);
    expect(mapped.payloadSummary).toEqual([{ key: "Pain", value: "2/10" }]);
  });

  it("audit metadata uses allowlist only", () => {
    const createMeta = buildClinicalDocumentationAuditMetadata({
      entryId: "entry1",
      encounterId: "enc1",
      patientId: "pat1",
      category: validBasic.category,
      cardId: validBasic.cardId,
      authorUserId: "u1",
      authorRole: "RN",
      payloadKeyCount: 1,
    });
    expect(Object.keys(createMeta).sort()).toEqual(
      [
        "encounterId",
        "patientId",
        "entryId",
        "category",
        "cardId",
        "authorUserId",
        "authorRole",
        "payloadKeyCount",
      ].sort()
    );
    expect(() =>
      assertClinicalDocumentationAuditMetadataSafe(createMeta as Record<string, unknown>)
    ).not.toThrow();

    const witnessMeta = buildClinicalDocumentationWitnessAuditMetadata({
      entryId: "entry1",
      encounterId: "enc1",
      patientId: "pat1",
      category: validBasic.category,
      cardId: validBasic.cardId,
      authorUserId: "u1",
      authorRole: "RN",
      witnessUserId: "u2",
      witnessRole: "RN",
    });
    expect(() =>
      assertClinicalDocumentationAuditMetadataSafe(witnessMeta as Record<string, unknown>)
    ).not.toThrow();
    expect(() =>
      assertClinicalDocumentationAuditMetadataSafe({ ...createMeta, payloadJson: {} } as Record<string, unknown>)
    ).toThrow(/Forbidden/);
  });
});
