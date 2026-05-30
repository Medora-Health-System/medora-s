import { describe, expect, it } from "vitest";
import {
  EDOC_BASIC_STRUCTURED_CARD_ID,
  buildClinicalDocumentationFallbackSummaryLines,
  ensureClinicalDocumentationLegalDisplaySummary,
} from "./clinicalDocumentationEntry.js";
import {
  BLOOD_PRODUCT_VERIFICATION_CARD_ID,
} from "./bloodProductDocumentationPayloads.js";
import { NG_OG_TUBE_MONITORING_CARD_ID } from "./deviceLineTubeDrainMonitoringDocumentationPayloads.js";
import {
  assertClinicalDocumentationAuditMetadataPhiSafe,
  assertClinicalDocumentationLegalExportInvariant,
  assertClinicalDocumentationPatientRecordSummaryVisible,
  assertClinicalDocumentationSummaryGenerated,
  buildAndAssertClinicalDocumentationCreateAuditMetadata,
  mapClinicalDocumentationEntryForLegalCoverageTest,
} from "./clinicalDocumentationLegalCoverageHarness.js";

const ISO = "2026-05-28T12:00:00.000Z";

describe("clinicalDocumentationLegalCoverageHarness (EDOC.TEST.1)", () => {
  it("assertClinicalDocumentationSummaryGenerated requires non-empty EN/FR lines", () => {
    const payload = {
      verificationTime: ISO,
      productType: "PRBC",
      unitIdentifier: "UNIT-1",
      unitVolumeMl: 250,
      patientIdentityVerified: true,
      bloodTypeVerified: true,
      crossmatchVerified: true,
      expirationVerified: true,
      consentVerified: true,
      specialRequirements: "NONE",
    };
    expect(() =>
      assertClinicalDocumentationSummaryGenerated(BLOOD_PRODUCT_VERIFICATION_CARD_ID, payload)
    ).not.toThrow();
  });

  it("assertClinicalDocumentationLegalExportInvariant enforces payload + summaries", () => {
    const mapped = mapClinicalDocumentationEntryForLegalCoverageTest({
      id: "edoc-1",
      encounterId: "enc-1",
      patientId: "pat-1",
      category: "DEVICE_LINE_TUBE_DRAIN_MONITORING",
      cardId: NG_OG_TUBE_MONITORING_CARD_ID,
      authorUserId: "u1",
      authorDisplayNameSnapshot: "Jane Nurse",
      authorRoleSnapshot: "RN",
      createdAt: ISO,
      payloadJson: {
        assessmentTime: ISO,
        tubeType: "NG",
        placementVerified: "YES",
        markingAtNares: "22 cm",
        suctionActive: "NO",
        drainagePresent: "YES",
        drainageAppearance: "CLEAR",
        providerNotified: "NO",
      },
    });
    expect(() => assertClinicalDocumentationLegalExportInvariant(mapped)).not.toThrow();
    assertClinicalDocumentationPatientRecordSummaryVisible(mapped, "en");
    assertClinicalDocumentationPatientRecordSummaryVisible(mapped, "fr");
    expect(mapped.patientId).toBe("pat-1");
  });

  it("buildAndAssertClinicalDocumentationCreateAuditMetadata is PHI-safe", () => {
    const meta = buildAndAssertClinicalDocumentationCreateAuditMetadata({
      encounterId: "enc-1",
      patientId: "pat-1",
      entryId: "edoc-1",
      category: "BLOOD_PRODUCT_DOCUMENTATION",
      cardId: BLOOD_PRODUCT_VERIFICATION_CARD_ID,
      authorUserId: "u1",
      authorRole: "RN",
      payload: {
        verificationTime: ISO,
        productType: "PRBC",
        unitIdentifier: "UNIT-SECRET",
        unitVolumeMl: 250,
        patientIdentityVerified: true,
        bloodTypeVerified: true,
        crossmatchVerified: true,
        expirationVerified: true,
        consentVerified: true,
        specialRequirements: "NONE",
        notes: "Must not appear in audit",
      },
    });
    expect(meta).not.toHaveProperty("notes");
    expect(meta).not.toHaveProperty("payloadJson");
    expect(meta.payloadKeyCount).toBeGreaterThan(0);
    expect(meta.summaryLineCount).toBeGreaterThan(0);
    assertClinicalDocumentationAuditMetadataPhiSafe(meta);
  });

  it("EDOC.LEGAL.1 fallback still works for unknown cards", () => {
    const lines = ensureClinicalDocumentationLegalDisplaySummary(
      "legacy_hidden_card_xyz",
      { customField: "value" },
      "en"
    );
    expect(lines.length).toBeGreaterThan(0);
    expect(buildClinicalDocumentationFallbackSummaryLines("legacy_hidden_card_xyz", {}, "fr").length).toBeGreaterThan(
      0
    );
  });

  it("basic structured card summary still works (regression)", () => {
    const payload = { items: [{ key: "Pain", value: "2/10" }] };
    assertClinicalDocumentationSummaryGenerated(EDOC_BASIC_STRUCTURED_CARD_ID, payload);
  });
});
