/**
 * MEDUI.D4A.4.2 — Nest helpers for MAR / pass-queue ownership filters.
 *
 * Loads OPEN encounters once, resolves nursing ownership via shared D4A.4.1/4.2
 * pure functions (no audit, no writes, no N+1).
 */
import {
  collectMarNursingAssigneeEncounterIds,
  resolveMarNursingOwnership,
  resolveMarOwnershipCompatibilityMode,
  type MarOwnershipEncounterFields,
} from "@medora/shared";
import type { PrismaService } from "../prisma/prisma.service";

export const MAR_OWNERSHIP_ENCOUNTER_SELECT = {
  id: true,
  type: true,
  billingClassification: true,
  physicianAssignedUserId: true,
  nurseAssignedUserId: true,
  admissionSummaryJson: true,
} as const;

export type MarOwnershipEncounterRow = {
  id: string;
  type: string;
  billingClassification?: string | null;
  physicianAssignedUserId: string | null;
  nurseAssignedUserId: string | null;
  admissionSummaryJson: unknown;
};

export function marOwnershipCompatibilityModeFromEnv(): ReturnType<
  typeof resolveMarOwnershipCompatibilityMode
> {
  return resolveMarOwnershipCompatibilityMode(
    process.env.ENTERPRISE_OWNERSHIP_COMPATIBILITY_MODE
  );
}

export function toMarOwnershipEncounterFields(
  enc: Omit<MarOwnershipEncounterRow, "id">,
  compatibilityMode = marOwnershipCompatibilityModeFromEnv()
): MarOwnershipEncounterFields {
  return {
    type: enc.type,
    billingClassification: enc.billingClassification ?? null,
    physicianAssignedUserId: enc.physicianAssignedUserId,
    nurseAssignedUserId: enc.nurseAssignedUserId,
    admissionSummaryJson: enc.admissionSummaryJson,
    compatibilityMode,
  };
}

export function resolveMarAssignedNurseUserIdFromEncounter(
  enc: Omit<MarOwnershipEncounterRow, "id">
): string | null {
  return resolveMarNursingOwnership(toMarOwnershipEncounterFields(enc)).assignedNurseUserId;
}

/**
 * Facility-wide assignee filter: encounter ids owned by nurse under D4A.4.2 policy.
 * Returns null when no assignee filter should apply.
 * Returns [] when assignee is set but no matching OPEN encounters.
 */
export async function resolveMarAssigneeEncounterIds(
  prisma: PrismaService,
  facilityId: string,
  assignedToUserId: string | undefined
): Promise<string[] | null> {
  const assignee = assignedToUserId?.trim();
  if (!assignee) return null;

  const encounters = await prisma.encounter.findMany({
    where: { facilityId, status: "OPEN" },
    select: MAR_OWNERSHIP_ENCOUNTER_SELECT,
  });

  const mode = marOwnershipCompatibilityModeFromEnv();
  return collectMarNursingAssigneeEncounterIds(
    encounters.map((enc) => ({
      ...toMarOwnershipEncounterFields(enc, mode),
      id: enc.id,
    })),
    assignee,
    mode
  );
}
