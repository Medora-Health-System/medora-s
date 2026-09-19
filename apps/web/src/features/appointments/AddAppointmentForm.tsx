"use client";

import { useEffect, useState } from "react";
import type { PatientSearchHitV1 } from "@medora/shared";
import { PatientSearchAndSelect } from "@/components/patients/PatientSearchAndSelect";
import { apiFetch } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";

type Provider = { id: string; displayName: string };
const copy = {
  en: { title: "Add Appointment", patient: "Select patient", date: "Date and time", reason: "Reason", provider: "Assigned provider", providerHint: "Type at least 3 letters and select a verified provider. An unmatched name will not be assigned.", none: "No matching active providers", save: "Save appointment", cancel: "Cancel", failed: "Unable to create appointment", required: "Select a patient and appointment time", saved: "Appointment created", search: "Search registered patients" },
  es: { title: "Añadir cita", patient: "Seleccionar paciente", date: "Fecha y hora", reason: "Motivo", provider: "Profesional asignado", providerHint: "Escriba al menos 3 letras y seleccione un profesional verificado. Un nombre sin coincidencia no se asignará.", none: "No hay profesionales activos coincidentes", save: "Guardar cita", cancel: "Cancelar", failed: "No se pudo crear la cita", required: "Seleccione un paciente y una fecha y hora", saved: "Cita creada", search: "Buscar pacientes registrados" },
  fr: { title: "Ajouter un rendez-vous", patient: "Sélectionner le patient", date: "Date et heure", reason: "Motif", provider: "Praticien assigné", providerHint: "Saisissez au moins 3 lettres et choisissez un praticien vérifié. Un nom sans correspondance ne sera pas assigné.", none: "Aucun praticien actif correspondant", save: "Enregistrer", cancel: "Annuler", failed: "Impossible de créer le rendez-vous", required: "Sélectionnez un patient et une date", saved: "Rendez-vous créé", search: "Rechercher un patient enregistré" },
};
export function AddAppointmentForm({ facilityId, onClose, onCreated }: {
  facilityId: string; onClose: () => void; onCreated: () => void;
}) {
  const { language } = useI18n();
  const s = copy[language === "es" ? "es" : language === "fr" ? "fr" : "en"];
  const [patient, setPatient] = useState<PatientSearchHitV1 | null>(null);
  const [start, setStart] = useState("");
  const [reason, setReason] = useState("");
  const [query, setQuery] = useState("");
  const [chosen, setChosen] = useState<Provider | null>(null);
  const [options, setOptions] = useState<Provider[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    setOptions([]);
    if (query.trim().length < 3 || chosen) return;
    const timeout = window.setTimeout(() => {
      void apiFetch(`/appointments/providers/search?q=${encodeURIComponent(query.trim())}`, { facilityId })
        .then((rows) => { if (active) setOptions(Array.isArray(rows) ? rows as Provider[] : []); })
        .catch(() => { if (active) setOptions([]); });
    }, 250);
    return () => { active = false; window.clearTimeout(timeout); };
  }, [query, chosen, facilityId]);
  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!patient || !start) { setError(s.required); return; }
    setBusy(true); setError("");
    try {
      await apiFetch("/appointments", {
        facilityId, method: "POST", body: JSON.stringify({
          patientId: patient.id, scheduledStartAt: new Date(start).toISOString(),
          reason: reason.trim() || undefined,
          // Only the explicitly selected, facility-verified provider can be assigned.
          providerId: chosen?.id,
        }),
      });
      onCreated(); onClose();
    } catch (e) { setError(e instanceof Error ? e.message : s.failed); }
    finally { setBusy(false); }
  };
  return <div role="dialog" aria-modal="true" aria-label={s.title} style={{ position: "fixed", inset: 0, background: "#0f172a99", zIndex: 1000, display: "grid", placeItems: "center", padding: 16 }}>
    <form onSubmit={(event) => void save(event)} style={{ width: "min(100%, 520px)", background: "#fff", color: "#142846", borderRadius: 12, padding: 24, display: "grid", gap: 12, maxHeight: "90vh", overflow: "auto" }}>
      <h2 style={{ margin: 0 }}>{s.title}</h2>
      <PatientSearchAndSelect facilityId={facilityId} selectedPatientId={patient?.id} onSelect={setPatient} onClearSelection={() => setPatient(null)} label={s.patient} placeholder={s.search} />
      <label>{s.date}<input required type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} style={{ display: "block", width: "100%", padding: 8 }} /></label>
      <label>{s.reason}<textarea value={reason} maxLength={4000} onChange={(e) => setReason(e.target.value)} style={{ display: "block", width: "100%", padding: 8 }} /></label>
      <label>{s.provider}<input value={query} onChange={(e) => { setQuery(e.target.value); setChosen(null); }} autoComplete="off" style={{ display: "block", width: "100%", padding: 8 }} /></label>
      <small>{s.providerHint}</small>
      {!chosen && query.trim().length >= 3 && <div role="listbox">{options.length ? options.map((option) => <button type="button" role="option" aria-selected={false} key={option.id} onClick={() => { setChosen(option); setQuery(option.displayName); setOptions([]); }} style={{ display: "block", width: "100%", textAlign: "left", padding: 8 }}>{option.displayName}</button>) : <small>{s.none}</small>}</div>}
      {error && <p role="alert" style={{ color: "#b91c1c" }}>{error}</p>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}><button type="button" onClick={onClose}>{s.cancel}</button><button disabled={busy || !patient || !start} type="submit">{s.save}</button></div>
    </form>
  </div>;
}
