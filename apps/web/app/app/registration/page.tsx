"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { fetchUpcomingFollowUps, type FollowUpRow } from "@/lib/followUpsApi";
import { CreateFollowUpModal } from "@/components/patient-chart";
import { encounterBcp47 } from "@/lib/encounterChromeI18n";
import { useI18n } from "@/lib/i18n";
import { useConnectivityStatus } from "@/lib/offline/useConnectivityStatus";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { isAppPathAllowedForRoles } from "@/lib/landingRoute";
import { MEDORA_CARD_SHELL } from "@/components/medora-card";

type RegPatientRow = {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  phone: string | null;
};

function registrationSearchList(data: unknown): RegPatientRow[] {
  if (Array.isArray(data)) return data as RegPatientRow[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: RegPatientRow[] }).items;
  }
  return [];
}

export default function RegistrationPage() {
  const { t, language } = useI18n();
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
    try {
      const raw = await apiFetch(`/patients/search?q=${encodeURIComponent(q)}`, {
        facilityId: effectiveFacilityId,
      });
      setRegSearchResults(registrationSearchList(raw).slice(0, 12));
    } catch {
      setRegSearchResults([]);
    } finally {
      setRegSearchLoading(false);
    }
  }, [effectiveFacilityId, regSearchQ]);

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

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>{t("registrationHome.title")}</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>{t("registrationHome.tagline")}</p>

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
          <Link
            href="/app/fracture"
            style={{
              ...cardBase,
              borderLeft: "4px solid #ad1457",
              background: "linear-gradient(145deg, #fce4ec 0%, #fff 55%)",
            }}
          >
            <strong style={{ fontSize: 15 }}>{t("nav.fracture")}</strong>
            <span style={{ fontSize: 13, color: "#546e7a" }}>{t("registrationHome.cardFractureHint")}</span>
          </Link>
        </div>
      </section>

      {effectiveFacilityId && rolesReady && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ margin: "0 0 10px 0", fontSize: 17, color: "#37474f" }}>
            {t("registrationHome.patientChartToolsSection")}
          </h2>
          <p style={{ margin: "0 0 14px 0", fontSize: 14, color: "#546e7a", maxWidth: 720 }}>
            {t("registrationHome.patientChartToolsIntro")}
          </p>
          <div
            style={{
              padding: "16px 18px",
              borderRadius: 12,
              border: MEDORA_CARD_SHELL.border,
              backgroundColor: MEDORA_CARD_SHELL.background,
              boxShadow: MEDORA_CARD_SHELL.boxShadow,
              maxWidth: 720,
            }}
          >
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
            </div>
            <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#64748b" }}>
              {t("registrationHome.patientChartToolsSelectHint")}
            </p>
            {regSearchResults.length > 0 && (
              <ul style={{ margin: "0 0 14px 0", paddingLeft: 18, fontSize: 14 }}>
                {regSearchResults.map((p) => (
                  <li key={p.id} style={{ marginBottom: 6 }}>
                    <button
                      type="button"
                      onClick={() => setSelectedRegPatient(p)}
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
            {selectedRegPatient &&
            isAppPathAllowedForRoles(`/app/patients/${selectedRegPatient.id}`, roles) ? (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
                <Link
                  href={`/app/patients/${selectedRegPatient.id}`}
                  style={{
                    padding: "10px 16px",
                    backgroundColor: "#1a1a1a",
                    color: "#fff",
                    borderRadius: 8,
                    textDecoration: "none",
                    fontSize: 14,
                    fontWeight: 600,
                  }}
                >
                  {t("registrationHome.openPatientChart")}
                </Link>
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
                  {t("registrationHome.openFaceSheet")}
                </Link>
                <Link
                  href={`/app/patients/${selectedRegPatient.id}`}
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
                  {t("registrationHome.openPrimaryInsurance")}
                </Link>
                <span style={{ fontSize: 12, color: "#64748b" }}>{t("registrationHome.startEncounterHint")}</span>
              </div>
            ) : selectedRegPatient ? (
              <p style={{ fontSize: 13, color: "#b45309" }}>{t("registrationHome.noPatientChartAccess")}</p>
            ) : null}
          </div>
        </section>
      )}

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
          <p style={{ margin: "0 0 16px 0", fontSize: 14, color: "#333" }}>
            {t("registrationHome.upcomingFollowUpsIntro")}
          </p>
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

