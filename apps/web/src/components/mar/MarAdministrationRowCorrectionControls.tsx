"use client";

import React, { useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";
import type { MedicationAdministrationHistoryEntry } from "@medora/shared";
import { resolveMedicationMarActionFromStorage } from "@medora/shared";
import {
  buildMarClinicalCorrectionChain,
  buildMarClinicalCorrectionMenu,
  resolveMarAdministrationCorrectedBadge,
  type MarClinicalCorrectionActionType,
} from "@/features/mar/marClinicalCorrectionWorkflow";
import { MedicationAdministrationCorrectionMenu } from "@/components/mar/MedicationAdministrationCorrectionMenu";
import { MedicationAdministrationCorrectionBadge } from "@/components/mar/MedicationAdministrationCorrectionBadge";
import { MedicationAdministrationCorrectionChainViewer } from "@/components/mar/MedicationAdministrationCorrectionChainViewer";
import {
  MedicationAdministrationClinicalCorrectionModal,
  type MarClinicalCorrectionModalTarget,
} from "@/components/mar/MedicationAdministrationClinicalCorrectionModal";

export type MarAdministrationCorrectionRow = {
  id: string;
  medicationLabelSnapshot?: string | null;
  doseValue?: string | number | null;
  doseUnit?: string | null;
  route?: string | null;
  marAction?: string | null;
  notes?: string | null;
  infusionPhase?: string | null;
};

export function MarAdministrationRowCorrectionControls({
  row,
  medicationLabel,
  encounterId,
  facilityId,
  facilityTimeZone,
  language,
  encounterOpen,
  canAdjust,
  readOnly,
  historyEntries,
  t,
  onOpenTimeCorrection,
  onSaved,
}: {
  row: MarAdministrationCorrectionRow;
  medicationLabel: string;
  encounterId: string;
  facilityId: string;
  facilityTimeZone: string | null | undefined;
  language: string;
  encounterOpen: boolean;
  canAdjust: boolean;
  readOnly?: boolean;
  historyEntries: MedicationAdministrationHistoryEntry[];
  t: (key: string) => string;
  onOpenTimeCorrection: () => void;
  onSaved: () => Promise<void>;
}) {
  const [clinicalModalType, setClinicalModalType] = useState<MarClinicalCorrectionActionType | null>(
    null
  );
  const [saving, setSaving] = useState(false);
  const [showChain, setShowChain] = useState(false);

  const marActionResolved = resolveMedicationMarActionFromStorage({
    marAction: row.marAction ?? null,
    notes: row.notes,
  });

  const menu = useMemo(
    () =>
      buildMarClinicalCorrectionMenu({
        encounterOpen,
        canAdjust,
        marActionResolved,
        infusionPhase: row.infusionPhase,
        notes: row.notes,
        readOnly,
      }),
    [canAdjust, encounterOpen, marActionResolved, readOnly, row.infusionPhase, row.notes]
  );

  const badge = useMemo(
    () =>
      resolveMarAdministrationCorrectedBadge({
        administrationId: row.id,
        historyEntries,
        readOnly,
      }),
    [historyEntries, readOnly, row.id]
  );

  const chainSteps = useMemo(
    () =>
      buildMarClinicalCorrectionChain({
        administrationId: row.id,
        historyEntries,
      }),
    [historyEntries, row.id]
  );

  const formatClinicalTime = (iso: string) =>
    formatClinicalInstantForFacility(iso, facilityTimeZone, language as "fr" | "en");

  const modalTarget: MarClinicalCorrectionModalTarget = {
    administrationId: row.id,
    medicationLabel,
    doseValue: row.doseValue,
    doseUnit: row.doseUnit,
    route: row.route,
    marAction: row.marAction,
    notes: row.notes,
  };

  if (!menu.visible && !badge) return null;

  return (
    <div data-testid="mar-administration-correction-controls" style={{ marginTop: 8 }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 8 }}>
        {menu.visible ? (
          <MedicationAdministrationCorrectionMenu
            items={menu.items}
            t={t}
            disabled={!encounterOpen || !canAdjust || readOnly}
            onSelectAction={(type) => {
              if (type === "TIME") {
                onOpenTimeCorrection();
                return;
              }
              setClinicalModalType(type);
            }}
          />
        ) : null}
        {badge ? (
          <MedicationAdministrationCorrectionBadge
            badge={badge}
            t={t}
            formatClinicalTime={formatClinicalTime}
          />
        ) : null}
        {chainSteps.length > 1 ? (
          <button
            type="button"
            data-testid="mar-clinical-correction-chain-toggle"
            onClick={() => setShowChain((v) => !v)}
            style={{
              border: "none",
              background: "transparent",
              color: "#2563eb",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: 0,
            }}
          >
            {showChain
              ? t("marClinicalCorrection.chain.hide")
              : t("marClinicalCorrection.chain.show")}
          </button>
        ) : null}
      </div>
      {showChain ? (
        <MedicationAdministrationCorrectionChainViewer
          steps={chainSteps}
          t={t}
          formatClinicalTime={formatClinicalTime}
          readOnly={readOnly}
        />
      ) : null}
      {clinicalModalType ? (
        <MedicationAdministrationClinicalCorrectionModal
          open
          correctionType={clinicalModalType}
          target={modalTarget}
          workflowEditable={encounterOpen && canAdjust && !readOnly}
          saving={saving}
          onClose={() => {
            if (!saving) setClinicalModalType(null);
          }}
          onSave={async (payload) => {
            setSaving(true);
            try {
              await apiFetch(
                `/encounters/${encounterId}/medication-administrations/${row.id}/clinical-correction`,
                {
                  facilityId,
                  method: "PATCH",
                  body: JSON.stringify(payload),
                }
              );
              setClinicalModalType(null);
              await onSaved();
            } finally {
              setSaving(false);
            }
          }}
        />
      ) : null}
    </div>
  );
}
