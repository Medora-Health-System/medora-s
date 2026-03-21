"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { apiFetch } from "@/lib/apiClient";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { getEncounterStatusLabelFr, getEncounterTypeLabelFr } from "@/lib/uiLabels";
import { DEFAULT_ENCOUNTER_ROOM_LABEL, ENCOUNTER_ROOM_OPTIONS } from "@/lib/encounterRoomOptions";

function CreateEncounterModal({
  patientId,
  facilityId,
  onClose,
  onSuccess,
}: {
  patientId: string;
  facilityId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [formData, setFormData] = useState({
    type: "OUTPATIENT",
    visitReason: "",
    notes: "",
    roomLabel: DEFAULT_ENCOUNTER_ROOM_LABEL,
    physicianAssignedUserId: "",
  });
  const [providers, setProviders] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
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
  }, [facilityId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await apiFetch(`/patients/${patientId}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: formData.type,
          visitReason: formData.visitReason.trim() || undefined,
          notes: formData.notes.trim() || undefined,
          roomLabel: formData.roomLabel.trim() || DEFAULT_ENCOUNTER_ROOM_LABEL,
          physicianAssignedUserId: formData.physicianAssignedUserId.trim() || undefined,
        }),
        facilityId,
      });
      onSuccess();
    } catch (err) {
      setError(
        normalizeUserFacingError(err instanceof Error ? err.message : null) ||
          "Impossible de créer la consultation."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "white",
          padding: 24,
          borderRadius: 8,
          maxWidth: 500,
          width: "90%",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Démarrer une consultation</h2>
        <p style={{ fontSize: 14, color: "#666", marginTop: 0 }}>
          Choisissez le type de visite ; les libellés correspondent aux circuits habituels.
        </p>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Type *</label>
            <select
              required
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="OUTPATIENT">Clinique</option>
              <option value="EMERGENCY">Urgences</option>
              <option value="INPATIENT">Hospitalisation</option>
              <option value="URGENT_CARE">Soins urgents / intensifs</option>
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Salle</label>
            <select
              value={formData.roomLabel}
              onChange={(e) => setFormData({ ...formData, roomLabel: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            >
              {ENCOUNTER_ROOM_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Médecin attribué (optionnel)</label>
            <select
              value={formData.physicianAssignedUserId}
              onChange={(e) => setFormData({ ...formData, physicianAssignedUserId: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            >
              <option value="">—</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.firstName} {p.lastName}
                </option>
              ))}
            </select>
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Motif de visite (optionnel)</label>
            <input
              type="text"
              value={formData.visitReason}
              onChange={(e) => setFormData({ ...formData, visitReason: e.target.value })}
              placeholder="ex. suivi hypertension"
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={4}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
          {error && (
            <div style={{ padding: 12, backgroundColor: "#fee", color: "#c33", borderRadius: 4, marginBottom: 16 }}>{error}</div>
          )}
          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={{ padding: "10px 20px", border: "1px solid #ddd", borderRadius: 4, cursor: "pointer" }}>
              Annuler
            </button>
            <button
              type="submit"
              disabled={loading}
              style={{
                padding: "10px 20px",
                backgroundColor: "#1a1a1a",
                color: "white",
                border: "none",
                borderRadius: 4,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
              }}
            >
              {loading ? "Création…" : "Démarrer la consultation"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function PatientConsultationsTab({
  patientId,
  facilityId,
  canOpenEncounterDetail,
  onEncounterCreated,
  pendingOpenCreateEncounter,
  onConsumedPendingOpenCreate,
  administrativeOnly,
}: {
  patientId: string;
  facilityId: string;
  canOpenEncounterDetail: boolean;
  onEncounterCreated?: () => void;
  pendingOpenCreateEncounter?: boolean;
  onConsumedPendingOpenCreate?: () => void;
  /** Accueil : liste des visites sans appels inutiles ni bruit console. */
  administrativeOnly?: boolean;
}) {
  const [encounters, setEncounters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [outpatientOnly, setOutpatientOnly] = useState(false);

  const loadEncounters = async () => {
    setLoading(true);
    try {
      const path = outpatientOnly
        ? `/patients/${patientId}/encounters?type=OUTPATIENT&limit=50`
        : `/patients/${patientId}/encounters?limit=50`;
      const data = await apiFetch(path, { facilityId });
      setEncounters(Array.isArray(data) ? data : []);
    } catch {
      setEncounters([]);
      if (!administrativeOnly) {
        // Erreur réseau / RBAC inattendu — éviter le bruit pour l’accueil (chargement attendu sans détail clinique).
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (facilityId) loadEncounters();
  }, [patientId, facilityId, outpatientOnly]);

  useEffect(() => {
    if (pendingOpenCreateEncounter) {
      setShowCreateModal(true);
      onConsumedPendingOpenCreate?.();
    }
  }, [pendingOpenCreateEncounter, onConsumedPendingOpenCreate]);

  if (loading) return <div style={{ padding: 12, color: "#666" }}>Chargement des consultations…</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: 18 }}>Consultations</h3>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ fontSize: 14, display: "flex", alignItems: "center", gap: 6 }}>
            <input type="checkbox" checked={outpatientOnly} onChange={(e) => setOutpatientOnly(e.target.checked)} />
            Consultations externes uniquement
          </label>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            style={{
              padding: "8px 16px",
              backgroundColor: "#1a1a1a",
              color: "white",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Démarrer une consultation
          </button>
        </div>
      </div>

      {encounters.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "#666" }}>Aucune consultation trouvée.</div>
      ) : (
        <div>
          {!canOpenEncounterDetail && (
            <p style={{ fontSize: 13, color: "#666", margin: "0 0 12px 0" }}>
              {administrativeOnly
                ? "L’ouverture du dossier de consultation clinique est réservée à l’équipe soignante et aux modules autorisés."
                : "L’ouverture du détail nécessite un rôle clinique ou facturation. La liste reste visible pour l’accueil."}
            </p>
          )}
          <div style={{ border: "1px solid #e0e0e0", borderRadius: 8, overflow: "hidden" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ backgroundColor: "#f5f5f5" }}>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Type</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Statut</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Salle</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Médecin attribué</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Motif</th>
                  <th style={{ padding: "10px 12px", textAlign: "left" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {encounters.map((encounter) => (
                  <tr key={encounter.id} style={{ borderTop: "1px solid #eee" }}>
                    <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                      {new Date(encounter.createdAt).toLocaleString("fr-FR", {
                        dateStyle: "short",
                        timeStyle: "short",
                      })}
                    </td>
                    <td style={{ padding: "10px 12px" }}>{getEncounterTypeLabelFr(encounter.type)}</td>
                    <td style={{ padding: "10px 12px" }}>
                      <span
                        style={{
                          padding: "4px 8px",
                          borderRadius: 4,
                          fontSize: 12,
                          backgroundColor: encounter.status === "OPEN" ? "#e3f2fd" : "#f5f5f5",
                          color: encounter.status === "OPEN" ? "#1976d2" : "#666",
                        }}
                      >
                        {getEncounterStatusLabelFr(encounter.status)}
                      </span>
                    </td>
                    <td style={{ padding: "10px 12px" }}>{encounter.roomLabel?.trim() || "—"}</td>
                    <td style={{ padding: "10px 12px" }}>
                      {encounter.physicianAssigned
                        ? `${encounter.physicianAssigned.firstName ?? ""} ${encounter.physicianAssigned.lastName ?? ""}`.trim() ||
                          "—"
                        : "—"}
                    </td>
                    <td style={{ padding: "10px 12px", maxWidth: 280 }}>
                      {encounter.visitReason || encounter.chiefComplaint || "—"}
                    </td>
                    <td style={{ padding: "10px 12px" }}>
                      {canOpenEncounterDetail ? (
                        <Link
                          href={`/app/encounters/${encounter.id}`}
                          style={{
                            display: "inline-block",
                            padding: "6px 12px",
                            backgroundColor: "#1a1a1a",
                            color: "#fff",
                            borderRadius: 6,
                            textDecoration: "none",
                            fontSize: 13,
                            fontWeight: 600,
                          }}
                        >
                          Ouvrir la consultation
                        </Link>
                      ) : (
                        <span style={{ fontSize: 12, color: "#9e9e9e" }}>—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {showCreateModal && (
        <CreateEncounterModal
          patientId={patientId}
          facilityId={facilityId}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            loadEncounters();
            onEncounterCreated?.();
          }}
        />
      )}
    </div>
  );
}
