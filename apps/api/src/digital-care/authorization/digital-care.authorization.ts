import type { DigitalCarePermission } from "./digital-care.permissions";
import type { DigitalCareRole } from "./digital-care.roles";

export interface DigitalCareAuthorizationScope {
  organizationId: string;
  facilityId?: string;
  countryCode?: string;
}

export interface DigitalCareAuthorizationSubject {
  actorId: string;
  centralRoleCodes: readonly string[];
  digitalCareRoles: readonly DigitalCareRole[];
  scope: DigitalCareAuthorizationScope;
}

export interface DigitalCareAuthorizationResource {
  patientId?: string;
  scope: DigitalCareAuthorizationScope;
}

export interface DigitalCareAuthorizationRequirement {
  permission: DigitalCarePermission;
  resource: DigitalCareAuthorizationResource;
  delegatedPatientId?: string;
  assignmentId?: string;
}

export interface DigitalCareAuthorizationDecision {
  allowed: boolean;
  reasonCode: string;
}

/**
 * Contract only. The implementation must delegate to Medora's central
 * authentication/authorization and scope enforcement rather than creating
 * a Digital Care-specific credential or role store.
 */
export interface DigitalCareAuthorizationContract {
  authorize(
    subject: DigitalCareAuthorizationSubject,
    requirement: DigitalCareAuthorizationRequirement,
  ): Promise<DigitalCareAuthorizationDecision>;
}
