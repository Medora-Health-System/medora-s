"use client";

import { useCallback, useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import {
  FACILITY_MODULE_KEYS,
  resolveFacilityModuleLiveStatus,
  validateFacilityConfiguration,
  type FacilityConfigurationSettings,
} from "@medora/shared";
import { MEDORA_CARD_SHELL } from "@/components/medora-card/medoraCardTokens";
import { useI18n } from "@/lib/i18n";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import {
  fetchFacilityConfiguration,
  fetchFacilityConfigurationRevision,
  patchFacilityConfiguration,
  restoreFacilityConfiguration,
  type FacilityConfigurationDocument,
  type FacilityConfigurationRevisionDocument,
} from "@/lib/facilityConfigurationApi";
import { broadcastFacilityConfigurationUpdated } from "@/lib/facilityConfigurationEvents";
import {
  AI_SWITCHES,
  CLINICAL_RULE_SWITCHES,
  DIGITAL_CARE_SWITCHES,
  FACILITY_CONSOLE_SECTIONS,
  FACILITY_MODULE_ACCENT,
  INTEGRATION_KEYS,
  NOTIFICATION_SWITCHES,
  PATIENT_PORTAL_SWITCHES,
  SCHEDULING_SWITCHES,
  facilityConfigurationIsDirty,
  facilityConsoleEnabledProgress,
  setFacilityModuleRuntime,
  type FacilityConsoleSection,
} from "./facilityConfigurationConsoleView";

const shell: CSSProperties = {
  ...MEDORA_CARD_SHELL,
  background: MEDORA_CARD_SHELL.background,
  border: MEDORA_CARD_SHELL.border,
  borderRadius: MEDORA_CARD_SHELL.radius,
  boxShadow: MEDORA_CARD_SHELL.boxShadow,
};

function Toggle({
  on,
  disabled,
  onChange,
  label,
}: {
  on: boolean;
  disabled?: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      style={{
        width: 44,
        height: 24,
        borderRadius: 999,
        border: 0,
        padding: 2,
        background: on ? "#0f766e" : "#cbd5e1",
        cursor: disabled ? "not-allowed" : "pointer",
        transition: "background 160ms ease",
        opacity: disabled ? 0.55 : 1,
      }}
    >
      <span
        style={{
          display: "block",
          width: 20,
          height: 20,
          borderRadius: 999,
          background: "white",
          transform: on ? "translateX(20px)" : "translateX(0)",
          transition: "transform 160ms ease",
          boxShadow: "0 1px 2px rgba(15,23,42,0.2)",
        }}
      />
    </button>
  );
}

function SwitchRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <label style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: 13, fontWeight: 650, color: "#0f172a" }}>{label}</span>
      <Toggle on={on} onChange={onChange} label={label} />
    </label>
  );
}

export function FacilityConfigurationConsole({
  facilityId,
  canUsePlatformTools,
}: {
  facilityId: string;
  canUsePlatformTools?: boolean;
}) {
  const { t, language } = useI18n();
  const [document, setDocument] = useState<FacilityConfigurationDocument | null>(null);
  const [draft, setDraft] = useState<FacilityConfigurationSettings | null>(null);
  const [openSection, setOpenSection] = useState<FacilityConsoleSection | "modules">("modules");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [conflict, setConflict] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [viewedRevision, setViewedRevision] = useState<FacilityConfigurationRevisionDocument | null>(null);
  const [compareRevision, setCompareRevision] = useState<FacilityConfigurationRevisionDocument | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setConflict(false);
    setViewedRevision(null);
    setCompareRevision(null);
    const next = await fetchFacilityConfiguration(facilityId);
    setDocument(next);
    setDraft(structuredClone(next.settings));
  }, [facilityId]);

  useEffect(() => {
    void load().catch((err: unknown) => {
      setError(normalizeUserFacingError(err instanceof Error ? err.message : "", language) || t("facilityConfig.error"));
    });
  }, [load, language, t]);

  const dirty = facilityConfigurationIsDirty(document?.settings ?? null, draft);
  const progress = draft ? facilityConsoleEnabledProgress(draft.modules) : { enabled: 0, total: 0, percent: 0 };
  const issues = useMemo(() => (draft ? validateFacilityConfiguration(draft) : []), [draft]);
  const canSave = Boolean(dirty && !busy && issues.length === 0);

  async function save() {
    if (!document || !draft || !canSave) return;
    setBusy(true);
    setError(null);
    setConflict(false);
    try {
      const next = await patchFacilityConfiguration(facilityId, {
        revision: document.revision,
        reason: reason.trim() || undefined,
        settings: draft,
      });
      setDocument(next);
      setDraft(structuredClone(next.settings));
      setReason("");
      broadcastFacilityConfigurationUpdated({ facilityId, revision: next.revision });
    } catch (err: unknown) {
      const thrown = err as Error & { status?: number; code?: string };
      if (thrown.status === 409 || thrown.code === "FACILITY_CONFIGURATION_CONFLICT") {
        setConflict(true);
        setError(t("facilityConfig.conflict"));
      } else {
        setError(normalizeUserFacingError(err instanceof Error ? err.message : "", language) || t("facilityConfig.error"));
      }
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    if (!document) return;
    setDraft(structuredClone(document.settings));
    setReason("");
  }

  const previewBrand = draft?.branding;
  const liveModules = useMemo(
    () => (draft ? FACILITY_MODULE_KEYS.filter((key) => resolveFacilityModuleLiveStatus(draft.modules[key]) === "LIVE") : []),
    [draft],
  );

  if (!draft || !document) {
    return <p style={{ color: "#64748b" }}>{error ?? t("facilityConfig.loading")}</p>;
  }

  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) 320px", gap: 16, alignItems: "start" }}>
      <div>
        <div style={{ ...shell, padding: 16, marginBottom: 14, display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ fontSize: 12, fontWeight: 800, letterSpacing: 0.4, color: "#0f766e" }}>{t("facilityConfig.kicker")}</div>
            <h2 style={{ margin: "4px 0 0", fontSize: 22 }}>{t("facilityConfig.title")}</h2>
            <p style={{ margin: "6px 0 0", color: "#475569", fontSize: 13 }}>{t("facilityConfig.subtitle")}</p>
          </div>
          {dirty ? <span style={{ borderRadius: 999, padding: "4px 10px", background: "#fef3c7", color: "#92400e", fontWeight: 800, fontSize: 12 }}>{t("facilityConfig.unsaved")}</span> : <span style={{ borderRadius: 999, padding: "4px 10px", background: "#dcfce7", color: "#166534", fontWeight: 800, fontSize: 12 }}>{t("facilityConfig.saved")}</span>}
          <button type="button" onClick={() => setShowHistory((value) => !value)} style={ghostBtn}>{t("facilityConfig.history")}</button>
          <button type="button" disabled={!dirty || busy} onClick={discard} style={ghostBtn}>{t("facilityConfig.discard")}</button>
          <button type="button" disabled={!canSave} onClick={() => void save()} style={{ ...primaryBtn, opacity: canSave ? 1 : 0.5 }}>{t("facilityConfig.save")}</button>
        </div>

        {conflict ? (
          <div role="alert" style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "#fef3c7", color: "#92400e", display: "flex", gap: 12, alignItems: "center", justifyContent: "space-between" }}>
            <span>{t("facilityConfig.conflict")}</span>
            <button type="button" onClick={() => void load()} style={ghostBtn}>{t("facilityConfig.reload")}</button>
          </div>
        ) : null}
        {error && !conflict ? <div role="alert" style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "#fee2e2", color: "#991b1b" }}>{error}</div> : null}
        {issues.length > 0 ? (
          <div role="alert" style={{ marginBottom: 12, padding: 12, borderRadius: 12, background: "#fff7ed", color: "#9a3412" }}>
            <strong>{t("facilityConfig.validation.title")}</strong>
            <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
              {issues.map((issue) => (
                <li key={issue.id} style={{ fontSize: 13, marginTop: 4 }}>{t(issue.messageKey)}</li>
              ))}
            </ul>
          </div>
        ) : null}

        <label style={{ display: "block", marginBottom: 12 }}>
          <span style={{ display: "block", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{t("facilityConfig.reason")}</span>
          <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("facilityConfig.reasonPlaceholder")} style={inputStyle} />
        </label>

        {showHistory ? (
          <div style={{ ...shell, padding: 14, marginBottom: 14 }}>
            <strong>{t("facilityConfig.history")}</strong>
            <ul style={{ margin: "8px 0 0", padding: 0, listStyle: "none" }}>
              {document.history.map((row) => (
                <li key={row.id} style={{ padding: "8px 0", borderBottom: "1px solid #f1f5f9", fontSize: 13, display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                  <span>v{row.revision} · {row.changedByName ?? row.changedByUserId} · {new Date(row.createdAt).toLocaleString()} {row.reason ? `· ${row.reason}` : ""}</span>
                  <button type="button" style={ghostBtn} onClick={() => void fetchFacilityConfigurationRevision(facilityId, row.revision).then(setViewedRevision)}>
                    {t("facilityConfig.history.view")}
                  </button>
                  <button type="button" style={ghostBtn} onClick={() => void fetchFacilityConfigurationRevision(facilityId, row.revision).then(setCompareRevision)}>
                    {t("facilityConfig.history.compare")}
                  </button>
                  <button
                    type="button"
                    style={ghostBtn}
                    disabled={busy}
                    onClick={() => {
                      if (!window.confirm(t("facilityConfig.history.restoreConfirm"))) return;
                      setBusy(true);
                      restoreFacilityConfiguration(facilityId, {
                        revision: document.revision,
                        restoreRevision: row.revision,
                        reason: reason.trim() || t("facilityConfig.history.restoreReason"),
                      })
                        .then((next) => {
                          setDocument(next);
                          setDraft(structuredClone(next.settings));
                          broadcastFacilityConfigurationUpdated({ facilityId, revision: next.revision });
                        })
                        .catch((err: unknown) => {
                          const thrown = err as Error & { status?: number; code?: string };
                          if (thrown.status === 409 || thrown.code === "FACILITY_CONFIGURATION_CONFLICT") {
                            setConflict(true);
                            setError(t("facilityConfig.conflict"));
                          } else {
                            setError(normalizeUserFacingError(err instanceof Error ? err.message : "", language) || t("facilityConfig.error"));
                          }
                        })
                        .finally(() => setBusy(false));
                    }}
                  >
                    {t("facilityConfig.history.restore")}
                  </button>
                </li>
              ))}
            </ul>
            {viewedRevision ? (
              <pre style={{ marginTop: 12, maxHeight: 220, overflow: "auto", fontSize: 11, background: "#f8fafc", padding: 10, borderRadius: 10 }}>
                {JSON.stringify({ revision: viewedRevision.revision, settings: viewedRevision.settings }, null, 2)}
              </pre>
            ) : null}
            {compareRevision ? (
              <ul style={{ marginTop: 12, paddingLeft: 18, fontSize: 12 }}>
                {compareRevision.diffFromCurrent.length === 0 ? <li>{t("facilityConfig.history.noDiff")}</li> : compareRevision.diffFromCurrent.map((change) => (
                  <li key={change.path}><code>{change.path}</code></li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}

        <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 12 }}>
          {FACILITY_CONSOLE_SECTIONS.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => setOpenSection(section)}
              style={{
                border: 0,
                borderRadius: 999,
                padding: "8px 12px",
                fontWeight: 800,
                fontSize: 12,
                background: openSection === section ? "#0f766e" : "#e2e8f0",
                color: openSection === section ? "white" : "#334155",
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              {t(`facilityConfig.section.${section}`)}
            </button>
          ))}
        </div>

        {openSection === "modules" ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10 }}>
            {FACILITY_MODULE_KEYS.map((key) => {
              const mod = draft.modules[key];
              const accent = FACILITY_MODULE_ACCENT[key];
              const status = resolveFacilityModuleLiveStatus(mod);
              return (
                <article key={key} style={{ ...shell, overflow: "hidden" }}>
                  <div style={{ height: 6, background: accent.bar }} />
                  <div style={{ padding: 12, background: accent.bg }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ color: accent.text }}>{t(`facilityConfig.module.${key}`)}</strong>
                      <span style={{ fontSize: 11, fontWeight: 800, color: accent.text }}>{t(`facilityConfig.status.${status}`)}</span>
                    </div>
                    {(["enabled", "visible", "maintenance", "readOnly", "hidden"] as const).map((flag) => (
                      <div key={flag} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                        <span style={{ fontSize: 12 }}>{t(`facilityConfig.flag.${flag}`)}</span>
                        <Toggle
                          on={Boolean(mod[flag])}
                          label={`${t(`facilityConfig.module.${key}`)} ${t(`facilityConfig.flag.${flag}`)}`}
                          onChange={(next) =>
                            setDraft({
                              ...draft,
                              modules: {
                                ...draft.modules,
                                [key]: setFacilityModuleRuntime(mod, { [flag]: next }),
                              },
                            })
                          }
                        />
                      </div>
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {openSection === "digitalCare" ? (
          <Panel title={t("facilityConfig.section.digitalCare")}>
            {DIGITAL_CARE_SWITCHES.map((key) => (
              <SwitchRow
                key={key}
                label={t(`facilityConfig.digitalCare.${key}`)}
                on={draft.digitalCare[key]}
                onChange={(next) => {
                  const digitalCare = { ...draft.digitalCare, [key]: next };
                  if (key === "autoRelease") digitalCare.manualRelease = !next;
                  if (key === "manualRelease") digitalCare.autoRelease = !next;
                  setDraft({ ...draft, digitalCare });
                }}
              />
            ))}
          </Panel>
        ) : null}

        {openSection === "patientPortal" ? (
          <Panel title={t("facilityConfig.section.patientPortal")}>
            {PATIENT_PORTAL_SWITCHES.map((key) => (
              <SwitchRow
                key={key}
                label={t(`facilityConfig.portal.${key}`)}
                on={draft.patientPortal[key]}
                onChange={(next) => setDraft({ ...draft, patientPortal: { ...draft.patientPortal, [key]: next } })}
              />
            ))}
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t("facilityConfig.portal.language")}</span>
              <select
                value={draft.patientPortal.language}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    patientPortal: { ...draft.patientPortal, language: e.target.value as "fr" | "en" | "es" },
                  })
                }
                style={{ ...inputStyle, marginTop: 4 }}
              >
                <option value="fr">Français</option>
                <option value="en">English</option>
                <option value="es">Español</option>
              </select>
            </label>
          </Panel>
        ) : null}

        {openSection === "branding" ? (
          <Panel title={t("facilityConfig.section.branding")}>
            {(["hospitalName", "patientAppName", "hospitalLogoUrl", "portalLogoUrl", "faviconUrl", "welcomeScreen", "footer"] as const).map((key) => (
              <label key={key} style={{ display: "block", marginBottom: 10 }}>
                <span style={{ fontSize: 12, fontWeight: 700 }}>{t(`facilityConfig.branding.${key}`)}</span>
                {key === "welcomeScreen" || key === "footer" ? (
                  <textarea
                    value={draft.branding[key]}
                    onChange={(e) => setDraft({ ...draft, branding: { ...draft.branding, [key]: e.target.value } })}
                    style={{ ...inputStyle, minHeight: 72, marginTop: 4 }}
                  />
                ) : (
                  <input
                    value={draft.branding[key]}
                    onChange={(e) => setDraft({ ...draft, branding: { ...draft.branding, [key]: e.target.value } })}
                    style={{ ...inputStyle, marginTop: 4 }}
                  />
                )}
              </label>
            ))}
            {(["primaryColor", "secondaryColor", "accentColor"] as const).map((key) => (
              <label key={key} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                <span style={{ width: 140, fontSize: 12, fontWeight: 700 }}>{t(`facilityConfig.branding.${key}`)}</span>
                <input
                  type="color"
                  value={draft.branding[key] || "#0f766e"}
                  onChange={(e) => setDraft({ ...draft, branding: { ...draft.branding, [key]: e.target.value } })}
                />
                <input
                  value={draft.branding[key]}
                  onChange={(e) => setDraft({ ...draft, branding: { ...draft.branding, [key]: e.target.value } })}
                  style={{ ...inputStyle, flex: 1 }}
                />
              </label>
            ))}
          </Panel>
        ) : null}

        {openSection === "notifications" ? (
          <Panel title={t("facilityConfig.section.notifications")}>
            {NOTIFICATION_SWITCHES.map((key) => (
              <SwitchRow
                key={key}
                label={t(`facilityConfig.notifications.${key}`)}
                on={draft.notifications[key]}
                onChange={(next) => setDraft({ ...draft, notifications: { ...draft.notifications, [key]: next } })}
              />
            ))}
          </Panel>
        ) : null}

        {openSection === "clinicalRules" ? (
          <Panel title={t("facilityConfig.section.clinicalRules")}>
            {CLINICAL_RULE_SWITCHES.map((key) => (
              <SwitchRow
                key={key}
                label={t(`facilityConfig.clinicalRules.${key}`)}
                on={draft.clinicalRules[key]}
                onChange={(next) => setDraft({ ...draft, clinicalRules: { ...draft.clinicalRules, [key]: next } })}
              />
            ))}
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t("facilityConfig.clinicalRules.autoResultReleaseDelayMinutes")}</span>
              <input
                type="number"
                min={0}
                max={10080}
                value={draft.clinicalRules.autoResultReleaseDelayMinutes}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    clinicalRules: { ...draft.clinicalRules, autoResultReleaseDelayMinutes: Number(e.target.value) || 0 },
                  })
                }
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
          </Panel>
        ) : null}

        {openSection === "scheduling" ? (
          <Panel title={t("facilityConfig.section.scheduling")}>
            {SCHEDULING_SWITCHES.map((key) => (
              <SwitchRow
                key={key}
                label={t(`facilityConfig.scheduling.${key}`)}
                on={draft.scheduling[key]}
                onChange={(next) => setDraft({ ...draft, scheduling: { ...draft.scheduling, [key]: next } })}
              />
            ))}
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t("facilityConfig.scheduling.defaultVisitDurationMinutes")}</span>
              <input
                type="number"
                min={5}
                max={240}
                value={draft.scheduling.defaultVisitDurationMinutes}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    scheduling: { ...draft.scheduling, defaultVisitDurationMinutes: Number(e.target.value) || 20 },
                  })
                }
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
          </Panel>
        ) : null}

        {openSection === "ai" ? (
          <Panel title={t("facilityConfig.section.ai")}>
            {AI_SWITCHES.map((key) => (
              <SwitchRow
                key={key}
                label={t(`facilityConfig.ai.${key}`)}
                on={draft.ai[key]}
                onChange={(next) => setDraft({ ...draft, ai: { ...draft.ai, [key]: next } })}
              />
            ))}
          </Panel>
        ) : null}

        {openSection === "security" ? (
          <Panel title={t("facilityConfig.section.security")}>
            <SwitchRow
              label={t("facilityConfig.security.requireMfa")}
              on={draft.security.requireMfa}
              onChange={(next) => setDraft({ ...draft, security: { ...draft.security, requireMfa: next } })}
            />
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t("facilityConfig.security.minPasswordLength")}</span>
              <input
                type="number"
                min={12}
                max={64}
                value={draft.security.minPasswordLength}
                onChange={(e) =>
                  setDraft({ ...draft, security: { ...draft.security, minPasswordLength: Number(e.target.value) || 12 } })
                }
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t("facilityConfig.security.sessionTimeoutMinutes")}</span>
              <input
                type="number"
                min={5}
                max={1440}
                value={draft.security.sessionTimeoutMinutes}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    security: { ...draft.security, sessionTimeoutMinutes: Number(e.target.value) || 30 },
                  })
                }
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t("facilityConfig.security.allowedDevices")}</span>
              <select
                value={draft.security.allowedDevices}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    security: { ...draft.security, allowedDevices: e.target.value as "ALL" | "MANAGED" },
                  })
                }
                style={{ ...inputStyle, marginTop: 4 }}
              >
                <option value="ALL">{t("facilityConfig.security.devicesAll")}</option>
                <option value="MANAGED">{t("facilityConfig.security.devicesManaged")}</option>
              </select>
            </label>
            <label style={{ display: "block", marginTop: 12 }}>
              <span style={{ fontSize: 12, fontWeight: 700 }}>{t("facilityConfig.security.auditRetentionDays")}</span>
              <input
                type="number"
                min={30}
                max={3650}
                value={draft.security.auditRetentionDays}
                onChange={(e) =>
                  setDraft({ ...draft, security: { ...draft.security, auditRetentionDays: Number(e.target.value) || 365 } })
                }
                style={{ ...inputStyle, marginTop: 4 }}
              />
            </label>
          </Panel>
        ) : null}

        {openSection === "integrations" ? (
          <Panel title={t("facilityConfig.section.integrations")}>
            {INTEGRATION_KEYS.map((key) => (
              <div key={key} style={{ padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 13 }}>{t(`facilityConfig.integrations.${key}`)}</strong>
                  <Toggle
                    on={draft.integrations[key].enabled}
                    label={t(`facilityConfig.integrations.${key}`)}
                    onChange={(next) =>
                      setDraft({
                        ...draft,
                        integrations: { ...draft.integrations, [key]: { ...draft.integrations[key], enabled: next } },
                      })
                    }
                  />
                </div>
                <input
                  value={draft.integrations[key].endpoint}
                  placeholder={t("facilityConfig.integrations.endpoint")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      integrations: { ...draft.integrations, [key]: { ...draft.integrations[key], endpoint: e.target.value } },
                    })
                  }
                  style={{ ...inputStyle, marginTop: 8 }}
                />
              </div>
            ))}
          </Panel>
        ) : null}

      </div>

      <aside style={{ ...shell, padding: 14, position: "sticky", top: 16 }}>
        <div style={{ fontSize: 12, fontWeight: 800, color: "#0f766e" }}>{t("facilityConfig.preview.title")}</div>
        <div style={{ marginTop: 10, padding: 12, borderRadius: 12, background: previewBrand?.primaryColor || "#0f766e", color: "white" }}>
          <div style={{ fontWeight: 800 }}>{previewBrand?.hospitalName || document.facility.name}</div>
          <div style={{ fontSize: 12, opacity: 0.9 }}>{previewBrand?.patientAppName}</div>
        </div>
        <p style={{ fontSize: 13, color: "#475569" }}>{previewBrand?.welcomeScreen || t("facilityConfig.preview.welcomeEmpty")}</p>
        <div style={{ height: 8, borderRadius: 999, background: "#e2e8f0", overflow: "hidden" }}>
          <div style={{ width: `${progress.percent}%`, height: "100%", background: "#0f766e", transition: "width 200ms ease" }} />
        </div>
        <div style={{ fontSize: 12, marginTop: 6, color: "#64748b" }}>{t("facilityConfig.preview.modulesOn").replace("{count}", String(progress.enabled))}</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {liveModules.map((key) => (
            <span key={key} style={{ fontSize: 11, fontWeight: 800, padding: "3px 8px", borderRadius: 999, background: FACILITY_MODULE_ACCENT[key].bg, color: FACILITY_MODULE_ACCENT[key].text }}>
              {t(`facilityConfig.module.${key}`)}
            </span>
          ))}
        </div>
        <PreviewBlock title={t("facilityConfig.preview.portal")} color={previewBrand?.secondaryColor || "#1d4ed8"}>
          {draft.patientPortal.enabled ? t("facilityConfig.preview.portalOn") : t("facilityConfig.preview.portalOff")}
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {draft.patientPortal.messages ? t("facilityConfig.portal.messages") : t("facilityConfig.preview.hidden")} · {draft.patientPortal.invoices ? t("facilityConfig.portal.invoices") : t("facilityConfig.preview.noBilling")}
          </div>
        </PreviewBlock>
        <PreviewBlock title={t("facilityConfig.preview.digitalCare")} color="#0f766e">
          {draft.digitalCare.secureMessaging ? t("facilityConfig.digitalCare.secureMessaging") : t("facilityConfig.preview.messagingOff")}
          <div style={{ fontSize: 12, marginTop: 4 }}>
            {draft.digitalCare.autoRelease ? t("facilityConfig.digitalCare.autoRelease") : t("facilityConfig.digitalCare.manualRelease")}
          </div>
        </PreviewBlock>
        <PreviewBlock title={t("facilityConfig.preview.provider")} color="#334155">
          {liveModules.slice(0, 4).map((key) => t(`facilityConfig.module.${key}`)).join(" · ") || t("facilityConfig.preview.none")}
        </PreviewBlock>
        <PreviewBlock title={t("facilityConfig.preview.patientApp")} color={previewBrand?.accentColor || "#d97706"}>
          {previewBrand?.patientAppName} · {draft.patientPortal.language.toUpperCase()}
        </PreviewBlock>
      </aside>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section style={{ ...shell, padding: 16 }}>
      <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>{title}</h3>
      {children}
    </section>
  );
}

function PreviewBlock({ title, color, children }: { title: string; color: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: 12, padding: 10, borderRadius: 12, border: `1px solid ${color}33`, background: `${color}10` }}>
      <div style={{ fontSize: 11, fontWeight: 800, color }}>{title}</div>
      <div style={{ fontSize: 13, marginTop: 4 }}>{children}</div>
    </div>
  );
}

const ghostBtn: CSSProperties = {
  minHeight: 36,
  padding: "6px 12px",
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  background: "white",
  fontWeight: 700,
  color: "#0f172a",
  cursor: "pointer",
};

const primaryBtn: CSSProperties = {
  minHeight: 36,
  padding: "6px 14px",
  borderRadius: 10,
  border: 0,
  background: "#0f766e",
  color: "white",
  fontWeight: 800,
  cursor: "pointer",
};

const inputStyle: CSSProperties = {
  width: "100%",
  minHeight: 38,
  borderRadius: 10,
  border: "1px solid #cbd5e1",
  padding: "8px 10px",
};

