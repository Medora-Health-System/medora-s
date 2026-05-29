import { CLINICAL_DOCUMENTATION_CARDS } from "./clinicalDocumentationRegistry.js";
import {
  CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS,
  EDOC_BASIC_STRUCTURED_CARD_ID,
} from "./observationDocumentationPayloads.js";

/**
 * EDOC.2 payload policy (foundation only):
 * - Generic `payloadJson` is allowed ONLY for `edoc_basic_structured_v1`.
 * - EDOC.3+ clinical cards (NIHSS, I&O, PO Challenge, CPR, blood products, sedation, etc.)
 *   MUST register a card-specific Zod (or equivalent) validator before `AVAILABLE`.
 * - Do not save unrestricted payloads for real clinical forms.
 * - EDOC.8A (backlog): smart infusion pump library / guardrail fields — see
 *   `highAlertInfusionDocumentationPayloads.ts` and docs/operations/edoc-8a-smart-infusion-governance-backlog.md.
 */
export const EDOC_GENERIC_PAYLOAD_ALLOWED_CARD_IDS = [EDOC_BASIC_STRUCTURED_CARD_ID] as const;

export function cardHasRegisteredPayloadValidator(cardId: string): boolean {
  return CLINICAL_DOCUMENTATION_CARDS_WITH_PAYLOAD_VALIDATORS.includes(cardId);
}

/**
 * Registry guard: every AVAILABLE card must either be the EDOC.2 basic structured card
 * or have a registered per-card payload validator (EDOC.3+).
 */
export function assertRegistryAvailableCardsHavePayloadValidators(): void {
  const available = CLINICAL_DOCUMENTATION_CARDS.filter((c) => c.implementationStatus === "AVAILABLE");
  for (const card of available) {
    const allowedGeneric = (EDOC_GENERIC_PAYLOAD_ALLOWED_CARD_IDS as readonly string[]).includes(
      card.id
    );
    const hasValidator = cardHasRegisteredPayloadValidator(card.id);
    if (!allowedGeneric && !hasValidator) {
      throw new Error(
        `Clinical documentation card "${card.id}" is AVAILABLE but has no payload validator (EDOC.3 required)`
      );
    }
    if (allowedGeneric && card.id !== EDOC_BASIC_STRUCTURED_CARD_ID) {
      throw new Error(
        `Only ${EDOC_BASIC_STRUCTURED_CARD_ID} may use unrestricted generic payload in EDOC.2`
      );
    }
  }
}

export function listFoundationOnlyCardIds(): string[] {
  return CLINICAL_DOCUMENTATION_CARDS.filter((c) => c.implementationStatus === "FOUNDATION_ONLY").map(
    (c) => c.id
  );
}
