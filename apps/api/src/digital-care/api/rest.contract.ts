import type { DigitalCareApiOperationContract } from "./digital-care-api.contract";

export const DIGITAL_CARE_REST_V1_PREFIX = "/digital-care/v1" as const;
export const DIGITAL_CARE_PATIENT_SELF_PREFIX = `${DIGITAL_CARE_REST_V1_PREFIX}/me` as const;

export interface DigitalCareRestOperationContract
  extends DigitalCareApiOperationContract {
  readonly transport: "rest";
  readonly method: "GET" | "POST" | "PATCH";
  readonly path: string;
  readonly audience: "patient-self";
}

/**
 * Patient-facing v1 contracts deliberately use a server-resolved `me` scope.
 * A client-supplied patientId must never establish patient ownership.
 * Provider/staff assigned-patient APIs will be specified as a separate surface.
 */
export const DIGITAL_CARE_REST_V1_OPERATIONS = [
  {
    id: "portal.status.get",
    capability: "portal",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/portal`,
    requiredPermissions: ["portal.self.read"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "communication.threads.list",
    capability: "communication",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/conversations`,
    requiredPermissions: ["communication.self.read"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "communication.messages.create",
    capability: "communication",
    transport: "rest",
    kind: "command",
    method: "POST",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/conversations/:threadId/messages`,
    requiredPermissions: ["communication.self.write"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "notifications.list",
    capability: "notifications",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/notifications`,
    requiredPermissions: ["notifications.self.read"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "telemedicine.sessions.list",
    capability: "telemedicine",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/telemedicine-sessions`,
    requiredPermissions: ["telemedicine.self.join"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "education.assignments.list",
    capability: "education",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/education`,
    requiredPermissions: ["education.self.read"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "questionnaires.list",
    capability: "questionnaires",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/questionnaires`,
    requiredPermissions: ["questionnaires.self.read"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "questionnaires.submit",
    capability: "questionnaires",
    transport: "rest",
    kind: "command",
    method: "POST",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/questionnaires/:questionnaireId/responses`,
    requiredPermissions: ["questionnaires.self.submit"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "monitoring.programs.list",
    capability: "monitoring",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/monitoring`,
    requiredPermissions: ["monitoring.self.read"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "consent.list",
    capability: "consent",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/consents`,
    requiredPermissions: ["consent.self.read"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "consent.sign",
    capability: "consent",
    transport: "rest",
    kind: "command",
    method: "POST",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/consents/:consentId/signatures`,
    requiredPermissions: ["consent.self.sign"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "proxy.relationships.list",
    capability: "proxy",
    transport: "rest",
    kind: "query",
    method: "GET",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/proxies`,
    requiredPermissions: ["proxy.self.read"],
    authorizationMode: "all",
    audience: "patient-self",
  },
  {
    id: "ai.assist",
    capability: "ai",
    transport: "rest",
    kind: "command",
    method: "POST",
    path: `${DIGITAL_CARE_PATIENT_SELF_PREFIX}/ai/assist`,
    requiredPermissions: ["ai.self.use"],
    authorizationMode: "all",
    audience: "patient-self",
  },
] as const satisfies readonly DigitalCareRestOperationContract[];
