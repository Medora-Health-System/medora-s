"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchIntegrations, type IntegrationRow } from "@/lib/adminIntegrationsApi";

export default function FhirConnectionManagerPage() {
  const [rows, setRows] = useState<IntegrationRow[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchIntegrations().then(setRows).catch((caught) => setError(caught instanceof Error ? caught.message : "Unable to load integrations"));
  }, []);

  return <main style={{ padding: 24, maxWidth: 1050, margin: "auto" }}>
    <Link href="/app/admin/integrations">← Integrations</Link>
    <h1>FHIR Connection Manager</h1>
    <p>Provision machine credentials, view the public FHIR endpoints, rotate secrets, revoke clients, and test sandbox credentials.</p>
    {error && <p role="alert" style={{ color: "#991b1b", background: "#fee2e2", padding: 12 }}>{error}</p>}
    {!rows.length && !error ? <p>No integrations are configured.</p> : rows.map((row) => <article key={row.id} style={{ border: "1px solid #d8dee9", borderRadius: 10, padding: 16, marginBottom: 12 }}>
      <strong>{row.displayName}</strong> — {row.status}<br />
      <span>{row.partnerName} · {row.environment} · {row.provisioningState} · {row.facilities.length} authorized facilit{row.facilities.length === 1 ? "y" : "ies"}</span>
      <div style={{ marginTop: 10 }}><Link href={`/app/admin/integrations/${row.id}`}>Manage FHIR connection →</Link></div>
    </article>)}
  </main>;
}
