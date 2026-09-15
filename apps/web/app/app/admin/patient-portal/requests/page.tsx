"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  decidePatientPortalStaffRequest,
  fetchPatientPortalStaffRequests,
  type PatientPortalRequestDecision,
  type PatientPortalStaffRequest,
} from "@/lib/patientPortalRequestsApi";

const OPEN_STATUSES = new Set(["PENDING", "IN_REVIEW", "ACCEPTED"]);

export default function PatientPortalRequestsPage() {
  const { language } = useI18n();
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const [requests, setRequests] = useState<PatientPortalStaffRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const c = useMemo(() => {
    if (language === "es") return {
      title: "Solicitudes de pacientes", intro: "Revise solicitudes del portal del paciente para el establecimiento activo. Ninguna acción cambia automáticamente la cita clínica.",
      back: "← Portal del paciente", refresh: "Actualizar", openOnly: "Mostrar completadas/cerradas", empty: "No hay solicitudes para este establecimiento.",
      patient: "Paciente", preferred: "Horario preferido", reason: "Motivo", created: "Recibida", status: "Estado", review: "En revisión", contact: "Contactar paciente", accept: "Aceptar", decline: "Rechazar", complete: "Completar", providerOnly: "Solo un proveedor puede cambiar el estado de una solicitud.",
    };
    if (language === "fr") return {
      title: "Demandes des patients", intro: "Examinez les demandes du portail patient pour l’établissement actif. Aucune action ne modifie automatiquement le rendez-vous clinique.",
      back: "← Portail patient", refresh: "Actualiser", openOnly: "Afficher les demandes terminées/fermées", empty: "Aucune demande pour cet établissement.",
      patient: "Patient", preferred: "Horaire préféré", reason: "Motif", created: "Reçue", status: "Statut", review: "En cours", contact: "Contacter le patient", accept: "Accepter", decline: "Refuser", complete: "Terminer", providerOnly: "Seul un prestataire peut modifier le statut d’une demande.",
    };
    return {
      title: "Patient Requests", intro: "Review patient-portal requests for the active facility. No action here automatically changes the clinical appointment.",
      back: "← Patient Portal", refresh: "Refresh", openOnly: "Show completed/closed requests", empty: "No requests for this facility.",
      patient: "Patient", preferred: "Preferred time", reason: "Reason", created: "Received", status: "Status", review: "In review", contact: "Contact patient", accept: "Accept", decline: "Decline", complete: "Complete", providerOnly: "Only a provider can change a request status.",
    };
  }, [language]);

  const canView = roles.some((r) => ["ADMIN", "PROVIDER", "RN", "FRONT_DESK"].includes(r));
  const canDecide = roles.includes("PROVIDER");

  const load = useCallback(async () => {
    if (!facilityId || !canView) return;
    setLoading(true); setError(null);
    try { setRequests(await fetchPatientPortalStaffRequests(facilityId)); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to load patient requests."); }
    finally { setLoading(false); }
  }, [facilityId, canView]);

  useEffect(() => { if (ready && facilityId && canView) void load(); }, [ready, facilityId, canView, load]);

  async function decide(request: PatientPortalStaffRequest, decision: PatientPortalRequestDecision) {
    if (!facilityId || !canDecide) return;
    setActionId(request.id); setError(null); setNotice(null);
    try {
      await decidePatientPortalStaffRequest(facilityId, request.id, decision);
      setNotice("Request status updated. The clinical appointment remains unchanged until staff completes the corresponding scheduling workflow.");
      await load();
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update request."); }
    finally { setActionId(null); }
  }

  const visible = showClosed ? requests : requests.filter((r) => OPEN_STATUSES.has(r.status));

  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!canView) return <div style={{ padding: 24 }}><Link href="/app/admin/patient-portal">{c.back}</Link><p>Access denied.</p></div>;

  return (
    <main style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <Link href="/app/admin/patient-portal" style={{ color: "#475569", textDecoration: "none" }}>{c.back}</Link>
      <div style={{ display: "flex", gap: 16, alignItems: "flex-start", justifyContent: "space-between", marginTop: 16, marginBottom: 18 }}>
        <div><h1 style={{ margin: 0 }}>{c.title}</h1><p style={{ color: "#64748b", maxWidth: 820 }}>{c.intro}</p></div>
        <button onClick={() => void load()} disabled={loading} style={{ padding: "10px 14px" }}>{loading ? "…" : c.refresh}</button>
      </div>
      {error ? <div role="alert" style={{ padding: 12, borderRadius: 8, background: "#fee2e2", color: "#991b1b", marginBottom: 16 }}>{error}</div> : null}
      {notice ? <div style={{ padding: 12, borderRadius: 8, background: "#dcfce7", color: "#166534", marginBottom: 16 }}>{notice}</div> : null}
      {!canDecide ? <div style={{ padding: 12, borderRadius: 8, background: "#f8fafc", color: "#475569", marginBottom: 16 }}>{c.providerOnly}</div> : null}
      <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14 }}>
        <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} /> {c.openOnly}
      </label>
      {visible.length === 0 && !loading ? <p style={{ color: "#64748b" }}>{c.empty}</p> : null}
      <div style={{ display: "grid", gap: 12 }}>
        {visible.map((request) => {
          const busy = actionId === request.id;
          return (
            <section key={request.id} style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}>
              <div style={{ display: "flex", gap: 12, justifyContent: "space-between", alignItems: "flex-start" }}>
                <div>
                  <strong>{typeLabel(request.type)}</strong>
                  <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{c.patient}: {request.patientId}</div>
                </div>
                <span style={{ padding: "4px 9px", borderRadius: 999, background: statusBackground(request.status), fontSize: 12, fontWeight: 800 }}>{request.status}</span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 10, marginTop: 14 }}>
                <Info label={c.created} value={new Date(request.createdAt).toLocaleString()} />
                <Info label={c.preferred} value={request.preferredStartAt ? new Date(request.preferredStartAt).toLocaleString() : "—"} />
                <Info label={c.reason} value={request.reason || "—"} />
                <Info label={c.status} value={request.resolutionCode || request.status} />
              </div>
              {canDecide && OPEN_STATUSES.has(request.status) ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 14 }}>
                  {request.status === "PENDING" ? <button disabled={busy} onClick={() => void decide(request, { status: "IN_REVIEW", resolutionCode: "REVIEWING" })}>{c.review}</button> : null}
                  {(request.status === "PENDING" || request.status === "IN_REVIEW") ? <button disabled={busy} onClick={() => void decide(request, { status: "IN_REVIEW", resolutionCode: "PATIENT_CONTACT_REQUIRED" })}>{c.contact}</button> : null}
                  {(request.status === "PENDING" || request.status === "IN_REVIEW") ? <button disabled={busy} onClick={() => void decide(request, { status: "ACCEPTED", resolutionCode: "REQUEST_ACCEPTED" })}>{c.accept}</button> : null}
                  {(request.status === "PENDING" || request.status === "IN_REVIEW") ? <button disabled={busy} onClick={() => void decide(request, { status: "DECLINED", resolutionCode: "REQUEST_DECLINED" })}>{c.decline}</button> : null}
                  {request.status === "ACCEPTED" ? <button disabled={busy} onClick={() => void decide(request, { status: "COMPLETED", resolutionCode: "REQUEST_COMPLETED" })}>{c.complete}</button> : null}
                </div>
              ) : null}
              <p style={{ marginBottom: 0, marginTop: 12, color: "#64748b", fontSize: 12 }}>Portal request only • authoritativeRecordChanged: false</p>
            </section>
          );
        })}
      </div>
    </main>
  );
}

function typeLabel(type: PatientPortalStaffRequest["type"]): string {
  if (type === "APPOINTMENT_NEW") return "New appointment request";
  if (type === "APPOINTMENT_CHANGE") return "Appointment change request";
  if (type === "APPOINTMENT_CANCEL") return "Appointment cancellation request";
  return "Medication refill request";
}

function statusBackground(status: string): string {
  if (status === "PENDING") return "#fef3c7";
  if (status === "IN_REVIEW") return "#dbeafe";
  if (status === "ACCEPTED") return "#dcfce7";
  if (status === "DECLINED" || status === "CANCELLED") return "#fee2e2";
  return "#e2e8f0";
}

function Info({ label, value }: { label: string; value: string }) {
  return <div><div style={{ color: "#64748b", fontSize: 12, marginBottom: 3 }}>{label}</div><div style={{ fontWeight: 600, overflowWrap: "anywhere" }}>{value}</div></div>;
}
