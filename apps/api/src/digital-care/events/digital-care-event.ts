export type DigitalCareEventSource = "patient" | "lab" | "digital-care";

export interface DigitalCareEventScope {
  organizationId: string;
  facilityId?: string;
  countryCode?: string;
}

export interface DigitalCareEventMetadata extends DigitalCareEventScope {
  eventId: string;
  occurredAt: string;
  correlationId?: string;
  source: DigitalCareEventSource;
}

export interface DigitalCareEvent<TName extends string, TPayload> {
  readonly name: TName;
  readonly metadata: DigitalCareEventMetadata;
  readonly payload: Readonly<TPayload>;
}
