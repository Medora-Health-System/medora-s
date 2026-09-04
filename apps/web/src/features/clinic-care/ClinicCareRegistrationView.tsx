"use client";

import React, { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import type { PatientSearchHitV1 } from "@medora/shared";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { productUiBcp47Tag } from "@/i18n/config";
import { PatientSearchAndSelect } from "@/components/patients/PatientSearchAndSelect";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";

type AppointmentRow = {
  id: string;
  status: string;
  scheduledStartAt: string;
  arrivedAt: string | null;
  checkedInAt: string | null;
  encounterId: string | null;
  reason: string | null;
  patientName: string | null;
  mrn: string | null;
  patientId: string;
};

type Completeness = {
  overallStatus: string;
  sections: Array<{ id: string; status: string; missingKeys: string[]; critical: boolean }>;
  blocksClinicalCare: boolean;
};

/**
 * MEDUI.D4C.3 — Clinic Care registration / appointment / walk-in orchestration UI.
 * Reuses enterprise Patient search + Appointment / walk-in APIs (no ClinicPatient fork).
 */
export function ClinicCareRegistrationView() {
  const { t, language } = useI18n();
  const locale = productUiBcp47Tag(language);
  const { facilityId, roles } = useFacilityAndRoles();
  const canRegister = roles.some((r) => r === "FRONT_DESK" || r === "ADMIN");
  const [patient, setPatient] = useState<PatientSearchHitV1 | null>(null);
  const [tab, setTab] = useState<"walkIn" | "appointments" | "followUp">("walkIn");
  const [visitReason, setVisitReason] = useState("");
  const [encounterType, setEncounterType] = useState<"OUTPATIENT" | "URGENT_CARE">("OUTPATIENT");
  const [scheduledStart, setScheduledStart] = useState("");
  const [apptReason, setApptReason] = useState("");
  const [appointments, setAppointments] = useState<AppointmentRow[]>([]);
  const [completeness, setCompleteness] = useState<Completeness | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadAppointments = useCallback(async () => {
    if (!facilityId) return;
    try {
      const rows = (await apiFetch("/appointments/today", { facilityId })) as AppointmentRow[];
      setAppointments(Array.isArray(rows) ? rows : []);
    } catch {
      setError(t("clinicCareD4c3.errors.loadFailed"));
    }
  }, [facilityId, t]);

  const loadCompleteness = useCallback(
    async (patientId: string) => {
      try {
        const proj = (await apiFetch(
          `/registration/patients/${encodeURIComponent(patientId)}/completeness`,
          { facilityId: facilityId ?? undefined }
        )) as Completeness;
        setCompleteness(proj);
      } catch {
        setCompleteness(null);
      }
    },
    [facilityId]
  );

  useEffect(() => {
    void loadAppointments();
  }, [loadAppointments]);

  useEffect(() => {
    if (patient?.id) void loadCompleteness(patient.id);
    else setCompleteness(null);
  }, [patient?.id, loadCompleteness]);

  const onSelectPatient = (p: PatientSearchHitV1) => {
    setPatient(p);
    setMessage(null);
    setError(null);
  };

  const runWalkIn = async () => {
    if (!patient?.id) {
      setError(t("clinicCareD4c3.errors.selectPatient"));
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/registration/walk-in", {
        method: "POST",
        facilityId: facilityId ?? undefined,
        body: JSON.stringify({
          patientId: patient.id,
          encounterType,
          visitReason: visitReason.trim() || undefined,
        }),
      });
      setMessage(t("clinicCareD4c3.walkInSuccess"));
      void loadCompleteness(patient.id);
    } catch (e: any) {
      const code = e?.body?.code || e?.body?.message;
      if (code === "OPEN_ENCOUNTER_EXISTS" || String(e?.message || "").includes("open encounter")) {
        setError(t("clinicCareD4c3.openConflict"));
      } else {
        setError(e?.body?.message || e?.message || t("clinicCareD4c3.errors.actionFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const createAppointment = async (isFollowUp: boolean) => {
    if (!patient?.id) {
      setError(t("clinicCareD4c3.errors.selectPatient"));
      return;
    }
    if (!scheduledStart) {
      setError(t("clinicCareD4c3.errors.needStart"));
      return;
    }
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      await apiFetch("/appointments", {
        method: "POST",
        facilityId: facilityId ?? undefined,
        body: JSON.stringify({
          patientId: patient.id,
          scheduledStartAt: new Date(scheduledStart).toISOString(),
          reason: apptReason.trim() || undefined,
          isFollowUp,
          encounterType,
        }),
      });
      setMessage(t("clinicCareD4c3.appointmentCreated"));
      setScheduledStart("");
      setApptReason("");
      void loadAppointments();
    } catch (e: any) {
      setError(e?.body?.message || e?.message || t("clinicCareD4c3.errors.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  const markArrived = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/appointments/${encodeURIComponent(id)}/arrive`, {
        method: "POST",
        facilityId: facilityId ?? undefined,
        body: "{}",
      });
      setMessage(t("clinicCareD4c3.arrived"));
      void loadAppointments();
    } catch (e: any) {
      setError(e?.body?.message || e?.message || t("clinicCareD4c3.errors.actionFailed"));
    } finally {
      setBusy(false);
    }
  };

  const checkIn = async (id: string) => {
    setBusy(true);
    setError(null);
    try {
      await apiFetch(`/appointments/${encodeURIComponent(id)}/check-in`, {
        method: "POST",
        facilityId: facilityId ?? undefined,
        body: JSON.stringify({ encounterType }),
      });
      setMessage(t("clinicCareD4c3.checkedIn"));
      void loadAppointments();
    } catch (e: any) {
      if (e?.body?.code === "OPEN_ENCOUNTER_EXISTS") {
        setError(t("clinicCareD4c3.openConflict"));
      } else {
        setError(e?.body?.message || e?.message || t("clinicCareD4c3.errors.actionFailed"));
      }
    } finally {
      setBusy(false);
    }
  };

  const fmt = (iso: string | null | undefined) => {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleString(locale, {
        hour: "2-digit",
        minute: "2-digit",
        month: "short",
        day: "numeric",
      });
    } catch {
      return iso;
    }
  };

  const completenessLabel = (status: string) => {
    switch (status) {
      case "COMPLETE":
        return t("clinicCareD4c3.completenessComplete");
      case "INCOMPLETE":
        return t("clinicCareD4c3.completenessIncomplete");
      case "NEEDS_REVIEW":
        return t("clinicCareD4c3.completenessNeedsReview");
      case "NOT_REQUIRED":
        return t("clinicCareD4c3.completenessNotRequired");
      default:
        return status;
    }
  };

  return (
    <div style={{ padding: "16px 20px 32px", maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 16 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, color: "#0f172a" }}>{t("clinicCareD4c3.title")}</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>{t("clinicCareD4c3.subtitle")}</p>
        </div>
        <Link href="/app/clinic-care" style={{ alignSelf: "flex-start", fontSize: 13, color: "#2563eb" }}>
          {t("clinicCareD4c3.backToTrackboard")}
        </Link>
      </div>

      <section style={{ ...MEDORA_CARD_SHELL, padding: 16, marginBottom: 16 }}>
        <h2 style={{ margin: "0 0 10px", fontSize: 15 }}>{t("clinicCareD4c3.tabs.search")}</h2>
        <PatientSearchAndSelect
          facilityId={facilityId}
          autoSearch
          selectedPatientId={patient?.id ?? null}
          onSelect={onSelectPatient}
          onClearSelection={() => setPatient(null)}
          showSearchButton
        />
        {patient ? (
          <div style={{ marginTop: 12, fontSize: 13 }}>
            <strong>{t("clinicCareD4c3.selectedPatient")}:</strong>{" "}
            {patient.firstName} {patient.lastName}
            {patient.mrn ? ` · ${patient.mrn}` : ""}
            <button
              type="button"
              onClick={() => setPatient(null)}
              style={{ marginLeft: 12, fontSize: 12 }}
            >
              {t("clinicCareD4c3.clearPatient")}
            </button>
            <div style={{ marginTop: 8, display: "flex", gap: 12, flexWrap: "wrap" }}>
              <Link href="/app/registration" style={{ fontSize: 12, color: "#2563eb" }}>
                {t("clinicCareD4c3.enterpriseRegistrationLink")}
              </Link>
              <Link
                href={`/app/registration?patientId=${encodeURIComponent(patient.id)}`}
                style={{ fontSize: 12, color: "#2563eb" }}
              >
                {t("clinicCareD4c3.insuranceLink")}
              </Link>
            </div>
          </div>
        ) : null}
        {completeness ? (
          <div style={{ marginTop: 12, fontSize: 12, color: "#475569" }}>
            <strong>{t("clinicCareD4c3.completenessTitle")}:</strong>{" "}
            {completenessLabel(completeness.overallStatus)}
          </div>
        ) : null}
      </section>

      <div style={{ display: "flex", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
        {(["walkIn", "appointments", "followUp"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            style={{
              padding: "6px 12px",
              borderRadius: 999,
              border: `1px solid ${tab === id ? "#2563eb" : "#e2e8f0"}`,
              background: tab === id ? "#eff6ff" : "#fff",
              fontWeight: 600,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            {t(`clinicCareD4c3.tabs.${id}`)}
          </button>
        ))}
      </div>

      {message ? (
        <p style={{ color: "#166534", background: "#f0fdf4", padding: 10, borderRadius: 10, fontSize: 13 }}>
          {message}
        </p>
      ) : null}
      {error ? (
        <p style={{ color: "#991b1b", background: "#fef2f2", padding: 10, borderRadius: 10, fontSize: 13 }}>
          {error}
        </p>
      ) : null}

      {tab === "walkIn" && canRegister ? (
        <section style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
          <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
            {t("clinicCareD4c3.encounterType")}
            <select
              value={encounterType}
              onChange={(e) => setEncounterType(e.target.value as "OUTPATIENT" | "URGENT_CARE")}
              style={{ display: "block", marginTop: 4, width: "100%", maxWidth: 320, padding: 8 }}
            >
              <option value="OUTPATIENT">{t("clinicCareD4c3.outpatient")}</option>
              <option value="URGENT_CARE">{t("clinicCareD4c3.urgentCare")}</option>
            </select>
          </label>
          <label style={{ display: "block", fontSize: 13, marginBottom: 12 }}>
            {t("clinicCareD4c3.visitReason")}
            <input
              value={visitReason}
              onChange={(e) => setVisitReason(e.target.value)}
              style={{ display: "block", marginTop: 4, width: "100%", maxWidth: 480, padding: 8 }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !patient}
            onClick={() => void runWalkIn()}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              fontWeight: 650,
              cursor: busy ? "wait" : "pointer",
            }}
          >
            {t("clinicCareD4c3.startWalkIn")}
          </button>
        </section>
      ) : null}

      {tab === "appointments" ? (
        <section style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
          {canRegister ? (
            <div style={{ marginBottom: 16, paddingBottom: 12, borderBottom: "1px solid #e2e8f0" }}>
              <h3 style={{ margin: "0 0 8px", fontSize: 14 }}>{t("clinicCareD4c3.scheduleAppointment")}</h3>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                {t("clinicCareD4c3.scheduledStart")}
                <input
                  type="datetime-local"
                  value={scheduledStart}
                  onChange={(e) => setScheduledStart(e.target.value)}
                  style={{ display: "block", marginTop: 4, padding: 8 }}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
                {t("clinicCareD4c3.appointmentReason")}
                <input
                  value={apptReason}
                  onChange={(e) => setApptReason(e.target.value)}
                  style={{ display: "block", marginTop: 4, width: "100%", maxWidth: 480, padding: 8 }}
                />
              </label>
              <button
                type="button"
                disabled={busy || !patient}
                onClick={() => void createAppointment(false)}
                style={{
                  padding: "8px 14px",
                  borderRadius: 10,
                  border: "none",
                  background: "#0f766e",
                  color: "#fff",
                  fontWeight: 650,
                }}
              >
                {t("clinicCareD4c3.createAppointment")}
              </button>
            </div>
          ) : null}
          {appointments.length === 0 ? (
            <p style={{ margin: 0, color: "#64748b", fontSize: 13 }}>{t("clinicCareD4c3.noAppointments")}</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {appointments.map((a) => (
                <li
                  key={a.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 12,
                    padding: "10px 0",
                    borderBottom: "1px solid #f1f5f9",
                    fontSize: 13,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 650 }}>{a.patientName || a.patientId}</div>
                    <div style={{ color: "#64748b" }}>
                      {fmt(a.scheduledStartAt)} · {a.status}
                      {a.arrivedAt ? ` · arr. ${fmt(a.arrivedAt)}` : ""}
                      {a.checkedInAt ? ` · in ${fmt(a.checkedInAt)}` : ""}
                    </div>
                  </div>
                  {canRegister && !a.encounterId ? (
                    <div style={{ display: "flex", gap: 6 }}>
                      {a.status === "SCHEDULED" || a.status === "CONFIRMED" ? (
                        <button type="button" disabled={busy} onClick={() => void markArrived(a.id)}>
                          {t("clinicCareD4c3.markArrived")}
                        </button>
                      ) : null}
                      <button type="button" disabled={busy} onClick={() => void checkIn(a.id)}>
                        {t("clinicCareD4c3.checkIn")}
                      </button>
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {tab === "followUp" && canRegister ? (
        <section style={{ ...MEDORA_CARD_SHELL, padding: 16 }}>
          <p style={{ fontSize: 13, color: "#64748b" }}>{t("clinicCareD4c3.followUpHint")}</p>
          <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
            {t("clinicCareD4c3.scheduledStart")}
            <input
              type="datetime-local"
              value={scheduledStart}
              onChange={(e) => setScheduledStart(e.target.value)}
              style={{ display: "block", marginTop: 4, padding: 8 }}
            />
          </label>
          <label style={{ display: "block", fontSize: 13, marginBottom: 8 }}>
            {t("clinicCareD4c3.appointmentReason")}
            <input
              value={apptReason}
              onChange={(e) => setApptReason(e.target.value)}
              style={{ display: "block", marginTop: 4, width: "100%", maxWidth: 480, padding: 8 }}
            />
          </label>
          <button
            type="button"
            disabled={busy || !patient}
            onClick={() => void createAppointment(true)}
            style={{
              padding: "8px 14px",
              borderRadius: 10,
              border: "none",
              background: "#7c3aed",
              color: "#fff",
              fontWeight: 650,
            }}
          >
            {t("clinicCareD4c3.createAppointment")}
          </button>
        </section>
      ) : null}
    </div>
  );
}
