import { BadRequestException } from "@nestjs/common";
import {
  buildEnterpriseOrderSetApplyContext,
  buildEnterpriseOrderSetProvenance,
  enterpriseOrderSetByCode,
  validateEnterpriseOrderSetApplication,
} from "@medora/shared";
import {
  assertEnterpriseOrderSetProvenanceForCreate,
  enterpriseOrderSetAuditMetadataFromDto,
} from "./enterprise-order-set-provenance.guard";

describe("enterprise-order-set-provenance.guard (MEDUI.ORDERSETS.ENTERPRISE_PHASE_2)", () => {
  const chestPain = enterpriseOrderSetByCode("ed_chest_pain_v1")!;

  it("allows manual orders without provenance", () => {
    expect(() =>
      assertEnterpriseOrderSetProvenanceForCreate({
        data: {
          type: "LAB",
          items: [{ catalogItemType: "LAB_TEST", manualLabel: "Manual CBC" }],
        },
        roleCodes: ["PROVIDER"] as never,
      })
    ).not.toThrow();
  });

  it("accepts valid provenance", () => {
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["troponin"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    expect(() =>
      assertEnterpriseOrderSetProvenanceForCreate({
        data: { type: "LAB", items: [{ catalogItemType: "LAB_TEST", manualLabel: "Troponin" }], enterpriseOrderSetProvenance: provenance },
        roleCodes: ["PROVIDER"] as never,
      })
    ).not.toThrow();
  });

  it("rejects version mismatch", () => {
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["troponin"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext: { ...applyContext, orderSetVersion: "0.0.1" },
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    expect(() =>
      assertEnterpriseOrderSetProvenanceForCreate({
        data: { type: "LAB", items: [{ catalogItemType: "LAB_TEST", manualLabel: "Troponin" }], enterpriseOrderSetProvenance: provenance },
        roleCodes: ["PROVIDER"] as never,
      })
    ).toThrow(BadRequestException);
  });

  it("builds audit metadata fields", () => {
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: chestPain,
      selectedItemKeys: ["troponin", "oxygenTherapy"],
      skippedItems: [{ key: "oxygenTherapy", reason: "structuredParametersRequired" }],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["troponin"],
    });
    const meta = enterpriseOrderSetAuditMetadataFromDto(provenance);
    expect(meta.enterpriseOrderSetCode).toBe("ed_chest_pain_v1");
    expect(meta.enterpriseOrderSetStructuredParameterSkippedCount).toBe(1);
    expect(validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    }).ok).toBe(true);
  });
});
