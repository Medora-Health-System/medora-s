import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface ConsentRef {
  consentId: string;
  patient: DigitalCarePatientRef;
}

export interface ConsentContract extends DigitalCareContractDescriptor {
  readonly capability: "consent";
  listConsents(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<readonly ConsentRef[]>;
}
