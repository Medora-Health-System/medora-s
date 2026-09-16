"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { FacilityServiceConfigModal } from "@/components/admin/FacilityServiceConfigModal";
import { useFacilityAndRoles } from "@/hooks/useFacilityAndRoles";
import { fetchAdminFacilities, type AdminFacilityRow } from "@/lib/adminUsersApi";
import { normalizeUserFacingError } from "@/lib/userFacingError";
import { useI18n } from "@/lib/i18n";

type FacilityRow = AdminFacilityRow & { serviceLines?: string[]; facilityType?: string };

const cardStyle: React.CSSProperties = {
  display: "block",
  padding: 18,
  border: "1px solid #e2e8f0",
  borderRadius: 10,
  background: "#fff",
  color: "#0f172a",
  textDecoration: "none",
};

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
    setLoading(true);
    setError(null);
    try {
      // The API applies the facility-admin mutation/read boundary. A facility ADMIN
      // receives only the facility scope they are authorized to administer.
      const rows = (await fetchAdminFacilities(facilityId, { includeInactive: true })) as FacilityRow[];
      setFacility(rows.find((row) => row.id === facilityId) ?? null);
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      setError(normalizeUserFacingError(raw, language) || "Unable to load facility administration.");
    } finally {
      setLoading(false);
    }
  }, [facilityId, isAdmin, language]);

  useEffect(() => {
    if (!ready) return;
    if (!facilityId || !isAdmin) {
      setLoading(false);
      return;
    }
    void load();
  }, [ready, facilityId, isAdmin, load]);

  const facilityName = useMemo(() => {
    if (!facility) return "Current facility";
    return facility.name || facility.displayName || "Current facility";
  }, [facility]);

  if (!ready || loading) return <div style={{ padding: 24 }}>Loading facility administration…</div>;
  if (!isAdmin) return <div style={{ padding: 24 }}>Facility administrator access is required.</div>;
  if (!facilityId) return <div style={{ padding: 24 }}>Select a facility before opening administration.</div>;

  return (
    <div style={{ padding: 24, maxWidth: 1180, margin: "0 auto" }} data-testid="facility-admin-control-center">
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, letterSpacing: ".08em", color: "#64748b", textTransform: "uppercase" }}>
          Facility Administration
        </div>
        <h1 style={{ margin: "6px 0 6px" }}>Facility Control Center</h1>
        <p style={{ margin: 0, color: "#475569" }}>
          Control <strong>{facilityName}</strong>. Changes here are scoped to this facility; they do not configure other Medora facilities.
        </p>
      </div>

      {error ? <div role="alert" style={{ marginBottom: 16, padding: 12, border: "1px solid #fecaca", background: "#fef2f2", borderRadius: 8 }}>{error}</div> : null}

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>App & clinical configuration</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <button type="button" onClick={() => setServiceConfigOpen(true)} style={{ ...cardStyle, textAlign: "left", cursor: "pointer" }} data-testid="facility-control-service-lines">
            <strong>Modules & service lines</strong>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Enable the clinical services and capabilities this facility operates.</div>
          </button>
          <Link href="/app/admin/enterprise-workflow" style={cardStyle}>
            <strong>Clinical workflows</strong>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Configure enterprise workflow behavior available to this facility.</div>
          </Link>
          <Link href="/app/admin/enterprise-clinical-rules" style={cardStyle}>
            <strong>Clinical rules</strong>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Manage clinical governance and facility rule configuration.</div>
          </Link>
          <Link href="/app/admin/go-live" style={cardStyle}>
            <strong>Go-live readiness</strong>
            <div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Review readiness before enabling workflows for production use.</div>
          </Link>
        </div>
      </section>

      <section style={{ marginBottom: 28 }}>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>People, security & operations</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <Link href="/app/admin/users" style={cardStyle}><strong>Staff, roles & access</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Manage users and permissions for this facility.</div></Link>
          <Link href="/app/admin/audit" style={cardStyle}><strong>Audit log</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Review administrative and clinical audit activity.</div></Link>
          <Link href="/app/admin/mfa" style={cardStyle}><strong>MFA administration</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Manage staff multi-factor authentication recovery.</div></Link>
          <Link href="/app/reports" style={cardStyle}><strong>Operational reports</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Monitor facility operations and reporting.</div></Link>
        </div>
      </section>

      <section>
        <h2 style={{ fontSize: 18, marginBottom: 12 }}>Revenue & medication operations</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          <Link href="/app/admin/billing-governance" style={cardStyle}><strong>Billing governance</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Configure facility billing governance where your role permits it.</div></Link>
          <Link href="/app/admin/revenue-cycle" style={cardStyle}><strong>Revenue cycle</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Manage facility revenue-cycle workflows.</div></Link>
          <Link href="/app/admin/medication-governance" style={cardStyle}><strong>Medication governance</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Administer medication governance for this facility.</div></Link>
          <Link href="/app/admin/medication-inventory-staging" style={cardStyle}><strong>Medication inventory</strong><div style={{ marginTop: 6, color: "#64748b", fontSize: 13 }}>Manage medication inventory staging and operational readiness.</div></Link>
        </div>
      </section>

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
    </div>
  );
}
