"use client";

import React from "react";
import Link from "next/link";
import {
  enterpriseOrderOriginLabelKey,
  formatEnterpriseOrderOriginDisplay,
} from "@medora/shared";
import { DeptWorklistReadOnlyNotice } from "@/components/worklists/DeptWorklistReadOnlyNotice";
import { LabRadiologyOperationalBadges } from "@/components/worklists/LabRadiologyOperationalBadges";
import { getPriorityBadgeSoft } from "@/components/medora-card";
import { tOrderItemStatusForWorklist, tOrderPriority } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { DISPLAY_DASH } from "@/lib/patientDisplay";
import {
  shortOrderId,
  type LabRadTechnicianKind,
  type LabRadTechnicianProjectedRow,
} from "@/lib/labRadTechnicianWorklistModel";
import { formatOrderAttributionLines } from "@/lib/orderAttribution";

const PRIMARY_BTN: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #2563eb",
  backgroundColor: "#2563eb",
  color: "#fff",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  width: "100%",
  boxSizing: "border-box",
};

const SECONDARY_BTN: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 44,
  padding: "10px 16px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  backgroundColor: "#fff",
  color: "#334155",
  fontSize: 14,
  fontWeight: 600,
  cursor: "pointer",
  textDecoration: "none",
  width: "100%",
  boxSizing: "border-box",
};

function formatInstant(raw: string | Date | null | undefined, language: string): string {
  if (raw == null || raw === "") return DISPLAY_DASH;
  const d = raw instanceof Date ? raw : new Date(raw);
  if (Number.isNaN(d.getTime())) return DISPLAY_DASH;
  return d.toLocaleString(language === "en" ? "en" : "fr", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function LabRadTechnicianDetailDrawer({
  kind,
  row,
  open,
  onClose,
  viewHref,
  showReadOnlyNotice,
  readOnlyMessage,
  primaryCtaLabel,
  primaryCtaDisabled,
  onPrimaryCta,
  showPrimaryCta,
  secondaryWorkflowLabel,
  secondaryWorkflowDisabled,
  onSecondaryWorkflow,
  showSecondaryWorkflow,
}: {
  kind: LabRadTechnicianKind;
  row: LabRadTechnicianProjectedRow | null;
  open: boolean;
  onClose: () => void;
  viewHref: string;
  showReadOnlyNotice: boolean;
  readOnlyMessage: string;
  primaryCtaLabel: string;
  primaryCtaDisabled: boolean;
  onPrimaryCta: () => void;
  showPrimaryCta: boolean;
  secondaryWorkflowLabel?: string | null;
  secondaryWorkflowDisabled?: boolean;
  onSecondaryWorkflow?: () => void;
  showSecondaryWorkflow?: boolean;
}) {
  const { t, language } = useI18n();

  if (!open || !row) return null;

  const pc = row.priority;
  const pSoft = getPriorityBadgeSoft(pc);
  const originLabel = t(enterpriseOrderOriginLabelKey(row.origin) as Parameters<typeof t>[0]);
  const originDisplay = formatEnterpriseOrderOriginDisplay({
    originLabel,
    locationLabel: row.locationLabel,
  });
  const title =
    kind === "lab"
      ? t("labRadTechnicianDashboard.drawerTitleLab")
      : t("labRadTechnicianDashboard.drawerTitleRad");

  return (
    <div
      data-testid={`${kind}-technician-detail-drawer`}
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
          width: "min(460px, 100vw)",
          height: "100%",
          background: "#fff",
          borderLeft: "1px solid #e2e8f0",
          padding: "14px 16px",
          overflowY: "auto",
          boxShadow: "-8px 0 24px rgba(15, 23, 42, 0.12)",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: "#0f172a" }}>{title}</p>
            <p style={{ margin: "4px 0 0", fontSize: 12, color: "#64748b" }}>
              {t("labRadTechnicianDashboard.colOrderId")} {shortOrderId(row.orderId)}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("common.cancel")}
            style={{
              border: "1px solid #e2e8f0",
              background: "#fff",
              borderRadius: 8,
              padding: "8px 12px",
              minHeight: 44,
              fontSize: 12,
              cursor: "pointer",
            }}
          >
            {t("common.cancel")}
          </button>
        </div>

        <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <p style={{ margin: 0, fontSize: 16, fontWeight: 600, color: "#0f172a" }}>{row.patientName}</p>
          <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>
            <span style={{ fontWeight: 600, color: "#475569" }}>{t("common.nir")}</span>{" "}
            {row.patientMrn || DISPLAY_DASH}
          </p>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 4 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 9999,
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 600,
                background: pSoft.bg,
                color: pSoft.text,
                border: `1px solid ${pSoft.border}`,
              }}
            >
              {tOrderPriority(t, pc)}
            </span>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                borderRadius: 9999,
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 600,
                background: "#f1f5f9",
                color: "#334155",
                border: "1px solid #e2e8f0",
              }}
            >
              {tOrderItemStatusForWorklist(t, String(row.item.status))}
            </span>
          </div>

          <dl
            style={{
              margin: "8px 0 0",
              display: "grid",
              gridTemplateColumns: "120px 1fr",
              gap: "6px 10px",
              fontSize: 13,
            }}
          >
            <dt style={{ color: "#64748b", margin: 0 }}>
              {kind === "lab"
                ? t("labRadTechnicianDashboard.colTestPanel")
                : t("labRadTechnicianDashboard.colStudy")}
            </dt>
            <dd style={{ margin: 0, color: "#0f172a", fontWeight: 500 }}>{row.studyOrTestLabel}</dd>

            {kind === "radiology" && row.modality ? (
              <>
                <dt style={{ color: "#64748b", margin: 0 }}>{t("labRadTechnicianDashboard.colModality")}</dt>
                <dd style={{ margin: 0, color: "#0f172a" }}>{row.modality}</dd>
              </>
            ) : null}

            <dt style={{ color: "#64748b", margin: 0 }}>{t("labRadTechnicianDashboard.colLocation")}</dt>
            <dd style={{ margin: 0, color: "#0f172a" }}>{originDisplay}</dd>

            <dt style={{ color: "#64748b", margin: 0 }}>{t("labRadTechnicianDashboard.colOrdered")}</dt>
            <dd style={{ margin: 0, color: "#0f172a" }}>{formatInstant(row.orderedAt, language)}</dd>

            {kind === "lab" ? (
              <>
                <dt style={{ color: "#64748b", margin: 0 }}>{t("labRadTechnicianDashboard.colCollected")}</dt>
                <dd style={{ margin: 0, color: "#0f172a" }}>{formatInstant(row.collectedAt, language)}</dd>
              </>
            ) : null}
          </dl>

          {formatOrderAttributionLines(row.order as any, t, language).map((line) => (
            <p key={line} style={{ margin: 0, fontSize: 12, color: "#64748b", overflowWrap: "anywhere" }}>
              {line}
            </p>
          ))}

          <LabRadiologyOperationalBadges
            escalationBadges={row.operational.escalationBadges}
            reconciliationBadges={row.operational.reconciliation.badges}
            t={t}
            compact
          />
        </div>

        <div
          style={{
            marginTop: 18,
            borderTop: "1px solid #f1f5f9",
            paddingTop: 14,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {showReadOnlyNotice ? <DeptWorklistReadOnlyNotice message={readOnlyMessage} /> : null}

          {showPrimaryCta ? (
            <button
              type="button"
              data-testid={`${kind}-drawer-primary-start`}
              disabled={primaryCtaDisabled}
              onClick={onPrimaryCta}
              aria-label={primaryCtaLabel}
              style={{
                ...PRIMARY_BTN,
                cursor: primaryCtaDisabled ? "not-allowed" : "pointer",
                opacity: primaryCtaDisabled ? 0.7 : 1,
              }}
            >
              {primaryCtaLabel}
            </button>
          ) : null}

          {showSecondaryWorkflow && secondaryWorkflowLabel && onSecondaryWorkflow ? (
            <button
              type="button"
              data-testid={`${kind}-drawer-secondary-workflow`}
              disabled={Boolean(secondaryWorkflowDisabled)}
              onClick={onSecondaryWorkflow}
              aria-label={secondaryWorkflowLabel}
              style={{
                ...PRIMARY_BTN,
                backgroundColor: "#0f172a",
                borderColor: "#0f172a",
                cursor: secondaryWorkflowDisabled ? "not-allowed" : "pointer",
                opacity: secondaryWorkflowDisabled ? 0.7 : 1,
              }}
            >
              {secondaryWorkflowLabel}
            </button>
          ) : null}

          <Link
            href={viewHref}
            style={SECONDARY_BTN}
            aria-label={t("labRadTechnicianDashboard.viewOrder")}
          >
            {t("labRadTechnicianDashboard.viewOrder")}
          </Link>
        </div>
      </aside>
    </div>
  );
}
