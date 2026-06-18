"use client";

import React, { useEffect, useRef, useState } from "react";
import { formatMarShiftTimelineClinicalDateTime, formatMarPrnFrequencyLabel } from "@medora/shared";
import { MEDICATION_INFUSION_NURSE_STOP_REASON_CODES } from "@medora/shared";
import { useI18n } from "@/lib/i18n";
import type { MarShiftTimelineCellItem, MarShiftTimelineDrawerAction } from "@/lib/marShiftTimelineApi";
import {
  defaultMarShiftTimelineStartTimeValue,
  defaultMarShiftTimelineStopTimeValue,
  formatMarShiftTimelineDueWindow,
  isMarShiftTimelineDrawerReadOnly,
  isMarShiftTimelineDrawerScheduledActionable,
  marShiftTimelineDrawerPerformerValue,
  marShiftTimelineItemStatusStyle,
  marShiftTimelinePrimaryDrawerAction,
} from "@/features/mar/marShiftTimelineDisplay";
import {
  MAR_SHIFT_TIMELINE_HOLD_REASON_CODES,
  MAR_SHIFT_TIMELINE_MISSED_REASON_CODES,
  MAR_SHIFT_TIMELINE_REFUSE_REASON_CODES,
} from "@medora/shared";
import {
  isMarShiftTimelineActionEnabled,
  isMarShiftTimelineActionShowComingSoon,
  MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED,
  buildMarShiftTimelineStartPayload,
  buildMarShiftTimelineStopPayload,
  validateMarShiftTimelineStopTime,
  validateMarShiftTimelineInfusionClinicalTime,
  type MarShiftTimelineActionHandlers,
} from "@/features/mar/marShiftTimelineActions";
import {
  marShiftTimelineDateTimeLocalToUtcIso,
  toMarShiftTimelineDateTimeLocalValue,
} from "@/features/mar/marShiftTimelineDisplay";
import { extractMarSaveErrorMessage } from "@/features/mar/marSaveErrorMessage";
import { MedicationDoseScheduleAdjustmentModal } from "@/components/mar/MedicationDoseScheduleAdjustmentModal";
import { MedicationScheduleAdjustmentChainViewer } from "@/components/mar/MedicationScheduleAdjustmentChainViewer";
import { MedicationTimingOverrideJustificationPanel } from "@/components/mar/MedicationTimingOverrideJustificationPanel";
import { MedicationResponseDocumentationPanel } from "@/components/mar/MedicationResponseDocumentationPanel";
import { MedicationAllergyReviewPanel } from "@/components/mar/MedicationAllergyReviewPanel";
import type { MarAllergyCandidate } from "@medora/shared";
import { MedicationClinicalDateTimeField } from "@/components/mar/MedicationClinicalDateTimeField";
import {
  buildMarClinicalTimeDocumentationNotes,
  marDrawerActionToUniversalClinicalActionType,
  validateMarClinicalDateTimeField,
} from "@/features/mar/marUniversalMedicationActionTime";

export type FacilityMarShiftTimelineDrawerContext = {
  patientDisplay: string;
  roomLabel: string | null;
  governedRoomDisplay?: string | null;
};

export type FacilityMarShiftTimelineDrawerProps = {
  item: MarShiftTimelineCellItem | null;
  context: FacilityMarShiftTimelineDrawerContext | null;
  encounterId?: string | null;
  facilityTimeZone?: string | null;
  actionHandlers?: MarShiftTimelineActionHandlers | null;
  onClose: () => void;
  onActionSuccess?: () => void | Promise<void>;
};

function actionLabelKey(action: MarShiftTimelineDrawerAction): string {
  return `marShiftTimeline.actions.${action}`;
}

export function FacilityMarShiftTimelineDrawer({
  item,
  context,
  encounterId = null,
  facilityTimeZone = null,
  actionHandlers = null,
  onClose,
  onActionSuccess,
}: FacilityMarShiftTimelineDrawerProps) {
  const { t, language } = useI18n();
  const marActionErrorFallback = t("marShiftTimeline.actionError");
  const resolveActionError = (e: unknown) =>
    extractMarSaveErrorMessage(e, language, marActionErrorFallback, t);
  const dateLocale = language === "en" ? "en-US" : "fr-FR";
  const closeRef = useRef<HTMLButtonElement>(null);
  const [startTimeValue, setStartTimeValue] = useState("");
  const [stopTimeValue, setStopTimeValue] = useState("");
  const [stopNotes, setStopNotes] = useState("");
  const [infusionStopReasonCode, setInfusionStopReasonCode] = useState("COMPLETED");
  const [infusionStopReasonDetail, setInfusionStopReasonDetail] = useState("");
  const [infusionTimingReasonCode, setInfusionTimingReasonCode] = useState("");
  const [infusionTimingReasonDetail, setInfusionTimingReasonDetail] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [reasonModal, setReasonModal] = useState<null | { action: "REFUSE" | "HOLD" | "MARK_MISSED" }>(null);
  const [reasonCode, setReasonCode] = useState("");
  const [reasonOther, setReasonOther] = useState("");
  const [reasonTimeValue, setReasonTimeValue] = useState("");
  const [reasonTimingReasonCode, setReasonTimingReasonCode] = useState("");
  const [reasonTimingReasonDetail, setReasonTimingReasonDetail] = useState("");
  const [documentedAtIso, setDocumentedAtIso] = useState(() => new Date().toISOString());
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const readOnly = item ? isMarShiftTimelineDrawerReadOnly(item) : false;
  const scheduledActionable = item ? isMarShiftTimelineDrawerScheduledActionable(item) : false;
  const primaryAction = item ? marShiftTimelinePrimaryDrawerAction(item) : null;
  const showStartTimeField =
    item?.clinicalAction === "START_INFUSION" ||
    item?.clinicalAction === "START_BOLUS" ||
    item?.clinicalAction === "START_FLUID" ||
    (item?.clinicalAction === "VIEW_UPCOMING" &&
      (item.doseKind === "IVPB_SESSION" || item.route?.trim().toUpperCase() === "IVPB"));
  const showStopTimeField =
    item?.clinicalAction === "STOP_INFUSION" ||
    item?.clinicalAction === "COMPLETE_BOLUS" ||
    item?.clinicalAction === "STOP_FLUID" ||
    item?.clinicalAction === "RESUME_FLUID";
  const showStopNotesField =
    item?.clinicalAction === "STOP_INFUSION" || item?.clinicalAction === "STOP_FLUID";

  useEffect(() => {
    if (item) closeRef.current?.focus();
  }, [item]);

  useEffect(() => {
    if (!item) return;
    setStartTimeValue(defaultMarShiftTimelineStartTimeValue(item, facilityTimeZone));
    setStopTimeValue(defaultMarShiftTimelineStopTimeValue(item, facilityTimeZone));
    setStopNotes("");
    setInfusionStopReasonCode("COMPLETED");
    setInfusionStopReasonDetail("");
    setInfusionTimingReasonCode("");
    setInfusionTimingReasonDetail("");
    setActionError(null);
    setSubmitting(false);
    setReasonModal(null);
    setReasonCode("");
    setReasonOther("");
    setReasonTimingReasonCode("");
    setReasonTimingReasonDetail("");
    setDocumentedAtIso(new Date().toISOString());
    setScheduleModalOpen(false);
    setReasonTimeValue(
      toMarShiftTimelineDateTimeLocalValue(item.scheduledAt, facilityTimeZone) ||
        toMarShiftTimelineDateTimeLocalValue(new Date().toISOString(), facilityTimeZone)
    );
  }, [item, facilityTimeZone]);

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [item, onClose]);

  if (!item || !context) return null;

  const scheduledDisplay = formatMarShiftTimelineClinicalDateTime(
    item.scheduledAt,
    dateLocale,
    facilityTimeZone ?? undefined
  );
  const dueWindowDisplay = formatMarShiftTimelineDueWindow(
    item.dueWindowStartAt,
    item.dueWindowEndAt,
    dateLocale,
    facilityTimeZone
  );
  const infusionStartActionType = marDrawerActionToUniversalClinicalActionType(
    item.clinicalAction ?? "START_INFUSION",
    {
      isPrn: item.isPrnBand,
      isFluidBolus: item.isFluidBolus,
      isIvpb: item.doseKind === "IVPB_SESSION",
    }
  );
  const infusionStopActionType = marDrawerActionToUniversalClinicalActionType(
    item.clinicalAction ?? "STOP_INFUSION",
    {
      isPrn: item.isPrnBand,
      isFluidBolus: item.isFluidBolus,
      isIvpb: item.doseKind === "IVPB_SESSION",
      isStop: true,
    }
  );
  const originalScheduledAt = item.scheduleAdjustment?.originalScheduledAt ?? null;
  const currentScheduledAt = item.scheduleAdjustment?.currentScheduledAt ?? item.scheduledAt;

  const isPrnItem = item.isPrnBand === true;
  const prnFrequencyDisplay =
    item.prnFrequencyLabel?.trim() ||
    (isPrnItem
      ? formatMarPrnFrequencyLabel({
          frequencyCode: item.frequencyCode,
          directionsSig: item.orderPrnIndication,
        })
      : item.frequencyCode);

  const isCanceledItem =
    item.doseStatus.trim().toUpperCase() === "CANCELLED" ||
    item.clinicalAction === "VIEW_CANCELED";

  const statusBadgeStyle = marShiftTimelineItemStatusStyle(
    item.doseStatus,
    readOnly,
    item.isPrnBand === true,
    item.secondaryText
  );

  const detailRows: {
    label: string;
    value: string | null | undefined;
    testId?: string;
    statusBadge?: boolean;
  }[] = [
    { label: t("marShiftTimeline.drawer.patient"), value: context.patientDisplay },
    {
      label: t("marShiftTimeline.drawer.room"),
      value:
        context.governedRoomDisplay?.trim() ||
        context.roomLabel?.trim() ||
        t("roomAssignment.noRoomAssigned"),
    },
    {
      label: t("marShiftTimeline.drawer.scheduled"),
      value: scheduledDisplay,
      testId: "mar-shift-timeline-drawer-scheduled",
    },
    {
      label: t("marShiftTimeline.drawer.dueWindow"),
      value: dueWindowDisplay,
      testId: "mar-shift-timeline-drawer-due-window",
    },
    {
      label: t("marShiftTimeline.drawer.status"),
      value: item.hover.status,
      testId: "mar-shift-timeline-drawer-status",
      statusBadge: true,
    },
    ...(isCanceledItem
      ? [
          {
            label: t("marShiftTimeline.drawer.cancellationReason"),
            value: item.cancellationReason,
            testId: "mar-shift-timeline-drawer-cancellation-reason",
          },
          {
            label: t("marShiftTimeline.drawer.cancellationDetails"),
            value: item.cancellationDetails,
            testId: "mar-shift-timeline-drawer-cancellation-details",
          },
          {
            label: t("marShiftTimeline.drawer.cancelledBy"),
            value: item.cancelledByDisplay,
            testId: "mar-shift-timeline-drawer-cancelled-by",
          },
          {
            label: t("marShiftTimeline.drawer.cancelledAt"),
            value: item.cancelledAt
              ? formatMarShiftTimelineClinicalDateTime(
                  item.cancelledAt,
                  dateLocale,
                  facilityTimeZone ?? undefined
                )
              : null,
            testId: "mar-shift-timeline-drawer-cancelled-at",
          },
        ]
      : []),
    { label: t("marShiftTimeline.drawer.dose"), value: item.hover.dose },
    { label: t("marShiftTimeline.drawer.route"), value: item.hover.route },
    { label: t("marShiftTimeline.drawer.rate"), value: item.hover.rate },
    {
      label: t("marShiftTimeline.drawer.frequency"),
      value: isPrnItem ? prnFrequencyDisplay : item.frequencyCode,
      testId: "mar-shift-timeline-drawer-frequency",
    },
    {
      label: t("marShiftTimeline.drawer.prnYes"),
      value: isPrnItem ? t("common.yes") : null,
      testId: "mar-shift-timeline-drawer-prn-yes",
    },
    {
      label: t("marShiftTimeline.drawer.prnLastGiven"),
      value: item.prnLastGivenAt
        ? formatMarShiftTimelineClinicalDateTime(
            item.prnLastGivenAt,
            dateLocale,
            facilityTimeZone ?? undefined
          )
        : null,
      testId: "mar-shift-timeline-drawer-prn-last-given",
    },
    {
      label: t("marShiftTimeline.drawer.prnNextEligible"),
      value: item.prnNextEligibleAt
        ? formatMarShiftTimelineClinicalDateTime(
            item.prnNextEligibleAt,
            dateLocale,
            facilityTimeZone ?? undefined
          )
        : null,
      testId: "mar-shift-timeline-drawer-prn-next-eligible",
    },
    {
      label: t("marShiftTimeline.drawer.witness"),
      value: item.requiresWitness ? t("marShiftTimeline.drawer.witnessRequired") : null,
    },
    { label: t("marShiftTimeline.drawer.clinicalAction"), value: item.clinicalAction },
    {
      label: t("marShiftTimeline.drawer.startedBy"),
      value: marShiftTimelineDrawerPerformerValue(item.startedByDisplay, item.startedByInitials),
      testId: "mar-shift-timeline-drawer-started-by",
    },
    {
      label: t("marShiftTimeline.drawer.startedAt"),
      value: item.startedAt
        ? formatMarShiftTimelineClinicalDateTime(item.startedAt, dateLocale, facilityTimeZone ?? undefined)
        : null,
      testId: "mar-shift-timeline-drawer-started-at",
    },
    {
      label: t("marShiftTimeline.drawer.stoppedBy"),
      value: marShiftTimelineDrawerPerformerValue(item.stoppedByDisplay, item.stoppedByInitials),
      testId: "mar-shift-timeline-drawer-stopped-by",
    },
    {
      label: t("marShiftTimeline.drawer.stoppedAt"),
      value: item.stoppedAt
        ? formatMarShiftTimelineClinicalDateTime(item.stoppedAt, dateLocale, facilityTimeZone ?? undefined)
        : null,
      testId: "mar-shift-timeline-drawer-stopped-at",
    },
    {
      label: t("marShiftTimeline.drawer.administeredBy"),
      value: marShiftTimelineDrawerPerformerValue(
        item.administeredByDisplay,
        item.administeredByInitials
      ),
    },
    {
      label: t("marShiftTimeline.drawer.administeredAt"),
      value: item.administeredAt
        ? formatMarShiftTimelineClinicalDateTime(item.administeredAt, dateLocale, facilityTimeZone ?? undefined)
        : null,
    },
    {
      label: t("marShiftTimeline.drawer.completionSummary"),
      value: item.completionSummary,
    },
    {
      label: t("marShiftTimeline.drawer.prnIndication"),
      value: item.orderPrnIndication,
      testId: "mar-shift-timeline-drawer-prn-indication",
    },
    {
      label: t("marShiftTimeline.drawer.prnReason"),
      value: item.prnReasonLabel,
      testId: "mar-shift-timeline-drawer-prn-reason",
    },
    {
      label: t("marShiftTimeline.drawer.prnPainScore"),
      value: item.prnPainScore != null ? `${item.prnPainScore}/10` : null,
      testId: "mar-shift-timeline-drawer-prn-pain-score",
    },
    {
      label: t("marShiftTimeline.drawer.prnPainLocation"),
      value: item.prnPainLocation,
      testId: "mar-shift-timeline-drawer-prn-pain-location",
    },
    {
      label: t("marShiftTimeline.drawer.fluidRate"),
      value: item.fluidRateLabel,
      testId: "mar-shift-timeline-drawer-fluid-rate",
    },
    {
      label: t("marShiftTimeline.drawer.fluidStartedAt"),
      value: item.fluidStartedAt
        ? formatMarShiftTimelineClinicalDateTime(item.fluidStartedAt, dateLocale, facilityTimeZone ?? undefined)
        : null,
      testId: "mar-shift-timeline-drawer-fluid-started-at",
    },
    {
      label: t("marShiftTimeline.drawer.fluidPausedAt"),
      value: item.fluidPausedAt
        ? formatMarShiftTimelineClinicalDateTime(item.fluidPausedAt, dateLocale, facilityTimeZone ?? undefined)
        : null,
      testId: "mar-shift-timeline-drawer-fluid-paused-at",
    },
    {
      label: t("marShiftTimeline.drawer.fluidStoppedAt"),
      value: item.fluidStoppedAt
        ? formatMarShiftTimelineClinicalDateTime(item.fluidStoppedAt, dateLocale, facilityTimeZone ?? undefined)
        : null,
      testId: "mar-shift-timeline-drawer-fluid-stopped-at",
    },
    {
      label: t("marShiftTimeline.drawer.fluidCompletedAt"),
      value: item.fluidCompletedAt
        ? formatMarShiftTimelineClinicalDateTime(item.fluidCompletedAt, dateLocale, facilityTimeZone ?? undefined)
        : null,
      testId: "mar-shift-timeline-drawer-fluid-completed-at",
    },
    {
      label: t("marShiftTimeline.drawer.fluidRunningDuration"),
      value: item.fluidRunningDurationLabel,
      testId: "mar-shift-timeline-drawer-fluid-running-duration",
    },
    {
      label: t("marShiftTimeline.drawer.fluidActiveDuration"),
      value: item.fluidActiveDurationLabel,
      testId: "mar-shift-timeline-drawer-fluid-active-duration",
    },
    {
      label: t("marShiftTimeline.drawer.fluidTotalDuration"),
      value: item.fluidTotalDurationLabel,
      testId: "mar-shift-timeline-drawer-fluid-total-duration",
    },
    {
      label: item.isFluidBolus
        ? t("marShiftTimeline.drawer.fluidBolusVolume")
        : t("marShiftTimeline.drawer.fluidVolumeInfused"),
      value:
        item.isFluidBolus && item.fluidBolusVolumeMl != null
          ? `${item.fluidBolusVolumeMl} mL`
          : item.fluidVolumeInfusedMl != null
            ? `${item.fluidVolumeInfusedMl} mL`
            : null,
      testId: "mar-shift-timeline-drawer-fluid-volume-final",
    },
  ];

  const reasonCodes =
    reasonModal?.action === "HOLD"
      ? MAR_SHIFT_TIMELINE_HOLD_REASON_CODES
      : reasonModal?.action === "MARK_MISSED"
        ? MAR_SHIFT_TIMELINE_MISSED_REASON_CODES
        : MAR_SHIFT_TIMELINE_REFUSE_REASON_CODES;

  const handleReasonConfirm = async () => {
    if (!actionHandlers || !item || !reasonModal) return;
    if (!reasonCode.trim()) {
      setActionError(t("marShiftTimeline.reasonModal.reasonRequired"));
      return;
    }
    if (reasonCode === "OTHER" && !reasonOther.trim()) {
      setActionError(t("marShiftTimeline.reasonModal.otherRequired"));
      return;
    }

    setActionError(null);
    setSubmitting(true);
    try {
      const documentedAtIso = new Date().toISOString();
      const terminalActionType =
        reasonModal.action === "REFUSE"
          ? "REFUSE"
          : reasonModal.action === "MARK_MISSED"
            ? "MISSED"
            : "HOLD";
      const timingValidation = validateMarClinicalDateTimeField({
        actionType: terminalActionType,
        clinicalTimeLocal: reasonTimeValue,
        documentedAtIso,
        scheduledTime: item.scheduledAt,
        currentScheduledTime: currentScheduledAt,
        originalScheduledTime: originalScheduledAt,
        reasonCode: reasonTimingReasonCode,
        reasonDetail: reasonTimingReasonDetail,
        facilityTimeZone,
      });
      if (!timingValidation.ok) {
        setActionError(
          timingValidation.code === "DETAIL_REQUIRED"
            ? t("marClinicalTime.detailRequired")
            : timingValidation.code === "INVALID_TIME"
              ? t("marClinicalTime.invalidTime")
              : t("marClinicalTime.reasonRequired")
        );
        return;
      }
      const timingNotes = buildMarClinicalTimeDocumentationNotes({
        actionType: terminalActionType,
        clinicalTimeIso: timingValidation.clinicalTimeIso,
        documentedAtIso,
        scheduledTime: item.scheduledAt,
        currentScheduledTime: currentScheduledAt,
        originalScheduledTime: originalScheduledAt,
        reasonCode: reasonTimingReasonCode,
        reasonDetail: reasonTimingReasonDetail,
      });
      const payload = {
        reasonCode,
        otherText: reasonOther.trim() || undefined,
        administeredAtIso: timingValidation.clinicalTimeIso,
        timingNotes,
      };
      if (reasonModal.action === "REFUSE") {
        await actionHandlers.onExecuteRefuse(item, payload);
      } else if (reasonModal.action === "MARK_MISSED") {
        if (!actionHandlers.onExecuteMissed) {
          setActionError(t("marShiftTimeline.actionError"));
          return;
        }
        await actionHandlers.onExecuteMissed(item, payload);
      } else {
        await actionHandlers.onExecuteHold(item, payload);
      }
      setReasonModal(null);
      await onActionSuccess?.();
    } catch (e) {
      setActionError(resolveActionError(e));
    } finally {
      setSubmitting(false);
    }
  };

  const handleActionClick = async (action: MarShiftTimelineDrawerAction) => {
    if (!actionHandlers || !item) return;
    if (!isMarShiftTimelineActionEnabled(action, item, actionHandlers)) return;

    if (action === "ADMINISTER") {
      setActionError(null);
      setSubmitting(true);
      try {
        await actionHandlers.onRequestAdminister(item);
      } catch (e) {
        setActionError(resolveActionError(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (action === "CHANGE_SCHEDULED_TIME") {
      setActionError(null);
      setScheduleModalOpen(true);
      return;
    }

    if (action === "START_FLUID" && actionHandlers.onExecuteStartFluid) {
      setActionError(null);
      setSubmitting(true);
      try {
        const saveAt = new Date();
        const timingValidation = validateMarShiftTimelineInfusionClinicalTime(startTimeValue, facilityTimeZone, {
          reasonCode: infusionTimingReasonCode,
          reasonDetail: infusionTimingReasonDetail,
          saveAt,
        });
        if (!timingValidation.ok) {
          setActionError(
            timingValidation.reason === "timing_detail_required"
              ? t("marTimingOverride.detailRequired")
              : t("marTimingOverride.reasonRequired")
          );
          return;
        }
        const startPayload = buildMarShiftTimelineStartPayload(
          {
            startTimeLocal: startTimeValue,
            timingReasonCode: infusionTimingReasonCode,
            timingReasonDetail: infusionTimingReasonDetail,
            saveAt,
          },
          facilityTimeZone
        );
        await actionHandlers.onExecuteStartFluid(item, startPayload);
        await onActionSuccess?.();
      } catch (e) {
        setActionError(resolveActionError(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (action === "PAUSE_FLUID" && actionHandlers.onExecutePauseFluid) {
      setActionError(null);
      setSubmitting(true);
      try {
        await actionHandlers.onExecutePauseFluid(item);
        await onActionSuccess?.();
      } catch (e) {
        setActionError(resolveActionError(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (action === "RESUME_FLUID" && actionHandlers.onExecuteResumeFluid) {
      setActionError(null);
      setSubmitting(true);
      try {
        await actionHandlers.onExecuteResumeFluid(item);
        await onActionSuccess?.();
      } catch (e) {
        setActionError(resolveActionError(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (action === "STOP_FLUID" && actionHandlers.onExecuteStopFluid) {
      setActionError(null);
      setSubmitting(true);
      try {
        const saveAt = new Date();
        const timingValidation = validateMarShiftTimelineInfusionClinicalTime(stopTimeValue, facilityTimeZone, {
          reasonCode: infusionTimingReasonCode,
          reasonDetail: infusionTimingReasonDetail,
          saveAt,
        });
        if (!timingValidation.ok) {
          setActionError(
            timingValidation.reason === "timing_detail_required"
              ? t("marTimingOverride.detailRequired")
              : t("marTimingOverride.reasonRequired")
          );
          return;
        }
        const stopPayload = buildMarShiftTimelineStopPayload(
          {
            stopTimeLocal: stopTimeValue,
            timingReasonCode: infusionTimingReasonCode,
            timingReasonDetail: infusionTimingReasonDetail,
            saveAt,
          },
          facilityTimeZone
        );
        await actionHandlers.onExecuteStopFluid(item, stopPayload);
        await onActionSuccess?.();
      } catch (e) {
        setActionError(resolveActionError(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (action === "START_BOLUS" && actionHandlers.onExecuteStartBolus) {
      setActionError(null);
      setSubmitting(true);
      try {
        const saveAt = new Date();
        const timingValidation = validateMarShiftTimelineInfusionClinicalTime(startTimeValue, facilityTimeZone, {
          reasonCode: infusionTimingReasonCode,
          reasonDetail: infusionTimingReasonDetail,
          saveAt,
        });
        if (!timingValidation.ok) {
          setActionError(
            timingValidation.reason === "timing_detail_required"
              ? t("marTimingOverride.detailRequired")
              : t("marTimingOverride.reasonRequired")
          );
          return;
        }
        const startPayload = buildMarShiftTimelineStartPayload(
          {
            startTimeLocal: startTimeValue,
            timingReasonCode: infusionTimingReasonCode,
            timingReasonDetail: infusionTimingReasonDetail,
            saveAt,
          },
          facilityTimeZone
        );
        await actionHandlers.onExecuteStartBolus(item, startPayload);
        await onActionSuccess?.();
      } catch (e) {
        setActionError(resolveActionError(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (action === "COMPLETE_BOLUS" && actionHandlers.onExecuteCompleteBolus) {
      setActionError(null);
      setSubmitting(true);
      try {
        const saveAt = new Date();
        const timingValidation = validateMarShiftTimelineInfusionClinicalTime(stopTimeValue, facilityTimeZone, {
          reasonCode: infusionTimingReasonCode,
          reasonDetail: infusionTimingReasonDetail,
          saveAt,
        });
        if (!timingValidation.ok) {
          setActionError(
            timingValidation.reason === "timing_detail_required"
              ? t("marTimingOverride.detailRequired")
              : t("marTimingOverride.reasonRequired")
          );
          return;
        }
        const completePayload = buildMarShiftTimelineStopPayload(
          {
            stopTimeLocal: stopTimeValue,
            timingReasonCode: infusionTimingReasonCode,
            timingReasonDetail: infusionTimingReasonDetail,
            saveAt,
          },
          facilityTimeZone
        );
        await actionHandlers.onExecuteCompleteBolus(item, completePayload);
        await onActionSuccess?.();
      } catch (e) {
        setActionError(resolveActionError(e));
      } finally {
        setSubmitting(false);
      }
      return;
    }

    if (action === "REFUSE" || action === "HOLD" || action === "MARK_MISSED") {
      setActionError(null);
      setReasonModal({ action });
      return;
    }

    setActionError(null);
    setSubmitting(true);
    try {
      if (action === "START_INFUSION") {
        const saveAt = new Date();
        const timingValidation = validateMarShiftTimelineInfusionClinicalTime(startTimeValue, facilityTimeZone, {
          reasonCode: infusionTimingReasonCode,
          reasonDetail: infusionTimingReasonDetail,
          saveAt,
        });
        if (!timingValidation.ok) {
          setActionError(
            timingValidation.reason === "timing_detail_required"
              ? t("marTimingOverride.detailRequired")
              : t("marTimingOverride.reasonRequired")
          );
          return;
        }
        const startPayload = buildMarShiftTimelineStartPayload(
          {
            startTimeLocal: startTimeValue,
            timingReasonCode: infusionTimingReasonCode,
            timingReasonDetail: infusionTimingReasonDetail,
            saveAt,
          },
          facilityTimeZone
        );
        const completed = await actionHandlers.onRequestStartInfusion(item, startPayload);
        if (completed) {
          await onActionSuccess?.();
        }
        return;
      }
      if (action === "STOP_INFUSION") {
        const saveAt = new Date();
        const timingValidation = validateMarShiftTimelineInfusionClinicalTime(stopTimeValue, facilityTimeZone, {
          reasonCode: infusionTimingReasonCode,
          reasonDetail: infusionTimingReasonDetail,
          saveAt,
        });
        if (!timingValidation.ok) {
          setActionError(
            timingValidation.reason === "timing_detail_required"
              ? t("marTimingOverride.detailRequired")
              : t("marTimingOverride.reasonRequired")
          );
          return;
        }
        const stopValidation = validateMarShiftTimelineStopTime(item, stopTimeValue, facilityTimeZone);
        if (!stopValidation.ok) {
          setActionError(
            stopValidation.reason === "before_start"
              ? t("marShiftTimeline.stopTimeBeforeStart")
              : t("marShiftTimeline.stopTimeInvalid")
          );
          return;
        }
        const stopPayload = buildMarShiftTimelineStopPayload(
          {
            notes: stopNotes,
            stopTimeLocal: stopTimeValue,
            stopReasonCode: infusionStopReasonCode,
            reasonDetail: infusionStopReasonDetail,
            timingReasonCode: infusionTimingReasonCode,
            timingReasonDetail: infusionTimingReasonDetail,
            saveAt,
          },
          facilityTimeZone
        );
        await actionHandlers.onExecuteStopInfusion(item, stopPayload);
        await onActionSuccess?.();
      }
    } catch (e) {
      setActionError(resolveActionError(e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      data-testid="mar-shift-timeline-drawer-overlay"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(15, 23, 42, 0.35)",
        zIndex: 2200,
        display: "flex",
        justifyContent: "flex-end",
      }}
    >
      <aside
        data-testid="mar-shift-timeline-drawer"
        data-read-only={readOnly ? "true" : "false"}
        role="dialog"
        aria-modal="true"
        aria-labelledby="mar-shift-timeline-drawer-title"
        style={{
          width: "min(420px, 100vw)",
          maxWidth: "100%",
          height: "100%",
          backgroundColor: "#fff",
          borderLeft: "1px solid #e2e8f0",
          boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.12)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 18px",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h2 id="mar-shift-timeline-drawer-title" style={{ margin: 0, fontSize: 18, lineHeight: 1.3 }}>
            {item.medicationLabel ?? item.primaryText}
          </h2>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label={t("marShiftTimeline.drawer.close")}
            style={{
              border: "1px solid #e2e8f0",
              borderRadius: 8,
              background: "#f8fafc",
              padding: "6px 10px",
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t("marShiftTimeline.drawer.close")}
          </button>
        </div>

        {readOnly ? (
          <p
            data-testid="mar-shift-timeline-drawer-readonly-notice"
            style={{ margin: "12px 0 0", fontSize: 13, color: "#64748b" }}
          >
            {isCanceledItem
              ? t("marShiftTimeline.drawer.canceledReadOnlyNotice")
              : t("marShiftTimeline.drawer.readOnlyNotice")}
          </p>
        ) : scheduledActionable ? (
          <p
            data-testid="mar-shift-timeline-drawer-scheduled-notice"
            style={{ margin: "12px 0 0", fontSize: 13, color: "#047857" }}
          >
            {t("marShiftTimeline.drawer.scheduledActionNotice")}
          </p>
        ) : null}

        {actionError ? (
          <p
            data-testid="mar-shift-timeline-drawer-action-error"
            style={{ margin: "12px 0 0", fontSize: 13, color: "#b45309" }}
          >
            {actionError}
          </p>
        ) : null}

        <dl style={{ margin: "16px 0", fontSize: 13, lineHeight: 1.5, flex: 1, overflowY: "auto" }}>
          {detailRows.map((row) =>
            row.value?.trim() ? (
              <div
                key={row.label}
                data-testid={row.testId}
                style={{ display: "grid", gridTemplateColumns: "120px 1fr", gap: 8, marginBottom: 8 }}
              >
                <dt style={{ margin: 0, color: "#64748b", fontWeight: 600 }}>{row.label}</dt>
                {row.statusBadge ? (
                  <dd style={{ margin: 0 }}>
                    <span
                      data-testid="mar-shift-timeline-drawer-status-badge"
                      style={{
                        display: "inline-block",
                        padding: "2px 8px",
                        borderRadius: 6,
                        border: `1px solid ${statusBadgeStyle.borderColor}`,
                        backgroundColor: statusBadgeStyle.backgroundColor as string,
                        color: statusBadgeStyle.color as string,
                        fontSize: 12,
                        fontWeight: 600,
                      }}
                    >
                      {row.value}
                    </span>
                  </dd>
                ) : (
                  <dd style={{ margin: 0, color: "#0f172a" }}>{row.value}</dd>
                )}
              </div>
            ) : null
          )}

          {item.scheduleAdjustmentChain && item.scheduleAdjustmentChain.length > 0 ? (
            <MedicationScheduleAdjustmentChainViewer
              steps={item.scheduleAdjustmentChain}
              facilityTimeZone={facilityTimeZone}
            />
          ) : null}

          <MedicationTimingOverrideJustificationPanel
            item={item}
            facilityTimeZone={facilityTimeZone}
          />

          {encounterId?.trim() ? (
            <MedicationResponseDocumentationPanel
              item={item}
              encounterId={encounterId}
              facilityTimeZone={facilityTimeZone}
              readOnly={readOnly}
              onSaved={onActionSuccess}
            />
          ) : null}

          {encounterId?.trim() &&
          item.medicationAdministrationId?.trim() &&
          item.allergyReviewCandidates &&
          item.allergyReviewCandidates.length > 0 ? (
            <MedicationAllergyReviewPanel
              encounterId={encounterId}
              administrationId={item.medicationAdministrationId}
              candidates={item.allergyReviewCandidates as MarAllergyCandidate[]}
              facilityTimeZone={facilityTimeZone}
              readOnly={readOnly}
              onDismissed={onActionSuccess}
            />
          ) : null}

          {showStartTimeField ? (
            <div style={{ marginTop: 12, position: "relative", zIndex: 1 }}>
              <MedicationClinicalDateTimeField
                label={t("marShiftTimeline.drawer.startTimeField")}
                value={startTimeValue}
                onChange={setStartTimeValue}
                documentedAt={documentedAtIso}
                scheduledTime={item.scheduledAt}
                currentScheduledTime={currentScheduledAt}
                originalScheduledTime={originalScheduledAt}
                actionType={infusionStartActionType}
                facilityTimeZone={facilityTimeZone}
                reasonCode={infusionTimingReasonCode}
                onReasonCodeChange={setInfusionTimingReasonCode}
                reasonDetail={infusionTimingReasonDetail}
                onReasonDetailChange={setInfusionTimingReasonDetail}
                required
                disabled={readOnly || submitting || !MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED}
                testId="mar-shift-timeline-drawer-start-time"
              />
              {!MAR_SHIFT_TIMELINE_START_TIME_API_SUPPORTED ? (
                <p
                  data-testid="mar-shift-timeline-drawer-start-time-unsupported"
                  style={{ margin: "6px 0 0", fontSize: 12, color: "#64748b" }}
                >
                  {t("marShiftTimeline.drawer.startTimeAutoRecorded")}
                </p>
              ) : null}
            </div>
          ) : null}

          {showStopTimeField ? (
            <div style={{ marginTop: 12, position: "relative", zIndex: 1 }}>
              <MedicationClinicalDateTimeField
                label={t("marShiftTimeline.drawer.stopTimeField")}
                value={stopTimeValue}
                onChange={setStopTimeValue}
                documentedAt={documentedAtIso}
                scheduledTime={item.scheduledAt}
                currentScheduledTime={currentScheduledAt}
                originalScheduledTime={originalScheduledAt}
                actionType={infusionStopActionType}
                facilityTimeZone={facilityTimeZone}
                reasonCode={infusionTimingReasonCode}
                onReasonCodeChange={setInfusionTimingReasonCode}
                reasonDetail={infusionTimingReasonDetail}
                onReasonDetailChange={setInfusionTimingReasonDetail}
                required
                disabled={readOnly || submitting}
                testId="mar-shift-timeline-drawer-stop-time"
              />
            </div>
          ) : null}

          {showStopNotesField ? (
            <div style={{ marginTop: 12 }}>
              {item?.clinicalAction === "STOP_INFUSION" ? (
                <>
                  <label
                    htmlFor="mar-shift-timeline-stop-reason"
                    style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}
                  >
                    {t("marInfusionStopReason.fieldLabel")}
                  </label>
                  <select
                    id="mar-shift-timeline-stop-reason"
                    data-testid="mar-shift-timeline-drawer-stop-reason"
                    value={infusionStopReasonCode}
                    onChange={(e) => setInfusionStopReasonCode(e.target.value)}
                    disabled={readOnly || submitting}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 14,
                      boxSizing: "border-box",
                      marginBottom: 10,
                    }}
                  >
                    {MEDICATION_INFUSION_NURSE_STOP_REASON_CODES.map((code) => (
                      <option key={code} value={code}>
                        {t(`marInfusionStopReason.${code}`)}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor="mar-shift-timeline-stop-reason-detail"
                    style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}
                  >
                    {t("marInfusionStopReason.detailLabel")}
                  </label>
                  <input
                    id="mar-shift-timeline-stop-reason-detail"
                    data-testid="mar-shift-timeline-drawer-stop-reason-detail"
                    type="text"
                    value={infusionStopReasonDetail}
                    onChange={(e) => setInfusionStopReasonDetail(e.target.value)}
                    disabled={readOnly || submitting}
                    placeholder={t("marInfusionStopReason.detailPlaceholder")}
                    style={{
                      width: "100%",
                      padding: "8px 10px",
                      borderRadius: 8,
                      border: "1px solid #cbd5e1",
                      fontSize: 14,
                      boxSizing: "border-box",
                      marginBottom: 10,
                    }}
                  />
                </>
              ) : null}
              <label
                htmlFor="mar-shift-timeline-stop-notes"
                style={{ display: "block", fontSize: 13, fontWeight: 600, color: "#64748b", marginBottom: 6 }}
              >
                {t("marShiftTimeline.drawer.stopNotesField")}
              </label>
              <textarea
                id="mar-shift-timeline-stop-notes"
                data-testid="mar-shift-timeline-drawer-stop-notes"
                value={stopNotes}
                onChange={(e) => setStopNotes(e.target.value)}
                disabled={readOnly || submitting}
                rows={2}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  boxSizing: "border-box",
                  resize: "vertical",
                }}
              />
            </div>
          ) : null}
        </dl>

        {!readOnly ? (
          <div style={{ marginTop: "auto" }}>
            <h3 style={{ margin: "0 0 10px 0", fontSize: 14, fontWeight: 700 }}>
              {t("marShiftTimeline.drawer.actionsHeading")}
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {item.actions.map((action) => {
                const enabled = isMarShiftTimelineActionEnabled(action, item, actionHandlers);
                const comingSoon = isMarShiftTimelineActionShowComingSoon(action, item);
                const isPrimary = primaryAction === action;
                const disabled = !enabled || submitting || actionHandlers?.busy;
                return (
                  <button
                    key={action}
                    type="button"
                    data-testid={`mar-shift-timeline-action-${action}`}
                    data-primary-action={isPrimary ? "true" : "false"}
                    data-enabled={enabled ? "true" : "false"}
                    disabled={disabled}
                    onClick={() => void handleActionClick(action)}
                    title={comingSoon ? t("marShiftTimeline.comingSoon") : undefined}
                    style={{
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      borderRadius: 8,
                      border: isPrimary && enabled ? "1px solid #2563eb" : "1px solid #e2e8f0",
                      backgroundColor:
                        !enabled
                          ? "#f8fafc"
                          : isPrimary
                            ? "#eff6ff"
                            : "#fff",
                      color: !enabled ? "#94a3b8" : "#0f172a",
                      cursor: disabled ? "not-allowed" : "pointer",
                      fontSize: 14,
                      fontWeight: isPrimary && enabled ? 700 : 400,
                    }}
                  >
                    {t(actionLabelKey(action))}
                    {comingSoon ? (
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#94a3b8" }}>
                        ({t("marShiftTimeline.comingSoon")})
                      </span>
                    ) : null}
                    {submitting && enabled && isPrimary ? (
                      <span style={{ marginLeft: 8, fontSize: 11, color: "#64748b" }}>
                        ({t("common.loading")})
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {reasonModal ? (
          <div
            data-testid="mar-shift-timeline-reason-modal"
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(15, 23, 42, 0.45)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: 16,
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              style={{
                width: "100%",
                maxWidth: 360,
                backgroundColor: "#fff",
                borderRadius: 12,
                border: "1px solid #e2e8f0",
                padding: "16px 18px",
                boxShadow: "0 12px 32px rgba(15, 23, 42, 0.18)",
              }}
            >
              <h3 style={{ margin: "0 0 12px", fontSize: 16 }}>
                {reasonModal.action === "REFUSE"
                  ? t("marShiftTimeline.reasonModal.refuseTitle")
                  : t("marShiftTimeline.reasonModal.holdTitle")}
              </h3>
              <label
                htmlFor="mar-shift-timeline-reason-code"
                style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}
              >
                {t("marShiftTimeline.reasonModal.reasonLabel")}
              </label>
              <select
                id="mar-shift-timeline-reason-code"
                data-testid="mar-shift-timeline-reason-code"
                value={reasonCode}
                onChange={(e) => setReasonCode(e.target.value)}
                disabled={submitting}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  fontSize: 14,
                  marginBottom: 12,
                }}
              >
                <option value="">{t("marShiftTimeline.reasonModal.reasonPlaceholder")}</option>
                {reasonCodes.map((code) => (
                  <option key={code} value={code}>
                    {t(`marShiftTimeline.reasonModal.reasons.${code}`)}
                  </option>
                ))}
              </select>
              {reasonCode === "OTHER" ? (
                <textarea
                  data-testid="mar-shift-timeline-reason-other"
                  value={reasonOther}
                  onChange={(e) => setReasonOther(e.target.value)}
                  disabled={submitting}
                  rows={2}
                  placeholder={t("marShiftTimeline.reasonModal.otherPlaceholder")}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "1px solid #cbd5e1",
                    fontSize: 14,
                    marginBottom: 12,
                    boxSizing: "border-box",
                  }}
                />
              ) : null}
              <MedicationClinicalDateTimeField
                label={t("marShiftTimeline.reasonModal.timeField")}
                value={reasonTimeValue}
                onChange={setReasonTimeValue}
                documentedAt={documentedAtIso}
                scheduledTime={item.scheduledAt}
                currentScheduledTime={currentScheduledAt}
                originalScheduledTime={originalScheduledAt}
                actionType={
                  reasonModal.action === "REFUSE"
                    ? "REFUSE"
                    : reasonModal.action === "MARK_MISSED"
                      ? "MISSED"
                      : "HOLD"
                }
                facilityTimeZone={facilityTimeZone}
                reasonCode={reasonTimingReasonCode}
                onReasonCodeChange={setReasonTimingReasonCode}
                reasonDetail={reasonTimingReasonDetail}
                onReasonDetailChange={setReasonTimingReasonDetail}
                required
                disabled={submitting}
                testId="mar-shift-timeline-reason-time"
              />
              <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
                <button
                  type="button"
                  data-testid="mar-shift-timeline-reason-cancel"
                  disabled={submitting}
                  onClick={() => setReasonModal(null)}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "1px solid #e2e8f0",
                    background: "#fff",
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {t("common.cancel")}
                </button>
                <button
                  type="button"
                  data-testid="mar-shift-timeline-reason-confirm"
                  disabled={submitting}
                  onClick={() => void handleReasonConfirm()}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    border: "none",
                    background: "#2563eb",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: submitting ? "not-allowed" : "pointer",
                  }}
                >
                  {submitting ? t("common.loading") : t("marShiftTimeline.reasonModal.confirm")}
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </aside>

      <MedicationDoseScheduleAdjustmentModal
        open={scheduleModalOpen}
        medicationLabel={item.medicationLabel ?? item.primaryText}
        originalScheduledAt={item.scheduledAt}
        facilityTimeZone={facilityTimeZone}
        busy={submitting}
        error={actionError}
        onClose={() => {
          if (!submitting) {
            setScheduleModalOpen(false);
            setActionError(null);
          }
        }}
        onSubmit={async (input) => {
          if (!actionHandlers?.onRequestScheduleAdjustment) {
            setActionError(t("marShiftTimeline.actionError"));
            return;
          }
          setSubmitting(true);
          setActionError(null);
          try {
            await actionHandlers.onRequestScheduleAdjustment(item, input);
            setScheduleModalOpen(false);
            await onActionSuccess?.();
          } catch (e) {
            setActionError(resolveActionError(e));
          } finally {
            setSubmitting(false);
          }
        }}
      />
    </div>
  );
}
