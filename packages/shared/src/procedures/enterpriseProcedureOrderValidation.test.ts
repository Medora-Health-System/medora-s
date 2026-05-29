import { describe, expect, it } from "vitest";
import {
  isKnownEnterpriseProcedureId,
  validateEnterpriseProcedureIdForOrderItem,
} from "./enterpriseProcedureOrderValidation.js";
import { orderCreateDtoSchema } from "../schemas/patient.js";

describe("enterpriseProcedureOrderValidation (MEDPROC.2)", () => {
  it("looks up known enterprise procedure ids", () => {
    expect(isKnownEnterpriseProcedureId("ekg_ecg")).toBe(true);
    expect(isKnownEnterpriseProcedureId("not_a_real_procedure")).toBe(false);
  });

  it("allows custom care tasks to omit enterpriseProcedureId", () => {
    const result = validateEnterpriseProcedureIdForOrderItem({
      orderType: "CARE",
      catalogItemType: "CARE",
    });
    expect(result.ok).toBe(true);
  });

  it("rejects invalid enterpriseProcedureId", () => {
    const result = validateEnterpriseProcedureIdForOrderItem({
      orderType: "CARE",
      catalogItemType: "CARE",
      enterpriseProcedureId: "unknown_procedure_xyz",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.message).toContain("inconnue");
    }
  });

  it("allows enterpriseProcedureId only for CARE items", () => {
    const lab = validateEnterpriseProcedureIdForOrderItem({
      orderType: "LAB",
      catalogItemType: "LAB_TEST",
      enterpriseProcedureId: "ekg_ecg",
    });
    expect(lab.ok).toBe(false);

    const med = validateEnterpriseProcedureIdForOrderItem({
      orderType: "MEDICATION",
      catalogItemType: "MEDICATION",
      enterpriseProcedureId: "ekg_ecg",
    });
    expect(med.ok).toBe(false);
  });

  it("accepts valid CARE enterpriseProcedureId", () => {
    const result = validateEnterpriseProcedureIdForOrderItem({
      orderType: "CARE",
      catalogItemType: "CARE",
      enterpriseProcedureId: "foley_catheter",
    });
    expect(result).toEqual({ ok: true, enterpriseProcedureId: "foley_catheter" });
  });

  it("orderCreateDtoSchema rejects invalid enterpriseProcedureId on CARE orders", () => {
    const parsed = orderCreateDtoSchema.safeParse({
      type: "CARE",
      items: [
        {
          catalogItemType: "CARE",
          manualLabel: "Test",
          enterpriseProcedureId: "invalid_procedure_id",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("orderCreateDtoSchema accepts CARE order with valid enterpriseProcedureId", () => {
    const parsed = orderCreateDtoSchema.safeParse({
      type: "CARE",
      items: [
        {
          catalogItemType: "CARE",
          manualLabel: "EKG / ECG 12-Lead",
          enterpriseProcedureId: "ekg_ecg",
        },
      ],
    });
    expect(parsed.success).toBe(true);
  });

  it("orderCreateDtoSchema rejects enterpriseProcedureId on lab orders", () => {
    const parsed = orderCreateDtoSchema.safeParse({
      type: "LAB",
      items: [
        {
          catalogItemType: "LAB_TEST",
          manualLabel: "CBC",
          enterpriseProcedureId: "ekg_ecg",
        },
      ],
    });
    expect(parsed.success).toBe(false);
  });

  it("manualLabel remains independent display snapshot", () => {
    const parsed = orderCreateDtoSchema.safeParse({
      type: "CARE",
      items: [
        {
          catalogItemType: "CARE",
          manualLabel: "Localized display snapshot",
          enterpriseProcedureId: "central_line_placement",
        },
      ],
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.items[0]?.manualLabel).toBe("Localized display snapshot");
      expect(parsed.data.items[0]?.enterpriseProcedureId).toBe("central_line_placement");
    }
  });
});
