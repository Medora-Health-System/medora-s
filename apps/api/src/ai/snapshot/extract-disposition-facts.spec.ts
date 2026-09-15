import { extractDispositionFacts } from "./extract-disposition-facts";

describe("extractDispositionFacts", () => {
  it("reads clinic checkout and transfer fields from discharge JSON", () => {
    expect(
      extractDispositionFacts({
        clinicAmbulatoryCheckoutState: "TRANSFER_ED",
        transferReason: "Chest pain",
        transferDestination: "ED",
        transferTransport: "Ambulance",
        followUpInstructions: "Return if worse",
      })
    ).toEqual({
      checkoutState: "TRANSFER_ED",
      transferReason: "Chest pain",
      transferDestination: "ED",
      transferTransport: "Ambulance",
      dischargeFollowUpDocumented: true,
    });
  });

  it("does not crash on malformed discharge JSON", () => {
    expect(extractDispositionFacts(null)).toEqual({
      checkoutState: null,
      transferReason: null,
      transferDestination: null,
      transferTransport: null,
      dischargeFollowUpDocumented: false,
    });
    expect(extractDispositionFacts("not-json")).toEqual({
      checkoutState: null,
      transferReason: null,
      transferDestination: null,
      transferTransport: null,
      dischargeFollowUpDocumented: false,
    });
  });
});
