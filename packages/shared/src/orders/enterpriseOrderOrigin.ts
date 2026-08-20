/**
 * MEDUI.RES.2 — Enterprise order origin / location projection.
 *
 * ONE shared projector for Laboratory and Radiology (and any future consumer).
 * Never infer origin from free-text display labels.
 * Unknown must remain UNKNOWN — never guessed into ED/Clinic/Dental/Inpatient.
 */

import { isDentalEncounterProjection } from "../auth/enterpriseDentalEncounterWorkspaceD5a3.js";
import {
  resolveDepartmentalEncounterContext,
  type DepartmentalEncounterContext,
  type DepartmentalEncounterContextInput,
} from "../encounters/departmentalEncounterContext.js";

export const ENTERPRISE_ORDER_ORIGINS = [
  "ED",
  "INPATIENT",
  "CLINIC",
  "DENTAL",
  "UNKNOWN",
] as const;

export type EnterpriseOrderOrigin = (typeof ENTERPRISE_ORDER_ORIGINS)[number];

export type EnterpriseOrderOriginInput = DepartmentalEncounterContextInput & {
  /** Persisted Encounter.serviceLine (MedoraServiceLine token). */
  serviceLine?: string | null;
  nursingAssessment?: unknown;
  /** Authoritative unit/room when present — never used to invent origin. */
  roomLabel?: string | null;
  /**
   * Optional secondary location already resolved by the caller
   * (facility name, unit, clinic label). Never used to decide origin.
   */
  locationLabel?: string | null;
};

export type EnterpriseOrderOriginProjection = {
  origin: EnterpriseOrderOrigin;
  /** Secondary facility/unit label when authoritatively available. */
  locationLabel: string | null;
  /** Legacy departmental badge (ED / OBSERVATION / INPATIENT / AMBULATORY / …). */
  departmentalContext: DepartmentalEncounterContext;
};

function trimLabel(raw: string | null | undefined): string | null {
  const t = String(raw ?? "").trim();
  return t || null;
}

/**
 * Map departmental badge → RES.2 origin vocabulary.
 * Observation projects as INPATIENT (hospital pathway), not Clinic/Dental.
 * Ambulatory projects as CLINIC unless dental authority says DENTAL.
 */
export function mapDepartmentalContextToEnterpriseOrderOrigin(
  context: DepartmentalEncounterContext,
  dental: boolean
): EnterpriseOrderOrigin {
  if (dental) return "DENTAL";
  switch (context) {
    case "ED":
      return "ED";
    case "OBSERVATION":
    case "INPATIENT":
      return "INPATIENT";
    case "AMBULATORY":
      return "CLINIC";
    case "UNKNOWN":
    case "OTHER":
    default:
      return "UNKNOWN";
  }
}

/**
 * Authoritative enterprise order origin for Lab / Rad worklists and charts.
 *
 * Priority:
 * 1. Dental service-line / dental encounter projection → DENTAL
 * 2. Departmental clinical/ambulatory context → ED | INPATIENT | CLINIC
 * 3. Otherwise UNKNOWN (never guessed)
 */
export function projectEnterpriseOrderOrigin(
  input: EnterpriseOrderOriginInput
): EnterpriseOrderOriginProjection {
  const dental = isDentalEncounterProjection({
    type: input.type,
    serviceLine: input.serviceLine,
    nursingAssessment: input.nursingAssessment,
    admissionSummaryJson: input.admissionSummaryJson,
  });

  const departmentalContext = resolveDepartmentalEncounterContext(input);
  const origin = mapDepartmentalContextToEnterpriseOrderOrigin(departmentalContext, dental);

  const locationLabel =
    trimLabel(input.locationLabel) ?? trimLabel(input.roomLabel);

  return {
    origin,
    locationLabel,
    departmentalContext,
  };
}

/** i18n key for primary origin badge. */
export function enterpriseOrderOriginLabelKey(origin: EnterpriseOrderOrigin): string {
  switch (origin) {
    case "ED":
      return "enterpriseOrderOrigin.ed";
    case "INPATIENT":
      return "enterpriseOrderOrigin.inpatient";
    case "CLINIC":
      return "enterpriseOrderOrigin.clinic";
    case "DENTAL":
      return "enterpriseOrderOrigin.dental";
    case "UNKNOWN":
    default:
      return "enterpriseOrderOrigin.unknown";
  }
}

/**
 * Display helper: "ED · Main Campus" style when locationLabel is present.
 * Callers supply already-translated originLabel.
 */
export function formatEnterpriseOrderOriginDisplay(input: {
  originLabel: string;
  locationLabel?: string | null;
}): string {
  const loc = trimLabel(input.locationLabel);
  if (!loc) return input.originLabel;
  return `${input.originLabel} · ${loc}`;
}
