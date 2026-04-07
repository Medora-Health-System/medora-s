"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { fetchOrdersForEncounter } from "@/lib/clinicalWorklistApi";
import { getOrderItemChartLabel } from "@/constants/orderStatusLabels";
import { ui } from "@/lib/uiLabels";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardIdentity,
  MedoraCardInner,
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

/**
 * Cockpit ordres / interventions urgences — lecture + liens vers les flux Medora existants.
 * Pas de moteur d’ordres parallèle : les prescriptions complètes restent dans le dossier.
 */
export function EmergencyErOrdersPanel({
  encounterId,
  facilityId,
  ordersTabHref,
  diagnosticsTabHref,
  nursingTabHref,
}: {
  encounterId: string;
  facilityId: string;
  ordersTabHref: string;
  diagnosticsTabHref: string;
  nursingTabHref: string;
}) {
  const [orderCount, setOrderCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const orders = await fetchOrdersForEncounter(facilityId, encounterId);
        if (!cancelled) setOrderCount(Array.isArray(orders) ? orders.length : 0);
      } catch {
        if (!cancelled) setOrderCount(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [encounterId, facilityId]);

  return (
    <MedoraCard leftAccentColor="#7c3aed" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="O">
          <MedoraCardTitle
            title="Ordres & interventions (urgences)"
            subline={
              <p style={{ margin: 0, fontSize: 13, color: "#64748b", lineHeight: 1.45 }}>
                Vue cockpit : accès rapide aux files et à l&apos;onglet ordres du dossier. Oxygène, perfusion, voie IV :
                passer par les ordres prescrits et la saisie infirmière (voie IV) lorsque applicable.
              </p>
            }
          />
        </MedoraCardIdentity>
        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={8} minWidth={0} alignItems="flex-start">
          <Link href={ordersTabHref} style={linkPill}>
            Ouvrir les ordres (dossier)
          </Link>
          <Link href={diagnosticsTabHref} style={linkPill}>
            Diagnostics (dossier)
          </Link>
          <Link href="/app/lab" style={{ ...linkPill, borderColor: "#c7d2fe", backgroundColor: "#eef2ff", color: "#4338ca" }}>
            {ui.lab.title}
          </Link>
          <Link href="/app/radiology" style={{ ...linkPill, borderColor: "#c7d2fe", backgroundColor: "#eef2ff", color: "#4338ca" }}>
            {ui.radiology.title}
          </Link>
          <Link href="/app/pharmacy-queue" style={{ ...linkPill, borderColor: "#bbf7d0", backgroundColor: "#f0fdf4", color: "#166534" }}>
            {ui.nav.pharmacyQueue}
          </Link>
          <Link href={nursingTabHref} style={{ ...linkPill, borderColor: "#bae6fd", backgroundColor: "#f0f9ff", color: "#0369a1" }}>
            Soins infirmiers (voie IV, etc.)
          </Link>
        </MedoraCardActions>
        <p style={{ margin: "10px 0 0 0", fontSize: 13, color: "#334155", lineHeight: 1.45 }}>
          {loading ? (
            ui.common.loading
          ) : orderCount != null ? (
            <>
              <strong>{orderCount}</strong> commande(s) liée(s) à cette consultation (aperçu liste serveur / file locale).
            </>
          ) : (
            "Impossible de charger le décompte des commandes."
          )}
        </p>
        <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
          Les statuts d&apos;ordre affichés dans le dossier utilisent les libellés Medora existants (ex.{" "}
          {getOrderItemChartLabel("ORDERED")}).
        </p>
      </MedoraCardInner>
    </MedoraCard>
  );
}
