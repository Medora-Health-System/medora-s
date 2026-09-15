"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/apiClient";
import {
  fetchPatientPortalAccess,
  issuePatientPortalActivation,
  revokePatientPortalAccess,
  type PatientPortalAccessStatus,
} from "@/lib/patientPortalAdminApi";

type PatientRow = {
  id: string;
  mrn: string | null;
  firstName: string;
  lastName: string;
  dob: string | null;
  phone: string | null;
};

function asPatientRows(data: unknown): PatientRow[] {
  if (Array.isArray(data)) return data as PatientRow[];
  if (data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: PatientRow[] }).items;
  }
  return [];
}

export default function PatientPortalAdminPage() {
  const { language } = useI18n();
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<PatientRow[]>([]);
  const [selected, setSelected] = useState<PatientRow | null>(null);
  const [access, setAccess] = useState<PatientPortalAccessStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [activationExpiresAt, setActivationExpiresAt] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const c = useMemo(() => {
    if (language === "es") return {
      title: "Portal del paciente",
      intro: "Administre el acceso de pacientes para el establecimiento activo. Los datos y acciones permanecen aislados por establecimiento.",
      back: "← Administración",
      search: "Buscar paciente",
      placeholder: "Nombre, MRN o teléfono",
      patient: "Paciente",
      mrn: "MRN",
      dob: "Fecha de nacimiento",
      status: "Estado del acceso",
      account: "Estado de la cuenta",
      invitation: "Última activación",
      issue: "Crear código de activación",
      reissue: "Crear nuevo código",
      revoke: "Revocar acceso a este establecimiento",
      copy: "Copiar código",
      copied: "Código copiado.",
      select: "Seleccione un paciente para revisar o administrar su acceso.",
      noPatients: "No se encontraron pacientes.",
      codeWarning: "Código de un solo uso. Compártalo únicamente con el paciente verificado. No se guarda después de salir de esta pantalla.",
      adminOnly: "Solo un administrador puede revocar el acceso.",
      accessDenied: "Esta página requiere el rol ADMIN o FRONT_DESK.",
      confirmRevoke: "¿Revocar el acceso de este paciente a este establecimiento?",
    };
    if (language === "fr") return {
      title: "Portail patient",
      intro: "Gérez l’accès patient pour l’établissement actif. Les données et actions restent isolées par établissement.",
      back: "← Administration",
      search: "Rechercher un patient",
      placeholder: "Nom, MRN ou téléphone",
      patient: "Patient",
      mrn: "MRN",
      dob: "Date de naissance",
      status: "Statut d’accès",
      account: "Statut du compte",
      invitation: "Dernière activation",
      issue: "Créer un code d’activation",
      reissue: "Créer un nouveau code",
      revoke: "Révoquer l’accès à cet établissement",
      copy: "Copier le code",
      copied: "Code copié.",
      select: "Sélectionnez un patient pour consulter ou gérer son accès.",
      noPatients: "Aucun patient trouvé.",
      codeWarning: "Code à usage unique. Partagez-le uniquement avec le patient vérifié. Il n’est pas conservé après avoir quitté cet écran.",
      adminOnly: "Seul un administrateur peut révoquer l’accès.",
      accessDenied: "Cette page requiert le rôle ADMIN ou FRONT_DESK.",
      confirmRevoke: "Révoquer l’accès de ce patient à cet établissement ?",
    };
    return {
      title: "Patient Portal",
      intro: "Manage patient access for the active facility. Data and actions remain facility-isolated.",
      back: "← Administration",
      search: "Search patient",
      placeholder: "Name, MRN, or phone",
      patient: "Patient",
      mrn: "MRN",
      dob: "Date of birth",
      status: "Access status",
      account: "Account status",
      invitation: "Latest activation",
      issue: "Create activation code",
      reissue: "Create new code",
      revoke: "Revoke access to this facility",
      copy: "Copy code",
      copied: "Code copied.",
      select: "Select a patient to review or manage portal access.",
      noPatients: "No patients found.",
      codeWarning: "One-time code. Share only with the verified patient. It is not retained after you leave this screen.",
      adminOnly: "Only an administrator can revoke access.",
      accessDenied: "This page requires ADMIN or FRONT_DESK role.",
      confirmRevoke: "Revoke this patient's access to this facility?",
    };
  }, [language]);

  const canView = roles.includes("ADMIN") || roles.includes("FRONT_DESK");
  const canRevoke = roles.includes("ADMIN");

  const searchPatients = useCallback(async () => {
    if (!facilityId || !canView) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.set("q", query.trim());
      const data = await apiFetch(`/patients/search?${params.toString()}`, { facilityId });
      setPatients(asPatientRows(data).slice(0, 50));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to load patients.");
    } finally {
      setLoading(false);
    }
  }, [facilityId, canView, query]);

  useEffect(() => {
    if (ready && canView && facilityId) void searchPatients();
  }, [ready, canView, facilityId, searchPatients]);

  const loadAccess = useCallback(async (patient: PatientRow) => {
    if (!facilityId) return;
    setSelected(patient);
    setActivationCode(null);
    setActivationExpiresAt(null);
    setNotice(null);
    setError(null);
    setAccessLoading(true);
    try {
      setAccess(await fetchPatientPortalAccess(facilityId, patient.id));
    } catch (e) {
      setAccess(null);
      setError(e instanceof Error ? e.message : "Unable to load portal access.");
    } finally {
      setAccessLoading(false);
    }
  }, [facilityId]);

  async function issueActivation() {
    if (!facilityId || !selected) return;
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      const result = await issuePatientPortalActivation(facilityId, selected.id);
      setActivationCode(result.activationCode);
      setActivationExpiresAt(result.expiresAt);
      setAccess(await fetchPatientPortalAccess(facilityId, selected.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to issue activation code.");
    } finally {
      setActionLoading(false);
    }
  }

  async function revokeAccess() {
    if (!facilityId || !selected || !canRevoke) return;
    if (!window.confirm(c.confirmRevoke)) return;
    setActionLoading(true);
    setError(null);
    setNotice(null);
    try {
      await revokePatientPortalAccess(facilityId, selected.id);
      setActivationCode(null);
      setActivationExpiresAt(null);
      setAccess(await fetchPatientPortalAccess(facilityId, selected.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to revoke portal access.");
    } finally {
      setActionLoading(false);
    }
  }

  async function copyCode() {
    if (!activationCode) return;
    await navigator.clipboard.writeText(activationCode);
    setNotice(c.copied);
  }

  if (!ready) return <div style={{ padding: 24 }}>Loading…</div>;
  if (!canView) {
    return <div style={{ padding: 24 }}><Link href="/app/admin">{c.back}</Link><p>{c.accessDenied}</p></div>;
  }

  return (
    <main style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
      <Link href="/app/admin" style={{ color: "#475569", textDecoration: "none" }}>{c.back}</Link>
      <div style={{ marginTop: 16, marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>{c.title}</h1>
        <p style={{ color: "#64748b", maxWidth: 820 }}>{c.intro}</p>
      </div>

      {error ? <div role="alert" style={{ padding: 12, borderRadius: 8, background: "#fee2e2", color: "#991b1b", marginBottom: 16 }}>{error}</div> : null}
      {notice ? <div style={{ padding: 12, borderRadius: 8, background: "#dcfce7", color: "#166534", marginBottom: 16 }}>{notice}</div> : null}

      <div style={{ display: "grid", gridTemplateColumns: "minmax(320px, 0.9fr) minmax(420px, 1.4fr)", gap: 20, alignItems: "start" }}>
        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "white", overflow: "hidden" }}>
          <div style={{ padding: 16, borderBottom: "1px solid #e2e8f0" }}>
            <label style={{ display: "block", fontWeight: 700, marginBottom: 8 }}>{c.search}</label>
            <div style={{ display: "flex", gap: 8 }}>
              <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void searchPatients(); }} placeholder={c.placeholder} style={{ flex: 1, padding: 10, border: "1px solid #cbd5e1", borderRadius: 8 }} />
              <button onClick={() => void searchPatients()} disabled={loading} style={{ padding: "10px 14px" }}>{loading ? "…" : c.search}</button>
            </div>
          </div>
          <div style={{ maxHeight: 620, overflowY: "auto" }}>
            {!loading && patients.length === 0 ? <p style={{ padding: 16, color: "#64748b" }}>{c.noPatients}</p> : null}
            {patients.map((patient) => (
              <button key={patient.id} onClick={() => void loadAccess(patient)} style={{ width: "100%", textAlign: "left", border: 0, borderBottom: "1px solid #f1f5f9", background: selected?.id === patient.id ? "#ecfeff" : "white", padding: 14, cursor: "pointer" }}>
                <strong>{patient.firstName} {patient.lastName}</strong>
                <div style={{ color: "#64748b", fontSize: 13, marginTop: 4 }}>{c.mrn}: {patient.mrn || "—"}{patient.dob ? ` • ${new Date(patient.dob).toLocaleDateString()}` : ""}</div>
              </button>
            ))}
          </div>
        </section>

        <section style={{ border: "1px solid #e2e8f0", borderRadius: 12, background: "white", padding: 20 }}>
          {!selected ? <p style={{ color: "#64748b" }}>{c.select}</p> : (
            <>
              <h2 style={{ marginTop: 0 }}>{selected.firstName} {selected.lastName}</h2>
              <div style={{ color: "#64748b", marginBottom: 18 }}>{c.mrn}: {selected.mrn || "—"}{selected.dob ? ` • ${c.dob}: ${new Date(selected.dob).toLocaleDateString()}` : ""}</div>
              {accessLoading ? <p>Loading…</p> : access ? (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10, marginBottom: 18 }}>
                  <StatusCard label={c.status} value={access.accessStatus} />
                  <StatusCard label={c.account} value={access.accountStatus || "—"} />
                  <StatusCard label={c.invitation} value={access.latestActivation?.state || "NONE"} />
                </div>
              ) : null}

              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                <button onClick={() => void issueActivation()} disabled={actionLoading} style={{ padding: "10px 14px", background: "#087E8B", color: "white", border: 0, borderRadius: 8, fontWeight: 700, cursor: "pointer" }}>
                  {access?.latestActivation ? c.reissue : c.issue}
                </button>
                <button onClick={() => void revokeAccess()} disabled={actionLoading || !canRevoke} title={!canRevoke ? c.adminOnly : undefined} style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid #dc2626", background: "white", color: "#b91c1c", fontWeight: 700, cursor: canRevoke ? "pointer" : "not-allowed", opacity: canRevoke ? 1 : 0.55 }}>
                  {c.revoke}
                </button>
              </div>

              {activationCode ? (
                <div style={{ marginTop: 20, border: "1px solid #f59e0b", background: "#fffbeb", borderRadius: 10, padding: 16 }}>
                  <div style={{ fontWeight: 800, marginBottom: 8 }}>Activation code</div>
                  <code style={{ display: "block", overflowWrap: "anywhere", padding: 12, background: "white", borderRadius: 8, border: "1px solid #fde68a" }}>{activationCode}</code>
                  <div style={{ marginTop: 8, fontSize: 13, color: "#92400e" }}>{c.codeWarning}</div>
                  {activationExpiresAt ? <div style={{ marginTop: 6, fontSize: 13, color: "#92400e" }}>Expires: {new Date(activationExpiresAt).toLocaleString()}</div> : null}
                  <button onClick={() => void copyCode()} style={{ marginTop: 12, padding: "8px 12px" }}>{c.copy}</button>
                </div>
              ) : null}
            </>
          )}
        </section>
      </div>
    </main>
  );
}

function StatusCard({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: 12, border: "1px solid #e2e8f0", borderRadius: 10, background: "#f8fafc" }}><div style={{ fontSize: 12, color: "#64748b", marginBottom: 4 }}>{label}</div><strong>{value}</strong></div>;
}
