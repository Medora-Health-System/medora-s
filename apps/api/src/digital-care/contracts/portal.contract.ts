import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface PortalStatusSnapshot {
  patient: DigitalCarePatientRef;
  active: boolean;
}

export interface PortalContract extends DigitalCareContractDescriptor {
  readonly capability: "portal";
  getStatus(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<PortalStatusSnapshot>;
}
