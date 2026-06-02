"use client";

import React from "react";
import {
  formatLasaSeverity,
  lasaMarRequiresAcknowledgement,
  type MedicationSafetyGovernanceDisplayInput,
} from "@medora/shared";
import { ClinicalUserRoleAutocomplete } from "@/components/clinical/ClinicalUserRoleAutocomplete";
import type { ClinicalUserRoleOption } from "@/components/clinical/ClinicalUserRoleAutocomplete";
import { useI18n } from "@/lib/i18n";

export type MarLasaFormState = {
  lasaAcknowledged: boolean;
  lasaMedicationSelectionConfirmed: boolean;
  secondReadUserId: string | null;
  secondReadDisplayName: string;
  lasaOverrideReason: string;
  lasaOverrideAcknowledged: boolean;
  useOverride: boolean;
};

export function marLasaWorkflowVisible(
  governance: MedicationSafetyGovernanceDisplayInput,
  marAction: string
): boolean {
  return (
    marAction === "administered" &&
    lasaMarRequiresAcknowledgement({
      lasaGroupId: governance.lasaGroupId,
      lasaSeverity: governance.lasaSeverity,
    })
  );
}

export function MarLasaFields({
  facilityId,
  governance,
  marAction,
  medicationLabel,
  state,
  onChange,
  fieldErrors,
}: {
  facilityId: string;
  governance: MedicationSafetyGovernanceDisplayInput;
  marAction: string;
  medicationLabel: string;
  state: MarLasaFormState;
  onChange: (patch: Partial<MarLasaFormState>) => void;
  fieldErrors?: Partial<Record<keyof MarLasaFormState | "lasa", string>>;
}) {
  const { t } = useI18n();

  if (!marLasaWorkflowVisible(governance, marAction)) {
    return null;
  }

  const severityLabel = formatLasaSeverity(governance.lasaSeverity) ?? governance.lasaSeverity;
  const groupLabel =
    governance.lasaGroupLabel?.trim() || governance.lasaGroupId?.trim() || t("common.dash");
  const showOverride = state.useOverride;

  const secondReadSelected: ClinicalUserRoleOption | null = state.secondReadUserId
    ? {
        id: state.secondReadUserId,
        firstName: state.secondReadDisplayName.split(" ")[0] ?? "",
        lastName: state.secondReadDisplayName.split(" ").slice(1).join(" ") ?? "",
      }
    : null;

  return (
    <section
      role="region"
      aria-labelledby="mar-lasa-workflow-title"
      style={{
        marginBottom: 14,
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid #c4b5fd",
        backgroundColor: "#f5f3ff",
      }}
    >
      <h4
        id="mar-lasa-workflow-title"
        style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#5b21b6" }}
      >
        {t("marLasa.title")}
      </h4>
      <p
        id="mar-lasa-workflow-desc"
        style={{ margin: "0 0 8px", fontSize: 12, color: "#4c1d95" }}
      >
        <span className="sr-only">{t("marLasa.warningSrOnly")} </span>
        {t("marLasa.description")}
      </p>
      <dl style={{ margin: "0 0 12px", fontSize: 12, color: "#4c1d95" }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <dt style={{ fontWeight: 600 }}>{t("marLasa.groupLabel")}</dt>
          <dd style={{ margin: 0 }}>{groupLabel}</dd>
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
          <dt style={{ fontWeight: 600 }}>{t("marLasa.severityLabel")}</dt>
          <dd style={{ margin: 0 }}>{severityLabel}</dd>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <dt style={{ fontWeight: 600 }}>{t("marLasa.medicationLabel")}</dt>
          <dd style={{ margin: 0 }}>{medicationLabel}</dd>
        </div>
      </dl>

      {!showOverride ? (
        <>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={state.lasaAcknowledged}
              onChange={(e) => onChange({ lasaAcknowledged: e.target.checked })}
              aria-describedby="mar-lasa-workflow-desc"
            />
            {t("marLasa.ackLabel")}
          </label>
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginBottom: 12, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={state.lasaMedicationSelectionConfirmed}
              onChange={(e) => onChange({ lasaMedicationSelectionConfirmed: e.target.checked })}
            />
            {t("marLasa.selectionConfirmLabel")}
          </label>

          <div style={{ marginBottom: 12 }}>
            <label htmlFor="mar-lasa-second-read" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
              {t("marLasa.secondReadLabel")}
            </label>
            <ClinicalUserRoleAutocomplete
              facilityId={facilityId}
              role="RN"
              ariaLabel={t("marLasa.secondReadAria")}
              placeholder={t("marLasa.secondReadPlaceholder")}
              displayValue={state.secondReadDisplayName}
              onChangeDisplay={(v) => onChange({ secondReadDisplayName: v, secondReadUserId: null })}
              selectedUserId={state.secondReadUserId}
              onSelectUser={(u) =>
                onChange({
                  secondReadUserId: u?.id ?? null,
                  secondReadDisplayName: u ? `${u.firstName} ${u.lastName}`.trim() : "",
                })
              }
            />
            {secondReadSelected ? (
              <p style={{ margin: "6px 0 0", fontSize: 12, color: "#166534" }}>
                {t("marLasa.secondReadSelected")}
              </p>
            ) : null}
          </div>

          <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
            <input
              type="checkbox"
              checked={showOverride}
              onChange={(e) => onChange({ useOverride: e.target.checked })}
            />
            {t("marLasa.useOverride")}
          </label>
          {fieldErrors?.lasa ? (
            <p role="alert" style={{ margin: "6px 0 0", fontSize: 12, color: "#b91c1c" }}>
              {fieldErrors.lasa}
            </p>
          ) : null}
        </>
      ) : null}

      {showOverride ? (
        <div>
          <label htmlFor="mar-lasa-override-reason" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
            {t("marLasa.overrideReasonLabel")}
          </label>
          <textarea
            id="mar-lasa-override-reason"
            value={state.lasaOverrideReason}
            onChange={(e) => onChange({ lasaOverrideReason: e.target.value })}
            rows={3}
            style={{ width: "100%", marginTop: 4, fontSize: 13, borderRadius: 8, border: "1px solid #c4b5fd" }}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={state.lasaOverrideAcknowledged}
              onChange={(e) => onChange({ lasaOverrideAcknowledged: e.target.checked })}
            />
            {t("marLasa.overrideAck")}
          </label>
          <button
            type="button"
            style={{
              marginTop: 8,
              fontSize: 12,
              background: "none",
              border: "none",
              color: "#1d4ed8",
              cursor: "pointer",
              textDecoration: "underline",
            }}
            onClick={() => onChange({ useOverride: false })}
          >
            {t("marLasa.backToAck")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
