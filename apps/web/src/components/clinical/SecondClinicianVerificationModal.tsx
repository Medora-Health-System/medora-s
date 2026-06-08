"use client";

import React, { useEffect, useState } from "react";
import {
  ClinicalUserRoleAutocomplete,
  type ClinicalUserRoleOption,
} from "@/components/clinical/ClinicalUserRoleAutocomplete";
import { useI18n } from "@/lib/i18n";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 1100,
  background: "rgba(15, 23, 42, 0.45)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 16,
};

const panelStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  background: "#fff",
  borderRadius: 12,
  border: "1px solid #e2e8f0",
  padding: "16px 18px",
  boxShadow: "0 16px 40px rgba(15, 23, 42, 0.18)",
};

export type SecondClinicianVerificationMode = "require-second-clinician" | "require-self";

export function SecondClinicianVerificationModal({
  facilityId,
  currentUserId,
  title,
  subtitle,
  roleFilter = "RN",
  mode = "require-second-clinician",
  open,
  saving = false,
  confirmLabel,
  searchLabel,
  searchAria,
  searchPlaceholder,
  testId = "second-clinician-verification-modal",
  onCancel,
  onConfirm,
}: {
  facilityId: string;
  currentUserId: string | undefined;
  title: string;
  subtitle: string;
  roleFilter?: "PROVIDER" | "RN";
  mode?: SecondClinicianVerificationMode;
  open: boolean;
  saving?: boolean;
  confirmLabel?: string;
  searchLabel?: string;
  searchAria?: string;
  searchPlaceholder?: string;
  testId?: string;
  onCancel: () => void;
  onConfirm: (userId: string, user: ClinicalUserRoleOption) => void | Promise<void>;
}) {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState<ClinicalUserRoleOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setSearchText("");
      setSelectedUser(null);
      setError(null);
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = async () => {
    setError(null);
    if (!currentUserId) {
      setError(t("clinicalDocumentation.witnessModal.notSignedIn"));
      return;
    }
    if (!selectedUser) {
      setError(t("clinicalDocumentation.witnessModal.selectWitness"));
      return;
    }
    if (mode === "require-second-clinician") {
      if (selectedUser.id === currentUserId) {
        setError(t("clinicalDocumentation.witnessModal.cannotBeAuthor"));
        return;
      }
      await onConfirm(selectedUser.id, selectedUser);
      return;
    }
    if (selectedUser.id !== currentUserId) {
      setError(t("clinicalDocumentation.witnessModal.mustBeSelf"));
      return;
    }
    await onConfirm(currentUserId, selectedUser);
  };

  const resolvedConfirmLabel =
    confirmLabel ??
    (mode === "require-second-clinician"
      ? t("secondClinicianVerification.confirmSecondClinician")
      : t("clinicalDocumentation.witnessModal.finalize"));

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="second-clinician-verification-modal-title"
      data-testid={testId}
      data-verification-mode={mode}
      style={overlayStyle}
      onClick={onCancel}
    >
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3
          id="second-clinician-verification-modal-title"
          style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}
        >
          {title}
        </h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{subtitle}</p>
        {selectedUser ? (
          <p
            data-testid="second-clinician-verification-modal-selected"
            style={{ margin: "0 0 8px", fontSize: 12, color: "#334155" }}
          >
            {`${selectedUser.firstName} ${selectedUser.lastName}`.trim()}
          </p>
        ) : null}
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#475569" }}>
          {searchLabel ?? t("clinicalDocumentation.witnessModal.searchLabel")}
        </p>
        <ClinicalUserRoleAutocomplete
          facilityId={facilityId}
          role={roleFilter}
          ariaLabel={searchAria ?? t("clinicalDocumentation.witnessModal.searchAria")}
          placeholder={searchPlaceholder ?? t("clinicalDocumentation.witnessModal.searchPlaceholder")}
          displayValue={searchText}
          onChangeDisplay={setSearchText}
          selectedUserId={selectedUser?.id ?? null}
          onSelectUser={setSelectedUser}
          disabled={saving}
        />
        {error ? (
          <p
            data-testid="second-clinician-verification-modal-error"
            style={{ margin: "10px 0 0", fontSize: 12, color: "#b91c1c" }}
          >
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button
            type="button"
            data-testid="second-clinician-verification-modal-cancel"
            disabled={saving}
            onClick={onCancel}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid #cbd5e1",
              background: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            data-testid="second-clinician-verification-modal-confirm"
            disabled={saving}
            onClick={() => void handleConfirm()}
            style={{
              padding: "6px 12px",
              fontSize: 12,
              fontWeight: 600,
              borderRadius: 8,
              border: "1px solid #0f172a",
              background: saving ? "#94a3b8" : "#0f172a",
              color: "#fff",
              cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? t("clinicalDocumentation.saving") : resolvedConfirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
