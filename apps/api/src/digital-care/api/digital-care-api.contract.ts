import type { DigitalCarePermission } from "../authorization";
import type { DigitalCareCapability } from "../contracts";

export type DigitalCareApiTransport =
  | "rest"
  | "graphql"
  | "websocket"
  | "push"
  | "fhir";

export type DigitalCareApiOperationKind = "query" | "command" | "subscription";

export interface DigitalCareApiOperationContract {
  readonly id: string;
  readonly capability: DigitalCareCapability;
  readonly transport: DigitalCareApiTransport;
  readonly kind: DigitalCareApiOperationKind;
  readonly requiredPermissions: readonly DigitalCarePermission[];
  readonly authorizationMode: "all" | "any";
}
