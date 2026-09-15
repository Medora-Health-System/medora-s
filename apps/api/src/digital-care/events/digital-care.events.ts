import type { DigitalCareEvent } from "./digital-care-event";

export type PatientRegisteredEvent = DigitalCareEvent<
  "PatientRegistered",
  { patientId: string }
>;

export type PatientActivatedEvent = DigitalCareEvent<
  "PatientActivated",
  { patientId: string }
>;

export type PatientDisabledEvent = DigitalCareEvent<
  "PatientDisabled",
  { patientId: string; reasonCode?: string }
>;

export type LabReleasedEvent = DigitalCareEvent<
  "LabReleased",
  { patientId: string; labResultId: string; encounterId?: string }
>;

export type ConversationCreatedEvent = DigitalCareEvent<
  "ConversationCreated",
  { patientId: string; threadId: string }
>;

export type ConversationRepliedEvent = DigitalCareEvent<
  "ConversationReplied",
  { patientId: string; threadId: string; messageId: string }
>;

export type VideoStartedEvent = DigitalCareEvent<
  "VideoStarted",
  { patientId: string; sessionId: string }
>;

export type NotificationSentEvent = DigitalCareEvent<
  "NotificationSent",
  { patientId: string; notificationId: string }
>;

export type EducationAssignedEvent = DigitalCareEvent<
  "EducationAssigned",
  { patientId: string; assignmentId: string }
>;

export type ConsentSignedEvent = DigitalCareEvent<
  "ConsentSigned",
  { patientId: string; consentId: string; signerId: string }
>;

export type DigitalCareSharedEvent =
  | PatientRegisteredEvent
  | PatientActivatedEvent
  | PatientDisabledEvent
  | LabReleasedEvent
  | ConversationCreatedEvent
  | ConversationRepliedEvent
  | VideoStartedEvent
  | NotificationSentEvent
  | EducationAssignedEvent
  | ConsentSignedEvent;

export type DigitalCareSharedEventName = DigitalCareSharedEvent["name"];
