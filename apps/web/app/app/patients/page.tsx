"use client";

import React, { Suspense, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { formatAgeYearsSexForLocale } from "@/lib/patientDisplay";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { isAppPathAllowedForRoles } from "@/lib/landingRoute";
import {
  CreateConsultationModal,
  NewPatientModal,
  type RegistrationPatient as Patient,
} from "@/features/registration/RegistrationPatientModals";

function patientSearchList(data: unknown): Patient[] {
  if (Array.isArray(data)) return data as Patient[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: Patient[] }).items;
  }
  return [];
}

function PatientsPageContent() {
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { roles, ready: rolesReady, facilityId } = useFacilityAndRoles();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [consultationTarget, setConsultationTarget] = useState<Patient | null>(null);
  const [postCreatePatient, setPostCreatePatient] = useState<Patient | null>(null);

  useEffect(() => {
    if (searchParams.get("new") === "1") setShowModal(true);
  }, [searchParams]);

  const handleSearch = useCallback(async () => {
    if (!facilityId) return;
    setLoading(true);
    const cacheKey = `patient-search-index:${facilityId}`;
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) params.set("q", searchQuery.trim());
      const data = await apiFetch(`/patients/search?${params.toString()}`, { facilityId });
      const list = patientSearchList(data);
      setPatients(list);
      void setCachedRecord("patient_summaries", cacheKey, list, { facilityId });
    } catch (error) {
      console.error("Search error:", error);
      const cached = await getCachedRecord<Patient[]>("patient_summaries", cacheKey);
      const base = cached?.data ?? [];
      const q = searchQuery.trim().toLowerCase();
      setPatients(
        q
          ? base.filter((p) => `${p.firstName} ${p.lastName} ${p.mrn ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(q))
          : base
      );
    } finally {
      setLoading(false);
    }
  }, [facilityId, searchQuery]);

  useEffect(() => {
    if (facilityId) void handleSearch();
  }, [facilityId, handleSearch]);

  const canCreateConsultation =
    rolesReady &&
    (roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN") || roles.includes("FRONT_DESK"));
  const canOpenEncounterDetail =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("BILLING") ||
      roles.includes("LAB") ||
      roles.includes("RADIOLOGY") ||
      roles.includes("PHARMACY"));
  const canOpenPatientDossier =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("FRONT_DESK") ||
      roles.includes("BILLING") ||
      roles.includes("LAB") ||
      roles.includes("RADIOLOGY") ||
      roles.includes("PHARMACY"));
  const canOpenPatientProfile =
    rolesReady &&
    (roles.includes("FRONT_DESK") || roles.includes("RN") || roles.includes("PROVIDER") || roles.includes("ADMIN"));

  const dateLocale = encounterBcp47(language);
  const formatDate = (dateStr: string | null) => (dateStr ? new Date(dateStr).toLocaleDateString(dateLocale) : "");
  const handleRowClick = (patientId: string) => {
    if (canOpenPatientDossier) router.push(`/app/patients/${patientId}`);
  };

  const thBase: React.CSSProperties = {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    whiteSpace: "nowrap",
  };
  const tdBase: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 14,
    color: "#0f172a",
    verticalAlign: "middle",
    borderBottom: "1px solid #f1f5f9",
  };

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", paddingBottom: 24 }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <header style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 24 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)", fontWeight: 600, color: "#0f172a" }}>
              {t("common.searchPatient")}
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "#64748b", maxWidth: 560, lineHeight: 1.5 }}>
              {t("patientsListPage.subtitleSearchFacility")}
            </p>
          </div>
          <button type="button" onClick={() => setShowModal(true)} style={{ height: 40, padding: "0 18px", backgroundColor: "#0f172a", color: "#fff", border: "none", borderRadius: 12, cursor: "pointer", fontSize: 14, fontWeight: 600 }}>
            {t("patientsListPage.newPatient")}
          </button>
        </header>

        {postCreatePatient && canOpenPatientDossier && isAppPathAllowedForRoles(`/app/patients/${postCreatePatient.id}`, roles) ? (
          <div style={{ marginBottom: 20, padding: "16px 18px", borderRadius: 12, border: "1px solid #bae6fd", backgroundColor: "#f0f9ff" }}>
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0c4a6e" }}>{t("patientsListPage.postCreateBannerTitle")}</div>
              <div style={{ fontSize: 13, color: "#0369a1", marginTop: 4 }}>
                {t("patientsListPage.postCreateBannerHint")} <strong>{postCreatePatient.firstName} {postCreatePatient.lastName}</strong>
              </div>
              <div style={{ fontSize: 12, color: "#0e7490", marginTop: 8, maxWidth: 720, lineHeight: 1.45 }}>
                {t("patientsListPage.postCreateBannerSubhint")}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <Link href={`/app/patients/${postCreatePatient.id}`} style={{ padding: "8px 14px", backgroundColor: "#0f172a", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("patientsListPage.postCreateGoChart")}</Link>
              {canOpenPatientProfile && isAppPathAllowedForRoles(`/app/patients/${postCreatePatient.id}/profile`, roles) && <Link href={`/app/patients/${postCreatePatient.id}/profile`} style={{ padding: "8px 14px", backgroundColor: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("patientProfile.linkViewProfile")}</Link>}
              <Link href={`/app/registration?patient=${postCreatePatient.id}`} style={{ padding: "8px 14px", backgroundColor: "#0d47a1", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("patientsListPage.postCreateContinueRegistration")}</Link>
              <Link href={`/app/patients/${postCreatePatient.id}#patient-registration-insurance`} style={{ padding: "8px 14px", backgroundColor: "#1565c0", color: "#fff", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("patientsListPage.postCreateGoPrimaryInsurance")}</Link>
              <Link href={`/app/patients/${postCreatePatient.id}#patient-registration-insurance`} style={{ padding: "8px 14px", backgroundColor: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("patientsListPage.postCreateGoSecondaryInsurance")}</Link>
              <Link href={`/app/patients/${postCreatePatient.id}/facesheet`} style={{ padding: "8px 14px", backgroundColor: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("patientsListPage.postCreateGoFacesheet")}</Link>
              <Link href="/app/encounters" style={{ padding: "8px 14px", backgroundColor: "#fff", color: "#0f172a", border: "1px solid #cbd5e1", borderRadius: 8, textDecoration: "none", fontSize: 13, fontWeight: 600 }}>{t("patientsListPage.postCreateEncountersList")}</Link>
              <button type="button" onClick={() => setPostCreatePatient(null)} style={{ padding: "8px 12px", background: "transparent", border: "none", color: "#64748b", fontSize: 13, cursor: "pointer", textDecoration: "underline" }}>{t("patientsListPage.postCreateDismiss")}</button>
            </div>
          </div>
        ) : null}

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="patient-search-q" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6 }}>{t("patientsListPage.searchLabel")}</label>
          <input id="patient-search-q" type="search" autoComplete="off" placeholder={t("patientsListPage.searchPlaceholder")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ width: "100%", maxWidth: 520, height: 44, padding: "0 16px", border: "1px solid #e2e8f0", borderRadius: 12, fontSize: 15, color: "#0f172a", backgroundColor: "#fff" }} />
        </div>

        {loading && <div style={{ borderRadius: 16, border: "1px solid #e2e8f0", backgroundColor: "#fff", padding: 28, textAlign: "center", color: "#64748b", fontSize: 14 }}>{t("common.loading")}</div>}
        {!loading && patients.length === 0 && searchQuery && <div style={{ padding: "32px 24px", textAlign: "center", color: "#334155", border: "1px dashed #cbd5e1", borderRadius: 16, backgroundColor: "#fff" }}><div style={{ fontWeight: 600, fontSize: 16 }}>{t("patientsListPage.emptySearchTitle")}</div><div style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>{t("patientsListPage.emptySearchHint")}</div></div>}
        {!loading && patients.length > 0 && (
          <div style={{ backgroundColor: "#fff", borderRadius: 16, border: "1px solid #e2e8f0", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead><tr><th style={thBase}>{t("patientsListPage.colNir")}</th><th style={thBase}>{t("patientsListPage.colName")}</th><th style={thBase}>{t("patientsListPage.colAgeSex")}</th><th style={thBase}>{t("patientsListPage.colDob")}</th><th style={thBase}>{t("patientsListPage.colPhone")}</th><th style={{ ...thBase, textAlign: "right" }}>{t("common.actions")}</th></tr></thead>
                <tbody>{patients.map((patient) => <tr key={patient.id} onClick={() => handleRowClick(patient.id)} style={{ cursor: canOpenPatientDossier ? "pointer" : "default" }}><td style={tdBase}>{patient.mrn || "-"}</td><td style={{ ...tdBase, fontWeight: 500 }}>{patient.firstName} {patient.lastName}</td><td style={tdBase}>{formatAgeYearsSexForLocale(patient.dob, patient.sexAtBirth ?? null, patient.sex ?? null, language)}</td><td style={tdBase}>{formatDate(patient.dob)}</td><td style={tdBase}>{patient.phone || "-"}</td><td style={{ ...tdBase, textAlign: "right" }} onClick={(e) => e.stopPropagation()}><div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>{canOpenPatientProfile && isAppPathAllowedForRoles(`/app/patients/${patient.id}/profile`, roles) && <Link href={`/app/patients/${patient.id}/profile`} style={{ padding: "8px 14px", border: "1px solid #e2e8f0", borderRadius: 10, textDecoration: "none", color: "#0f172a" }}>{t("patientProfile.linkEditProfile")}</Link>}<button type="button" onClick={() => handleRowClick(patient.id)} disabled={!canOpenPatientDossier}>{t("patientsListPage.openChart")}</button>{canCreateConsultation && <button type="button" onClick={() => setConsultationTarget(patient)} style={{ background: "#0f172a", color: "#fff", border: 0, borderRadius: 10, padding: "8px 14px" }}>{t("patientsListPage.createEncounter")}</button>}</div></td></tr>)}</tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && facilityId && <NewPatientModal facilityId={facilityId} canCreateConsultation={canCreateConsultation} onClose={() => setShowModal(false)} onSuccess={(createdPatient) => { setShowModal(false); void handleSearch(); if (createdPatient?.id) setPostCreatePatient(createdPatient); if (createdPatient && canCreateConsultation) setConsultationTarget(createdPatient); }} />}
      {consultationTarget && facilityId && <CreateConsultationModal facilityId={facilityId} patient={consultationTarget} canOpenEncounterDetail={canOpenEncounterDetail} onClose={() => setConsultationTarget(null)} />}
    </div>
  );
}

function PatientsRouteLoading() {
  const { t } = useI18n();
  return <div style={{ minHeight: "40vh", padding: 24, backgroundColor: "#f8fafc", color: "#64748b", fontSize: 14 }}>{t("common.loading")}</div>;
}

export default function PatientsPage() {
  return <Suspense fallback={<PatientsRouteLoading />}><PatientsPageContent /></Suspense>;
}
