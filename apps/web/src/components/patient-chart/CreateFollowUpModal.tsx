"use client";

import React, { useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { createFollowUp } from "@/lib/followUpsApi";
import { getEncounterTypeLabelFr } from "@/lib/uiLabels";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { btnPrimary, btnSecondary } from "@/components/chart/ChartSection";

export type CreateFollowUpEncounterOption = {
  id: string;
  type: string;
  status: string;
  createdAt: string;
  visitReason?: string | null;
  chiefComplaint?: string | null;
  /** Si la consultation est signée, le lien n’est pas proposé en création de suivi. */
  providerDocumentationStatus?: string | null;
};

type PatientSearchHit = {
  id: string;
  firstName: string;
  lastName: string;
  mrn: string | null;
};

type Props = {
  facilityId: string;
  /** Si défini, le patient est figé (dossier patient). */
  patientId?: string | null;
  /** Libellé optionnel quand le patient est figé. */
  lockedPatientLabel?: string;
  recentEncounters?: CreateFollowUpEncounterOption[];
  onClose: () => void;
  onSuccess: () => void;
};

export function CreateFollowUpModal({
  facilityId,
  patientId: fixedPatientId,
  lockedPatientLabel,
  recentEncounters = [],
  onClose,
  onSuccess,
}: Props) {
  const [patientQuery, setPatientQuery] = useState("");
  const [patientHits, setPatientHits] = useState<PatientSearchHit[]>([]);
  const [patientLoading, setPatientLoading] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientSearchHit | null>(null);
  const [dueDate, setDueDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [dueTime, setDueTime] = useState("12:00");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [encounterId, setEncounterId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [queued, setQueued] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ patient?: string; dueDate?: string; reason?: string }>({});

  const [showList, setShowList] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const patientMode = !fixedPatientId;

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setShowList(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    if (!patientMode) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const q = patientQuery.trim();
    if (selectedPatient) {
      setPatientHits([]);
      return;
    }
    if (q.length < 2) {
      setPatientHits([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setPatientLoading(true);
      try {
        const data = await apiFetch(`/patients/search?q=${encodeURIComponent(q)}`, { facilityId });
        setPatientHits(Array.isArray(data) ? data : []);
        setShowList(true);
      } catch {
        setPatientHits([]);
      } finally {
        setPatientLoading(false);
      }
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [patientQuery, facilityId, selectedPatient, patientMode]);

  const pickPatient = (p: PatientSearchHit) => {
    setSelectedPatient(p);
    setPatientQuery(`${p.firstName} ${p.lastName}${p.mrn ? ` — ${p.mrn}` : ""}`);
    setShowList(false);
    setPatientHits([]);
  };

  const formatDateFr = (d: string) => new Date(d).toLocaleDateString("fr-FR");
  const encounterLabel = (e: CreateFollowUpEncounterOption) => {
    const motif = e.visitReason || e.chiefComplaint;
    const parts = [getEncounterTypeLabelFr(e.type), formatDateFr(e.createdAt)];
    if (motif) parts.push(motif.length > 40 ? motif.slice(0, 40) + "…" : motif);
    return parts.join(" · ");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setFieldErrors({});
    const errs: { patient?: string; dueDate?: string; reason?: string } = {};

    const pid = fixedPatientId || selectedPatient?.id;
    if (!pid) errs.patient = "Le patient est requis";
    if (!dueDate.trim()) errs.dueDate = "La date de suivi est requise";
    if (!reason.trim()) errs.reason = "Le motif est requis";
    if (Object.keys(errs).length > 0) {
      setFieldErrors(errs);
      return;
    }

    setSubmitting(true);
    try {
      const res = await createFollowUp(facilityId, {
        patientId: pid!,
        encounterId: encounterId.trim() || undefined,
        dueDate: new Date(`${dueDate.trim()}T${dueTime || "12:00"}:00`).toISOString(),
        reason: reason.trim(),
        notes: notes.trim() || undefined,
      });
      if ((res as any)?.queued) setQueued(true);
      setSuccess(true);
      setTimeout(() => onSuccess(), 600);
    } catch (err: unknown) {
      setError(
        normalizeUserFacingError(err instanceof Error ? err.message : null) || "Impossible de créer le suivi"
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
      onKeyDown={(ev) => ev.key === "Escape" && onClose()}
      role="presentation"
    >
      <div
        style={{
          backgroundColor: "white",
          borderRadius: 8,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
          padding: 24,
          boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
        }}
        onClick={(ev) => ev.stopPropagation()}
        role="dialog"
        aria-labelledby="create-followup-title"
      >
        <h2 id="create-followup-title" style={{ margin: "0 0 8px 0", fontSize: 20 }}>
          Nouveau suivi
        </h2>
        <p style={{ margin: "0 0 20px 0", fontSize: 14, color: "#666" }}>
          {patientMode
            ? "Recherchez un patient (au moins 2 caractères), puis renseignez la date et le motif."
            : "Planifier un suivi avec date prévue et motif."}
        </p>

        {success ? (
          <div style={{ padding: "16px 0", color: "#2e7d32", fontSize: 15, fontWeight: 600 }}>
            {queued ? "Suivi enregistré hors ligne" : "Suivi ajouté"}
            {queued ? (
              <div style={{ marginTop: 6, fontSize: 13, fontWeight: 500 }}>
                Le suivi sera synchronisé dès le retour de la connexion
              </div>
            ) : null}
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            {patientMode ? (
              <div ref={wrapRef} style={{ marginBottom: 18, position: "relative" }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Patient *</label>
                <input
                  type="text"
                  autoComplete="off"
                  placeholder="Nom, prénom ou NIR…"
                  value={patientQuery}
                  onChange={(e) => {
                    setPatientQuery(e.target.value);
                    setSelectedPatient(null);
                    if (e.target.value.trim().length >= 2) setShowList(true);
                  }}
                  onFocus={() => patientHits.length > 0 && setShowList(true)}
                  style={{
                    width: "100%",
                    padding: 10,
                    fontSize: 14,
                    border: `1px solid ${fieldErrors.patient ? "#c62828" : "#ccc"}`,
                    borderRadius: 4,
                    boxSizing: "border-box",
                  }}
                />
                {fieldErrors.patient && (
                  <div style={{ fontSize: 13, color: "#c62828", marginTop: 4 }}>{fieldErrors.patient}</div>
                )}
                {patientLoading && <div style={{ fontSize: 13, color: "#666", marginTop: 6 }}>Recherche…</div>}
                {showList && !selectedPatient && patientQuery.trim().length >= 2 && !patientLoading && patientHits.length === 0 && (
                  <div
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "100%",
                      marginTop: 4,
                      padding: 12,
                      fontSize: 13,
                      color: "#666",
                      background: "#fafafa",
                      border: "1px solid #eee",
                      borderRadius: 4,
                      zIndex: 10,
                    }}
                  >
                    Aucun patient trouvé.
                  </div>
                )}
                {showList && patientHits.length > 0 && !selectedPatient && (
                  <ul
                    style={{
                      position: "absolute",
                      left: 0,
                      right: 0,
                      top: "100%",
                      margin: "4px 0 0 0",
                      padding: 0,
                      listStyle: "none",
                      background: "white",
                      border: "1px solid #ddd",
                      borderRadius: 4,
                      maxHeight: 220,
                      overflowY: "auto",
                      zIndex: 10,
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  >
                    {patientHits.map((p) => (
                      <li key={p.id}>
                        <button
                          type="button"
                          onClick={() => pickPatient(p)}
                          style={{
                            width: "100%",
                            textAlign: "left",
                            padding: "10px 12px",
                            border: "none",
                            borderBottom: "1px solid #eee",
                            background: "white",
                            cursor: "pointer",
                            fontSize: 14,
                          }}
                        >
                          {p.firstName} {p.lastName}
                          {p.mrn ? <span style={{ color: "#666" }}> — {p.mrn}</span> : null}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: 18 }}>
                <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: 14 }}>Patient</label>
                <div style={{ fontSize: 15, padding: "10px 12px", background: "#f5f5f5", borderRadius: 4 }}>
                  {lockedPatientLabel || "—"}
                </div>
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>Date de suivi *</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  fontSize: 14,
                  border: `1px solid ${fieldErrors.dueDate ? "#c62828" : "#ccc"}`,
                  borderRadius: 4,
                }}
              />
              {fieldErrors.dueDate && (
                <div style={{ fontSize: 13, color: "#c62828", marginTop: 4 }}>{fieldErrors.dueDate}</div>
              )}
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>Heure</label>
              <input
                type="time"
                value={dueTime}
                onChange={(e) => setDueTime(e.target.value)}
                style={{
                  width: "100%",
                  padding: 10,
                  fontSize: 14,
                  border: "1px solid #ccc",
                  borderRadius: 4,
                }}
              />
            </div>
            <div style={{ marginBottom: 14, fontSize: 13, color: "#555" }}>
              Statut initial : Planifié
            </div>

            <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 14, fontWeight: 600 }}>Motif du suivi *</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="ex. contrôle plaie, résultats laboratoire"
                style={{
                  width: "100%",
                  padding: 10,
                  fontSize: 14,
                  border: `1px solid ${fieldErrors.reason ? "#c62828" : "#ccc"}`,
                  borderRadius: 4,
                }}
              />
              {fieldErrors.reason && (
                <div style={{ fontSize: 13, color: "#c62828", marginTop: 4 }}>{fieldErrors.reason}</div>
              )}
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Optionnel"
                style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>

            {recentEncounters.length > 0 && (
              <div style={{ marginBottom: 14 }}>
                <label style={{ display: "block", marginBottom: 4, fontSize: 14 }}>Lier à une consultation</label>
                <select
                  value={encounterId}
                  onChange={(e) => setEncounterId(e.target.value)}
                  style={{ width: "100%", padding: 10, fontSize: 14, border: "1px solid #ccc", borderRadius: 4 }}
                >
                  <option value="">— Aucune —</option>
                  {recentEncounters.map((enc) => {
                    const signed = enc.providerDocumentationStatus === "SIGNED";
                    return (
                      <option key={enc.id} value={enc.id} disabled={signed}>
                        {encounterLabel(enc)}
                        {signed ? " — dossier signé" : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {error && <div style={{ color: "#c62828", marginBottom: 12, fontSize: 14 }}>{error}</div>}

            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button type="button" style={btnSecondary} onClick={onClose}>
                Annuler
              </button>
              <button type="submit" style={btnPrimary} disabled={submitting}>
                {submitting ? "Enregistrement…" : "Enregistrer le suivi"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
