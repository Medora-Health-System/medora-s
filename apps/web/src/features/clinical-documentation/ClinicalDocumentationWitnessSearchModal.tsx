"use client";

import React, { useState } from "react";
import {
  ClinicalUserRoleAutocomplete,
  type ClinicalUserRoleOption,
} from "@/components/clinical/ClinicalUserRoleAutocomplete";
import { useI18n } from "@/lib/i18n";

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 80,
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

export type ClinicalDocumentationWitnessModalMode = "existing-entry" | "pre-save";

export function ClinicalDocumentationWitnessSearchModal({
  facilityId,
  currentUserId,
  authorDisplayName,
  cardTitle,
  mode = "existing-entry",
  open,
  saving,
  onClose,
  onFinalize,
}: {
  facilityId: string;
  currentUserId: string | undefined;
  authorDisplayName: string;
  cardTitle: string;
  mode?: ClinicalDocumentationWitnessModalMode;
  open: boolean;
  saving: boolean;
  onClose: () => void;
  onFinalize: (witnessUserId: string) => Promise<void>;
}) {
  const { t } = useI18n();
  const [searchText, setSearchText] = useState("");
  const [selectedUser, setSelectedUser] = useState<ClinicalUserRoleOption | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const isPreSave = mode === "pre-save";

  const handleFinalize = async () => {
    setError(null);
    if (!currentUserId) {
      setError(t("clinicalDocumentation.witnessModal.notSignedIn"));
      return;
    }
    if (!selectedUser) {
      setError(t("clinicalDocumentation.witnessModal.selectWitness"));
      return;
    }
    if (isPreSave) {
      if (selectedUser.id === currentUserId) {
        setError(t("clinicalDocumentation.witnessModal.cannotBeAuthor"));
        return;
      }
      await onFinalize(selectedUser.id);
      return;
    }
    if (selectedUser.id !== currentUserId) {
      setError(t("clinicalDocumentation.witnessModal.mustBeSelf"));
      return;
    }
    await onFinalize(currentUserId);
  };

  const title = isPreSave
    ? t("clinicalDocumentation.witnessModal.immediateTitle")
    : t("clinicalDocumentation.witnessModal.title");

  const subtitle = isPreSave
    ? t("clinicalDocumentation.witnessModal.immediateSubtitle")
    : t("clinicalDocumentation.witnessModal.subtitle")
        .replace("{card}", cardTitle)
        .replace("{author}", authorDisplayName);

  const finalizeLabel = isPreSave
    ? t("clinicalDocumentation.witnessModal.immediateConfirm")
    : t("clinicalDocumentation.witnessModal.finalize");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="clinical-documentation-witness-modal-title"
      data-testid="clinical-documentation-witness-search-modal"
      data-witness-modal-mode={mode}
      style={overlayStyle}
      onClick={onClose}
    >
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <h3
          id="clinical-documentation-witness-modal-title"
          style={{ margin: "0 0 6px", fontSize: 15, fontWeight: 700, color: "#0f172a" }}
        >
          {title}
        </h3>
        <p style={{ margin: "0 0 12px", fontSize: 12, color: "#64748b" }}>{subtitle}</p>
        {selectedUser ? (
          <p
            data-testid="clinical-documentation-witness-modal-selected"
            style={{ margin: "0 0 8px", fontSize: 12, color: "#334155" }}
          >
            {`${selectedUser.firstName} ${selectedUser.lastName}`.trim()}
          </p>
        ) : null}
        <p style={{ margin: "0 0 8px", fontSize: 11, fontWeight: 600, color: "#475569" }}>
          {t("clinicalDocumentation.witnessModal.searchLabel")}
        </p>
        <ClinicalUserRoleAutocomplete
          facilityId={facilityId}
          role="RN"
          ariaLabel={t("clinicalDocumentation.witnessModal.searchAria")}
          placeholder={t("clinicalDocumentation.witnessModal.searchPlaceholder")}
          displayValue={searchText}
          onChangeDisplay={setSearchText}
          selectedUserId={selectedUser?.id ?? null}
          onSelectUser={setSelectedUser}
          disabled={saving}
        />
        {error ? (
          <p
            data-testid="clinical-documentation-witness-modal-error"
            style={{ margin: "10px 0 0", fontSize: 12, color: "#b91c1c" }}
          >
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", gap: 8, marginTop: 14, justifyContent: "flex-end" }}>
          <button
            type="button"
            data-testid="clinical-documentation-witness-modal-cancel"
            disabled={saving}
            onClick={onClose}
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
            data-testid="clinical-documentation-witness-modal-finalize"
            disabled={saving}
            onClick={() => void handleFinalize()}
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
            {saving ? t("clinicalDocumentation.saving") : finalizeLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
