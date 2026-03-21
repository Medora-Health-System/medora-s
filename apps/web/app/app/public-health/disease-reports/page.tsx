"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  createDiseaseReport,
  fetchDiseaseReports,
  type DiseaseCaseReportRow,
} from "@/lib/publicHealthApi";
import { Field, inputStyle } from "@/components/pharmacy/Modal";

type Patient = { id: string; firstName: string; lastName: string; mrn: string | null };

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

const STATUS_OPTIONS = [
  { value: "SUSPECTED", label: "Suspect" },
  { value: "CONFIRMED", label: "Confirmé" },
  { value: "RULED_OUT", label: "Écarté" },
];
const STATUS_LABELS: Record<string, string> = { SUSPECTED: "Suspect", CONFIRMED: "Confirmé", RULED_OUT: "Écarté" };

function formatDate(d: string | null | undefined) {
  return d ? new Date(d).toLocaleDateString() : "—";
}

export default function DiseaseReportsPage() {
  const { facilityId, ready, canViewPublicHealth } = useFacilityAndRoles();
  const [patientQuery, setPatientQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientId, setPatientId] = useState("");
  const [diseaseCode, setDiseaseCode] = useState("");
  const [diseaseName, setDiseaseName] = useState("");
  const [status, setStatus] = useState("SUSPECTED");
  const [onsetDate, setOnsetDate] = useState("");
  const [commune, setCommune] = useState("");
  const [department, setDepartment] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [reports, setReports] = useState<DiseaseCaseReportRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState("");
  const [filterCommune, setFilterCommune] = useState("");
  const [filterDiseaseName, setFilterDiseaseName] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");

  const loadReports = useCallback(async () => {
    if (!facilityId || !canViewPublicHealth) return;
    setLoading(true);
    try {
      const params: Record<string, string> = { limit: "100" };
      if (filterStatus) params.status = filterStatus;
      if (filterCommune) params.commune = filterCommune;
      if (filterDiseaseName) params.diseaseName = filterDiseaseName;
      if (filterFrom) params.reportedFrom = filterFrom;
      if (filterTo) params.reportedTo = filterTo;
      const res = await fetchDiseaseReports(facilityId, params);
      setReports(res.items ?? []);
      setTotal(res.total ?? 0);
    } catch {
      setReports([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [facilityId, canViewPublicHealth, filterStatus, filterCommune, filterDiseaseName, filterFrom, filterTo]);

  useEffect(() => {
    if (ready && facilityId && canViewPublicHealth) loadReports();
  }, [ready, facilityId, canViewPublicHealth, loadReports]);

  const searchPatients = async () => {
    if (!facilityId || !patientQuery.trim()) return;
    try {
      const data = await apiFetch(
        `/patients/search?q=${encodeURIComponent(patientQuery.trim())}`,
        { facilityId }
      );
      setPatients(data || []);
    } catch {
      setPatients([]);
    }
  };

  const handleSubmit = async () => {
    if (!facilityId || !diseaseCode.trim() || !diseaseName.trim()) return;
    setMessage(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        diseaseCode: diseaseCode.trim(),
        diseaseName: diseaseName.trim(),
        status,
        onsetDate: onsetDate || undefined,
        commune: commune.trim() || undefined,
        department: department.trim() || undefined,
        notes: notes.trim() || undefined,
      };
      if (patientId) body.patientId = patientId;
      await createDiseaseReport(facilityId, body);
      setMessage({ type: "ok", text: "Déclaration créée." });
      setDiseaseCode("");
      setDiseaseName("");
      setOnsetDate("");
      setCommune("");
      setDepartment("");
      setNotes("");
      setPatientId("");
      loadReports();
    } catch (e: any) {
      setMessage({ type: "err", text: e?.message || "Impossible de créer la déclaration." });
    } finally {
      setSubmitting(false);
    }
  };

  if (!ready) return <p>Chargement…</p>;
  if (!canViewPublicHealth) {
    return (
      <div>
        <h1>Déclarations maladies</h1>
        <p>Vous n&apos;avez pas accès.</p>
      </div>
    );
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Déclarations de cas</h1>
      <p style={{ color: "#555", fontSize: 14, marginBottom: 20 }}>
        <Link href="/app/public-health/summary">Résumé</Link>
        {" · "}
        <Link href="/app/public-health/vaccinations">Vaccinations</Link>
      </p>

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Nouvelle déclaration</h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <input
            style={{ ...inputStyle, marginBottom: 0, flex: 1 }}
            placeholder="Recherche patient (optionnel)"
            value={patientQuery}
            onChange={(e) => setPatientQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && searchPatients()}
          />
          <button type="button" onClick={searchPatients} style={btnPrimary}>
            Rechercher
          </button>
        </div>
        {patients.length > 0 && (
          <Field label="Lier au patient (optionnel)">
            <select
              style={inputStyle}
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
            >
              <option value="">— Aucun —</option>
              {patients.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName}, {p.firstName} {p.mrn ? `— ${p.mrn}` : ""}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Code maladie">
          <input
            style={inputStyle}
            value={diseaseCode}
            onChange={(e) => setDiseaseCode(e.target.value)}
            placeholder="ex. A09, J18"
          />
        </Field>
        <Field label="Nom de la maladie">
          <input
            style={inputStyle}
            value={diseaseName}
            onChange={(e) => setDiseaseName(e.target.value)}
            placeholder="ex. Diarrhée aiguë, Pneumonie"
          />
        </Field>
        <Field label="Statut">
          <select style={inputStyle} value={status} onChange={(e) => setStatus(e.target.value)}>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Date de début (optionnel)">
          <input
            type="date"
            style={inputStyle}
            value={onsetDate}
            onChange={(e) => setOnsetDate(e.target.value)}
          />
        </Field>
        <Field label="Commune (optionnel)">
          <input
            style={inputStyle}
            value={commune}
            onChange={(e) => setCommune(e.target.value)}
          />
        </Field>
        <Field label="Département (optionnel)">
          <input
            style={inputStyle}
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
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
          disabled={submitting || !diseaseCode.trim() || !diseaseName.trim()}
          onClick={handleSubmit}
          style={btnPrimary}
        >
          {submitting ? "Enregistrement…" : "Créer la déclaration"}
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

      <div style={cardStyle}>
        <h3 style={{ marginTop: 0 }}>Déclarations récentes</h3>
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
          }}
        >
          <input
            style={{ ...inputStyle, marginBottom: 0, width: 140 }}
            placeholder="Nom maladie"
            value={filterDiseaseName}
            onChange={(e) => setFilterDiseaseName(e.target.value)}
          />
          <select
            style={{ ...inputStyle, marginBottom: 0, width: 120 }}
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="">Tous les statuts</option>
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            style={{ ...inputStyle, marginBottom: 0, width: 120 }}
            placeholder="Commune"
            value={filterCommune}
            onChange={(e) => setFilterCommune(e.target.value)}
          />
          <input
            type="date"
            style={{ ...inputStyle, marginBottom: 0, width: 140 }}
            placeholder="Du"
            value={filterFrom}
            onChange={(e) => setFilterFrom(e.target.value)}
          />
          <input
            type="date"
            style={{ ...inputStyle, marginBottom: 0, width: 140 }}
            placeholder="Au"
            value={filterTo}
            onChange={(e) => setFilterTo(e.target.value)}
          />
          <button type="button" onClick={loadReports} style={btnPrimary}>
            Appliquer
          </button>
        </div>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>{total} déclaration(s)</p>
        {loading ? (
          <p>Chargement…</p>
        ) : reports.length === 0 ? (
          <p style={{ color: "#666" }}>Aucune déclaration ne correspond aux filtres.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ borderBottom: "2px solid #ddd" }}>
                  <th style={{ padding: 8, textAlign: "left" }}>Déclaré le</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Maladie</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Code</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Statut</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Commune</th>
                  <th style={{ padding: 8, textAlign: "left" }}>Patient</th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} style={{ borderBottom: "1px solid #eee" }}>
                    <td style={{ padding: 8 }}>{formatDate(r.reportedAt)}</td>
                    <td style={{ padding: 8 }}>{r.diseaseName}</td>
                    <td style={{ padding: 8 }}>{r.diseaseCode}</td>
                    <td style={{ padding: 8 }}>{STATUS_LABELS[r.status] ?? r.status}</td>
                    <td style={{ padding: 8 }}>{r.commune ?? "—"}</td>
                    <td style={{ padding: 8 }}>
                      {r.patient
                        ? `${r.patient.lastName}, ${r.patient.firstName}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
