"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";
import { calculateAge } from "@/lib/patientDisplay";
import { encounterBcp47, tEncounterType } from "@/lib/encounterChromeI18n";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { getLandingRouteForRoles, isAppPathAllowedForRoles } from "@/lib/landingRoute";

type FacesheetPayload = {
  patient: Record<string, unknown> | null;
  primaryCoverage: Record<string, unknown> | null;
  activeEncounter: Record<string, unknown> | null;
};

function dash(v: unknown): string {
  if (v == null || v === "") return "—";
  return String(v);
}

export default function PatientFacesheetPage() {
  const params = useParams();
  const patientId = params.id as string;
  const { t, language } = useI18n();
  const locale = encounterBcp47(language);
  const { facilityId, roles, ready: rolesReady } = useFacilityAndRoles();
  const [data, setData] = useState<FacesheetPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const path = `/app/patients/${patientId}/facesheet`;
  const allowed = rolesReady && isAppPathAllowedForRoles(path, roles);

  const load = useCallback(async () => {
    if (!facilityId || !patientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = (await apiFetch(`/patients/${patientId}/facesheet`, { facilityId })) as FacesheetPayload;
      setData(res);
    } catch {
      setError(t("facesheet.loadError"));
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [facilityId, patientId, t]);

  useEffect(() => {
    if (!allowed) return;
    void load();
  }, [allowed, load]);

  if (rolesReady && !allowed) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("patientChartUi.patientNotFound")}</p>
        <Link href={getLandingRouteForRoles(roles)}>{t("facesheet.backToChart")}</Link>
      </div>
    );
  }

  const p = data?.patient;
  const cov = data?.primaryCoverage as Record<string, unknown> | null | undefined;
  const enc = data?.activeEncounter as Record<string, unknown> | null | undefined;
  const payer = cov?.payer as { name?: string } | null | undefined;

  const generated = new Date().toLocaleString(locale);

  return (
    <div style={{ maxWidth: 800, margin: "0 auto", padding: "16px 12px 32px" }}>
      <style
        dangerouslySetInnerHTML={{
          __html: `@media print { .no-print { display: none !important; } body { background: #fff !important; } }`,
        }}
      />
      <div className="no-print" style={{ marginBottom: 16, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <Link href={`/app/patients/${patientId}`} style={{ color: "#1a1a1a" }}>
          ← {t("facesheet.backToChart")}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          style={{
            padding: "8px 14px",
            background: "#1a1a1a",
            color: "#fff",
            border: "none",
            borderRadius: 4,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          {t("facesheet.print")}
        </button>
      </div>

      {loading && <div style={{ color: "#616161" }}>{t("common.loading")}</div>}
      {error && (
        <div style={{ padding: 12, background: "#ffebee", color: "#b71c1c", borderRadius: 4 }}>{error}</div>
      )}

      {!loading && !error && p && (
        <div id="facesheet-print-root" style={{ fontSize: 13, lineHeight: 1.45, color: "#111" }}>
          <h1 style={{ margin: "0 0 8px 0", fontSize: 20 }}>{t("facesheet.title")}</h1>
          <p style={{ margin: "0 0 20px 0", fontSize: 12, color: "#555" }}>
            {t("facesheet.generatedAt")} {generated}
          </p>

          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, margin: "0 0 8px 0", borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              {t("facesheet.demographics")}
            </h2>
            <div>
              <strong>
                {dash(p?.firstName)} {dash(p?.lastName)}
              </strong>
            </div>
            {p?.dob != null && String(p.dob) !== "" ? (
              <div>
                {t("facesheet.dob")} {new Date(String(p.dob)).toLocaleDateString(locale)}
                {(() => {
                  const age = calculateAge(String(p.dob));
                  return age != null && Number.isFinite(age) ? ` · ${age} ${t("encounterChrome.ageYearsSuffix")}` : "";
                })()}
              </div>
            ) : null}
          </section>

          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, margin: "0 0 8px 0", borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              {t("facesheet.contact")}
            </h2>
            <div>{t("patientsListPage.labelPhone")} {dash(p?.phone)}</div>
            <div>{t("patientsListPage.labelEmail")} {dash(p?.email)}</div>
            <div>{t("patientsListPage.labelAddressLine1")} {dash(p?.addressLine1)}</div>
            {p?.addressLine2 ? <div>{t("patientsListPage.labelAddressLine2")} {dash(p.addressLine2)}</div> : null}
            <div>
              {t("patientsListPage.labelCity")} {dash(p?.city)} · {t("patientsListPage.labelPostalCode")} {dash(p?.postalCode)} ·{" "}
              {t("patientsListPage.labelStateProvince")} {dash(p?.stateProvince)}
            </div>
            <div>{t("patientsListPage.labelCountry")} {dash(p?.country)}</div>
          </section>

          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, margin: "0 0 8px 0", borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              {t("facesheet.identifiers")}
            </h2>
            <div>{t("facesheet.mrn")} {dash(p?.mrn)}</div>
            <div>{t("facesheet.globalMrn")} {dash(p?.globalMrn)}</div>
            <div>{t("patientsListPage.labelNationalId")} {dash(p?.nationalId)}</div>
          </section>

          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, margin: "0 0 8px 0", borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              {t("facesheet.emergency")}
            </h2>
            <div>{t("patientsListPage.labelEmergencyName")} {dash(p?.emergencyContactName)}</div>
            <div>{t("patientsListPage.labelEmergencyRelationship")} {dash(p?.emergencyContactRelationship)}</div>
            <div>{t("patientsListPage.labelEmergencyPhone")} {dash(p?.emergencyContactPhone)}</div>
          </section>

          {p?.adminNotes ? (
            <section style={{ marginBottom: 18 }}>
              <h2 style={{ fontSize: 14, margin: "0 0 8px 0", borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
                {t("facesheet.adminNotes")}
              </h2>
              <div style={{ whiteSpace: "pre-wrap" }}>{String(p.adminNotes)}</div>
            </section>
          ) : null}

          <section style={{ marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, margin: "0 0 8px 0", borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              {t("facesheet.insurance")}
            </h2>
            {cov ? (
              <>
                <div>
                  {t("insurancePrimary.payerLabel")}{" "}
                  {payer?.name
                    ? payer.name
                    : dash(cov.payerNameFreeText)}
                </div>
                <div>{t("insurancePrimary.planName")} {dash(cov.planName)}</div>
                <div>{t("insurancePrimary.memberId")} {dash(cov.memberId)}</div>
                <div>{t("insurancePrimary.groupNumber")} {dash(cov.groupNumber)}</div>
                <div>{t("insurancePrimary.subscriberName")} {dash(cov.subscriberName)}</div>
                <div>{t("insurancePrimary.relationToSubscriber")} {dash(cov.relationToSubscriber)}</div>
                <div>{t("insurancePrimary.phone")} {dash(cov.phone)}</div>
                {cov.notes ? (
                  <div style={{ marginTop: 6, whiteSpace: "pre-wrap" }}>{String(cov.notes)}</div>
                ) : null}
              </>
            ) : (
              <div style={{ color: "#666" }}>{t("insurancePrimary.noneStored")}</div>
            )}
          </section>

          <section>
            <h2 style={{ fontSize: 14, margin: "0 0 8px 0", borderBottom: "1px solid #ccc", paddingBottom: 4 }}>
              {t("facesheet.activeEncounter")}
            </h2>
            {enc ? (
              <>
                <div>{tEncounterType(t, String(enc.type))} · {String(enc.status)}</div>
                <div>{t("facesheet.chiefComplaint")} {dash(enc.chiefComplaint)}</div>
                <div>{t("facesheet.room")} {dash(enc.roomLabel)}</div>
                {enc.triageAcuity != null ? (
                  <div>
                    {t("facesheet.acuity")} {String(enc.triageAcuity)}
                  </div>
                ) : null}
                <div style={{ fontSize: 12, color: "#555", marginTop: 4 }}>
                  {new Date(String(enc.createdAt)).toLocaleString(locale)}
                </div>
              </>
            ) : (
              <div style={{ color: "#666" }}>{t("facesheet.noActiveEncounter")}</div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
