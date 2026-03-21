"use client";

import React from "react";
import { useRouter } from "next/navigation";

const btn: React.CSSProperties = {
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 500,
  border: "1px solid #c5c5c5",
  borderRadius: 6,
  background: "#fafafa",
  cursor: "pointer",
  textAlign: "center",
  lineHeight: 1.35,
};

const btnDisabled: React.CSSProperties = {
  ...btn,
  opacity: 0.5,
  cursor: "not-allowed",
};

export function PatientQuickActions({
  clinicalChartAccess,
  isRNOnly,
  isProviderLike,
  isFrontDeskQuick,
  isBillingOnlyQuick,
  openEncounter,
  canOpenEncounterDetail,
  canPrescribe,
  chartSummaryReady,
  onTabEncounters,
  onTabResults,
  onTabSummary,
  onAddDiagnosis,
  onAddFollowUp,
  onEditPatient,
  onPendingCreateEncounter,
}: {
  clinicalChartAccess: boolean;
  isRNOnly: boolean;
  isProviderLike: boolean;
  isFrontDeskQuick: boolean;
  isBillingOnlyQuick: boolean;
  openEncounter: { id: string } | null | undefined;
  canOpenEncounterDetail: boolean;
  canPrescribe: boolean;
  chartSummaryReady: boolean;
  onTabEncounters: () => void;
  onTabResults: () => void;
  onTabSummary: () => void;
  onAddDiagnosis: () => void;
  onAddFollowUp: () => void;
  onEditPatient: () => void;
  onPendingCreateEncounter: () => void;
}) {
  const router = useRouter();
  const show =
    clinicalChartAccess || isFrontDeskQuick || isBillingOnlyQuick;

  if (!show) return null;

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #eee" }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: "#616161", marginBottom: 10, textTransform: "uppercase" }}>
        Actions rapides
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(168px, 1fr))",
          gap: 8,
        }}
      >
        {clinicalChartAccess && isRNOnly && (
          <>
            <button
              type="button"
              style={openEncounter && canOpenEncounterDetail ? btn : btnDisabled}
              disabled={!openEncounter || !canOpenEncounterDetail}
              title={
                !openEncounter
                  ? "Aucune consultation ouverte"
                  : !canOpenEncounterDetail
                    ? "Accès non autorisé"
                    : undefined
              }
              onClick={() => {
                if (openEncounter && canOpenEncounterDetail) {
                  router.push(`/app/encounters/${openEncounter.id}?tab=triage`);
                }
              }}
            >
              Saisir les signes vitaux
            </button>
            <button type="button" style={btn} onClick={onTabEncounters}>
              Voir les consultations
            </button>
            <button
              type="button"
              style={openEncounter && canOpenEncounterDetail ? btn : btnDisabled}
              disabled={!openEncounter || !canOpenEncounterDetail}
              title={!openEncounter ? "Aucune consultation ouverte" : undefined}
              onClick={() => {
                if (openEncounter && canOpenEncounterDetail) {
                  router.push(`/app/encounters/${openEncounter.id}?tab=notes`);
                }
              }}
            >
              Ajouter une note
            </button>
            <button type="button" style={btn} onClick={onAddFollowUp}>
              Ajouter un suivi
            </button>
          </>
        )}

        {clinicalChartAccess && isProviderLike && (
          <>
            <button
              type="button"
              style={btn}
              onClick={() => {
                if (openEncounter && canOpenEncounterDetail) {
                  router.push(`/app/encounters/${openEncounter.id}`);
                } else {
                  onTabEncounters();
                  onPendingCreateEncounter();
                }
              }}
            >
              {openEncounter ? "Ouvrir la consultation" : "Démarrer une consultation"}
            </button>
            <button
              type="button"
              style={chartSummaryReady ? btn : { ...btnDisabled, opacity: 0.55 }}
              disabled={!chartSummaryReady}
              title={!chartSummaryReady ? "Chargement du dossier…" : undefined}
              onClick={() => chartSummaryReady && onAddDiagnosis()}
            >
              Ajouter un diagnostic
            </button>
            <button
              type="button"
              style={
                openEncounter && canOpenEncounterDetail && canPrescribe ? btn : { ...btnDisabled, opacity: 0.65 }
              }
              disabled={!openEncounter || !canOpenEncounterDetail || !canPrescribe}
              title={
                !canPrescribe
                  ? "Droit de prescription requis"
                  : !openEncounter
                    ? "Ouvrez ou créez une consultation"
                    : undefined
              }
              onClick={() => {
                if (openEncounter && canOpenEncounterDetail && canPrescribe) {
                  router.push(`/app/encounters/${openEncounter.id}?tab=orders`);
                }
              }}
            >
              Créer une ordonnance
            </button>
            <button type="button" style={btn} onClick={onTabResults}>
              Voir les résultats
            </button>
            <button type="button" style={btn} onClick={onAddFollowUp}>
              Ajouter un suivi
            </button>
          </>
        )}

        {isFrontDeskQuick && (
          <>
            <button
              type="button"
              style={btn}
              onClick={() => {
                onTabEncounters();
                onPendingCreateEncounter();
              }}
            >
              Nouvelle consultation
            </button>
            <button type="button" style={btn} onClick={onAddFollowUp}>
              Ajouter un suivi
            </button>
            <button type="button" style={btn} onClick={onEditPatient}>
              Modifier les informations du patient
            </button>
          </>
        )}

        {isBillingOnlyQuick && (
          <button type="button" style={btn} onClick={onTabSummary}>
            Résumé du patient
          </button>
        )}
      </div>
    </div>
  );
}
