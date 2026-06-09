"use client";

import React from "react";
import {
  marAdministrationRequiresDoubleCheck,
  marInfusionStartRequiresHighAlertIvpbWitness,
  type MedicationSafetyGovernanceDisplayInput,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

export type MarHighAlertFormState = {
  verifierUserId: string | null;
  verifierDisplayName: string;
  highAlertOverrideReason: string;
  highAlertOverrideAcknowledged: boolean;
  useOverride: boolean;
};

export type MarHighAlertRouteOptions = {
  route?: string | null;
  orderRoute?: string | null;
  marRoute?: string | null;
  catalogRoute?: string | null;
  administrationType?: string | null;
  isContinuousInfusion?: boolean;
  infusionPhase?: string | null;
  catalogCode?: string | null;
  genericName?: string | null;
  therapeuticClass?: string | null;
};

export function marHighAlertWorkflowVisible(
  governance: MedicationSafetyGovernanceDisplayInput,
  marAction: string,
  options?: MarHighAlertRouteOptions
): boolean {
  return (
    marAction === "administered" &&
    marAdministrationRequiresDoubleCheck({
      isHighAlert: governance.isHighAlert === true,
      requiresDoubleSign: governance.requiresDoubleSign === true,
      highAlertClass: governance.highAlertClass,
      catalogCode: options?.catalogCode ?? null,
      genericName: options?.genericName ?? null,
      therapeuticClass: options?.therapeuticClass ?? null,
      route: options?.route ?? options?.marRoute ?? null,
      orderRoute: options?.orderRoute ?? null,
      marRoute: options?.marRoute ?? null,
      catalogRoute: options?.catalogRoute ?? null,
      administrationType: options?.administrationType ?? null,
      isContinuousInfusion: options?.isContinuousInfusion === true,
      infusionPhase: options?.infusionPhase ?? null,
    })
  );
}

export function marHighAlertOverrideComplete(
  state: MarHighAlertFormState,
  options?: {
    sharedOverrideReason?: string;
    sharedUseOverride?: boolean;
    sharedOverrideAcknowledged?: boolean;
  }
): boolean {
  const sharedUseOverride = options?.sharedUseOverride === true;
  const overrideReason =
    state.highAlertOverrideReason.trim() ||
    (sharedUseOverride ? options?.sharedOverrideReason?.trim() ?? "" : "");
  const overrideAck =
    state.highAlertOverrideAcknowledged === true ||
    (sharedUseOverride && options?.sharedOverrideAcknowledged === true);
  return overrideAck && overrideReason.length >= 8;
}

/** M1.8B.7E.1 / M1.8B.7E.2B — high-alert IVPB infusion START requires witness before note modal. */
export function marInfusionStartWitnessRequired(
  governance: MedicationSafetyGovernanceDisplayInput,
  routeOptions?: MarHighAlertRouteOptions
): boolean {
  return marInfusionStartRequiresHighAlertIvpbWitness({
    isHighAlert: governance.isHighAlert === true,
    requiresDoubleSign: governance.requiresDoubleSign === true,
    highAlertClass: governance.highAlertClass,
    catalogCode: routeOptions?.catalogCode ?? null,
    genericName: routeOptions?.genericName ?? null,
    therapeuticClass: routeOptions?.therapeuticClass ?? null,
    route: routeOptions?.route ?? routeOptions?.marRoute ?? null,
    orderRoute: routeOptions?.orderRoute ?? null,
    marRoute: routeOptions?.marRoute ?? null,
    catalogRoute: routeOptions?.catalogRoute ?? null,
    administrationType: routeOptions?.administrationType ?? null,
    isContinuousInfusion: routeOptions?.isContinuousInfusion === true,
    infusionPhase: "INFUSION_START",
  });
}

/** True when save must open the second-clinician verification modal before proceeding. */
export function marHighAlertNeedsVerifierSelection(
  governance: MedicationSafetyGovernanceDisplayInput,
  marAction: string,
  state: MarHighAlertFormState,
  routeOptions?: MarHighAlertRouteOptions,
  options?: {
    sharedOverrideReason?: string;
    sharedUseOverride?: boolean;
    sharedOverrideAcknowledged?: boolean;
  }
): boolean {
  if (!marHighAlertWorkflowVisible(governance, marAction, routeOptions)) {
    return false;
  }
  if (state.verifierUserId?.trim()) {
    return false;
  }
  if (marHighAlertOverrideComplete(state, options)) {
    return false;
  }
  return true;
}

export function MarHighAlertFields({
  governance,
  marAction,
  state,
  onChange,
  fieldErrors,
  routeOptions,
  sharedOverrideReason,
  sharedUseOverride,
  onUseSharedOverride,
}: {
  governance: MedicationSafetyGovernanceDisplayInput;
  marAction: string;
  state: MarHighAlertFormState;
  onChange: (patch: Partial<MarHighAlertFormState>) => void;
  fieldErrors?: Partial<Record<keyof MarHighAlertFormState | "verifier", string>>;
  routeOptions?: MarHighAlertRouteOptions;
  /** When controlled-substance override is active, reuse its reason field. */
  sharedOverrideReason?: string;
  sharedUseOverride?: boolean;
  onUseSharedOverride?: (use: boolean) => void;
}) {
  const { t } = useI18n();

  if (!marHighAlertWorkflowVisible(governance, marAction, routeOptions)) {
    return null;
  }

  const useSharedOverride = sharedUseOverride === true;
  const showLocalOverride = state.useOverride && !useSharedOverride;
  const showVerifierStatus = !showLocalOverride && !useSharedOverride;
  const verifierSelected = Boolean(state.verifierUserId?.trim());

  return (
    <section
      role="region"
      aria-labelledby="mar-high-alert-workflow-title"
      style={{
        marginBottom: 14,
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid #fdba74",
        backgroundColor: "#fff7ed",
      }}
    >
      <h4
        id="mar-high-alert-workflow-title"
        style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#9a3412" }}
      >
        {t("marHighAlert.title")}
      </h4>
      <p
        id="mar-high-alert-workflow-desc"
        style={{ margin: "0 0 12px", fontSize: 12, color: "#7c2d12" }}
      >
        <span className="sr-only">{t("marHighAlert.warningSrOnly")} </span>
        {t("marHighAlert.description")}
      </p>

      {showVerifierStatus ? (
        <div style={{ marginBottom: 12 }}>
          {verifierSelected ? (
            <p
              data-testid="mar-high-alert-verifier-selected"
              style={{ margin: "0 0 8px", fontSize: 12, color: "#166534", fontWeight: 600 }}
            >
              {t("marHighAlert.verifierSelected")}: {state.verifierDisplayName.trim() || state.verifierUserId}
            </p>
          ) : (
            <p
              data-testid="mar-high-alert-verifier-pending"
              style={{ margin: "0 0 8px", fontSize: 12, color: "#9a3412", fontWeight: 600 }}
            >
              {t("marHighAlert.verifierPendingOnSave")}
            </p>
          )}
          <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={state.useOverride}
              onChange={(e) => {
                onChange({ useOverride: e.target.checked });
                onUseSharedOverride?.(false);
              }}
            />
            {t("marHighAlert.useOverride")}
          </label>
          {fieldErrors?.verifier ? (
            <p role="alert" style={{ margin: "6px 0 0", fontSize: 12, color: "#b91c1c" }}>
              {fieldErrors.verifier}
            </p>
          ) : null}
        </div>
      ) : null}

      {showLocalOverride ? (
        <div style={{ marginBottom: 12 }}>
          <label htmlFor="mar-high-alert-override-reason" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
            {t("marHighAlert.overrideReasonLabel")}
          </label>
          <textarea
            id="mar-high-alert-override-reason"
            value={state.highAlertOverrideReason}
            onChange={(e) => onChange({ highAlertOverrideReason: e.target.value })}
            rows={3}
            style={{ width: "100%", marginTop: 4, fontSize: 13, borderRadius: 8, border: "1px solid #fdba74" }}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={state.highAlertOverrideAcknowledged}
              onChange={(e) => onChange({ highAlertOverrideAcknowledged: e.target.checked })}
            />
            {t("marHighAlert.overrideAck")}
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
            {t("marHighAlert.backToVerifier")}
          </button>
        </div>
      ) : null}

      {useSharedOverride && sharedOverrideReason !== undefined ? (
        <p style={{ margin: 0, fontSize: 12, color: "#7c2d12" }}>
          {t("marHighAlert.sharedOverrideHint")}
        </p>
      ) : null}

      {useSharedOverride ? (
        <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, fontSize: 12 }}>
          <input
            type="checkbox"
            checked={state.highAlertOverrideAcknowledged}
            onChange={(e) => onChange({ highAlertOverrideAcknowledged: e.target.checked })}
          />
          {t("marHighAlert.overrideAck")}
        </label>
      ) : null}
    </section>
  );
}
