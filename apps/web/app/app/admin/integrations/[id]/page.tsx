"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchIntegration,
  fetchIntegrationClients,
  fetchIntegrationConnectionProfile,
  fetchIntegrationFacilities,
  provisionIntegrationClient,
  revokeIntegrationClient,
  rotateIntegrationCredential,
  type IntegrationClient,
  type IntegrationConnectionProfile,
  type IntegrationFacilityOption,
  type IntegrationRow,
  type ProvisionedIntegrationClient,
} from "@/lib/adminIntegrationsApi";

const card = { border: "1px solid #d9e1ea", borderRadius: 10, padding: 18, marginBottom: 16 } as const;
const mono = { fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace", wordBreak: "break-all" as const };

export default function IntegrationDetailPage() {
  const params = useParams<{ id: string }>();
  const id = String(params?.id ?? "");
  const [integration, setIntegration] = useState<IntegrationRow | null>(null);
  const [clients, setClients] = useState<IntegrationClient[]>([]);
  const [facilities, setFacilities] = useState<IntegrationFacilityOption[]>([]);
  const [profile, setProfile] = useState<IntegrationConnectionProfile | null>(null);
  const [credential, setCredential] = useState<ProvisionedIntegrationClient | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [testSecret, setTestSecret] = useState("");
  const [testKeyId, setTestKeyId] = useState("");
  const [testClientId, setTestClientId] = useState("");
  const [testFacilityId, setTestFacilityId] = useState("");

  const load = useCallback(async () => {
    if (!id) return;
    setError("");
    try {
      const [row, machineClients, connectionProfile, facilityOptions] = await Promise.all([
        fetchIntegration(id),
        fetchIntegrationClients(id),
        fetchIntegrationConnectionProfile(),
        fetchIntegrationFacilities(),
      ]);
      setIntegration(row);
      setClients(machineClients);
      setProfile(connectionProfile);
      setFacilities(facilityOptions);
      const authorizedIds = row.facilities.filter((f) => f.active !== false).map((f) => f.facilityId);
      setSelectedFacilityId((current) => current || authorizedIds[0] || "");
      if (!testFacilityId && authorizedIds[0]) setTestFacilityId(authorizedIds[0]);
      if (!testClientId && machineClients[0]) setTestClientId(machineClients[0].id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to load integration details.");
    }
  }, [id, testClientId, testFacilityId]);

  useEffect(() => { void load(); }, [load]);

  const facilityName = useCallback((facilityId: string) => facilities.find((f) => f.id === facilityId)?.name ?? facilityId, [facilities]);
  const authorizedFacilityIds = useMemo(() => integration?.facilities.filter((f) => f.active !== false).map((f) => f.facilityId) ?? [], [integration]);
  const selectedAlreadyProvisioned = clients.some((client) => client.facilityId === selectedFacilityId && client.active && !client.revokedAt);

  async function provision() {
    if (!integration || !selectedFacilityId) return;
    setBusy(true); setError(""); setStatus(""); setCredential(null);
    try {
      const created = await provisionIntegrationClient(integration.id, {
        facilityId: selectedFacilityId,
        displayName: `${integration.displayName} — ${facilityName(selectedFacilityId)}`,
        scopes: integration.permissions.map((p) => p.capabilityCode),
      });
      setCredential(created);
      setTestClientId(created.clientId);
      setTestKeyId(created.keyId);
      setTestSecret(created.clientSecret);
      setTestFacilityId(created.facilityId);
      setStatus("Credentials generated. Copy the client secret now; Medora will not show this secret again.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to provision FHIR credentials.");
    } finally { setBusy(false); }
  }

  async function rotate(client: IntegrationClient) {
    setBusy(true); setError(""); setStatus(""); setCredential(null);
    try {
      const rotated = await rotateIntegrationCredential(id, client.id);
      setCredential(rotated);
      setTestClientId(rotated.clientId);
      setTestKeyId(rotated.keyId);
      setTestSecret(rotated.clientSecret);
      setTestFacilityId(client.facilityId);
      setStatus("New credential generated. Copy the new client secret now. Existing unrevoked credentials remain valid until revoked or expired.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to rotate credential."); }
    finally { setBusy(false); }
  }

  async function revoke(client: IntegrationClient) {
    if (!window.confirm("Revoke this FHIR machine client and all of its credentials?")) return;
    setBusy(true); setError(""); setStatus("");
    try {
      await revokeIntegrationClient(id, client.id);
      setStatus("FHIR machine client revoked.");
      await load();
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Unable to revoke client."); }
    finally { setBusy(false); }
  }

  async function testConnection() {
    if (!testClientId || !testKeyId || !testSecret || !testFacilityId) {
      setError("Client ID, Key ID, Client Secret, and Facility are required for the connection test.");
      return;
    }
    setBusy(true); setError(""); setStatus("Testing client credentials…");
    try {
      const tokenRes = await fetch("/api/fhir/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grant_type: "client_credentials", client_id: testClientId, key_id: testKeyId, client_secret: testSecret, facility_id: testFacilityId }),
      });
      const tokenBody = await tokenRes.json().catch(() => null);
      if (!tokenRes.ok || !tokenBody?.access_token) throw new Error(tokenBody?.message || `Token exchange failed (${tokenRes.status})`);
      const metadataRes = await fetch("/api/fhir/metadata", { headers: { Authorization: `Bearer ${tokenBody.access_token}`, Accept: "application/fhir+json" } });
      const metadata = await metadataRes.json().catch(() => null);
      if (!metadataRes.ok || metadata?.resourceType !== "CapabilityStatement") throw new Error(metadata?.issue?.[0]?.diagnostics || `FHIR metadata check failed (${metadataRes.status})`);
      setStatus(`Connection test passed: client-credentials token issued and FHIR R4 CapabilityStatement reached. Token TTL ${tokenBody.expires_in}s.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "FHIR connection test failed.");
      setStatus("");
    } finally { setBusy(false); }
  }

  if (!integration) return <main style={{ padding: 24, maxWidth: 1050, margin: "auto" }}><Link href="/app/admin/integrations">← Integrations</Link><p>{error || "Loading integration…"}</p></main>;

  return <main style={{ padding: 24, maxWidth: 1050, margin: "auto" }}>
    <Link href="/app/admin/integrations">← Integrations</Link>
    <h1 style={{ marginBottom: 4 }}>{integration.displayName}</h1>
    <p style={{ color: "#475569" }}>{integration.partnerName} · {integration.protocol} · {integration.environment} · {integration.status}</p>
    {error && <p role="alert" style={{ background: "#fee2e2", color: "#991b1b", padding: 12, borderRadius: 7 }}>{error}</p>}
    {status && <p role="status" style={{ background: "#ecfdf5", color: "#166534", padding: 12, borderRadius: 7 }}>{status}</p>}

    <section style={card}>
      <h2>FHIR Connection</h2>
      <p>This is the connection information a third-party laboratory, radiology, pharmacy, HIE, or EMR uses to reach Medora. Do not share a Medora staff username or password.</p>
      <dl style={{ display: "grid", gridTemplateColumns: "180px 1fr", gap: 8 }}>
        <dt>FHIR Base URL</dt><dd style={mono}>{profile?.fhirBaseUrl ?? "Loading…"}</dd>
        <dt>Token URL</dt><dd style={mono}>{profile?.tokenUrl ?? "Loading…"}</dd>
        <dt>Metadata URL</dt><dd style={mono}>{profile?.metadataUrl ?? "Loading…"}</dd>
        <dt>Authentication</dt><dd>OAuth-style client credentials (Medora scoped machine identity)</dd>
        <dt>FHIR runtime</dt><dd><strong>{profile?.runtimeEnabled ? "Enabled" : "Disabled"}</strong>{!profile?.runtimeEnabled && " — credential provisioning can be staged, but token/FHIR tests will remain closed until MEDORA_INTEROP_ENABLED=true."}</dd>
      </dl>
    </section>

    <section style={card}>
      <h2>Authorized Facilities & Permissions</h2>
      <p><strong>Facilities:</strong> {authorizedFacilityIds.map(facilityName).join(", ") || "None"}</p>
      <p><strong>Scopes:</strong> {integration.permissions.map((p) => p.capabilityCode).join(", ") || "None"}</p>
    </section>

    <section style={card}>
      <h2>Provision Machine Credentials</h2>
      <p>Generate one facility-bound machine client. The secret is displayed once only.</p>
      <label style={{ display: "grid", gap: 6, maxWidth: 520 }}>
        Authorized facility
        <select value={selectedFacilityId} onChange={(e) => setSelectedFacilityId(e.target.value)}>
          {authorizedFacilityIds.map((facilityId) => <option key={facilityId} value={facilityId}>{facilityName(facilityId)}</option>)}
        </select>
      </label>
      <button style={{ marginTop: 12 }} disabled={busy || !selectedFacilityId || selectedAlreadyProvisioned} onClick={() => void provision()}>
        {selectedAlreadyProvisioned ? "Client already provisioned for this facility" : `Generate ${integration.environment === "SANDBOX" ? "Sandbox" : "Production"} Credentials`}
      </button>
    </section>

    {credential && <section style={{ ...card, border: "2px solid #b45309", background: "#fffbeb" }}>
      <h2>Copy These Credentials Now</h2>
      <p><strong>Client Secret is shown once.</strong> Store it in the third party&apos;s secure secret manager. Do not put it in email, screenshots, tickets, or Medora notes.</p>
      <dl style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 8 }}>
        <dt>Client ID</dt><dd style={mono}>{credential.clientId}</dd>
        <dt>Key ID</dt><dd style={mono}>{credential.keyId}</dd>
        <dt>Client Secret</dt><dd style={mono}>{credential.clientSecret}</dd>
        <dt>Facility ID</dt><dd style={mono}>{credential.facilityId}</dd>
        <dt>Token URL</dt><dd style={mono}>{credential.tokenUrl}</dd>
        <dt>FHIR Base URL</dt><dd style={mono}>{credential.fhirBaseUrl}</dd>
      </dl>
      <button onClick={() => void navigator.clipboard.writeText(JSON.stringify({ client_id: credential.clientId, key_id: credential.keyId, client_secret: credential.clientSecret, facility_id: credential.facilityId, token_url: credential.tokenUrl, fhir_base_url: credential.fhirBaseUrl, scopes: credential.scopes }, null, 2))}>Copy connection package</button>
    </section>}

    <section style={card}>
      <h2>Provisioned Clients</h2>
      {!clients.length ? <p>No machine client has been provisioned yet.</p> : clients.map((client) => <article key={client.id} style={{ borderTop: "1px solid #e2e8f0", padding: "12px 0" }}>
        <strong>{client.displayName}</strong> — {client.active && !client.revokedAt ? "Active" : "Revoked"}
        <div>Facility: {facilityName(client.facilityId)}</div>
        <div style={mono}>Client ID: {client.id}</div>
        <div>Scopes: {client.scopes.join(", ")}</div>
        <div>Active credentials: {client.credentialCount} · Last used: {client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : "Never"}</div>
        {client.active && !client.revokedAt && <div style={{ display: "flex", gap: 8, marginTop: 8 }}><button disabled={busy} onClick={() => void rotate(client)}>Rotate / Generate New Secret</button><button disabled={busy} onClick={() => void revoke(client)}>Revoke Client</button></div>}
      </article>)}
    </section>

    <section style={card}>
      <h2>Test Connection</h2>
      <p>This performs a real client-credentials token exchange and then requests Medora&apos;s FHIR R4 CapabilityStatement. Immediately after provisioning or rotation, the fields below are filled automatically. Later, paste the stored secret to retest.</p>
      <div style={{ display: "grid", gap: 8 }}>
        <label>Client ID<input style={{ width: "100%" }} value={testClientId} onChange={(e) => setTestClientId(e.target.value)} /></label>
        <label>Key ID<input style={{ width: "100%" }} value={testKeyId} onChange={(e) => setTestKeyId(e.target.value)} /></label>
        <label>Client Secret<input style={{ width: "100%" }} type="password" value={testSecret} onChange={(e) => setTestSecret(e.target.value)} autoComplete="off" /></label>
        <label>Facility ID<select style={{ width: "100%" }} value={testFacilityId} onChange={(e) => setTestFacilityId(e.target.value)}>{authorizedFacilityIds.map((facilityId) => <option value={facilityId} key={facilityId}>{facilityName(facilityId)}</option>)}</select></label>
      </div>
      <button style={{ marginTop: 12 }} disabled={busy || !profile?.runtimeEnabled} onClick={() => void testConnection()}>{profile?.runtimeEnabled ? "Test FHIR Connection" : "FHIR Runtime Disabled"}</button>
    </section>
  </main>;
}
