"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  APP_ROLE_CODES,
  getLandingRouteForRoles,
  getLandingHomeLabelFr,
} from "@/lib/landingRoute";
import { useFacilityAndRoles, type UserFacilityOption } from "@/hooks/useFacilityAndRoles";
import {
  fetchAdminUsers,
  createAdminUser,
  createAdminFacility,
  patchAdminUserProfile,
  patchAdminUserRoles,
  patchAdminUserStatus,
  type AdminUserRow,
} from "@/lib/adminUsersApi";
import { genericUserFacingError, normalizeUserFacingError } from "@/lib/userFacingError";
import { parseApiResponse } from "@/lib/apiClient";
import { getAdminAssignableRoleLabelFr } from "@/lib/uiLabels";

function roleCheckboxes(
  selected: Set<string>,
  onToggle: (code: string) => void,
  disabled?: boolean
) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {APP_ROLE_CODES.map((code) => (
        <label
          key={code}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 14,
            cursor: disabled ? "default" : "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={selected.has(code)}
            disabled={disabled}
            onChange={() => onToggle(code)}
          />
          <span>{getAdminAssignableRoleLabelFr(code)}</span>
        </label>
      ))}
    </div>
  );
}

/** Statut d’accès pour l’établissement affiché (colonne Statut). */
function accessStatusColumn(u: AdminUserRow): string {
  if (!u.isActive) return "Compte inactif";
  if (!u.facilityAccessActive) return "Accès désactivé";
  return "Accès actif";
}

function rolesListFr(codes: string[]): string {
  if (!codes.length) return "—";
  return codes.map((r) => getAdminAssignableRoleLabelFr(r)).join(", ");
}

export default function AdminUsersPage() {
  const { facilityId, facilities, roles, ready, refreshFromMe, canCreateFacilities } = useFacilityAndRoles();
  const [items, setItems] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [showAddFacility, setShowAddFacility] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [profileUser, setProfileUser] = useState<AdminUserRow | null>(null);

  const isAdmin = ready && roles.includes("ADMIN");
  const currentFacilityName =
    facilities.find((f) => f.id === facilityId)?.name ?? "—";

  const load = useCallback(async () => {
    if (!facilityId || !isAdmin) return;
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
  }, [facilityId, isAdmin]);

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
    if (isAdmin && facilityId) load();
  }, [isAdmin, facilityId, load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!ready) {
    return <div style={{ padding: 24 }}>Chargement…</div>;
  }

  if (!isAdmin) {
    return (
      <div style={{ padding: 24 }}>
        <p>Accès réservé aux administrateurs.</p>
        <Link href="/app">Retour</Link>
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
          <h1 style={{ margin: "0 0 8px 0" }}>Utilisateurs et accès</h1>
          <p style={{ margin: 0, fontSize: 14, color: "#555", maxWidth: 720 }}>
            Établissement géré : <strong>{currentFacilityName}</strong>. Les comptes listés ont au moins un lien avec cet
            établissement. Les rôles ci-dessous sont ceux <strong>pour cet établissement uniquement</strong> ; les accès
            dans d&apos;autres établissements ne sont pas modifiés par cette page.
          </p>
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
              Ajouter un établissement
            </button>
          ) : null}
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
            Créer un utilisateur
          </button>
        </div>
      </div>
      <p style={{ fontSize: 13, color: "#666", marginTop: 12 }}>
        <Link href="/app/admin" style={{ color: "#1565c0" }}>
          ← Administration
        </Link>
      </p>

      {loading ? (
        <p style={{ marginTop: 24 }}>Chargement…</p>
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
          Aucun utilisateur lié à cet établissement. Utilisez « Créer un utilisateur » pour ajouter un compte.
        </div>
      ) : (
        <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 20, fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "2px solid #ddd" }}>
              <th style={{ textAlign: "left", padding: 10 }}>Nom</th>
              <th style={{ textAlign: "left", padding: 10 }}>Courriel</th>
              <th style={{ textAlign: "left", padding: 10 }}>Établissement</th>
              <th style={{ textAlign: "left", padding: 10 }}>Rôles</th>
              <th style={{ textAlign: "left", padding: 10 }}>Statut</th>
              <th style={{ textAlign: "right", padding: 10 }}>Actions</th>
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
                      ? rolesListFr(u.roles)
                      : u.rolesInactive && u.rolesInactive.length > 0
                        ? `${rolesListFr(u.rolesInactive)} (inactifs dans cet établissement)`
                        : "—"}
                  </span>
                  {!u.isActive && (
                    <span style={{ color: "#c62828", marginLeft: 8, fontSize: 12 }}>(compte inactif)</span>
                  )}
                  {u.isActive && !u.facilityAccessActive && u.roles.length > 0 && (
                    <span style={{ color: "#c62828", marginLeft: 8, fontSize: 12 }}>(accès désactivé ici)</span>
                  )}
                </td>
                <td style={{ padding: 10 }}>{accessStatusColumn(u)}</td>
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
                    Modifier
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
                    Gérer les rôles
                  </button>
                  {u.isActive && u.facilityAccessActive && u.id !== currentUserId ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (
                          !facilityId ||
                          !confirm(
                            `Désactiver l’accès de ${u.email} pour l’établissement « ${currentFacilityName} » ? Les rôles dans les autres établissements ne seront pas retirés.`
                          )
                        )
                          return;
                        try {
                          await patchAdminUserStatus(facilityId, u.id, { isActive: false });
                          setToast({ message: "Accès désactivé", ok: true });
                          await load();
                        } catch (err: unknown) {
                          setToast({
                            message:
                              normalizeUserFacingError(err instanceof Error ? err.message : null) ||
                              genericUserFacingError(),
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
                      Désactiver
                    </button>
                  ) : null}
                  {(!u.isActive || !u.facilityAccessActive) && u.id !== currentUserId ? (
                    <button
                      type="button"
                      onClick={async () => {
                        if (!facilityId) return;
                        try {
                          await patchAdminUserStatus(facilityId, u.id, { isActive: true });
                          setToast({ message: "Accès activé", ok: true });
                          await load();
                        } catch (err: unknown) {
                          setToast({
                            message:
                              normalizeUserFacingError(err instanceof Error ? err.message : null) ||
                              genericUserFacingError(),
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
                      Activer
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

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
            setToast({ message: "Établissement créé.", ok: true });
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      )}

      {showCreate && facilityId && (
        <CreateUserModal
          facilities={facilities}
          defaultFacilityId={facilityId}
          onClose={() => setShowCreate(false)}
          onSuccess={async () => {
            setShowCreate(false);
            setToast({ message: "Utilisateur créé", ok: true });
            await load();
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      )}

      {editUser && facilityId && (
        <EditRolesModal
          facilityId={facilityId}
          facilityDisplayName={currentFacilityName}
          user={editUser}
          onClose={() => setEditUser(null)}
          onSuccess={async () => {
            setEditUser(null);
            setToast({ message: "Rôles mis à jour", ok: true });
            await load();
          }}
          onError={(m) => setToast({ message: m, ok: false })}
        />
      )}

      {profileUser && facilityId && (
        <EditProfileModal
          facilityId={facilityId}
          user={profileUser}
          onClose={() => setProfileUser(null)}
          onSuccess={async () => {
            setProfileUser(null);
            setToast({ message: "Utilisateur mis à jour", ok: true });
            await load();
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
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      onError("Le nom de l’établissement est requis.");
      return;
    }
    setSubmitting(true);
    try {
      await createAdminFacility(facilityId, { name: name.trim() });
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null) ||
          "Impossible de créer l’établissement."
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
        aria-labelledby="add-facility-title"
      >
        <h2 id="add-facility-title" style={{ marginTop: 0 }}>
          Ajouter un établissement
        </h2>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              Nom de l’établissement *
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              autoComplete="organization"
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
              Annuler
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
              {submitting ? "Création…" : "Créer"}
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
  const [selectedFacilityId, setSelectedFacilityId] = useState(defaultFacilityId);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [accountActive, setAccountActive] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const previewPath = getLandingRouteForRoles(Array.from(selected));
  const previewLabel = getLandingHomeLabelFr(previewPath);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      onError("Le prénom est requis");
      return;
    }
    if (!lastName.trim()) {
      onError("Le nom est requis");
      return;
    }
    if (!email.trim()) {
      onError("Le courriel est requis");
      return;
    }
    if (!password?.trim()) {
      onError("Le mot de passe temporaire est requis");
      return;
    }
    if (password.length < 8) {
      onError("Le mot de passe temporaire doit contenir au moins 8 caractères");
      return;
    }
    if (!selectedFacilityId?.trim()) {
      onError("L’établissement est requis");
      return;
    }
    if (selected.size === 0) {
      onError("Au moins un rôle est requis");
      return;
    }
    setSubmitting(true);
    try {
      await createAdminUser(selectedFacilityId, {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        password,
        facilityId: selectedFacilityId,
        roles: Array.from(selected),
        isActive: accountActive,
      });
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null) ||
          "Impossible de créer l’utilisateur."
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
          Créer un utilisateur
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginBottom: 8 }}>
          Après connexion, accueil prévu (selon les rôles cochés) : <strong>{previewLabel}</strong>
        </p>
        <form onSubmit={submit}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Prénom *</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Nom *</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
              />
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Courriel *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>
              Mot de passe temporaire *
            </label>
            <input
              type="password"
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
            <p style={{ fontSize: 12, color: "#888", margin: "6px 0 0 0" }}>Au moins 8 caractères.</p>
          </div>

          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Établissement *</label>
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
              Les rôles sont enregistrés uniquement pour cet établissement.
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
            Compte actif (connexion autorisée si au moins un accès actif)
          </label>

          <div style={{ marginBottom: 16 }}>
            <span style={{ fontWeight: 600, fontSize: 13, display: "block", marginBottom: 8 }}>Rôles *</span>
            {roleCheckboxes(selected, toggle)}
          </div>
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
              Annuler
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
              {submitting ? "Création…" : "Créer"}
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
  const [selected, setSelected] = useState<Set<string>>(() => new Set(user.roles));
  const [submitting, setSubmitting] = useState(false);

  const toggle = (code: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const previewPath = getLandingRouteForRoles(Array.from(selected));
  const previewLabel = getLandingHomeLabelFr(previewPath);
  const effectiveFr = rolesListFr(Array.from(selected).sort());

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selected.size === 0) {
      onError("Au moins un rôle est requis");
      return;
    }
    setSubmitting(true);
    try {
      await patchAdminUserRoles(facilityId, user.id, {
        facilityId,
        roles: Array.from(selected),
      });
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null) ||
          "Impossible de mettre à jour les rôles."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inactiveHint =
    user.rolesInactive && user.rolesInactive.length > 0
      ? `Rôles actuellement inactifs dans cet établissement : ${rolesListFr(user.rolesInactive)}. Cochez-les pour les réactiver.`
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
          Gérer les rôles
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
          {user.firstName} {user.lastName} — {user.email}
        </p>
        <p style={{ fontSize: 13, color: "#444", marginBottom: 8 }}>
          <strong>Établissement :</strong> {facilityDisplayName}
        </p>
        <p style={{ fontSize: 12, color: "#666", marginBottom: 8 }}>
          Seuls les rôles de cet établissement sont modifiés. Les accès dans d&apos;autres établissements restent inchangés.
        </p>
        {inactiveHint ? (
          <p style={{ fontSize: 12, color: "#856404", background: "#fff8e1", padding: 8, borderRadius: 4 }}>{inactiveHint}</p>
        ) : null}
        <p style={{ fontSize: 13, color: "#333", marginBottom: 12 }}>
          <strong>Rôles effectifs (aperçu après enregistrement) :</strong> {effectiveFr}
        </p>
        <p style={{ fontSize: 13, color: "#444", marginBottom: 12 }}>
          Accueil après connexion (aperçu) : <strong>{previewLabel}</strong>
        </p>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 16 }}>{roleCheckboxes(selected, toggle)}</div>
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
              Annuler
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
              {submitting ? "Enregistrement…" : "Enregistrer"}
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
  const [firstName, setFirstName] = useState(user.firstName);
  const [lastName, setLastName] = useState(user.lastName);
  const [email, setEmail] = useState(user.email);
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim()) {
      onError("Le prénom est requis");
      return;
    }
    if (!lastName.trim()) {
      onError("Le nom est requis");
      return;
    }
    if (!email.trim()) {
      onError("Le courriel est requis");
      return;
    }
    const body: { firstName?: string; lastName?: string; email?: string } = {};
    if (firstName.trim() !== user.firstName) body.firstName = firstName.trim();
    if (lastName.trim() !== user.lastName) body.lastName = lastName.trim();
    const em = email.trim().toLowerCase();
    if (em !== user.email.toLowerCase()) body.email = em;
    if (Object.keys(body).length === 0) {
      onClose();
      return;
    }
    setSubmitting(true);
    try {
      await patchAdminUserProfile(facilityId, user.id, body);
      await onSuccess();
    } catch (err: unknown) {
      onError(
        normalizeUserFacingError(err instanceof Error ? err.message : null) ||
          "Impossible de mettre à jour le profil."
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
        }}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="edit-profile-title"
      >
        <h2 id="edit-profile-title" style={{ marginTop: 0 }}>
          Modifier le profil
        </h2>
        <p style={{ fontSize: 13, color: "#666", marginTop: 0 }}>
          {user.firstName} {user.lastName}
        </p>
        <form onSubmit={submit}>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Prénom *</label>
            <input
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Nom *</label>
            <input
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 600, fontSize: 13 }}>Courriel *</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ccc", borderRadius: 4 }}
            />
          </div>
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
              Annuler
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
              {submitting ? "Enregistrement…" : "Enregistrer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
