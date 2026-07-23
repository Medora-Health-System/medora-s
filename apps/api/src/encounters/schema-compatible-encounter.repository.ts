/**
 * D4A.2.8-HF1 — Centralized compatibility-aware Encounter projection.
 *
 * Schema compatibility state → encounter repo/projection → census + workspace bootstrap.
 * When HOSPITAL_EPISODE_FOUNDATION_ENABLED is false (pre-D3B), never select/filter/join
 * Encounter.hospitalEpisodeId. Feature flags cannot suppress Prisma SQL generation.
 */

import { Injectable } from "@nestjs/common";
import { EncounterStatus, EncounterType, type Prisma } from "@prisma/client";
import { hospitalEpisodeFoundationEnabledFromProcessEnv } from "@medora/shared";
import { PrismaService } from "../prisma/prisma.service";

const patientWorkspaceSelect = {
  id: true,
  firstName: true,
  lastName: true,
  middleName: true,
  mrn: true,
  dob: true,
  sexAtBirth: true,
  language: true,
  clinicalHistoryProfileJson: true,
  latestVitalsJson: true,
  latestVitalsAt: true,
} as const;

const userNameSelect = {
  firstName: true,
  lastName: true,
} as const;

const patientCensusSelect = {
  id: true,
  firstName: true,
  lastName: true,
  mrn: true,
  dob: true,
  sexAtBirth: true,
} as const;

/** Stable public projection — hospitalEpisodeId is null when foundation is unavailable. */
export type CompatibleEncounterProjection = {
  id: string;
  facilityId: string;
  patientId: string;
  type: EncounterType | string;
  status: EncounterStatus | string;
  admittedAt: Date | null;
  createdAt: Date | null;
  roomLabel: string | null;
  chiefComplaint: string | null;
  admissionSummaryJson: unknown;
  billingClassification: string | null;
  providerDocumentationStatus: string | null;
  physicianAssignedUserId: string | null;
  nurseAssignedUserId: string | null;
  workflowState: string | null;
  hospitalEpisodeId: string | null;
  physicianAssigned: { firstName: string | null; lastName: string | null } | null;
  nurseAssigned: { firstName: string | null; lastName: string | null } | null;
  patient: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    middleName?: string | null;
    mrn: string | null;
    dob: Date | null;
    sexAtBirth: string | null;
    language?: string | null;
    clinicalHistoryProfileJson?: unknown;
    latestVitalsJson?: unknown;
    latestVitalsAt?: Date | null;
  } | null;
  facility: { name: string | null } | null;
};

export function hospitalEpisodeSelectAllowed(
  foundationEnabled: boolean = hospitalEpisodeFoundationEnabledFromProcessEnv()
): boolean {
  return foundationEnabled === true;
}

/** Workspace bootstrap select — never includes hospitalEpisodeId when foundation OFF. */
export function buildWorkspaceBootstrapEncounterSelect(
  foundationEnabled: boolean = hospitalEpisodeFoundationEnabledFromProcessEnv()
): Prisma.EncounterSelect {
  const base: Prisma.EncounterSelect = {
    id: true,
    facilityId: true,
    patientId: true,
    type: true,
    status: true,
    admittedAt: true,
    createdAt: true,
    roomLabel: true,
    chiefComplaint: true,
    admissionSummaryJson: true,
    billingClassification: true,
    providerDocumentationStatus: true,
    physicianAssignedUserId: true,
    nurseAssignedUserId: true,
    workflowState: true,
    physicianAssigned: { select: userNameSelect },
    nurseAssigned: { select: userNameSelect },
    patient: { select: patientWorkspaceSelect },
    facility: { select: { name: true } },
  };
  if (hospitalEpisodeSelectAllowed(foundationEnabled)) {
    return { ...base, hospitalEpisodeId: true };
  }
  return base;
}

/** Census / unit-tree encounter select — pre-D3B safe. */
export function buildHospitalCensusEncounterSelect(
  foundationEnabled: boolean = hospitalEpisodeFoundationEnabledFromProcessEnv()
): Prisma.EncounterSelect {
  const base: Prisma.EncounterSelect = {
    id: true,
    facilityId: true,
    patientId: true,
    type: true,
    status: true,
    admittedAt: true,
    createdAt: true,
    roomLabel: true,
    chiefComplaint: true,
    admissionSummaryJson: true,
    billingClassification: true,
    providerDocumentationStatus: true,
    physicianAssignedUserId: true,
    nurseAssignedUserId: true,
    workflowState: true,
    physicianAssigned: { select: userNameSelect },
    nurseAssigned: { select: userNameSelect },
    patient: { select: patientCensusSelect },
  };
  if (hospitalEpisodeSelectAllowed(foundationEnabled)) {
    return { ...base, hospitalEpisodeId: true };
  }
  return base;
}

export function assertSelectExcludesHospitalEpisodeIdWhenDisabled(
  select: Record<string, unknown>,
  foundationEnabled: boolean
): void {
  if (!foundationEnabled && Object.prototype.hasOwnProperty.call(select, "hospitalEpisodeId")) {
    throw new Error(
      "Encounter select must not include hospitalEpisodeId while hospitalEpisodeFoundationEnabled is false"
    );
  }
}

function mapRowToProjection(
  row: Record<string, unknown>,
  foundationEnabled: boolean
): CompatibleEncounterProjection {
  const hospitalEpisodeId =
    foundationEnabled && "hospitalEpisodeId" in row
      ? ((row.hospitalEpisodeId as string | null | undefined) ?? null)
      : null;

  return {
    id: String(row.id),
    facilityId: String(row.facilityId),
    patientId: String(row.patientId),
    type: row.type as EncounterType | string,
    status: row.status as EncounterStatus | string,
    admittedAt: (row.admittedAt as Date | null | undefined) ?? null,
    createdAt: (row.createdAt as Date | null | undefined) ?? null,
    roomLabel: (row.roomLabel as string | null | undefined) ?? null,
    chiefComplaint: (row.chiefComplaint as string | null | undefined) ?? null,
    admissionSummaryJson: row.admissionSummaryJson,
    billingClassification: (row.billingClassification as string | null | undefined) ?? null,
    providerDocumentationStatus:
      (row.providerDocumentationStatus as string | null | undefined) ?? null,
    physicianAssignedUserId:
      (row.physicianAssignedUserId as string | null | undefined) ?? null,
    nurseAssignedUserId: (row.nurseAssignedUserId as string | null | undefined) ?? null,
    workflowState: (row.workflowState as string | null | undefined) ?? null,
    hospitalEpisodeId,
    physicianAssigned:
      (row.physicianAssigned as CompatibleEncounterProjection["physicianAssigned"]) ?? null,
    nurseAssigned:
      (row.nurseAssigned as CompatibleEncounterProjection["nurseAssigned"]) ?? null,
    patient: (row.patient as CompatibleEncounterProjection["patient"]) ?? null,
    facility: (row.facility as CompatibleEncounterProjection["facility"]) ?? null,
  };
}

@Injectable()
export class SchemaCompatibleEncounterRepository {
  constructor(private readonly prisma: PrismaService) {}

  isHospitalEpisodeFoundationEnabled(): boolean {
    return hospitalEpisodeFoundationEnabledFromProcessEnv();
  }

  /**
   * Facility-scoped encounter load for workspace bootstrap.
   * Never queries Encounter.hospitalEpisodeId when foundation is OFF.
   */
  async findFacilityEncounterForWorkspace(
    facilityId: string,
    encounterId: string
  ): Promise<CompatibleEncounterProjection | null> {
    const fid = String(facilityId ?? "").trim();
    const eid = String(encounterId ?? "").trim();
    if (!fid || !eid) return null;

    const foundationOn = this.isHospitalEpisodeFoundationEnabled();
    const select = buildWorkspaceBootstrapEncounterSelect(foundationOn);
    assertSelectExcludesHospitalEpisodeIdWhenDisabled(
      select as Record<string, unknown>,
      foundationOn
    );

    const row = await this.prisma.encounter.findFirst({
      where: { id: eid, facilityId: fid },
      select,
    });
    if (!row) return null;
    return mapRowToProjection(row as unknown as Record<string, unknown>, foundationOn);
  }

  /**
   * D4A.2.8-HF2 — Load by primary key only (no facility filter).
   * Required so FACILITY_MISMATCH is never collapsed into NOT_FOUND.
   */
  async findEncounterByIdForAuthority(
    encounterId: string
  ): Promise<CompatibleEncounterProjection | null> {
    const eid = String(encounterId ?? "").trim();
    if (!eid) return null;

    const foundationOn = this.isHospitalEpisodeFoundationEnabled();
    const select = buildWorkspaceBootstrapEncounterSelect(foundationOn);
    assertSelectExcludesHospitalEpisodeIdWhenDisabled(
      select as Record<string, unknown>,
      foundationOn
    );

    const row = await this.prisma.encounter.findUnique({
      where: { id: eid },
      select,
    });
    if (!row) return null;
    return mapRowToProjection(row as unknown as Record<string, unknown>, foundationOn);
  }

  /**
   * Open hospital (type=INPATIENT) encounters for census / units / dashboard.
   * Encounter-authoritative; omits hospitalEpisodeId when foundation OFF.
   */
  async findOpenHospitalEncountersForCensus(
    facilityId: string,
    options?: { take?: number }
  ): Promise<CompatibleEncounterProjection[]> {
    const fid = String(facilityId ?? "").trim();
    if (!fid) return [];

    const foundationOn = this.isHospitalEpisodeFoundationEnabled();
    const select = buildHospitalCensusEncounterSelect(foundationOn);
    assertSelectExcludesHospitalEpisodeIdWhenDisabled(
      select as Record<string, unknown>,
      foundationOn
    );

    const take = Math.min(Math.max(options?.take ?? 500, 1), 1000);
    const rows = await this.prisma.encounter.findMany({
      where: {
        facilityId: fid,
        status: EncounterStatus.OPEN,
        type: EncounterType.INPATIENT,
      },
      select,
      orderBy: { createdAt: "desc" },
      take,
    });

    return rows.map((row) =>
      mapRowToProjection(row as unknown as Record<string, unknown>, foundationOn)
    );
  }
}
