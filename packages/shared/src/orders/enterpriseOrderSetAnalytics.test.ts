import { describe, expect, it } from "vitest";
import {
  aggregateEnterpriseOrderSetAnalytics,
  enterpriseOrderSetApplicationKey,
  parseEnterpriseOrderSetAuditMetadata,
  toEnterpriseOrderSetComplianceExportRow,
} from "./enterpriseOrderSetAnalytics.js";

describe("enterpriseOrderSetAnalytics (MEDUI.ORDERSETS.ENTERPRISE_PHASE_3)", () => {
  const baseMeta = {
    enterpriseOrderSetCode: "ed_sepsis_v1",
    enterpriseOrderSetVersion: "1.0.0",
    enterpriseOrderSetCategory: "INFECTION",
    enterpriseOrderSetClinicalDomain: "sepsis",
    enterpriseOrderSetSelectedItemCount: 4,
    enterpriseOrderSetSkippedItemCount: 1,
    enterpriseOrderSetStructuredParameterSkippedCount: 1,
    enterpriseOrderSetPlacedItemKeys: ["lactate"],
    enterpriseOrderSetAppliedSurface: "CREATE_ORDER_MODAL",
    enterpriseOrderSetAppliedAt: "2026-06-23T12:00:00.000Z",
    type: "LAB",
  };

  it("parses provenance-bearing audit metadata", () => {
    const row = parseEnterpriseOrderSetAuditMetadata({
      auditLogId: "a1",
      createdAt: "2026-06-23T12:01:00.000Z",
      metadata: baseMeta,
      encounterId: "enc-1",
      orderId: "ord-1",
      userId: "usr-1",
      encounterType: "EMERGENCY",
    });
    expect(row?.orderSetCode).toBe("ed_sepsis_v1");
    expect(row?.structuredParameterSkippedCount).toBe(1);
  });

  it("returns null for manual orders without provenance", () => {
    expect(
      parseEnterpriseOrderSetAuditMetadata({
        auditLogId: "a2",
        createdAt: "2026-06-23T12:01:00.000Z",
        metadata: { type: "LAB", itemCount: 1 },
      })
    ).toBeNull();
  });

  it("groups multi-domain submits into one application", () => {
    const lab = parseEnterpriseOrderSetAuditMetadata({
      auditLogId: "a3",
      createdAt: "2026-06-23T12:01:00.000Z",
      metadata: { ...baseMeta, enterpriseOrderSetPlacedItemKeys: ["lactate"] },
      encounterId: "enc-1",
    })!;
    const care = parseEnterpriseOrderSetAuditMetadata({
      auditLogId: "a4",
      createdAt: "2026-06-23T12:02:00.000Z",
      metadata: {
        ...baseMeta,
        type: "CARE",
        enterpriseOrderSetPlacedItemKeys: ["vitalsQ15"],
      },
      encounterId: "enc-1",
    })!;
    expect(enterpriseOrderSetApplicationKey(lab)).toBe(enterpriseOrderSetApplicationKey(care));
    const summary = aggregateEnterpriseOrderSetAnalytics({
      rows: [lab, care],
      summaryScanCount: 2,
      summaryIsPartial: false,
    });
    expect(summary.totalProvenanceOrders).toBe(2);
    expect(summary.totalApplications).toBe(1);
    expect(summary.totalPlacedItems).toBe(2);
  });

  it("builds compliance export rows", () => {
    const row = parseEnterpriseOrderSetAuditMetadata({
      auditLogId: "a5",
      createdAt: "2026-06-23T12:01:00.000Z",
      metadata: baseMeta,
      encounterId: "enc-2",
    })!;
    const exported = toEnterpriseOrderSetComplianceExportRow(row);
    expect(exported.orderSetCode).toBe("ed_sepsis_v1");
    expect(exported.placedItemCount).toBe(1);
  });

  it("counts verbal-order attested RN standing metadata", () => {
    const row = parseEnterpriseOrderSetAuditMetadata({
      auditLogId: "a6",
      createdAt: "2026-06-23T12:01:00.000Z",
      metadata: {
        ...baseMeta,
        enterpriseOrderSetAuthority: "RN_STANDING_ORDER",
        verbalOrderReadBackConfirmed: true,
      },
      encounterId: "enc-3",
    })!;
    const summary = aggregateEnterpriseOrderSetAnalytics({
      rows: [row],
      summaryScanCount: 1,
      summaryIsPartial: false,
    });
    expect(row.verbalOrderReadBackConfirmed).toBe(true);
    expect(summary.totalVerbalOrderAttestedOrders).toBe(1);
  });
});
