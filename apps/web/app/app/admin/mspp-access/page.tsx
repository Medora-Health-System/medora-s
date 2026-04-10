"use client";

import Link from "next/link";
import React, { useCallback, useEffect, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { MSPP_OPERATIONAL_ROLE_CODES, MSPP_ROLE_CODES } from "@/lib/landingRoute";
import {
  createMsppAccessAssignment,
  fetchGeoDepartmentsForMspp,
  fetchMsppAccessAssignments,
  msppOnboardWizard,
  patchMsppAccessAssignment,
  type GeoDepartmentOption,
  type MsppAccessAssignmentRow,
} from "@/lib/adminMsppAccessApi";

function roleLabel(t: (key: string) => string, code: string): string {
  const key = `adminMsppAccess.roles.${code}`;
  const out = t(key);
  return out === key ? code : out;
}

export default function AdminMsppAccessPage() {
  const { t } = useI18n();
  const { ready, canCreateFacilities, msppRoles } = useFacilityAndRoles();
  const canManageMsppAccess =
    canCreateFacilities === true || msppRoles.includes("MSPP_ADMIN");
  const isDelegatedMsppAdmin = canManageMsppAccess && !canCreateFacilities;
  const [items, setItems] = useState<MsppAccessAssignmentRow[]>([]);
  const [geo, setGeo] = useState<GeoDepartmentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ ok: boolean; message: string } | null>(null);

  const [createEmail, setCreateEmail] = useState("");
  const [createRole, setCreateRole] = useState<string>(MSPP_ROLE_CODES[0]);
  const [createGeoId, setCreateGeoId] = useState("");
  const [creating, setCreating] = useState(false);

  const [editing, setEditing] = useState<{
    id: string;
    role: string;
    geoDepartmentId: string;
  } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  const [togglingId, setTogglingId] = useState<string | null>(null);

  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardFirstName, setWizardFirstName] = useState("");
  const [wizardLastName, setWizardLastName] = useState("");
  const [wizardEmail, setWizardEmail] = useState("");
  const [wizardPassword, setWizardPassword] = useState("");
  const [wizardRole, setWizardRole] = useState<string>(MSPP_ROLE_CODES[0]);
  const [wizardGeoId, setWizardGeoId] = useState("");
  const [wizardMsppActive, setWizardMsppActive] = useState(true);
  const [wizardSubmitting, setWizardSubmitting] = useState(false);

  const openWizard = useCallback(() => {
    setWizardFirstName("");
    setWizardLastName("");
    setWizardEmail("");
    setWizardPassword("");
    setWizardRole(MSPP_ROLE_CODES[0]);
    setWizardGeoId("");
    setWizardMsppActive(true);
    setWizardOpen(true);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    let assignmentsOk = false;
    let geoOk = false;
    try {
      const a = await fetchMsppAccessAssignments();
      setItems(a.items ?? []);
      assignmentsOk = true;
    } catch {
      setItems([]);
    }
    try {
      const g = await fetchGeoDepartmentsForMspp();
      setGeo(g.items ?? []);
      geoOk = true;
    } catch {
      setGeo([]);
    }
    if (!assignmentsOk) {
      setToast({ ok: false, message: t("adminMsppAccess.errorLoad") });
    } else if (!geoOk) {
      setToast({ ok: false, message: t("adminMsppAccess.errorGeoLoad") });
    }
    setLoading(false);
  }, [t]);

  useEffect(() => {
    if (!ready || !canManageMsppAccess) return;
    void load();
  }, [ready, canManageMsppAccess, load]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!wizardOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setWizardOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [wizardOpen]);

  const showDept = (role: string) => role === "MSPP_VALIDATOR_DEPT";

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!createEmail.trim()) return;
    if (showDept(createRole) && !createGeoId.trim()) {
      setToast({ ok: false, message: t("adminMsppAccess.validationGeoRequired") });
      return;
    }
    setCreating(true);
    try {
      await createMsppAccessAssignment({
        email: createEmail.trim(),
        role: createRole,
        geoDepartmentId: showDept(createRole) ? createGeoId || null : null,
      });
      setToast({ ok: true, message: t("adminMsppAccess.successCreate") });
      setCreateEmail("");
      setCreateGeoId("");
      await load();
    } catch (err) {
      setToast({
        ok: false,
        message: err instanceof Error ? err.message : t("adminMsppAccess.errorLoad"),
      });
    } finally {
      setCreating(false);
    }
  };

  const handleWizardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wizardFirstName.trim() || !wizardLastName.trim() || !wizardEmail.trim()) return;
    if (showDept(wizardRole) && !wizardGeoId.trim()) {
      setToast({ ok: false, message: t("adminMsppAccess.validationGeoRequired") });
      return;
    }
    const pw = wizardPassword.trim();
    if (pw.length > 0 && pw.length < 8) {
      setToast({ ok: false, message: t("adminMsppAccess.validationPasswordMin") });
      return;
    }
    setWizardSubmitting(true);
    try {
      const res = await msppOnboardWizard({
        firstName: wizardFirstName.trim(),
        lastName: wizardLastName.trim(),
        email: wizardEmail.trim(),
        role: wizardRole,
        geoDepartmentId: showDept(wizardRole) ? wizardGeoId || null : null,
        msppAssignmentActive: wizardMsppActive,
        ...(pw.length >= 8 ? { password: pw } : {}),
      });
      setToast({
        ok: true,
        message: res.userCreated ? t("adminMsppAccess.successOnboardNew") : t("adminMsppAccess.successOnboardExisting"),
      });
      setWizardOpen(false);
      await load();
    } catch (err) {
      setToast({
        ok: false,
        message: err instanceof Error ? err.message : t("adminMsppAccess.errorLoad"),
      });
    } finally {
      setWizardSubmitting(false);
    }
  };

  const startEdit = (row: MsppAccessAssignmentRow) => {
    setEditing({
      id: row.id,
      role: row.role,
      geoDepartmentId: row.geoDepartmentId ?? "",
    });
  };

  const saveEdit = async () => {
    if (!editing) return;
    if (showDept(editing.role) && !editing.geoDepartmentId.trim()) {
      setToast({ ok: false, message: t("adminMsppAccess.validationGeoRequired") });
      return;
    }
    setSavingEdit(true);
    try {
      await patchMsppAccessAssignment(editing.id, {
        role: editing.role,
        geoDepartmentId: showDept(editing.role) ? editing.geoDepartmentId || null : null,
      });
      setToast({ ok: true, message: t("adminMsppAccess.successUpdate") });
      setEditing(null);
      await load();
    } catch (err) {
      setToast({
        ok: false,
        message: err instanceof Error ? err.message : t("adminMsppAccess.errorLoad"),
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const toggleActive = async (row: MsppAccessAssignmentRow) => {
    setTogglingId(row.id);
    try {
      await patchMsppAccessAssignment(row.id, { isActive: !row.isActive });
      setToast({ ok: true, message: t("adminMsppAccess.successUpdate") });
      await load();
    } catch (err) {
      setToast({
        ok: false,
        message: err instanceof Error ? err.message : t("adminMsppAccess.errorLoad"),
      });
    } finally {
      setTogglingId(null);
    }
  };

  if (!ready) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("adminMsppAccess.loading")}</p>
      </div>
    );
  }

  if (!canManageMsppAccess) {
    return (
      <div style={{ padding: 24 }}>
        <p style={{ color: "#b91c1c" }}>{t("adminMsppAccess.forbidden")}</p>
        <Link href="/app" style={{ color: "#2563eb" }}>
          {t("navGroups.accueil")}
        </Link>
      </div>
    );
  }

  const rowLockedForActor = (row: MsppAccessAssignmentRow) =>
    isDelegatedMsppAdmin && row.userIsPlatformPrincipal === true;

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      <h1 style={{ marginTop: 0 }}>{t("adminMsppAccess.title")}</h1>
      <p style={{ color: "#555", maxWidth: 720 }}>
        {isDelegatedMsppAdmin ? t("adminMsppAccess.introDelegated") : t("adminMsppAccess.intro")}
      </p>

      <div style={{ marginBottom: 16 }}>
        <button
          type="button"
          onClick={openWizard}
          style={{
            padding: "10px 18px",
            borderRadius: 10,
            border: "none",
            background: "#0f766e",
            color: "#fff",
            fontWeight: 600,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          {t("adminMsppAccess.wizardButton")}
        </button>
      </div>

      {toast ? (
        <p
          role="status"
          aria-live="polite"
          style={{
            padding: "10px 14px",
            borderRadius: 8,
            backgroundColor: toast.ok ? "rgba(22,163,74,0.12)" : "rgba(185,28,28,0.1)",
            color: toast.ok ? "#166534" : "#991b1b",
          }}
        >
          {toast.message}
        </p>
      ) : null}

      <section
        style={{
          marginTop: 16,
          marginBottom: 16,
          padding: "14px 16px",
          border: "1px solid #cbd5e1",
          borderRadius: 12,
          background: "#fff",
        }}
      >
        <h2 style={{ margin: "0 0 10px 0", fontSize: 15, fontWeight: 700, color: "#0f172a" }}>
          {t("adminMsppAccess.onboardingTitle")}
        </h2>
        <ol style={{ margin: "0 0 12px 0", paddingLeft: 20, color: "#475569", fontSize: 14, lineHeight: 1.55 }}>
          <li style={{ marginBottom: 6 }}>{t("adminMsppAccess.onboardingStep1")}</li>
          <li style={{ marginBottom: 6 }}>{t("adminMsppAccess.onboardingStep2")}</li>
          <li>{t("adminMsppAccess.onboardingStep3")}</li>
        </ol>
        {canCreateFacilities ? (
          <Link
            href="/app/admin/users"
            style={{
              display: "inline-block",
              padding: "8px 14px",
              borderRadius: 8,
              border: "1px solid #1a1a1a",
              color: "#1a1a1a",
              fontWeight: 600,
              fontSize: 13,
              textDecoration: "none",
            }}
          >
            {t("adminMsppAccess.linkFacilityUsers")}
          </Link>
        ) : null}
      </section>

      <section
        style={{
          marginTop: 20,
          marginBottom: 28,
          padding: 16,
          border: "1px solid #e2e8f0",
          borderRadius: 16,
          background: "#f8fafc",
        }}
      >
        <h2 style={{ marginTop: 0, fontSize: 16 }}>{t("adminMsppAccess.createSectionQuick")}</h2>
        <form onSubmit={handleCreate} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 400 }}>
            <span>{t("adminMsppAccess.email")}</span>
            <input
              type="email"
              required
              value={createEmail}
              onChange={(e) => setCreateEmail(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
              autoComplete="off"
            />
          </label>
          <label style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 400 }}>
            <span>{t("adminMsppAccess.role")}</span>
            <select
              value={createRole}
              onChange={(e) => setCreateRole(e.target.value)}
              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
            >
              {MSPP_ROLE_CODES.map((c) => (
                <option key={c} value={c}>
                  {roleLabel(t, c)}
                </option>
              ))}
            </select>
          </label>
          {showDept(createRole) ? (
            <label style={{ display: "flex", flexDirection: "column", gap: 4, maxWidth: 400 }}>
              <span>{t("adminMsppAccess.geoDepartment")}</span>
              <select
                required
                value={createGeoId}
                onChange={(e) => setCreateGeoId(e.target.value)}
                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
              >
                <option value="">—</option>
                {geo.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name} ({g.code})
                  </option>
                ))}
              </select>
              <span style={{ fontSize: 12, color: "#64748b" }}>{t("adminMsppAccess.geoHint")}</span>
              {!loading && geo.length === 0 ? (
                <span style={{ fontSize: 12, color: "#b45309", lineHeight: 1.45 }} role="status">
                  {t("adminMsppAccess.geoListEmptyHint")}
                </span>
              ) : null}
            </label>
          ) : null}
          <div>
            <button
              type="submit"
              disabled={creating || (showDept(createRole) && geo.length === 0)}
              style={{
                padding: "10px 18px",
                borderRadius: 10,
                border: "none",
                background: "#1a1a1a",
                color: "#fff",
                fontWeight: 600,
                cursor: creating ? "default" : "pointer",
              }}
            >
              {creating ? t("adminMsppAccess.loading") : t("adminMsppAccess.submitCreate")}
            </button>
          </div>
        </form>
      </section>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
        <h2 style={{ margin: 0, fontSize: 16 }}>{t("adminMsppAccess.tableTitle")}</h2>
        <button
          type="button"
          onClick={() => void load()}
          style={{
            padding: "6px 12px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "#fff",
            cursor: "pointer",
          }}
        >
          {t("adminMsppAccess.refresh")}
        </button>
      </div>

      {loading ? (
        <p>{t("adminMsppAccess.loading")}</p>
      ) : items.length === 0 ? (
        <p style={{ color: "#64748b" }}>{t("adminMsppAccess.empty")}</p>
      ) : (
        <div style={{ overflowX: "auto", border: "1px solid #e2e8f0", borderRadius: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
            <thead>
              <tr style={{ background: "#f1f5f9", textAlign: "left" }}>
                <th style={{ padding: "10px 12px" }}>{t("adminMsppAccess.colUser")}</th>
                <th style={{ padding: "10px 12px" }}>{t("adminMsppAccess.colRole")}</th>
                <th style={{ padding: "10px 12px" }}>{t("adminMsppAccess.colDept")}</th>
                <th style={{ padding: "10px 12px" }}>{t("adminMsppAccess.colAssignment")}</th>
                <th style={{ padding: "10px 12px" }}>{t("adminMsppAccess.colAccount")}</th>
                <th style={{ padding: "10px 12px" }}>{t("adminMsppAccess.colActions")}</th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => (
                <React.Fragment key={row.id}>
                  <tr style={{ borderTop: "1px solid #e2e8f0" }}>
                    <td style={{ padding: "10px 12px" }}>
                      <div style={{ fontWeight: 600 }}>
                        {row.userFirstName} {row.userLastName}
                      </div>
                      <div style={{ color: "#64748b", fontSize: 13 }}>{row.userEmail}</div>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{roleLabel(t, row.role)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {row.geoDepartmentName
                        ? `${row.geoDepartmentName}${row.geoDepartmentCode ? ` (${row.geoDepartmentCode})` : ""}`
                        : "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {row.isActive ? t("adminMsppAccess.active") : t("adminMsppAccess.inactive")}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {row.userAccountActive ? t("adminMsppAccess.active") : t("adminMsppAccess.inactive")}
                    </td>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      {rowLockedForActor(row) ? (
                        <span style={{ fontSize: 13, color: "#64748b" }} title={t("adminMsppAccess.platformPrincipalProtectedHint")}>
                          {t("adminMsppAccess.platformPrincipalProtected")}
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => (editing?.id === row.id ? setEditing(null) : startEdit(row))}
                            style={{
                              marginRight: 8,
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              cursor: "pointer",
                            }}
                          >
                            {editing?.id === row.id ? t("adminMsppAccess.cancel") : t("adminMsppAccess.edit")}
                          </button>
                          <button
                            type="button"
                            disabled={togglingId === row.id}
                            onClick={() => void toggleActive(row)}
                            style={{
                              padding: "6px 10px",
                              borderRadius: 8,
                              border: "1px solid #cbd5e1",
                              background: "#fff",
                              cursor: togglingId === row.id ? "default" : "pointer",
                            }}
                          >
                            {row.isActive ? t("adminMsppAccess.deactivate") : t("adminMsppAccess.reactivate")}
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                  {editing?.id === row.id ? (
                    <tr style={{ background: "#fafafa" }}>
                      <td colSpan={6} style={{ padding: "12px 16px" }}>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
                          <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                            <span>{t("adminMsppAccess.role")}</span>
                            <select
                              value={editing.role}
                              onChange={(e) => setEditing({ ...editing, role: e.target.value })}
                              style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", minWidth: 220 }}
                            >
                              {MSPP_ROLE_CODES.map((c) => (
                                <option key={c} value={c}>
                                  {roleLabel(t, c)}
                                </option>
                              ))}
                            </select>
                          </label>
                          {showDept(editing.role) ? (
                            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                              <span>{t("adminMsppAccess.geoDepartment")}</span>
                              <select
                                required
                                value={editing.geoDepartmentId}
                                onChange={(e) => setEditing({ ...editing, geoDepartmentId: e.target.value })}
                                style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1", minWidth: 220 }}
                              >
                                <option value="">—</option>
                                {geo.map((g) => (
                                  <option key={g.id} value={g.id}>
                                    {g.name} ({g.code})
                                  </option>
                                ))}
                              </select>
                              {!loading && geo.length === 0 ? (
                                <span style={{ fontSize: 12, color: "#b45309", maxWidth: 360, lineHeight: 1.45 }} role="status">
                                  {t("adminMsppAccess.geoListEmptyHint")}
                                </span>
                              ) : null}
                            </label>
                          ) : null}
                          <button
                            type="button"
                            disabled={
                              savingEdit ||
                              (showDept(editing.role) &&
                                (!editing.geoDepartmentId.trim() || geo.length === 0))
                            }
                            onClick={() => void saveEdit()}
                            style={{
                              padding: "10px 16px",
                              borderRadius: 10,
                              border: "none",
                              background: "#1a1a1a",
                              color: "#fff",
                              fontWeight: 600,
                              cursor: savingEdit ? "default" : "pointer",
                            }}
                          >
                            {t("adminMsppAccess.save")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: 24 }}>
        {canCreateFacilities ? (
          <Link href="/app/admin" style={{ color: "#2563eb" }}>
            ← {t("nav.admin")}
          </Link>
        ) : msppRoles.some((r) =>
            (MSPP_OPERATIONAL_ROLE_CODES as readonly string[]).includes(r)
          ) ? (
          <Link href="/app/mspp/dashboard" style={{ color: "#2563eb" }}>
            ← {t("nav.msppDashboard")}
          </Link>
        ) : null}
      </p>

      {wizardOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="mspp-wizard-title"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            background: "rgba(15,23,42,0.45)",
          }}
          onClick={() => setWizardOpen(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 460,
              maxHeight: "90vh",
              overflow: "auto",
              background: "#fff",
              borderRadius: 16,
              padding: 20,
              border: "1px solid #e2e8f0",
              boxShadow: "0 25px 50px -12px rgba(0,0,0,0.25)",
            }}
          >
            <h2 id="mspp-wizard-title" style={{ marginTop: 0, fontSize: 18, color: "#0f172a" }}>
              {t("adminMsppAccess.wizardTitle")}
            </h2>
            <form onSubmit={handleWizardSubmit} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("adminMsppAccess.wizardFirstName")}</span>
                <input
                  required
                  value={wizardFirstName}
                  onChange={(e) => setWizardFirstName(e.target.value)}
                  autoComplete="given-name"
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("adminMsppAccess.wizardLastName")}</span>
                <input
                  required
                  value={wizardLastName}
                  onChange={(e) => setWizardLastName(e.target.value)}
                  autoComplete="family-name"
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("adminMsppAccess.wizardEmail")}</span>
                <input
                  type="email"
                  required
                  value={wizardEmail}
                  onChange={(e) => setWizardEmail(e.target.value)}
                  autoComplete="email"
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                />
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("adminMsppAccess.wizardPassword")}</span>
                <input
                  type="password"
                  value={wizardPassword}
                  onChange={(e) => setWizardPassword(e.target.value)}
                  autoComplete="new-password"
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                />
                <span style={{ fontSize: 12, color: "#64748b", lineHeight: 1.45 }}>
                  {t("adminMsppAccess.wizardPasswordHelp")}
                </span>
              </label>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <span>{t("adminMsppAccess.role")}</span>
                <select
                  value={wizardRole}
                  onChange={(e) => setWizardRole(e.target.value)}
                  style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                >
                  {MSPP_ROLE_CODES.map((c) => (
                    <option key={c} value={c}>
                      {roleLabel(t, c)}
                    </option>
                  ))}
                </select>
              </label>
              {showDept(wizardRole) ? (
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <span>{t("adminMsppAccess.geoDepartment")}</span>
                  <select
                    required
                    value={wizardGeoId}
                    onChange={(e) => setWizardGeoId(e.target.value)}
                    style={{ padding: "8px 10px", borderRadius: 10, border: "1px solid #cbd5e1" }}
                  >
                    <option value="">—</option>
                    {geo.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name} ({g.code})
                      </option>
                    ))}
                  </select>
                  <span style={{ fontSize: 12, color: "#64748b" }}>{t("adminMsppAccess.geoHint")}</span>
                  {!loading && geo.length === 0 ? (
                    <span style={{ fontSize: 12, color: "#b45309", lineHeight: 1.45 }} role="status">
                      {t("adminMsppAccess.geoListEmptyHint")}
                    </span>
                  ) : null}
                </label>
              ) : null}
              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 14,
                  color: "#334155",
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={wizardMsppActive}
                  onChange={(e) => setWizardMsppActive(e.target.checked)}
                />
                {t("adminMsppAccess.wizardMsppActiveLabel")}
              </label>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={wizardSubmitting || (showDept(wizardRole) && geo.length === 0)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "none",
                    background: "#1a1a1a",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: wizardSubmitting ? "default" : "pointer",
                  }}
                >
                  {wizardSubmitting ? t("adminMsppAccess.loading") : t("adminMsppAccess.wizardSubmit")}
                </button>
                <button
                  type="button"
                  onClick={() => setWizardOpen(false)}
                  style={{
                    padding: "10px 18px",
                    borderRadius: 10,
                    border: "1px solid #cbd5e1",
                    background: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {t("adminMsppAccess.wizardCancel")}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
