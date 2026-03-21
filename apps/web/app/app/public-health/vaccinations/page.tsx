"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchVaccineCatalog,
  recordVaccination,
  fetchVaccinationsDueSoon,
  type VaccineCatalogItem,
  type VaccineAdministrationRow,
} from "@/lib/publicHealthApi";
import { Field, inputStyle } from "@/components/pharmacy/Modal";
import { ui } from "@/lib/uiLabels";
import { getEncounterStatusLabelFr, getEncounterTypeLabelFr } from "@/lib/uiLabels";

type Patient = { id: string; firstName: string; lastName: string; mrn: string | null };
type Encounter = { id: string; status: string; type: string; createdAt: string };

const btnPrimary: React.CSSProperties = {
  padding: "10px 20px",
  backgroundColor: "#1a1a1a",
  color: "white",
  border: "none",
  borderRadius: 4,
  cursor: "pointer",
  fontSize: 14,
};

const cardStyle: React.CSSProperties = {
  backgroundColor: "white",
  padding: 24,
  borderRadius: 4,
  marginBottom: 20,
  border: "1px solid #eee",
};

function formatDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString("fr-FR") : "—";
}

export default function PublicHealthVaccinationsPage() {
  const { facilityId, ready, canViewPublicHealth } = useFacilityAndRoles();

  const [catalog, setCatalog] = useState<VaccineCatalogItem[]>([]);
  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [encounters, setEncounters] = useState<Encounter[]>([]);
  const [encounterId, setEncounterId] = useState("");
  const [vaccineCatalogId, setVaccineCatalogId] = useState("");
  const [doseNumber, setDoseNumber] = useState("");
  const [lotNumber, setLotNumber] = useState("");
  const [administeredAt, setAdministeredAt] = useState(() =>
    new Date().toISOString().slice(0, 10)
  );
  const [nextDueAt, setNextDueAt] = useState("");
  const [notes, setNotes] = useState("");
  const [loadingPatients, setLoadingPatients] = useState(false);
  const [loadingEnc, setLoadingEnc] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [recentThisSession, setRecentThisSession] = useState<VaccineAdministrationRow[]>([]);
  const [dueSoon, setDueSoon] = useState<{
    items: VaccineAdministrationRow[];
    windowEnd?: string;
  }>({ items: [] });
  const [loadingDueSoon, setLoadingDueSoon] = useState(false);

  useEffect(() => {
    if (!facilityId || !canViewPublicHealth) return;
    fetchVaccineCatalog(facilityId)
      .then((list) => {
        setCatalog(list);
        if (list[0]) setVaccineCatalogId(list[0].id);
      })
      .catch(() => setCatalog([]));
  }, [facilityId, canViewPublicHealth]);

  useEffect(() => {
    if (!facilityId || !canViewPublicHealth) return;
    setLoadingDueSoon(true);
    fetchVaccinationsDueSoon(facilityId)
      .then((res) => setDueSoon({ items: res.items || [], windowEnd: res.windowEnd }))
      .catch(() => setDueSoon({ items: [] }))
      .finally(() => setLoadingDueSoon(false));
  }, [facilityId, canViewPublicHealth]);

  const searchPatients = async () => {
    if (!facilityId || !patientQuery.trim()) return;
    setLoadingPatients(true);
    try {
      const data = await apiFetch(
        `/patients/search?q=${encodeURIComponent(patientQuery.trim())}`,
        { facilityId }
      );
      setPatients(data || []);
    } catch {
      setPatients([]);
    } finally {
      setLoadingPatients(false);
    }
  };

  useEffect(() => {
    if (!facilityId || !patientId) {
      setEncounters([]);
      setEncounterId("");
      return;
    }
    setLoadingEnc(true);
    apiFetch(`/patients/${patientId}/encounters`, { facilityId })
      .then((data: any) => {
        const list = data || [];
        setEncounters(list);
        const open = list.find((e: Encounter) => e.status === "OPEN");
        setEncounterId(open?.id ?? list[0]?.id ?? "");
      })
      .catch(() => {
        setEncounters([]);
        setEncounterId("");
      })
      .finally(() => setLoadingEnc(false));
  }, [facilityId, patientId]);

  const handleSubmit = async () => {
    if (!facilityId || !patientId || !vaccineCatalogId) return;
    setMessage(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        patientId,
        vaccineCatalogId,
        administeredAt: administeredAt ? `${administeredAt}T12:00:00.000Z` : undefined,
        doseNumber: doseNumber ? parseInt(doseNumber, 10) : undefined,
        lotNumber: lotNumber.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (encounterId) body.encounterId = encounterId;
      if (nextDueAt) body.nextDueAt = `${nextDueAt}T12:00:00.000Z`;
      const row = await recordVaccination(facilityId, body);
      setMessage({ type: "ok", text: "Vaccination enregistrée." });
      setRecentThisSession((prev) => [row, ...prev]);
      setNotes("");
      fetchVaccinationsDueSoon(facilityId).then((res) =>
        setDueSoon({ items: res.items || [], windowEnd: res.windowEnd })
      );
    } catch (e: any) {
      setMessage({ type: "err", text: e?.message || "Enregistrement impossible." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return <p>{ui.common.loading}</p>;
  if (!canViewPublicHealth) {
    return (
      <div>
        <h1>Vaccinations</h1>
        <p>Vous n&apos;avez pas accès à cette page.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Enregistrer une vaccination</h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>
        <Link href="/app/public-health/summary">Résumé</Link>
        {" · "}
        <Link href="/app/public-health/disease-reports">Déclarations maladies</Link>
      </p>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Patient</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder="Rechercher par nom, NIR, téléphone"
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchPatients()}
          />
          <button type="button" onClick={searchPatients} style={btnPrimary}>
            {loadingPatients ? "…" : "Rechercher"}
          </button>
        </div>
        {patients.length > 0 && (
          <select
            style={{ ...inputStyle, marginBottom: 0 }}
            value={patientId}
            onChange={(e) => setPatientId(e.target.value)}
          >
            <option value="">Choisir un patient</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.lastName}, {p.firstName}
                {p.mrn ? ` — ${p.mrn}` : ""}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Consultation (optionnel)</h3>
        {!patientId ? (
          <p style={{ color: "#888" }}>Sélectionnez d&apos;abord un patient.</p>
        ) : loadingEnc ? (
          <p>Chargement…</p>
        ) : encounters.length === 0 ? (
          <p style={{ color: "#666" }}>Aucune consultation. Vous pouvez quand même enregistrer sans lier.</p>
        ) : (
          <select
            style={{ ...inputStyle, marginBottom: 0 }}
            value={encounterId}
            onChange={(e) => setEncounterId(e.target.value)}
          >
            <option value="">— Aucune —</option>
            {encounters.map((enc) => (
              <option key={enc.id} value={enc.id}>
                {getEncounterTypeLabelFr(enc.type)} — {getEncounterStatusLabelFr(enc.status)} — {formatDate(enc.createdAt)}
              </option>
            ))}
          </select>
        )}
      </div>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Vaccin</h3>
        <Field label="Vaccin">
          <select
            style={inputStyle}
            value={vaccineCatalogId}
            onChange={(e) => setVaccineCatalogId(e.target.value)}
          >
            {catalog.length === 0 ? (
              <option value="">— Aucun catalogue —</option>
            ) : (
              catalog.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} ({v.code})
                </option>
              ))
            )}
          </select>
        </Field>
        <Field label="Numéro de dose (optionnel)">
          <input
            type="number"
            min={1}
            style={inputStyle}
            value={doseNumber}
            onChange={(e) => setDoseNumber(e.target.value)}
          />
        </Field>
        <Field label="Numéro de lot (optionnel)">
          <input
            style={inputStyle}
            value={lotNumber}
            onChange={(e) => setLotNumber(e.target.value)}
          />
        </Field>
        <Field label="Date d'administration">
          <input
            type="date"
            style={inputStyle}
            value={administeredAt}
            onChange={(e) => setAdministeredAt(e.target.value)}
          />
        </Field>
        <Field label="Prochaine dose (optionnel)">
          <input
            type="date"
            style={inputStyle}
            value={nextDueAt}
            onChange={(e) => setNextDueAt(e.target.value)}
          />
        </Field>
        <Field label="Notes (optionnel)">
          <textarea
            style={{ ...inputStyle, minHeight: 64 }}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Field>
        <button
          type="button"
          disabled={submitting || !patientId || !vaccineCatalogId}
          onClick={handleSubmit}
          style={btnPrimary}
        >
          {submitting ? "Enregistrement…" : "Enregistrer la vaccination"}
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: 12,
            borderRadius: 4,
            marginBottom: 20,
            backgroundColor: message.type === "ok" ? "#e8f5e9" : "#ffebee",
            color: message.type === "ok" ? "#1b5e20" : "#b71c1c",
          }}
        >
          {message.text}
        </div>
      )}

      {recentThisSession.length > 0 && (
        <div style={cardStyle}>
          <h3 style={{ marginTop: 0 }}>Enregistrées cette session</h3>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Patient</th>
                <th style={{ padding: 8, textAlign: "left" }}>Vaccin</th>
                <th style={{ padding: 8, textAlign: "left" }}>Dose</th>
                <th style={{ padding: 8, textAlign: "left" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {recentThisSession.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    {r.patient
                      ? `${r.patient.lastName}, ${r.patient.firstName}`
                      : r.patientId}
                  </td>
                  <td style={{ padding: 8 }}>{r.vaccineCatalog?.name ?? "—"}</td>
                  <td style={{ padding: 8 }}>{r.doseNumber ?? "—"}</td>
                  <td style={{ padding: 8 }}>{formatDate(r.administeredAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Vaccins dus dans les 30 prochains jours</h3>
        {loadingDueSoon ? (
          <p>Chargement…</p>
        ) : dueSoon.items.length === 0 ? (
          <p style={{ color: "#666" }}>Aucun vaccin à prévoir dans les 30 prochains jours.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #ddd" }}>
                <th style={{ padding: 8, textAlign: "left" }}>Patient</th>
                <th style={{ padding: 8, textAlign: "left" }}>Vaccin</th>
                <th style={{ padding: 8, textAlign: "left" }}>Prochaine dose</th>
              </tr>
            </thead>
            <tbody>
              {dueSoon.items.map((r) => (
                <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                  <td style={{ padding: 8 }}>
                    {r.patient
                      ? `${r.patient.lastName}, ${r.patient.firstName}`
                      : r.patientId}
                  </td>
                  <td style={{ padding: 8 }}>{r.vaccineCatalog?.name ?? "—"}</td>
                  <td style={{ padding: 8 }}>{formatDate(r.nextDueAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
