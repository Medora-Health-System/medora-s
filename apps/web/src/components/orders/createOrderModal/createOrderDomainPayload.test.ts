import { describe, expect, it } from "vitest";
import { orderCreateDtoSchema } from "@medora/shared";
import {
  buildVerbalOrderAttestation,
  enterpriseOrderSetByCode,
  validateEnterpriseOrderSetApplication,
  buildEnterpriseOrderSetApplyContext,
  buildEnterpriseOrderSetProvenance,
} from "@medora/shared";
import {
  buildCreateOrderDomainPayload,
  buildLabOrderItemDto,
  isCatalogItemUuid,
  prepareCreateOrderDomainPayloadForSubmit,
  resolveOrderSetProvenanceForSubmit,
} from "./createOrderDomainPayload";
import type { CreateOrderLineItem } from "./types";

const VALID_LAB_ID = "550e8400-e29b-41d4-a716-446655440001";
const VALID_LAB_ID_2 = "550e8400-e29b-41d4-a716-446655440002";
const RN_USER_ID = "550e8400-e29b-41d4-a716-446655440002";
const PROVIDER_ID = "550e8400-e29b-41d4-a716-446655440001";

describe("createOrderDomainPayload", () => {
  it("detects catalog UUIDs", () => {
    expect(isCatalogItemUuid(VALID_LAB_ID)).toBe(true);
    expect(isCatalogItemUuid("lab-trop")).toBe(false);
  });

  it("builds manual LAB payload when catalog id is invalid", () => {
    const dto = buildLabOrderItemDto({
      _lineId: "line-1",
      isManual: false,
      catalogItemId: "lab-trop",
      catalogItemType: "LAB_TEST",
      _label: "D-dimer",
    });
    expect(dto.catalogItemId).toBeNull();
    expect(dto.manualLabel).toBe("D-dimer");
    expect(dto.catalogItemType).toBe("LAB_TEST");
  });

  it("matches manual LAB payload shape for valid catalog id", () => {
    const manual = buildCreateOrderDomainPayload({
      type: "LAB",
      priority: "ROUTINE",
      notes: "",
      prescriberName: "",
      prescriberLicense: "",
      prescriberContact: "",
      items: [
        {
          _lineId: "manual-1",
          isManual: true,
          catalogItemType: "LAB_TEST",
          manualLabel: "D-dimer",
          _label: "D-dimer",
        },
      ],
    });

    const fromOrderSet = buildCreateOrderDomainPayload({
      type: "LAB",
      priority: "ROUTINE",
      notes: "",
      prescriberName: "",
      prescriberLicense: "",
      prescriberContact: "",
      items: [
        {
          _lineId: "set-1",
          isManual: false,
          catalogItemId: VALID_LAB_ID,
          catalogItemType: "LAB_TEST",
          _label: "D-dimer",
          _enterpriseOrderSetItemKey: "dDimer",
        },
      ],
    });

    expect(manual.items[0]?.catalogItemType).toBe("LAB_TEST");
    expect(fromOrderSet.items[0]?.catalogItemType).toBe("LAB_TEST");
    expect(fromOrderSet.items[0]?.catalogItemId).toBe(VALID_LAB_ID);
    expect(orderCreateDtoSchema.safeParse(manual).success).toBe(true);
    expect(orderCreateDtoSchema.safeParse(fromOrderSet).success).toBe(true);
  });

  it("validates DVT evaluation LAB payload with provenance", () => {
    const set = enterpriseOrderSetByCode("ed_dvt_evaluation_v1")!;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set,
      selectedItemKeys: ["dDimer", "venousDuplex", "inr", "peripheralIv"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const items: CreateOrderLineItem[] = [
      {
        _lineId: "lab-1",
        isManual: false,
        catalogItemId: VALID_LAB_ID,
        catalogItemType: "LAB_TEST",
        _label: "D-dimer",
        _enterpriseOrderSetItemKey: "dDimer",
      },
      {
        _lineId: "lab-2",
        isManual: false,
        catalogItemId: VALID_LAB_ID_2,
        catalogItemType: "LAB_TEST",
        _label: "INR",
        _enterpriseOrderSetItemKey: "inr",
      },
    ];
    const provenance = resolveOrderSetProvenanceForSubmit({
      applyContext,
      orderSetReviewActive: true,
      orderType: "LAB",
      items,
      canPrescribe: true,
      hasRnStandingOrderAuthority: false,
      roleCodes: ["PROVIDER"],
      userId: "550e8400-e29b-41d4-a716-446655440099",
    });
    const payload = buildCreateOrderDomainPayload({
      type: "LAB",
      priority: "ROUTINE",
      notes: "",
      prescriberName: "Dr. Example",
      prescriberLicense: "",
      prescriberContact: "",
      items,
      enterpriseOrderSetProvenance: provenance,
    });

    expect(provenance?.placedItemKeys).toEqual(["dDimer", "inr"]);
    expect(orderCreateDtoSchema.safeParse(payload).success).toBe(true);
  });

  it("validates RN nausea LAB payload with verbal attestation", () => {
    const set = enterpriseOrderSetByCode("ed_rn_nausea_vomiting_diarrhea_v1")!;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set,
      selectedItemKeys: ["vitalsQ15", "npoStatus", "cmp"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const items = [
      {
        _lineId: "lab-1",
        isManual: false,
        catalogItemId: VALID_LAB_ID,
        catalogItemType: "LAB_TEST" as const,
        _label: "CMP",
        _enterpriseOrderSetItemKey: "cmp",
      },
    ];
    const provenance = resolveOrderSetProvenanceForSubmit({
      applyContext,
      orderSetReviewActive: true,
      orderType: "LAB",
      items,
      canPrescribe: false,
      hasRnStandingOrderAuthority: true,
      roleCodes: ["RN"],
      userId: RN_USER_ID,
      verbalOrderAttestation: buildVerbalOrderAttestation({
        verbalOrderReceivedFromProviderId: PROVIDER_ID,
        verbalOrderReceivedFromProviderName: "Dr. Example",
        readBackConfirmed: true,
        verbalOrderAttestedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
        verbalOrderAttestedBy: RN_USER_ID,
      }),
    });
    const payload = buildCreateOrderDomainPayload({
      type: "LAB",
      priority: "ROUTINE",
      notes: "",
      prescriberName: "Dr. Example",
      prescriberLicense: "",
      prescriberContact: "",
      items,
      enterpriseOrderSetProvenance: provenance,
    });
    const prepared = prepareCreateOrderDomainPayloadForSubmit(payload);
    expect(provenance?.placedItemKeys).toEqual(["cmp"]);
    expect(validateEnterpriseOrderSetApplication({
      provenance: provenance!,
      itemCount: 1,
      roleCodes: ["RN"],
      canPrescribe: false,
      hasRnStandingOrderAuthority: true,
      currentUserId: RN_USER_ID,
    }).ok).toBe(true);
    expect(prepared.ok).toBe(true);
  });

  it("strips invalid provenance but keeps valid LAB lines", () => {
    const set = enterpriseOrderSetByCode("ed_rn_nausea_vomiting_diarrhea_v1")!;
    const applyContext = buildEnterpriseOrderSetApplyContext({
      set,
      selectedItemKeys: ["cmp"],
      skippedItems: [],
      appliedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
    });
    const provenance = buildEnterpriseOrderSetProvenance({
      applyContext,
      orderType: "LAB",
      placedItemKeys: ["cmp"],
      verbalOrderAttestation: buildVerbalOrderAttestation({
        verbalOrderReceivedFromProviderId: "not-a-uuid",
        readBackConfirmed: true,
        verbalOrderAttestedAt: new Date("2026-06-23T12:00:00.000Z").toISOString(),
        verbalOrderAttestedBy: "also-not-uuid",
      }),
    });
    const prepared = prepareCreateOrderDomainPayloadForSubmit(
      buildCreateOrderDomainPayload({
        type: "LAB",
        priority: "ROUTINE",
        notes: "",
        prescriberName: "",
        prescriberLicense: "",
        prescriberContact: "",
        items: [
          {
            _lineId: "lab-1",
            isManual: false,
            catalogItemId: VALID_LAB_ID,
            catalogItemType: "LAB_TEST",
            _label: "CMP",
            _enterpriseOrderSetItemKey: "cmp",
          },
        ],
        enterpriseOrderSetProvenance: provenance,
      })
    );
    expect(prepared.ok).toBe(true);
    if (prepared.ok) {
      expect(prepared.payload.enterpriseOrderSetProvenance).toBeUndefined();
      expect(prepared.payload.items[0]?.catalogItemId).toBe(VALID_LAB_ID);
    }
  });
});
