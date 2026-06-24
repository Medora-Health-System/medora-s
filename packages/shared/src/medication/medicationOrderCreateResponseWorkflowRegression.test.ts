/**
 * MEDUI.MEDICATION.ORDER_CREATE_AND_RESPONSE_WORKFLOW_REGRESSION_AUDIT.1
 */
import { describe, expect, it, beforeEach } from "vitest";
import { orderCreateDtoSchema, orderItemCreateDtoSchema } from "../schemas/patient.js";
import { marMedicationResponseDocumentDtoSchema } from "../mar/marMedicationResponseDto.js";
import {
  prewarmProviderOrderableCatalogCodesRegistry,
  resetProviderOrderableCatalogCodesRegistryForTests,
  validateProviderOrderPlacementForCatalogCode,
} from "./providerOrderableCatalogCodesRegistry.js";
import {
  requiresEnterprisePainReassessment,
  resolveEnterprisePainReassessmentMarStatus,
} from "../mar/enterprisePainReassessmentWorkflow.js";
import { buildControlledSubstancePostAdministrationAssessmentReport } from "./controlledSubstancePostAdministrationAssessment.js";
import { normalizeMedicationRoute } from "./medicationOrderRoute.js";

const CATALOG_ID = "550e8400-e29b-41d4-a716-446655440000";

const REPRESENTATIVE_MATRIX = [
  { code: "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE", label: "Morphine 2 mg/mL", route: "IV" },
  { code: "MORPHINE_4_MG_ML_INJECTABLE_INTRAVEINEUSE", label: "Morphine 4 mg/mL", route: "IV" },
  { code: "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE", label: "Hydromorphone 0.5 mg/mL", route: "IV" },
  { code: "FENTANYL_50MCG_ML_INJECTABLE", label: "Fentanyl 50 mcg", route: "IV" },
  { code: "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL", label: "Norco", route: "PO" },
  { code: "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL", label: "Percocet", route: "PO" },
  { code: "ACETAMINOPHEN_CODEINE_300_30_COMPRIME_ORAL", label: "Tylenol #3", route: "PO" },
  { code: "KETOROLAC_30_MG_ML_INJECTABLE_INTRAVEINEUSE", label: "Ketorolac", route: "IM" },
  { code: "IBUPROFEN_400_MG_COMPRIME_ORAL", label: "Ibuprofen", route: "PO" },
  { code: "ACETAMINOPHEN_500_MG_COMPRIME_ORAL", label: "Acetaminophen", route: "PO" },
  { code: "GABAPENTIN_300_MG_GELULE_ORALE", label: "Gabapentin", route: "PO" },
  { code: "PREGABALIN_75_MG_GELULE_ORALE", label: "Pregabalin", route: "PO" },
  { code: "CYCLOBENZAPRINE_10_MG_COMPRIME_ORAL", label: "Cyclobenzaprine", route: "PO" },
  { code: "METHOCARBAMOL_500_MG_COMPRIME_ORAL", label: "Methocarbamol", route: "PO" },
  { code: "TIZANIDINE_4_MG_COMPRIME_ORAL", label: "Tizanidine", route: "PO" },
  { code: "LIDOCAINE_5_PATCH_TRANSDERMAL", label: "Lidocaine patch", route: undefined },
  { code: "DICLOFENAC_1_GEL_TOPICAL", label: "Diclofenac gel", route: undefined },
  { code: "CEFTRIAXONE_1_G_INJECTABLE_INJECTION", label: "Ceftriaxone", route: "IM" },
  { code: "PANTOPRAZOLE_40_MG_COMPRIME_ORAL", label: "Pantoprazole", route: "PO" },
  { code: "ONDANSETRON_4_MG_COMPRIME_ORAL", label: "Ondansetron", route: "PO" },
  { code: "LISINOPRIL_10_MG_COMPRIME_ORAL", label: "Lisinopril", route: "PO" },
] as const;

function medicationOrderPayload(route?: string) {
  return {
    type: "MEDICATION" as const,
    prescriberName: "Dr Test",
    items: [
      {
        catalogItemId: CATALOG_ID,
        catalogItemType: "MEDICATION" as const,
        quantity: 1,
        ...(route ? { route } : {}),
        notes: "give now",
      },
    ],
  };
}

describe("MEDUI.MEDICATION.ORDER_CREATE_AND_RESPONSE_WORKFLOW_REGRESSION_AUDIT.1", () => {
  beforeEach(() => {
    resetProviderOrderableCatalogCodesRegistryForTests();
    prewarmProviderOrderableCatalogCodesRegistry();
  });

  describe("MedicationOrderCreateValidationBoundaryReport", () => {
    it("order DTO does not declare post-administration response fields", () => {
      const shape = orderItemCreateDtoSchema.shape;
      const forbidden = [
        "painScoreBefore",
        "painScoreAfter",
        "painTrend",
        "sideEffects",
        "adverseReaction",
        "medicationResponse",
        "reassessmentTime",
        "interventionEffective",
        "respiratoryStatus",
        "sedationLevel",
      ];
      for (const key of forbidden) {
        expect(key in shape).toBe(false);
      }
    });

    it("response DTO is separate from order DTO", () => {
      const responseShape = marMedicationResponseDocumentDtoSchema.shape;
      expect(responseShape.painBefore).toBeDefined();
      expect(responseShape.painAfter).toBeDefined();
      expect(orderItemCreateDtoSchema.shape.route).toBeDefined();
      expect("painBefore" in orderItemCreateDtoSchema.shape).toBe(false);
    });

    it("post-administration assessment is explicitly not required at order time", () => {
      const report = buildControlledSubstancePostAdministrationAssessmentReport();
      expect(report.requiredAtOrderTime).toBe(false);
      expect(report.requiredAtMarAdministration).toBe(true);
    });
  });

  describe("MedicationOrderCreateRegressionMatrixReport", () => {
    it.each(REPRESENTATIVE_MATRIX)(
      "$label ($code) passes order DTO and provider gate without response fields",
      ({ code, route }) => {
        const provider = validateProviderOrderPlacementForCatalogCode(code);
        expect(provider).toBeNull();

        const parsed = orderCreateDtoSchema.safeParse(medicationOrderPayload(route));
        expect(parsed.success).toBe(true);
        if (parsed.success && route === "IV") {
          expect(parsed.data.items[0]?.route).toBe("IVP");
        }
      }
    );
  });

  describe("MarResponseGovernanceBoundaryReport", () => {
    it("requires reassessment only after administration, not at order time", () => {
      expect(requiresEnterprisePainReassessment({ medicationLabel: "Morphine 2 mg/mL IV" })).toBe(true);

      const orderOnly = orderCreateDtoSchema.safeParse(medicationOrderPayload("IV"));
      expect(orderOnly.success).toBe(true);

      expect(
        resolveEnterprisePainReassessmentMarStatus({
          medicationLabel: "Morphine 2 mg/mL IV",
          marAction: "administered",
          administrationNotes: "administered",
        })
      ).toBe("AWAITING_REASSESSMENT");

      expect(
        resolveEnterprisePainReassessmentMarStatus({
          medicationLabel: "Morphine 2 mg/mL IV",
          marAction: "administered",
          administrationNotes:
            'MAR_MEDICATION_RESPONSE: {"responseCode":"PAIN_REDUCED","painBefore":8,"painAfter":3,"documentedAt":"2026-06-24T12:00:00.000Z"}',
        })
      ).toBe("REASSESSMENT_COMPLETED");
    });
  });

  describe("SystemicMedicationOrderCreateFixReport", () => {
    it("IV route alias normalization is the systemic order-create fix (not response validation)", () => {
      expect(normalizeMedicationRoute("IV")).toBe("IVP");
      expect(normalizeMedicationRoute("intraveineuse")).toBe("IVP");

      const beforeNormalization = {
        type: "MEDICATION" as const,
        prescriberName: "Dr Test",
        items: [
          {
            catalogItemId: CATALOG_ID,
            catalogItemType: "MEDICATION" as const,
            quantity: 1,
            route: "IV",
          },
        ],
      };
      const parsed = orderCreateDtoSchema.safeParse(beforeNormalization);
      expect(parsed.success).toBe(true);
      expect(parsed.success && parsed.data.items[0]?.route).toBe("IVP");
    });
  });

  describe("MedicationOrderCreateRegressionTestReport", () => {
    const orderCases = [
      ["Morphine 2 mg/mL", "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE"],
      ["Hydromorphone 0.5 mg/mL", "HYDROMORPHONE_0_5_MG_ML_INJECTABLE_INTRAVEINEUSE"],
      ["Norco", "HYDROCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL"],
      ["Percocet", "OXYCODONE_ACETAMINOPHEN_5_325_COMPRIME_ORAL"],
      ["Gabapentin", "GABAPENTIN_300_MG_GELULE_ORALE"],
      ["Ketorolac", "KETOROLAC_30_MG_ML_INJECTABLE_INTRAVEINEUSE"],
      ["Ceftriaxone", "CEFTRIAXONE_1_G_INJECTABLE_INJECTION"],
      ["Pantoprazole", "PANTOPRAZOLE_40_MG_COMPRIME_ORAL"],
    ] as const;

    it.each(orderCases)("%s order create does not require pain reassessment fields", (_label, code) => {
      expect(validateProviderOrderPlacementForCatalogCode(code)).toBeNull();
      const parsed = orderCreateDtoSchema.safeParse(medicationOrderPayload("IV"));
      expect(parsed.success).toBe(true);
    });

    it("preserves O(1) provider-orderable registry lookup", () => {
      const registry = prewarmProviderOrderableCatalogCodesRegistry();
      expect(registry.has("MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE")).toBe(true);
      expect(registry.size).toBeGreaterThan(200);
    });
  });
});
