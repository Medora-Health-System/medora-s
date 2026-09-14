"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchFhirClients,
  fetchFhirConnectionInfo,
  fetchIntegration,
  fetchIntegrationFacilities,
  provisionFhirClient,
  revokeFhirClient,
  rotateFhirCredential,
  testFhirConnection,
  type FhirClientRow,
  type FhirConnectionInfo,
  type IntegrationFacilityOption,
  type IntegrationRow,
  type ProvisionedFhirCredential,
} from "@/lib/adminIntegrationsApi";

const panel = { border: "1px solid #d8dee9", borderRadius: 10, padding: 18, marginBottom: 18 } as const;
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all" as const };

export default function IntegrationDetailPage() {
  const params = useParams<{ id: string }>();
  const integrationId = String(params?.id ?? "");
  const [integration, setIntegration] = useState<IntegrationRow | null>(null);
  const [clients, setClients] = useState<FhirClientRow[]>([]);
  const [facilities, setFacilities] = useState<IntegrationFacilityOption[]>([]);
  const [info, setInfo] = useState<FhirConnectionInfo | null>(null);
  const [credential, setCredential] = useState<ProvisionedFhirCredential | null>(null);
  const [testResult, setTestResult] = useState<string>("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!integrationId) return;
    setError("");
    try {
      const [row, clientRows, facilityRows, connectionInfo] = await Promise.all([
        fetchIntegration(integrationId),
        fetchFhirClients(integrationId),
        fetchIntegrationFacilities(),
        fetchFhirConnectionInfo(),
      ]);
      setIntegration(row);
      setClients(clientRows);
      setFacilities(facilityRows);
      setInfo(connectionInfo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load integration");
    }
  }, [integrationId]);

  useEffect(() => { void load(); }, [load]);

  const authorizedFacilities = useMemo(() => {
    const ids = new Set((integration?.facilities ?? []).filter((x) => x.active !== false).map((x) => x.facilityId));
    return facilities.filter((f) => ids.has(f.id));
  }, [integration, facilities]);

  const unprovisionedFacilities = authorizedFacilities.filter((facility) => !clients.some((client) => client.facilityId === facility.id && client.active));
  const facilityName = (id: string) => facilities.find((f) => f.id === id)?.name ?? id;

  async function provision(facilityId: string) {
    setBusy(true); setError(""); setTestResult("");
    try {
      const result = await provisionFhirClient(integrationId, {
        facilityId,
        displayName: `${integration?.displayName ?? "FHIR"} — ${facilityName(facilityId)}`,
        scopes: integration?.permissions.map((p) => p.capabilityCode) ?? [],
      });
      setCredential(result);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to provision FHIR client");
    } finally { setBusy(false); }
  }

  async function rotate(client: FhirClientRow) {
    if (!window.confirm("Rotate credentials? The new secret will be displayed only once.")) return;
    setBusy(true); setError(""); setTestResult("");
    try {
      const result = await rotateFhirCredential(integrationId, client.id);
      // Rotation deliberately returns only the new secret material. Rehydrate the
      // facility and effective scopes from the already-loaded machine client so
      // the one-time credential panel and Test Credentials can render safely.
      setCredential({
        ...result,
        facilityId: client.facilityId,
        scopes: client.scopes,
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to rotate credential");
    } finally { setBusy(false); }
  }

  async function revoke(client: FhirClientRow) {
    if (!window.confirm("Revoke this FHIR client and all of its credentials? This immediately blocks future tokens.")) return;
    setBusy(true); setError("");
    try {
      await revokeFhirClient(integrationId, client.id);
      if (credential?.clientId === client.id) setCredential(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to revoke client");
    } finally { setBusy(false); }
  }

  async function testConnection() {
    if (!credential) return;
    setBusy(true); setError(""); setTestResult("");
    try {
      const result = await testFhirConnection(integrationId, {
        clientId: credential.clientId,
        keyId: credential.keyId,
        clientSecret: credential.clientSecret,
        facilityId: credential.facilityId,
      });
      setTestResult(`PASS — token issued for ${result.scopes.length} scope${result.scopes.length === 1 ? "" : "s"}; TTL ${result.expiresIn}s.`);
      await load();
    } catch (caught) {
      setTestResult("");
      setError(caught instanceof Error ? caught.message : "FHIR connection test failed");
    } finally { setBusy(false); }
  }

  const copy = (value: string) => navigator.clipboard?.writeText(value);

  if (!integration && !error) return <main style={{ padding: 24 }}>Loading integration…</main>;

  return <main style={{ padding: 24, maxWidth: 1100, margin: "auto" }}>
    <Link href="/app/admin/integrations">← Integrations</Link>
    <h1 style={{ marginBottom: 4 }}>{integration?.displayName ?? "FHIR Integration"}</h1>
    {integration && <p style={{ color: "#475569" }}>{integration.partnerName} · {integration.protocol} · {integration.environment} · {integration.status} · {integration.provisioningState}</p>}
    {error && <p role="alert" style={{ color: "#991b1b", background: "#fee2e2", padding: 12, borderRadius: 6 }}>{error}</p>}

    <section style={panel}>
      <h2>FHIR Connection</h2>
      <p>This is the information the partner system uses to connect to Medora. Do not give the partner a Medora staff username or password.</p>
      <dl style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8 }}>
        <dt><strong>FHIR Base URL</strong></dt><dd style={mono}>{info?.fhirBaseUrl ?? "—"}</dd>
        <dt><strong>Token URL</strong></dt><dd style={mono}>{info?.tokenUrl ?? "—"}</dd>
        <dt><strong>Metadata URL</strong></dt><dd style={mono}>{info?.metadataUrl ?? "—"}</dd>
        <dt><strong>Authentication</strong></dt><dd>OAuth-style client credentials (Medora machine identity)</dd>
      </dl>
    </section>

    <section style={panel}>
      <h2>Authorized Facilities</h2>
      {authorizedFacilities.length ? <ul>{authorizedFacilities.map((facility) => <li key={facility.id}>{facility.name} <span style={{ color: "#64748b" }}>({facility.country ?? ""})</span></li>)}</ul> : <p>No authorized facility is available.</p>}
      {unprovisionedFacilities.map((facility) => <button key={facility.id} disabled={busy} onClick={() => void provision(facility.id)} style={{ marginRight: 8 }}>
        Generate {integration?.environment === "SANDBOX" ? "Sandbox" : "Production"} Credentials for {facility.name}
      </button>)}
    </section>

    {credential && <section style={{ ...panel, border: "2px solid #d97706", background: "#fffbeb" }}>
      <h2>One-time credential display</h2>
      <p><strong>Copy these values now.</strong> The client secret cannot be recovered after you leave or refresh this page. Medora stores only its Argon2id hash.</p>
      <p><strong>Client ID</strong><br /><code style={mono}>{credential.clientId}</code> <button onClick={() => void copy(credential.clientId)}>Copy</button></p>
      <p><strong>Key ID</strong><br /><code style={mono}>{credential.keyId}</code> <button onClick={() => void copy(credential.keyId)}>Copy</button></p>
      <p><strong>Client Secret</strong><br /><code style={mono}>{credential.clientSecret}</code> <button onClick={() => void copy(credential.clientSecret)}>Copy</button></p>
      <p><strong>Facility ID</strong><br /><code style={mono}>{credential.facilityId}</code> <button onClick={() => void copy(credential.facilityId)}>Copy</button></p>
      <p><strong>Scopes</strong><br /><code style={mono}>{credential.scopes.join(" ")}</code></p>
      <button disabled={busy} onClick={() => void testConnection()}>Test Credentials</button>
      {testResult && <p role="status" style={{ color: "#166534", fontWeight: 700 }}>{testResult}</p>}
      <details style={{ marginTop: 14 }}><summary>Partner token request example</summary><pre style={{ whiteSpace: "pre-wrap", overflowX: "auto" }}>{`curl -X POST '${credential.tokenUrl}' \\
  -H 'Content-Type: application/json' \\
  -d '{
    "grant_type":"client_credentials",
    "client_id":"${credential.clientId}",
    "key_id":"${credential.keyId}",
    "client_secret":"<PASTE-SECRET-HERE>",
    "facility_id":"${credential.facilityId}"
  }'`}</pre></details>
    </section>}

    <section style={panel}>
      <h2>Machine Clients</h2>
      {!clients.length ? <p>No machine client has been provisioned yet.</p> : clients.map((client) => <article key={client.id} style={{ borderTop: "1px solid #e2e8f0", padding: "14px 0" }}>
        <strong>{client.displayName}</strong> — {client.active ? "ACTIVE" : "REVOKED"}<br />
        <small>Facility: {facilityName(client.facilityId)} · Client ID: <code>{client.id}</code></small>
        <p>Scopes: {client.scopes.join(", ") || "none"}</p>
        <p>Active credentials: {client.credentialCount} · Last used: {client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : "Never"}</p>
        {client.active && <><button disabled={busy} onClick={() => void rotate(client)}>Rotate Secret</button> <button disabled={busy} onClick={() => void revoke(client)}>Revoke Client</button></>}
      </article>)}
    </section>

    <section style={panel}>
      <h2>Granted FHIR Permissions</h2>
      <ul>{integration?.permissions.map((permission) => <li key={permission.capabilityCode}><code>{permission.capabilityCode}</code></li>)}</ul>
      <p style={{ color: "#64748b" }}>The machine client can only receive scopes that are already granted to this integration, and every request remains bound to the authorized facility.</p>
    </section>
  </main>;
}
