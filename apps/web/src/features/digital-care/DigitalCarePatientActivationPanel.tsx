"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PatientSearchAndSelect } from "@/components/patients/PatientSearchAndSelect";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { useI18n } from "@/lib/i18n";
import {
  fetchPatientPortalAccess,
  issuePatientPortalActivation,
  revokePatientPortalAccess,
  type PatientPortalAccessStatus,
} from "@/lib/patientPortalAdminApi";

type SelectedPatient = { id: string; displayName?: string; firstName?: string; lastName?: string; mrn?: string | null };

export function DigitalCarePatientActivationPanel() {
  const { language } = useI18n();
  const { facilityId, roles, ready } = useFacilityAndRoles();
  const [patient, setPatient] = useState<SelectedPatient | null>(null);
  const [access, setAccess] = useState<PatientPortalAccessStatus | null>(null);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const copy = useMemo(() => {
    if (language === "es") return {
      title: "Acceso a la app del paciente",
      intro: "Active de forma segura el acceso del paciente para el establecimiento actual. El código es de un solo uso y vence en 15 minutos.",
      search: "Buscar paciente para activar",
      status: "Estado",
      account: "Cuenta",
      activation: "Activación",
      issue: "Crear código de activación",
      reissue: "Crear nuevo código",
      copy: "Copiar código",
      copied: "Código copiado.",
      revoke: "Revocar acceso",
      warning: "Comparta este código únicamente con el paciente verificado. Medora no conserva el código visible después de salir de esta pantalla.",
      adminOnly: "Solo ADMIN puede revocar el acceso.",
    };
    if (language === "fr") return {
      title: "Accès à l’application patient",
      intro: "Activez en toute sécurité l’accès du patient pour l’établissement actuel. Le code est à usage unique et expire après 15 minutes.",
      search: "Rechercher le patient à activer",
      status: "Statut",
      account: "Compte",
      activation: "Activation",
      issue: "Créer un code d’activation",
      reissue: "Créer un nouveau code",
      copy: "Copier le code",
      copied: "Code copié.",
      revoke: "Révoquer l’accès",
      warning: "Partagez ce code uniquement avec le patient vérifié. Medora ne conserve pas le code visible après avoir quitté cet écran.",
      adminOnly: "Seul ADMIN peut révoquer l’accès.",
    };
    return {
      title: "Patient App Access",
      intro: "Securely activate patient access for the current facility. The code is single-use and expires in 15 minutes.",
      search: "Search patient to activate",
      status: "Access",
      account: "Account",
      activation: "Activation",
      issue: "Create activation code",
      reissue: "Create new code",
      copy: "Copy code",
      copied: "Code copied.",
      revoke: "Revoke access",
      warning: "Share this code only with the verified patient. Medora does not retain the visible code after you leave this screen.",
      adminOnly: "Only ADMIN can revoke access.",
    };
  }, [language]);

  const canIssue = roles.includes("ADMIN") || roles.includes("FRONT_DESK") || roles.includes("MEDORA_SUPER_ADMIN");
  const canRevoke = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const loadAccess = useCallback(async (selected: SelectedPatient) => {
    if (!facilityId) return;
    setPatient(selected);
    setActivationCode(null);
    setExpiresAt(null);
    setNotice(null);
    setError(null);
    setBusy(true);
    try {
      setAccess(await fetchPatientPortalAccess(facilityId, selected.id));
    } catch (e) {
      setAccess(null);
      setError(e instanceof Error ? e.message : "Unable to load patient app access.");
    } finally {
      setBusy(false);
    }
  }, [facilityId]);

  useEffect(() => {
    setPatient(null);
    setAccess(null);
    setActivationCode(null);
    setExpiresAt(null);
    setNotice(null);
    setError(null);
  }, [facilityId]);

  async function issue() {
    if (!facilityId || !patient) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await issuePatientPortalActivation(facilityId, patient.id);
      setActivationCode(result.activationCode);
      setExpiresAt(result.expiresAt);
      setAccess(await fetchPatientPortalAccess(facilityId, patient.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to create activation code.");
    } finally {
      setBusy(false);
    }
  }

  async function revoke() {
    if (!facilityId || !patient || !canRevoke) return;
    if (!window.confirm(copy.revoke + "?")) return;
    setBusy(true);
    setError(null);
    try {
      await revokePatientPortalAccess(facilityId, patient.id);
      setActivationCode(null);
      setExpiresAt(null);
      setAccess(await fetchPatientPortalAccess(facilityId, patient.id));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to revoke patient app access.");
    } finally {
      setBusy(false);
    }
  }

  async function copyCode() {
    if (!activationCode) return;
    await navigator.clipboard.writeText(activationCode);
    setNotice(copy.copied);
  }

  if (!ready || !facilityId || !canIssue) return null;

  const patientName = patient?.displayName || [patient?.firstName, patient?.lastName].filter(Boolean).join(" ") || "Patient";
  const verified = access?.accessStatus === "VERIFIED" && !access.revokedAt;

  return (
    <section style={{ border: "1px solid #cbd5e1", borderRadius: 14, background: "white", padding: 16, marginTop: 14 }} aria-label={copy.title}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>{copy.title}</h2>
          <p style={{ margin: "5px 0 0", color: "#64748b", fontSize: 13 }}>{copy.intro}</p>
        </div>
        {access ? (
          <span style={{ borderRadius: 999, padding: "4px 10px", fontSize: 12, fontWeight: 800, background: verified ? "#dcfce7" : "#fff7ed", color: verified ? "#166534" : "#9a3412" }}>
            {access.accessStatus}
          </span>
        ) : null}
      </div>

      <div style={{ marginTop: 14 }}>
        <PatientSearchAndSelect
          facilityId={facilityId}
          autoSearch
          placeholder={copy.search}
          onSelect={(selected) => void loadAccess(selected as SelectedPatient)}
        />
      </div>

      {error ? <div role="alert" style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#fee2e2", color: "#991b1b" }}>{error}</div> : null}
      {notice ? <div style={{ marginTop: 12, padding: 10, borderRadius: 10, background: "#dcfce7", color: "#166534" }}>{notice}</div> : null}

      {patient ? (
        <div style={{ marginTop: 14 }}>
          <strong>{patientName}</strong>{patient.mrn ? <span style={{ marginLeft: 8, color: "#64748b", fontSize: 13 }}>MRN {patient.mrn}</span> : null}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 8, marginTop: 10 }}>
            <Status label={copy.status} value={access?.accessStatus || (busy ? "…" : "—")} />
            <Status label={copy.account} value={access?.accountStatus || "—"} />
            <Status label={copy.activation} value={access?.latestActivation?.state || "NONE"} />
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
            <button type="button" onClick={() => void issue()} disabled={busy} style={{ border: 0, borderRadius: 9, background: "#0f766e", color: "white", fontWeight: 800, padding: "9px 12px" }}>
              {access?.latestActivation ? copy.reissue : copy.issue}
            </button>
            <button type="button" onClick={() => void revoke()} disabled={busy || !canRevoke} title={!canRevoke ? copy.adminOnly : undefined} style={{ border: "1px solid #dc2626", borderRadius: 9, background: "white", color: "#b91c1c", fontWeight: 800, padding: "9px 12px", opacity: canRevoke ? 1 : 0.5 }}>
              {copy.revoke}
            </button>
          </div>
        </div>
      ) : null}

      {activationCode ? (
        <div style={{ marginTop: 14, padding: 14, borderRadius: 10, border: "1px solid #f59e0b", background: "#fffbeb" }}>
          <code style={{ display: "block", overflowWrap: "anywhere", background: "white", border: "1px solid #fde68a", borderRadius: 8, padding: 10 }}>{activationCode}</code>
          <p style={{ color: "#92400e", fontSize: 12, margin: "8px 0" }}>{copy.warning}</p>
          {expiresAt ? <div style={{ color: "#92400e", fontSize: 12 }}>{new Date(expiresAt).toLocaleString()}</div> : null}
          <button type="button" onClick={() => void copyCode()} style={{ marginTop: 8, padding: "7px 10px" }}>{copy.copy}</button>
        </div>
      ) : null}
    </section>
  );
}

function Status({ label, value }: { label: string; value: string }) {
  return <div style={{ padding: 10, borderRadius: 9, background: "#f8fafc", border: "1px solid #e2e8f0" }}><div style={{ color: "#64748b", fontSize: 11 }}>{label}</div><strong style={{ fontSize: 13 }}>{value}</strong></div>;
}
