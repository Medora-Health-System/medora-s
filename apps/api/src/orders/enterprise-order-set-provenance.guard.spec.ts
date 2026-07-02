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
    expect(meta.enterpriseOrderSetAuthority).toBe("PROVIDER_ORDER_SET");
    expect(meta.enterpriseOrderSetStructuredParameterSkippedCount).toBe(1);
    expect(validateEnterpriseOrderSetApplication({
      provenance,
      itemCount: 1,
      roleCodes: ["PROVIDER"],
      canPrescribe: true,
    }).ok).toBe(true);
  });

  it("accepts RN standing order provenance for RN role", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_fever_pediatric_v1")!;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: rnSet,
      selectedItemKeys: ["vitalsQ15", "pulseOximetry", "cbc"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["cbc"],
      verbalOrderAttestation: {
        verbalOrderReceivedFromProviderId: "550e8400-e29b-41d4-a716-446655440001",
        verbalOrderReceivedFromProviderName: "Dr. Example",
        readBackConfirmed: true,
        verbalOrderAttestedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
        verbalOrderAttestedBy: "550e8400-e29b-41d4-a716-446655440002",
        attestedSurface: "CREATE_ORDER_MODAL",
      },
    });
    expect(() =>
      assertEnterpriseOrderSetProvenanceForCreate({
        data: {
          type: "LAB",
          items: [{ catalogItemType: "LAB_TEST", manualLabel: "CBC" }],
          enterpriseOrderSetProvenance: provenance,
        },
        roleCodes: ["RN"] as never,
        currentUserId: "550e8400-e29b-41d4-a716-446655440002",
      })
    ).not.toThrow();
  });

  it("rejects RN standing order without verbal-order attestation", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_fever_pediatric_v1")!;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: rnSet,
      selectedItemKeys: ["cbc"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["cbc"],
    });
    expect(() =>
      assertEnterpriseOrderSetProvenanceForCreate({
        data: {
          type: "LAB",
          items: [{ catalogItemType: "LAB_TEST", manualLabel: "CBC" }],
          enterpriseOrderSetProvenance: provenance,
        },
        roleCodes: ["RN"] as never,
        currentUserId: "550e8400-e29b-41d4-a716-446655440002",
      })
    ).toThrow(BadRequestException);
  });

  it("rejects RN attempting provider order set", () => {
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
        data: {
          type: "LAB",
          items: [{ catalogItemType: "LAB_TEST", manualLabel: "Troponin" }],
          enterpriseOrderSetProvenance: provenance,
        },
        roleCodes: ["RN"] as never,
      })
    ).toThrow(BadRequestException);
  });

  it("accepts provenance when recommended items were deselected", () => {
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
        data: {
          type: "LAB",
          items: [{ catalogItemType: "LAB_TEST", manualLabel: "Troponin" }],
          enterpriseOrderSetProvenance: provenance,
        },
        roleCodes: ["PROVIDER"] as never,
      })
    ).not.toThrow();
  });

  it("accepts RN nausea LAB provenance with mixed selected keys", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_nausea_vomiting_diarrhea_v1")!;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set: rnSet,
      selectedItemKeys: ["vitalsQ15", "npoStatus", "cmp"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["cmp"],
      verbalOrderAttestation: {
        verbalOrderReceivedFromProviderId: "550e8400-e29b-41d4-a716-446655440001",
        verbalOrderReceivedFromProviderName: "Dr. Example",
        readBackConfirmed: true,
        verbalOrderAttestedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
        verbalOrderAttestedBy: "550e8400-e29b-41d4-a716-446655440002",
        attestedSurface: "CREATE_ORDER_MODAL",
      },
    });
    expect(() =>
      assertEnterpriseOrderSetProvenanceForCreate({
        data: {
          type: "LAB",
          items: [{ catalogItemType: "LAB_TEST", catalogItemId: "550e8400-e29b-41d4-a716-446655440099" }],
          enterpriseOrderSetProvenance: provenance,
        },
        roleCodes: ["RN"] as never,
        currentUserId: "550e8400-e29b-41d4-a716-446655440002",
      })
    ).not.toThrow();
  });
});
