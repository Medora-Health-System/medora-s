"use client";

import React from "react";
import Link from "next/link";
import { calculateAge, patientSexDisplayFr } from "@/lib/patientDisplay";
import { formatVitalsHeaderLine, hasVitalsJson } from "@/lib/patientVitals";
import { getEncounterStatusLabelFr, getEncounterTypeLabelFr } from "@/lib/uiLabels";
import { nirMrnDisplay } from "./patientChartHelpers";

export function PatientHeaderCard({
  patient,
  vitalsLoading,
  headerVitalsLine,
  hasVitals,
  openEncounter,
  canOpenEncounterDetail,
  showEditButton,
  onEditClick,
  /** Accueil : masquer signes vitaux et lien vers consultation clinique. */
  administrativeShell,
}: {
  patient: {
    firstName?: string;
    lastName?: string;
    dob?: string | null;
    sex?: string | null;
    sexAtBirth?: string | null;
    nationalId?: string | null;
    mrn?: string | null;
    globalMrn?: string | null;
    phone?: string | null;
  };
  vitalsLoading: boolean;
  /** Ligne déjà formatée (vide si aucune mesure). */
  headerVitalsLine: string;
  hasVitals: boolean;
  openEncounter: { id: string; type: string; status: string } | null | undefined;
  canOpenEncounterDetail: boolean;
  showEditButton: boolean;
  onEditClick: () => void;
  administrativeShell?: boolean;
}) {
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("fr-FR");
  };

  const ageText = (() => {
    if (!patient.dob) return "—";
    const t = new Date(patient.dob).getTime();
    if (Number.isNaN(t)) return "—";
    const age = calculateAge(patient.dob);
    if (!Number.isFinite(age) || age < 0) return "—";
    return `${age} ans`;
  })();

  const sexText = patientSexDisplayFr(patient.sex ?? null, patient.sexAtBirth ?? null);

  return (
    <div
      style={{
        backgroundColor: "#fff",
        padding: "18px 22px",
        borderRadius: 8,
        border: "1px solid #e6e6e6",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 20,
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 300px", minWidth: 0 }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 22, lineHeight: 1.25, fontWeight: 700 }}>
            {patient.firstName} {patient.lastName}
          </h1>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: "6px 20px",
              fontSize: 14,
              color: "#333",
              marginBottom: 14,
            }}
          >
            <div>
              <span style={{ color: "#757575", fontSize: 12, display: "block" }}>Âge</span>
              {ageText}
            </div>
            <div>
              <span style={{ color: "#757575", fontSize: 12, display: "block" }}>Sexe</span>
              {sexText}
            </div>
            <div>
              <span style={{ color: "#757575", fontSize: 12, display: "block" }}>NIR / MRN</span>
              {nirMrnDisplay(patient)}
            </div>
            <div>
              <span style={{ color: "#757575", fontSize: 12, display: "block" }}>Date de naissance</span>
              {formatDate(patient.dob ?? null)}
            </div>
            {patient.phone ? (
              <div style={{ gridColumn: "span 2" }}>
                <span style={{ color: "#757575", fontSize: 12, display: "block" }}>Téléphone</span>
                {patient.phone}
              </div>
            ) : null}
          </div>

          {openEncounter ? (
            <div
              style={{
                marginTop: 4,
                padding: "8px 12px",
                backgroundColor: administrativeShell ? "#fff8e1" : "#e3f2fd",
                borderRadius: 6,
                border: administrativeShell ? "1px solid #ffcc80" : "1px solid #90caf9",
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
                gap: 10,
              }}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: administrativeShell ? "#e65100" : "#1565c0" }}>
                Consultation ouverte — {getEncounterTypeLabelFr(openEncounter.type)} (
                {getEncounterStatusLabelFr(openEncounter.status)})
              </span>
              {administrativeShell ? (
                <span style={{ fontSize: 12, color: "#bf360c" }}>
                  Le dossier clinique de cette visite est réservé à l’équipe soignante.
                </span>
              ) : canOpenEncounterDetail ? (
                <Link
                  href={`/app/encounters/${openEncounter.id}`}
                  style={{
                    padding: "5px 12px",
                    backgroundColor: "#1565c0",
                    color: "white",
                    borderRadius: 6,
                    textDecoration: "none",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Ouvrir la consultation
                </Link>
              ) : (
                <span style={{ fontSize: 12, color: "#1565c0" }}>
                  Détail : rôle clinique ou facturation requis.
                </span>
              )}
            </div>
          ) : (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9e9e9e" }}>Aucune consultation ouverte.</p>
          )}
        </div>

        <div style={{ flex: "0 1 320px", minWidth: 220, display: "flex", flexDirection: "column", gap: 10, alignItems: "stretch" }}>
          {!administrativeShell ? (
          <div
            style={{
              padding: "12px 14px",
              borderRadius: 6,
              backgroundColor: "#f8f9fa",
              border: "1px solid #eceff1",
              fontSize: 13,
              lineHeight: 1.55,
            }}
          >
            <span style={{ color: "#546e7a", fontWeight: 600, fontSize: 11, textTransform: "uppercase" }}>
              Derniers signes vitaux
            </span>
            <div style={{ marginTop: 8, color: "#263238" }}>
              {vitalsLoading ? (
                <span style={{ fontStyle: "italic", color: "#78909c" }}>Chargement…</span>
              ) : hasVitals && headerVitalsLine ? (
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}>{headerVitalsLine}</span>
              ) : (
                <span style={{ color: "#78909c", fontStyle: "italic" }}>Aucun signe vital enregistré</span>
              )}
            </div>
          </div>
          ) : (
            <div
              style={{
                padding: "12px 14px",
                borderRadius: 6,
                backgroundColor: "#eceff1",
                border: "1px solid #cfd8dc",
                fontSize: 13,
                color: "#455a64",
                lineHeight: 1.5,
              }}
            >
              <strong>Accueil</strong> — les signes vitaux et le détail clinique ne sont pas affichés ici.
            </div>
          )}

          {showEditButton ? (
            <button
              type="button"
              onClick={onEditClick}
              style={{
                padding: "8px 16px",
                backgroundColor: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                fontSize: 14,
                alignSelf: "flex-start",
              }}
            >
              Modifier les informations du patient
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Calcule la ligne d’en-tête à partir du relevé clinique (triage) ou du dernier snapshot patient. */
export function computeHeaderVitalsLine(
  clinicalLatest: Record<string, number | string | null | undefined> | undefined,
  patientLatestJson: unknown
): { line: string; hasVitals: boolean } {
  if (clinicalLatest && hasVitalsJson(clinicalLatest)) {
    const line = formatVitalsHeaderLine(clinicalLatest);
    return { line, hasVitals: Boolean(line) };
  }
  if (patientLatestJson && hasVitalsJson(patientLatestJson)) {
    const line = formatVitalsHeaderLine(patientLatestJson as Record<string, number | string | null | undefined>);
    return { line, hasVitals: Boolean(line) };
  }
  return { line: "", hasVitals: false };
}
