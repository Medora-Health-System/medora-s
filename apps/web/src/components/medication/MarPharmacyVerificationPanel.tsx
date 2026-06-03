"use client";

import React from "react";
import {
  marPharmacyBlockingWorkflowVisible,
  type MedicationSafetyGovernanceDisplayInput,
} from "@medora/shared";
import { useI18n } from "@/lib/i18n";

export type MarPharmacyFormState = {
  pharmacyVerificationOverrideReason: string;
  pharmacyVerificationOverrideAcknowledged: boolean;
  useOverride: boolean;
};

export function marPharmacyWorkflowVisible(
  governance: MedicationSafetyGovernanceDisplayInput,
  marAction: string
): boolean {
  return marPharmacyBlockingWorkflowVisible(governance, marAction);
}

function formatVerifiedAt(iso: string | null | undefined, locale: string): string | null {
  if (!iso?.trim()) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString(locale);
}

export function MarPharmacyVerificationPanel({
  governance,
  marAction,
  state,
  onChange,
  dateLocale,
}: {
  governance: MedicationSafetyGovernanceDisplayInput;
  marAction: string;
  state: MarPharmacyFormState;
  onChange: (patch: Partial<MarPharmacyFormState>) => void;
  dateLocale: string;
}) {
  const { t } = useI18n();

  if (!marPharmacyWorkflowVisible(governance, marAction)) {
    return null;
  }

  const status = governance.pharmacyVerificationStatus ?? "PENDING";
  const verifiedAt = formatVerifiedAt(governance.pharmacyVerifiedAt, dateLocale);
  const verifiedBy = governance.pharmacyVerifiedByDisplay?.trim() || null;
  const showOverride =
    state.useOverride && status !== "VERIFIED" && status !== "NOT_REQUIRED";

  return (
    <section
      role="region"
      aria-labelledby="mar-pharmacy-workflow-title"
      style={{
        marginBottom: 14,
        padding: "12px 14px",
        borderRadius: 8,
        border: "1px solid #fde68a",
        backgroundColor: "#fffbeb",
      }}
    >
      <h4
        id="mar-pharmacy-workflow-title"
        style={{ margin: "0 0 6px", fontSize: 14, fontWeight: 700, color: "#92400e" }}
      >
        {t("marPharmacy.title")}
      </h4>
      <p id="mar-pharmacy-workflow-desc" style={{ margin: "0 0 10px", fontSize: 12, color: "#78350f" }}>
        <span className="sr-only">{t("marPharmacy.warningSrOnly")} </span>
        {t("marPharmacy.description")}
      </p>

      {status === "VERIFIED" ? (
        <p style={{ margin: "0 0 8px", fontSize: 13, color: "#166534", fontWeight: 600 }}>
          {t("marPharmacy.verifiedBanner")}
          {verifiedBy ? ` — ${t("marPharmacy.verifiedByPrefix")} ${verifiedBy}` : ""}
          {verifiedAt ? ` (${verifiedAt})` : ""}
        </p>
      ) : null}

      {status === "PENDING" || (governance.requiresPharmacyVerification && status !== "VERIFIED") ? (
        <p
          role="status"
          style={{ margin: "0 0 10px", fontSize: 13, color: "#b45309", fontWeight: 600 }}
        >
          {t("marPharmacy.pendingBanner")}
        </p>
      ) : null}

      {status === "REJECTED" ? (
        <p
          role="alert"
          style={{ margin: "0 0 10px", fontSize: 13, color: "#b91c1c", fontWeight: 600 }}
        >
          {t("marPharmacy.rejectedBanner")}
        </p>
      ) : null}

      {status !== "VERIFIED" && !showOverride ? (
        <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 12 }}>
          <input
            type="checkbox"
            checked={state.useOverride}
            onChange={(e) => onChange({ useOverride: e.target.checked })}
          />
          {t("marPharmacy.useOverride")}
        </label>
      ) : null}

      {showOverride ? (
        <div style={{ marginTop: 8 }}>
          <label htmlFor="mar-pharmacy-override-reason" style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
            {t("marPharmacy.overrideReasonLabel")}
          </label>
          <textarea
            id="mar-pharmacy-override-reason"
            value={state.pharmacyVerificationOverrideReason}
            onChange={(e) => onChange({ pharmacyVerificationOverrideReason: e.target.value })}
            rows={3}
            style={{ width: "100%", marginTop: 4, fontSize: 13, borderRadius: 8, border: "1px solid #fde68a" }}
          />
          <label style={{ display: "flex", gap: 8, alignItems: "flex-start", marginTop: 8, fontSize: 12 }}>
            <input
              type="checkbox"
              checked={state.pharmacyVerificationOverrideAcknowledged}
              onChange={(e) => onChange({ pharmacyVerificationOverrideAcknowledged: e.target.checked })}
            />
            {t("marPharmacy.overrideAck")}
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
            {t("marPharmacy.backToStatus")}
          </button>
        </div>
      ) : null}
    </section>
  );
}
