import type {
  DigitalCareActorContext,
  DigitalCareContractDescriptor,
  DigitalCarePatientRef,
} from "./shared-contract.types";

export interface NotificationRef {
  notificationId: string;
  patient: DigitalCarePatientRef;
}

export interface NotificationContract extends DigitalCareContractDescriptor {
  readonly capability: "notifications";
  listNotifications(
    patient: DigitalCarePatientRef,
    context: DigitalCareActorContext,
  ): Promise<readonly NotificationRef[]>;
}
