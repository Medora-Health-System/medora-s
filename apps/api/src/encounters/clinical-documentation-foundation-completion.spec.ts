/**
 * EDOC.23B — Foundation catalog completion legal coverage.
 */

import {
  assertClinicalDocumentationAuditMetadataSafe,
  buildClinicalDocumentationAuditMetadata,
  EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS,
  SCORE_ABUSE_CARD_ID,
  SCORE_CSSRS_CARD_ID,
  SCORE_HUMAN_TRAFFICKING_CARD_ID,
  SCORE_SDOH_CARD_ID,
  summarizeFoundationCatalogCompletionPayload,
} from "@medora/shared";
import {
  assertClinicalDocumentationLegalCoverage,
  assertHiddenCardExportStillWorks,
  makePrismaForEdocLegalCoverage,
} from "./clinical-documentation-legal-coverage.harness";
import {
  EDOC23B_FOUNDATION_COMPLETION_FIXTURES,
  EDOC23B_ISO,
} from "./clinical-documentation-legal-coverage.fixtures";
import { EncounterChartExportService } from "./chart-export.service";
import { renderEncounterChartExportHtml } from "./chart-export-html.util";

describe("Clinical documentation foundation completion (EDOC.23B)", () => {
  it.each(EDOC23B_FOUNDATION_COMPLETION_FIXTURES.map((f) => [f.cardId, f] as const))(
    "legal coverage — %s",
    async (_cardId, fixture) => {
      await assertClinicalDocumentationLegalCoverage({
        ...fixture,
        entryId: `edoc23b-${fixture.cardId}`,
      });
    }
  );

  it("covers all EDOC.23B card IDs", () => {
    expect(EDOC23B_FOUNDATION_COMPLETION_FIXTURES.map((f) => f.cardId).sort()).toEqual(
      [...EDOC23B_FOUNDATION_CATALOG_COMPLETION_CARD_IDS].sort()
    );
  });

  it.each([
    [SCORE_CSSRS_CARD_ID, "Risk level"],
    [SCORE_ABUSE_CARD_ID, "Screen performed"],
    [SCORE_HUMAN_TRAFFICKING_CARD_ID, "Screen performed"],
    [SCORE_SDOH_CARD_ID, "Need identified"],
  ] as const)("audit PHI safety — %s", (cardId, summaryKey) => {
    const fixture = EDOC23B_FOUNDATION_COMPLETION_FIXTURES.find((f) => f.cardId === cardId)!;
    const summary = summarizeFoundationCatalogCompletionPayload(cardId, fixture.payload, "en");
    expect(summary.some((l) => l.key === summaryKey)).toBe(true);
    expect(JSON.stringify(summary)).not.toContain("wishToBeDead");
    expect(JSON.stringify(summary)).not.toContain("physicalAbuseConcern");
    expect(JSON.stringify(summary)).not.toContain("unableToSpeakFreely");
    expect(JSON.stringify(summary)).not.toContain("foodInsecurity");
    const meta = buildClinicalDocumentationAuditMetadata({
      encounterId: "enc-1",
      patientId: "pat-1",
      entryId: "entry-1",
      category: "SCORES_AND_SCREENS",
      cardId,
      authorUserId: "user-1",
      authorRole: "RN",
      payloadKeyCount: Object.keys(fixture.payload).length,
      summaryLineCount: summary.length,
    });
    expect(() => assertClinicalDocumentationAuditMetadataSafe(meta as Record<string, unknown>)).not.toThrow();
  });

  it("hidden superseded flow_thrombolytic_stroke still resolves for legacy export", async () => {
    const payload = {
      administrationTime: EDOC23B_ISO,
      notes: "legacy stroke thrombolytic flow",
    };
    assertHiddenCardExportStillWorks("flow_thrombolytic_stroke", payload);

    const prisma = makePrismaForEdocLegalCoverage({
      clinicalDocumentationEntries: [
        {
          id: "edoc23b-legacy-stroke-thrombolytic",
          encounterId: "enc-1",
          category: "FLOWSHEETS",
          cardId: "flow_thrombolytic_stroke",
          authorUserId: "u1",
          authorDisplayNameSnapshot: "Jane Nurse",
          authorRoleSnapshot: "RN",
          createdAt: new Date(EDOC23B_ISO),
          payloadJson: payload,
          voidedAt: null,
          requiresWitnessSignature: false,
          witnessedAt: null,
          witnessedByUserId: null,
          witnessDisplayNameSnapshot: null,
          witnessRoleSnapshot: null,
        },
      ],
    });
    const manifest = await new EncounterChartExportService(
      prisma as never,
      { log: jest.fn() } as never,
      {
        getUnifiedTimeline: jest.fn().mockResolvedValue({
          capped: false,
          items: [],
          totalBeforeDedupe: 0,
          totalAfterDedupe: 0,
        }),
      } as never
    ).getManifest("facility-A", "enc-1");
    expect(manifest.encounter.clinicalDocumentationEntries[0]?.cardId).toBe(
      "flow_thrombolytic_stroke"
    );
    const html = renderEncounterChartExportHtml(manifest);
    expect(html).toContain("FLOWSHEETS");
  });
});
