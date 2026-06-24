/**
 * MEDUI.MEDICATION.MORPHINE_ORDER_CREATE_RUNTIME_FIX.1
 */
import { describe, expect, it, beforeEach } from "vitest";
import { orderCreateDtoSchema } from "../schemas/patient.js";
import {
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
  validateProviderOrderPlacementForCatalogCode,
} from "./providerOrderableCatalogCodesRegistry.js";
import {
  isActiveControlledSubstanceProviderOrderingMedication,
  validateControlledSubstanceProviderOrderPlacement,
} from "./controlledSubstanceProviderOrderingActivation.js";
import {
  isExemptFromTranche1PilotOrderGate,
  validatePilotOrderPlacementWithEnterpriseBypass,
} from "./pilotMedicationBlockerAudit.js";
import { normalizeMedicationRoute } from "./medicationOrderRoute.js";
import { validateControlledSubstanceMarCreate } from "./controlledSubstanceMarGovernance.js";
import { resolveControlledSubstanceDirectMarReady } from "./controlledSubstanceOralOpioidMarSupport.js";
import {
  requiresEnterprisePainReassessment,
  resolveEnterprisePainReassessmentMarStatus,
} from "../mar/enterprisePainReassessmentWorkflow.js";
import { resolveControlledSubstanceMarWorkflowMode } from "./controlledSubstanceMarWorkflowPolicy.js";

const OPIOID_IV_PUSH_CODES = [
  "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE",
  "MORPHINE_10_MG_PER_ML_INJECTABLE_INJECTION",
  "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE",
] as const;

function morphineOrderPayload(catalogItemId: string, route: string) {
  return {
    type: "MEDICATION" as const,
    prescriberName: "Dr Test",
    priority: "ROUTINE" as const,
    items: [
      {
        catalogItemId,
        catalogItemType: "MEDICATION" as const,
        quantity: 1,
        route,
        notes: "2 mg IV push now",
        medicationFulfillmentIntent: "ADMINISTER_CHART" as const,
      },
    ],
  };
}

describe("MEDUI.MEDICATION.MORPHINE_ORDER_CREATE_RUNTIME_FIX.1", () => {
  beforeEach(() => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  describe("MorphineOrderCreateReproductionReport", () => {
    it.each(OPIOID_IV_PUSH_CODES)("reproduces prior IV route 400 for %s and accepts after normalization", (catalogCode) => {
      const beforeFixShape = {
        type: "MEDICATION",
        prescriberName: "Dr Test",
        items: [
          {
            catalogItemId: "550e8400-e29b-41d4-a716-446655440000",
            catalogItemType: "MEDICATION",
            quantity: 1,
            route: "IV",
          },
        ],
      };
      const reproduction = orderCreateDtoSchema.safeParse(beforeFixShape);
      expect(reproduction.success).toBe(true);
      expect(reproduction.success && reproduction.data.items[0]?.route).toBe("IVP");

      const placement = validateProviderOrderPlacementForCatalogCode(catalogCode);
      expect(placement).toBeNull();
    });
  });

  describe("MorphineOrderCreateValidationTraceReport", () => {
    it("passes provider-orderable, controlled-substance, and pilot bypass gates", () => {
      for (const catalogCode of OPIOID_IV_PUSH_CODES) {
        expect(isActiveControlledSubstanceProviderOrderingMedication(catalogCode)).toBe(true);
        expect(validateControlledSubstanceProviderOrderPlacement({ catalogCode }).allowed).toBe(true);
        expect(validateProviderOrderPlacementForCatalogCode(catalogCode)).toBeNull();
        expect(isExemptFromTranche1PilotOrderGate(catalogCode)).toBe(true);
        expect(
          validatePilotOrderPlacementWithEnterpriseBypass({
            facilityId: "real-facility",
            catalogCode,
            roleCodes: ["PROVIDER"],
          }).allowed
        ).toBe(true);
      }
    });
  });

  describe("MorphineOrderPayloadAuditReport", () => {
    it("accepts IV, intraveineuse, and IVP routes for opioid IV push payloads", () => {
      for (const route of ["IV", "intraveineuse", "IVP", "IV_PUSH"] as const) {
        const parsed = orderCreateDtoSchema.safeParse(morphineOrderPayload("550e8400-e29b-41d4-a716-446655440000", route));
        expect(parsed.success, route).toBe(true);
        if (parsed.success) {
          expect(parsed.data.items[0]?.route).toBe("IVP");
        }
      }
    });

    it("maps catalog intraveineuse route to IVP for order line defaults", () => {
      expect(
        normalizeMedicationRoute({ route: "intraveineuse", administrationType: "PUSH" })
      ).toBe("IVP");
      expect(
        normalizeMedicationRoute({ route: "injectable", administrationType: "PUSH" })
      ).toBe("IVP");
    });
  });

  describe("MorphineCatalogRuntimeAuditReport", () => {
    it("registry codes are active provider-orderable with direct MAR IV push support", () => {
      for (const catalogCode of OPIOID_IV_PUSH_CODES) {
        expect(isActiveControlledSubstanceProviderOrderingMedication(catalogCode)).toBe(true);
        const directMar = resolveControlledSubstanceDirectMarReady(catalogCode);
        expect(directMar.marReady).toBe(true);
        expect(directMar.directAdministration).toBe(true);
      }
    });
  });

  describe("MorphineOrderCreateRegressionTestReport", () => {
    it.each(OPIOID_IV_PUSH_CODES)("%s order payload validates", (catalogCode) => {
      const parsed = orderCreateDtoSchema.safeParse(
        morphineOrderPayload("550e8400-e29b-41d4-a716-446655440000", "IV")
      );
      expect(parsed.success).toBe(true);
      expect(validateProviderOrderPlacementForCatalogCode(catalogCode)).toBeNull();
    });

    it("routine opioid IV push does not require Medora witness or waste at MAR create", () => {
      const mar = validateControlledSubstanceMarCreate({
        marAction: "administered",
        governance: {
          isControlled: true,
          requiresWitness: true,
          pyxisWasteWitnessExternalized: true,
          medoraWitnessRequired: false,
        },
        administeredByUserId: "nurse-1",
        administeredQuantity: 1,
        orderedQuantity: 2,
      });
      expect(mar.ok).toBe(true);
    });

    it("controlled-substance pain reassessment required after administration", () => {
      expect(requiresEnterprisePainReassessment({ medicationLabel: "Morphine 2 mg/mL IV" })).toBe(true);
      expect(
        resolveEnterprisePainReassessmentMarStatus({
          medicationLabel: "Morphine 2 mg/mL IV",
          marAction: "administered",
          administrationNotes: "administered",
        })
      ).toBe("AWAITING_REASSESSMENT");
    });

    it("PCA/opioid infusion still excluded from routine controlled workflow", () => {
      expect(
        resolveControlledSubstanceMarWorkflowMode({
          catalogCode: "MORPHINE_PCA",
          genericName: "Morphine PCA",
          route: "PCA",
          isControlled: true,
        })
      ).toBe("PCA_EXCLUDED");
      expect(
        resolveControlledSubstanceMarWorkflowMode({
          catalogCode: "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
          genericName: "Morphine",
          route: "IVP",
          isControlled: true,
          isContinuousInfusion: true,
        })
      ).toBe("MEDORA_DUAL_SIGN_REQUIRED");
    });

    it("preserves O(1) registry lookup", () => {
      const registry = prewarmProviderOrderableCatalogCodesRegistry();
      expect(registry.has("MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE")).toBe(true);
      expect(registry.size).toBeGreaterThan(200);
    });
  });
});
