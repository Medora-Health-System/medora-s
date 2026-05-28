"use client";

import React from "react";
import Link from "next/link";
import { calculateAge } from "@/lib/patientDisplay";
import { formatVitalsHeaderLineForLocale, hasVitalsJson } from "@/lib/patientVitals";
import {
  encounterBcp47,
  tEncounterStatus,
  tEncounterType,
  tPatientSex,
} from "@/lib/encounterChromeI18n";
import type { SupportedLanguage } from "@/i18n/config";
import { useI18n } from "@/lib/i18n";
import { nirMrnDisplay } from "./patientChartHelpers";
import { BillingClassificationBadgeReadOnly } from "@/components/encounters/BillingClassificationBadgeReadOnly";

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
  openEncounter: { id: string; type: string; status: string; billingClassification?: string | null } | null | undefined;
  canOpenEncounterDetail: boolean;
  showEditButton: boolean;
  onEditClick: () => void;
  administrativeShell?: boolean;
}) {
  const { t, language } = useI18n();
  const locale = encounterBcp47(language);

  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return t("common.dash");
    return new Date(dateStr).toLocaleDateString(locale);
  };

  const ageText = (() => {
    if (!patient.dob) return t("common.dash");
    const t0 = new Date(patient.dob).getTime();
    if (Number.isNaN(t0)) return t("common.dash");
    const age = calculateAge(patient.dob);
    if (!Number.isFinite(age) || age < 0) return t("common.dash");
    return `${age} ${t("encounterChrome.ageYearsSuffix")}`;
  })();

  const sexText = tPatientSex(patient.sex ?? null, patient.sexAtBirth ?? null, t);

  const openBanner = openEncounter
    ? t("encounterChrome.patientHeader.openEncounter")
        .replace("{type}", tEncounterType(t, openEncounter.type))
        .replace("{status}", tEncounterStatus(t, openEncounter.status))
    : "";

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
              <span style={{ color: "#757575", fontSize: 12, display: "block" }}>
                {t("encounterChrome.patientHeader.labelAge")}
              </span>
              {ageText}
            </div>
            <div>
              <span style={{ color: "#757575", fontSize: 12, display: "block" }}>
                {t("encounterChrome.patientHeader.labelSex")}
              </span>
              {sexText}
            </div>
            <div>
              <span style={{ color: "#757575", fontSize: 12, display: "block" }}>
                {t("encounterChrome.patientHeader.labelNirMrn")}
              </span>
              {nirMrnDisplay(patient)}
            </div>
            <div>
              <span style={{ color: "#757575", fontSize: 12, display: "block" }}>
                {t("encounterChrome.patientHeader.labelDob")}
              </span>
              {formatDate(patient.dob ?? null)}
            </div>
            {patient.phone ? (
              <div style={{ gridColumn: "span 2" }}>
                <span style={{ color: "#757575", fontSize: 12, display: "block" }}>
                  {t("encounterChrome.patientHeader.labelPhone")}
                </span>
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
                {openBanner}
              </span>
              <BillingClassificationBadgeReadOnly classification={openEncounter.billingClassification} />
              {administrativeShell ? (
                <span style={{ fontSize: 12, color: "#bf360c" }}>
                  {t("encounterChrome.patientHeader.clinicalTeamOnly")}
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
                  {t("encounterChrome.patientHeader.openEncounterLink")}
                </Link>
              ) : (
                <span style={{ fontSize: 12, color: "#1565c0" }}>
                  {t("encounterChrome.patientHeader.detailRequiresRole")}
                </span>
              )}
            </div>
          ) : (
            <p style={{ margin: "10px 0 0", fontSize: 13, color: "#9e9e9e" }}>
              {t("encounterChrome.patientHeader.noOpenEncounter")}
            </p>
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
              {t("encounterChrome.patientHeader.lastVitals")}
            </span>
            <div style={{ marginTop: 8, color: "#263238" }}>
              {vitalsLoading ? (
                <span style={{ fontStyle: "italic", color: "#78909c" }}>{t("encounterChrome.patientHeader.loading")}</span>
              ) : hasVitals && headerVitalsLine ? (
                <span style={{ fontFamily: "ui-monospace, SFMono-Regular, monospace", fontSize: 12 }}>{headerVitalsLine}</span>
              ) : (
                <span style={{ color: "#78909c", fontStyle: "italic" }}>{t("encounterChrome.patientHeader.noVitals")}</span>
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
              {t("encounterChrome.patientHeader.frontDeskNoVitals")}
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
              {t("encounterChrome.patientHeader.editPatient")}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** Computes header line from clinical triage snapshot or latest patient vitals JSON. */
export function computeHeaderVitalsLine(
  clinicalLatest: Record<string, number | string | null | undefined> | undefined,
  patientLatestJson: unknown,
  language: SupportedLanguage
): { line: string; hasVitals: boolean } {
  if (clinicalLatest && hasVitalsJson(clinicalLatest)) {
    const line = formatVitalsHeaderLineForLocale(clinicalLatest, language);
    return { line, hasVitals: Boolean(line) };
  }
  if (patientLatestJson && hasVitalsJson(patientLatestJson)) {
    const line = formatVitalsHeaderLineForLocale(
      patientLatestJson as Record<string, number | string | null | undefined>,
      language
    );
    return { line, hasVitals: Boolean(line) };
  }
  return { line: "", hasVitals: false };
}
