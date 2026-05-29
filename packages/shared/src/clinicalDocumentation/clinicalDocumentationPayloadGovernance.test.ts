import { describe, expect, it } from "vitest";
import {
  assertClinicalDocumentationEntryCreateAllowed,
  clinicalDocumentationEntryCreateDtoSchema,
  EDOC_BASIC_STRUCTURED_CARD_ID,
} from "./clinicalDocumentationEntry.js";
import { getClinicalDocumentationCardById } from "./clinicalDocumentationRegistry.js";
import {
  assertRegistryAvailableCardsHavePayloadValidators,
  cardHasRegisteredPayloadValidator,
  EDOC_GENERIC_PAYLOAD_ALLOWED_CARD_IDS,
  listFoundationOnlyCardIds,
} from "./clinicalDocumentationPayloadGovernance.js";

describe("clinicalDocumentationPayloadGovernance (EDOC.2A)", () => {
  it("only the EDOC.2 basic card may use generic payload in AVAILABLE registry", () => {
    expect(EDOC_GENERIC_PAYLOAD_ALLOWED_CARD_IDS).toEqual([EDOC_BASIC_STRUCTURED_CARD_ID]);
    expect(() => assertRegistryAvailableCardsHavePayloadValidators()).not.toThrow();
    expect(cardHasRegisteredPayloadValidator(EDOC_BASIC_STRUCTURED_CARD_ID)).toBe(true);
    expect(cardHasRegisteredPayloadValidator("score_nihss")).toBe(false);
    expect(cardHasRegisteredPayloadValidator("io_intake_output")).toBe(false);
  });

  it("foundation-only cards cannot be saved", () => {
    const foundationId = listFoundationOnlyCardIds()[0];
    expect(foundationId).toBeTruthy();
    const card = getClinicalDocumentationCardById(foundationId);
    expect(card?.implementationStatus).toBe("FOUNDATION_ONLY");
    const parsed = clinicalDocumentationEntryCreateDtoSchema.parse({
      category: card!.category,
      cardId: foundationId,
      payloadJson: { items: [{ key: "x", value: "y" }] },
    });
    expect(() => assertClinicalDocumentationEntryCreateAllowed(parsed)).toThrow(/not available for save/);
  });

  it("rejects unknown cardId", () => {
    const parsed = clinicalDocumentationEntryCreateDtoSchema.parse({
      category: "OBSERVATION_DOCUMENTATION",
      cardId: "not_registered_card",
      payloadJson: { items: [{ key: "x", value: "y" }] },
    });
    expect(() => assertClinicalDocumentationEntryCreateAllowed(parsed)).toThrow(/Unknown/);
  });

  it("rejects category/card mismatch", () => {
    const parsed = clinicalDocumentationEntryCreateDtoSchema.parse({
      category: "FLOWSHEETS",
      cardId: EDOC_BASIC_STRUCTURED_CARD_ID,
      payloadJson: { items: [{ key: "x", value: "y" }] },
    });
    expect(() => assertClinicalDocumentationEntryCreateAllowed(parsed)).toThrow(/Category/);
  });
});
