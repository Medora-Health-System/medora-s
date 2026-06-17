/** MEDUI.ED.MAR.H8 — read-only MAR analytics projection inputs (no PHI payloads). */

import type { MedicationAdministrationHistoryEventType } from "./medicationAdministrationHistory.js";
import type { MedicationAdministrationCorrectionReasonCode } from "./medicationAdministrationCorrectionGovernance.js";
import type { MedicationInfusionStopReasonCode } from "../medication/medicationInfusionStopReasonGovernance.js";

export type MarAnalyticsAdministrationProjection = {
  id: string;
  facilityId: string;
  encounterId: string;
  orderItemId: string | null;
  eventAt: string;
  eventType: MedicationAdministrationHistoryEventType;
  marAction?: string | null;
  route?: string | null;
  shiftCode?: string | null;
  unitId?: string | null;
  performedByUserId?: string | null;
  performedByRole?: string | null;
  orderingProviderUserId?: string | null;
  medicationTherapeuticClass?: string | null;
  isPrn?: boolean;
  infusionPhase?: "INFUSION_START" | "INFUSION_STOP" | null;
  infusionStopReasonCode?: MedicationInfusionStopReasonCode | string | null;
  infusionDurationMinutes?: number | null;
  isIvpb?: boolean;
  ivpbCompleted?: boolean;
  reconstructionAvailable?: boolean;
};

export type MarAnalyticsCorrectionProjection = {
  id: string;
  facilityId: string;
  medicationAdministrationId: string;
  encounterId: string;
  correctedAt: string;
  correctedByUserId: string;
  reasonCode: MedicationAdministrationCorrectionReasonCode | string | null;
  shiftCode?: string | null;
  unitId?: string | null;
};

export type MarAnalyticsOrderCancelProjection = {
  orderItemId: string;
  encounterId: string;
  facilityId: string;
  cancelledAt: string;
  cancelledByUserId?: string | null;
  shiftCode?: string | null;
  unitId?: string | null;
};

export type { MarAnalyticsScheduleRescheduleProjection } from "./marAnalyticsScheduleReschedule.js";
export type { MarAnalyticsAdministrationVarianceProjection } from "./marAnalyticsAdministrationVariance.js";

export type MarAnalyticsInput = {
  facilityId: string;
  windowStart: string;
  windowEnd: string;
  generatedAt?: string;
  scheduledAdministrationCount?: number;
  activeInfusionCount?: number;
  administrations: MarAnalyticsAdministrationProjection[];
  corrections: MarAnalyticsCorrectionProjection[];
  orderCancellations: MarAnalyticsOrderCancelProjection[];
  /** MEDUI.ED.MAR.H9A — schedule reschedule events for analytics projection. */
  scheduleReschedules?: import("./marAnalyticsScheduleReschedule.js").MarAnalyticsScheduleRescheduleProjection[];
  /** MEDUI.ED.MAR.H9B — administration variance projections. */
  administrationVariances?: import("./marAnalyticsAdministrationVariance.js").MarAnalyticsAdministrationVarianceProjection[];
  /** MEDUI.ED.MAR.H9C — timing override justification projections. */
  timingOverrides?: import("./marAnalyticsTimingOverride.js").MarAnalyticsTimingOverrideProjection[];
  /** MEDUI.ED.MAR.H9L — medication response documentation projections. */
  medicationResponses?: import("./marMedicationResponseAnalytics.js").MarMedicationResponseAnalyticsProjection[];
};

export const MAR_ANALYTICS_READ_ONLY = true as const;
