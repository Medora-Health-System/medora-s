"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";

const ROOM_VALUES = ["Salle d'attente", ...Array.from({ length: 30 }, (_, i) => String(i + 1))];

type ProviderRow = { id: string; firstName: string; lastName: string };

export function EncounterOperationalPanel({
  encounterId,
  facilityId,
  canEdit,
  roomLabel,
  physicianAssigned,
  onUpdated,
  onSaved,
}: {
  encounterId: string;
  facilityId: string;
  canEdit: boolean;
  roomLabel?: string | null;
  physicianAssigned?: { id: string; firstName: string; lastName: string } | null;
  onUpdated: () => void | Promise<void>;
  /** Fusion immédiate des champs renvoyés par l’API (évite affichage vide le temps du GET). */
  onSaved?: (patch: Record<string, unknown>) => void;
}) {
  const [room, setRoom] = useState(roomLabel ?? "");
  const [physicianId, setPhysicianId] = useState(physicianAssigned?.id ?? "");
  const [providers, setProviders] = useState<ProviderRow[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setRoom(roomLabel ?? "");
  }, [roomLabel]);

  useEffect(() => {
    setPhysicianId(physicianAssigned?.id ?? "");
  }, [physicianAssigned?.id]);

  useEffect(() => {
    if (!facilityId || !canEdit) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await apiFetch("/roster/providers", { facilityId });
        if (!cancelled && Array.isArray(data)) setProviders(data);
      } catch {
        if (!cancelled) setProviders([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [facilityId, canEdit]);

  /** Inclut le médecin courant si absent du roster (évite l’affichage d’UUID brut dans le `<select>`). */
  const providersForSelect = useMemo(() => {
    const list = [...providers];
    const effectiveId = (physicianId || physicianAssigned?.id || "").trim();
    if (!effectiveId) return list;
    if (list.some((p) => p.id === effectiveId)) return list;
    if (physicianAssigned && physicianAssigned.id === effectiveId) {
      return [
        {
          id: physicianAssigned.id,
          firstName: physicianAssigned.firstName,
          lastName: physicianAssigned.lastName,
        },
        ...list,
      ];
    }
    return [{ id: effectiveId, firstName: "", lastName: "" }, ...list];
  }, [providers, physicianId, physicianAssigned]);

  const providerOptionLabel = useCallback((p: ProviderRow) => {
    const s = `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim();
    return s || "Médecin attribué";
  }, []);

  const save = useCallback(async () => {
    if (!canEdit) return;
    setSaving(true);
    setError(null);
    try {
      const res = await apiFetch(`/encounters/${encounterId}/operational`, {
        method: "PATCH",
        facilityId,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomLabel: room.trim() || null,
          physicianAssignedUserId: physicianId || null,
        }),
      });
      if (res && typeof res === "object" && !Array.isArray(res) && !(res as { queued?: boolean }).queued) {
        onSaved?.(res as Record<string, unknown>);
      }
      await Promise.resolve(onUpdated());
    } catch (e) {
      setError(normalizeUserFacingError(e instanceof Error ? e.message : null) || "Enregistrement impossible.");
    } finally {
      setSaving(false);
    }
  }, [canEdit, encounterId, facilityId, onUpdated, onSaved, physicianId, room]);

  if (!canEdit) {
    return (
      <div style={{ fontSize: 13, color: "#333", display: "flex", flexWrap: "wrap", gap: 16 }}>
        <div>
          <span style={{ color: "#757575" }}>Salle : </span>
          <strong>{roomLabel?.trim() || "—"}</strong>
        </div>
        <div>
          <span style={{ color: "#757575" }}>Médecin attribué : </span>
          <strong>
            {physicianAssigned
              ? `${physicianAssigned.firstName} ${physicianAssigned.lastName}`.trim()
              : "—"}
          </strong>
        </div>
      </div>
    );
  }

  return (
    <div style={{ borderTop: "1px solid #eee", marginTop: 12, paddingTop: 12 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: "#424242", marginBottom: 8 }}>Paramètres opérationnels</div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 12, alignItems: "flex-end" }}>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>Salle</label>
          <select
            value={room || ""}
            onChange={(e) => setRoom(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", minWidth: 160 }}
          >
            <option value="">—</option>
            {ROOM_VALUES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: "block", fontSize: 12, color: "#555", marginBottom: 4 }}>Médecin attribué</label>
          <select
            value={physicianId}
            onChange={(e) => setPhysicianId(e.target.value)}
            style={{ padding: "8px 10px", borderRadius: 6, border: "1px solid #ccc", minWidth: 220 }}
          >
            <option value="">—</option>
            {providersForSelect.map((p) => (
              <option key={p.id} value={p.id}>
                {providerOptionLabel(p)}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => void save()}
          style={{
            padding: "8px 16px",
            backgroundColor: "#1565c0",
            color: "#fff",
            border: "none",
            borderRadius: 6,
            cursor: saving ? "wait" : "pointer",
            fontWeight: 600,
          }}
        >
          {saving ? "Enregistrement…" : "Enregistrer"}
        </button>
      </div>
      {error && (
        <p style={{ color: "#c62828", fontSize: 13, marginTop: 8 }} role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
