import { DIGITAL_CARE_BOUNDED_CONTEXT } from "../domain/bounded-context";

export const DIGITAL_CARE_CONTEXT_CONTRACT = {
  name: DIGITAL_CARE_BOUNDED_CONTEXT.name,
  displayName: DIGITAL_CARE_BOUNDED_CONTEXT.displayName,
  futureCapabilities: DIGITAL_CARE_BOUNDED_CONTEXT.futureCapabilities,
} as const;

export type DigitalCareContextContract = typeof DIGITAL_CARE_CONTEXT_CONTRACT;
