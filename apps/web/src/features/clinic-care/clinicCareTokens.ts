/**
 * MEDUI.D4C.2 — Clinic Care UI color / chrome tokens (secondary to text labels).
 */
import {
  CLINIC_CARE_METRIC_COLOR_TOKENS,
  CLINIC_CARE_STAGE_COLOR_TOKENS,
  type ClinicCareStageId,
  type ClinicCareTrackboardMetricId,
} from "@medora/shared";

export const CLINIC_CARE_KPI_TOKENS = CLINIC_CARE_METRIC_COLOR_TOKENS;
export const CLINIC_CARE_STAGE_TOKENS = CLINIC_CARE_STAGE_COLOR_TOKENS;

export function clinicCareMetricToken(id: ClinicCareTrackboardMetricId) {
  return CLINIC_CARE_KPI_TOKENS[id];
}

export function clinicCareStageToken(id: ClinicCareStageId) {
  return CLINIC_CARE_STAGE_TOKENS[id] ?? CLINIC_CARE_STAGE_TOKENS.STATUS_UNAVAILABLE;
}

export const CLINIC_CARE_SHELL = {
  canvas: "#f8fafc",
  border: "#e2e8f0",
  radius: 16,
  panelBg: "#ffffff",
  accent: "#0d9488",
} as const;
