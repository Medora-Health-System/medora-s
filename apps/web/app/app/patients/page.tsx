"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { apiFetch, parseApiResponse } from "@/lib/apiClient";
import { formatAgeFr, formatAgeYearsSexFr } from "@/lib/patientDisplay";
import { getRegistrationSexLabel } from "@/lib/uiLabels";
import { getCachedRecord, setCachedRecord } from "@/lib/offline/offlineCache";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { DEFAULT_ENCOUNTER_ROOM_LABEL, ENCOUNTER_ROOM_OPTIONS } from "@/lib/encounterRoomOptions";

interface Patient {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  dob: string | null;
  sexAtBirth?: string | null;
  sex?: string | null;
  phone: string | null;
  nationalId?: string | null;
}

function patientSearchList(data: unknown): Patient[] {
  if (Array.isArray(data)) return data as Patient[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: Patient[] }).items;
  }
  return [];
}

function PatientsPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { roles, ready: rolesReady } = useFacilityAndRoles();
  const [searchQuery, setSearchQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [consultationTarget, setConsultationTarget] = useState<Patient | null>(null);
  const [facilityId, setFacilityId] = useState<string>("");

  // Open new-patient modal when landing with ?new=1 (e.g. from registration)
  useEffect(() => {
    if (searchParams.get("new") === "1") setShowModal(true);
  }, [searchParams]);

  useEffect(() => {
    // Get facility ID from cookie (check both names for compatibility)
    const cookieValue = document.cookie
      .split("; ")
      .find((row) => row.startsWith("medora_facility_id="))
      ?.split("=")[1];

    if (cookieValue) {
      setFacilityId(cookieValue);
    } else {
      // Fallback to fetching from user data
      fetch("/api/auth/me")
        .then((res) => parseApiResponse(res))
        .then((data) => {
          const d = data && typeof data === "object" && !Array.isArray(data) ? (data as { facilityRoles?: { facilityId?: string }[] }) : null;
          const firstFacility = d?.facilityRoles?.[0]?.facilityId;
          if (firstFacility) {
            setFacilityId(firstFacility);
            document.cookie = `medora_facility_id=${firstFacility}; path=/; max-age=${365 * 24 * 60 * 60}`;
          }
        });
    }
  }, []);

  useEffect(() => {
    if (searchQuery.trim() || facilityId) {
      handleSearch();
    }
  }, [searchQuery, facilityId]);

  const handleSearch = async () => {
    if (!facilityId) return;
    
    setLoading(true);
    const cacheKey = `patient-search-index:${facilityId}`;
    try {
      const params = new URLSearchParams();
      if (searchQuery.trim()) {
        params.set("q", searchQuery.trim());
      }
      const data = await apiFetch(`/patients/search?${params.toString()}`, {
        facilityId,
      });
      const list = patientSearchList(data);
      setPatients(list);
      void setCachedRecord("patient_summaries", cacheKey, list, { facilityId });
    } catch (error) {
      console.error("Search error:", error);
      const cached = await getCachedRecord<Patient[]>("patient_summaries", cacheKey);
      const base = cached?.data ?? [];
      const q = searchQuery.trim().toLowerCase();
      if (!q) {
        setPatients(base);
      } else {
        setPatients(
          base.filter((p) =>
            `${p.firstName} ${p.lastName} ${p.mrn ?? ""} ${p.phone ?? ""}`.toLowerCase().includes(q)
          )
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const canCreateConsultation =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("FRONT_DESK"));
  /** Aligné sur la page `/app/encounters/[id]` (GET consultation autorisé). */
  const canOpenEncounterDetail =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("BILLING") ||
      roles.includes("LAB") ||
      roles.includes("RADIOLOGY") ||
      roles.includes("PHARMACY"));
  /** Dossier patient hors liste — pas pour accueil seul. */
  const canOpenPatientDossier =
    rolesReady &&
    (roles.includes("RN") ||
      roles.includes("PROVIDER") ||
      roles.includes("ADMIN") ||
      roles.includes("BILLING") ||
      roles.includes("LAB") ||
      roles.includes("RADIOLOGY") ||
      roles.includes("PHARMACY"));

  const handleRowClick = (patientId: string) => {
    if (!canOpenPatientDossier) return;
    router.push(`/app/patients/${patientId}`);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleDateString();
  };

  const thBase: React.CSSProperties = {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: 11,
    fontWeight: 700,
    color: "#64748b",
    letterSpacing: "0.04em",
    textTransform: "uppercase",
    borderBottom: "1px solid #e2e8f0",
    backgroundColor: "#f8fafc",
    whiteSpace: "nowrap",
  };

  const tdBase: React.CSSProperties = {
    padding: "12px 14px",
    fontSize: 14,
    color: "#0f172a",
    verticalAlign: "middle",
    borderBottom: "1px solid #f1f5f9",
  };

  return (
    <div style={{ minHeight: "calc(100vh - 48px)", backgroundColor: "#f8fafc", padding: "0 0 24px 0" }}>
      <div style={{ maxWidth: 1152, margin: "0 auto" }}>
        <header
          style={{
            display: "flex",
            flexDirection: "row",
            flexWrap: "wrap",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 16,
            marginBottom: 24,
          }}
        >
          <div>
            <h1
              style={{
                margin: 0,
                fontSize: "clamp(1.35rem, 2.5vw, 1.65rem)",
                fontWeight: 600,
                color: "#0f172a",
              }}
            >
              Rechercher un patient
            </h1>
            <p style={{ margin: "8px 0 0 0", fontSize: 14, color: "#64748b", maxWidth: 560, lineHeight: 1.5 }}>
              Recherche par nom, NIR ou téléphone dans l&apos;établissement.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowModal(true)}
            style={{
              height: 40,
              padding: "0 18px",
              backgroundColor: "#0f172a",
              color: "#fff",
              border: "none",
              borderRadius: 12,
              cursor: "pointer",
              fontSize: 14,
              fontWeight: 600,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
            }}
          >
            Nouveau patient
          </button>
        </header>

        <div style={{ marginBottom: 20 }}>
          <label htmlFor="patient-search-q" style={{ display: "block", fontSize: 11, fontWeight: 600, color: "#64748b", marginBottom: 6, letterSpacing: "0.02em" }}>
            Recherche
          </label>
          <input
            id="patient-search-q"
            type="search"
            autoComplete="off"
            placeholder="Rechercher par nom, NIR ou téléphone…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: "100%",
              maxWidth: 520,
              height: 44,
              padding: "0 16px",
              border: "1px solid #e2e8f0",
              borderRadius: 12,
              fontSize: 15,
              color: "#0f172a",
              backgroundColor: "#fff",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
              boxSizing: "border-box",
            }}
          />
        </div>

        {loading && (
          <div
            style={{
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              backgroundColor: "#fff",
              padding: 28,
              textAlign: "center",
              color: "#64748b",
              fontSize: 14,
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            Chargement…
          </div>
        )}

        {!loading && patients.length === 0 && searchQuery && (
          <div
            style={{
              padding: "32px 24px",
              textAlign: "center",
              color: "#334155",
              border: "1px dashed #cbd5e1",
              borderRadius: 16,
              backgroundColor: "rgba(255,255,255,0.95)",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.05)",
            }}
          >
            <div style={{ fontWeight: 600, fontSize: 16 }}>Aucun patient trouvé</div>
            <div style={{ marginTop: 8, fontSize: 14, color: "#64748b" }}>Essayez un autre nom, numéro ou identifiant</div>
          </div>
        )}

        {!loading && patients.length > 0 && (
          <div
            style={{
              backgroundColor: "#fff",
              borderRadius: 16,
              border: "1px solid #e2e8f0",
              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.06)",
              overflow: "hidden",
            }}
          >
            <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
                <thead>
                  <tr>
                    <th style={thBase}>NIR</th>
                    <th style={thBase}>Nom</th>
                    <th style={thBase}>Âge / Sexe</th>
                    <th style={thBase}>Date de naissance</th>
                    <th style={thBase}>Téléphone</th>
                    <th style={{ ...thBase, textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((patient) => (
                    <tr
                      key={patient.id}
                      onClick={() => handleRowClick(patient.id)}
                      style={{
                        cursor: canOpenPatientDossier ? "pointer" : "default",
                        backgroundColor: "#fff",
                      }}
                      onMouseEnter={(e) => {
                        if (canOpenPatientDossier) e.currentTarget.style.backgroundColor = "#f8fafc";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = "#fff";
                      }}
                    >
                      <td style={{ ...tdBase, fontVariantNumeric: "tabular-nums", color: "#334155" }}>{patient.mrn || "-"}</td>
                      <td style={{ ...tdBase, fontWeight: 500 }}>{patient.firstName} {patient.lastName}</td>
                      <td style={tdBase}>{formatAgeYearsSexFr(patient.dob, patient.sexAtBirth ?? null, patient.sex ?? null)}</td>
                      <td style={{ ...tdBase, fontVariantNumeric: "tabular-nums" }}>{formatDate(patient.dob)}</td>
                      <td style={{ ...tdBase, fontVariantNumeric: "tabular-nums" }}>{patient.phone || "-"}</td>
                      <td style={{ ...tdBase, textAlign: "right" }} onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: "inline-flex", gap: 8, flexWrap: "wrap", justifyContent: "flex-end" }}>
                          <button
                            type="button"
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleRowClick(patient.id);
                            }}
                            disabled={!canOpenPatientDossier}
                            style={{
                              padding: "8px 14px",
                              border: "1px solid #cbd5e1",
                              borderRadius: 10,
                              background: "#fff",
                              color: "#334155",
                              cursor: canOpenPatientDossier ? "pointer" : "not-allowed",
                              fontSize: 13,
                              fontWeight: 600,
                              opacity: canOpenPatientDossier ? 1 : 0.55,
                              boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
                            }}
                          >
                            Ouvrir le dossier
                          </button>
                          {canCreateConsultation && (
                            <button
                              type="button"
                              onClick={(ev) => {
                                ev.stopPropagation();
                                setConsultationTarget(patient);
                              }}
                              style={{
                                padding: "8px 14px",
                                border: "none",
                                borderRadius: 10,
                                background: "#0f172a",
                                color: "#fff",
                                cursor: "pointer",
                                fontSize: 13,
                                fontWeight: 600,
                                boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
                              }}
                            >
                              Créer une consultation
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {showModal && (
        <NewPatientModal
          facilityId={facilityId}
          canCreateConsultation={canCreateConsultation}
          onClose={() => setShowModal(false)}
          onSuccess={(createdPatient) => {
            setShowModal(false);
            handleSearch();
            if (createdPatient && canCreateConsultation) {
              setConsultationTarget(createdPatient);
            }
          }}
        />
      )}
      {consultationTarget && facilityId && (
        <CreateConsultationModal
          facilityId={facilityId}
          patient={consultationTarget}
          canOpenEncounterDetail={canOpenEncounterDetail}
          onClose={() => setConsultationTarget(null)}
        />
      )}
    </div>
  );
}

export default function PatientsPage() {
  return (
    <Suspense
      fallback={
        <div style={{ minHeight: "40vh", padding: 24, backgroundColor: "#f8fafc", color: "#64748b", fontSize: 14 }}>Chargement…</div>
      }
    >
      <PatientsPageContent />
    </Suspense>
  );
}

function NewPatientModal({
  facilityId,
  canCreateConsultation,
  onClose,
  onSuccess,
}: {
  facilityId: string;
  canCreateConsultation: boolean;
  onClose: () => void;
  onSuccess: (patient?: Patient | null) => void;
}) {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "" as "" | "HOMME" | "FEMME" | "AUTRE" | "INCONNU",
    phone: "",
    email: "",
    address: "",
    nationalId: "",
    emergencyContact: "",
    adminNotes: "",
    city: "",
    country: "",
    language: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [similarPatients, setSimilarPatients] = useState<Patient[]>([]);
  const [checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [duplicateHint, setDuplicateHint] = useState<string>("");

  useEffect(() => {
    const first = formData.firstName.trim();
    const last = formData.lastName.trim();
    const dob = formData.dateOfBirth.trim();
    const phone = formData.phone.trim();
    const canCheck = first.length >= 2 && last.length >= 2 && (Boolean(dob) || phone.length >= 6);
    if (!canCheck || !facilityId) {
      setSimilarPatients([]);
      setDuplicateHint("");
      return;
    }
    const run = async () => {
      setCheckingDuplicates(true);
      setDuplicateHint("");
      try {
        const query = `${first} ${last} ${phone}`.trim();
        const raw = await apiFetch(`/patients/search?q=${encodeURIComponent(query)}`, {
          facilityId,
        });
        const list = patientSearchList(raw);
        const matches = list.filter((p) => {
          const sameDob = dob && p.dob ? new Date(p.dob).toISOString().slice(0, 10) === dob : false;
          const samePhone = phone && p.phone ? p.phone.replace(/\s+/g, "") === phone.replace(/\s+/g, "") : false;
          const sameName =
            p.firstName?.trim().toLowerCase() === first.toLowerCase() &&
            p.lastName?.trim().toLowerCase() === last.toLowerCase();
          return sameName && (sameDob || samePhone);
        });
        setSimilarPatients(matches.slice(0, 5));
      } catch {
        const cached = await getCachedRecord<Patient[]>("patient_summaries", `patient-search-index:${facilityId}`);
        const local = (cached?.data ?? []).filter((p) => {
          const sameName =
            p.firstName?.trim().toLowerCase() === first.toLowerCase() &&
            p.lastName?.trim().toLowerCase() === last.toLowerCase();
          return sameName;
        });
        setSimilarPatients(local.slice(0, 5));
        setDuplicateHint("Vérification des doublons limitée hors ligne");
      } finally {
        setCheckingDuplicates(false);
      }
    };
    const t = window.setTimeout(() => {
      void run();
    }, 350);
    return () => window.clearTimeout(t);
  }, [facilityId, formData.firstName, formData.lastName, formData.dateOfBirth, formData.phone]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!facilityId) {
      setError("Identifiant d'établissement requis");
      return;
    }
    const hasContact = formData.phone.trim().length >= 5 || formData.email.trim().length > 0;
    if (!hasContact) {
      setError("Le téléphone ou le courriel est requis");
      return;
    }
    const birth = new Date(formData.dateOfBirth);
    if (Number.isNaN(birth.getTime())) {
      setError("Date de naissance invalide");
      return;
    }
    if (birth.getTime() > Date.now()) {
      setError("La date de naissance ne peut pas être dans le futur");
      return;
    }

    setLoading(true);
    setError(null);
    setInfo(null);

    try {
      const payload: Record<string, unknown> = {
        firstName: formData.firstName.trim(),
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        sex: formData.sex,
      };
      if (formData.phone.trim()) payload.phone = formData.phone.trim();
      if (formData.email.trim()) payload.email = formData.email.trim();
      if (formData.nationalId.trim()) payload.nationalId = formData.nationalId.trim();
      if (formData.address.trim()) payload.address = formData.address.trim();
      if (formData.city.trim()) payload.city = formData.city.trim();
      if (formData.country.trim()) payload.country = formData.country.trim();
      if (formData.language.trim()) payload.language = formData.language.trim();

      const res = await apiFetch("/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        facilityId,
      });
      if (res?.queued) {
        setInfo("Création enregistrée hors ligne. Le dossier sera synchronisé dès le retour de la connexion");
        onSuccess(null);
        return;
      }
      onSuccess((res as Patient) ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de créer le patient");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
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
          maxWidth: 600,
          width: "90%",
          maxHeight: "90vh",
          overflow: "auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginTop: 0 }}>Nouveau patient</h2>
        <p style={{ fontSize: 14, color: "#444", marginTop: -8, marginBottom: 16 }}>
          {formData.dateOfBirth && formData.sex
            ? formatAgeYearsSexFr(formData.dateOfBirth, formData.sex)
            : "Renseignez la date de naissance et le sexe — l’âge est calculé automatiquement."}
        </p>
        <form onSubmit={handleSubmit}>
          <h3 style={{ margin: "0 0 12px 0", fontSize: 16 }}>Identité</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                Prénom *
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>
                Nom *
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Date de naissance *</label>
              <input
                type="date"
                required
                value={formData.dateOfBirth}
                onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Sexe *</label>
              <select
                required
                value={formData.sex}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sex: e.target.value as "" | "HOMME" | "FEMME" | "AUTRE" | "INCONNU",
                  })
                }
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
              >
                <option value="">—</option>
                <option value="HOMME">{getRegistrationSexLabel("HOMME")}</option>
                <option value="FEMME">{getRegistrationSexLabel("FEMME")}</option>
                <option value="AUTRE">{getRegistrationSexLabel("AUTRE")}</option>
                <option value="INCONNU">{getRegistrationSexLabel("INCONNU")}</option>
              </select>
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Âge</label>
              <input
                type="text"
                readOnly
                value={formatAgeFr(formData.dateOfBirth)}
                style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, backgroundColor: "#f7f7f7" }}
              />
            </div>
          </div>

          <h3 style={{ margin: "6px 0 12px 0", fontSize: 16 }}>Contact</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Courriel</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Adresse</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <h3 style={{ margin: "6px 0 12px 0", fontSize: 16 }}>Identifiants</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>NIR / Identifiant national</label>
            <input
              type="text"
              value={formData.nationalId}
              onChange={(e) => setFormData({ ...formData, nationalId: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>

          <h3 style={{ margin: "6px 0 12px 0", fontSize: 16 }}>Informations complémentaires</h3>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Contact d’urgence</label>
            <input
              type="text"
              value={formData.emergencyContact}
              onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4 }}
            />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Notes administratives</label>
            <textarea
              value={formData.adminNotes}
              onChange={(e) => setFormData({ ...formData, adminNotes: e.target.value })}
              rows={3}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, resize: "vertical" }}
            />
          </div>

          {(checkingDuplicates || similarPatients.length > 0 || duplicateHint) && (
            <div style={{ marginBottom: 16, border: "1px solid #ffe082", background: "#fffde7", borderRadius: 6, padding: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Patients similaires trouvés</div>
              <div style={{ fontSize: 13, color: "#6d4c41", marginBottom: 8 }}>
                Vérifiez avant de créer un nouveau dossier
              </div>
              {checkingDuplicates && <div style={{ fontSize: 13 }}>Vérification en cours…</div>}
              {!checkingDuplicates && duplicateHint && <div style={{ fontSize: 13, marginBottom: 6 }}>{duplicateHint}</div>}
              {!checkingDuplicates && similarPatients.length > 0 && (
                <div style={{ display: "grid", gap: 6 }}>
                  {similarPatients.map((p) => (
                    <div key={p.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 13 }}>
                        {p.firstName} {p.lastName} · {p.dob ? new Date(p.dob).toLocaleDateString("fr-FR") : "—"}
                      </span>
                      <a href={`/app/patients/${p.id}`} style={{ fontSize: 12, color: "#1a1a1a" }}>
                        Ouvrir le dossier existant
                      </a>
                    </div>
                  ))}
                </div>
              )}
              {!checkingDuplicates && <div style={{ marginTop: 8, fontSize: 12 }}>Continuer quand même</div>}
            </div>
          )}

          {info && (
            <div style={{ padding: 12, backgroundColor: "#e8f5e9", color: "#1b5e20", borderRadius: 4, marginBottom: 16 }}>
              {info}
            </div>
          )}
          {error && (
            <div style={{ padding: 12, backgroundColor: "#fee", color: "#c33", borderRadius: 4, marginBottom: 16 }}>
              {error}
            </div>
          )}

          <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 20px",
                border: "1px solid #ddd",
                borderRadius: 4,
                cursor: "pointer",
                backgroundColor: "white",
              }}
            >
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
              {loading ? "Création…" : canCreateConsultation ? "Créer le patient" : "Enregistrer le patient"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function CreateConsultationModal({
  facilityId,
  patient,
  canOpenEncounterDetail,
  onClose,
}: {
  facilityId: string;
  patient: Patient;
  canOpenEncounterDetail: boolean;
  onClose: () => void;
}) {
  const [type, setType] = useState<"OUTPATIENT" | "URGENT_CARE" | "EMERGENCY">("OUTPATIENT");
  const [visitReason, setVisitReason] = useState("");
  const [roomLabel, setRoomLabel] = useState(DEFAULT_ENCOUNTER_ROOM_LABEL);
  const [physicianAssignedUserId, setPhysicianAssignedUserId] = useState("");
  const [providers, setProviders] = useState<{ id: string; firstName: string; lastName: string }[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [created, setCreated] = useState<{ id: string; queued?: boolean } | null>(null);

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

  const createEncounter = async () => {
    if (!facilityId || !patient?.id) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await apiFetch(`/patients/${patient.id}/encounters`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          visitReason: visitReason.trim() || undefined,
          roomLabel: roomLabel.trim() || DEFAULT_ENCOUNTER_ROOM_LABEL,
          physicianAssignedUserId: physicianAssignedUserId.trim() || undefined,
        }),
        facilityId,
      });
      if (res?.queued) {
        setCreated({ id: "", queued: true });
        return;
      }
      setCreated({ id: (res as { id: string }).id });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Impossible de créer la consultation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1200 }} onClick={onClose}>
      <div style={{ width: "92%", maxWidth: 520, backgroundColor: "#fff", borderRadius: 8, padding: 20 }} onClick={(e) => e.stopPropagation()}>
        <h2 style={{ margin: "0 0 8px 0" }}>Créer une consultation</h2>
        <p style={{ margin: "0 0 14px 0", color: "#555", fontSize: 14 }}>
          {patient.firstName} {patient.lastName}
        </p>
        {!created && (
          <>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Type de consultation</label>
            <select value={type} onChange={(e) => setType(e.target.value as "OUTPATIENT" | "URGENT_CARE" | "EMERGENCY")} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}>
              <option value="OUTPATIENT">Consultation externe</option>
              <option value="URGENT_CARE">Soins urgents</option>
              <option value="EMERGENCY">Urgence</option>
            </select>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Salle</label>
            <select
              value={roomLabel}
              onChange={(e) => setRoomLabel(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}
            >
              {ENCOUNTER_ROOM_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Médecin attribué (optionnel)</label>
            <select
              value={physicianAssignedUserId}
              onChange={(e) => setPhysicianAssignedUserId(e.target.value)}
              style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, marginBottom: 12 }}
            >
              <option value="">—</option>
              {providers.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.lastName} {p.firstName}
                </option>
              ))}
            </select>
            <label style={{ display: "block", marginBottom: 4, fontWeight: 500 }}>Motif de visite</label>
            <textarea value={visitReason} onChange={(e) => setVisitReason(e.target.value)} rows={3} style={{ width: "100%", padding: 8, border: "1px solid #ddd", borderRadius: 4, resize: "vertical" }} />
            {error && <div style={{ marginTop: 10, color: "#c62828", fontSize: 13 }}>{error}</div>}
            <div style={{ marginTop: 14, display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button type="button" onClick={onClose} style={{ padding: "9px 14px", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>
                Retour à la liste
              </button>
              <button type="button" onClick={() => void createEncounter()} disabled={submitting} style={{ padding: "9px 14px", border: "none", borderRadius: 4, background: "#1a1a1a", color: "#fff", cursor: "pointer", opacity: submitting ? 0.7 : 1 }}>
                {submitting ? "Création…" : "Créer la consultation"}
              </button>
            </div>
          </>
        )}
        {created && (
          <div>
            <div style={{ color: "#1b5e20", marginBottom: 14, fontWeight: 600 }}>
              {created.queued
                ? "Consultation enregistrée hors ligne"
                : "Consultation créée"}
            </div>
            {created.queued && (
              <p style={{ margin: "0 0 14px 0", fontSize: 13, color: "#2e7d32" }}>
                Le dossier sera synchronisé dès le retour de la connexion
              </p>
            )}
            <div style={{ display: "flex", gap: 10 }}>
              {!created.queued && created.id && (
                canOpenEncounterDetail ? (
                  <Link
                    href={`/app/encounters/${created.id}`}
                    style={{ padding: "8px 12px", borderRadius: 4, background: "#1a1a1a", color: "#fff", textDecoration: "none", fontSize: 13, display: "inline-block" }}
                  >
                    Ouvrir la consultation
                  </Link>
                ) : (
                  <Link
                    href={`/app/patients/${patient.id}`}
                    style={{ padding: "8px 12px", borderRadius: 4, background: "#1a1a1a", color: "#fff", textDecoration: "none", fontSize: 13, display: "inline-block" }}
                  >
                    Ouvrir le dossier
                  </Link>
                )
              )}
              <button type="button" onClick={onClose} style={{ padding: "8px 12px", border: "1px solid #ddd", borderRadius: 4, background: "#fff", cursor: "pointer" }}>
                Retour à la liste
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
