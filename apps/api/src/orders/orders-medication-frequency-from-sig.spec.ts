import { buildOrderItemCreateInput } from "./orders.types";

describe("buildOrderItemCreateInput frequency from sig (M1.8B.7I.6A)", () => {
  it("persists BID from directions when frequencyCode omitted", () => {
    const input = buildOrderItemCreateInput(
      {
        catalogItemId: "00000000-0000-4000-8000-000000000001",
        catalogItemType: "MEDICATION",
        notes: "1 tab PO BID",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        route: "PO",
      },
      "MEDICATION"
    );
    expect(input.frequencyCode).toBe("BID");
  });

  it("persists Q12H and Q6H from interval directions", () => {
    expect(
      buildOrderItemCreateInput(
        {
          catalogItemId: "00000000-0000-4000-8000-000000000001",
          catalogItemType: "MEDICATION",
          notes: "500 mg IV q12h",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: "IVP",
        },
        "MEDICATION"
      ).frequencyCode
    ).toBe("Q12H");

    expect(
      buildOrderItemCreateInput(
        {
          catalogItemId: "00000000-0000-4000-8000-000000000001",
          catalogItemType: "MEDICATION",
          notes: "1 tab PO q6h",
          medicationFulfillmentIntent: "ADMINISTER_CHART",
          route: "PO",
        },
        "MEDICATION"
      ).frequencyCode
    ).toBe("Q6H");
  });

  it("persists NOW from directions for direct MAR path", () => {
    const input = buildOrderItemCreateInput(
      {
        catalogItemId: "00000000-0000-4000-8000-000000000001",
        catalogItemType: "MEDICATION",
        notes: "1 tab PO now",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        route: "PO",
      },
      "MEDICATION"
    );
    expect(input.frequencyCode).toBe("NOW");
  });

  it("prefers explicit frequencyCode over directions", () => {
    const input = buildOrderItemCreateInput(
      {
        catalogItemId: "00000000-0000-4000-8000-000000000001",
        catalogItemType: "MEDICATION",
        notes: "1 tab PO BID",
        frequencyCode: "TID",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        route: "PO",
      },
      "MEDICATION"
    );
    expect(input.frequencyCode).toBe("TID");
  });

  it("does not infer frequency from ambiguous directions", () => {
    const input = buildOrderItemCreateInput(
      {
        catalogItemId: "00000000-0000-4000-8000-000000000001",
        catalogItemType: "MEDICATION",
        notes: "take as directed",
        medicationFulfillmentIntent: "ADMINISTER_CHART",
        route: "PO",
      },
      "MEDICATION"
    );
    expect(input.frequencyCode).toBeUndefined();
  });
});
