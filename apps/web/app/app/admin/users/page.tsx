"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { getLandingRouteForRoles, getLandingHomeLabel } from "@/lib/landingRoute";
import { useFacilityAndRoles, type UserFacilityOption } from "@/hooks/useFacilityAndRoles";
import {
  ADMIN_ASSIGNABLE_ROLE_CODES,
  type CreateAdminUserDto,
  type CreateFacilityDto,
} from "@medora/shared";
import { FacilityBillingIdentityModal } from "@/components/admin/FacilityBillingIdentityModal";
import {
  emptyFacilityBillingWorkflowForm,
  FacilityBillingWorkflowFields,
  workflowFormToPatch,
  type FacilityBillingWorkflowFormState,
} from "@/components/admin/FacilityBillingWorkflowFields";
import {
  fetchAdminUsers,
  createAdminUser,
  createAdminFacility,
  patchAdminUserProfile,
  patchAdminUserPassword,
  patchAdminUserRoles,
  patchAdminUserStatus,
  fetchAdminUserBillingIdentity,
  patchAdminUserBillingIdentity,
  fetchAdminFacilityDepartments,
  type AdminUserRow,
} from "@/lib/adminUsersApi";
import { AdminUserAssignmentSection } from "@/features/admin/AdminUserAssignmentSection";
import {
  assignmentRowsFromExistingUser,
  buildAssignmentsPayload,
  createEmptyAssignmentRow,
  type AssignmentDraftRow,
  type FacilityDepartmentOption,
} from "@/features/admin/adminUserAssignmentForm";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { parseApiResponse } from "@/lib/apiClient";
import { useI18n } from "@/lib/i18n";

const ADMIN_ASSIGNABLE_SET = new Set<string>(ADMIN_ASSIGNABLE_ROLE_CODES);

/** Avoid showing raw i18n keys when a label is missing. */
function roleLabelForCode(code: string, t: (key: string) => string): string {
  const key = `adminUsers.roleLabels.${code}`;
  const label = t(key);
  return label === key ? code : label;
}

function formatRoleList(codes: string[], t: (key: string) => string): string {
  if (!codes.length) return t("common.dash");
  return codes.map((code) => roleLabelForCode(code, t)).join(", ");
}

async function loadDepartmentsForFacility(
  headerFacilityId: string,
  targetFacilityId: string
): Promise<FacilityDepartmentOption[]> {
  if (!targetFacilityId.trim()) return [];
  try {
    const { items } = await fetchAdminFacilityDepartments(headerFacilityId, targetFacilityId);
    return items;
  } catch {
    return [];
  }
}

/** Statut d’accès pour l’établissement affiché (colonne Statut). */
function accessStatusColumn(u: AdminUserRow, t: (key: string) => string): string {
  if (!u.isActive) return t("adminUsers.accessInactiveAccount");
  if (!u.facilityAccessActive) return t("adminUsers.accessDisabled");
  return t("adminUsers.accessActive");
}

export default function AdminUsersPage() {
  const { t, language } = useI18n();
  const { facilityId, facilities, roles, ready, refreshFromMe, canCreateFacilities } = useFacilityAndRoles();
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [showFacilityBilling, setShowFacilityBilling] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [profileUser, setProfileUser] = useState<AdminUserRow | null>(null);
  const [resetPasswordUser, setResetPasswordUser] = useState<AdminUserRow | null>(null);

  const isFacilityOrPlatformAdmin =
    ready && (roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN"));
  const currentFacilityName =
    facilities.find((f) => f.id === facilityId)?.name ?? t("common.dash");

  const load = useCallback(async () => {
    if (!facilityId || !isFacilityOrPlatformAdmin) return;
    setLoading(true);
    try {
      const res = await fetchAdminUsers(facilityId);
      setItems(res.items ?? []);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [facilityId, isFacilityOrPlatformAdmin]);

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => parseApiResponse(r))
      .then((d) => {
        if (d && typeof d === "object" && !Array.isArray(d) && "id" in d && d.id != null) {
          setCurrentUserId(String((d as { id: string }).id));
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (isFacilityOrPlatformAdmin && facilityId) load();
  }, [isFacilityOrPlatformAdmin, facilityId, load]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  if (!ready) {
    return <div style={{ padding: 24 }}>{t("adminUsers.loading")}</div>;
  }

  if (!isFacilityOrPlatformAdmin && !canCreateFacilities) {
    return (
      <div style={{ padding: 24 }}>
        <p>{t("adminUsers.forbidden")}</p>
        <Link href="/app">{t("adminUsers.back")}</Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 24, maxWidth: 1100 }}>
      {toast && (
        <div
          role="status"
          style={{
            marginBottom: 16,
            padding: 12,
            borderRadius: 8,
            background: toast.ok ? "#e8f5e9" : "#ffebee",
            color: toast.ok ? "#1b5e20" : "#b71c1c",
            border: `1px solid ${toast.ok ? "#a5d6a7" : "#ef9a9a"}`,
            fontSize: 14,
          }}
        >
          {toast.message}
        </div>
      )}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ margin: "0 0 8px 0" }}>{t("adminUsers.title")}</h1>
          {isFacilityOrPlatformAdmin ? (
            <p style={{ margin: 0, fontSize: 14, color: "#555", maxWidth: 720 }}>
              {t("adminUsers.introManagedBefore")} <strong>{currentFacilityName}</strong>.{" "}
              {t("adminUsers.introManagedAfter")}
            </p>
          ) : (
            <p style={{ margin: 0, fontSize: 14, color: "#555", maxWidth: 720 }}>
              {t("adminUsers.introNonAdmin")}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center" }}>
          {canCreateFacilities ? (
            <button
              type="button"
              onClick={() => setShowAddFacility(true)}
              style={{
                padding: "10px 18px",
                background: "#fff",
                color: "#1a1a1a",
                border: "1px solid #1a1a1a",
                borderRadius: 4,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("adminUsers.addFacility")}
            </button>
          ) : null}
          {isFacilityOrPlatformAdmin ? (
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              style={{
                padding: "10px 18px",
                background: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: 4,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {t("adminUsers.createUser")}
            </button>
          ) : null}
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#666", marginTop: 12 }}>
        <Link href="/app/admin" style={{ color: "#1565c0" }}>
          {t("adminUsers.backToAdmin")}
        </Link>
      </p>

      {isFacilityOrPlatformAdmin && facilityId ? (
        <div
          style={{
            marginTop: 16,
            marginBottom: 8,
            padding: 14,
            background: "#f8fafc",
            border: "1px solid #e2e8f0",
            borderRadius: 8,
            maxWidth: 720,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6 }}>{t("adminUsers.facilityBillingCardTitle")}</div>
          <p style={{ margin: "0 0 10px 0", fontSize: 13, color: "#475569" }}>
            {t("adminUsers.facilityBillingCardIntro")}
          </p>
          <button
            type="button"
            onClick={() => setShowFacilityBilling(true)}
            style={{
              padding: "8px 14px",
              border: "1px solid #1a1a1a",
              borderRadius: 4,
              background: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            {t("adminUsers.openFacilityBilling")}
          </button>
        </div>
      ) : null}

      {isFacilityOrPlatformAdmin ? (
        loading ? (
          <p style={{ marginTop: 24 }}>{t("adminUsers.loading")}</p>
        ) : items.length === 0 ? (
          <div
            style={{
              marginTop: 24,
              padding: 24,
              background: "#fafafa",
              border: "1px solid #eee",
              borderRadius: 8,
              color: "#555",
              fontSize: 14,
            }}
          >
            {t("adminUsers.emptyUsers")}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: 10 }}>{t("adminUsers.name")}</th>
              <th style={{ textAlign: "left", padding: 10 }}>{t("adminUsers.email")}</th>
              <th style={{ textAlign: "left", padding: 10 }}>{t("adminUsers.facility")}</th>
              <th style={{ textAlign: "left", padding: 10 }}>{t("adminUsers.roles")}</th>
              <th style={{ textAlign: "left", padding: 10 }}>{t("adminUsers.status")}</th>
              <th style={{ textAlign: "right", padding: 10 }}>{t("adminUsers.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((u) => (
              <tr key={u.id} style={{ borderBottom: "1px solid #eee" }}>
                <td style={{ padding: 10 }}>
                  {u.firstName} {u.lastName}
                </td>
                <td style={{ padding: 10 }}>{u.email}</td>
                <td style={{ padding: 10 }}>{currentFacilityName}</td>
                <td style={{ padding: 10 }}>
                  <span>
                    {u.roles.length > 0
                      ? formatRoleList(u.roles, t)
                      : u.rolesInactive && u.rolesInactive.length > 0
                        ? t("adminUsers.rolesInactiveAtFacility").replace(
                            "{roles}",
                            formatRoleList(u.rolesInactive, t)
                          )
                        : t("common.dash")}
                  </span>
                  {!u.isActive && (
                    <span style={{ color: "#c62828", marginLeft: 8, fontSize: 12 }}>
                      {t("adminUsers.tagAccountInactive")}
                    </span>
                  )}
                  {u.isActive && !u.facilityAccessActive && u.roles.length > 0 && (
                    <span style={{ color: "#c62828", marginLeft: 8, fontSize: 12 }}>
                      {t("adminUsers.tagAccessDisabled")}
                    </span>
                  )}
                </td>
                <td style={{ padding: 10 }}>{accessStatusColumn(u, t)}</td>
                <td style={{ padding: 10, textAlign: "right", whiteSpace: "nowrap" }}>
                  <button
                    type="button"
                    onClick={() => setProfileUser(u)}
                    style={{
                      marginRight: 6,
                      padding: "6px 10px",
                      fontSize: 12,
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {t("common.edit")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditUser(u)}
                    style={{
                      marginRight: 6,
                      padding: "6px 10px",
                      fontSize: 12,
                      border: "1px solid #ccc",
                      borderRadius: 4,
                      background: "#fff",
                      cursor: "pointer",
                    }}
                  >
                    {t("adminUsers.manageRoles")}
                  </button>
                  {u.id !== currentUserId ? (
                    <button
                      type="button"
                      onClick={() => setResetPasswordUser(u)}
                      style={{
                        marginRight: 6,
                        padding: "6px 10px",
                        fontSize: 12,
                        border: "1px solid #ccc",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {t("adminUsers.resetPasswordAction")}
                    </button>
                  ) : null}
                  {u.isActive && u.facilityAccessActive && u.id !== currentUserId ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !facilityId ||
                          !confirm(
                            t("adminUsers.confirmDeactivateAccess")
                              .replace("{email}", u.email)
                              .replace("{facility}", currentFacilityName)
                          )
                        )
                          return;
                        try {
                          await patchAdminUserStatus(facilityId, u.id, { isActive: false });
                          setToast({ message: t("adminUsers.toastAccessDisabled"), ok: true });
                          await load();
                        } catch (err: unknown) {
                          setToast({
                            message:
                              normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
                              t("adminUsers.errorGeneric"),
                            ok: false,
                          });
                        }
                      }}
                      style={{
                        padding: "6px 10px",
                        fontSize: 12,
                        border: "1px solid #c62828",
                        color: "#c62828",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {t("common.deactivate")}
                    </button>
                  ) : null}
                  {(!u.isActive || !u.facilityAccessActive) && u.id !== currentUserId ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!facilityId) return;
                        try {
                          await patchAdminUserStatus(facilityId, u.id, { isActive: true });
                          setToast({ message: t("adminUsers.toastAccessEnabled"), ok: true });
                          await load();
                        } catch (err: unknown) {
                          setToast({
                            message:
                              normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
                              t("adminUsers.errorGeneric"),
                            ok: false,
                          });
                        }
                      }}
                      style={{
                        marginLeft: 6,
                        padding: "6px 10px",
                        fontSize: 12,
                        border: "1px solid #2e7d32",
                        color: "#2e7d32",
                        borderRadius: 4,
                        background: "#fff",
                        cursor: "pointer",
                      }}
                    >
                      {t("common.activate")}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        )
      ) : null}

      {showAddFacility && facilityId && canCreateFacilities && (
        <AddFacilityModal
          facilityId={facilityId}
          onClose={() => setShowAddFacility(false)}
          onSuccess={async () => {
            try {
              await refreshFromMe();
            } catch {
              /* session inchangée ; événement ci-dessous pour le shell */
            }
            window.dispatchEvent(new Event("medora:session-refresh"));
            setShowAddFacility(false);
            setToast({ message: t("adminUsers.toastFacilityCreated"), ok: true });
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      )}

      {showCreate && facilityId && isFacilityOrPlatformAdmin && (
        <CreateUserModal
          facilities={facilities}
          defaultFacilityId={facilityId}
          onClose={() => setShowCreate(false)}
          onSuccess={async () => {
            setShowCreate(false);
            setToast({ message: t("adminUsers.toastUserCreated"), ok: true });
            await load();
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      )}

      {editUser && facilityId && isFacilityOrPlatformAdmin && (
        <EditRolesModal
          facilityId={facilityId}
          facilityDisplayName={currentFacilityName}
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={async () => {
            setEditUser(null);
            setToast({ message: t("adminUsers.toastRolesUpdated"), ok: true });
            await load();
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      )}

      {profileUser && facilityId && isFacilityOrPlatformAdmin && (
        <EditProfileModal
          facilityId={facilityId}
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onSuccess={async () => {
            setProfileUser(null);
            setToast({ message: t("adminUsers.toastUserUpdated"), ok: true });
            await load();
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      )}

      {showFacilityBilling && facilityId && isFacilityOrPlatformAdmin ? (
        <FacilityBillingIdentityModal
          headerFacilityId={facilityId}
          targetFacilityId={facilityId}
          facilityDisplayName={currentFacilityName}
          onClose={() => setShowFacilityBilling(false)}
          onSuccess={async () => {
            setShowFacilityBilling(false);
            setToast({ message: t("adminUsers.toastFacilityBillingSaved"), ok: true });
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      ) : null}

      {resetPasswordUser && facilityId && isFacilityOrPlatformAdmin && (
        <ResetPasswordModal
          facilityId={facilityId}
          facilityDisplayName={currentFacilityName}
          user={resetPasswordUser}
          onClose={() => setResetPasswordUser(null)}
          onSuccess={async () => {
            setResetPasswordUser(null);
            setToast({ message: t("adminUsers.toastPasswordReset"), ok: true });
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      )}
    </div>
  );
}

function AddFacilityModal({
  facilityId,
  onClose,
  onSuccess,
  onError,
}: {
  facilityId: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t, language } = useI18n();
  const [name, setName] = useState("");
  const [defaultLanguage, setDefaultLanguage] = useState<"fr" | "en">("fr");
  const [showOptionalBilling, setShowOptionalBilling] = useState(false);
  const [billingLegalName, setBillingLegalName] = useState("");
  const [billingNpi, setBillingNpi] = useState("");
  const [taxIdEin, setTaxIdEin] = useState("");
  const [billingAddressLine1, setBillingAddressLine1] = useState("");
  const [billingAddressLine2, setBillingAddressLine2] = useState("");
  const [billingCity, setBillingCity] = useState("");
  const [billingStateProvince, setBillingStateProvince] = useState("");
  const [billingPostalCode, setBillingPostalCode] = useState("");
  const [billingCountry, setBillingCountry] = useState("");
  const [billingFacilityTypeLabel, setBillingFacilityTypeLabel] = useState("");
  const [billingWorkflow, setBillingWorkflow] = useState<FacilityBillingWorkflowFormState>(
    emptyFacilityBillingWorkflowForm(),
  );
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onError(t("adminUsers.valFacilityNameRequired"));
      return;
    }
    if (showOptionalBilling && billingNpi.trim()) {
      const d = billingNpi.replace(/\D/g, "").slice(0, 10);
      if (d.length !== 10) {
        onError(t("adminUsers.valBillingNpiDigits"));
        return;
      }
    }
    setSubmitting(true);
    try {
      const payload: CreateFacilityDto = {
        name: name.trim(),
        defaultLanguage,
        ...workflowFormToPatch(billingWorkflow),
      };
      if (showOptionalBilling) {
        const trim = (s: string) => (s.trim() === "" ? undefined : s.trim());
        const npiDigits = billingNpi.replace(/\D/g, "").slice(0, 10);
        if (trim(billingLegalName)) payload.billingLegalName = trim(billingLegalName)!;
        if (npiDigits.length === 10) payload.billingNpi = npiDigits;
        if (trim(taxIdEin)) payload.taxIdEin = trim(taxIdEin)!;
        if (trim(billingAddressLine1)) payload.billingAddressLine1 = trim(billingAddressLine1)!;
        if (trim(billingAddressLine2)) payload.billingAddressLine2 = trim(billingAddressLine2)!;
        if (trim(billingCity)) payload.billingCity = trim(billingCity)!;
        if (trim(billingStateProvince)) payload.billingStateProvince = trim(billingStateProvince)!;
        if (trim(billingPostalCode)) payload.billingPostalCode = trim(billingPostalCode)!;
        if (trim(billingCountry)) payload.billingCountry = trim(billingCountry)!;
        if (trim(billingFacilityTypeLabel)) payload.billingFacilityTypeLabel = trim(billingFacilityTypeLabel)!;
      }
      await createAdminFacility(facilityId, payload);
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("adminUsers.errCreateFacility")
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
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 520,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="add-facility-title"
      >
        <h2 id="add-facility-title" style={{ marginTop: 0 }}>
          {t("adminUsers.addFacilityTitle")}
        </h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.facilityNameLabel")}
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              autoComplete="organization"
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.defaultLanguageLabel")}
            </label>
            <select
              value={defaultLanguage}
              onChange={(e) => setDefaultLanguage(e.target.value as "fr" | "en")}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            >
              <option value="fr">{t("adminUsers.langFr")}</option>
              <option value="en">{t("adminUsers.langEn")}</option>
            </select>
          </div>
          <FacilityBillingWorkflowFields form={billingWorkflow} onChange={setBillingWorkflow} disabled={submitting} />
          <label
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
              marginBottom: 12,
              fontSize: 13,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={showOptionalBilling}
              onChange={(e) => setShowOptionalBilling(e.target.checked)}
            />
            <span>
              <strong>{t("adminUsers.optionalBillingOnCreate")}</strong>
              <span style={{ display: "block", fontSize: 12, color: "#64748b", marginTop: 4 }}>
                {t("adminUsers.optionalBillingOnCreateHint")}
              </span>
            </span>
          </label>
          {showOptionalBilling ? (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <p style={{ margin: 0, fontSize: 12, color: "#64748b" }}>{t("adminUsers.facilityBillingIntro")}</p>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingLegalNameLabel")}
                <input
                  value={billingLegalName}
                  onChange={(e) => setBillingLegalName(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingNpiLabel")}
                <input
                  value={billingNpi}
                  onChange={(e) => setBillingNpi(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <p style={{ fontSize: 11, color: "#888", margin: 0 }}>{t("adminUsers.billingNpiHint")}</p>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.taxIdEinLabel")}
                <input
                  value={taxIdEin}
                  onChange={(e) => setTaxIdEin(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingAddressLine1Label")}
                <input
                  value={billingAddressLine1}
                  onChange={(e) => setBillingAddressLine1(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingAddressLine2Label")}
                <input
                  value={billingAddressLine2}
                  onChange={(e) => setBillingAddressLine2(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  {t("adminUsers.billingCityLabel")}
                  <input
                    value={billingCity}
                    onChange={(e) => setBillingCity(e.target.value)}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                  />
                </label>
                <label style={{ fontSize: 13, fontWeight: 600 }}>
                  {t("adminUsers.billingStateProvinceLabel")}
                  <input
                    value={billingStateProvince}
                    onChange={(e) => setBillingStateProvince(e.target.value)}
                    style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                  />
                </label>
              </div>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingPostalCodeLabel")}
                <input
                  value={billingPostalCode}
                  onChange={(e) => setBillingPostalCode(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingCountryLabel")}
                <input
                  value={billingCountry}
                  onChange={(e) => setBillingCountry(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingFacilityTypeLabel")}
                <input
                  value={billingFacilityTypeLabel}
                  onChange={(e) => setBillingFacilityTypeLabel(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "8px 16px",
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "#fff",
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 4,
                background: "#1a1a1a",
                color: "#fff",
                fontWeight: 600,
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {submitting ? t("adminUsers.savingCreate") : t("common.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateUserModal({
  facilities,
  defaultFacilityId,
  onClose,
  onSuccess,
  onError,
}: {
  facilities: UserFacilityOption[];
  defaultFacilityId: string;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t, language } = useI18n();
  const [selectedFacilityId, setSelectedFacilityId] = useState(defaultFacilityId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountActive, setAccountActive] = useState(true);
  const [assignmentRows, setAssignmentRows] = useState<AssignmentDraftRow[]>(() => [
    createEmptyAssignmentRow(defaultFacilityId),
  ]);
  const [departmentsByFacility, setDepartmentsByFacility] = useState<
    Record<string, FacilityDepartmentOption[]>
  >({});
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [billingNpi, setBillingNpi] = useState("");
  const [billingTaxonomyCode, setBillingTaxonomyCode] = useState("");
  const [billingNameOverride, setBillingNameOverride] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!selectedFacilityId.trim()) return;
      setDepartmentsLoading(true);
      const items = await loadDepartmentsForFacility(selectedFacilityId, selectedFacilityId);
      if (!cancelled) {
        setDepartmentsByFacility((prev) => ({ ...prev, [selectedFacilityId]: items }));
        setDepartmentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [selectedFacilityId]);

  useEffect(() => {
    setAssignmentRows((rows) =>
      rows.map((row) => ({ ...row, facilityId: selectedFacilityId }))
    );
  }, [selectedFacilityId]);

  const payloadPreview = buildAssignmentsPayload(assignmentRows);
  const previewRoleCodes = payloadPreview.ok ? payloadPreview.roleCodes : [];
  const previewPath = getLandingRouteForRoles(previewRoleCodes);
  const previewLabel = getLandingHomeLabel(previewPath, t);
  const isProvider = previewRoleCodes.includes("PROVIDER");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      onError(t("adminUsers.valFirstName"));
      return;
    }
    if (!lastName.trim()) {
      onError(t("adminUsers.valLastName"));
      return;
    }
    if (!email.trim()) {
      onError(t("adminUsers.valEmail"));
      return;
    }
    if (!password?.trim()) {
      onError(t("adminUsers.valTempPassword"));
      return;
    }
    if (password.length < 8) {
      onError(t("adminUsers.valTempPasswordMin"));
      return;
    }
    if (!selectedFacilityId?.trim()) {
      onError(t("adminUsers.valFacilityRequired"));
      return;
    }
    const built = buildAssignmentsPayload(assignmentRows);
    if (!built.ok) {
      onError(t(built.errorKey));
      return;
    }
    if (isProvider && billingNpi.trim()) {
      const d = billingNpi.replace(/\D/g, "").slice(0, 10);
      if (d.length !== 10) {
        onError(t("adminUsers.valBillingNpiDigits"));
        return;
      }
    }
    setSubmitting(true);
    try {
      const body: CreateAdminUserDto = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        facilityId: selectedFacilityId,
        assignments: built.assignments,
        isActive: accountActive,
      };
      if (isProvider) {
        const npiDigits = billingNpi.replace(/\D/g, "").slice(0, 10);
        if (npiDigits.length === 10) body.billingNpi = npiDigits;
        const tax = billingTaxonomyCode.trim();
        if (tax) body.billingTaxonomyCode = tax;
        const nm = billingNameOverride.trim();
        if (nm) body.billingNameOverride = nm;
      }
      await createAdminUser(selectedFacilityId, body);
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("adminUsers.errCreateUser")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const facilityLabel = (id: string) => facilities.find((f) => f.id === id)?.name ?? id;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="create-user-title"
      >
        <h2 id="create-user-title" style={{ marginTop: 0 }}>
          {t("adminUsers.createUserTitle")}
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
          {t("adminUsers.homeAfterSignIn")} <strong>{previewLabel}</strong>
        </p>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
                {t("adminUsers.labelFirstName")}
              </label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
                {t("adminUsers.labelLastName")}
              </label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.labelEmail")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.labelTempPassword")}
            </label>
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
            <p style={{ fontSize: 12, color: "#888", margin: "6px 0 0 0" }}>{t("adminUsers.tempPasswordHint")}</p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.labelFacility")}
            </label>
            {facilities.length > 1 ? (
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              >
                {facilities.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ padding: 8, background: "#f5f5f5", borderRadius: 4, fontSize: 14 }}>
                {facilityLabel(selectedFacilityId)}
              </div>
            )}
            <p style={{ fontSize: 12, color: "#888", margin: "6px 0 0 0" }}>
              {t("adminUsers.rolesSavedForFacilityHint")}
            </p>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 16,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            <input type="checkbox" checked={accountActive} onChange={(e) => setAccountActive(e.target.checked)} />
            {t("adminUsers.accountActiveLabel")}
          </label>

          <AdminUserAssignmentSection
            facilities={facilities}
            rows={assignmentRows}
            onChangeRows={setAssignmentRows}
            departmentsByFacility={departmentsByFacility}
            departmentsLoading={departmentsLoading}
            showFacilityColumn={false}
            disabled={submitting}
          />
          {isProvider ? (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                {t("adminUsers.providerBillingSectionTitle")}
              </div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 10px 0" }}>
                {t("adminUsers.providerBillingSectionHint")}
              </p>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {t("adminUsers.billingNpiLabel")}
                <input
                  value={billingNpi}
                  onChange={(e) => setBillingNpi(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {t("adminUsers.billingTaxonomyCodeLabel")}
                <input
                  value={billingTaxonomyCode}
                  onChange={(e) => setBillingTaxonomyCode(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingNameOverrideLabel")}
                <input
                  value={billingNameOverride}
                  onChange={(e) => setBillingNameOverride(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 4,
                background: "#1a1a1a",
                color: "white",
                fontWeight: 600,
                cursor: submitting ? "wait" : "pointer",
              }}
            >
              {submitting ? t("adminUsers.savingCreate") : t("common.create")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditRolesModal({
  facilityId,
  facilityDisplayName,
  user,
  onClose,
  onSuccess,
  onError,
}: {
  facilityId: string;
  facilityDisplayName: string;
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t, language } = useI18n();
  const platformOnlyAtFacility = user.roles.filter((r) => !ADMIN_ASSIGNABLE_SET.has(r));
  const [assignmentRows, setAssignmentRows] = useState<AssignmentDraftRow[]>(() =>
    assignmentRowsFromExistingUser({
      facilityId,
      roles: user.roles.filter((r) => ADMIN_ASSIGNABLE_SET.has(r)),
      assignments: user.assignments?.filter((a) => ADMIN_ASSIGNABLE_SET.has(a.roleCode)),
    })
  );
  const [departmentsByFacility, setDepartmentsByFacility] = useState<
    Record<string, FacilityDepartmentOption[]>
  >({});
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setDepartmentsLoading(true);
      const items = await loadDepartmentsForFacility(facilityId, facilityId);
      if (!cancelled) {
        setDepartmentsByFacility({ [facilityId]: items });
        setDepartmentsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId]);

  const built = buildAssignmentsPayload(assignmentRows);
  const effectiveRoleCodes = built.ok
    ? [...new Set([...built.roleCodes, ...platformOnlyAtFacility])].sort()
    : [...platformOnlyAtFacility].sort();
  const previewPath = getLandingRouteForRoles(effectiveRoleCodes);
  const previewLabel = getLandingHomeLabel(previewPath, t);
  const effectiveRoles = formatRoleList(effectiveRoleCodes, t);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!built.ok) {
      onError(t(built.errorKey));
      return;
    }
    if (built.roleCodes.length === 0 && platformOnlyAtFacility.length === 0) {
      onError(t("adminUsers.valAtLeastOneRole"));
      return;
    }
    setSubmitting(true);
    try {
      await patchAdminUserRoles(facilityId, user.id, {
        facilityId,
        assignments: built.assignments,
      });
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("adminUsers.errUpdateRoles")
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inactiveHint =
    user.rolesInactive && user.rolesInactive.length > 0
      ? t("adminUsers.editRolesInactiveHint").replace(
          "{roles}",
          formatRoleList(user.rolesInactive, t)
        )
      : null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-roles-title"
      >
        <h2 id="edit-roles-title" style={{ marginTop: 0 }}>
          {t("adminUsers.editRolesTitle")}
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
          {user.firstName} {user.lastName} — {user.email}
        </p>
        <p style={{ fontSize: 13, color: "#444", marginBottom: 8 }}>
          <strong>{t("adminUsers.facilityLabelStrong")}</strong> {facilityDisplayName}
        </p>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>{t("adminUsers.editRolesScopeHint")}</p>
        <p style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>{t("adminUsers.editRolesPlatformRoleHint")}</p>
        {platformOnlyAtFacility.length > 0 ? (
          <p style={{ fontSize: 12, color: "#334155", background: "#f1f5f9", padding: 8, borderRadius: 4, marginBottom: 8 }}>
            {t("adminUsers.platformRolesManagedSeparately").replace(
              "{roles}",
              formatRoleList(platformOnlyAtFacility, t)
            )}
          </p>
        ) : null}
        {inactiveHint ? (
          <p style={{ fontSize: 12, color: "#856404", background: "#fff8e1", padding: 8, borderRadius: 4 }}>{inactiveHint}</p>
        ) : null}
        <p style={{ fontSize: 13, color: "#333", marginBottom: 12 }}>
          {t("adminUsers.editRolesEffectiveLine").replace("{roles}", effectiveRoles)}
        </p>
        <p style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>
          {t("adminUsers.homePreviewLine")} <strong>{previewLabel}</strong>
        </p>
        <form onSubmit={submit}>
          <AdminUserAssignmentSection
            facilities={[{ id: facilityId, name: facilityDisplayName }]}
            rows={assignmentRows}
            onChangeRows={setAssignmentRows}
            departmentsByFacility={departmentsByFacility}
            departmentsLoading={departmentsLoading}
            showFacilityColumn={false}
            disabled={submitting}
          />
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 4,
                background: "#1a1a1a",
                color: "white",
                fontWeight: 600,
                cursor: submitting ? "wait" : "pointer",
              }}
            >
              {submitting ? t("adminUsers.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ResetPasswordModal({
  facilityId,
  facilityDisplayName,
  user,
  onClose,
  onSuccess,
  onError,
}: {
  facilityId: string;
  facilityDisplayName: string;
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t, language } = useI18n();
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      onError(t("adminUsers.valPasswordMismatch"));
      return;
    }
    if (newPassword.length < 8) {
      onError(t("adminUsers.valPasswordMin"));
      return;
    }
    setSubmitting(true);
    try {
      await patchAdminUserPassword(facilityId, user.id, { newPassword });
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("adminUsers.errResetPassword")
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
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 440,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="reset-password-title"
      >
        <h2 id="reset-password-title" style={{ marginTop: 0 }}>
          {t("adminUsers.resetPasswordTitle")}
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
          {user.firstName} {user.lastName} — {user.email}
        </p>
        <p style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>
          <strong>{t("adminUsers.facilityLabelStrong")}</strong> {facilityDisplayName}
        </p>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.labelNewPassword")}
            </label>
            <input
              type="password"
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
            <p style={{ fontSize: 12, color: "#888", margin: "6px 0 0 0" }}>{t("adminUsers.tempPasswordHint")}</p>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.labelConfirmPassword")}
            </label>
            <input
              type="password"
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              style={{
                padding: "8px 16px",
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "#fff",
                cursor: submitting ? "default" : "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 4,
                background: "#1a1a1a",
                color: "white",
                fontWeight: 600,
                cursor: submitting ? "wait" : "pointer",
              }}
            >
              {submitting ? t("adminUsers.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditProfileModal({
  facilityId,
  user,
  onClose,
  onSuccess,
  onError,
}: {
  facilityId: string;
  user: AdminUserRow;
  onClose: () => void;
  onSuccess: () => Promise<void>;
  onError: (m: string) => void;
}) {
  const { t, language } = useI18n();
  const isProvider = user.roles.includes("PROVIDER");
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [billingNpi, setBillingNpi] = useState("");
  const [billingTaxonomyCode, setBillingTaxonomyCode] = useState("");
  const [billingNameOverride, setBillingNameOverride] = useState("");
  const [billingLoadError, setBillingLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isProvider) return;
    let cancelled = false;
    setBillingLoadError(null);
    void fetchAdminUserBillingIdentity(facilityId, user.id)
      .then((b) => {
        if (cancelled) return;
        setBillingNpi(b.billingNpi ?? "");
        setBillingTaxonomyCode(b.billingTaxonomyCode ?? "");
        setBillingNameOverride(b.billingNameOverride ?? "");
      })
      .catch(() => {
        if (!cancelled) setBillingLoadError(t("adminUsers.errLoadUserBilling"));
      });
    return () => {
      cancelled = true;
    };
  }, [facilityId, user.id, isProvider, t]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      onError(t("adminUsers.valFirstName"));
      return;
    }
    if (!lastName.trim()) {
      onError(t("adminUsers.valLastName"));
      return;
    }
    if (!email.trim()) {
      onError(t("adminUsers.valEmail"));
      return;
    }
    if (isProvider && billingNpi.trim()) {
      const d = billingNpi.replace(/\D/g, "").slice(0, 10);
      if (d.length !== 10) {
        onError(t("adminUsers.valBillingNpiDigits"));
        return;
      }
    }
    const body: { firstName?: string; lastName?: string; email?: string } = {};
    if (firstName.trim() !== user.firstName) body.firstName = firstName.trim();
    if (lastName.trim() !== user.lastName) body.lastName = lastName.trim();
    const em = email.trim().toLowerCase();
    if (em !== user.email.toLowerCase()) body.email = em;
    const profileChanged = Object.keys(body).length > 0;
    if (!profileChanged && !isProvider) {
      onClose();
      return;
    }

    setSubmitting(true);
    try {
      if (profileChanged) {
        await patchAdminUserProfile(facilityId, user.id, body);
      }
      if (isProvider) {
        const npiDigits = billingNpi.replace(/\D/g, "").slice(0, 10);
        await patchAdminUserBillingIdentity(facilityId, user.id, {
          billingNpi: npiDigits.length === 10 ? npiDigits : null,
          billingTaxonomyCode: billingTaxonomyCode.trim() || null,
          billingNameOverride: billingNameOverride.trim() || null,
        });
      }
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null, language) ||
          t("adminUsers.errUpdateProfile")
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
        background: "rgba(0,0,0,0.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1500,
        padding: 16,
      }}
      onClick={onClose}
      role="presentation"
    >
      <div
        style={{
          background: "white",
          borderRadius: 8,
          padding: 24,
          maxWidth: 480,
          width: "100%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-profile-title"
      >
        <h2 id="edit-profile-title" style={{ marginTop: 0 }}>
          {t("adminUsers.editProfileTitle")}
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
          {user.firstName} {user.lastName}
        </p>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.labelFirstName")}
            </label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.labelLastName")}
            </label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              {t("adminUsers.labelEmail")}
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          {isProvider ? (
            <div
              style={{
                marginBottom: 16,
                padding: 12,
                border: "1px solid #e2e8f0",
                borderRadius: 6,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 4 }}>
                {t("adminUsers.providerBillingSectionTitle")}
              </div>
              <p style={{ fontSize: 12, color: "#64748b", margin: "0 0 8px 0" }}>
                {t("adminUsers.providerBillingSectionHint")}
              </p>
              {billingLoadError ? (
                <p style={{ fontSize: 12, color: "#b71c1c", marginBottom: 8 }}>{billingLoadError}</p>
              ) : null}
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {t("adminUsers.billingNpiLabel")}
                <input
                  value={billingNpi}
                  onChange={(e) => setBillingNpi(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 8 }}>
                {t("adminUsers.billingTaxonomyCodeLabel")}
                <input
                  value={billingTaxonomyCode}
                  onChange={(e) => setBillingTaxonomyCode(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600 }}>
                {t("adminUsers.billingNameOverrideLabel")}
                <input
                  value={billingNameOverride}
                  onChange={(e) => setBillingNameOverride(e.target.value)}
                  style={{ display: "block", width: "100%", marginTop: 4, padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
                />
              </label>
            </div>
          ) : null}
          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "8px 16px",
                border: "1px solid #ccc",
                borderRadius: 4,
                background: "#fff",
                cursor: "pointer",
              }}
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: "8px 16px",
                border: "none",
                borderRadius: 4,
                background: "#1a1a1a",
                color: "white",
                fontWeight: 600,
                cursor: submitting ? "wait" : "pointer",
              }}
            >
              {submitting ? t("adminUsers.saving") : t("common.save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
