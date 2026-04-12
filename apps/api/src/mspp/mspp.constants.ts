import { MsppRoleCode } from "@prisma/client";

/**
 * Roles that may see all geo departments (national scope; not `MSPP_VALIDATOR_DEPT`).
 */
export const NATIONAL_MSPP_ROLES: readonly MsppRoleCode[] = [
  MsppRoleCode.MSPP_MINISTRE,
  MsppRoleCode.MSPP_EPIDEMIOLOGIE,
  MsppRoleCode.MSPP_VALIDATOR_CENTRAL,
];

/**
 * Application workflow constants for `DiseaseCaseReview.status` (string column).
 * All MSPP routes assume reviews use these values consistently.
 */
export const DiseaseCaseReviewStatus = {
  PENDING_DEPARTMENT: "PENDING_DEPARTMENT",
  DEPARTMENT_APPROVED: "DEPARTMENT_APPROVED",
  DEPARTMENT_REJECTED: "DEPARTMENT_REJECTED",
  PENDING_CENTRAL: "PENDING_CENTRAL",
  CENTRAL_APPROVED: "CENTRAL_APPROVED",
  CENTRAL_REJECTED: "CENTRAL_REJECTED",
} as const;

export type DiseaseCaseReviewStatusValue = (typeof DiseaseCaseReviewStatus)[keyof typeof DiseaseCaseReviewStatus];

export const ReviewerLevel = {
  DEPARTMENT: "DEPARTMENT",
  CENTRAL: "CENTRAL",
} as const;

/** Append-only audit actions for `MsppReviewAuditEvent.action`. */
export const MsppReviewAuditAction = {
  DEPARTMENT_APPROVE: "DEPARTMENT_APPROVE",
  DEPARTMENT_REJECT: "DEPARTMENT_REJECT",
  CENTRAL_APPROVE: "CENTRAL_APPROVE",
  CENTRAL_REJECT: "CENTRAL_REJECT",
  DEPARTMENT_REQUEUE: "DEPARTMENT_REQUEUE",
  CENTRAL_REQUEUE: "CENTRAL_REQUEUE",
} as const;

export type MsppReviewAuditActionValue =
  (typeof MsppReviewAuditAction)[keyof typeof MsppReviewAuditAction];
