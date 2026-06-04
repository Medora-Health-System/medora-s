import { describe, expect, it } from "vitest";
import {
  mergeMarCreateBillingFields,
  parseMarDoseValueFromStrength,
  resolveMarHiddenBillingPayload,
} from "./marHiddenBillingPayload.js";

describe("marHiddenBillingPayload", () => {
  it("resolves NDC from catalog then package", () => {
    expect(
      resolveMarHiddenBillingPayload({
        catalogMedication: { ndcDisplay: "12345-6789-01", ndc11: "12345678901" },
      }).ndc
    ).toBe("12345-6789-01");

    expect(
      resolveMarHiddenBillingPayload({
        catalogMedication: { ndc11: null, ndcDisplay: null },
        medicationPackage: { ndc11: "55150011801", ndcDisplay: "55150-0118-01" },
      }).ndc
    ).toBe("55150-0118-01");
  });

  it("derives dose value from order strength silently", () => {
    expect(parseMarDoseValueFromStrength("4 mg/2 mL")).toBe(4);
    expect(
      resolveMarHiddenBillingPayload({
        strength: "4 mg/2 mL",
        catalogMedication: { billingUnitType: "mg", strength: "4 mg/2 mL" },
        quantity: 1,
      })
    ).toMatchObject({ doseValue: 4, billingQuantity: 1, doseUnit: "mg" });
  });

  it("mergeMarCreateBillingFields prefers explicit modal values over hidden", () => {
    const hidden = resolveMarHiddenBillingPayload({
      catalogMedication: { ndcDisplay: "00000-5000-68" },
      strength: "4 mg/2 mL",
      quantity: 1,
    });
    expect(
      mergeMarCreateBillingFields({
        hidden,
        ndc: "override-ndc",
        doseValue: 2,
        billingQuantity: 3,
      })
    ).toEqual({ ndc: "override-ndc", doseValue: 2, billingQuantity: 3 });
  });

  it("mergeMarCreateBillingFields applies hidden NDC when modal ndc empty", () => {
    const hidden = resolveMarHiddenBillingPayload({
      catalogMedication: { ndc11: "55150011801", ndcDisplay: "55150-0118-01" },
      strength: "4 mg/2 mL",
      quantity: 1,
    });
    expect(mergeMarCreateBillingFields({ hidden })).toEqual({
      ndc: "55150-0118-01",
      doseValue: 4,
      billingQuantity: 1,
    });
  });

  it("uses administered quantity for billing when billing qty not set", () => {
    const hidden = resolveMarHiddenBillingPayload({ quantity: 2 });
    expect(
      mergeMarCreateBillingFields({ hidden, administeredQuantity: 1 }).billingQuantity
    ).toBe(1);
  });

  it("follows NDC priority: explicit over hidden catalog over hidden package (M1.7B.7B)", () => {
    const hidden = resolveMarHiddenBillingPayload({
      catalogMedication: { ndc11: "22222222222", ndcDisplay: "22222-2222-22" },
      medicationPackage: { ndc11: "33333333301", ndcDisplay: "33333-3333-01" },
    });
    expect(mergeMarCreateBillingFields({ hidden, ndc: "11111-1111-11" }).ndc).toBe("11111-1111-11");
    expect(mergeMarCreateBillingFields({ hidden }).ndc).toBe("22222-2222-22");
    expect(
      mergeMarCreateBillingFields({
        hidden: resolveMarHiddenBillingPayload({
          catalogMedication: { ndc11: null, ndcDisplay: null },
          medicationPackage: { ndc11: "33333333301", ndcDisplay: "33333-3333-01" },
        }),
      }).ndc
    ).toBe("33333-3333-01");
    expect(
      mergeMarCreateBillingFields({
        hidden: resolveMarHiddenBillingPayload({
          catalogMedication: { ndc11: null, ndcDisplay: null },
        }),
      }).ndc
    ).toBeUndefined();
  });
});
