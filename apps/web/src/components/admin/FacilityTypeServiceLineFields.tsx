"use client";

import {
  CLINICAL_DEPARTMENT_REGISTRY,
  D5A2_DENTAL_SPECIALTIES,
  getDefaultServiceLinesForFacilityType,
  MEDORA_FACILITY_TYPE_REGISTRY,
  type D5a2DentalSpecialty,
  type MedoraFacilityType,
  type MedoraServiceLine,
} from "@medora/shared";
import { useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";

const PHARMACY_LINE: MedoraServiceLine = "PHARMACY";
const DENTAL_LINE: MedoraServiceLine = "DENTAL";

const SERVICE_LINE_OPTIONS: MedoraServiceLine[] = [
  "CLINIC",
  "URGENT_CARE",
  DENTAL_LINE,
  ...CLINICAL_DEPARTMENT_REGISTRY.map((entry) => entry.code),
  PHARMACY_LINE,
];

export type FacilityTypeServiceLineFormState = {
  facilityType: MedoraFacilityType;
  serviceLines: MedoraServiceLine[];
  serviceLinesTouched: boolean;
  /** MEDUI.D5A.2 — Dental specialty configuration (care profile). */
  dentalSpecialties: D5a2DentalSpecialty[];
};

export function emptyFacilityTypeServiceLineForm(): FacilityTypeServiceLineFormState {
  return {
    facilityType: "CLINIC",
    serviceLines: getDefaultServiceLinesForFacilityType("CLINIC"),
    serviceLinesTouched: false,
    dentalSpecialties: [],
  };
}

export function facilityTypeServiceLineFormToDto(state: FacilityTypeServiceLineFormState): {
  facilityType: MedoraFacilityType;
  serviceLines: MedoraServiceLine[];
  dentalSpecialties: D5a2DentalSpecialty[];
} {
  return {
    facilityType: state.facilityType,
    serviceLines: state.serviceLines,
    dentalSpecialties: state.serviceLines.includes("DENTAL") ? state.dentalSpecialties : [],
  };
}

function facilityTypeLabelKey(code: MedoraFacilityType): string {
  return `adminUsers.facilityType${code
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join("")}`;
}

function serviceLineLabelKey(line: MedoraServiceLine): string {
  if (line === "PHARMACY") return "adminUsers.serviceLinePharmacy";
  if (line === "CLINIC") return "adminUsers.serviceLineClinic";
  if (line === "URGENT_CARE") return "adminUsers.serviceLineUrgentCare";
  if (line === "DENTAL") return "adminUsers.serviceLineDental";
  return `adminUsers.serviceLine${line
    .split("_")
    .map((part) => part.charAt(0) + part.slice(1).toLowerCase())
    .join("")}`;
}

function dentalSpecialtyLabelKey(specialty: D5a2DentalSpecialty): string {
  return `dentalCareD5a2.specialties.${specialty}`;
}

export function FacilityTypeServiceLineFields({
  value,
  onChange,
}: {
  value: FacilityTypeServiceLineFormState;
  onChange: (next: FacilityTypeServiceLineFormState) => void;
}) {
  const { t } = useI18n();
  const [local, setLocal] = useState(value);

  useEffect(() => {
    setLocal(value);
  }, [value]);

  const defaultsForType = useMemo(
    () => getDefaultServiceLinesForFacilityType(local.facilityType),
    [local.facilityType]
  );

  const dentalEnabled = local.serviceLines.includes("DENTAL");

  const setState = (next: FacilityTypeServiceLineFormState) => {
    setLocal(next);
    onChange(next);
  };

  const onTypeChange = (facilityType: MedoraFacilityType) => {
    setState({
      facilityType,
      serviceLines: local.serviceLinesTouched
        ? local.serviceLines
        : getDefaultServiceLinesForFacilityType(facilityType),
      serviceLinesTouched: local.serviceLinesTouched,
      dentalSpecialties: local.dentalSpecialties,
    });
  };

  const toggleLine = (line: MedoraServiceLine) => {
    const has = local.serviceLines.includes(line);
    const serviceLines = has
      ? local.serviceLines.filter((entry) => entry !== line)
      : [...local.serviceLines, line];
    setState({
      ...local,
      serviceLines,
      serviceLinesTouched: true,
      dentalSpecialties: serviceLines.includes("DENTAL") ? local.dentalSpecialties : [],
    });
  };

  const toggleSpecialty = (specialty: D5a2DentalSpecialty) => {
    const has = local.dentalSpecialties.includes(specialty);
    const dentalSpecialties = has
      ? local.dentalSpecialties.filter((s) => s !== specialty)
      : [...local.dentalSpecialties, specialty];
    setState({ ...local, dentalSpecialties });
  };

  const resetDefaults = () => {
    setState({
      ...local,
      serviceLines: defaultsForType,
      serviceLinesTouched: false,
      dentalSpecialties: [],
    });
  };

  return (
    <>
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
          {t("adminUsers.facilityTypeLabel")}
        </label>
        <select
          value={local.facilityType}
          onChange={(e) => onTypeChange(e.target.value as MedoraFacilityType)}
          style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
        >
          {MEDORA_FACILITY_TYPE_REGISTRY.map((entry) => (
            <option key={entry.code} value={entry.code}>
              {t(facilityTypeLabelKey(entry.code))}
            </option>
          ))}
        </select>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>{t("adminUsers.serviceLinesLabel")}</label>
          <button type="button" onClick={resetDefaults} style={{ fontSize: 12, padding: "4px 8px" }}>
            {t("adminUsers.serviceLinesResetDefaults")}
          </button>
        </div>
        <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>{t("adminUsers.serviceLinesHint")}</p>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
            gap: 8,
          }}
        >
          {SERVICE_LINE_OPTIONS.map((line) => (
            <label
              key={line}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                fontSize: 13,
                padding: "6px 8px",
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            >
              <input type="checkbox" checked={local.serviceLines.includes(line)} onChange={() => toggleLine(line)} />
              {t(serviceLineLabelKey(line))}
            </label>
          ))}
        </div>
      </div>
      {dentalEnabled ? (
        <div style={{ marginBottom: 16 }} data-testid="facility-dental-specialties">
          <label style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 8 }}>
            {t("dentalCareD5a2.admin.specialtiesLabel")}
          </label>
          <p style={{ margin: "0 0 8px", fontSize: 12, color: "#64748b" }}>
            {t("dentalCareD5a2.admin.specialtiesHint")}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
              gap: 8,
            }}
          >
            {D5A2_DENTAL_SPECIALTIES.map((specialty) => (
              <label
                key={specialty}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  padding: "6px 8px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 6,
                }}
              >
                <input
                  type="checkbox"
                  checked={local.dentalSpecialties.includes(specialty)}
                  onChange={() => toggleSpecialty(specialty)}
                />
                {t(dentalSpecialtyLabelKey(specialty))}
              </label>
            ))}
          </div>
        </div>
      ) : null}
    </>
  );
}
