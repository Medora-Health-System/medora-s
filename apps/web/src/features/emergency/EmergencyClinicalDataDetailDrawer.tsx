"use client";

import React, { useMemo } from "react";
import {
  buildClinicalDocumentationDetailRows,
  getClinicalDocumentationCardById,
  selectClinicalDocumentationCardTitle,
} from "@medora/shared";
import type { ClinicalDocumentationEntryRow } from "@/lib/clinicalDocumentationApi";
import { useI18n } from "@/lib/i18n";
import { formatClinicalInstantForFacility } from "@/lib/clinicalTimeDisplay";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { resolveClinicalDataAccessMode } from "./edClinicalDataWorkspaceGovernance";

import { resolveProductUiLanguageOrDefault } from "@/i18n/config";

export function EmergencyClinicalDataDetailDrawer({
  entry,
  open,
  facilityTimeZone,
  onClose,
  onOpenForm,
}: {
  entry: ClinicalDocumentationEntryRow | null;
  open: boolean;
  facilityTimeZone?: string | null;
  onClose: () => void;
  onOpenForm: (cardId: string) => void;
}) {
  const { t, language } = useI18n();
  const { roles } = useFacilityAndRoles();
  const locale = resolveProductUiLanguageOrDefault(language);

  const card = entry ? getClinicalDocumentationCardById(entry.cardId) : null;

  const accessMode = useMemo(() => {
    if (!card) return "review" as const;
    return resolveClinicalDataAccessMode({
      formOwner: card.primaryRole,
      userRoles: roles,
      sourceWorkspace: "clinicalData",
    });
  }, [card, roles]);

  const detailRows = useMemo(() => {
    if (!entry) return [];
    return buildClinicalDocumentationDetailRows(entry, locale);
  }, [entry, locale]);

  if (!open || !entry) return null;

  const title = selectClinicalDocumentationCardTitle(entry, locale);
  const when = formatClinicalInstantForFacility(entry.createdAt, facilityTimeZone, language);
  const status = entry.voidedAt
    ? t("emergencyClinicalData.summary.status.voided")
    : entry.witnessStatus === "PENDING_WITNESS"
      ? t("emergencyClinicalData.summary.status.pendingWitness")
      : t("emergencyClinicalData.summary.status.documented");

  return (
    <div
      data-testid="clinical-data-detail-drawer"
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 1200,
        display: "flex",
        justifyContent: "flex-end",
        background: "rgba(15, 23, 42, 0.35)",
      }}
      onClick={onClose}
    >
      <aside
        role="dialog"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(420px, 100vw)",
          height: "100%",
          background: "#fff",
          borderLeft: "1px solid #e2e8f0",
          padding: "14px 16px",
          overflowY: "auto",
          boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.12)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{title}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>{entry.category}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              borderRadius: 8,
              padding: "4px 10px",
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
        </div>

        <p style={{ margin: "10px 0 0", fontSize: 12, color: "#475569" }}>
          {t("emergencyClinicalData.detail.completedBy")}: {entry.authorRoleTitle} {entry.authorDisplayName}
        </p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>{when}</p>
        <p style={{ margin: "4px 0 0", fontSize: 12, color: "#475569" }}>{status}</p>
        {entry.witnessStatus === "PENDING_WITNESS" ? (
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "#92400e" }}>
            {t("emergencyClinicalData.summary.status.pendingWitness")}
          </p>
        ) : null}

        <div style={{ marginTop: 12, borderTop: "1px solid #f1f5f9", paddingTop: 10 }}>
          {detailRows.length === 0 ? (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>
              {t("emergencyClinicalData.summary.insufficientData")}
            </p>
          ) : (
            detailRows.map((row) => (
              <div
                key={`${row.label}-${row.value}`}
                data-testid="clinical-data-detail-row"
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(120px, 0.45fr) minmax(0, 1fr)",
                  gap: 8,
                  fontSize: 12,
                  padding: "4px 0",
                  borderBottom: "1px solid #f8fafc",
                }}
              >
                <span style={{ color: "#64748b" }}>{row.label}</span>
                <span style={{ color: "#0f172a", fontWeight: 500 }}>{row.value}</span>
              </div>
            ))
          )}
        </div>

        <div style={{ marginTop: 14, display: "flex", gap: 8 }}>
          {accessMode === "editable" ? (
            <button
              type="button"
              data-testid="clinical-data-detail-open-form"
              onClick={() => onOpenForm(entry.cardId)}
              style={{
                padding: "8px 12px",
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 8,
                border: "none",
                background: "#0f172a",
                color: "#fff",
                cursor: "pointer",
              }}
            >
              {t("emergencyClinicalData.detail.openForm")}
            </button>
          ) : (
            <span
              data-testid="clinical-data-detail-review-only"
              style={{ fontSize: 12, color: "#64748b", alignSelf: "center" }}
            >
              {t("emergencyClinicalData.detail.reviewOnly")}
            </span>
          )}
        </div>
      </aside>
    </div>
  );
}
