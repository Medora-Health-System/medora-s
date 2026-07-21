/**
 * Shared Encounter loaders — always use explicit contracts (never bare / include-only).
 * MEDORA.P0.ENCOUNTER_SHARED_QUERY_HARDENING
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import {
  ENCOUNTER_ACCESS_SELECT,
  ENCOUNTER_CORE_SELECT,
  ENCOUNTER_DETAIL_SELECT,
  ENCOUNTER_DISPOSITION_SELECT,
  ENCOUNTER_MEDICATION_SELECT,
  ENCOUNTER_TRIAGE_SELECT,
} from "./encounter-query-contracts";

type Db = Pick<PrismaClient, "encounter">;

export async function loadEncounterCore(
  db: Db,
  facilityId: string,
  encounterId: string
) {
  return db.encounter.findFirst({
    where: { id: encounterId, facilityId },
    select: ENCOUNTER_CORE_SELECT,
  });
}

export async function loadEncounterAccess(
  db: Db,
  facilityId: string,
  encounterId: string
) {
  return db.encounter.findFirst({
    where: { id: encounterId, facilityId },
    select: ENCOUNTER_ACCESS_SELECT,
  });
}

export async function loadEncounterDetail(
  db: Db,
  facilityId: string,
  encounterId: string
) {
  return db.encounter.findFirst({
    where: { id: encounterId, facilityId },
    select: ENCOUNTER_DETAIL_SELECT,
  });
}

export async function loadEncounterDisposition(
  db: Db,
  facilityId: string,
  encounterId: string
) {
  return db.encounter.findFirst({
    where: { id: encounterId, facilityId },
    select: ENCOUNTER_DISPOSITION_SELECT,
  });
}

export async function loadEncounterTriageGate(
  db: Db,
  facilityId: string,
  encounterId: string
) {
  return db.encounter.findFirst({
    where: { id: encounterId, facilityId },
    select: ENCOUNTER_TRIAGE_SELECT,
  });
}

export async function loadEncounterMedicationGate(
  db: Db,
  facilityId: string,
  encounterId: string
) {
  return db.encounter.findFirst({
    where: { id: encounterId, facilityId },
    select: ENCOUNTER_MEDICATION_SELECT,
  });
}

/** Nested relation select for child-model includes (orders, MAR, etc.). */
export const nestedEncounterCoreSelect = {
  select: ENCOUNTER_CORE_SELECT,
} satisfies { select: Prisma.EncounterSelect };
