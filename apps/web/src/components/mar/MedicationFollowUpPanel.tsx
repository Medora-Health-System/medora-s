"use client";

import React, { useMemo } from "react";
import {
  resolveMedicationFollowUpTypeFromInput,
  type MedicationFollowUpType,
} from "@medora/shared";
import { MedicationResponseDocumentationPanel } from "@/components/mar/MedicationResponseDocumentationPanel";
import { RespiratoryMedicationResponseDocumentationPanel } from "@/components/mar/RespiratoryMedicationResponseDocumentationPanel";
import type { MarShiftTimelineCellItem } from "@/lib/marShiftTimelineApi";

export type MedicationFollowUpPanelProps = {
  item: MarShiftTimelineCellItem;
  encounterId: string;
  facilityTimeZone?: string | null;
  readOnly?: boolean;
  onSaved?: () => void | Promise<void>;
};

function resolveItemFollowUpType(item: MarShiftTimelineCellItem): MedicationFollowUpType {
  if (item.medicationFollowUpType) return item.medicationFollowUpType;
  return resolveMedicationFollowUpTypeFromInput({
    catalogCode: null,
    medicationLabel: item.medicationLabel ?? item.primaryText,
    genericName: item.medicationLabel ?? item.primaryText,
    marAction: item.administeredAt ? "administered" : null,
    administrationNotes: null,
    administeredAt: item.administeredAt,
    doseStatus: item.doseStatus,
    frequencyCode: item.frequencyCode,
    directionsSig: null,
    prnIndication: item.orderPrnIndication,
    defaultSecondaryText: item.secondaryText,
    route: item.route,
    doseKind: item.doseKind,
    clinicalAction: item.clinicalAction,
    manualLabel: item.primaryText,
    manualSecondaryText: item.secondaryText,
  });
}

/** Single follow-up UI factory — engine decides pathway, not medication name. */
export function MedicationFollowUpPanel({
  item,
  encounterId,
  facilityTimeZone = null,
  readOnly = false,
  onSaved,
}: MedicationFollowUpPanelProps) {
  const followUpType = useMemo(() => resolveItemFollowUpType(item), [item]);

  switch (followUpType) {
    case "RESPIRATORY":
      return (
        <RespiratoryMedicationResponseDocumentationPanel
          item={item}
          encounterId={encounterId}
          facilityTimeZone={facilityTimeZone}
          readOnly={readOnly}
          onSaved={onSaved}
        />
      );
    case "PAIN":
    case "SEDATION":
      return (
        <MedicationResponseDocumentationPanel
          item={item}
          encounterId={encounterId}
          facilityTimeZone={facilityTimeZone}
          readOnly={readOnly}
          onSaved={onSaved}
        />
      );
    case "NONE":
    case "LAB":
    case "NEURO":
    case "GLUCOSE":
    case "COAGULATION":
    case "CUSTOM":
    default:
      return null;
  }
}
