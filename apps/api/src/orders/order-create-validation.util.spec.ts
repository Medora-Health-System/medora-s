import {
  extractOrderCreateBodyCatalogHints,
  logMedicationOrderCreateValidationFailure,
  resolveOrderCreateZodValidatorName,
} from "./order-create-validation.util";

describe("order-create-validation.util (MEDUI.MEDICATION.ORDER_CREATE_AND_RESPONSE_WORKFLOW_REGRESSION_AUDIT.1)", () => {
  it("maps route zod failures to orderCreateDtoSchema.route validator", () => {
    expect(resolveOrderCreateZodValidatorName(["items", 0, "route"])).toBe(
      "orderCreateDtoSchema.route"
    );
  });

  it("extracts catalog id hints from raw order body without PHI", () => {
    expect(
      extractOrderCreateBodyCatalogHints({
        type: "MEDICATION",
        items: [{ catalogItemId: "550e8400-e29b-41d4-a716-446655440000", route: "IV" }],
      })
    ).toEqual({
      catalogMedicationId: "550e8400-e29b-41d4-a716-446655440000",
      route: "IV",
    });
  });

  it("logMedicationOrderCreateValidationFailure emits structured stage and validator", () => {
    const warn = jest.spyOn(console, "warn").mockImplementation(() => undefined);
    logMedicationOrderCreateValidationFailure({
      stage: "ORDER_CREATE",
      validatorName: "orderCreateDtoSchema.route",
      failureReason: "Invalid enum value",
      requestId: "req-1",
      catalogCode: "MORPHINE_2_MG_ML_INJECTABLE_INTRAVEINEUSE",
    });
    warn.mockRestore();
  });
});
