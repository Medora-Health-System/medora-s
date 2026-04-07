"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  EncounterResultsTab,
  type EncounterLabRadRow,
  type EncounterResultsLabRadSnapshot,
} from "@/components/encounters/EncounterResultsTab";
import { buildErResultsCockpitModel } from "@/features/emergency/emergencyResultsCockpitModel";
import { clinicalResultFromOrderItemLike } from "@/lib/clinicalResultNormalize";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import { getOrderItemChartLabel } from "@/constants/orderStatusLabels";
import { ui } from "@/lib/uiLabels";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
  type PriorityBadgeSoft,
} from "@/components/medora-card";

const linkPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "5px 10px",
  borderRadius: 8,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

const linkPillIndigo: React.CSSProperties = {
  ...linkPill,
  borderColor: "#c7d2fe",
  backgroundColor: "#eef2ff",
};

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

function formatShortTs(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return "—";
  }
}

function orderCreatedMs(order: unknown): number {
  if (!order || typeof order !== "object") return 0;
  const c = (order as { createdAt?: string }).createdAt;
  if (typeof c !== "string" || !c.trim()) return 0;
  const t = Date.parse(c);
  return Number.isNaN(t) ? 0 : t;
}

function rowRecencyMs(row: EncounterLabRadRow): number {
  const v = clinicalResultFromOrderItemLike({
    displayLabelFr: getOrderItemDisplayLabelFr(row.item),
    status: row.item.status,
    catalogItemType: row.item.catalogItemType,
    result: row.item.result,
  });
  if (v.verifiedAt) {
    const t = Date.parse(v.verifiedAt);
    if (!Number.isNaN(t)) return t;
  }
  return orderCreatedMs(row.order);
}

function CompactResultRow({
  row,
  emphasize,
}: {
  row: EncounterLabRadRow;
  emphasize?: boolean;
}) {
  const v = clinicalResultFromOrderItemLike({
    displayLabelFr: getOrderItemDisplayLabelFr(row.item),
    status: row.item.status,
    catalogItemType: row.item.catalogItemType,
    result: row.item.result,
  });
  const label = v.title.trim() || "Examen";
  const statusFr = getOrderItemChartLabel(row.item.status ?? "");
  const tsDisplay = v.verifiedAt
    ? formatShortTs(v.verifiedAt)
    : orderCreatedMs(row.order) > 0
      ? formatShortTs(new Date(orderCreatedMs(row.order)).toISOString())
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
          <MedoraCardBadge soft={{ bg: "#fef2f2", text: "#991b1b", border: "#fecaca" }}>Critique</MedoraCardBadge>
        ) : null}
        {row.pendingSync ? (
          <MedoraCardBadge soft={{ bg: "#fffbeb", text: "#92400e", border: "#fde68a" }}>Sync locale</MedoraCardBadge>
        ) : null}
        <MedoraCardBadge soft={BADGE_SOFT_NEUTRAL}>{statusFr}</MedoraCardBadge>
      </MedoraCardBadgeRow>
      <span style={{ fontSize: 11, color: "#64748b", fontVariantNumeric: "tabular-nums", marginLeft: "auto" }}>{tsDisplay}</span>
    </div>
  );
}

export function EmergencyResultsPanel({
  encounterId,
  facilityId,
  refreshToken,
  resultsTabHref,
  diagnosticsTabHref,
}: {
  encounterId: string;
  facilityId: string;
  refreshToken: number;
  resultsTabHref: string;
  diagnosticsTabHref: string;
}) {
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
              title="Résultats et examens (urgences)"
              subline={
                <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.35 }}>
                  Vue cockpit : derniers examens labo / imagerie, priorités et raccourcis vers le dossier et les files.
                </p>
              }
            />
          </MedoraCardIdentity>

          <MedoraCardActions railBorderTopColor="#e2e8f0" gap={6} minWidth={0} alignItems="stretch" inline>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
              <Link href={resultsTabHref} style={linkPill}>
                Onglet Résultats (dossier)
              </Link>
              <Link href={diagnosticsTabHref} style={linkPillIndigo}>
                Onglet Diagnostics
              </Link>
              <Link href="/app/lab" style={linkPill}>
                {ui.lab.title}
              </Link>
              <Link href="/app/radiology" style={linkPill}>
                {ui.radiology.title}
              </Link>
            </div>
          </MedoraCardActions>

          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 8 }}>
            {!model.ready ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Chargement des résultats…</p>
            ) : model.failed ? (
              <p style={{ margin: 0, fontSize: 12, color: "#92400e", fontWeight: 600, lineHeight: 1.4 }}>
                Commandes indisponibles (hors ligne). Ouvrez le dossier ou réessayez après synchronisation.
              </p>
            ) : model.empty ? (
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.4 }}>
                Aucun résultat laboratoire ou imagerie listé pour l&apos;instant. Les examens saisis depuis les files
                apparaîtront ici.
              </p>
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
                    <p style={sectionLabel}>Laboratoire</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                      {model.labTotal} examen(s) dans la liste
                    </p>
                    {model.labLatest ? (
                      <CompactResultRow row={model.labLatest} />
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Aucun résultat laboratoire listé.</p>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    <p style={sectionLabel}>Imagerie</p>
                    <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                      {model.imagingTotal} examen(s) dans la liste
                    </p>
                    {model.imagingLatest ? (
                      <CompactResultRow row={model.imagingLatest} />
                    ) : (
                      <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Aucun résultat imagerie listé.</p>
                    )}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <p style={sectionLabel}>Prioritaires / anormaux</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#94a3b8" }}>
                    Basé sur l&apos;indicateur « valeur critique » déjà présent sur le résultat et synchronisation locale
                    en attente.
                  </p>
                  {model.priorityRows.length === 0 ? (
                    <MedoraCardBadgeRow marginTop={0}>
                      <MedoraCardBadge soft={BADGE_SOFT_NEUTRAL}>Rien à signaler</MedoraCardBadge>
                      {model.pendingSyncCount > 0 ? (
                        <MedoraCardBadge soft={{ bg: "#fffbeb", text: "#92400e", border: "#fde68a" }}>
                          Sync locale — {model.pendingSyncCount}
                        </MedoraCardBadge>
                      ) : null}
                    </MedoraCardBadgeRow>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {model.priorityRows.map((row) => (
                        <CompactResultRow key={String(row.item.id)} row={row} emphasize />
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <EncounterResultsTab
          encounterId={encounterId}
          facilityId={facilityId}
          refreshToken={refreshToken}
          onLabRadSnapshot={onLabRadSnapshot}
          hideIntroNote
          embeddedDetailList={false}
        />
      </MedoraCardInner>
    </MedoraCard>
  );
}
