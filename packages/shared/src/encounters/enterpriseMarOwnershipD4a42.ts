/**
 * MEDUI.D4A.4.2 — Enterprise MAR Ownership Generalization.
 *
 * Thin MAR / medication-pass adapter over D4A.4.1
 * `resolveActiveEncounterOwnership` — does NOT introduce a second ownership
 * resolver, hospital bag, or MAR-specific assignment engine.
 *
 * Authority (inherited):
 * - EMERGENCY → ED nurse column
 * - OBSERVATION | INPATIENT → hospital bag PRIMARY_RN
 * - STRICT (default): empty/missing bag → unassigned (ED columns must not win)
 * - LEGACY_COMPATIBILITY: explicit mode only (env / caller)
 *
 * Nursing precedence for MAR assignee filter + header metadata:
 * - PRIMARY_RN (or ED nurse on EMERGENCY) is authoritative.
 * - BREAK_RN / CHARGE_RN / COVERING_PROVIDER are NOT used: the hospital bag has
 *   no durable structured “active break coverage” flag; promoting BREAK_RN would
 *   be speculative. Documented deferral until a typed active-state exists.
 *
 * Historical authorship (administeredBy*, order author, etc.) is out of scope —
 * this module never rewrites medication administration attribution.
 */

import {
  ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
  resolveActiveEncounterOwnership,
  resolveActiveEncounterOwnershipBatch,
  type ActiveEncounterOwnershipProjection,
  type EncounterOwnershipAssignmentStatus,
  type EncounterOwnershipSource,
  type OwnershipCompatibilityMode,
  type ResolveActiveEncounterOwnershipInput,
} from "./enterpriseEncounterOwnershipResolverD4a41.js";

export const ENTERPRISE_MAR_OWNERSHIP_GENERALIZATION_CERTIFICATION_ID =
  "MEDUI.ENTERPRISE_MAR_OWNERSHIP_GENERALIZATION.D4A4_2" as const;

/**
 * Env / query value for certified legacy mode only.
 * Any other value (including unset) → STRICT.
 */
export function resolveMarOwnershipCompatibilityMode(
  raw?: string | null
): OwnershipCompatibilityMode {
  return String(raw ?? "").trim() === "LEGACY_COMPATIBILITY"
    ? "LEGACY_COMPATIBILITY"
    : "STRICT";
}

/** Encounter fields required to resolve MAR nursing ownership (already-loaded rows). */
export type MarOwnershipEncounterFields = ResolveActiveEncounterOwnershipInput;

export type MarNursingOwnershipProjection = {
  certification: typeof ENTERPRISE_MAR_OWNERSHIP_GENERALIZATION_CERTIFICATION_ID;
  ownershipResolverCertification: typeof ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID;
  careSetting: ActiveEncounterOwnershipProjection["careSetting"];
  compatibilityMode: OwnershipCompatibilityMode;
  /**
   * Active nursing ownership for MAR timeline / pass queue.
   * Null when STRICT unassigned / unresolved — never silently ED on hospital.
   */
  assignedNurseUserId: string | null;
  assignedNurseDisplayName: string | null;
  assignmentStatus: EncounterOwnershipAssignmentStatus;
  source: EncounterOwnershipSource;
  isLegacyFallback: boolean;
  /** Full D4A.4.1 projection for diagnostics / future consumers. */
  ownership: ActiveEncounterOwnershipProjection;
};

/**
 * Project D4A.4.1 ownership → MAR nursing assignee (PRIMARY_RN authority).
 */
export function projectMarNursingOwnership(
  ownership: ActiveEncounterOwnershipProjection
): MarNursingOwnershipProjection {
  const primary = ownership.primaryNurse;
  return {
    certification: ENTERPRISE_MAR_OWNERSHIP_GENERALIZATION_CERTIFICATION_ID,
    ownershipResolverCertification: ENTERPRISE_ENCOUNTER_OWNERSHIP_RESOLVER_CERTIFICATION_ID,
    careSetting: ownership.careSetting,
    compatibilityMode: ownership.compatibilityMode,
    assignedNurseUserId: primary.userId,
    assignedNurseDisplayName: primary.displayName,
    assignmentStatus: primary.assignmentStatus,
    source: primary.source,
    isLegacyFallback: primary.isLegacyFallback,
    ownership,
  };
}

/**
 * Resolve active MAR nursing ownership for one encounter (pure, no audit/writes).
 */
export function resolveMarNursingOwnership(
  input: MarOwnershipEncounterFields
): MarNursingOwnershipProjection {
  return projectMarNursingOwnership(resolveActiveEncounterOwnership(input));
}

/**
 * Batch map — callers load encounter fields once (dose select / findMany).
 */
export function resolveMarNursingOwnershipBatch(
  rows: readonly MarOwnershipEncounterFields[]
): MarNursingOwnershipProjection[] {
  return resolveActiveEncounterOwnershipBatch(rows).map(projectMarNursingOwnership);
}

/**
 * Facility assignee filter: does this encounter's MAR nursing owner match?
 * Encounter-scoped callers must not use this gate (see resolveMarAssignedNurseFilter).
 */
export function marNursingOwnershipMatchesAssignee(
  input: MarOwnershipEncounterFields,
  assignedToUserId: string
): boolean {
  const target = String(assignedToUserId ?? "").trim();
  if (!target) return true;
  const mar = resolveMarNursingOwnership(input);
  return mar.assignedNurseUserId === target;
}

/**
 * Filter already-loaded rows by MAR nursing assignee without extra DB.
 */
export function filterByMarNursingAssignee<T>(
  rows: readonly T[],
  getEncounterFields: (row: T) => MarOwnershipEncounterFields,
  assignedToUserId: string | null | undefined
): T[] {
  const target = String(assignedToUserId ?? "").trim();
  if (!target) return [...rows];
  return rows.filter((row) =>
    marNursingOwnershipMatchesAssignee(getEncounterFields(row), target)
  );
}

/**
 * Collect encounter ids whose MAR nursing owner matches assignee.
 * Intended after one facility-scoped OPEN encounter findMany.
 */
export function collectMarNursingAssigneeEncounterIds(
  encounters: readonly (MarOwnershipEncounterFields & { id: string })[],
  assignedToUserId: string,
  compatibilityMode?: OwnershipCompatibilityMode
): string[] {
  const target = String(assignedToUserId ?? "").trim();
  if (!target) return encounters.map((e) => e.id);
  const mode = compatibilityMode ?? "STRICT";
  return encounters
    .filter((enc) =>
      marNursingOwnershipMatchesAssignee(
        { ...enc, compatibilityMode: enc.compatibilityMode ?? mode },
        target
      )
    )
    .map((enc) => enc.id);
}
