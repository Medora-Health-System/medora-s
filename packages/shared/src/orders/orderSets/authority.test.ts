import { describe, expect, it } from "vitest";
import {
  validateEnterpriseOrderSetRegistry,
} from "../enterpriseOrderSetValidation.js";
import { activeEnterpriseOrderSets, enterpriseOrderSetByCode } from "./registry.js";
import {
  canRoleApplyEnterpriseOrderSet,
  isEnterpriseOrderSetItemRnStandingOrderSafe,
  isProviderEnterpriseOrderSet,
  isRnStandingOrderSet,
  resolveEnterpriseOrderSetAuthority,
  validateEnterpriseOrderSetAuthorityDefinition,
} from "./authority.js";

describe("enterpriseOrderSetAuthority (MEDUI.ORDERSETS.ENTERPRISE_PHASE_6)", () => {
  it("defaults legacy provider sets to PROVIDER_ORDER_SET", () => {
    const chestPain = enterpriseOrderSetByCode("ed_chest_pain_v1")!;
    expect(resolveEnterpriseOrderSetAuthority(chestPain)).toBe("PROVIDER_ORDER_SET");
    expect(isProviderEnterpriseOrderSet(chestPain)).toBe(true);
    expect(isRnStandingOrderSet(chestPain)).toBe(false);
  });

  it("marks RN standing sets with RN_STANDING_ORDER authority", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_chest_pain_v1")!;
    expect(resolveEnterpriseOrderSetAuthority(rnSet)).toBe("RN_STANDING_ORDER");
    expect(isRnStandingOrderSet(rnSet)).toBe(true);
  });

  it("allows RN to apply RN standing order set only with standing-order authority", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_chest_pain_v1")!;
    expect(
      canRoleApplyEnterpriseOrderSet({
        orderSetAuthority: "RN_STANDING_ORDER",
        rolesAllowed: rnSet.rolesAllowed,
        canPrescribe: false,
        hasRnStandingOrderAuthority: true,
        roleCodes: ["RN"],
      })
    ).toBe(true);
    expect(
      canRoleApplyEnterpriseOrderSet({
        orderSetAuthority: "RN_STANDING_ORDER",
        rolesAllowed: rnSet.rolesAllowed,
        canPrescribe: false,
        hasRnStandingOrderAuthority: false,
        roleCodes: ["RN"],
      })
    ).toBe(false);
  });

  it("blocks RN from applying provider order sets", () => {
    const providerSet = enterpriseOrderSetByCode("ed_chest_pain_v1")!;
    expect(
      canRoleApplyEnterpriseOrderSet({
        orderSetAuthority: "PROVIDER_ORDER_SET",
        rolesAllowed: providerSet.rolesAllowed,
        canPrescribe: false,
        hasRnStandingOrderAuthority: true,
        roleCodes: ["RN"],
      })
    ).toBe(false);
  });

  it("allows provider to apply provider order sets", () => {
    const providerSet = enterpriseOrderSetByCode("ed_sepsis_v1")!;
    expect(
      canRoleApplyEnterpriseOrderSet({
        orderSetAuthority: "PROVIDER_ORDER_SET",
        rolesAllowed: providerSet.rolesAllowed,
        canPrescribe: true,
        hasRnStandingOrderAuthority: false,
        roleCodes: ["PROVIDER"],
      })
    ).toBe(true);
  });

  it("provider can also apply RN standing orders when clinically appropriate", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_respiratory_distress_v1")!;
    expect(
      canRoleApplyEnterpriseOrderSet({
        orderSetAuthority: "RN_STANDING_ORDER",
        rolesAllowed: rnSet.rolesAllowed,
        canPrescribe: true,
        hasRnStandingOrderAuthority: false,
        roleCodes: ["PROVIDER"],
      })
    ).toBe(true);
  });

  it("RN standing sets cannot include medication items", () => {
    const issues = validateEnterpriseOrderSetAuthorityDefinition({
      ...enterpriseOrderSetByCode("ed_rn_chest_pain_v1")!,
      optionalItems: [
        {
          key: "badMed",
          kind: "MEDICATION",
          displayNameEn: "Bad",
          displayNameFr: "Mauvais",
          catalogCode: "ASPIRIN",
        },
      ],
    });
    expect(issues.some((issue) => issue.kind === "medication")).toBe(true);
  });

  it("registry has no duplicate active codes after RN expansion", () => {
    const codes = activeEnterpriseOrderSets().map((set) => set.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("full registry validation passes with RN standing orders", () => {
    expect(validateEnterpriseOrderSetRegistry().ok).toBe(true);
  });

  it("RN-safe care items pass standing-order item guard", () => {
    const rnSet = enterpriseOrderSetByCode("ed_rn_neuro_complaint_v1")!;
    for (const item of [...rnSet.requiredItems, ...rnSet.optionalItems]) {
      expect(isEnterpriseOrderSetItemRnStandingOrderSafe(item)).toBe(true);
    }
  });
});
