import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface ProxyRelationshipRef {
  proxyRelationshipId: string;
  patient: DigitalCarePatientRef;
}

export interface ProxyContract extends DigitalCareContractDescriptor {
  readonly capability: "proxy";
  listRelationships(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<readonly ProxyRelationshipRef[]>;
}
