import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface TelemedicineSessionRef {
  sessionId: string;
  patient: DigitalCarePatientRef;
}

export interface TelemedicineContract extends DigitalCareContractDescriptor {
  readonly capability: "telemedicine";
  listSessions(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<readonly TelemedicineSessionRef[]>;
}
