"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FacilityServiceConfigModal } from "@/components/admin/FacilityServiceConfigModal";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchAdminFacilities, type AdminFacilityRow } from "@/lib/adminUsersApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";

type FacilityRow = AdminFacilityRow & { serviceLines?: string[]; facilityType?: string };

const cardStyle: React.CSSProperties = { display: "block", padding: 18, border: "1px solid #e2e8f0", borderRadius: 10, background: "#fff", color: "#0f172a", textDecoration: "none" };

export default function FacilityControlPage() {
  const { language } = useI18n();
  const { ready, facilityId, roles, refreshFromMe } = useFacilityAndRoles();
  const [facility, setFacility] = useState<FacilityRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [serviceConfigOpen, setServiceConfigOpen] = useState(false);
  const isAdmin = roles.includes("ADMIN") || roles.includes("MEDORA_SUPER_ADMIN");

  const load = useCallback(async () => {
    if (!facilityId || !isAdmin) return;
    setLoading(true); setError(null);
    try {
      const rows = (await fetchAdminFacilities(facilityId, { includeInactive: true })) as FacilityRow[];
      setFacility(rows.find((row) => row.id === facilityId) ?? null);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || "Unable to load facility administration.");
    } finally { setLoading(false); }
  }, [facilityId, isAdmin, language]);

  useEffect(() => {
    if (!ready) return;
    if (!facilityId || !isAdmin) { setLoading(false); return; }
    void load();
  }, [ready, facilityId, isAdmin, load]);

  const facilityName = useMemo(() => facility?.name || "Current facility", [facility]);
  if (!ready || loading) return <div style={{ padding: 24 }}>Loading facility administration…</div>;
  if (!isAdmin) return <div style={{ padding: 24 }}>Facility administrator access is required.</div>;
  if (!facilityId) return <div style={{ padding: 24 }}>Select a facility before opening administration.</div>;

  const Card = ({ href, title, text }: { href: string; title: string; text: string }) => (
    <Link href={href} style={cardStyle}><strong>{title}</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>{text}</div></Link>
  );

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }} data-testid="facility-admin-control-center">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: "#64748b", textTransform: "uppercase" }}>Facility Administration</div>
        <h1 style={{ margin: "6px 0 6px" }}>Facility Control Center</h1>
        <p style={{ margin: 0, color: "#475569" }}>Control <strong>{facilityName}</strong>. Changes here are scoped to this facility; they do not configure other Medora facilities.</p>
      </div>
      {error ? <div role="alert" style={{ marginBottom: 16, padding: 12, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 8 }}>{error}</div> : null}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>App & clinical configuration</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <button type="button" onClick={() => setServiceConfigOpen(true)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer" }} data-testid="facility-control-service-lines"><strong>Modules & service lines</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Enable the clinical services and capabilities this facility operates.</div></button>
          <Card href="/app/admin/enterprise-workflow" title="Clinical workflows" text="Configure enterprise workflow behavior available to this facility." />
          <Card href="/app/admin/enterprise-clinical-rules" title="Clinical rules" text="Manage clinical governance and facility rule configuration." />
          <Card href="/app/admin/go-live" title="Go-live readiness" text="Review readiness before enabling workflows for production use." />
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>People, security & operations</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <Card href="/app/admin/users" title="Staff, roles & access" text="Manage users and permissions for this facility." />
          <Card href="/app/admin/audit" title="Audit log" text="Review administrative and clinical audit activity." />
          <Card href="/app/admin/mfa" title="MFA administration" text="Manage staff multi-factor authentication recovery." />
          <Card href="/app/reports" title="Operational reports" text="Monitor facility operations and reporting." />
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Revenue & medication operations</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <Card href="/app/admin/billing-governance" title="Billing governance" text="Configure facility billing governance where your role permits it." />
          <Card href="/app/admin/revenue-cycle" title="Revenue cycle" text="Manage facility revenue-cycle workflows." />
          <Card href="/app/admin/medication-governance" title="Medication governance" text="Administer medication governance for this facility." />
          <Card href="/app/admin/medication-inventory-staging" title="Medication inventory" text="Manage medication inventory staging and operational readiness." />
        </div>
      </section>

      {serviceConfigOpen && facility ? <FacilityServiceConfigModal headerFacilityId={facilityId} targetFacilityId={facilityId} facilityDisplayName={facilityName} onClose={() => setServiceConfigOpen(false)} onSuccess={async () => { setServiceConfigOpen(false); await refreshFromMe(); await load(); window.dispatchEvent(new Event("medora:session-refresh")); }} onError={setError} /> : null}
    </div>
  );
}
