/**
 * EDOC.TEST.1 — High-risk clinical documentation legal coverage expansion.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
  EDOC_BASIC_STRUCTURED_CARD_ID,
  ensureClinicalDocumentationLegalDisplaySummary,
  HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
  HIGH_ALERT_MEDICATION_TYPE_VALUES,
} from "@medora/shared";
import {
  assertClinicalDocumentationLegalCoverage,
  assertHiddenCardExportStillWorks,
  assertRoiConsumesChartExportManifest,
} from "./clinical-documentation-legal-coverage.harness";
import {
  EDOC_TEST1_BLOOD_PRODUCT_FIXTURES,
  EDOC_TEST1_DEVICE_FIXTURES,
  EDOC_TEST1_HIGH_ALERT_FIXTURES,
  EDOC_TEST1_ISO,
  EDOC_TEST1_RESTRAINT_FIXTURES,
  EDOC_TEST1_SEDATION_FIXTURES,
  EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS,
  EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS,
  EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS,
  EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS,
  EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS,
} from "./clinical-documentation-legal-coverage.fixtures";
import { renderEncounterChartExportHtml } from "./chart-export-html.util";
import { EncounterChartExportService } from "./chart-export.service";
import { makePrismaForEdocLegalCoverage } from "./clinical-documentation-legal-coverage.harness";

describe("Clinical documentation legal coverage (EDOC.TEST.1)", () => {
  describe("Part G — universal legal record harness", () => {
    it("assertClinicalDocumentationLegalCoverage helper works for basic structured card", async () => {
      await assertClinicalDocumentationLegalCoverage({
        cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
        category: "OBSERVATION_DOCUMENTATION",
        payload: {
          items: [
            { key: "Pain", value: "2/10" },
            { key: "Mobility", value: "Ambulatory" },
          ],
        },
        summaryEnKeys: ["Pain"],
        htmlContains: ["OBSERVATION_DOCUMENTATION", "2/10"],
        entryId: "edoc-test1-basic",
      });
    });

    it("export invariant — saved entry appears in manifest JSON and HTML", async () => {
      const payload = { customField: "export-invariant-value", note: "saved" };
      const prisma = makePrismaForEdocLegalCoverage({
        clinicalDocumentationEntries: [
          {
            id: "edoc-hidden-export",
            encounterId: "enc-1",
            category: "OBSERVATION_DOCUMENTATION",
            cardId: "legacy_hidden_card_xyz",
            authorUserId: "u1",
            authorDisplayNameSnapshot: "Jane Nurse",
            authorRoleSnapshot: "RN",
            createdAt: new Date(EDOC_TEST1_ISO),
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
      expect(manifest.encounter.clinicalDocumentationEntries[0]?.payloadJson).toEqual(payload);
      const html = renderEncounterChartExportHtml(manifest);
      expect(html).toContain("Structured payload saved");
    });

    it("ROI path unchanged — consumes chart export snapshots", () => {
      assertRoiConsumesChartExportManifest();
    });
  });

  describe("Part B — blood products (EDOC.7)", () => {
    it.each(EDOC_TEST1_BLOOD_PRODUCT_FIXTURES.map((f) => [f.cardId, f] as const))(
      "legal coverage — %s",
      async (_cardId, fixture) => {
        await assertClinicalDocumentationLegalCoverage({
          ...fixture,
          entryId: `edoc-test1-blood-${fixture.cardId}`,
          witnessForExport:
            fixture.cardId === BLOOD_PRODUCT_VERIFICATION_CARD_ID
              ? {
                  requiresWitnessSignature: true,
                  witnessedAt: new Date("2026-05-28T13:00:00.000Z"),
                  witnessDisplayNameSnapshot: "Paul Witness",
                  witnessRoleSnapshot: "RN",
                }
              : undefined,
        });
      }
    );

    it("covers all EDOC.7 card IDs", () => {
      expect(EDOC_TEST1_BLOOD_PRODUCT_FIXTURES.map((f) => f.cardId).sort()).toEqual(
        [...EDOC7_BLOOD_PRODUCT_DOCUMENTATION_CARD_IDS].sort()
      );
    });
  });

  describe("Part C — high-alert infusions (EDOC.8)", () => {
    it.each(EDOC_TEST1_HIGH_ALERT_FIXTURES.map((f) => [f.cardId, f] as const))(
      "legal coverage — %s",
      async (_cardId, fixture) => {
        await assertClinicalDocumentationLegalCoverage({
          ...fixture,
          entryId: `edoc-test1-infusion-${fixture.cardId}`,
        });
      }
    );

    it.each(HIGH_ALERT_MEDICATION_TYPE_VALUES.map((type) => [type] as const))(
      "medication class %s survives export path",
      async (medicationType) => {
        await assertClinicalDocumentationLegalCoverage({
          cardId: HIGH_ALERT_INFUSION_VERIFICATION_CARD_ID,
          category: "HIGH_ALERT_INFUSION_DOCUMENTATION",
          payload: {
            verificationTime: EDOC_TEST1_ISO,
            medicationType,
            medicationName: `${medicationType} test`,
            concentration: "1:1",
            orderedRate: "1",
            orderedDose: "1",
            weightBasedCalculationVerified: true,
            pumpProgrammingVerified: true,
            lineTracingVerified: true,
            patientVerified: true,
            providerOrderVerified: true,
            independentDoubleCheckPerformed: true,
          },
          summaryEnKeys: ["Medication"],
          htmlContains: [medicationType, "HIGH_ALERT_INFUSION_DOCUMENTATION"],
          entryId: `edoc-test1-infusion-type-${medicationType}`,
        });
      }
    );

    it("covers all EDOC.8 card IDs", () => {
      expect(EDOC_TEST1_HIGH_ALERT_FIXTURES.map((f) => f.cardId).sort()).toEqual(
        [...EDOC8_HIGH_ALERT_INFUSION_DOCUMENTATION_CARD_IDS].sort()
      );
    });
  });

  describe("Part D — restraints (EDOC.6)", () => {
    it.each(EDOC_TEST1_RESTRAINT_FIXTURES.map((f) => [f.cardId, f] as const))(
      "legal coverage — %s",
      async (_cardId, fixture) => {
        await assertClinicalDocumentationLegalCoverage({
          ...fixture,
          entryId: `edoc-test1-restraint-${fixture.cardId}`,
        });
      }
    );

    it("covers all EDOC.6 card IDs", () => {
      expect(EDOC_TEST1_RESTRAINT_FIXTURES.map((f) => f.cardId).sort()).toEqual(
        [...EDOC6_RESTRAINT_DOCUMENTATION_CARD_IDS].sort()
      );
    });
  });

  describe("Part E — procedural sedation (EDOC.10)", () => {
    it.each(EDOC_TEST1_SEDATION_FIXTURES.map((f) => [f.cardId, f] as const))(
      "legal coverage — %s",
      async (_cardId, fixture) => {
        await assertClinicalDocumentationLegalCoverage({
          ...fixture,
          entryId: `edoc-test1-sedation-${fixture.cardId}`,
        });
      }
    );

    it("covers all EDOC.10 card IDs", () => {
      expect(EDOC_TEST1_SEDATION_FIXTURES.map((f) => f.cardId).sort()).toEqual(
        [...EDOC10_PROCEDURAL_SEDATION_DOCUMENTATION_CARD_IDS].sort()
      );
    });
  });

  describe("Part F — device / line / tube / drain (EDOC.17)", () => {
    it.each(EDOC_TEST1_DEVICE_FIXTURES.map((f) => [f.cardId, f] as const))(
      "legal coverage — %s",
      async (_cardId, fixture) => {
        await assertClinicalDocumentationLegalCoverage({
          ...fixture,
          entryId: `edoc-test1-device-${fixture.cardId}`,
        });
      }
    );

    it("covers all EDOC.17 card IDs", () => {
      expect(EDOC_TEST1_DEVICE_FIXTURES.map((f) => f.cardId).sort()).toEqual(
        [...EDOC17_DEVICE_LINE_TUBE_DRAIN_MONITORING_CARD_IDS].sort()
      );
    });
  });

  describe("Part I/H — regression + audit safety", () => {
    it("EDOC.LEGAL.1 fallback still works for unknown card", () => {
      const lines = ensureClinicalDocumentationLegalDisplaySummary(
        "legacy_hidden_card_xyz",
        { customField: "value" },
        "en"
      );
      expect(lines.length).toBeGreaterThan(0);
      assertHiddenCardExportStillWorks("legacy_hidden_card_xyz", { customField: "value" });
    });

    it("clinical documentation save path unchanged", () => {
      const serviceSource = readFileSync(
        join(__dirname, "clinical-documentation.service.ts"),
        "utf8"
      );
      expect(serviceSource).toMatch(/async createEntry\(/);
      expect(serviceSource).toMatch(/EncounterClinicalDocumentationEntry/);
      expect(serviceSource).toMatch(/buildClinicalDocumentationAuditMetadata/);
      expect(serviceSource).toMatch(/assertClinicalDocumentationAuditMetadataSafe/);
    });

    it("chart export service still maps clinical documentation entries", () => {
      const exportSource = readFileSync(join(__dirname, "chart-export.service.ts"), "utf8");
      expect(exportSource).toContain("mapClinicalDocumentationEntryForLegalChart");
      expect(exportSource).toContain("clinicalDocumentationEntries");
    });
  });
});
