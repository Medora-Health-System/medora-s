"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState, type CSSProperties } from "react";
import { FacilityServiceConfigModal } from "@/components/admin/FacilityServiceConfigModal";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchAdminFacilities, type AdminFacilityRow } from "@/lib/adminUsersApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";

type FacilityRow = AdminFacilityRow & {
  serviceLines?: string[];
  facilityType?: string;
};

type FacilityAdminCopy = {
  eyebrow: string;
  title: string;
  scopeBefore: string;
  scopeAfter: string;
  currentFacility: string;
  loading: string;
  adminRequired: string;
  selectFacility: string;
  loadError: string;
  appSection: string;
  peopleSection: string;
  revenueSection: string;
  modulesTitle: string;
  modulesText: string;
  workflowsTitle: string;
  workflowsText: string;
  rulesTitle: string;
  rulesText: string;
  goLiveTitle: string;
  goLiveText: string;
  staffTitle: string;
  staffText: string;
  auditTitle: string;
  auditText: string;
  mfaTitle: string;
  mfaText: string;
  reportsTitle: string;
  reportsText: string;
  billingTitle: string;
  billingText: string;
  revenueTitle: string;
  revenueText: string;
  medicationTitle: string;
  medicationText: string;
  inventoryTitle: string;
  inventoryText: string;
};

const COPY: Record<"en" | "fr" | "es", FacilityAdminCopy> = {
  en: {
    eyebrow: "Facility administration",
    title: "App & Facility Control",
    scopeBefore: "Control",
    scopeAfter: "from this administration dashboard. Changes are limited to the active facility and do not configure other Medora facilities.",
    currentFacility: "Current facility",
    loading: "Loading facility controls…",
    adminRequired: "Facility administrator access is required.",
    selectFacility: "Select a facility before opening facility controls.",
    loadError: "Unable to load facility controls.",
    appSection: "App & clinical configuration",
    peopleSection: "People, security & operations",
    revenueSection: "Revenue & medication operations",
    modulesTitle: "Modules & service lines",
    modulesText: "Enable the clinical services and capabilities operated by this facility.",
    workflowsTitle: "Clinical workflows",
    workflowsText: "Configure workflow behavior available to this facility.",
    rulesTitle: "Clinical rules",
    rulesText: "Manage clinical governance and facility rules.",
    goLiveTitle: "Go-live readiness",
    goLiveText: "Review facility readiness before production use.",
    staffTitle: "Staff, roles & access",
    staffText: "Manage users and permissions for this facility.",
    auditTitle: "Audit log",
    auditText: "Review administrative and clinical audit activity.",
    mfaTitle: "MFA administration",
    mfaText: "Manage staff multi-factor authentication recovery.",
    reportsTitle: "Operational reports",
    reportsText: "Monitor facility operations and reporting.",
    billingTitle: "Billing governance",
    billingText: "Configure facility billing governance where your role permits it.",
    revenueTitle: "Revenue cycle",
    revenueText: "Manage facility revenue-cycle workflows.",
    medicationTitle: "Medication governance",
    medicationText: "Administer medication governance for this facility.",
    inventoryTitle: "Medication inventory",
    inventoryText: "Manage medication inventory staging and readiness.",
  },
  fr: {
    eyebrow: "Administration de l’établissement",
    title: "Contrôle de l’application et de l’établissement",
    scopeBefore: "Contrôlez",
    scopeAfter: "depuis ce tableau de bord d’administration. Les modifications sont limitées à l’établissement actif et ne configurent aucun autre établissement Medora.",
    currentFacility: "Établissement actuel",
    loading: "Chargement des contrôles de l’établissement…",
    adminRequired: "Un accès administrateur de l’établissement est requis.",
    selectFacility: "Sélectionnez un établissement avant d’ouvrir les contrôles.",
    loadError: "Impossible de charger les contrôles de l’établissement.",
    appSection: "Configuration de l’application et des soins",
    peopleSection: "Personnel, sécurité et opérations",
    revenueSection: "Facturation et opérations médicamenteuses",
    modulesTitle: "Modules et lignes de service",
    modulesText: "Activez les services cliniques et les capacités exploités par cet établissement.",
    workflowsTitle: "Flux de travail cliniques",
    workflowsText: "Configurez les flux de travail disponibles pour cet établissement.",
    rulesTitle: "Règles cliniques",
    rulesText: "Gérez la gouvernance clinique et les règles de l’établissement.",
    goLiveTitle: "Préparation à la mise en service",
    goLiveText: "Vérifiez la préparation de l’établissement avant la mise en production.",
    staffTitle: "Personnel, rôles et accès",
    staffText: "Gérez les utilisateurs et les autorisations de cet établissement.",
    auditTitle: "Journal d’audit",
    auditText: "Consultez l’activité d’audit administrative et clinique.",
    mfaTitle: "Administration de l’A2F",
    mfaText: "Gérez la récupération de l’authentification multifacteur du personnel.",
    reportsTitle: "Rapports opérationnels",
    reportsText: "Suivez les opérations et les rapports de l’établissement.",
    billingTitle: "Gouvernance de la facturation",
    billingText: "Configurez la gouvernance de la facturation selon les autorisations de votre rôle.",
    revenueTitle: "Cycle de revenus",
    revenueText: "Gérez les flux du cycle de revenus de l’établissement.",
    medicationTitle: "Gouvernance des médicaments",
    medicationText: "Administrez la gouvernance des médicaments de cet établissement.",
    inventoryTitle: "Inventaire des médicaments",
    inventoryText: "Gérez la préparation et l’inventaire des médicaments.",
  },
  es: {
    eyebrow: "Administración del establecimiento",
    title: "Control de la aplicación y del establecimiento",
    scopeBefore: "Controle",
    scopeAfter: "desde este panel de administración. Los cambios se limitan al establecimiento activo y no configuran otros establecimientos de Medora.",
    currentFacility: "Establecimiento actual",
    loading: "Cargando controles del establecimiento…",
    adminRequired: "Se requiere acceso de administrador del establecimiento.",
    selectFacility: "Seleccione un establecimiento antes de abrir los controles.",
    loadError: "No se pudieron cargar los controles del establecimiento.",
    appSection: "Configuración de la aplicación y clínica",
    peopleSection: "Personal, seguridad y operaciones",
    revenueSection: "Facturación y operaciones de medicamentos",
    modulesTitle: "Módulos y líneas de servicio",
    modulesText: "Active los servicios clínicos y capacidades que opera este establecimiento.",
    workflowsTitle: "Flujos clínicos",
    workflowsText: "Configure los flujos de trabajo disponibles para este establecimiento.",
    rulesTitle: "Reglas clínicas",
    rulesText: "Administre la gobernanza clínica y las reglas del establecimiento.",
    goLiveTitle: "Preparación para puesta en marcha",
    goLiveText: "Revise la preparación antes del uso en producción.",
    staffTitle: "Personal, roles y acceso",
    staffText: "Administre usuarios y permisos de este establecimiento.",
    auditTitle: "Registro de auditoría",
    auditText: "Revise la actividad administrativa y clínica de auditoría.",
    mfaTitle: "Administración de MFA",
    mfaText: "Administre la recuperación de autenticación multifactor del personal.",
    reportsTitle: "Informes operativos",
    reportsText: "Supervise las operaciones e informes del establecimiento.",
    billingTitle: "Gobernanza de facturación",
    billingText: "Configure la gobernanza de facturación según lo permita su rol.",
    revenueTitle: "Ciclo de ingresos",
    revenueText: "Administre los flujos del ciclo de ingresos del establecimiento.",
    medicationTitle: "Gobernanza de medicamentos",
    medicationText: "Administre la gobernanza de medicamentos del establecimiento.",
    inventoryTitle: "Inventario de medicamentos",
    inventoryText: "Administre el inventario y la preparación operativa de medicamentos.",
  },
};

const cardStyle: CSSProperties = {
  display: "block",
  padding: 16,
  border: "1px solid #dbe3ee",
  borderRadius: 10,
  background: "#fff",
  color: "#0f172a",
  textDecoration: "none",
  minHeight: 86,
};

function localeCopy(language: string | undefined): FacilityAdminCopy {
  const locale = String(language ?? "en").toLowerCase().split("-")[0];
  if (locale === "fr") return COPY.fr;
  if (locale === "es") return COPY.es;
  return COPY.en;
}

export function FacilityAdminControlPanel() {
  const { language } = useI18n();
  const copy = localeCopy(language);
  const { ready, facilityId, roles, refreshFromMe } = useFacilityAndRoles();
  const [facility, setFacility] = useState<FacilityRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceConfigOpen, setServiceConfigOpen] = useState(false);

  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const load = useCallback(async () => {
    if (!facilityId || !isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      // Do not request includeInactive here. That is a platform-only global-list capability.
      // Facility admins receive only active facilities in their authorized scope.
      const rows = (await fetchAdminFacilities(facilityId)) as FacilityRow[];
      const current = rows.find((row) => row.id === facilityId) ?? null;
      setFacility(current);
      if (!current) setError(copy.loadError);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || copy.loadError);
      setFacility(null);
    } finally {
      setLoading(false);
    }
  }, [copy.loadError, facilityId, isAdmin, language]);

  useEffect(() => {
    if (!ready) return;
    if (!facilityId || !isAdmin) {
      setLoading(false);
      return;
    }
    void load();
  }, [ready, facilityId, isAdmin, load]);

  const facilityName = useMemo(() => facility?.name || copy.currentFacility, [copy.currentFacility, facility]);

  if (!ready || loading) {
    return <div style={{ padding: "20px 24px 0" }}>{copy.loading}</div>;
  }
  if (!isAdmin) return null;
  if (!facilityId) {
    return (
      <div style={{ padding: "20px 24px 0" }} role="status">
        {copy.selectFacility}
      </div>
    );
  }

  const Card = ({ href, title, text }: { href: string; title: string; text: string }) => (
    <Link href={href} style={cardStyle}>
      <strong>{title}</strong>
      <div style={{ marginTop: 6, color: "#64748b", fontSize: 13, lineHeight: 1.35 }}>{text}</div>
    </Link>
  );

  return (
    <section
      data-testid="facility-admin-control-panel"
      style={{
        margin: "24px 24px 0",
        padding: 20,
        border: "1px solid #cbd5e1",
        borderRadius: 12,
        background: "#f8fafc",
      }}
    >
      <div style={{ marginBottom: 18 }}>
        <div
          style={{
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: ".08em",
            color: "#64748b",
            textTransform: "uppercase",
          }}
        >
          {copy.eyebrow}
        </div>
        <h2 style={{ margin: "5px 0 6px", fontSize: 24 }}>{copy.title}</h2>
        <p style={{ margin: 0, color: "#475569" }}>
          {copy.scopeBefore} <strong>{facilityName}</strong> {copy.scopeAfter}
        </p>
      </div>

      {error ? (
        <div
          role="alert"
          style={{
            marginBottom: 16,
            padding: 11,
            border: "1px solid #fecaca",
            background: "#fef2f2",
            borderRadius: 8,
          }}
        >
          {error}
        </div>
      ) : null}

      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>{copy.appSection}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <button
            type="button"
            onClick={() => setServiceConfigOpen(true)}
            disabled={!facility}
            style={{ ...cardStyle, textAlign: "left", cursor: facility ? "pointer" : "not-allowed" }}
            data-testid="facility-control-service-lines"
          >
            <strong>{copy.modulesTitle}</strong>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 13, lineHeight: 1.35 }}>{copy.modulesText}</div>
          </button>
          <Card href="/app/admin/enterprise-workflow" title={copy.workflowsTitle} text={copy.workflowsText} />
          <Card href="/app/admin/enterprise-clinical-rules" title={copy.rulesTitle} text={copy.rulesText} />
          <Card href="/app/admin/go-live" title={copy.goLiveTitle} text={copy.goLiveText} />
        </div>
      </div>

      <div style={{ marginBottom: 18 }}>
        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>{copy.peopleSection}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Card href="/app/admin/users" title={copy.staffTitle} text={copy.staffText} />
          <Card href="/app/admin/audit" title={copy.auditTitle} text={copy.auditText} />
          <Card href="/app/admin/mfa" title={copy.mfaTitle} text={copy.mfaText} />
          <Card href="/app/reports" title={copy.reportsTitle} text={copy.reportsText} />
        </div>
      </div>

      <div>
        <h3 style={{ fontSize: 16, margin: "0 0 10px" }}>{copy.revenueSection}</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          <Card href="/app/admin/billing-governance" title={copy.billingTitle} text={copy.billingText} />
          <Card href="/app/admin/revenue-cycle" title={copy.revenueTitle} text={copy.revenueText} />
          <Card href="/app/admin/medication-governance" title={copy.medicationTitle} text={copy.medicationText} />
          <Card href="/app/admin/medication-inventory-staging" title={copy.inventoryTitle} text={copy.inventoryText} />
        </div>
      </div>

      {serviceConfigOpen && facility ? (
        <FacilityServiceConfigModal
          headerFacilityId={facilityId}
          targetFacilityId={facilityId}
          facilityDisplayName={facilityName}
          onClose={() => setServiceConfigOpen(false)}
          onSuccess={async () => {
            setServiceConfigOpen(false);
            await refreshFromMe();
            await load();
            window.dispatchEvent(new Event("medora:session-refresh"));
          }}
          onError={setError}
        />
      ) : null}
    </section>
  );
}
