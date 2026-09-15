import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface MonitoringProgramRef {
  programId: string;
  patient: DigitalCarePatientRef;
}

export interface MonitoringContract extends DigitalCareContractDescriptor {
  readonly capability: "monitoring";
  listPrograms(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<readonly MonitoringProgramRef[]>;
}
