"use client";

import React from "react";
import { calculateAge } from "@/lib/patientDisplay";
import { formatVitalsHeaderLineForLocale, hasMeaningfulVitalMeasurement, hasVitalsJson } from "@/lib/patientVitals";
import { encounterBcp47, tPatientSex } from "@/lib/encounterChromeI18n";
import type { SupportedLanguage } from "@/i18n/config";
import { useI18n } from "@/lib/i18n";
import { nirMrnDisplay } from "./patientChartHelpers";

export function PatientHeaderCard({ patient, showEditButton, onEditClick }: {
  patient: { firstName?: string; lastName?: string; dob?: string | null; sex?: string | null; sexAtBirth?: string | null; nationalId?: string | null; mrn?: string | null; globalMrn?: string | null; phone?: string | null };
  vitalsLoading: boolean;
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
  const formatDate = (dateStr: string | null | undefined) => dateStr ? new Date(dateStr).toLocaleDateString(locale) : t("common.dash");
  const ageText = (() => {
    if (!patient.dob || Number.isNaN(new Date(patient.dob).getTime())) return t("common.dash");
    const age = calculateAge(patient.dob);
    return Number.isFinite(age) && age >= 0 ? `${age} ${t("encounterChrome.ageYearsSuffix")}` : t("common.dash");
  })();
  const sexText = tPatientSex(patient.sex ?? null, patient.sexAtBirth ?? null, t);

  return (
    <div style={{ backgroundColor: "#fff", padding: "18px 22px", borderRadius: 8, border: "1px solid #e6e6e6" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 20, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 520px", minWidth: 0 }}>
          <h1 style={{ margin: "0 0 12px", fontSize: 22, lineHeight: 1.25, fontWeight: 700 }}>{patient.firstName} {patient.lastName}</h1>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))", gap: "6px 20px", fontSize: 14, color: "#333" }}>
            <div><span style={{ color: "#757575", fontSize: 12, display: "block" }}>{t("encounterChrome.patientHeader.labelAge")}</span>{ageText}</div>
            <div><span style={{ color: "#757575", fontSize: 12, display: "block" }}>{t("encounterChrome.patientHeader.labelSex")}</span>{sexText}</div>
            <div><span style={{ color: "#757575", fontSize: 12, display: "block" }}>{t("encounterChrome.patientHeader.labelNirMrn")}</span>{nirMrnDisplay(patient)}</div>
            <div><span style={{ color: "#757575", fontSize: 12, display: "block" }}>{t("encounterChrome.patientHeader.labelDob")}</span>{formatDate(patient.dob ?? null)}</div>
            {patient.phone ? <div style={{ gridColumn: "span 2" }}><span style={{ color: "#757575", fontSize: 12, display: "block" }}>{t("encounterChrome.patientHeader.labelPhone")}</span>{patient.phone}</div> : null}
          </div>
        </div>
        {showEditButton ? <button type="button" onClick={onEditClick} style={{ padding: "8px 16px", backgroundColor: "#1a1a1a", color: "white", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 14 }}>{t("encounterChrome.patientHeader.editPatient")}</button> : null}
      </div>
    </div>
  );
}

export function computeHeaderVitalsLine(clinicalLatest: Record<string, number | string | null | undefined> | undefined, patientLatestJson: unknown, language: SupportedLanguage): { line: string; hasVitals: boolean } {
  if (clinicalLatest && hasMeaningfulVitalMeasurement(clinicalLatest)) { const line = formatVitalsHeaderLineForLocale(clinicalLatest, language); return { line, hasVitals: Boolean(line) }; }
  if (patientLatestJson && hasMeaningfulVitalMeasurement(patientLatestJson)) { const line = formatVitalsHeaderLineForLocale(patientLatestJson as Record<string, number | string | null | undefined>, language); return { line, hasVitals: Boolean(line) }; }
  if (clinicalLatest && hasVitalsJson(clinicalLatest) && !hasMeaningfulVitalMeasurement(clinicalLatest)) { /* fall through */ }
  return { line: "", hasVitals: false };
}
