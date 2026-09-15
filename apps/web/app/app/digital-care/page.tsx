"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  closeDigitalCareStaffThread,
  fetchDigitalCareStaffThread,
  fetchDigitalCareStaffThreads,
  replyDigitalCareStaffThread,
  type DigitalCareStaffThread,
  type DigitalCareStaffThreadSummary,
} from "@/lib/digitalCareStaffMessagingApi";

export default function DigitalCareProviderWorkspace() {
  const { language } = useI18n();
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const [threads, setThreads] = useState<DigitalCareStaffThreadSummary[]>([]);
  const [selected, setSelected] = useState<DigitalCareStaffThread | null>(null);
  const [loading, setLoading] = useState(false);
  const [threadLoading, setThreadLoading] = useState(false);
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showClosed, setShowClosed] = useState(false);

  const c = useMemo(() => {
    if (language === "es") return {
      title: "Atención Digital",
      intro: "Mensajería segura entre el equipo clínico y pacientes del establecimiento activo.",
      conversations: "Conversaciones",
      refresh: "Actualizar",
      noThreads: "No hay conversaciones para este establecimiento.",
      select: "Seleccione una conversación para ver el historial.",
      patient: "Paciente",
      reply: "Responder al paciente",
      send: "Enviar respuesta",
      close: "Cerrar conversación",
      closed: "Conversación cerrada",
      showClosed: "Mostrar conversaciones cerradas",
      historyLimit: "Se muestran los 500 mensajes más recientes.",
      accessDenied: "Esta área requiere el rol PROVIDER o RN.",
    };
    if (language === "fr") return {
      title: "Soins numériques",
      intro: "Messagerie sécurisée entre l’équipe clinique et les patients de l’établissement actif.",
      conversations: "Conversations",
      refresh: "Actualiser",
      noThreads: "Aucune conversation pour cet établissement.",
      select: "Sélectionnez une conversation pour afficher l’historique.",
      patient: "Patient",
      reply: "Répondre au patient",
      send: "Envoyer la réponse",
      close: "Fermer la conversation",
      closed: "Conversation fermée",
      showClosed: "Afficher les conversations fermées",
      historyLimit: "Les 500 messages les plus récents sont affichés.",
      accessDenied: "Cet espace nécessite le rôle PROVIDER ou RN.",
    };
    return {
      title: "Digital Care",
      intro: "Secure communication between the clinical team and patients linked to the active facility.",
      conversations: "Patient conversations",
      refresh: "Refresh",
      noThreads: "No conversations are available for this facility.",
      select: "Select a conversation to view its secure message history.",
      patient: "Patient",
      reply: "Reply to patient",
      send: "Send reply",
      close: "Close conversation",
      closed: "Conversation closed",
      showClosed: "Show closed conversations",
      historyLimit: "Showing the 500 most recent messages.",
      accessDenied: "This workspace requires PROVIDER or RN role.",
    };
  }, [language]);

  const canUse = roles.includes("PROVIDER") || roles.includes("RN");

  const loadThreads = useCallback(async () => {
    if (!facilityId || !canUse) return;
    setLoading(true);
    setError(null);
    try {
      const next = await fetchDigitalCareStaffThreads(facilityId);
      setThreads(next);
      if (selected && !next.some((thread) => thread.id === selected.id)) setSelected(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load secure conversations.");
    } finally {
      setLoading(false);
    }
  }, [facilityId, canUse, selected]);

  useEffect(() => {
    if (ready && facilityId && canUse) void loadThreads();
  }, [ready, facilityId, canUse, loadThreads]);

  async function openThread(thread: DigitalCareStaffThreadSummary) {
    if (!facilityId) return;
    setThreadLoading(true);
    setError(null);
    try {
      setSelected(await fetchDigitalCareStaffThread(facilityId, thread.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load the conversation.");
    } finally {
      setThreadLoading(false);
    }
  }

  async function sendReply() {
    if (!facilityId || !selected || selected.status !== "OPEN") return;
    const message = reply.trim();
    if (!message || message.length > 4000) return;
    setSending(true);
    setError(null);
    try {
      await replyDigitalCareStaffThread(facilityId, selected.id, message);
      setReply("");
      setSelected(await fetchDigitalCareStaffThread(facilityId, selected.id));
      await loadThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to send the secure reply.");
    } finally {
      setSending(false);
    }
  }

  async function closeThread() {
    if (!facilityId || !selected || selected.status !== "OPEN") return;
    if (!window.confirm(c.close + "?")) return;
    setSending(true);
    setError(null);
    try {
      await closeDigitalCareStaffThread(facilityId, selected.id);
      setSelected(await fetchDigitalCareStaffThread(facilityId, selected.id));
      await loadThreads();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to close the conversation.");
    } finally {
      setSending(false);
    }
  }

  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!canUse) return <div style={{ padding: 24 }}><h1>{c.title}</h1><p>{c.accessDenied}</p></div>;

  const visibleThreads = showClosed ? threads : threads.filter((thread) => thread.status === "OPEN");

  return (
    <main style={{ padding: 24, maxWidth: 1440, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, marginBottom: 18 }}>
        <div>
          <h1 style={{ margin: 0 }}>{c.title}</h1>
          <p style={{ color: "#64748b", maxWidth: 860 }}>{c.intro}</p>
        </div>
        <button onClick={() => void loadThreads()} disabled={loading} style={{ padding: "10px 14px" }}>
          {loading ? "…" : c.refresh}
        </button>
      </div>

      {error ? <div role="alert" style={{ padding: 12, borderRadius: 8, background: "#fee2e2", color: "#991b1b", marginBottom: 16 }}>{error}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 0.85fr) minmax(460px, 1.6fr)", gap: 18, alignItems: "start" }}>
        <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden" }}>
          <div style={{ padding: 14, borderBottom: "1px solid #e2e8f0" }}>
            <strong>{c.conversations}</strong>
            <label style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 10, color: "#475569", fontSize: 13 }}>
              <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
              {c.showClosed}
            </label>
          </div>
          <div style={{ maxHeight: 690, overflowY: "auto" }}>
            {!loading && visibleThreads.length === 0 ? <p style={{ padding: 16, color: "#64748b" }}>{c.noThreads}</p> : null}
            {visibleThreads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => void openThread(thread)}
                style={{ width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #f1f5f9", padding: 14, background: selected?.id === thread.id ? "#ecfeff" : "white", cursor: "pointer" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                  <strong>{thread.subject}</strong>
                  <span style={{ fontSize: 11, fontWeight: 800, color: thread.status === "OPEN" ? "#166534" : "#64748b" }}>{thread.status}</span>
                </div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 5 }}>{c.patient}: {thread.patientId}</div>
                <div style={{ color: "#64748b", fontSize: 12, marginTop: 3 }}>{thread.category} • {new Date(thread.lastMessageAt).toLocaleString()}</div>
              </button>
            ))}
          </div>
        </section>

        <section style={{ background: "white", border: "1px solid #e2e8f0", borderRadius: 12, minHeight: 420, overflow: "hidden" }}>
          {threadLoading ? <p style={{ padding: 20 }}>Loading…</p> : !selected ? <p style={{ padding: 20, color: "#64748b" }}>{c.select}</p> : (
            <>
              <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0" }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start" }}>
                  <div>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{selected.subject}</h2>
                    <div style={{ color: "#64748b", fontSize: 13, marginTop: 5 }}>{c.patient}: {selected.patientId} • {selected.category}</div>
                  </div>
                  {selected.status === "OPEN" ? <button onClick={() => void closeThread()} disabled={sending}>{c.close}</button> : <span style={{ fontWeight: 800, color: "#64748b" }}>{c.closed}</span>}
                </div>
              </div>

              <div style={{ padding: 16, display: "grid", gap: 10, maxHeight: 470, overflowY: "auto", background: "#f8fafc" }}>
                {selected.messages.map((message) => {
                  const staff = message.senderType === "STAFF";
                  return (
                    <div key={message.id} style={{ display: "flex", justifyContent: staff ? "flex-end" : "flex-start" }}>
                      <div style={{ maxWidth: "76%", borderRadius: 12, padding: "10px 12px", background: staff ? "#dbeafe" : "white", border: "1px solid #e2e8f0" }}>
                        <div style={{ fontSize: 11, fontWeight: 800, color: "#64748b", marginBottom: 4 }}>{staff ? "CARE TEAM" : "PATIENT"}</div>
                        <div style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{message.body}</div>
                        <div style={{ color: "#64748b", fontSize: 11, marginTop: 5 }}>{new Date(message.createdAt).toLocaleString()}</div>
                      </div>
                    </div>
                  );
                })}
                {selected.messagesTruncated ? <div style={{ color: "#92400e", fontSize: 12 }}>{c.historyLimit}</div> : null}
              </div>

              <div style={{ padding: 16, borderTop: "1px solid #e2e8f0" }}>
                {selected.status === "OPEN" ? (
                  <>
                    <label style={{ display: "block", fontWeight: 700, marginBottom: 7 }}>{c.reply}</label>
                    <textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} rows={4} style={{ width: "100%", resize: "vertical", padding: 10, border: "1px solid #cbd5e1", borderRadius: 8, boxSizing: "border-box" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                      <span style={{ color: "#64748b", fontSize: 12 }}>{reply.length}/4000</span>
                      <button onClick={() => void sendReply()} disabled={sending || !reply.trim()} style={{ padding: "10px 14px", background: "#087E8B", color: "white", border: 0, borderRadius: 8, fontWeight: 800 }}>
                        {sending ? "…" : c.send}
                      </button>
                    </div>
                  </>
                ) : <div style={{ color: "#64748b" }}>{c.closed}</div>}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
