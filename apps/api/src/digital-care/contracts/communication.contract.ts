import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface CommunicationThreadRef {
  threadId: string;
  patient: DigitalCarePatientRef;
}

export interface CommunicationContract extends DigitalCareContractDescriptor {
  readonly capability: "communication";
  listThreads(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<readonly CommunicationThreadRef[]>;
}
