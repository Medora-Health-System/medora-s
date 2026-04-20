"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { formatPatientAgeOnlyLine, formatAgeYearsSexForLocale } from "@/lib/patientDisplay";
import { encounterBcp47, tEnumKey, tEncounterType } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { isAppPathAllowedForRoles } from "@/lib/landingRoute";
import { DEFAULT_ENCOUNTER_ROOM_LABEL, ENCOUNTER_ROOM_OPTIONS } from "@/lib/encounterRoomOptions";

interface Patient {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  dob: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  phone: string | null;
  nationalId?: string | null;
}

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
  const { roles, ready: rolesReady } = useFacilityAndRoles();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [consultationTarget, setConsultationTarget] = useState<Patient | null>(null);
  const [postCreatePatient, setPostCreatePatient] = useState<Patient | null>(null);
  const [facilityId, setFacilityId] = useState<string>("");

  // Open new-patient modal when landing with ?new=1 (e.g. from registration)
  useEffect(() => {
    if (searchParams.get("new") === "1") setShowModal(true);
  }, [searchParams]);

  useEffect(() => {
    // Get facility ID from cookie (check both names for compatibility)
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];

    if (cookieValue) {
      setFacilityId(cookieValue);
    } else {
      // Fallback to fetching from user data
      fetch("/api/auth/me")
        .then((res) => parseApiResponse(res))
        .then((data) => {
          const d = data && typeof data === "object" && !Array.isArray(data) ? (data as { facilityRoles?: { facilityId?: string }[] }) : null;
          const firstFacility = d?.facilityRoles?.[0]?.facilityId;
          if (firstFacility) {
            setFacilityId(firstFacility);
            document.cookie = `medora_facility_id=${firstFacility}; path=/; max-age=${365 * 24 * 60 * 60}`;
          }
        });
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim() || facilityId) {
      handleSearch();
    }
  }, [searchQuery, facilityId]);

  const handleSearch = async () => {
    if (!facilityId) return;
    
    setLoading(true);
    const cacheKey = `patient-search-index:${facilityId}`;
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      const data = await apiFetch(`/patients/search?${params.toString()}`, {
        facilityId,
      });
      const list = patientSearchList(data);
      setPatients(list);
      void setCachedRecord("patient_summaries", cacheKey, list, { facilityId });
    } catch (error) {
      console.error("Search error:", error);
      const cached = await getCachedRecord<Patient[]>("patient_summaries", cacheKey);
      const base = cached?.data ?? [];
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        setPatients(base);
      } else {
        setPatients(
          base.filter((p) =>
            `${p.firstName} ${p.lastName} ${p.mrn ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(q)
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const canCreateConsultation =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("FRONT_DESK"));
  /** Aligné sur la page `/app/encounters/[id]` (GET consultation autorisé). */
  const canOpenEncounterDetail =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("BILLING") ||
      roles.includes("LAB") ||
      roles.includes("RADIOLOGY") ||
      roles.includes("PHARMACY"));
  /** Dossier patient hors liste — pas pour accueil seul. */
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

  /** GET/PATCH patient — même périmètre que la page profil. */
  const canOpenPatientProfile =
    rolesReady &&
    (roles.includes("FRONT_DESK") ||
      roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN"));

  const handleRowClick = (patientId: string) => {
    if (!canOpenPatientDossier) return;
    router.push(`/app/patients/${patientId}`);
  };

  const dateLocale = encounterBcp47(language);
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString(dateLocale);
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
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 24px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              {t("common.searchPatient")}
            </h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 560, lineHeight: 1.5 }}>
              {t("patientsListPage.subtitleSearchFacility")}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              height: 40,
              padding: "0 18px",
              backgroundColor: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
            }}
          >
            {t("patientsListPage.newPatient")}
          </button>
        </header>

        {postCreatePatient &&
        rolesReady &&
        canOpenPatientDossier &&
        isAppPathAllowedForRoles(`/app/patients/${postCreatePatient.id}`, roles) ? (
          <div
            style={{
              marginBottom: 20,
              padding: "16px 18px",
              borderRadius: 12,
              border: "1px solid #bae6fd",
              backgroundColor: "#f0f9ff",
            }}
          >
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: "#0c4a6e" }}>
                {t("patientsListPage.postCreateBannerTitle")}
              </div>
              <div style={{ fontSize: 13, color: "#0369a1", marginTop: 4 }}>
                {t("patientsListPage.postCreateBannerHint")}{" "}
                <strong>
                  {postCreatePatient.firstName} {postCreatePatient.lastName}
                </strong>
              </div>
              <div style={{ fontSize: 12, color: "#0e7490", marginTop: 8, maxWidth: 720, lineHeight: 1.45 }}>
                {t("patientsListPage.postCreateBannerSubhint")}
              </div>
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
              <Link
                href={`/app/patients/${postCreatePatient.id}`}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t("patientsListPage.postCreateGoChart")}
              </Link>
              {canOpenPatientProfile &&
                isAppPathAllowedForRoles(`/app/patients/${postCreatePatient.id}/profile`, roles) && (
                  <Link
                    href={`/app/patients/${postCreatePatient.id}/profile`}
                    style={{
                      padding: "8px 14px",
                      backgroundColor: "#fff",
                      color: "#0f172a",
                      border: "1px solid #cbd5e1",
                      borderRadius: 8,
                      textDecoration: "none",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {t("patientProfile.linkViewProfile")}
                  </Link>
                )}
              <Link
                href={`/app/registration?patient=${postCreatePatient.id}`}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#0d47a1",
                  color: "#fff",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t("patientsListPage.postCreateContinueRegistration")}
              </Link>
              <Link
                href={`/app/patients/${postCreatePatient.id}#patient-registration-insurance`}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#1565c0",
                  color: "#fff",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t("patientsListPage.postCreateGoPrimaryInsurance")}
              </Link>
              <Link
                href={`/app/patients/${postCreatePatient.id}#patient-registration-insurance`}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#fff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t("patientsListPage.postCreateGoSecondaryInsurance")}
              </Link>
              <Link
                href={`/app/patients/${postCreatePatient.id}/facesheet`}
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#fff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t("patientsListPage.postCreateGoFacesheet")}
              </Link>
              <Link
                href="/app/encounters"
                style={{
                  padding: "8px 14px",
                  backgroundColor: "#fff",
                  color: "#0f172a",
                  border: "1px solid #cbd5e1",
                  borderRadius: 8,
                  textDecoration: "none",
                  fontSize: 13,
                  fontWeight: 600,
                }}
              >
                {t("patientsListPage.postCreateEncountersList")}
              </Link>
              <button
                type="button"
                onClick={() => setPostCreatePatient(null)}
                style={{
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  color: "#64748b",
                  fontSize: 13,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                {t("patientsListPage.postCreateDismiss")}
              </button>
            </div>
          </div>
        ) : null}

      <div style={{ marginBottom: 20 }}>
          <label htmlFor="patient-search-q" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, letterSpacing: "0.02em" }}>
            {t("patientsListPage.searchLabel")}
          </label>
          <input
            id="patient-search-q"
            type="search"
            autoComplete="off"
            placeholder={t("patientsListPage.searchPlaceholder")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 520,
              height: 44,
              padding: "0 16px",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 15,
              color: "#0f172a",
              backgroundColor: "#fff",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
              boxSizing: "border-box",
            }}
          />
        </div>

        {loading && (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              backgroundColor: "#fff",
              padding: 28,
              textAlign: "center",
              color: "#64748b",
              fontSize: 14,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            {t("common.loading")}
          </div>
        )}

        {!loading && patients.length === 0 && searchQuery && (
          <div
            style={{
              padding: "32px 24px",
              textAlign: "center",
              color: "#334155",
              border: "1px dashed #cbd5e1",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.95)",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16 }}>{t("patientsListPage.emptySearchTitle")}</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>{t("patientsListPage.emptySearchHint")}</div>
          </div>
        )}

        {!loading && patients.length > 0 && (
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={thBase}>{t("patientsListPage.colNir")}</th>
                    <th style={thBase}>{t("patientsListPage.colName")}</th>
                    <th style={thBase}>{t("patientsListPage.colAgeSex")}</th>
                    <th style={thBase}>{t("patientsListPage.colDob")}</th>
                    <th style={thBase}>{t("patientsListPage.colPhone")}</th>
                    <th style={{ ...thBase, textAlign: "right" }}>{t("common.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => handleRowClick(patient.id)}
                      style={{
                        cursor: canOpenPatientDossier ? "pointer" : "default",
                        backgroundColor: "#fff",
                      }}
                      onMouseEnter={(e) => {
                        if (canOpenPatientDossier) e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#fff";
                      }}
                    >
                      <td style={{ ...tdBase, fontVariantNumeric: "tabular-nums", color: "#334155" }}>{patient.mrn || "-"}</td>
                      <td style={{ ...tdBase, fontWeight: 500 }}>{patient.firstName} {patient.lastName}</td>
                      <td style={tdBase}>
                        {formatAgeYearsSexForLocale(patient.dob, patient.sexAtBirth ?? null, patient.sex ?? null, language)}
                      </td>
                      <td style={{ ...tdBase, fontVariantNumeric: "tabular-nums" }}>{formatDate(patient.dob)}</td>
                      <td style={{ ...tdBase, fontVariantNumeric: "tabular-nums" }}>{patient.phone || "-"}</td>
                      <td style={{ ...tdBase, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          {canOpenPatientProfile &&
                            isAppPathAllowedForRoles(`/app/patients/${patient.id}/profile`, roles) && (
                              <Link
                                href={`/app/patients/${patient.id}/profile`}
                                onClick={(ev) => ev.stopPropagation()}
                                style={{
                                  padding: "8px 14px",
                                  border: "1px solid #e2e8f0",
                                  borderRadius: 10,
                                  background: "#f8fafc",
                                  color: "#0f172a",
                                  fontSize: 13,
                                  fontWeight: 600,
                                  textDecoration: "none",
                                  display: "inline-block",
                                  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                                }}
                              >
                                {t("patientProfile.linkEditProfile")}
                              </Link>
                            )}
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleRowClick(patient.id);
                            }}
                            disabled={!canOpenPatientDossier}
                            style={{
                              padding: "8px 14px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 10,
                              background: "#fff",
                              color: "#334155",
                              cursor: canOpenPatientDossier ? "pointer" : "not-allowed",
                              fontSize: 13,
                              fontWeight: 600,
                              opacity: canOpenPatientDossier ? 1 : 0.55,
                              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                            }}
                          >
                            {t("patientsListPage.openChart")}
                          </button>
                          {canCreateConsultation && (
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setConsultationTarget(patient);
                              }}
                              style={{
                                padding: "8px 14px",
                                border: "none",
                                borderRadius: 10,
                                background: "#0f172a",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
                              }}
                            >
                              {t("patientsListPage.createEncounter")}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NewPatientModal
          facilityId={facilityId}
          canCreateConsultation={canCreateConsultation}
          onClose={() => setShowModal(false)}
          onSuccess={(createdPatient) => {
            setShowModal(false);
            handleSearch();
            if (createdPatient?.id) {
              setPostCreatePatient(createdPatient);
            }
            if (createdPatient && canCreateConsultation) {
              setConsultationTarget(createdPatient);
            }
          }}
        />
      )}
      {consultationTarget && facilityId && (
        <CreateConsultationModal
          facilityId={facilityId}
          patient={consultationTarget}
          canOpenEncounterDetail={canOpenEncounterDetail}
          onClose={() => setConsultationTarget(null)}
        />
      )}
    </div>
  );
}

function PatientsRouteLoading() {
  const { t } = useI18n();
  return (
    <div style={{ minHeight: "40vh", padding: 24, backgroundColor: "#f8fafc", color: "#64748b", fontSize: 14 }}>
      {t("common.loading")}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense fallback={<PatientsRouteLoading />}>
      <PatientsPageContent />
    </Suspense>
  );
}

function NewPatientModal({
  facilityId,
  canCreateConsultation,
  onClose,
  onSuccess,
}: {
  facilityId: string;
  canCreateConsultation: boolean;
  onClose: () => void;
  onSuccess: (patient?: Patient | null) => void;
}) {
  const { t, language } = useI18n();
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "" as "" | "HOMME" | "FEMME" | "AUTRE" | "INCONNU",
    phone: "",
    email: "",
    addressLine1: "",
    addressLine2: "",
    nationalId: "",
    emergencyContactName: "",
    emergencyContactRelationship: "",
    emergencyContactPhone: "",
    adminNotes: "",
    city: "",
    stateProvince: "",
    postalCode: "",
    country: "",
    language: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [similarPatients, setSimilarPatients] = useState<Patient[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState<string>("");
  const dupeDateLocale = encounterBcp47(language);

  useEffect(() => {
    const first = formData.firstName.trim();
    const last = formData.lastName.trim();
    const dob = formData.dateOfBirth.trim();
    const phone = formData.phone.trim();
    const canCheck = first.length >= 2 && last.length >= 2 && (Boolean(dob) || phone.length >= 6);
    if (!canCheck || !facilityId) {
      setSimilarPatients([]);
      setDuplicateHint("");
      return;
    }
    const run = async () => {
      setCheckingDuplicates(true);
      setDuplicateHint("");
      try {
        const query = `${first} ${last} ${phone}`.trim();
        const raw = await apiFetch(`/patients/search?q=${encodeURIComponent(query)}`, {
          facilityId,
        });
        const list = patientSearchList(raw);
        const matches = list.filter((p) => {
          const sameDob = dob && p.dob ? new Date(p.dob).toISOString().slice(0, 10) === dob : false;
          const samePhone = phone && p.phone ? p.phone.replace(/\s+/g, "") === phone.replace(/\s+/g, "") : false;
          const sameName =
            p.firstName?.trim().toLowerCase() === first.toLowerCase() &&
            p.lastName?.trim().toLowerCase() === last.toLowerCase();
          return sameName && (sameDob || samePhone);
        });
        setSimilarPatients(matches.slice(0, 5));
      } catch {
        const cached = await getCachedRecord<Patient[]>("patient_summaries", `patient-search-index:${facilityId}`);
        const local = (cached?.data ?? []).filter((p) => {
          const sameName =
            p.firstName?.trim().toLowerCase() === first.toLowerCase() &&
            p.lastName?.trim().toLowerCase() === last.toLowerCase();
          return sameName;
        });
        setSimilarPatients(local.slice(0, 5));
        setDuplicateHint(t("patientsListPage.duplicateCheckOffline"));
      } finally {
        setCheckingDuplicates(false);
      }
    };
    const timeoutId = window.setTimeout(() => {
      void run();
    }, 350);
    return () => window.clearTimeout(timeoutId);
  }, [facilityId, formData.firstName, formData.lastName, formData.dateOfBirth, formData.phone, t]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) {
      setError(t("patientsListPage.errFacilityIdRequired"));
      return;
    }
    const hasContact = formData.phone.trim().length >= 5 || formData.email.trim().length > 0;
    if (!hasContact) {
      setError(t("patientsListPage.errContactRequired"));
      return;
    }
    const birth = new Date(formData.dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
      setError(t("patientsListPage.errDobInvalid"));
      return;
    }
    if (birth.getTime() > Date.now()) {
      setError(t("patientsListPage.errDobFuture"));
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        sex: formData.sex,
      };
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.nationalId.trim()) payload.nationalId = formData.nationalId.trim();
      if (formData.addressLine1.trim()) payload.addressLine1 = formData.addressLine1.trim();
      if (formData.addressLine2.trim()) payload.addressLine2 = formData.addressLine2.trim();
      if (formData.city.trim()) payload.city = formData.city.trim();
      if (formData.stateProvince.trim()) payload.stateProvince = formData.stateProvince.trim();
      if (formData.postalCode.trim()) payload.postalCode = formData.postalCode.trim();
      if (formData.country.trim()) payload.country = formData.country.trim();
      if (formData.language.trim()) payload.language = formData.language.trim();
      if (formData.emergencyContactName.trim()) payload.emergencyContactName = formData.emergencyContactName.trim();
      if (formData.emergencyContactRelationship.trim()) {
        payload.emergencyContactRelationship = formData.emergencyContactRelationship.trim();
      }
      if (formData.emergencyContactPhone.trim().length >= 5) {
        payload.emergencyContactPhone = formData.emergencyContactPhone.trim();
      }
      if (formData.adminNotes.trim()) payload.adminNotes = formData.adminNotes.trim();

      const res = await apiFetch("/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });
      if (res?.queued) {
        setInfo(t("patientsListPage.queuedCreateBody"));
        onSuccess(null);
        return;
      }
      onSuccess((res as Patient) ?? null);
    } catch (err) {
      setError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("patientsListPage.errCreatePatient")
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 8,
          maxWidth: 600,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>{t("patientsListPage.titleNewPatient")}</h2>
        <p style={{ fontSize: 14, color: "#444", marginTop: -8, marginBottom: 16 }}>
          {formData.dateOfBirth && formData.sex
            ? formatAgeYearsSexForLocale(formData.dateOfBirth, formData.sex, null, language)
            : t("patientsListPage.hintDobSex")}
        </p>
        <form onSubmit={handleSubmit}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>{t("patientsListPage.sectionIdentity")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                {t("patientsListPage.labelFirstName")}
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                {t("patientsListPage.labelLastName")}
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelDob")}</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelSex")}</label>
              <select
                required
                value={formData.sex}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sex: e.target.value as "" | "HOMME" | "FEMME" | "AUTRE" | "INCONNU",
                  })
                }
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="">—</option>
                {(["HOMME", "FEMME", "AUTRE", "INCONNU"] as const).map((code) => (
                  <option key={code} value={code}>
                    {tEnumKey(t, "encounterChrome.sexAtBirth", code)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelAge")}</label>
              <input
                type="text"
                readOnly
                value={formatPatientAgeOnlyLine(formData.dateOfBirth, t)}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, backgroundColor: "#f7f7f7" }}
              />
            </div>
          </div>

          <h3 style={{ margin: "6px 0 12px 0", fontSize: 16 }}>{t("patientsListPage.sectionContact")}</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelPhone")}</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelEmail")}</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelAddressLine1")}</label>
            <input
              type="text"
              value={formData.addressLine1}
              onChange={(e) => setFormData({ ...formData, addressLine1: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelAddressLine2")}</label>
            <input
              type="text"
              value={formData.addressLine2}
              onChange={(e) => setFormData({ ...formData, addressLine2: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelCity")}</label>
              <input
                type="text"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelPostalCode")}</label>
              <input
                type="text"
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelStateProvince")}</label>
              <input
                type="text"
                value={formData.stateProvince}
                onChange={(e) => setFormData({ ...formData, stateProvince: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelCountry")}</label>
              <input
                type="text"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>

          <h3 style={{ margin: "6px 0 12px 0", fontSize: 16 }}>{t("patientsListPage.sectionIdentifiers")}</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelNationalId")}</label>
            <input
              type="text"
              value={formData.nationalId}
              onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <h3 style={{ margin: "6px 0 12px 0", fontSize: 16 }}>{t("patientsListPage.sectionMore")}</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelEmergencyName")}</label>
              <input
                type="text"
                value={formData.emergencyContactName}
                onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelEmergencyRelationship")}</label>
              <input
                type="text"
                value={formData.emergencyContactRelationship}
                onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelEmergencyPhone")}</label>
            <input
              type="tel"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientsListPage.labelAdminNotes")}</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={3}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, resize: "vertical" }}
            />
          </div>

          {(checkingDuplicates || similarPatients.length > 0 || duplicateHint) && (
            <div style={{ marginBottom: 16, border: "1px solid #ffe082", background: "#fffde7", borderRadius: 6, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{t("patientsListPage.similarPatientsTitle")}</div>
              <div style={{ fontSize: 13, color: "#6d4c41", marginBottom: 8 }}>
                {t("patientsListPage.similarPatientsHint")}
              </div>
              {checkingDuplicates && <div style={{ fontSize: 13 }}>{t("patientsListPage.checkingDuplicates")}</div>}
              {!checkingDuplicates && duplicateHint && <div style={{ fontSize: 13, marginBottom: 6 }}>{duplicateHint}</div>}
              {!checkingDuplicates && similarPatients.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  {similarPatients.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13 }}>
                        {p.firstName} {p.lastName} ·{" "}
                        {p.dob ? new Date(p.dob).toLocaleDateString(dupeDateLocale) : t("common.dash")}
                      </span>
                      <a href={`/app/patients/${p.id}`} style={{ fontSize: 12, color: "#1a1a1a" }}>
                        {t("patientsListPage.openExistingChart")}
                      </a>
                    </div>
                  ))}
                </div>
              )}
              {!checkingDuplicates && <div style={{ marginTop: 8, fontSize: 12 }}>{t("patientsListPage.continueAnyway")}</div>}
            </div>
          )}

          {info && (
            <div style={{ padding: 12, backgroundColor: "#e8f5e9", color: "#1b5e20", borderRadius: 4, marginBottom: 16 }}>
              {info}
            </div>
          )}
          {error && (
            <div style={{ padding: 12, backgroundColor: "#fee", color: "#c33", borderRadius: 4, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                border: "1px solid #ddd",
                borderRadius: 4,
                cursor: "pointer",
                backgroundColor: "white",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading
                ? t("patientsListPage.btnSubmitCreating")
                : canCreateConsultation
                  ? t("patientsListPage.btnCreatePatient")
                  : t("patientsListPage.btnSavePatient")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateConsultationModal({
  facilityId,
  patient,
  canOpenEncounterDetail,
  onClose,
}: {
  facilityId: string;
  patient: Patient;
  canOpenEncounterDetail: boolean;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const [type, setType] = useState<"OUTPATIENT" | "URGENT_CARE" | "EMERGENCY">("OUTPATIENT");
  const [visitReason, setVisitReason] = useState("");
  const [roomLabel, setRoomLabel] = useState(DEFAULT_ENCOUNTER_ROOM_LABEL);
  const [arrivalAtLocal, setArrivalAtLocal] = useState("");
  const [modeOfArrival, setModeOfArrival] = useState("");
  const [initialAcuity, setInitialAcuity] = useState("");
  const [physicianAssignedUserId, setPhysicianAssignedUserId] = useState("");
  const [providers, setProviders] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; queued?: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/roster/providers", { facilityId });
        if (!cancelled && Array.isArray(data)) setProviders(data);
      } catch {
        if (!cancelled) setProviders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  const createEncounter = async () => {
    if (!facilityId || !patient?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/patients/${patient.id}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          visitReason: visitReason.trim() || undefined,
          roomLabel: roomLabel.trim() || DEFAULT_ENCOUNTER_ROOM_LABEL,
          physicianAssignedUserId: physicianAssignedUserId.trim() || undefined,
        }),
        facilityId,
      });
      if (res?.queued) {
        setCreated({ id: "", queued: true });
        return;
      }
      const encId = (res as { id: string }).id;
      const intakeBody: Record<string, unknown> = {
        initialChiefComplaint: visitReason.trim() || undefined,
        initialRoom: roomLabel.trim() || DEFAULT_ENCOUNTER_ROOM_LABEL,
      };
      if (arrivalAtLocal.trim()) {
        const d = new Date(arrivalAtLocal);
        if (!Number.isNaN(d.getTime())) intakeBody.arrivalAt = d.toISOString();
      }
      if (modeOfArrival.trim()) intakeBody.modeOfArrival = modeOfArrival.trim();
      if (initialAcuity) intakeBody.initialAcuity = Number(initialAcuity);
      try {
        await apiFetch(`/encounters/${encId}/intake`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(intakeBody),
          facilityId,
        });
      } catch {
        /* accueil : meilleur effort, la consultation est déjà créée */
      }
      setCreated({ id: encId });
    } catch (e) {
      setError(e instanceof Error ? e.message : t("patientConsultationsTab.create.createFailed"));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }} onClick={onClose}>
      <div style={{ width: "92%", maxWidth: 520, backgroundColor: "#fff", borderRadius: 8, padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 8px 0" }}>{t("patientConsultationsTab.create.title")}</h2>
        <p style={{ margin: "0 0 14px 0", color: "#555", fontSize: 14 }}>
          {patient.firstName} {patient.lastName}
        </p>
        {!created && (
          <>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientConsultationsTab.create.typeLabel")}</label>
            <select value={type} onChange={(e) => setType(e.target.value as "OUTPATIENT" | "URGENT_CARE" | "EMERGENCY")} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}>
              <option value="OUTPATIENT">{tEncounterType(t, "OUTPATIENT")}</option>
              <option value="URGENT_CARE">{tEncounterType(t, "URGENT_CARE")}</option>
              <option value="EMERGENCY">{tEncounterType(t, "EMERGENCY")}</option>
            </select>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientConsultationsTab.create.roomLabel")}</label>
            <select
              value={roomLabel}
              onChange={(e) => setRoomLabel(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}
            >
              {ENCOUNTER_ROOM_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientConsultationsTab.create.physicianOptional")}</label>
            <select
              value={physicianAssignedUserId}
              onChange={(e) => setPhysicianAssignedUserId(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}
            >
              <option value="">—</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName} {p.firstName}
                </option>
              ))}
            </select>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientConsultationsTab.create.visitReason")}</label>
            <textarea value={visitReason} onChange={(e) => setVisitReason(e.target.value)} rows={3} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, resize: "vertical" }} />
            <p style={{ margin: "14px 0 6px 0", fontSize: 13, fontWeight: 600, color: "#444" }}>{t("patientConsultationsTab.create.intakeSectionTitle")}</p>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientConsultationsTab.create.intakeArrival")}</label>
            <input
              type="datetime-local"
              value={arrivalAtLocal}
              onChange={(e) => setArrivalAtLocal(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}
            />
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientConsultationsTab.create.intakeMode")}</label>
            <input
              type="text"
              value={modeOfArrival}
              onChange={(e) => setModeOfArrival(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}
            />
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>{t("patientConsultationsTab.create.intakeAcuity")}</label>
            <select
              value={initialAcuity}
              onChange={(e) => setInitialAcuity(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}
            >
              <option value="">—</option>
              {([1, 2, 3, 4, 5] as const).map((n) => (
                <option key={n} value={String(n)}>
                  {n}
                </option>
              ))}
            </select>
            {error && <div style={{ marginTop: 10, color: "#c62828", fontSize: 13 }}>{error}</div>}
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={onClose} style={{ padding: "9px 14px", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>
                {t("orderDetail.backToList")}
              </button>
              <button type="button" onClick={() => void createEncounter()} disabled={submitting} style={{ padding: "9px 14px", border: "none", borderRadius: 4, background: "#1a1a1a", color: "#fff", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
                {submitting ? t("patientConsultationsTab.create.creating") : t("patientConsultationsTab.create.submit")}
              </button>
            </div>
          </>
        )}
        {created && (
          <div>
            <div style={{ color: "#1b5e20", marginBottom: 14, fontWeight: 600 }}>
              {created.queued
                ? t("patientConsultationsTab.create.successOffline")
                : t("patientConsultationsTab.create.successCreated")}
            </div>
            {created.queued && (
              <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#2e7d32" }}>
                {t("patientConsultationsTab.create.syncWhenOnline")}
              </p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              {!created.queued && created.id && (
                canOpenEncounterDetail ? (
                  <Link
                    href={`/app/encounters/${created.id}`}
                    style={{ padding: "8px 12px", borderRadius: 4, background: "#1a1a1a", color: "#fff", textDecoration: "none", fontSize: 13, display: "inline-block" }}
                  >
                    {t("openEncountersTable.openEncounter")}
                  </Link>
                ) : (
                  <Link
                    href={`/app/patients/${patient.id}`}
                    style={{ padding: "8px 12px", borderRadius: 4, background: "#1a1a1a", color: "#fff", textDecoration: "none", fontSize: 13, display: "inline-block" }}
                  >
                    {t("openEncountersTable.openPatientChart")}
                  </Link>
                )
              )}
              <button type="button" onClick={onClose} style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>
                {t("orderDetail.backToList")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
