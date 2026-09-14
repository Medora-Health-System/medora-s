import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface PatientAiContextRef {
  patient: DigitalCarePatientRef;
  contextVersion: string;
}

export interface AiContract extends DigitalCareContractDescriptor {
  readonly capability: "ai";
  getPatientContext(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<PatientAiContextRef>;
}
