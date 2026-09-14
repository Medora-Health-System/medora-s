export type DigitalCareCapability =
  | "portal"
  | "communication"
  | "notifications"
  | "telemedicine"
  | "education"
  | "questionnaires"
  | "monitoring"
  | "consent"
  | "proxy"
  | "ai";

export interface DigitalCareScope {
  organizationId: string;
  facilityId?: string;
  countryCode?: string;
}

export interface DigitalCareActorContext extends DigitalCareScope {
  actorId: string;
  correlationId?: string;
}

export interface DigitalCarePatientRef extends DigitalCareScope {
  patientId: string;
}

export interface DigitalCareContractDescriptor {
  capability: DigitalCareCapability;
  version: "1";
}
