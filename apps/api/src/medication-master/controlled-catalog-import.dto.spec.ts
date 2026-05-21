import { controlledCatalogMedicationCommitBodySchema } from "./dto/controlled-catalog-import.dto";

/** Mirrors multipart FormData string booleans parsed in the controller. */
function parseCommitFields(body: Record<string, string | undefined>) {
  return controlledCatalogMedicationCommitBodySchema.safeParse({
    facilityId: body.facilityId,
    enableProviderOrderSearch: body.enableProviderOrderSearch === "true",
    confirmOrderSearchEnablement: body.confirmOrderSearchEnablement === "true",
    confirmMarRemainsOff: body.confirmMarRemainsOff === "true",
    confirmBillingRemainsOff: body.confirmBillingRemainsOff === "true",
    note: body.note ?? "",
  });
}

describe("controlledCatalogMedicationCommitBodySchema", () => {
  const facilityId = "00000000-0000-4000-8000-000000000001";

  it("parses FormData string booleans", () => {
    const parsed = parseCommitFields({
      facilityId,
      enableProviderOrderSearch: "true",
      confirmOrderSearchEnablement: "true",
      confirmMarRemainsOff: "true",
      confirmBillingRemainsOff: "false",
      note: "Approved",
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.enableProviderOrderSearch).toBe(true);
      expect(parsed.data.confirmBillingRemainsOff).toBe(false);
    }
  });

  it("defaults order search flags to false when omitted", () => {
    const parsed = parseCommitFields({ facilityId });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.enableProviderOrderSearch).toBe(false);
    }
  });
});
