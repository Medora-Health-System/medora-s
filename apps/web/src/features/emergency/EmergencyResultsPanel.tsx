"use client";

import React, { useCallback, useMemo, useState } from "react";
import {
  EncounterResultsTab,
  type EncounterLabRadRow,
  type EncounterResultsLabRadSnapshot,
} from "@/components/encounters/EncounterResultsTab";
import { buildErResultsCockpitModel } from "@/features/emergency/emergencyResultsCockpitModel";
import { clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import { getOrderItemDisplayLabelForLanguage } from "@/lib/orderItemDisplayFr";
import { useI18n } from "@/lib/i18n";
import type { SupportedLanguage } from "@/i18n/config";
import type { PrintFacilityInfo } from "@/lib/printFacilityHeader";
import type { ResultPrintEncounter, ResultPrintPatient } from "@/features/emergency/resultPrintPacket";
import {
  MedoraCard,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
  type PriorityBadgeSoft,
} from "@/components/medora-card";

const sectionLabel: React.CSSProperties = {
  margin: 0,
  fontSize: 9,
  fontWeight: 700,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "#64748b",
};

const rowBase: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  alignItems: "center",
  gap: 6,
  fontSize: 12,
  lineHeight: 1.35,
  color: "#0f172a",
};

const BADGE_SOFT_NEUTRAL: PriorityBadgeSoft = { bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" };

function fillTemplate(s: string, vars: Record<string, string | number>) {
  let out = s;
  for (const [k, v] of Object.entries(vars)) {
    out = out.split(`{${k}}`).join(String(v));
  }
  return out;
}

function formatShortTs(iso: string | null | undefined, locale: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString(locale, { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function orderCreatedMs(order: unknown): number {
  if (!order || typeof order !== "object") return 0;
  const c = (order as { createdAt?: string }).createdAt;
  if (typeof c !== "string" || !c.trim()) return 0;
  const ts = Date.parse(c);
  return Number.isNaN(ts) ? 0 : ts;
}

function orderChartStatusDisplay(status: string | null | undefined, tr: (k: string) => string): string {
  const u = (status || "").toUpperCase();
  if (u === "COMPLETED" || u === "RESULTED" || u === "VERIFIED") {
    return tr("printOutput.orderItemChart.terminalDone");
  }
  const k = `printOutput.orderItemChart.${u}`;
  const r = tr(k);
  return r !== k ? r : "—";
}

function CompactResultRow({
  row,
  emphasize,
  language,
  t,
}: {
  row: EncounterLabRadRow;
  emphasize?: boolean;
  language: SupportedLanguage;
  t: (k: string) => string;
}) {
  const locale = language === "en" ? "en-US" : "fr-FR";
  const disp = getOrderItemDisplayLabelForLanguage(row.item, language, t);
  const v = clinicalResultFromOrderItemLike({
    displayLabel: disp,
    status: row.item.status,
    catalogItemType: row.item.catalogItemType,
    result: row.item.result,
    emptyTitleFallback: t("emergencyResultsPanel.fallbackStudyLabel"),
  });
  const label = v.title.trim() || t("emergencyResultsPanel.fallbackStudyLabel");
  const statusLabel = orderChartStatusDisplay(row.item.status ?? "", t);
  const tsDisplay = v.verifiedAt
    ? formatShortTs(v.verifiedAt, locale)
    : orderCreatedMs(row.order) > 0
      ? formatShortTs(new Date(orderCreatedMs(row.order)).toISOString(), locale)
      : "—";
  const crit =
    row.item.result &&
    typeof row.item.result === "object" &&
    (row.item.result as { criticalValue?: boolean }).criticalValue === true;

  return (
    <div
      style={{
        ...rowBase,
        padding: "5px 8px",
        borderRadius: 8,
        border: emphasize || crit ? "1px solid #fecaca" : "1px solid #e2e8f0",
        backgroundColor: emphasize || crit ? "#fef2f2" : "#fff",
      }}
    >
      <span style={{ fontWeight: 600, color: "#0f172a", flex: "1 1 140px", minWidth: 0, wordBreak: "break-word" }}>
        {label}
      </span>
      <MedoraCardBadgeRow marginTop={0}>
        {crit ? (
          <MedoraCardBadge soft={{ bg: "#fef2f2", text: "#991b1b", border: "#fecaca" }}>
            {t("emergencyResultsPanel.badgeCritical")}
          </MedoraCardBadge>
        ) : null}
        {row.pendingSync ? (
          <MedoraCardBadge soft={{ bg: "#fffbeb", text: "#92400e", border: "#fde68a" }}>
            {t("emergencyResultsPanel.badgeLocalSync")}
          </MedoraCardBadge>
        ) : null}
        <MedoraCardBadge soft={BADGE_SOFT_NEUTRAL}>{statusLabel}</MedoraCardBadge>
      </MedoraCardBadgeRow>
      <span style={{ fontSize: 11, color: "#64748b", fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>{tsDisplay}</span>
    </div>
  );
}

export function EmergencyResultsPanel({
  encounterId,
  facilityId,
  refreshToken,
  canAcknowledgeResults = false,
  patient,
  encounterMeta,
  facilityName,
  facility,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken: number;
  /** Si true : affiche un bouton « Accuser réception » par résultat non encore accusé (RN/PROVIDER/ADMIN). */
  canAcknowledgeResults?: boolean;
  patient?: ResultPrintPatient | null;
  encounterMeta?: ResultPrintEncounter | null;
  facilityName?: string | null;
  facility?: PrintFacilityInfo | null;
}) {
  const { t, language } = useI18n();
  const [snap, setSnap] = useState<EncounterResultsLabRadSnapshot | null>(null);
  const onLabRadSnapshot = useCallback((s: EncounterResultsLabRadSnapshot) => {
    setSnap(s);
  }, []);

  const model = useMemo(() => buildErResultsCockpitModel(snap), [snap]);

  return (
    <MedoraCard leftAccentColor="#6366f1" variant="default">
      <MedoraCardInner>
        <div style={{ width: "100%", margin: "-4px 0 0 0" }}>
          <MedoraCardIdentity initials="R">
            <MedoraCardTitle
              title={t("emergencyResultsPanel.cardTitle")}
              subline={
                <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.35 }}>
                  {t("emergencyResultsPanel.cardSubline")}
                </p>
              }
            />
          </MedoraCardIdentity>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {!model.ready ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("emergencyResultsPanel.loading")}</p>
            ) : model.failed ? (
              <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 600, lineHeight: 1.4 }}>
                {t("emergencyResultsPanel.offlineHint")}
              </p>
            ) : model.empty ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>{t("emergencyResultsPanel.emptyBody")}</p>
            ) : (
              <>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                    gap: 8,
                    alignItems: "stretch",
                  }}
                >
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={sectionLabel}>{t("emergencyResultsPanel.sectionLab")}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                      {fillTemplate(t("emergencyResultsPanel.labCountLine"), { count: model.labTotal })}
                    </p>
                    {model.labLatest ? (
                      <CompactResultRow row={model.labLatest} language={language} t={t} />
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("emergencyResultsPanel.labEmpty")}</p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={sectionLabel}>{t("emergencyResultsPanel.sectionImaging")}</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                      {fillTemplate(t("emergencyResultsPanel.imagingCountLine"), { count: model.imagingTotal })}
                    </p>
                    {model.imagingLatest ? (
                      <CompactResultRow row={model.imagingLatest} language={language} t={t} />
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("emergencyResultsPanel.imagingEmpty")}</p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={sectionLabel}>{t("emergencyResultsPanel.sectionPriority")}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>{t("emergencyResultsPanel.priorityHint")}</p>
                  {model.priorityRows.length === 0 ? (
                    <MedoraCardBadgeRow marginTop={0}>
                      <MedoraCardBadge soft={BADGE_SOFT_NEUTRAL}>{t("emergencyResultsPanel.nothingToReport")}</MedoraCardBadge>
                      {model.pendingSyncCount > 0 ? (
                        <MedoraCardBadge soft={{ bg: "#fffbeb", text: "#92400e", border: "#fde68a" }}>
                          {fillTemplate(t("emergencyResultsPanel.pendingSyncBadge"), {
                            count: model.pendingSyncCount,
                          })}
                        </MedoraCardBadge>
                      ) : null}
                    </MedoraCardBadgeRow>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {model.priorityRows.map((row) => (
                        <CompactResultRow key={String(row.item.id)} row={row} emphasize language={language} t={t} />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div style={{ marginTop: 10, width: "100%" }}>
          <EncounterResultsTab
            encounterId={encounterId}
            facilityId={facilityId}
            refreshToken={refreshToken}
            onLabRadSnapshot={onLabRadSnapshot}
            hideIntroNote
            embeddedDetailList
            compactResultViewer
            suppressEmptyDetailPlaceholder
            canAcknowledgeResults={canAcknowledgeResults}
            patient={patient}
            encounterMeta={encounterMeta}
            facilityName={facilityName}
            facility={facility}
            enableResultPrint
          />
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
