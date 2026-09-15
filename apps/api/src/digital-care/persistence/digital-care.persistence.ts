export interface DigitalCarePersistentScope {
  organizationId: string;
  facilityId?: string;
  countryCode?: string;
}

export interface DigitalCarePersistentRecord {
  id: string;
  scope: DigitalCarePersistentScope;
  createdAt: string;
  updatedAt: string;
}

export interface PortalState extends DigitalCarePersistentRecord {
  patientId: string;
  status: "active" | "disabled";
}

export interface ConversationState extends DigitalCarePersistentRecord {
  patientId: string;
  threadIds: readonly string[];
  status: "open" | "closed";
}

export interface ThreadState extends DigitalCarePersistentRecord {
  patientId: string;
  conversationId: string;
  participantIds: readonly string[];
}

export interface MessageState extends DigitalCarePersistentRecord {
  patientId: string;
  threadId: string;
  senderId: string;
  bodyRef: string;
  status: "sent" | "delivered" | "read";
}

export interface NotificationState extends DigitalCarePersistentRecord {
  patientId: string;
  category: string;
  status: "pending" | "sent" | "read" | "failed";
}

export interface VideoSessionState extends DigitalCarePersistentRecord {
  patientId: string;
  appointmentId?: string;
  status: "scheduled" | "ready" | "started" | "ended" | "cancelled";
}

export interface EducationAssignmentState extends DigitalCarePersistentRecord {
  patientId: string;
  educationContentId: string;
  status: "assigned" | "opened" | "completed";
}

export interface QuestionnaireAssignmentState extends DigitalCarePersistentRecord {
  patientId: string;
  questionnaireId: string;
  status: "assigned" | "in_progress" | "submitted";
}

export interface ConsentState extends DigitalCarePersistentRecord {
  patientId: string;
  consentDefinitionId: string;
  status: "pending" | "signed" | "revoked" | "expired";
}

export interface ProxyRelationshipState extends DigitalCarePersistentRecord {
  patientId: string;
  proxyActorId: string;
  status: "pending" | "active" | "revoked" | "expired";
}

export type DigitalCarePersistenceObject =
  | PortalState
  | ConversationState
  | ThreadState
  | MessageState
  | NotificationState
  | VideoSessionState
  | EducationAssignmentState
  | QuestionnaireAssignmentState
  | ConsentState
  | ProxyRelationshipState;
