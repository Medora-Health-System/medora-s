"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatPatientLegalName, type PatientSearchHitV1 } from "@medora/shared";
import { PatientSearchAndSelect } from "@/components/patients/PatientSearchAndSelect";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  closeDigitalCareStaffThread,
  fetchDigitalCareStaffResult,
  fetchDigitalCareStaffResults,
  fetchDigitalCareStaffThread,
  fetchDigitalCareStaffThreads,
  releaseDigitalCareResult,
  replyDigitalCareStaffThread,
  revokeDigitalCareResult,
  type DigitalCareStaffResult,
  type DigitalCareStaffThread,
  type DigitalCareStaffThreadSummary,
} from "@/lib/digitalCareStaffMessagingApi";

type WorkspaceTab = "results" | "messages" | "medications" | "discharge" | "summary";
const card: React.CSSProperties = { background: "#fff", border: "1px solid #dbe4ee", borderRadius: 12 };
const tabButton = (active: boolean): React.CSSProperties => ({ padding: "12px 16px", border: 0, borderBottom: active ? "3px solid #087E8B" : "3px solid transparent", background: "transparent", fontWeight: active ? 800 : 650, color: active ? "#075985" : "#475569", cursor: "pointer" });

function fmtDob(value: string | Date | null | undefined) {
  if (!value) return "—";
  const d = new Date(value);
  return Number.isNaN(d.valueOf()) ? "—" : d.toLocaleDateString();
}

export default function DigitalCareProviderWorkspace() {
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const canUse = roles.includes("ADMIN") || roles.includes("PROVIDER") || roles.includes("RN");
  const [tab, setTab] = useState<WorkspaceTab>("results");
  const [patient, setPatient] = useState<PatientSearchHitV1 | null>(null);
  const [threads, setThreads] = useState<DigitalCareStaffThreadSummary[]>([]);
  const [selectedThread, setSelectedThread] = useState<DigitalCareStaffThread | null>(null);
  const [results, setResults] = useState<DigitalCareStaffResult[]>([]);
  const [expandedResult, setExpandedResult] = useState<DigitalCareStaffResult | null>(null);
  const [reply, setReply] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    if (!facilityId || !canUse) return;
    setBusy(true); setError(null);
    try {
      const [nextThreads, nextResults] = await Promise.all([
        fetchDigitalCareStaffThreads(facilityId),
        fetchDigitalCareStaffResults(facilityId),
      ]);
      setThreads(nextThreads); setResults(nextResults);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load Digital Care workspace.");
    } finally { setBusy(false); }
  }, [facilityId, canUse]);

  useEffect(() => { if (ready && canUse && facilityId) void refresh(); }, [ready, canUse, facilityId, refresh]);
  useEffect(() => { setSelectedThread(null); setExpandedResult(null); }, [patient?.id]);

  const patientResults = useMemo(() => patient ? results.filter((r) => r.patientId === patient.id) : [], [results, patient]);
  const patientThreads = useMemo(() => patient ? threads.filter((t) => t.patientId === patient.id) : [], [threads, patient]);
  const unreleased = patientResults.filter((r) => !r.released).length;

  async function openThread(t: DigitalCareStaffThreadSummary) {
    if (!facilityId) return;
    setBusy(true); setError(null);
    try { setSelectedThread(await fetchDigitalCareStaffThread(facilityId, t.id)); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to open patient conversation."); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!facilityId || !selectedThread || !reply.trim()) return;
    const text = reply;
    setBusy(true); setError(null);
    try {
      await replyDigitalCareStaffThread(facilityId, selectedThread.id, text.trim());
      setReply("");
      setSelectedThread(await fetchDigitalCareStaffThread(facilityId, selectedThread.id));
      await refresh();
    } catch (e) {
      setReply(text);
      setError(e instanceof Error ? e.message : "Unable to send reply. Your message was preserved.");
    } finally { setBusy(false); }
  }

  async function closeThread() {
    if (!facilityId || !selectedThread || !window.confirm("Close this patient conversation?")) return;
    setBusy(true); setError(null);
    try { await closeDigitalCareStaffThread(facilityId, selectedThread.id); setSelectedThread(await fetchDigitalCareStaffThread(facilityId, selectedThread.id)); await refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Unable to close conversation."); }
    finally { setBusy(false); }
  }

  async function toggleResult(r: DigitalCareStaffResult) {
    if (!facilityId) return;
    const action = r.released ? "remove this result from the patient portal" : "release this verified result to the patient";
    if (!window.confirm(`Are you sure you want to ${action}?`)) return;
    setBusy(true); setError(null);
    try {
      if (r.released) await revokeDigitalCareResult(facilityId, r.id); else await releaseDigitalCareResult(facilityId, r.id);
      await refresh();
      setExpandedResult(await fetchDigitalCareStaffResult(facilityId, r.id).catch(() => null));
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to update result release."); }
    finally { setBusy(false); }
  }

  if (!ready) return <main style={{ padding: 24 }}>Loading…</main>;
  if (!canUse) return <main style={{ padding: 24 }}><h1>Digital Care</h1><p>This workspace requires ADMIN, PROVIDER, or RN role.</p></main>;
  if (!facilityId) return <main style={{ padding: 24 }}><h1>Digital Care</h1><p>Select a facility to open Digital Care.</p></main>;

  return (
    <main style={{ padding: 20, maxWidth: 1560, margin: "0 auto", background: "#f8fafc", minHeight: "100vh" }} data-testid="digital-care-provider-dashboard">
      <header style={{ display: "flex", justifyContent: "space-between", gap: 18, alignItems: "flex-start", marginBottom: 14 }}>
        <div><h1 style={{ margin: 0, color: "#0f172a" }}>Digital Care</h1><p style={{ margin: "5px 0 0", color: "#64748b" }}>Patient communication, diagnostic-result release, medications and discharge information.</p></div>
        <button type="button" onClick={() => void refresh()} disabled={busy} style={{ padding: "10px 14px", border: "1px solid #cbd5e1", borderRadius: 8, background: "white", fontWeight: 700 }}>{busy ? "Refreshing…" : "Refresh"}</button>
      </header>

      <section style={{ ...card, padding: 14, marginBottom: 14 }} data-testid="digital-care-patient-search">
        <PatientSearchAndSelect facilityId={facilityId} showSearchButton autoSearch placeholder="Search patient by name, MRN, DOB, phone or email" label="Find patient" selectedPatientId={patient?.id ?? null} onSelect={setPatient} onClearSelection={() => setPatient(null)} testIdPrefix="digital-care-patient" />
      </section>

      {error ? <div role="alert" style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 8, marginBottom: 14 }}>{error}</div> : null}

      {!patient ? (
        <section style={{ ...card, padding: 34, textAlign: "center", color: "#64748b" }}><strong style={{ color: "#334155" }}>Select a patient to open Digital Care.</strong><div style={{ marginTop: 6 }}>Patient identity must come from an explicit facility-scoped search result.</div></section>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px,.7fr) minmax(540px,2fr) minmax(250px,.8fr)", gap: 14, alignItems: "start" }}>
          <aside style={{ ...card, overflow: "hidden" }}>
            <div style={{ padding: 16, background: "#f0f9ff", borderBottom: "1px solid #dbeafe" }}><div style={{ fontSize: 18, fontWeight: 850 }}>{formatPatientLegalName(patient)}</div><div style={{ fontSize: 12, color: "#475569", marginTop: 5 }}>MRN: <strong>{patient.mrn || "—"}</strong></div><div style={{ fontSize: 12, color: "#475569", marginTop: 3 }}>DOB: <strong>{fmtDob(patient.dob)}</strong></div></div>
            <div style={{ padding: 12 }}><div style={{ fontSize: 12, fontWeight: 800, color: "#64748b", textTransform: "uppercase", marginBottom: 8 }}>Patient workspace</div>{(["results","messages","medications","discharge","summary"] as WorkspaceTab[]).map((id) => <button key={id} type="button" onClick={() => setTab(id)} style={{ display: "flex", justifyContent: "space-between", width: "100%", padding: "10px 9px", border: 0, borderRadius: 8, background: tab === id ? "#e0f2fe" : "transparent", fontWeight: tab === id ? 800 : 650, textTransform: "capitalize", cursor: "pointer" }}><span>{id === "summary" ? "Visit summary" : id}</span>{id === "results" && unreleased ? <span style={{ color: "#b91c1c" }}>{unreleased}</span> : id === "messages" && patientThreads.length ? <span>{patientThreads.length}</span> : null}</button>)}</div>
          </aside>

          <section style={{ ...card, minHeight: 620, overflow: "hidden" }}>
            <div style={{ display: "flex", borderBottom: "1px solid #e2e8f0", overflowX: "auto" }}>{(["results","messages","medications","discharge","summary"] as WorkspaceTab[]).map((id) => <button key={id} type="button" onClick={() => setTab(id)} style={tabButton(tab === id)}>{id === "results" ? "Patient Results" : id === "messages" ? "Messages / Text" : id === "summary" ? "Visit Summary" : id[0].toUpperCase()+id.slice(1)}</button>)}</div>

            {tab === "results" ? <div><div style={{ padding: 16, borderBottom: "1px solid #e2e8f0" }}><strong>Verified diagnostic results</strong><div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>Release is an explicit audited action. Patient name, DOB and MRN remain visible while you work.</div></div>{patientResults.length === 0 ? <p style={{ padding: 18, color: "#64748b" }}>No verified results for this patient.</p> : patientResults.map((r) => <article key={r.id} style={{ borderBottom: "1px solid #eef2f7" }}><button type="button" onClick={() => setExpandedResult(expandedResult?.id === r.id ? null : r)} style={{ width: "100%", border: 0, background: expandedResult?.id === r.id ? "#f8fafc" : "white", padding: 14, textAlign: "left", display: "grid", gridTemplateColumns: "1fr auto", gap: 12, cursor: "pointer" }}><div><strong>{r.title}</strong><div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{r.kind === "LAB_TEST" ? "Laboratory" : "Imaging"} • Verified {new Date(r.verifiedAt).toLocaleString()}</div></div><div>{r.criticalValue ? <span style={{ marginRight: 8, color: "#b91c1c", fontSize: 11, fontWeight: 850 }}>CRITICAL</span> : null}<span style={{ color: r.released ? "#15803d" : "#92400e", fontSize: 11, fontWeight: 850 }}>{r.released ? "RELEASED" : "NOT RELEASED"}</span></div></button>{expandedResult?.id === r.id ? <div style={{ padding: "0 14px 16px" }}><div style={{ whiteSpace: "pre-wrap", lineHeight: 1.45, background: "#f8fafc", padding: 12, borderRadius: 8 }}>{r.resultText || "No narrative result text."}</div><div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}><button type="button" disabled={busy} onClick={() => void toggleResult(r)} style={{ padding: "9px 12px", borderRadius: 8, border: "1px solid #cbd5e1", background: r.released ? "white" : "#087E8B", color: r.released ? "#b91c1c" : "white", fontWeight: 800 }}>{r.released ? "Revoke patient access" : "Release to patient"}</button></div></div> : null}</article>)}</div> : null}

            {tab === "messages" ? <div style={{ display: "grid", gridTemplateColumns: "minmax(210px,.75fr) minmax(330px,1.4fr)", minHeight: 560 }}><div style={{ borderRight: "1px solid #e2e8f0" }}>{patientThreads.length === 0 ? <p style={{ padding: 16, color: "#64748b" }}>No conversations for this patient.</p> : patientThreads.map((t) => <button key={t.id} onClick={() => void openThread(t)} style={{ display: "block", width: "100%", textAlign: "left", padding: 14, border: 0, borderBottom: "1px solid #f1f5f9", background: selectedThread?.id === t.id ? "#ecfeff" : "white", cursor: "pointer" }}><strong>{t.subject}</strong><div style={{ fontSize: 12, color: "#64748b", marginTop: 4 }}>{t.category} • {t.status}</div></button>)}</div><div>{!selectedThread ? <p style={{ padding: 20, color: "#64748b" }}>Select a conversation to read or text the patient.</p> : <><div style={{ padding: 14, borderBottom: "1px solid #e2e8f0" }}><strong>{selectedThread.subject}</strong>{selectedThread.status === "OPEN" ? <button onClick={() => void closeThread()} style={{ float: "right" }}>Close</button> : null}</div><div style={{ padding: 16, height: 340, overflowY: "auto" }}>{selectedThread.messages.map((m) => <div key={m.id} style={{ margin: "8px 0", textAlign: m.senderType === "STAFF" ? "right" : "left" }}><span style={{ display: "inline-block", maxWidth: "78%", padding: "9px 11px", borderRadius: 12, background: m.senderType === "STAFF" ? "#dbeafe" : "#f1f5f9", whiteSpace: "pre-wrap" }}>{m.body}</span><div style={{ fontSize: 10, color: "#94a3b8", marginTop: 2 }}>{new Date(m.createdAt).toLocaleString()}</div></div>)}</div>{selectedThread.status === "OPEN" ? <div style={{ padding: 14, borderTop: "1px solid #e2e8f0" }}><label style={{ fontSize: 12, fontWeight: 800 }}>Message / text patient</label><textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} rows={4} placeholder="Type a secure message…" style={{ width: "100%", boxSizing: "border-box", marginTop: 6, padding: 10, borderRadius: 8, border: "1px solid #cbd5e1" }} /><button onClick={() => void send()} disabled={busy || !reply.trim()} style={{ marginTop: 8, padding: "9px 16px", background: "#087E8B", color: "white", border: 0, borderRadius: 8, fontWeight: 800 }}>Send secure message</button></div> : null}</>}</div></div> : null}

            {tab === "medications" ? <div style={{ padding: 20 }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Medications</h2><p style={{ color: "#475569", lineHeight: 1.5 }}>The patient app already reads governed pharmacy-dispense medication orders. The provider dashboard will not invent a second medication list. Use the authoritative chart while the unified discharge + reconciled-home-medication projection is being connected.</p><Link href={`/app/patients/${patient.id}`} style={{ display: "inline-block", padding: "9px 13px", borderRadius: 8, background: "#0f172a", color: "white", textDecoration: "none", fontWeight: 750 }}>Open patient chart</Link></div> : null}
            {tab === "discharge" ? <div style={{ padding: 20 }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Discharge</h2><p style={{ color: "#475569", lineHeight: 1.5 }}>Discharge information must come from the authoritative encounter/disposition workflow before it is shown in the patient app. No placeholder discharge data is displayed here.</p><Link href={`/app/patients/${patient.id}`} style={{ color: "#0369a1", fontWeight: 750 }}>Open patient chart →</Link></div> : null}
            {tab === "summary" ? <div style={{ padding: 20 }}><h2 style={{ marginTop: 0, fontSize: 18 }}>Visit Summary</h2><p style={{ color: "#475569" }}>Open the patient chart for the authoritative encounter summary and signed discharge documentation.</p><Link href={`/app/patients/${patient.id}`} style={{ color: "#0369a1", fontWeight: 750 }}>View full chart →</Link></div> : null}
          </section>

          <aside style={{ display: "grid", gap: 12 }}>
            <section style={{ ...card, padding: 16 }}><div style={{ display: "flex", justifyContent: "space-between" }}><strong>Patient Information</strong><Link href={`/app/patients/${patient.id}/profile`} style={{ fontSize: 12 }}>View</Link></div><dl style={{ display: "grid", gridTemplateColumns: "70px 1fr", gap: "7px 8px", fontSize: 13, marginBottom: 0 }}><dt style={{ color: "#64748b" }}>Name</dt><dd style={{ margin: 0, fontWeight: 700 }}>{formatPatientLegalName(patient)}</dd><dt style={{ color: "#64748b" }}>MRN</dt><dd style={{ margin: 0 }}>{patient.mrn || "—"}</dd><dt style={{ color: "#64748b" }}>DOB</dt><dd style={{ margin: 0 }}>{fmtDob(patient.dob)}</dd><dt style={{ color: "#64748b" }}>Phone</dt><dd style={{ margin: 0 }}>{patient.phone || "—"}</dd><dt style={{ color: "#64748b" }}>Email</dt><dd style={{ margin: 0, overflowWrap: "anywhere" }}>{patient.email || "—"}</dd></dl></section>
            <section style={{ ...card, padding: 16 }}><strong>Patient Portal</strong><div style={{ marginTop: 10, padding: 10, borderRadius: 8, background: "#f0fdf4", color: "#166534", fontSize: 13 }}><strong>Connected workflows</strong><div style={{ marginTop: 4 }}>Secure messages and explicitly released diagnostic results use the same patient-portal backend consumed by the patient app.</div></div></section>
            <section style={{ ...card, padding: 16 }}><strong>Quick status</strong><div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.7 }}>Results: {patientResults.length}<br/>Awaiting release: {unreleased}<br/>Conversations: {patientThreads.length}</div></section>
          </aside>
        </div>
      )}
    </main>
  );
}
