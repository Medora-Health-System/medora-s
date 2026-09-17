"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import Link from "next/link";
import { PatientSearchAndSelect } from "@/components/patients/PatientSearchAndSelect";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { attachmentsFromResultDataAll } from "@/lib/clinicalResultNormalize";
import {
  closeDigitalCareStaffThread,
  createDigitalCareStaffThread,
  fetchDigitalCareResultDetail,
  fetchDigitalCareRoster,
  fetchDigitalCareStaffThread,
  fetchDigitalCareWorkspace,
  releaseDigitalCareResult,
  replyDigitalCareStaffThread,
  revokeDigitalCareResult,
  type DigitalCareResultDetail,
  type DigitalCareRosterPatient,
  type DigitalCareStaffThread,
  type DigitalCareWorkspaceBundle,
  type DigitalCareWorkspaceResult,
} from "@/lib/digitalCareStaffWorkspaceApi";
import {
  countDigitalCareRoster,
  digitalCareFormatDay,
  digitalCareFormatWhen,
  digitalCareInitials,
  digitalCareResultKindFilter,
  digitalCareSafeLabel,
  digitalCareVisitStatusPresentation,
  digitalCareVisibleTabs,
  fillCountTemplate,
  filterDigitalCareRoster,
  mapDigitalCareUserError,
  digitalCarePortalAccessMessageKey,
  medicationsByBucket,
  type DigitalCareMainTab,
  type DigitalCareRosterFilter,
} from "./digitalCareWorkspaceView";
import { DigitalCarePatientAppAccess } from "./DigitalCarePatientAppAccess";
import {
  fetchPatientPortalAccess,
  issuePatientPortalActivation,
  revokePatientPortalAccess,
  type PatientPortalAccessStatus,
} from "@/lib/patientPortalAdminApi";
import { digitalCareResultPrintHtml, digitalCareWorkspacePrintHtml, openDigitalCarePrintDocument } from "./digitalCareWorkspacePrint";
import { subscribeFacilityConfigurationUpdated } from "@/lib/facilityConfigurationEvents";

const card: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  background: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
};

const chipBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  borderRadius: 999,
  padding: "2px 8px",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.2,
};

function digitalCareCaughtError(error: unknown, t: (key: string) => string): string {
  const kind = mapDigitalCareUserError(error);
  if (kind === "portalInactive") return t("digitalCare.messages.needPortal");
  if (kind === "patientNotFound") return t("digitalCare.error.patientNotFound");
  if (kind === "messagingUnavailable") return t("digitalCare.messages.unavailable");
  if (kind === "notAuthorized") return t("digitalCare.error.notAuthorized");
  if (kind === "activationExpired") return t("digitalCare.error.activationExpired");
  if (kind === "activationUsed") return t("digitalCare.error.activationUsed");
  if (kind === "portalUnavailable") return t("digitalCare.error.portalUnavailable");
  if (kind === "network") return t("digitalCare.error.network");
  if (kind === "generic") return t("digitalCare.error");
  return error instanceof Error && error.message.trim() ? error.message : t("digitalCare.error");
}

function Chip({ label, tone }: { label: string; tone: "green" | "red" | "amber" | "blue" | "slate" | "purple" }) {
  const colors: Record<string, { bg: string; text: string; border: string }> = {
    green: { bg: "#dcfce7", text: "#166534", border: "#86efac" },
    red: { bg: "#fee2e2", text: "#991b1b", border: "#fecaca" },
    amber: { bg: "#fef3c7", text: "#92400e", border: "#fde68a" },
    blue: { bg: "#dbeafe", text: "#1d4ed8", border: "#93c5fd" },
    slate: { bg: "#f1f5f9", text: "#334155", border: "#cbd5e1" },
    purple: { bg: "#f3e8ff", text: "#6b21a8", border: "#d8b4fe" },
  };
  const c = colors[tone];
  return <span style={{ ...chipBase, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>{label}</span>;
}

export function DigitalCareProviderWorkspace() {
  const { t } = useI18n();
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const canUse = roles.includes("ADMIN") || roles.includes("PROVIDER") || roles.includes("RN");
  // Digital Care itself is ADMIN/PROVIDER/RN. MEDORA_SUPER_ADMIN is not a workspace actor here;
  // platform-principal activation stays on the existing staff activation API / admin portal.
  const canActivatePortal = roles.includes("ADMIN");
  const canRevokePortal = canActivatePortal;
  const [tab, setTab] = useState<DigitalCareMainTab>("results");
  const [rosterFilter, setRosterFilter] = useState<DigitalCareRosterFilter>("ALL");
  const [rosterQuery, setRosterQuery] = useState("");
  const [patients, setPatients] = useState<DigitalCareRosterPatient[]>([]);
  const [rosterTotal, setRosterTotal] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<DigitalCareWorkspaceBundle | null>(null);
  const [thread, setThread] = useState<DigitalCareStaffThread | null>(null);
  const [reply, setReply] = useState("");
  const [newSubject, setNewSubject] = useState("");
  const [newBody, setNewBody] = useState("");
  const [resultKind, setResultKind] = useState<"ALL" | "LAB" | "IMAGING" | "OTHER">("ALL");
  const [resultQuery, setResultQuery] = useState("");
  const [selectedResult, setSelectedResult] = useState<DigitalCareWorkspaceResult | null>(null);
  const [resultDetail, setResultDetail] = useState<DigitalCareResultDetail | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quickOpen, setQuickOpen] = useState(false);
  const [messageQuery, setMessageQuery] = useState("");
  const [configuration, setConfiguration] = useState<DigitalCareWorkspaceBundle["configuration"]>(null);
  const [portalAccess, setPortalAccess] = useState<PatientPortalAccessStatus | null>(null);
  const [portalError, setPortalError] = useState<string | null>(null);
  const [issuedCode, setIssuedCode] = useState<string | null>(null);
  const [issuedExpiresAt, setIssuedExpiresAt] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState(false);

  const loadRoster = useCallback(
    async (offset = 0, append = false) => {
      if (!facilityId || !canUse) return;
      setBusy(true);
      setError(null);
      try {
        const data = await fetchDigitalCareRoster(facilityId, { q: rosterQuery, limit: 40, offset });
        setPatients((prev) => (append ? [...prev, ...data.patients] : data.patients));
        setRosterTotal(data.total);
        if (data.configuration) setConfiguration(data.configuration);
        setSelectedId((current) => current ?? data.patients[0]?.id ?? null);
      } catch (e) {
        setError(digitalCareCaughtError(e, t));
      } finally {
        setBusy(false);
      }
    },
    [facilityId, canUse, rosterQuery, t],
  );

  const loadWorkspace = useCallback(
    async (patientId: string) => {
      if (!facilityId || !canUse) return;
      setBusy(true);
      setError(null);
      setPortalError(null);
      try {
        const bundle = await fetchDigitalCareWorkspace(facilityId, patientId);
        setWorkspace(bundle);
        if (bundle.configuration) setConfiguration(bundle.configuration);
        setPatients((prev) => {
          if (prev.some((row) => row.id === bundle.identity.id)) return prev;
          const { insurance: _omit, ...row } = bundle.identity;
          return [row, ...prev];
        });
        setSelectedResult(bundle.results[0] ?? null);
        setResultDetail(null);
        const openThread = bundle.threads.find((row) => row.status === "OPEN") ?? bundle.threads[0];
        if (openThread) setThread(await fetchDigitalCareStaffThread(facilityId, openThread.id));
        else setThread(null);
        try {
          setPortalAccess(await fetchPatientPortalAccess(facilityId, patientId));
          setPortalError(null);
        } catch (accessError) {
          setPortalAccess(null);
          setIssuedCode(null);
          setIssuedExpiresAt(null);
          setPortalError(t(digitalCarePortalAccessMessageKey(accessError)));
        }
      } catch (e) {
        setError(digitalCareCaughtError(e, t));
      } finally {
        setBusy(false);
      }
    },
    [facilityId, canUse, t],
  );

  useEffect(() => {
    if (!ready || !canUse || !facilityId) return;
    const handle = window.setTimeout(() => {
      void loadRoster(0, false);
    }, 280);
    return () => window.clearTimeout(handle);
  }, [ready, canUse, facilityId, loadRoster]);

  useEffect(() => {
    if (!facilityId) return;
    return subscribeFacilityConfigurationUpdated((detail) => {
      if (detail.facilityId !== facilityId) return;
      void loadRoster(0, false);
      if (selectedId) void loadWorkspace(selectedId);
    });
  }, [facilityId, loadRoster, loadWorkspace, selectedId]);

  useEffect(() => {
    if (selectedId) {
      setIssuedCode(null);
      setIssuedExpiresAt(null);
      setCopiedCode(false);
      void loadWorkspace(selectedId);
    } else {
      setPortalAccess(null);
      setPortalError(null);
      setIssuedCode(null);
      setIssuedExpiresAt(null);
    }
  }, [selectedId, loadWorkspace]);

  useEffect(() => {
    if (tab !== "messages" || !facilityId || !thread) return;
    const timer = window.setInterval(() => {
      void fetchDigitalCareStaffThread(facilityId, thread.id).then(setThread).catch(() => undefined);
    }, 20000);
    return () => window.clearInterval(timer);
  }, [tab, facilityId, thread]);

  const visibleTabs = useMemo(
    () => digitalCareVisibleTabs(configuration ?? workspace?.configuration),
    [configuration, workspace],
  );

  useEffect(() => {
    if (!visibleTabs.includes(tab) && visibleTabs[0]) setTab(visibleTabs[0]);
  }, [visibleTabs, tab]);

  const filteredPatients = useMemo(
    () => filterDigitalCareRoster(patients, rosterFilter),
    [patients, rosterFilter],
  );
  const rosterCounts = useMemo(() => countDigitalCareRoster(patients), [patients]);

  const results = useMemo(() => {
    const list = (workspace?.results ?? []).filter((row) => digitalCareResultKindFilter(row, resultKind));
    const q = resultQuery.trim().toLowerCase();
    return q ? list.filter((row) => `${row.title} ${row.category ?? ""}`.toLowerCase().includes(q)) : list;
  }, [workspace, resultKind, resultQuery]);

  async function openResult(result: DigitalCareWorkspaceResult) {
    if (!facilityId) return;
    setSelectedResult(result);
    setTab("results");
    try {
      setResultDetail(await fetchDigitalCareResultDetail(facilityId, result.id, "VIEW"));
    } catch (e) {
      setError(digitalCareCaughtError(e, t));
    }
  }

  async function toggleRelease(result: DigitalCareWorkspaceResult) {
    if (!facilityId) return;
    const ok = window.confirm(result.released ? t("digitalCare.results.confirmRevoke") : t("digitalCare.results.confirmRelease"));
    if (!ok) return;
    setBusy(true);
    try {
      if (result.released) await revokeDigitalCareResult(facilityId, result.id);
      else await releaseDigitalCareResult(facilityId, result.id);
      if (selectedId) await loadWorkspace(selectedId);
    } catch (e) {
      setError(digitalCareCaughtError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!facilityId || !thread || !reply.trim()) return;
    setBusy(true);
    try {
      await replyDigitalCareStaffThread(facilityId, thread.id, reply.trim());
      setReply("");
      setThread(await fetchDigitalCareStaffThread(facilityId, thread.id));
    } catch (e) {
      setError(digitalCareCaughtError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function startThread() {
    if (!facilityId || !selectedId || !newSubject.trim() || !newBody.trim()) return;
    setBusy(true);
    try {
      const created = await createDigitalCareStaffThread(facilityId, selectedId, {
        category: "CLINICAL",
        subject: newSubject.trim(),
        message: newBody.trim(),
      });
      setNewSubject("");
      setNewBody("");
      setThread(created);
      if (selectedId) await loadWorkspace(selectedId);
    } catch (e) {
      setError(digitalCareCaughtError(e, t));
    } finally {
      setBusy(false);
    }
  }

  async function issuePortalActivation() {
    if (!facilityId || !selectedId || !canActivatePortal) return;
    setBusy(true);
    setPortalError(null);
    try {
      const issued = await issuePatientPortalActivation(facilityId, selectedId);
      setIssuedCode(issued.activationCode);
      setIssuedExpiresAt(issued.expiresAt);
      setCopiedCode(false);
      setPortalAccess(await fetchPatientPortalAccess(facilityId, selectedId));
      return issued;
    } catch (e) {
      setIssuedCode(null);
      setIssuedExpiresAt(null);
      setPortalError(t(digitalCarePortalAccessMessageKey(e)));
    } finally {
      setBusy(false);
    }
  }

  async function revokePortalAccessAction() {
    if (!facilityId || !selectedId || !canRevokePortal) return;
    setBusy(true);
    setPortalError(null);
    try {
      await revokePatientPortalAccess(facilityId, selectedId);
      setIssuedCode(null);
      setIssuedExpiresAt(null);
      setPortalAccess(await fetchPatientPortalAccess(facilityId, selectedId));
    } catch (e) {
      setPortalError(t(digitalCarePortalAccessMessageKey(e)));
    } finally {
      setBusy(false);
    }
  }

  async function copyActivationCode() {
    if (!issuedCode) return;
    await navigator.clipboard.writeText(issuedCode);
    setCopiedCode(true);
  }

  function openChart() {
    if (!selectedId) return;
    window.location.assign(`/app/patients/${selectedId}`);
  }

  function printCurrent() {
    if (!workspace) return;
    if (tab === "results" && (resultDetail || selectedResult)) {
      const detail = resultDetail ?? selectedResult;
      if (detail) {
        openDigitalCarePrintDocument(
          digitalCareSafeLabel(detail.title),
          digitalCareResultPrintHtml(workspace.identity.displayName, workspace.identity.mrn ?? "", detail),
        );
      }
      return;
    }
    const section = tab === "discharge" ? "discharge" : tab === "visitSummary" ? "summary" : "meds";
    openDigitalCarePrintDocument(t("digitalCare.title"), digitalCareWorkspacePrintHtml(workspace, section));
  }

  async function downloadCurrent() {
    if (!facilityId || !selectedResult) {
      printCurrent();
      return;
    }
    try {
      const detail = await fetchDigitalCareResultDetail(facilityId, selectedResult.id, "DOWNLOAD");
      openDigitalCarePrintDocument(digitalCareSafeLabel(detail.title), digitalCareResultPrintHtml(workspace?.identity.displayName ?? "", workspace?.identity.mrn ?? "", detail));
    } catch (e) {
      setError(digitalCareCaughtError(e, t));
    }
  }

  if (!ready) return <main style={{ padding: 8 }}>{t("digitalCare.loading")}</main>;
  if (!canUse) {
    return (
      <main style={{ padding: 8 }}>
        <h1>{t("digitalCare.title")}</h1>
        <p>{t("digitalCare.forbidden")}</p>
      </main>
    );
  }
  if (!facilityId) {
    return (
      <main style={{ padding: 8 }}>
        <h1>{t("digitalCare.title")}</h1>
        <p>{t("digitalCare.needFacility")}</p>
      </main>
    );
  }

  const identity = workspace?.identity;
  const outstanding = workspace?.results.filter((row) => !row.released).length ?? 0;
  const homeCount = workspace?.medications.homeSummary ? 1 : 0;
  const dischargeMeds = workspace ? medicationsByBucket(workspace.medications.ordered, "PHARMACY").length + medicationsByBucket(workspace.medications.ordered, "DISCHARGE").length : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: "#0f172a" }}>{t("digitalCare.title")}</h1>
          <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: 14 }}>{t("digitalCare.subtitle")}</p>
        </div>
        <div style={{ position: "relative" }}>
          <button
            type="button"
            onClick={() => setQuickOpen((open) => !open)}
            style={{ minHeight: 40, padding: "8px 14px", borderRadius: 12, border: "1px solid #cbd5e1", background: "white", fontWeight: 700 }}
          >
            {t("digitalCare.quickActions")}
          </button>
          {quickOpen ? (
            <div style={{ position: "absolute", right: 0, top: "110%", zIndex: 20, minWidth: 240, background: "white", border: "1px solid #e2e8f0", borderRadius: 12, boxShadow: "0 10px 30px rgba(15,23,42,.12)" }}>
              {([
                ["releaseResults", () => { setTab("results"); setQuickOpen(false); }],
                ["messagePatient", () => { setTab("messages"); setQuickOpen(false); }],
                ["generateSummary", () => { setTab("visitSummary"); printCurrent(); setQuickOpen(false); }],
                ["openChart", () => { openChart(); setQuickOpen(false); }],
                ["print", () => { printCurrent(); setQuickOpen(false); }],
                ["downloadPdf", () => { void downloadCurrent(); setQuickOpen(false); }],
                ["shareDocuments", () => { openChart(); setQuickOpen(false); }],
              ] satisfies Array<[string, () => void]>).map(([key, action]) => (
                <button key={key} type="button" onClick={action} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: 0, background: "transparent", cursor: "pointer" }}>
                  {t(`digitalCare.qa.${key}`)}
                </button>
              ))}
              <button type="button" disabled title={t("digitalCare.qa.videoVisitSoon")} style={{ display: "block", width: "100%", textAlign: "left", padding: "10px 14px", border: 0, background: "transparent", color: "#94a3b8" }}>
                {t("digitalCare.qa.videoVisit")}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div style={{ ...card, padding: 12, display: "flex", gap: 8, alignItems: "center" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <PatientSearchAndSelect
            facilityId={facilityId}
            autoSearch
            placeholder={t("digitalCare.searchPlaceholder")}
            onSelect={(patient) => setSelectedId(patient.id)}
          />
        </div>
        <button type="button" onClick={() => void loadRoster(0, false)} disabled={busy} style={{ minHeight: 40, padding: "8px 16px", borderRadius: 10, border: 0, background: "#2563eb", color: "white", fontWeight: 800 }}>
          {t("digitalCare.searchButton")}
        </button>
      </div>

      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", borderBottom: "1px solid #e2e8f0", paddingBottom: 8 }}>
        {visibleTabs.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setTab(item)}
            style={{
              border: 0,
              background: "transparent",
              padding: "8px 12px",
              fontWeight: tab === item ? 800 : 600,
              color: tab === item ? "#0f766e" : "#64748b",
              borderBottom: tab === item ? "3px solid #0f766e" : "3px solid transparent",
              cursor: "pointer",
            }}
          >
            {t(`digitalCare.tab.${item === "visitSummary" ? "visitSummary" : item}`)}
            {item === "messages" && (identity?.unreadCount ?? 0) > 0 ? (
              <span style={{ marginLeft: 6, ...chipBase, background: "#fee2e2", color: "#991b1b" }}>{identity?.unreadCount}</span>
            ) : null}
          </button>
        ))}
      </div>

      {error ? <div data-testid="digital-care-workspace-error" role="alert" style={{ padding: 12, background: "#fee2e2", color: "#991b1b", borderRadius: 12 }}>{error}</div> : null}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 280px) minmax(0, 1fr) minmax(260px, 320px)",
          gap: 14,
          alignItems: "start",
        }}
        className="digital-care-workspace-grid"
      >
        <section style={{ ...card, overflow: "hidden" }}>
          <div style={{ padding: "14px 14px 8px", display: "flex", justifyContent: "space-between" }}>
            <strong>{t("digitalCare.patients.title")}</strong>
          </div>
          <div style={{ display: "flex", gap: 6, padding: "0 12px 8px", flexWrap: "wrap" }}>
            {(["RECENT", "ACTIVE", "OBSERVATION", "DISCHARGED", "UNREAD", "ALL"] as DigitalCareRosterFilter[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setRosterFilter(item)}
                style={{
                  border: 0,
                  background: "transparent",
                  color: rosterFilter === item ? "#0f766e" : "#64748b",
                  fontWeight: rosterFilter === item ? 800 : 600,
                  fontSize: 12,
                  cursor: "pointer",
                }}
              >
                {t(`digitalCare.patients.${item === "ALL" ? "all" : item.toLowerCase()}`)}
                {item === "ACTIVE" || item === "OBSERVATION" || item === "DISCHARGED" || item === "ALL"
                  ? ` (${rosterCounts[item]})`
                  : ""}
              </button>
            ))}
          </div>
          <input
            value={rosterQuery}
            onChange={(e) => setRosterQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void loadRoster(0, false);
            }}
            placeholder={t("digitalCare.patients.search")}
            style={{ margin: "0 12px 10px", width: "calc(100% - 24px)", boxSizing: "border-box", borderRadius: 10, border: "1px solid #e2e8f0", padding: "8px 10px" }}
          />
          <div style={{ maxHeight: 720, overflowY: "auto" }}>
            {filteredPatients.length === 0 ? (
              <p style={{ padding: 16, color: "#64748b" }}>{t("digitalCare.patients.empty")}</p>
            ) : (
              filteredPatients.map((patient) => {
                const selected = patient.id === selectedId;
                const visit = digitalCareVisitStatusPresentation(patient);
                return (
                  <button
                    key={patient.id}
                    type="button"
                    onClick={() => setSelectedId(patient.id)}
                    style={{
                      display: "flex",
                      gap: 10,
                      width: "100%",
                      textAlign: "left",
                      padding: "10px 12px",
                      border: 0,
                      borderBottom: "1px solid #f1f5f9",
                      background: selected ? "#e0f2fe" : "white",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ width: 36, height: 36, borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", display: "grid", placeItems: "center", fontWeight: 800, flexShrink: 0 }}>
                      {digitalCareInitials(patient.displayName)}
                    </span>
                    <span style={{ minWidth: 0, flex: 1 }}>
                      <span style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                        <strong style={{ color: "#0f172a" }}>{digitalCareSafeLabel(patient.displayName)}</strong>
                        {patient.unreadCount > 0 ? <Chip label={String(patient.unreadCount)} tone="red" /> : null}
                      </span>
                      <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>
                        {t("digitalCare.header.mrn")} {digitalCareSafeLabel(patient.mrn)}
                      </span>
                      <span style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 11, color: visit.discharged ? "#475569" : "#0f766e", fontWeight: 700 }}>
                        <span style={{ width: 8, height: 8, borderRadius: 99, background: visit.marker }} />
                        {patient.visitType} {t(visit.statusKey)}
                        <span style={{ color: "#94a3b8", fontWeight: 500 }}>{digitalCareFormatDay(patient.arrivedAt)}</span>
                      </span>
                    </span>
                  </button>
                );
              })
            )}
          </div>
          <div style={{ padding: 12, fontSize: 12, color: "#64748b", display: "flex", justifyContent: "space-between" }}>
            <span>{fillCountTemplate(t("digitalCare.showingCount"), filteredPatients.length, rosterTotal)}</span>
            {patients.length < rosterTotal ? (
              <button type="button" onClick={() => void loadRoster(patients.length, true)} style={{ border: 0, background: "transparent", color: "#2563eb", fontWeight: 700 }}>
                {t("digitalCare.patients.loadMore")}
              </button>
            ) : null}
          </div>
        </section>

        <section style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 12 }}>
          {!identity ? (
            <div style={{ ...card, padding: 24, color: "#64748b" }}>{t("digitalCare.noPatient")}</div>
          ) : (
            <>
              <div style={{ ...card, padding: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 12, minWidth: 0 }}>
                    <span style={{ width: 48, height: 48, borderRadius: 999, background: "#dbeafe", color: "#1d4ed8", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 18 }}>
                      {digitalCareInitials(identity.displayName)}
                    </span>
                    <div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <h2 style={{ margin: 0, fontSize: 22 }}>{digitalCareSafeLabel(identity.displayName)}</h2>
                        <Chip
                          label={`${identity.visitType} ${t(digitalCareVisitStatusPresentation(identity).statusKey)}`}
                          tone={digitalCareVisitStatusPresentation(identity).tone}
                        />
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b", marginTop: 4 }}>
                        {t("digitalCare.header.mrn")} {digitalCareSafeLabel(identity.mrn)} · {t("digitalCare.header.dob")} {digitalCareFormatDay(identity.dob)}
                        {identity.ageYears != null ? ` (${identity.ageYears})` : ""} · {digitalCareSafeLabel(identity.sex)}
                      </div>
                      <div style={{ fontSize: 13, color: "#64748b" }}>
                        {t("digitalCare.header.visit")} {identity.visitType}
                        {identity.unit ? ` · ${digitalCareSafeLabel(identity.unit)}` : ""} · {t("digitalCare.header.arrived")} {digitalCareFormatWhen(identity.arrivedAt)}
                        {identity.attending ? ` · ${t("digitalCare.header.attending")} ${digitalCareSafeLabel(identity.attending)}` : ""}
                      </div>
                    </div>
                  </div>
                  <Link href={`/app/patients/${identity.id}`} style={{ color: "#2563eb", fontWeight: 800, textDecoration: "none" }}>
                    {t("digitalCare.header.openChart")}
                  </Link>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {(["results", "medications", "discharge", "messages", "visitSummary"] as DigitalCareMainTab[])
                    .filter((item) => visibleTabs.includes(item))
                    .map((item) => (
                    <button key={item} type="button" onClick={() => setTab(item)} style={{ border: 0, background: tab === item ? "#ecfeff" : "transparent", color: tab === item ? "#0f766e" : "#475569", fontWeight: 700, padding: "6px 10px", borderRadius: 8 }}>
                      {t(`digitalCare.inner.${item === "visitSummary" ? "summary" : item}`)}
                    </button>
                  ))}
                </div>
              </div>

              {tab === "results" ? (
                <ResultsPanel
                  t={t}
                  results={results}
                  selected={selectedResult}
                  detail={resultDetail}
                  kind={resultKind}
                  query={resultQuery}
                  onKind={setResultKind}
                  onQuery={setResultQuery}
                  onOpen={(row) => void openResult(row)}
                  onToggle={(row) => void toggleRelease(row)}
                  onDownload={() => void downloadCurrent()}
                  busy={busy}
                />
              ) : null}
              {tab === "messages" ? (
                <MessagesPanel
                  t={t}
                  workspace={workspace}
                  thread={thread}
                  reply={reply}
                  setReply={setReply}
                  newSubject={newSubject}
                  setNewSubject={setNewSubject}
                  newBody={newBody}
                  setNewBody={setNewBody}
                  messageQuery={messageQuery}
                  setMessageQuery={setMessageQuery}
                  onOpenThread={(id) => facilityId && void fetchDigitalCareStaffThread(facilityId, id).then(setThread)}
                  onSend={() => void sendReply()}
                  onStart={() => void startThread()}
                  onClose={() => {
                    if (!thread || !facilityId) return;
                    if (!window.confirm(t("digitalCare.messages.closeThread"))) return;
                    void closeDigitalCareStaffThread(facilityId, thread.id).then(() => {
                      if (selectedId) void loadWorkspace(selectedId);
                    });
                  }}
                  busy={busy}
                />
              ) : null}
              {tab === "medications" ? <MedicationsPanel t={t} workspace={workspace} /> : null}
              {tab === "discharge" ? <DischargePanel t={t} workspace={workspace} identity={identity} onPrint={printCurrent} /> : null}
              {tab === "visitSummary" ? <VisitPanel t={t} workspace={workspace} /> : null}
              {tab === "carePlan" ? <CarePlanPanel t={t} workspace={workspace} /> : null}
              {tab === "activity" ? <ActivityPanel t={t} workspace={workspace} /> : null}
            </>
          )}
        </section>

        <aside style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{t("digitalCare.side.patientInfo")}</strong>
              {identity ? <Link href={`/app/patients/${identity.id}`} style={{ color: "#2563eb", fontWeight: 700, textDecoration: "none" }}>{t("digitalCare.side.editChart")}</Link> : null}
            </div>
            {identity ? (
              <dl style={{ margin: "10px 0 0", display: "grid", gap: 6, fontSize: 13 }}>
                <Row label={t("digitalCare.side.name")} value={digitalCareSafeLabel(identity.displayName)} />
                <Row label={t("digitalCare.side.mrn")} value={digitalCareSafeLabel(identity.mrn)} />
                <Row label={t("digitalCare.side.dob")} value={`${digitalCareFormatDay(identity.dob)}${identity.ageYears != null ? ` (${identity.ageYears})` : ""}`} />
                <Row label={t("digitalCare.side.gender")} value={digitalCareSafeLabel(identity.sex)} />
                <Row label={t("digitalCare.side.phone")} value={digitalCareSafeLabel(identity.phone)} />
                <Row label={t("digitalCare.side.email")} value={digitalCareSafeLabel(identity.email)} />
                <Row label={t("digitalCare.side.address")} value={digitalCareSafeLabel(identity.address)} />
                <Row label={t("digitalCare.side.insurance")} value={digitalCareSafeLabel(identity.insurance)} />
                <Row label={t("digitalCare.side.primaryProvider")} value={digitalCareSafeLabel(identity.attending)} />
              </dl>
            ) : <p style={{ color: "#64748b" }}>{t("digitalCare.noPatient")}</p>}
          </div>
          {identity ? (
            <DigitalCarePatientAppAccess
              t={t}
              patientName={digitalCareSafeLabel(identity.displayName)}
              access={portalAccess}
              canActivate={canActivatePortal}
              canRevoke={canRevokePortal}
              busy={busy}
              issuedCode={issuedCode}
              issuedExpiresAt={issuedExpiresAt}
              copied={copiedCode}
              lookupFailed={Boolean(portalError)}
              lookupError={portalError}
              onActivate={issuePortalActivation}
              onRevoke={revokePortalAccessAction}
              onCopy={copyActivationCode}
              onRefresh={async () => {
                if (selectedId) await loadWorkspace(selectedId);
              }}
            />
          ) : null}
          <div style={{ ...card, padding: 16, background: "#f0fdf4" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{t("digitalCare.side.medications")}</strong>
              <button type="button" onClick={() => setTab("medications")} style={{ border: 0, background: "transparent", color: "#2563eb", fontWeight: 700 }}>{t("digitalCare.side.viewAll")}</button>
            </div>
            <div style={{ display: "flex", gap: 16, marginTop: 10 }}>
              <div><div style={{ fontSize: 22, fontWeight: 800 }}>{homeCount || (workspace?.medications.ordered.length ?? 0)}</div><div style={{ fontSize: 12, color: "#64748b" }}>{t("digitalCare.side.homeMeds")}</div></div>
              <div><div style={{ fontSize: 22, fontWeight: 800 }}>{dischargeMeds}</div><div style={{ fontSize: 12, color: "#64748b" }}>{t("digitalCare.side.dischargeMeds")}</div></div>
            </div>
          </div>
          <div style={{ ...card, padding: 16 }}>
            <strong>{t("digitalCare.side.discharge")}</strong>
            <div style={{ marginTop: 8, fontSize: 13, color: "#475569" }}>
              <div>{t("digitalCare.side.dischargeReady")}: {identity && digitalCareVisitStatusPresentation(identity).discharged ? t("digitalCare.status.discharged") : t("digitalCare.discharge.ready")}</div>
              <div>{t("digitalCare.side.outstanding")}: {outstanding}</div>
              <div>{t("digitalCare.side.unread")}: {identity?.unreadCount ?? 0}</div>
              <div>{t("digitalCare.side.recon")}: {workspace?.medications.reconComplete ? t("digitalCare.meds.reconciled") : t("digitalCare.results.pending")}</div>
              <div>{t("digitalCare.side.upcoming")}: {workspace?.appointments[0] ? digitalCareFormatWhen(workspace.appointments[0].at) : "—"}</div>
            </div>
            <button type="button" onClick={() => setTab("discharge")} style={{ marginTop: 10, width: "100%", minHeight: 38, borderRadius: 10, border: "1px solid #cbd5e1", background: "white", fontWeight: 800 }}>
              {t("digitalCare.side.viewDischarge")}
            </button>
          </div>
          <div style={{ ...card, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <strong>{t("digitalCare.side.recentMessages")}</strong>
              <button type="button" onClick={() => setTab("messages")} style={{ border: 0, background: "transparent", color: "#2563eb", fontWeight: 700 }}>{t("digitalCare.side.viewAll")}</button>
            </div>
            {(workspace?.threads ?? []).slice(0, 3).map((row) => (
              <div key={row.id} style={{ marginTop: 8, fontSize: 13 }}>
                <div style={{ fontWeight: 700 }}>{digitalCareSafeLabel(row.subject)}</div>
                <div style={{ color: "#64748b" }}>{digitalCareFormatWhen(row.lastMessageAt)}</div>
              </div>
            ))}
          </div>
        </aside>
      </div>
      <style>{`
        @media (max-width: 1100px) {
          .digital-care-workspace-grid { grid-template-columns: minmax(220px, 260px) minmax(0, 1fr) !important; }
          .digital-care-workspace-grid > aside { grid-column: 1 / -1; display: grid !important; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); }
        }
        @media (max-width: 780px) {
          .digital-care-workspace-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: 8 }}>
      <dt style={{ color: "#64748b" }}>{label}</dt>
      <dd style={{ margin: 0, fontWeight: 600 }}>{value}</dd>
    </div>
  );
}

function ResultsPanel({
  t, results, selected, detail, kind, query, onKind, onQuery, onOpen, onToggle, onDownload, busy,
}: {
  t: (key: string) => string;
  results: DigitalCareWorkspaceResult[];
  selected: DigitalCareWorkspaceResult | null;
  detail: DigitalCareResultDetail | null;
  kind: "ALL" | "LAB" | "IMAGING" | "OTHER";
  query: string;
  onKind: (kind: "ALL" | "LAB" | "IMAGING" | "OTHER") => void;
  onQuery: (value: string) => void;
  onOpen: (row: DigitalCareWorkspaceResult) => void;
  onToggle: (row: DigitalCareWorkspaceResult) => void;
  onDownload: () => void;
  busy: boolean;
}) {
  const viewer = detail ?? selected;
  const attachments = attachmentsFromResultDataAll(detail?.resultData);
  return (
    <>
      <div style={{ ...card, padding: 12 }}>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {(["ALL", "LAB", "IMAGING", "OTHER"] as const).map((item) => (
            <button key={item} type="button" onClick={() => onKind(item)} style={{ border: 0, background: kind === item ? "#e0f2fe" : "#f8fafc", borderRadius: 999, padding: "4px 10px", fontWeight: 700 }}>
              {t(`digitalCare.results.${item.toLowerCase()}`)} ({item === "ALL" ? results.length : results.filter((row) => digitalCareResultKindFilter(row, item)).length})
            </button>
          ))}
          <input value={query} onChange={(e) => onQuery(e.target.value)} placeholder={t("digitalCare.results.search")} style={{ marginLeft: "auto", border: "1px solid #e2e8f0", borderRadius: 10, padding: "6px 10px" }} />
        </div>
        {results.length === 0 ? <p style={{ color: "#64748b" }}>{t("digitalCare.results.empty")}</p> : results.map((row) => (
          <button key={row.id} type="button" onClick={() => onOpen(row)} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 10, width: "100%", textAlign: "left", padding: "12px 8px", border: 0, borderBottom: "1px solid #f1f5f9", background: selected?.id === row.id ? "#f0f9ff" : "white", cursor: "pointer" }}>
            <span>
              <strong>{digitalCareSafeLabel(row.title)}</strong>
              <span style={{ display: "block", fontSize: 12, color: "#64748b" }}>{row.category} · {digitalCareFormatWhen(row.verifiedAt)}</span>
            </span>
            <span style={{ display: "flex", gap: 6, alignItems: "center" }}>
              {row.criticalValue ? <Chip label={t("digitalCare.results.critical")} tone="red" /> : <Chip label={t("digitalCare.results.normal")} tone="green" />}
              <Chip label={row.released ? t("digitalCare.results.released") : t("digitalCare.results.notReleased")} tone={row.released ? "green" : "amber"} />
            </span>
            <span style={{ color: "#2563eb", fontWeight: 800 }}>{t("digitalCare.results.viewRelease")}</span>
          </button>
        ))}
      </div>
      {viewer ? (
        <div style={{ ...card, padding: 16, background: "#f8fafc" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <div>
              <h3 style={{ margin: 0 }}>{digitalCareSafeLabel(viewer.title)}</h3>
              <div style={{ fontSize: 12, color: "#64748b" }}>
                {t("digitalCare.results.collected")}: {digitalCareFormatWhen(viewer.collectedAt ?? viewer.clinicalAt)} · {t("digitalCare.results.verified")}: {digitalCareFormatWhen(viewer.verifiedAt)}
                {viewer.orderingProvider ? ` · ${t("digitalCare.results.orderingProvider")}: ${digitalCareSafeLabel(viewer.orderingProvider)}` : ""}
              </div>
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Chip label={viewer.criticalValue ? t("digitalCare.results.critical") : t("digitalCare.results.normal")} tone={viewer.criticalValue ? "red" : "green"} />
              <Chip label={viewer.released ? t("digitalCare.results.released") : t("digitalCare.results.notReleased")} tone={viewer.released ? "green" : "amber"} />
            </div>
          </div>
          <p style={{ color: viewer.released ? "#166534" : "#92400e", fontWeight: 700 }}>
            {viewer.released ? t("digitalCare.results.visiblePortal") : t("digitalCare.results.hiddenPortal")}
          </p>
          {(viewer.rows ?? []).length > 0 ? (
            <table style={{ width: "100%", borderCollapse: "collapse", background: "white", borderRadius: 12, overflow: "hidden" }}>
              <thead>
                <tr style={{ background: "#eff6ff" }}>
                  <th style={{ textAlign: "left", padding: 8 }}>{t("digitalCare.results.test")}</th>
                  <th style={{ textAlign: "left", padding: 8 }}>{t("digitalCare.results.value")}</th>
                  <th style={{ textAlign: "left", padding: 8 }}>{t("digitalCare.results.reference")}</th>
                  <th style={{ textAlign: "left", padding: 8 }}>{t("digitalCare.results.flag")}</th>
                </tr>
              </thead>
              <tbody>
                {(viewer.rows ?? []).map((row, index) => (
                  <tr key={`${row.test}-${index}`}>
                    <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>{row.test}</td>
                    <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>{row.result}{row.unit ? ` ${row.unit}` : ""}</td>
                    <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>{row.reference}</td>
                    <td style={{ padding: 8, borderTop: "1px solid #e2e8f0" }}>{row.flag}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : viewer.resultText ? <pre style={{ whiteSpace: "pre-wrap" }}>{viewer.resultText}</pre> : null}
          {viewer.imaging?.findings ? <p><strong>{t("digitalCare.results.findings")}</strong><br />{viewer.imaging.findings}</p> : null}
          {viewer.imaging?.impression ? <p><strong>{t("digitalCare.results.impression")}</strong><br />{viewer.imaging.impression}</p> : null}
          {attachments.length > 0 ? (
            <div>
              <strong>{t("digitalCare.results.attachments")}</strong>
              <ul>
                {attachments.map((file, index) => (
                  <li key={`${file.fileName}-${index}`}>
                    {file.dataBase64 && file.mimeType?.startsWith("image/") ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={file.fileName ?? ""} src={`data:${file.mimeType};base64,${file.dataBase64}`} style={{ maxWidth: 240, borderRadius: 8 }} />
                    ) : digitalCareSafeLabel(file.fileName)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {detail?.verifiedByName ? <p>{t("digitalCare.results.signature")}: {detail.verifiedByName}</p> : null}
          {(detail?.history ?? []).length > 0 ? (
            <div>
              <strong>{t("digitalCare.results.history")}</strong>
              <ul>{detail?.history?.map((row) => <li key={row.id}>{digitalCareFormatWhen(row.at)} · {row.action}</li>)}</ul>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" disabled={busy} onClick={() => selected && onToggle(selected)} style={{ padding: "8px 12px", borderRadius: 10, border: 0, background: selected?.released ? "white" : "#0f766e", color: selected?.released ? "#991b1b" : "white", borderColor: "#cbd5e1", fontWeight: 800 }}>
              {selected?.released ? t("digitalCare.results.revoke") : t("digitalCare.results.release")}
            </button>
            <button type="button" onClick={onDownload} style={{ padding: "8px 12px", borderRadius: 10, border: "1px solid #cbd5e1", background: "white", fontWeight: 800 }}>{t("digitalCare.results.download")}</button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function MessagesPanel({
  t, workspace, thread, reply, setReply, newSubject, setNewSubject, newBody, setNewBody, messageQuery, setMessageQuery, onOpenThread, onSend, onStart, onClose, busy,
}: {
  t: (key: string) => string;
  workspace: DigitalCareWorkspaceBundle | null;
  thread: DigitalCareStaffThread | null;
  reply: string;
  setReply: (value: string) => void;
  newSubject: string;
  setNewSubject: (value: string) => void;
  newBody: string;
  setNewBody: (value: string) => void;
  messageQuery: string;
  setMessageQuery: (value: string) => void;
  onOpenThread: (id: string) => void;
  onSend: () => void;
  onStart: () => void;
  onClose: () => void;
  busy: boolean;
}) {
  const threads = (workspace?.threads ?? []).filter((row) => row.subject.toLowerCase().includes(messageQuery.trim().toLowerCase()));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(200px,.7fr) minmax(0,1.3fr)", gap: 12 }}>
      <div style={card}>
        <div style={{ padding: 12 }}><strong>{t("digitalCare.messages.inbox")}</strong></div>
        <input value={messageQuery} onChange={(e) => setMessageQuery(e.target.value)} placeholder={t("digitalCare.messages.search")} style={{ margin: "0 12px 8px", width: "calc(100% - 24px)", boxSizing: "border-box", borderRadius: 10, border: "1px solid #e2e8f0", padding: 8 }} />
        {threads.length === 0 ? <p style={{ padding: 12, color: "#64748b" }}>{t("digitalCare.messages.empty")}</p> : threads.map((row) => (
          <button key={row.id} type="button" onClick={() => onOpenThread(row.id)} style={{ display: "block", width: "100%", textAlign: "left", padding: 12, border: 0, borderBottom: "1px solid #f1f5f9", background: thread?.id === row.id ? "#ecfeff" : "white" }}>
            <strong>{digitalCareSafeLabel(row.subject)}</strong>
            <div style={{ fontSize: 12, color: "#64748b" }}>{row.status} · {digitalCareFormatWhen(row.lastMessageAt)}</div>
          </button>
        ))}
      </div>
      <div style={{ ...card, minHeight: 360 }}>
        {!thread ? (
          <div style={{ padding: 16 }}>
            {workspace && workspace.messagingStorageAvailable === false ? (
              <p style={{ color: "#991b1b" }}>{t("digitalCare.messages.unavailable")}</p>
            ) : workspace && workspace.identity.portalActive === false ? (
              <p style={{ color: "#9a3412" }}>{t("digitalCare.messages.needPortal")}</p>
            ) : (
              <>
                <p style={{ color: "#64748b" }}>{t("digitalCare.messages.empty")}</p>
                <input value={newSubject} onChange={(e) => setNewSubject(e.target.value)} placeholder={t("digitalCare.messages.newSubject")} style={{ width: "100%", boxSizing: "border-box", marginBottom: 8, padding: 8, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <textarea value={newBody} onChange={(e) => setNewBody(e.target.value)} placeholder={t("digitalCare.messages.newBody")} rows={4} style={{ width: "100%", boxSizing: "border-box", padding: 8, borderRadius: 10, border: "1px solid #e2e8f0" }} />
                <button type="button" disabled={busy || !newSubject.trim() || !newBody.trim()} onClick={onStart} style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, border: 0, background: "#0f766e", color: "white", fontWeight: 800 }}>{t("digitalCare.messages.start")}</button>
              </>
            )}
          </div>
        ) : (
          <>
            <div style={{ padding: 12, borderBottom: "1px solid #e2e8f0", display: "flex", justifyContent: "space-between" }}>
              <strong>{digitalCareSafeLabel(thread.subject)}</strong>
              {thread.status === "OPEN" ? <button type="button" onClick={onClose}>{t("digitalCare.messages.closeThread")}</button> : <Chip label={t("digitalCare.messages.closed")} tone="slate" />}
            </div>
            <div style={{ padding: 12, maxHeight: 360, overflowY: "auto" }} data-typing="idle">
              {thread.messages.map((message) => (
                <div key={message.id} style={{ margin: "8px 0", textAlign: message.senderType === "STAFF" ? "right" : "left" }}>
                  <div style={{ fontSize: 11, color: "#64748b" }}>{message.senderType === "STAFF" ? t("digitalCare.messages.staff") : t("digitalCare.messages.patient")} · {digitalCareFormatWhen(message.createdAt)}</div>
                  <span style={{ display: "inline-block", maxWidth: "76%", padding: "9px 11px", borderRadius: 12, background: message.senderType === "STAFF" ? "#dbeafe" : "#f8fafc" }}>{message.body}</span>
                </div>
              ))}
            </div>
            {thread.status === "OPEN" ? (
              <div style={{ padding: 12, borderTop: "1px solid #e2e8f0" }}>
                <textarea value={reply} onChange={(e) => setReply(e.target.value)} maxLength={4000} rows={3} style={{ width: "100%", boxSizing: "border-box" }} placeholder={t("digitalCare.messages.reply")} />
                <button type="button" onClick={onSend} disabled={busy || !reply.trim()} style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, border: 0, background: "#0f766e", color: "white", fontWeight: 800 }}>{t("digitalCare.messages.send")}</button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function MedicationsPanel({ t, workspace }: { t: (key: string) => string; workspace: DigitalCareWorkspaceBundle | null }) {
  const items = workspace?.medications.ordered ?? [];
  const sections: Array<[string, typeof items]> = [
    ["ed", medicationsByBucket(items, "ED")],
    ["hospital", medicationsByBucket(items, "HOSPITAL")],
    ["discharge", medicationsByBucket(items, "DISCHARGE")],
    ["pending", medicationsByBucket(items, "PENDING")],
    ["pharmacy", medicationsByBucket(items, "PHARMACY")],
  ];
  return (
    <div style={{ ...card, padding: 16 }}>
      <div style={{ marginBottom: 12 }}><Chip label={workspace?.medications.reconComplete ? t("digitalCare.meds.reconciled") : t("digitalCare.results.pending")} tone={workspace?.medications.reconComplete ? "green" : "amber"} /> {t("digitalCare.meds.recon")}</div>
      <h3 style={{ margin: "0 0 8px" }}>{t("digitalCare.meds.home")}</h3>
      <p>{workspace?.medications.homeSummary?.trim() || "—"}</p>
      {sections.every(([, rows]) => rows.length === 0) ? <p style={{ color: "#64748b" }}>{t("digitalCare.meds.empty")}</p> : sections.map(([key, rows]) => rows.length === 0 ? null : (
        <div key={key} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: "0 0 8px" }}>{t(`digitalCare.meds.${key}`)}</h3>
          {rows.map((row) => (
            <div key={row.id} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9", display: "grid", gridTemplateColumns: "1.2fr .7fr .7fr .7fr .8fr", gap: 8, fontSize: 13 }}>
              <strong>{digitalCareSafeLabel(row.name)}</strong>
              <span>{row.strength ?? "—"}</span>
              <span>{row.route ?? "—"}</span>
              <span>{row.frequency ?? "—"}</span>
              <span>{row.lifecycle ?? row.itemStatus} · {digitalCareSafeLabel(row.prescriberName)}</span>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

function DischargePanel({ t, workspace, identity, onPrint }: { t: (key: string) => string; workspace: DigitalCareWorkspaceBundle | null; identity: DigitalCareRosterPatient; onPrint: () => void }) {
  const d = workspace?.discharge;
  const emailBody = encodeURIComponent([d?.instructions, d?.restrictions, d?.followUp].filter(Boolean).join("\n\n"));
  return (
    <div style={{ ...card, padding: 16 }}>
      {!d?.instructions && !d?.diagnoses.length ? <p style={{ color: "#64748b" }}>{t("digitalCare.discharge.empty")}</p> : null}
      <Section title={t("digitalCare.discharge.diagnosis")} body={d?.diagnoses.map((row) => `${row.code} ${row.description ?? ""}`).join("\n") || "—"} />
      <Section title={t("digitalCare.discharge.instructions")} body={d?.instructions} />
      <Section title={t("digitalCare.discharge.restrictions")} body={d?.restrictions} />
      <Section title={t("digitalCare.discharge.followUp")} body={d?.followUp || d?.followUpDate} />
      <Section title={t("digitalCare.discharge.provider")} body={d?.attending} />
      <Section title={t("digitalCare.discharge.schoolNote")} body={d?.schoolNote} />
      <Section title={t("digitalCare.discharge.workNote")} body={d?.workNote} />
      <p>{t("digitalCare.discharge.ack")}: {d?.acknowledgement ? "✓" : "—"}</p>
      <p>{t("digitalCare.discharge.portal")}: {d?.portalActive ? t("digitalCare.header.portalOn") : t("digitalCare.header.portalOff")}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <button type="button" onClick={onPrint} style={{ padding: "8px 12px", borderRadius: 10, fontWeight: 800 }}>{t("digitalCare.discharge.print")}</button>
        <button type="button" onClick={onPrint} style={{ padding: "8px 12px", borderRadius: 10, fontWeight: 800 }}>{t("digitalCare.discharge.summaryPdf")}</button>
        {identity.email ? <a href={`mailto:${identity.email}?subject=${encodeURIComponent(t("digitalCare.tab.discharge"))}&body=${emailBody}`} style={{ padding: "8px 12px" }}>{t("digitalCare.discharge.email")}</a> : null}
        {identity.phone ? <a href={`sms:${identity.phone}`} style={{ padding: "8px 12px" }}>{t("digitalCare.discharge.sms")}</a> : null}
      </div>
    </div>
  );
}

function VisitPanel({ t, workspace }: { t: (key: string) => string; workspace: DigitalCareWorkspaceBundle | null }) {
  const items = workspace?.timeline ?? [];
  if (items.length === 0) return <div style={{ ...card, padding: 16, color: "#64748b" }}>{t("digitalCare.visit.empty")}</div>;
  return (
    <div style={{ ...card, padding: 16 }}>
      <ol style={{ listStyle: "none", padding: 0, margin: 0, borderLeft: "3px solid #bae6fd" }}>
        {items.map((row) => (
          <li key={row.id} style={{ padding: "0 0 16px 16px", position: "relative" }}>
            <span style={{ position: "absolute", left: -7, top: 4, width: 10, height: 10, borderRadius: 99, background: "#0ea5e9" }} />
            <div style={{ fontSize: 12, color: "#64748b" }}>{digitalCareFormatWhen(row.at)} · {row.kind}</div>
            <strong>{row.title}</strong>
            {row.detail ? <div style={{ color: "#334155" }}>{row.detail}</div> : null}
          </li>
        ))}
      </ol>
    </div>
  );
}

function CarePlanPanel({ t, workspace }: { t: (key: string) => string; workspace: DigitalCareWorkspaceBundle | null }) {
  const plans = workspace?.carePlans ?? [];
  if (plans.length === 0) return <div style={{ ...card, padding: 16, color: "#64748b" }}>{t("digitalCare.care.empty")}</div>;
  return (
    <div style={{ ...card, padding: 16 }}>
      {plans.map((plan) => (
        <div key={plan.id} style={{ marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>{plan.title}</h3>
          <p style={{ color: "#64748b" }}>{plan.status} · {plan.priority}</p>
          <h4>{t("digitalCare.care.goals")}</h4>
          {plan.components.filter((c) => c.componentType === "GOAL").map((c) => <p key={c.id}>{c.title}: {c.text}</p>)}
          <h4>{t("digitalCare.care.tasks")}</h4>
          {plan.components.filter((c) => c.componentType === "INTERVENTION" && c.status !== "MET").map((c) => <p key={c.id}>{c.title}: {c.text}</p>)}
          <h4>{t("digitalCare.care.education")}</h4>
          {plan.components.filter((c) => Boolean(c.educationJson)).map((c) => <p key={c.id}>{c.title}</p>)}
        </div>
      ))}
      <h4>{t("digitalCare.care.followUp")}</h4>
      {(workspace?.followUps ?? []).map((row) => <p key={row.id}>{digitalCareFormatDay(row.dueDate)} · {row.reason ?? row.notes}</p>)}
      <h4>{t("digitalCare.care.appointments")}</h4>
      {(workspace?.appointments ?? []).map((row) => <p key={row.id}>{digitalCareFormatWhen(row.at)} · {row.reason}</p>)}
      <p>{t("digitalCare.care.portal")}: {workspace?.identity.portalActive ? t("digitalCare.header.portalOn") : t("digitalCare.header.portalOff")}</p>
      <p>{t("digitalCare.care.instructions")}: {workspace?.discharge.instructions ?? "—"}</p>
    </div>
  );
}

function ActivityPanel({ t, workspace }: { t: (key: string) => string; workspace: DigitalCareWorkspaceBundle | null }) {
  const rows = workspace?.activity ?? [];
  if (rows.length === 0) return <div style={{ ...card, padding: 16, color: "#64748b" }}>{t("digitalCare.activity.empty")}</div>;
  return (
    <div style={{ ...card, padding: 16 }}>
      {rows.map((row) => (
        <div key={row.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13 }}>
          <strong>{row.action}</strong> · {row.entityType}
          <div style={{ color: "#64748b" }}>{digitalCareFormatWhen(row.at)}</div>
        </div>
      ))}
    </div>
  );
}

function Section({ title, body }: { title: string; body?: string | null }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <h3 style={{ margin: "0 0 4px", fontSize: 14 }}>{title}</h3>
      <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{body?.trim() || "—"}</p>
    </div>
  );
}
