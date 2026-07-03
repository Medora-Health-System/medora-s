"use client";

import React, { Suspense, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { fetchUpcomingFollowUps, type FollowUpRow } from "@/lib/followUpsApi";
import {
  CreateFollowUpModal,
  PatientPrimaryInsurancePanel,
  PatientSecondaryInsurancePanel,
} from "@/components/patient-chart";
import { RegistrationDocumentCenter } from "@/components/documents/RegistrationDocumentCenter";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { useConnectivityStatus } from "@/lib/offline/useConnectivityStatus";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { isAppPathAllowedForRoles } from "@/lib/landingRoute";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { MEDORA_PATIENT_PROFILE_UPDATED } from "@/lib/chartEvents";
import { BillingClassificationBadgeReadOnly } from "@/components/encounters/BillingClassificationBadgeReadOnly";

type RegPatientRow = {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
};

type WorkspacePatient = {
  id: string;
  firstName?: string;
  lastName?: string;
  dob?: string | null;
  mrn?: string | null;
  phone?: string | null;
  email?: string | null;
  addressLine1?: string | null;
  addressLine2?: string | null;
  city?: string | null;
  stateProvince?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

type InsuranceRow = {
  rank: string;
  payerId: string | null;
  payerNameFreeText: string | null;
  planName?: string | null;
  memberId?: string | null;
  groupNumber?: string | null;
  payer?: { name?: string | null } | null;
};

function registrationSearchList(data: unknown): RegPatientRow[] {
  if (Array.isArray(data)) return data as RegPatientRow[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: RegPatientRow[] }).items;
  }
  return [];
}

function insuranceRowHasContent(r: InsuranceRow | undefined): boolean {
  if (!r) return false;
  return Boolean(
    r.payerId ||
      r.payerNameFreeText?.trim() ||
      r.planName?.trim() ||
      r.memberId?.trim() ||
      r.groupNumber?.trim()
  );
}

function payerDisplayName(r: InsuranceRow): string {
  if (r.payer?.name) return r.payer.name;
  if (r.payerNameFreeText?.trim()) return r.payerNameFreeText.trim();
  return "";
}

function RegistrationPageInner() {
  const { t, language } = useI18n();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { facilityId: hookFacilityId, roles, ready: rolesReady } = useFacilityAndRoles();
  const dateLocale = encounterBcp47(language);
  const formatDate = (d: string | null | undefined) =>
    d ? new Date(d).toLocaleDateString(dateLocale) : t("common.dash");
  const [facilityId, setFacilityId] = useState<string | null>(null);
  const [followUps, setFollowUps] = useState<FollowUpRow[]>([]);
  const [followUpsLoading, setFollowUpsLoading] = useState(false);
  const [showAddFollowUp, setShowAddFollowUp] = useState(false);
  const { isOffline } = useConnectivityStatus();
  const [regSearchQ, setRegSearchQ] = useState("");
  const [regSearchLoading, setRegSearchLoading] = useState(false);
  const [regSearchResults, setRegSearchResults] = useState<RegPatientRow[]>([]);
  const [selectedRegPatient, setSelectedRegPatient] = useState<RegPatientRow | null>(null);
  const [regSearchError, setRegSearchError] = useState<string | null>(null);
  const [workspacePatient, setWorkspacePatient] = useState<WorkspacePatient | null>(null);
  const [workspaceInsurance, setWorkspaceInsurance] = useState<InsuranceRow[]>([]);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);
  const [workspaceOpenEncounter, setWorkspaceOpenEncounter] = useState<{
    id: string;
    billingClassification?: string | null;
  } | null>(null);
  const [insuranceSyncVersion, setInsuranceSyncVersion] = useState(0);
  const bumpInsurancePanels = useCallback(() => {
    setInsuranceSyncVersion((v) => v + 1);
  }, []);

  useEffect(() => {
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];
    setFacilityId(cookieValue || null);
  }, []);

  const effectiveFacilityId = hookFacilityId || facilityId || "";

  const runRegistrationPatientSearch = useCallback(async () => {
    const q = regSearchQ.trim();
    if (q.length < 2 || !effectiveFacilityId) {
      setRegSearchResults([]);
      return;
    }
    setRegSearchLoading(true);
    setRegSearchError(null);
    try {
      const raw = await apiFetch(`/patients/search?q=${encodeURIComponent(q)}`, {
        facilityId: effectiveFacilityId,
      });
      setRegSearchResults(registrationSearchList(raw).slice(0, 12));
    } catch {
      setRegSearchResults([]);
      setRegSearchError(t("registrationHome.registrationSearchError"));
    } finally {
      setRegSearchLoading(false);
    }
  }, [effectiveFacilityId, regSearchQ, t]);

  const loadWorkspaceDetails = useCallback(
    async (patientId: string) => {
      if (!effectiveFacilityId) return;
      setWorkspaceLoading(true);
      setWorkspaceError(null);
      setWorkspaceInsurance([]);
      setWorkspaceOpenEncounter(null);
      try {
        const p = await apiFetch(`/patients/${patientId}`, { facilityId: effectiveFacilityId });
        if (!p || typeof p !== "object") {
          throw new Error(t("registrationWorkspace.loadError"));
        }
        setWorkspacePatient(p as WorkspacePatient);
        try {
          const encs = await apiFetch(`/patients/${patientId}/encounters?limit=8`, {
            facilityId: effectiveFacilityId,
          });
          const open =
            Array.isArray(encs) ?
              (encs as { id: string; status?: string; billingClassification?: string | null }[]).find(
                (e) => e.status === "OPEN",
              ) ?? null
            : null;
          setWorkspaceOpenEncounter(open);
        } catch {
          setWorkspaceOpenEncounter(null);
        }
        try {
          const ins = await apiFetch(`/patients/${patientId}/insurance`, { facilityId: effectiveFacilityId });
          setWorkspaceInsurance(Array.isArray(ins) ? (ins as InsuranceRow[]) : []);
        } catch (e2) {
          setWorkspaceInsurance([]);
          setWorkspaceError(
            normalizeUserFacingError(e2 instanceof Error ? e2.message : null, language) ||
              t("registrationWorkspace.loadInsuranceError")
          );
        }
      } catch (e) {
        setWorkspacePatient(null);
        setWorkspaceInsurance([]);
        setWorkspaceOpenEncounter(null);
        setWorkspaceError(
          normalizeUserFacingError(e instanceof Error ? e.message : null, language) || t("registrationWorkspace.loadError")
        );
      } finally {
        setWorkspaceLoading(false);
      }
    },
    [effectiveFacilityId, language, t]
  );

  useEffect(() => {
    const pid = searchParams.get("patient")?.trim();
    if (!pid || !rolesReady || !effectiveFacilityId) return;
    if (selectedRegPatient?.id === pid) return;
    void (async () => {
      try {
        const p = (await apiFetch(`/patients/${pid}`, {
          facilityId: effectiveFacilityId,
        })) as WorkspacePatient;
        if (!p?.id) return;
        setSelectedRegPatient({
          id: p.id,
          firstName: p.firstName ?? "",
          lastName: p.lastName ?? "",
          mrn: p.mrn ?? null,
          phone: p.phone ?? null,
        });
      } catch {
        /* invalid or inaccessible id */
      }
    })();
  }, [searchParams, rolesReady, effectiveFacilityId, selectedRegPatient?.id]);

  useEffect(() => {
    if (!selectedRegPatient?.id || !effectiveFacilityId) {
      setWorkspacePatient(null);
      setWorkspaceInsurance([]);
      setWorkspaceError(null);
      return;
    }
    void loadWorkspaceDetails(selectedRegPatient.id);
  }, [selectedRegPatient?.id, effectiveFacilityId, loadWorkspaceDetails]);

  useEffect(() => {
    const onProfileUpdated = (ev: Event) => {
      const pid = (ev as CustomEvent<{ patientId?: string }>).detail?.patientId;
      if (pid && selectedRegPatient?.id === pid) void loadWorkspaceDetails(pid);
    };
    window.addEventListener(MEDORA_PATIENT_PROFILE_UPDATED, onProfileUpdated);
    return () => window.removeEventListener(MEDORA_PATIENT_PROFILE_UPDATED, onProfileUpdated);
  }, [selectedRegPatient?.id, loadWorkspaceDetails]);

  const loadFollowUps = useCallback(async () => {
    if (!facilityId) return;
    setFollowUpsLoading(true);
    try {
      const from = new Date().toISOString().slice(0, 10);
      const to = new Date();
      to.setDate(to.getDate() + 14);
      const res = await fetchUpcomingFollowUps(facilityId, { from, to: to.toISOString().slice(0, 10), limit: 20 });
      setFollowUps(res.items ?? []);
    } catch {
      setFollowUps([]);
    } finally {
      setFollowUpsLoading(false);
    }
  }, [facilityId]);

  useEffect(() => {
    loadFollowUps();
  }, [loadFollowUps]);

  const clearPatientSelection = () => {
    setSelectedRegPatient(null);
    setWorkspacePatient(null);
    setWorkspaceInsurance([]);
    setWorkspaceError(null);
    router.replace("/app/registration");
  };

  const primaryRow = workspaceInsurance?.find((r) => r.rank === "PRIMARY");
  const secondaryRow = workspaceInsurance?.find((r) => r.rank === "SECONDARY");
  const primaryOk = insuranceRowHasContent(primaryRow);
  const secondaryOk = insuranceRowHasContent(secondaryRow);

  const canOpenChart =
    selectedRegPatient &&
    rolesReady &&
    isAppPathAllowedForRoles(`/app/patients/${selectedRegPatient.id}`, roles);

  /** GET/PATCH patient — aligné API (pas seulement le préfixe route `/app/patients/`). */
  const canOpenPatientProfile =
    selectedRegPatient &&
    rolesReady &&
    (roles.includes("FRONT_DESK") ||
      roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN")) &&
    isAppPathAllowedForRoles(`/app/patients/${selectedRegPatient.id}/profile`, roles);

  const canEditInsurance =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("FRONT_DESK") ||
      roles.includes("BILLING"));

  const cardBase: React.CSSProperties = {
    padding: "18px 18px 18px 16px",
    borderRadius: 12,
    border: "1px solid rgba(0,0,0,0.08)",
    textDecoration: "none",
    color: "#1a1a1a",
    display: "flex",
    flexDirection: "column",
    gap: 6,
    boxShadow: "0 2px 8px rgba(21,101,192,0.08)",
    minHeight: 96,
  };

  const stepStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 10,
    fontSize: 13,
    color: "#334155",
    lineHeight: 1.45,
  };

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>{t("registrationHome.title")}</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>{t("registrationHome.tagline")}</p>

      {effectiveFacilityId && rolesReady && (
        <section style={{ marginBottom: 28, maxWidth: 920 }}>
          <h2 style={{ margin: "0 0 6px 0", fontSize: 20, color: "#0f172a" }}>{t("registrationWorkspace.title")}</h2>
          <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#475569", maxWidth: 720, lineHeight: 1.5 }}>
            {t("registrationWorkspace.subtitle")}
          </p>
          <div
            style={{
              padding: "18px 20px",
              borderRadius: 12,
              border: MEDORA_CARD_SHELL.border,
              backgroundColor: MEDORA_CARD_SHELL.background,
              boxShadow: MEDORA_CARD_SHELL.boxShadow,
            }}
          >
            <h3 style={{ margin: "0 0 12px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
              {t("registrationWorkspace.searchHeading")}
            </h3>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12, alignItems: "center" }}>
              <input
                type="search"
                value={regSearchQ}
                onChange={(e) => setRegSearchQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void runRegistrationPatientSearch();
                  }
                }}
                placeholder={t("registrationHome.patientChartToolsSearchPlaceholder")}
                style={{
                  flex: "1 1 200px",
                  minWidth: 180,
                  padding: "10px 12px",
                  border: "1px solid #e2e8f0",
                  borderRadius: 8,
                  fontSize: 14,
                }}
              />
              <button
                type="button"
                onClick={() => void runRegistrationPatientSearch()}
                disabled={regSearchLoading || regSearchQ.trim().length < 2}
                style={{
                  padding: "10px 18px",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "#1565c0",
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: regSearchLoading || regSearchQ.trim().length < 2 ? "not-allowed" : "pointer",
                  opacity: regSearchLoading || regSearchQ.trim().length < 2 ? 0.65 : 1,
                }}
              >
                {regSearchLoading ? t("registrationHome.patientChartToolsSearching") : t("registrationHome.patientChartToolsSearch")}
              </button>
              <Link
                href="/app/patients?new=1"
                style={{
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid #cbd5e1",
                  backgroundColor: "#fff",
                  color: "#0f172a",
                  fontWeight: 600,
                  fontSize: 14,
                  textDecoration: "none",
                }}
              >
                {t("registrationWorkspace.newPatientCta")}
              </Link>
            </div>
            <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#64748b" }}>{t("registrationHome.patientChartToolsSelectHint")}</p>
            {regSearchError && (
              <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#b91c1c" }} role="alert">
                {regSearchError}
              </p>
            )}
            {regSearchResults.length > 0 && (
              <ul style={{ margin: "0 0 14px 0", paddingLeft: 18, fontSize: 14 }}>
                {regSearchResults.map((p) => (
                  <li key={p.id} style={{ marginBottom: 6 }}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedRegPatient(p);
                        router.replace(`/app/registration?patient=${p.id}`);
                      }}
                      style={{
                        background: selectedRegPatient?.id === p.id ? "#e3f2fd" : "transparent",
                        border: "1px solid #e2e8f0",
                        borderRadius: 8,
                        padding: "6px 10px",
                        cursor: "pointer",
                        fontSize: 14,
                        textAlign: "left",
                      }}
                    >
                      <strong>
                        {p.firstName} {p.lastName}
                      </strong>
                      {p.phone ? ` · ${p.phone}` : ""}
                      {p.mrn ? ` · ${p.mrn}` : ""}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {regSearchQ.trim().length >= 2 && !regSearchLoading && regSearchResults.length === 0 ? (
              <p style={{ fontSize: 13, color: "#64748b" }}>{t("registrationHome.patientChartToolsNoResults")}</p>
            ) : null}

            {selectedRegPatient && canOpenChart ? (
              <div
                style={{
                  marginTop: 16,
                  paddingTop: 16,
                  borderTop: "1px solid #e2e8f0",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 8, marginBottom: 12 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: "#0f172a" }}>{t("registrationWorkspace.workspaceHeading")}</div>
                  <button
                    type="button"
                    onClick={clearPatientSelection}
                    style={{
                      padding: "6px 10px",
                      fontSize: 13,
                      border: "none",
                      background: "transparent",
                      color: "#64748b",
                      cursor: "pointer",
                      textDecoration: "underline",
                    }}
                  >
                    {t("registrationWorkspace.clearPatient")}
                  </button>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <div style={stepStyle}>
                    <span style={{ fontWeight: 700, color: "#1565c0" }}>{t("registrationWorkspace.stepSelect")}</span>
                  </div>
                  <div style={stepStyle}>
                    <span style={{ fontWeight: 700, color: "#1565c0" }}>{t("registrationWorkspace.stepInsurance")}</span>
                  </div>
                  <div style={stepStyle}>
                    <span style={{ fontWeight: 700, color: "#1565c0" }}>{t("registrationWorkspace.stepFacesheet")}</span>
                  </div>
                  <div style={stepStyle}>
                    <span style={{ fontWeight: 700, color: "#1565c0" }}>{t("registrationWorkspace.stepVisit")}</span>
                  </div>
                </div>

                {workspaceLoading && (
                  <p style={{ fontSize: 14, color: "#64748b" }}>{t("registrationWorkspace.loadingPatient")}</p>
                )}
                {workspaceError && (
                  <p style={{ fontSize: 13, color: "#b91c1c", marginBottom: 12 }} role="alert">
                    {workspaceError}
                  </p>
                )}

                {!workspaceLoading && workspacePatient && (
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                      gap: 14,
                      marginBottom: 16,
                    }}
                  >
                    <div style={{ padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {t("registrationWorkspace.identityHeading")}
                      </div>
                      <div style={{ fontSize: 15, fontWeight: 700, marginTop: 6, color: "#0f172a" }}>
                        {workspacePatient.firstName} {workspacePatient.lastName}
                      </div>
                      <div style={{ fontSize: 13, color: "#475569", marginTop: 4 }}>
                        {t("registrationWorkspace.dobShort")}: {formatDate(workspacePatient.dob ?? null)}
                      </div>
                      <div style={{ fontSize: 13, color: "#475569" }}>
                        {t("registrationWorkspace.mrnShort")}: {workspacePatient.mrn ?? t("common.dash")}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {t("registrationWorkspace.contactHeading")}
                      </div>
                      <div style={{ fontSize: 13, color: "#334155", marginTop: 6, lineHeight: 1.45 }}>
                        {workspacePatient.phone ?? t("common.dash")}
                        {workspacePatient.email ? (
                          <>
                            <br />
                            {workspacePatient.email}
                          </>
                        ) : null}
                      </div>
                      <div style={{ fontSize: 13, color: "#334155", marginTop: 6, lineHeight: 1.45 }}>
                        {[workspacePatient.addressLine1, workspacePatient.city, workspacePatient.stateProvince, workspacePatient.postalCode]
                          .filter(Boolean)
                          .join(", ") || t("registrationWorkspace.noAddress")}
                      </div>
                    </div>
                    <div style={{ padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff" }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                        {t("registrationWorkspace.insuranceStatusHeading")}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 8, color: primaryOk ? "#1b5e20" : "#b45309" }}>
                        <strong>{t("registrationWorkspace.primaryLabel")}</strong>{" "}
                        {primaryOk && primaryRow
                          ? `${t("registrationWorkspace.statusOnFile")} (${payerDisplayName(primaryRow)})`
                          : t("registrationWorkspace.statusMissing")}
                      </div>
                      <div style={{ fontSize: 13, marginTop: 6, color: secondaryOk ? "#1b5e20" : "#64748b" }}>
                        <strong>{t("registrationWorkspace.secondaryLabel")}</strong>{" "}
                        {secondaryOk && secondaryRow
                          ? `${t("registrationWorkspace.statusOnFile")} (${payerDisplayName(secondaryRow)})`
                          : t("registrationWorkspace.statusMissing")}
                      </div>
                      <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>{t("registrationWorkspace.insuranceSummaryHint")}</div>
                    </div>
                    {workspaceOpenEncounter ? (
                      <div style={{ padding: 12, borderRadius: 8, border: "1px solid #e2e8f0", background: "#fff" }}>
                        <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          {t("registrationWorkspace.openEncounterBillingLabel")}
                        </div>
                        <div style={{ marginTop: 8 }}>
                          <BillingClassificationBadgeReadOnly classification={workspaceOpenEncounter.billingClassification} />
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {!workspaceLoading && workspacePatient && effectiveFacilityId && canOpenChart && (
                  <div
                    style={{
                      marginTop: 20,
                      paddingTop: 18,
                      borderTop: "1px solid #e2e8f0",
                    }}
                  >
                    <h3 id="registration-insurance-section" style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: "#0f172a", scrollMarginTop: 16 }}>
                      {t("registrationWorkspace.inlineInsuranceHeading")}
                    </h3>
                    <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#475569", lineHeight: 1.45, maxWidth: 720 }}>
                      {t("registrationWorkspace.inlineInsuranceIntro")}
                    </p>
                    <PatientPrimaryInsurancePanel
                      patientId={selectedRegPatient.id}
                      facilityId={effectiveFacilityId}
                      canEdit={canEditInsurance}
                      syncVersion={insuranceSyncVersion}
                      onSaved={() => {
                        bumpInsurancePanels();
                        void loadWorkspaceDetails(selectedRegPatient.id);
                      }}
                    />
                    <PatientSecondaryInsurancePanel
                      patientId={selectedRegPatient.id}
                      facilityId={effectiveFacilityId}
                      canEdit={canEditInsurance}
                      syncVersion={insuranceSyncVersion}
                      onSaved={() => {
                        bumpInsurancePanels();
                        void loadWorkspaceDetails(selectedRegPatient.id);
                      }}
                    />
                  </div>
                )}

                {!workspaceLoading && workspacePatient && effectiveFacilityId && (
                  <div style={{ marginTop: 20, paddingTop: 18, borderTop: "1px solid #e2e8f0" }}>
                    <h3 id="registration-document-center-section" style={{ margin: "0 0 6px 0", fontSize: 16, fontWeight: 800, color: "#0f172a", scrollMarginTop: 16 }}>
                      {t("documentCenter.title")}
                    </h3>
                    <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#475569", lineHeight: 1.45, maxWidth: 720 }}>
                      {t("documentCenter.subtitle")}
                    </p>
                    <RegistrationDocumentCenter
                      patientId={selectedRegPatient.id}
                      facilityId={effectiveFacilityId}
                      canEdit={canEditInsurance}
                    />
                  </div>
                )}

                {!workspaceLoading && (
                  <>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                      {canOpenPatientProfile && (
                        <Link
                          href={`/app/patients/${selectedRegPatient.id}/profile`}
                          style={{
                            padding: "10px 16px",
                            backgroundColor: "#fff",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            borderRadius: 8,
                            textDecoration: "none",
                            fontSize: 14,
                            fontWeight: 600,
                          }}
                        >
                          {t("patientProfile.linkViewProfile")}
                        </Link>
                      )}
                      <Link
                        href={`/app/patients/${selectedRegPatient.id}/facesheet`}
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#fff",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {t("registrationWorkspace.actionOpenFacesheet")}
                      </Link>
                      <Link
                        href={`/app/patients/${selectedRegPatient.id}`}
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#0f172a",
                          color: "#fff",
                          borderRadius: 8,
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {t("registrationWorkspace.actionOpenChart")}
                      </Link>
                      <Link
                        href="/app/encounters"
                        style={{
                          padding: "10px 16px",
                          backgroundColor: "#fff",
                          color: "#0f172a",
                          border: "1px solid #cbd5e1",
                          borderRadius: 8,
                          textDecoration: "none",
                          fontSize: 14,
                          fontWeight: 600,
                        }}
                      >
                        {t("registrationWorkspace.actionEncounters")}
                      </Link>
                    </div>
                    <p style={{ margin: "12px 0 0 0", fontSize: 12, color: "#64748b" }}>{t("registrationWorkspace.encounterGuidance")}</p>
                  </>
                )}
              </div>
            ) : selectedRegPatient ? (
              <p style={{ fontSize: 13, color: "#b45309", marginTop: 12 }}>{t("registrationHome.noPatientChartAccess")}</p>
            ) : null}
          </div>
        </section>
      )}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ margin: "0 0 14px 0", fontSize: 17, color: "#37474f" }}>{t("registrationHome.quickActions")}</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
            gap: 14,
            maxWidth: 900,
          }}
        >
          <Link
            href="/app/patients?new=1"
            style={{
              ...cardBase,
              borderLeft: "4px solid #1565c0",
              background: "linear-gradient(145deg, #e3f2fd 0%, #fff 55%)",
            }}
          >
            <strong style={{ fontSize: 15 }}>{t("registrationHome.cardNewPatientTitle")}</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>{t("registrationHome.cardNewPatientHint")}</span>
          </Link>
          <Link
            href="/app/encounters"
            style={{
              ...cardBase,
              borderLeft: "4px solid #2e7d32",
              background: "linear-gradient(145deg, #e8f5e9 0%, #fff 55%)",
            }}
          >
            <strong style={{ fontSize: 15 }}>{t("registrationHome.cardNewVisitTitle")}</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>{t("registrationHome.cardNewVisitHint")}</span>
          </Link>
          <Link
            href="/app/billing"
            style={{
              ...cardBase,
              borderLeft: "4px solid #ef6c00",
              background: "linear-gradient(145deg, #fff3e0 0%, #fff 55%)",
            }}
          >
            <strong style={{ fontSize: 15 }}>{t("nav.billing")}</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>{t("registrationHome.cardBillingHint")}</span>
          </Link>
          <button
            type="button"
            onClick={() => {
              if (selectedRegPatient) {
                const el = document.getElementById("registration-insurance-section");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                const el = document.querySelector<HTMLInputElement>('input[type="search"]');
                el?.focus();
              }
            }}
            style={{
              ...cardBase,
              borderLeft: "4px solid #0277bd",
              background: "linear-gradient(145deg, #e1f5fe 0%, #fff 55%)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <strong style={{ fontSize: 15 }}>{t("registrationHome.cardInsuranceTitle")}</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>{t("registrationHome.cardInsuranceHint")}</span>
          </button>
          <button
            type="button"
            onClick={() => {
              if (selectedRegPatient) {
                const el = document.getElementById("registration-document-center-section");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              } else {
                const el = document.querySelector<HTMLInputElement>('input[type="search"]');
                el?.focus();
              }
            }}
            style={{
              ...cardBase,
              borderLeft: "4px solid #6a1b9a",
              background: "linear-gradient(145deg, #f3e5f5 0%, #fff 55%)",
              cursor: "pointer",
              textAlign: "left",
            }}
          >
            <strong style={{ fontSize: 15 }}>{t("registrationHome.cardDocumentCenterTitle")}</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>{t("registrationHome.cardDocumentCenterHint")}</span>
          </button>
        </div>
      </section>

      <div style={{ display: "grid", gap: 24, maxWidth: 720 }}>
        <section style={{ padding: 20, backgroundColor: "white", borderRadius: 8, border: "1px solid #ddd" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>{t("registrationHome.patientsEncountersSection")}</h2>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
            <Link
              href="/app/patients"
              style={{
                padding: "10px 20px",
                backgroundColor: "#1a1a1a",
                color: "white",
                borderRadius: 4,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
              }}
            >
              {t("common.searchPatient")}
            </Link>
          </div>
        </section>

        <section style={{ padding: 20, backgroundColor: "white", borderRadius: 8, border: "1px solid #ddd" }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>{t("registrationHome.upcomingFollowUps")}</h2>
          <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#333" }}>{t("registrationHome.upcomingFollowUpsIntro")}</p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <Link
              href="/app/follow-ups"
              style={{
                padding: "10px 20px",
                backgroundColor: "#1a1a1a",
                color: "white",
                borderRadius: 4,
                textDecoration: "none",
                fontSize: 14,
                fontWeight: 500,
                display: "inline-block",
              }}
            >
              {t("registrationHome.openFollowUps")}
            </Link>
            {facilityId && (
              <button
                type="button"
                onClick={() => setShowAddFollowUp(true)}
                style={{
                  padding: "10px 20px",
                  backgroundColor: "#fff",
                  color: "#1a1a1a",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  fontSize: 14,
                  fontWeight: 500,
                  cursor: "pointer",
                }}
              >
                {t("followUpsPage.addFollowUp")}
              </button>
            )}
          </div>
          {isOffline && (
            <p style={{ margin: "-6px 0 12px 0", fontSize: 12, color: "#8a4b08" }}>
              {t("followUpsPage.offlineCacheNote").replace(/\.$/, "")}
            </p>
          )}
          {followUpsLoading ? (
            <p style={{ fontSize: 14, color: "#666" }}>{t("common.loading")}</p>
          ) : followUps.length === 0 ? (
            <p style={{ fontSize: 14, color: "#666" }}>{t("followUpsPage.noUpcoming14Days")}</p>
          ) : (
            <ul style={{ margin: 0, paddingLeft: 20, fontSize: 14 }}>
              {followUps.slice(0, 10).map((f) => (
                <li key={f.id} style={{ marginBottom: 6 }}>
                  <Link href={`/app/patients/${f.patientId}`} style={{ color: "#1a1a1a", fontWeight: 600 }}>
                    {f.patient?.firstName ?? ""} {f.patient?.lastName ?? ""}
                  </Link>
                  {" — "}
                  {formatDate(f.dueDate)}
                  {f.reason ? ` · ${f.reason}` : ""}
                  <Link href={`/app/patients/${f.patientId}`} style={{ marginLeft: 8, fontSize: 12 }}>
                    {t("registrationHome.viewChart")}
                  </Link>
                </li>
              ))}
              {followUps.length > 10 && (
                <li style={{ marginTop: 8 }}>
                  <Link href="/app/follow-ups">
                    {t("registrationHome.viewAllPrefix")} ({followUps.length})
                  </Link>
                </li>
              )}
            </ul>
          )}
        </section>
      </div>
      {showAddFollowUp && facilityId && (
        <CreateFollowUpModal
          facilityId={facilityId}
          onClose={() => setShowAddFollowUp(false)}
          onSuccess={() => {
            setShowAddFollowUp(false);
            void loadFollowUps();
          }}
        />
      )}
    </div>
  );
}

function RegistrationPageFallback() {
  const { t } = useI18n();
  return (
    <div style={{ padding: 24, color: "#64748b" }}>
      {t("common.loading")}
    </div>
  );
}

export default function RegistrationPage() {
  return (
    <Suspense fallback={<RegistrationPageFallback />}>
      <RegistrationPageInner />
    </Suspense>
  );
}
