"use client";

import Link from "next/link";
import { useEffect, useState, useCallback } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import {
  fetchAdminFacilities,
  setAdminFacilityActive,
  setAdminFacilityLanguage,
  type AdminFacilityRow,
} from "@/lib/adminUsersApi";

const FACILITY_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

function switchSessionToFacility(facilityId: string) {
  document.cookie = `medora_facility_id=${facilityId}; path=/; max-age=${FACILITY_COOKIE_MAX_AGE}`;
  window.location.reload();
}

export default function AdminPage() {
  const { ready, canCreateFacilities, facilityId, refreshFromMe } = useFacilityAndRoles();
  const [facilities, setFacilities] = useState<AdminFacilityRow[] | null>(null);
  const [facilitiesError, setFacilitiesError] = useState<string | null>(null);
  const [facilitiesLoading, setFacilitiesLoading] = useState(false);
  const [facilityToggleId, setFacilityToggleId] = useState<string | null>(null);
  const [languageSavingId, setLanguageSavingId] = useState<string | null>(null);

  const loadFacilities = useCallback(async () => {
    setFacilitiesLoading(true);
    setFacilitiesError(null);
    try {
      const rows = await fetchAdminFacilities(facilityId || undefined, {
        includeInactive: true,
      });
      setFacilities(rows);
    } catch (e: unknown) {
      setFacilities(null);
      setFacilitiesError(
        e instanceof Error ? e.message : "Impossible de charger les établissements."
      );
    } finally {
      setFacilitiesLoading(false);
    }
  }, [facilityId]);

  const handleFacilityActiveChange = useCallback(
    async (row: AdminFacilityRow, isActive: boolean) => {
      if (!facilityId) {
        setFacilitiesError("Sélectionnez un établissement pour cette action.");
        return;
      }
      setFacilityToggleId(row.id);
      setFacilitiesError(null);
      try {
        await setAdminFacilityActive(facilityId, row.id, isActive);
        await loadFacilities();
      } catch (e: unknown) {
        setFacilitiesError(
          e instanceof Error ? e.message : "Impossible de mettre à jour l’établissement."
        );
      } finally {
        setFacilityToggleId(null);
      }
    },
    [facilityId, loadFacilities]
  );

  useEffect(() => {
    if (!ready || !canCreateFacilities) return;
    void loadFacilities();
  }, [ready, canCreateFacilities, loadFacilities]);

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginTop: 0 }}>Administration</h1>
      <p style={{ color: "#555", marginBottom: 20 }}>
        Gestion de la plateforme pour les administrateurs de l&apos;établissement.
      </p>
      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        <li>
          <Link
            href="/app/admin/users"
            style={{
              display: "inline-block",
              padding: "12px 20px",
              backgroundColor: "#1a1a1a",
              color: "white",
              borderRadius: 4,
              textDecoration: "none",
              fontWeight: 600,
            }}
          >
            Utilisateurs et accès
          </Link>
        </li>
      </ul>

      {ready && canCreateFacilities ? (
        <section style={{ marginTop: 32 }}>
          <h2 style={{ margin: "0 0 12px 0", fontSize: 18 }}>Établissements</h2>
          {facilitiesLoading ? (
            <p style={{ color: "#555", fontSize: 14 }}>Chargement…</p>
          ) : facilitiesError ? (
            <p style={{ color: "#b71c1c", fontSize: 14 }}>{facilitiesError}</p>
          ) : facilities && facilities.length === 0 ? (
            <p style={{ color: "#555", fontSize: 14 }}>Aucun établissement.</p>
          ) : facilities && facilities.length > 0 ? (
            <div style={{ overflowX: "auto", border: "1px solid #e0e0e0", borderRadius: 8 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid #e0e0e0", background: "#fafafa" }}>
                    <th style={{ textAlign: "left", padding: 10 }}>Nom</th>
                    <th style={{ textAlign: "left", padding: 10 }}>État</th>
                    <th style={{ textAlign: "left", padding: 10 }}>ID</th>
                    <th style={{ textAlign: "right", padding: 10 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {facilities.map((f) => {
                    const rowActive = f.isActive !== false;
                    const busy = facilityToggleId === f.id;
                    return (
                      <tr key={f.id} style={{ borderBottom: "1px solid #eee" }}>
                        <td style={{ padding: 10 }}>
                          <div>{f.name}</div>
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              marginTop: 8,
                            }}
                          >
                            <span style={{ fontSize: 12, color: "#666" }}>Langue:</span>
                            <select
                              value={f.defaultLanguage ?? "fr"}
                              disabled={!facilityId || languageSavingId === f.id}
                              onChange={async (e) => {
                                const newLang = e.target.value as "fr" | "en";
                                if (!facilityId) return;
                                setLanguageSavingId(f.id);
                                try {
                                  await setAdminFacilityLanguage(facilityId, f.id, newLang);
                                  await loadFacilities();
                                  try {
                                    await refreshFromMe();
                                  } catch {
                                    /* shell : événement ci-dessous */
                                  }
                                  window.dispatchEvent(new Event("medora:session-refresh"));
                                } catch {
                                  alert("Impossible de modifier la langue.");
                                } finally {
                                  setLanguageSavingId(null);
                                }
                              }}
                              style={{ padding: 4, borderRadius: 4 }}
                            >
                              <option value="fr">FR</option>
                              <option value="en">EN</option>
                            </select>
                          </div>
                        </td>
                        <td style={{ padding: 10 }}>{rowActive ? "Actif" : "Inactif"}</td>
                        <td style={{ padding: 10, fontFamily: "monospace", fontSize: 13 }}>{f.id}</td>
                        <td style={{ padding: 10, textAlign: "right", whiteSpace: "nowrap" }}>
                          {rowActive ? (
                            <>
                              <button
                                type="button"
                                disabled={busy || !facilityId}
                                onClick={() => void handleFacilityActiveChange(f, false)}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: 13,
                                  cursor: busy || !facilityId ? "not-allowed" : "pointer",
                                  border: "1px solid #b71c1c",
                                  borderRadius: 4,
                                  background: "#fff",
                                  color: "#b71c1c",
                                  fontWeight: 600,
                                  marginRight: 8,
                                }}
                              >
                                Désactiver
                              </button>
                              <button
                                type="button"
                                onClick={() => switchSessionToFacility(f.id)}
                                style={{
                                  padding: "6px 12px",
                                  fontSize: 13,
                                  cursor: "pointer",
                                  border: "1px solid #1a1a1a",
                                  borderRadius: 4,
                                  background: "#fff",
                                  fontWeight: 600,
                                }}
                              >
                                Utiliser cet établissement
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              disabled={busy || !facilityId}
                              onClick={() => void handleFacilityActiveChange(f, true)}
                              style={{
                                padding: "6px 12px",
                                fontSize: 13,
                                cursor: busy || !facilityId ? "not-allowed" : "pointer",
                                border: "1px solid #1a1a1a",
                                borderRadius: 4,
                                background: "#fff",
                                fontWeight: 600,
                              }}
                            >
                              Réactiver
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
