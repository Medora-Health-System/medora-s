/**
 * D4A.3.0 / D4A.3.0-H1 — Enterprise Assignment Engine (Nest).
 * D4A.4.1 — Read-only enterprise encounter ownership resolver adapter.
 * Shared service for ED (Encounter columns adapter) and Hospital (independent JSON bag).
 * Assignment never grants chart access. Ownership resolve never audits.
 *
 * Hospital TECHNICIAN / PATIENT_CARE_TECH slot: RoleCode.PATIENT_CARE_TECH only
 * (never LAB / RADIOLOGY).
 */

import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import {
  AuditAction,
  EncounterStatus,
  EncounterWorkflowState,
  Prisma,
  RoleCode,
} from "@prisma/client";
import {
  ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE_CERTIFICATION_ID,
  ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
  applyHospitalAssignmentMutation,
  applyHospitalWorkflowAssignmentMutation,
  emptyHospitalAssignmentBag,
  ensureEmptyHospitalAssignmentOnAdmission,
  mergeHospitalAssignmentBagIntoSummary,
  projectHospitalBoardAssignments,
  readHospitalAssignmentBag,
  resolveActiveEncounterOwnership,
  resolveActiveEncounterOwnershipBatch,
  type ActiveEncounterOwnershipProjection,
  type EnterpriseAssignmentCareSetting,
  type EnterpriseHospitalBoardAssignmentRole,
  type EnterpriseHospitalAssignmentBagV1,
  type EnterpriseWorkflowAssignmentSlot,
  type OwnershipCompatibilityMode,
  type ResolveActiveEncounterOwnershipInput,
} from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/services/audit.service";

export type EnterpriseAssignmentAction = "ASSIGN_ME" | "UNASSIGN" | "REASSIGN";

/** Prisma select for ownership resolve — keep narrow for batch lists. */
const OWNERSHIP_RESOLVE_SELECT = {
  id: true,
  type: true,
  billingClassification: true,
  physicianAssignedUserId: true,
  nurseAssignedUserId: true,
  admissionSummaryJson: true,
} as const;

@Injectable()
export class EnterpriseAssignmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService
  ) {}

  certification() {
    return ENTERPRISE_HOSPITAL_ASSIGNMENT_ENGINE_CERTIFICATION_ID;
  }

  ownershipResolverCertification() {
    return ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID;
  }

  /**
   * D4A.4.1 — Read-only active ownership resolve.
   * SECURITY: Does not grant chart access. Assignment ≠ authorization.
   * AUDIT: Never logs — resolution is not a clinical write.
   * PERFORMANCE: Prefer resolveActiveEncounterOwnershipBatch for lists.
   */
  async resolveActiveEncounterOwnership(input: {
    facilityId: string;
    encounterId: string;
    compatibilityMode?: OwnershipCompatibilityMode;
  }): Promise<{
    certification: typeof ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID;
    encounterId: string;
    projection: ActiveEncounterOwnershipProjection;
  }> {
    const facilityId = String(input.facilityId ?? "").trim();
    const encounterId = String(input.encounterId ?? "").trim();
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: OWNERSHIP_RESOLVE_SELECT,
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    // No audit.log — ownership resolve is read-only.
    const projection = resolveActiveEncounterOwnership(
      this.toOwnershipInput(enc, input.compatibilityMode)
    );
    return {
      certification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
      encounterId: enc.id,
      projection,
    };
  }

  /**
   * Batch-compatible ownership resolve for future MAR / task-center consumers.
   * Pattern: one facility-scoped findMany → shared pure map (no N+1, no audit).
   */
  async resolveActiveEncounterOwnershipBatch(input: {
    facilityId: string;
    encounterIds: readonly string[];
    compatibilityMode?: OwnershipCompatibilityMode;
  }): Promise<{
    certification: typeof ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID;
    results: Array<{
      encounterId: string;
      projection: ActiveEncounterOwnershipProjection;
    }>;
  }> {
    const facilityId = String(input.facilityId ?? "").trim();
    const ids = [...new Set(input.encounterIds.map((id) => String(id ?? "").trim()).filter(Boolean))];
    if (ids.length === 0) {
      return {
        certification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
        results: [],
      };
    }
    const rows = await this.prisma.encounter.findMany({
      where: { facilityId, id: { in: ids } },
      select: OWNERSHIP_RESOLVE_SELECT,
    });
    // No audit.log — batch ownership resolve is read-only.
    const byId = new Map(rows.map((r) => [r.id, r]));
    const projections = resolveActiveEncounterOwnershipBatch(
      ids.map((id) => {
        const row = byId.get(id);
        if (!row) {
          return {
            type: null,
            compatibilityMode: input.compatibilityMode,
          } satisfies ResolveActiveEncounterOwnershipInput;
        }
        return this.toOwnershipInput(row, input.compatibilityMode);
      })
    );
    return {
      certification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
      results: ids.map((encounterId, i) => ({
        encounterId,
        projection: projections[i]!,
      })),
    };
  }

  private toOwnershipInput(
    enc: {
      type: string;
      billingClassification?: string | null;
      physicianAssignedUserId: string | null;
      nurseAssignedUserId: string | null;
      admissionSummaryJson: unknown;
    },
    compatibilityMode?: OwnershipCompatibilityMode
  ): ResolveActiveEncounterOwnershipInput {
    return {
      type: enc.type,
      billingClassification: enc.billingClassification ?? null,
      physicianAssignedUserId: enc.physicianAssignedUserId,
      nurseAssignedUserId: enc.nurseAssignedUserId,
      admissionSummaryJson: enc.admissionSummaryJson,
      compatibilityMode,
    };
  }

  /**
   * Seed empty hospital assignment bag at admission / receiving create.
   * Never copies ED physicianAssigned / nurseAssigned.
   */
  seedEmptyHospitalAssignmentSummary(
    admissionSummaryJson: unknown,
    careSetting: "OBSERVATION" | "INPATIENT"
  ): Record<string, unknown> {
    return ensureEmptyHospitalAssignmentOnAdmission(admissionSummaryJson, careSetting);
  }

  async getHospitalBoardProjection(facilityId: string, encounterId: string) {
    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: { id: true, type: true, admissionSummaryJson: true },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    const bag = readHospitalAssignmentBag(enc.admissionSummaryJson);
    return {
      certification: this.certification(),
      encounterId: enc.id,
      careSetting: bag?.careSetting ?? this.resolveHospitalCareSetting(enc),
      projection: projectHospitalBoardAssignments(bag),
      bag,
    };
  }

  /**
   * Hospital-lane assign / unassign / reassign for PROVIDER | NURSE | TECHNICIAN
   * (board categories → PRIMARY_PROVIDER | PRIMARY_RN | PATIENT_CARE_TECH).
   */
  async mutateHospitalAssignment(input: {
    facilityId: string;
    encounterId: string;
    actorUserId: string;
    role: EnterpriseHospitalBoardAssignmentRole;
    action: EnterpriseAssignmentAction;
    /** Required for REASSIGN when assigning another user. */
    targetUserId?: string | null;
    ip?: string;
    userAgent?: string;
  }) {
    const facilityId = String(input.facilityId ?? "").trim();
    const encounterId = String(input.encounterId ?? "").trim();
    const actorUserId = String(input.actorUserId ?? "").trim();
    const role = input.role;

    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        status: true,
        workflowState: true,
        type: true,
        version: true,
        admissionSummaryJson: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.status !== EncounterStatus.OPEN) {
      throw new BadRequestException(
        "L'attribution n'est possible que sur une consultation ouverte."
      );
    }
    if (enc.workflowState === EncounterWorkflowState.CLOSED) {
      throw new BadRequestException(
        "L'attribution n'est possible que sur une consultation ouverte."
      );
    }

    await this.assertRoleForHospitalSlot(facilityId, actorUserId, role, input.action);

    const careSetting = this.resolveHospitalCareSetting(enc);
    let bag: EnterpriseHospitalAssignmentBagV1 =
      readHospitalAssignmentBag(enc.admissionSummaryJson) ?? emptyHospitalAssignmentBag(careSetting);
    if (bag.careSetting !== careSetting) {
      bag = { ...bag, careSetting };
    }

    let nextUserId: string | null = null;
    let source: "SELF_ASSIGN" | "REASSIGN" | "UNASSIGN" = "SELF_ASSIGN";
    if (input.action === "UNASSIGN") {
      nextUserId = null;
      source = "UNASSIGN";
    } else if (input.action === "REASSIGN") {
      nextUserId = String(input.targetUserId ?? "").trim() || actorUserId;
      source = "REASSIGN";
      if (nextUserId !== actorUserId) {
        await this.assertRoleForHospitalSlot(facilityId, nextUserId, role, "ASSIGN_ME");
      }
    } else {
      nextUserId = actorUserId;
      source = "SELF_ASSIGN";
    }

    const displayName = nextUserId ? await this.resolveUserDisplayName(nextUserId) : null;
    const previousUserId =
      role === "PROVIDER"
        ? bag.workflow?.PRIMARY_PROVIDER?.userId ?? bag.slots?.PROVIDER?.userId ?? null
        : role === "NURSE"
          ? bag.workflow?.PRIMARY_RN?.userId ?? bag.slots?.NURSE?.userId ?? null
          : bag.workflow?.PATIENT_CARE_TECH?.userId ?? bag.slots?.TECHNICIAN?.userId ?? null;
    if (previousUserId === nextUserId) {
      return {
        certification: this.certification(),
        encounterId: enc.id,
        role,
        unchanged: true,
        projection: projectHospitalBoardAssignments(bag),
      };
    }

    const nextBag = applyHospitalAssignmentMutation(bag, {
      role,
      actorUserId,
      nextUserId,
      source,
      displayName,
    });
    const nextSummary = mergeHospitalAssignmentBagIntoSummary(enc.admissionSummaryJson, nextBag);

    const u = await this.prisma.encounter.updateMany({
      where: { id: encounterId, facilityId, version: enc.version },
      data: {
        admissionSummaryJson: nextSummary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    if (u.count === 0) {
      throw new BadRequestException("Concurrent modification — retry assignment.");
    }

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        source: "ENTERPRISE_HOSPITAL_ASSIGNMENT",
        certification: this.certification(),
        careSetting,
        role,
        workflowSlot:
          role === "PROVIDER"
            ? "PRIMARY_PROVIDER"
            : role === "NURSE"
              ? "PRIMARY_RN"
              : "PATIENT_CARE_TECH",
        action: input.action,
        assignedUserId: nextUserId,
        previousUserId,
        // no PHI
      },
    });

    return {
      certification: this.certification(),
      encounterId: enc.id,
      role,
      unchanged: false,
      projection: projectHospitalBoardAssignments(nextBag),
    };
  }

  /**
   * Optional workflow-slot mutation (covering / break / charge) — same bag, no duplicate SOT.
   * Covering does not overwrite clinical attending or PRIMARY_PROVIDER.
   */
  async mutateHospitalWorkflowSlot(input: {
    facilityId: string;
    encounterId: string;
    actorUserId: string;
    slot: EnterpriseWorkflowAssignmentSlot;
    action: EnterpriseAssignmentAction;
    targetUserId?: string | null;
    ip?: string;
    userAgent?: string;
  }) {
    const boardRole =
      input.slot === "PRIMARY_PROVIDER" || input.slot === "COVERING_PROVIDER"
        ? ("PROVIDER" as const)
        : input.slot === "PRIMARY_RN" ||
            input.slot === "BREAK_RN" ||
            input.slot === "CHARGE_RN"
          ? ("NURSE" as const)
          : ("TECHNICIAN" as const);

    if (
      input.slot === "PRIMARY_PROVIDER" ||
      input.slot === "PRIMARY_RN" ||
      input.slot === "PATIENT_CARE_TECH"
    ) {
      return this.mutateHospitalAssignment({
        ...input,
        role: boardRole,
      });
    }

    const facilityId = String(input.facilityId ?? "").trim();
    const encounterId = String(input.encounterId ?? "").trim();
    const actorUserId = String(input.actorUserId ?? "").trim();

    const enc = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        status: true,
        workflowState: true,
        type: true,
        version: true,
        admissionSummaryJson: true,
      },
    });
    if (!enc) throw new NotFoundException("Encounter not found");
    if (enc.status !== EncounterStatus.OPEN) {
      throw new BadRequestException(
        "L'attribution n'est possible que sur une consultation ouverte."
      );
    }
    if (enc.workflowState === EncounterWorkflowState.CLOSED) {
      throw new BadRequestException(
        "L'attribution n'est possible que sur une consultation ouverte."
      );
    }

    await this.assertRoleForHospitalSlot(facilityId, actorUserId, boardRole, input.action);

    const careSetting = this.resolveHospitalCareSetting(enc);
    let bag: EnterpriseHospitalAssignmentBagV1 =
      readHospitalAssignmentBag(enc.admissionSummaryJson) ?? emptyHospitalAssignmentBag(careSetting);

    let nextUserId: string | null = null;
    let source: "SELF_ASSIGN" | "REASSIGN" | "UNASSIGN" = "SELF_ASSIGN";
    if (input.action === "UNASSIGN") {
      nextUserId = null;
      source = "UNASSIGN";
    } else if (input.action === "REASSIGN") {
      nextUserId = String(input.targetUserId ?? "").trim() || actorUserId;
      source = "REASSIGN";
      if (nextUserId !== actorUserId) {
        await this.assertRoleForHospitalSlot(facilityId, nextUserId, boardRole, "ASSIGN_ME");
      }
    } else {
      nextUserId = actorUserId;
      source = "SELF_ASSIGN";
    }

    const displayName = nextUserId ? await this.resolveUserDisplayName(nextUserId) : null;
    const previousPrimary =
      input.slot === "COVERING_PROVIDER"
        ? bag.workflow?.PRIMARY_PROVIDER?.userId ?? null
        : input.slot === "BREAK_RN" || input.slot === "CHARGE_RN"
          ? bag.workflow?.PRIMARY_RN?.userId ?? null
          : null;
    const clinicalAttendingBefore = bag.clinical?.attendingProviderUserId ?? null;

    const nextBag = applyHospitalWorkflowAssignmentMutation(bag, {
      slot: input.slot,
      actorUserId,
      nextUserId,
      source,
      displayName,
    });

    // Invariants: covering/break/charge must not replace primary or attending.
    if (input.slot === "COVERING_PROVIDER") {
      if (
        (nextBag.workflow.PRIMARY_PROVIDER?.userId ?? null) !== previousPrimary ||
        (nextBag.clinical.attendingProviderUserId ?? null) !== clinicalAttendingBefore
      ) {
        throw new BadRequestException(
          "Covering provider must not overwrite primary provider or clinical attending."
        );
      }
    }
    if (input.slot === "BREAK_RN" || input.slot === "CHARGE_RN") {
      if ((nextBag.workflow.PRIMARY_RN?.userId ?? null) !== previousPrimary) {
        throw new BadRequestException("Break/charge RN must not replace primary RN.");
      }
    }

    const nextSummary = mergeHospitalAssignmentBagIntoSummary(enc.admissionSummaryJson, nextBag);
    const u = await this.prisma.encounter.updateMany({
      where: { id: encounterId, facilityId, version: enc.version },
      data: {
        admissionSummaryJson: nextSummary as Prisma.InputJsonValue,
        version: { increment: 1 },
      },
    });
    if (u.count === 0) {
      throw new BadRequestException("Concurrent modification — retry assignment.");
    }

    await this.audit.log(AuditAction.ENCOUNTER_UPDATE, "ENCOUNTER", {
      userId: actorUserId,
      facilityId,
      patientId: enc.patientId,
      encounterId: enc.id,
      entityId: enc.id,
      ip: input.ip,
      userAgent: input.userAgent,
      metadata: {
        source: "ENTERPRISE_HOSPITAL_ASSIGNMENT",
        certification: this.certification(),
        careSetting,
        workflowSlot: input.slot,
        action: input.action,
        assignedUserId: nextUserId,
        // no PHI
      },
    });

    return {
      certification: this.certification(),
      encounterId: enc.id,
      slot: input.slot,
      unchanged: false,
      projection: projectHospitalBoardAssignments(nextBag),
      bag: nextBag,
    };
  }

  /**
   * ED adapter — preserves Phase 10A column writes; used by EncountersService wrappers.
   * Isolated from hospital bag; careSetting EMERGENCY only.
   */
  async mutateEmergencySelfAssignment(input: {
    kind: "provider" | "nurse";
    facilityId: string;
    encounterId: string;
    actorUserId: string;
    ip?: string;
    userAgent?: string;
  }): Promise<{
    previousUserId: string | null;
    unchanged: boolean;
    encounterId: string;
    patientId: string;
    version: number;
  }> {
    const { kind, facilityId, encounterId, actorUserId } = input;
    const encounter = await this.prisma.encounter.findFirst({
      where: { id: encounterId, facilityId },
      select: {
        id: true,
        patientId: true,
        status: true,
        workflowState: true,
        version: true,
        physicianAssignedUserId: true,
        nurseAssignedUserId: true,
      },
    });
    if (!encounter) throw new NotFoundException("Encounter not found");
    if (encounter.status !== EncounterStatus.OPEN) {
      throw new BadRequestException(
        "L'attribution n'est possible que sur une consultation ouverte."
      );
    }
    if (encounter.workflowState === EncounterWorkflowState.CLOSED) {
      throw new BadRequestException(
        "L'attribution n'est possible que sur une consultation ouverte."
      );
    }

    if (kind === "provider") {
      await this.assertProviderAtFacility(facilityId, actorUserId);
    } else {
      await this.assertRnAtFacility(facilityId, actorUserId);
    }

    const previousUserId =
      kind === "provider"
        ? encounter.physicianAssignedUserId ?? null
        : encounter.nurseAssignedUserId ?? null;

    if (previousUserId === actorUserId) {
      return {
        previousUserId,
        unchanged: true,
        encounterId: encounter.id,
        patientId: encounter.patientId,
        version: encounter.version,
      };
    }

    const now = new Date();
    const updateData: Prisma.EncounterUncheckedUpdateManyInput =
      kind === "provider"
        ? {
            physicianAssignedUserId: actorUserId,
            physicianAssignedAt: now,
            version: { increment: 1 },
          }
        : {
            nurseAssignedUserId: actorUserId,
            nurseAssignedAt: now,
            version: { increment: 1 },
          };

    const u = await this.prisma.encounter.updateMany({
      where: { id: encounterId, facilityId, version: encounter.version },
      data: updateData,
    });
    if (u.count === 0) {
      throw new BadRequestException("Concurrent modification — retry assignment.");
    }

    await this.audit.log(
      kind === "provider"
        ? AuditAction.ENCOUNTER_ASSIGN_PROVIDER
        : AuditAction.ENCOUNTER_ASSIGN_NURSE,
      "ENCOUNTER",
      {
        userId: actorUserId,
        facilityId,
        patientId: encounter.patientId,
        encounterId: encounter.id,
        entityId: encounter.id,
        ip: input.ip,
        userAgent: input.userAgent,
        metadata: {
          source: "SELF_ASSIGN" as const,
          kind,
          engine: this.certification(),
          careSetting: "EMERGENCY" satisfies EnterpriseAssignmentCareSetting,
          ...(kind === "provider"
            ? {
                assignedProviderUserId: actorUserId,
                previousProviderUserId: previousUserId,
              }
            : {
                assignedNurseUserId: actorUserId,
                previousNurseUserId: previousUserId,
              }),
        },
      }
    );

    return {
      previousUserId,
      unchanged: false,
      encounterId: encounter.id,
      patientId: encounter.patientId,
      version: encounter.version + 1,
    };
  }

  private resolveHospitalCareSetting(enc: {
    type?: string | null;
    admissionSummaryJson?: unknown;
  }): "OBSERVATION" | "INPATIENT" {
    const existing = readHospitalAssignmentBag(enc.admissionSummaryJson);
    if (existing) return existing.careSetting;
    if (
      enc.admissionSummaryJson &&
      typeof enc.admissionSummaryJson === "object" &&
      !Array.isArray(enc.admissionSummaryJson)
    ) {
      const req = String(
        (enc.admissionSummaryJson as Record<string, unknown>).requestedEncounterType ?? ""
      ).toUpperCase();
      if (req === "OBSERVATION" || req.includes("OBS")) return "OBSERVATION";
    }
    return "INPATIENT";
  }

  private async resolveUserDisplayName(userId: string): Promise<string | null> {
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { firstName: true, lastName: true },
    });
    if (!u) return null;
    const name = [u.firstName, u.lastName].filter(Boolean).join(" ").trim();
    return name || null;
  }

  private async assertRoleForHospitalSlot(
    facilityId: string,
    userId: string,
    role: EnterpriseHospitalBoardAssignmentRole,
    action: EnterpriseAssignmentAction
  ) {
    if (action === "UNASSIGN") {
      const admin = await this.prisma.userRole.findFirst({
        where: {
          userId,
          facilityId,
          isActive: true,
          role: { code: { in: [RoleCode.ADMIN, RoleCode.MEDORA_SUPER_ADMIN] } },
        },
      });
      if (admin) return;
    }
    if (role === "PROVIDER") return this.assertProviderAtFacility(facilityId, userId);
    if (role === "NURSE") return this.assertRnAtFacility(facilityId, userId);
    return this.assertPatientCareTechAtFacility(facilityId, userId);
  }

  private async assertProviderAtFacility(facilityId: string, userId: string) {
    const row = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId,
        isActive: true,
        role: { code: { in: [RoleCode.PROVIDER, RoleCode.ADMIN] } },
      },
    });
    if (!row) {
      throw new BadRequestException("Provider role required at this facility.");
    }
  }

  private async assertRnAtFacility(facilityId: string, userId: string) {
    const row = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId,
        isActive: true,
        role: { code: { in: [RoleCode.RN, RoleCode.ADMIN] } },
      },
    });
    if (!row) {
      throw new BadRequestException("Nurse role required at this facility.");
    }
  }

  /** Hospital care-tech only — never LAB / RADIOLOGY. */
  private async assertPatientCareTechAtFacility(facilityId: string, userId: string) {
    const row = await this.prisma.userRole.findFirst({
      where: {
        userId,
        facilityId,
        isActive: true,
        role: {
          code: { in: [RoleCode.PATIENT_CARE_TECH, RoleCode.ADMIN] },
        },
      },
    });
    if (!row) {
      throw new BadRequestException(
        "Patient care technician role required at this facility."
      );
    }
  }
}
