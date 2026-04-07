"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { printDischarge } from "@/components/encounters/DischargePrintLayout";
import { parseAdmissionSummaryForChart, parseDischargeSummaryForChart } from "@/components/patient-chart/patientChartHelpers";
import { ui } from "@/lib/uiLabels";
import {
  MedoraCard,
  MedoraCardActions,
  MedoraCardBadge,
  MedoraCardBadgeRow,
  MedoraCardIdentity,
  MedoraCardInner,
  MedoraCardTitle,
} from "@/components/medora-card";
import { erDispositionBadgeFromEncounterJson } from "@/features/emergency/erTrackboardDispositionBadge";
import { readDispositionSignatureFromEncounter } from "@/features/emergency/emergencyDispositionV1";

const linkPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "7px 12px",
  borderRadius: 10,
  border: "1px solid #bae6fd",
  backgroundColor: "#f0f9ff",
  color: "#0369a1",
  fontSize: 12,
  fontWeight: 600,
  textDecoration: "none",
};

const linkMuted: React.CSSProperties = {
  ...linkPill,
  borderColor: "#e2e8f0",
  backgroundColor: "#f8fafc",
  color: "#475569",
};

type PatientLite = {
  firstName?: string | null;
  lastName?: string | null;
  dob?: string | null;
  mrn?: string | null;
  nationalId?: string | null;
  globalMrn?: string | null;
  sex?: string | null;
  sexAtBirth?: string | null;
};

type EncounterLite = {
  id: string;
  createdAt?: string | null;
  patient?: PatientLite | null;
  dischargeSummaryJson?: unknown;
  admissionSummaryJson?: unknown;
  nursingAssessment?: unknown;
  physicianAssigned?: { firstName?: string | null; lastName?: string | null } | null;
};

/**
 * Suite opérationnelle après décision médicale : lecture dossier partagé + liens d’exécution (MAR, impression sortie, hospitalisation).
 * Données : uniquement champs consultation déjà persistés — pas d’état « exécuté par l’infirmier » dédié côté serveur en V1.
 */
export function EmergencyErNursingHandoffPanel({
  encounter,
  genericEncounterHref,
  summaryTabHref,
  hospitalisationBoardHref,
  marTabHref,
  ordersTabHref,
  resultsTabHref,
  facilityName,
}: {
  encounter: EncounterLite;
  genericEncounterHref: string;
  summaryTabHref: string;
  hospitalisationBoardHref: string;
  marTabHref: string;
  ordersTabHref: string;
  resultsTabHref: string;
  facilityName?: string | null;
}) {
  const badge = useMemo(
    () => erDispositionBadgeFromEncounterJson(encounter),
    [encounter.dischargeSummaryJson, encounter.admissionSummaryJson]
  );
  const discharge = useMemo(
    () => parseDischargeSummaryForChart(encounter.dischargeSummaryJson),
    [encounter.dischargeSummaryJson]
  );
  const admission = useMemo(
    () => parseAdmissionSummaryForChart(encounter.admissionSummaryJson),
    [encounter.admissionSummaryJson]
  );
  const sig = useMemo(
    () => readDispositionSignatureFromEncounter(encounter.nursingAssessment),
    [encounter.nursingAssessment]
  );

  const modeLine = discharge?.dischargeMode?.trim() || "";
  const hasDispositionText =
    Boolean(modeLine) ||
    Boolean(discharge?.disposition?.trim()) ||
    Boolean(badge?.shortLabel);

  const admissionLikely =
    Boolean(admission?.admissionReason?.trim()) ||
    Boolean(admission?.careLevel?.trim()) ||
    Boolean(admission?.serviceUnit?.trim());

  const handlePrint = () => {
    const p = encounter.patient;
    if (!p || !encounter.createdAt) return;
    printDischarge({
      patient: p,
      encounter: {
        createdAt: encounter.createdAt,
        dischargeSummaryJson: encounter.dischargeSummaryJson,
        physicianAssigned: encounter.physicianAssigned ?? null,
      },
      facilityName: facilityName ?? null,
      primaryDiagnosis: null,
    });
  };

  return (
    <MedoraCard leftAccentColor="#0ea5e9" variant="default">
      <MedoraCardInner>
        <MedoraCardIdentity initials="E">
          <MedoraCardTitle
            title="Exécution équipe (après décision)"
            subline={
              <p style={{ margin: 0, fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                Synthèse opérationnelle à partir du dossier partagé. Les actions détaillées (MAR, ordres, clôture)
                restent dans les onglets du dossier Medora.
              </p>
            }
          />
        </MedoraCardIdentity>

        <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
          {badge ? (
            <MedoraCardBadgeRow marginTop={0}>
              <MedoraCardBadge soft={{ bg: "#f1f5f9", text: "#0f172a", border: "#cbd5e1" }}>
                Décision dossier : {badge.shortLabel}
              </MedoraCardBadge>
            </MedoraCardBadgeRow>
          ) : (
            <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>Aucun mode de sortie structuré détecté.</p>
          )}
        </div>

        {modeLine ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#334155", lineHeight: 1.4 }}>
            <span style={{ fontWeight: 600, color: "#64748b" }}>Mode de sortie (dossier) :</span> {modeLine}
          </p>
        ) : null}

        {sig ? (
          <p style={{ margin: "6px 0 0 0", fontSize: 11, color: "#64748b", lineHeight: 1.35 }}>
            Dernière sauvegarde notes urgence (V1) : {sig.savedByDisplayName} —{" "}
            {new Date(sig.savedAt).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
          </p>
        ) : null}

        {!hasDispositionText && !admissionLikely ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#b45309", lineHeight: 1.45 }}>
            En attente de la décision d&apos;orientation enregistrée par le médecin (disposition).
          </p>
        ) : null}

        {admissionLikely ? (
          <p style={{ margin: "8px 0 0 0", fontSize: 12, color: "#5b21b6", lineHeight: 1.45 }}>
            Dossier d&apos;admission : {admission?.careLevel?.trim() || ui.common.dash}
            {admission?.serviceUnit?.trim() ? ` · ${admission.serviceUnit.trim()}` : null}
          </p>
        ) : null}

        <MedoraCardActions railBorderTopColor="#e2e8f0" gap={6} minWidth={0} alignItems="flex-start">
          <Link href={ordersTabHref} style={linkPill}>
            Ordres & exécution (dossier)
          </Link>
          <Link href={marTabHref} style={linkPill}>
            MAR (dossier)
          </Link>
          <Link href={resultsTabHref} style={linkPill}>
            Résultats (dossier)
          </Link>
          <Link href={summaryTabHref} style={linkMuted}>
            Résumé & clôture (dossier)
          </Link>
          <Link href={hospitalisationBoardHref} style={{ ...linkMuted, borderColor: "#e9d5ff", backgroundColor: "#faf5ff", color: "#6b21a8" }}>
            Tableau hospitalisation
          </Link>
          <Link href={genericEncounterHref} style={{ ...linkMuted, fontSize: 11 }}>
            Dossier Medora (référence)
          </Link>
          <button
            type="button"
            onClick={handlePrint}
            disabled={!encounter.patient || !encounter.createdAt}
            style={{
              padding: "7px 12px",
              borderRadius: 10,
              border: "1px solid #cbd5e1",
              backgroundColor: encounter.patient && encounter.createdAt ? "#fff" : "#f1f5f9",
              color: encounter.patient && encounter.createdAt ? "#334155" : "#94a3b8",
              fontSize: 12,
              fontWeight: 600,
              cursor: encounter.patient && encounter.createdAt ? "pointer" : "not-allowed",
            }}
          >
            Imprimer document de sortie
          </button>
        </MedoraCardActions>
        <p style={{ margin: "8px 0 0 0", fontSize: 11, color: "#94a3b8", lineHeight: 1.35 }}>
          Oxygène, voie IV et soins : suivre les ordres de type « Soins / procédures » et la saisie infirmière dans le
          dossier. Aucun état d&apos;exécution infirmière dédié n&apos;est exposé sur le tableau des urgences en V1.
        </p>
      </MedoraCardInner>
    </MedoraCard>
  );
}
