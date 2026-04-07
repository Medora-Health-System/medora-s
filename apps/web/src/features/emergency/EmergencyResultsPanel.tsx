"use client";

import React, { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import {
  EncounterResultsTab,
  type EncounterResultsLabRadSnapshot,
} from "@/components/encounters/EncounterResultsTab";
import { getOrderItemDisplayLabelFr } from "@/lib/orderItemDisplayFr";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardRoomBlock,
  MedoraCardTitle,
} from "@/components/medora-card";

const linkPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "8px 14px",
  borderRadius: 10,
  border: "1px solid #bfdbfe",
  backgroundColor: "#eff6ff",
  color: "#1d4ed8",
  fontSize: 13,
  fontWeight: 600,
  textDecoration: "none",
};

const stripBox: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 12,
  alignItems: "stretch",
  padding: "12px 14px",
  borderRadius: 10,
  border: "1px solid #e2e8f0",
  backgroundColor: "#f8fafc",
  width: "100%",
  boxSizing: "border-box",
};

function summarizeSnapshot(snap: EncounterResultsLabRadSnapshot | null) {
  if (!snap || snap.loading) {
    return {
      ready: false as const,
      labCount: 0,
      imagingCount: 0,
      criticalItems: [] as { id: string; label: string }[],
      pendingCount: 0,
      failed: false,
      empty: true,
    };
  }
  if (snap.ordersLoadFailedNoCache) {
    return {
      ready: true as const,
      labCount: 0,
      imagingCount: 0,
      criticalItems: [] as { id: string; label: string }[],
      pendingCount: 0,
      failed: true,
      empty: true,
    };
  }
  let labCount = 0;
  let imagingCount = 0;
  let pendingCount = 0;
  const criticalItems: { id: string; label: string }[] = [];
  for (const { item, pendingSync } of snap.rows) {
    if (item.catalogItemType === "LAB_TEST") labCount += 1;
    if (item.catalogItemType === "IMAGING_STUDY") imagingCount += 1;
    if (pendingSync) pendingCount += 1;
    const crit = item.result && typeof item.result === "object" && (item.result as { criticalValue?: boolean }).criticalValue === true;
    if (crit) {
      const label = getOrderItemDisplayLabelFr(item).trim() || "Examen";
      const id = typeof item.id === "string" ? item.id : String(item.id ?? label);
      criticalItems.push({ id, label });
    }
  }
  return {
    ready: true as const,
    labCount,
    imagingCount,
    criticalItems: criticalItems.slice(0, 5),
    pendingCount,
    failed: false,
    empty: snap.rows.length === 0,
  };
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

  const summary = useMemo(() => summarizeSnapshot(snap), [snap]);

  return (
    <MedoraCard leftAccentColor="#6366f1" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="R">
          <MedoraCardTitle
            title="Résultats et examens (urgences)"
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                Vue condensée pour le passage aux urgences ; le détail complet reste dans le dossier de consultation.
              </p>
            }
          />
        </MedoraCardIdentity>

        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={10} minWidth={0} alignItems="flex-start">
          <Link href={resultsTabHref} style={linkPill}>
            Ouvrir l&apos;onglet Résultats (dossier)
          </Link>
          <Link href={diagnosticsTabHref} style={{ ...linkPill, borderColor: "#c7d2fe", backgroundColor: "#eef2ff" }}>
            Ouvrir l&apos;onglet Diagnostics
          </Link>
        </MedoraCardActions>

        <div style={{ ...stripBox, marginTop: 12 }}>
          {!summary.ready ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b" }}>Résumé : chargement…</p>
          ) : summary.failed ? (
            <p style={{ margin: 0, fontSize: 13, color: "#92400e", fontWeight: 600, lineHeight: 1.45 }}>
              Impossible de résumer : commandes non disponibles (hors ligne). Utilisez le dossier ou réessayez après
              synchronisation.
            </p>
          ) : summary.empty ? (
            <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
              Aucun résultat laboratoire ou imagerie listé pour l&apos;instant. Les examens saisis depuis les files
              apparaîtront ci-dessous.
            </p>
          ) : (
            <>
              <MedoraCardRoomBlock label="Laboratoire" value={`${summary.labCount} résultat(s) affiché(s)`} />
              <MedoraCardRoomBlock label="Imagerie" value={`${summary.imagingCount} résultat(s) affiché(s)`} />
              <div style={{ flex: "1 1 220px", minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    color: "#64748b",
                  }}
                >
                  Alertes (données existantes)
                </p>
                <div style={{ marginTop: 8 }}>
                  <MedoraCardBadgeRow marginTop={0}>
                    {summary.criticalItems.length > 0 ? (
                      <MedoraCardBadge soft={{ bg: "#fef2f2", text: "#991b1b", border: "#fecaca" }}>
                        Valeur critique — {summary.criticalItems.length}
                      </MedoraCardBadge>
                    ) : (
                      <MedoraCardBadge soft={{ bg: "#f8fafc", text: "#64748b", border: "#e2e8f0" }}>
                        Pas de marqueur critique
                      </MedoraCardBadge>
                    )}
                    {summary.pendingCount > 0 ? (
                      <MedoraCardBadge soft={{ bg: "#fffbeb", text: "#92400e", border: "#fde68a" }}>
                        Synchronisation locale — {summary.pendingCount}
                      </MedoraCardBadge>
                    ) : null}
                  </MedoraCardBadgeRow>
                  {summary.criticalItems.length > 0 ? (
                    <ul
                      style={{
                        margin: "8px 0 0 0",
                        paddingLeft: 18,
                        fontSize: 12,
                        color: "#991b1b",
                        lineHeight: 1.45,
                        fontWeight: 600,
                      }}
                    >
                      {summary.criticalItems.map((row) => (
                        <li key={row.id}>{row.label}</li>
                      ))}
                    </ul>
                  ) : (
                    <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b" }}>
                      La mise en évidence repose sur l&apos;indicateur « valeur critique » déjà présent sur le résultat.
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div style={{ width: "100%", marginTop: 14 }}>
          <EncounterResultsTab
            encounterId={encounterId}
            facilityId={facilityId}
            refreshToken={refreshToken}
            onLabRadSnapshot={onLabRadSnapshot}
            hideIntroNote
          />
        </div>
      </MedoraCardInner>
    </MedoraCard>
  );
}
