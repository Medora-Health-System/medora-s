"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  fetchFhirClients,
  fetchFhirConnectionInfo,
  fetchFhirCredentials,
  fetchIntegration,
  fetchIntegrationFacilities,
  fetchIntegrationPermissions,
  provisionFhirClient,
  revokeFhirClient,
  revokeFhirCredential,
  rotateFhirCredential,
  testFhirConnection,
  updateFhirClientScopes,
  updateIntegrationPermissions,
  type FhirClientRow,
  type FhirConnectionInfo,
  type FhirCredentialRow,
  type IntegrationFacilityOption,
  type IntegrationPermissionOption,
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
  const [credentialsByClient, setCredentialsByClient] = useState<Record<string, FhirCredentialRow[]>>({});
  const [facilities, setFacilities] = useState<IntegrationFacilityOption[]>([]);
  const [permissionOptions, setPermissionOptions] = useState<IntegrationPermissionOption[]>([]);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [info, setInfo] = useState<FhirConnectionInfo | null>(null);
  const [credential, setCredential] = useState<ProvisionedFhirCredential | null>(null);
  const [testResult, setTestResult] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const [credentialWarning, setCredentialWarning] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!integrationId) return;
    setError("");
    setCredentialWarning("");
    try {
      const [row, clientRows, facilityRows, connectionInfo, permissionRows] = await Promise.all([
        fetchIntegration(integrationId),
        fetchFhirClients(integrationId),
        fetchIntegrationFacilities(),
        fetchFhirConnectionInfo(),
        fetchIntegrationPermissions(),
      ]);

      setIntegration(row);
      setClients(clientRows);
      setFacilities(facilityRows);
      setInfo(connectionInfo);
      setPermissionOptions(permissionRows);
      setSelectedPermissions(row.permissions.map((permission) => permission.capabilityCode));
      setCredentialsByClient({});

      const credentialResults = await Promise.allSettled(
        clientRows.map(async (client) => [client.id, await fetchFhirCredentials(integrationId, client.id)] as const),
      );
      const credentialEntries = credentialResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
      setCredentialsByClient(Object.fromEntries(credentialEntries));
      const failedCredentialLoads = credentialResults.filter((result) => result.status === "rejected").length;
      if (failedCredentialLoads) {
        setCredentialWarning(`Integration loaded, but credential inventory is temporarily unavailable for ${failedCredentialLoads} machine client${failedCredentialLoads === 1 ? "" : "s"}. Other integration controls remain available.`);
      }
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
    setBusy(true); setError(""); setTestResult(""); setStatusMessage("");
    try {
      const result = await provisionFhirClient(integrationId, {
        facilityId,
        displayName: `${integration?.displayName ?? "FHIR"} — ${facilityName(facilityId)}`,
        scopes: integration?.permissions.map((p) => p.capabilityCode) ?? [],
      });
      setCredential(result);
      setStatusMessage("Machine client provisioned. Copy the one-time secret and test it before leaving this page.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to provision FHIR client");
    } finally { setBusy(false); }
  }

  async function rotate(client: FhirClientRow) {
    if (!window.confirm("Rotate credentials? The new secret will be displayed only once. Existing active keys remain valid until you revoke them.")) return;
    setBusy(true); setError(""); setTestResult(""); setStatusMessage("");
    try {
      const result = await rotateFhirCredential(integrationId, client.id);
      setCredential({ ...result, facilityId: client.facilityId, scopes: client.scopes });
      setStatusMessage("New credential created. Test the new key, then revoke the old key when the partner has completed cutover.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to rotate credential");
    } finally { setBusy(false); }
  }

  async function revokeKey(client: FhirClientRow, key: FhirCredentialRow) {
    if (!window.confirm(`Revoke key ${key.keyId}? Any token issued with this key will stop working immediately.`)) return;
    setBusy(true); setError(""); setStatusMessage("");
    try {
      await revokeFhirCredential(integrationId, client.id, key.id);
      if (credential?.clientId === client.id && credential.keyId === key.keyId) setCredential(null);
      setStatusMessage(`Credential ${key.keyId} revoked.`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to revoke credential");
    } finally { setBusy(false); }
  }

  async function revoke(client: FhirClientRow) {
    if (!window.confirm("Revoke this FHIR client and all of its credentials? This immediately blocks current and future machine access.")) return;
    setBusy(true); setError(""); setStatusMessage("");
    try {
      await revokeFhirClient(integrationId, client.id);
      if (credential?.clientId === client.id) setCredential(null);
      setStatusMessage("FHIR client revoked.");
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

  function togglePermission(code: string) {
    setSelectedPermissions((current) => current.includes(code) ? current.filter((item) => item !== code) : [...current, code]);
  }

  async function savePermissions() {
    if (!selectedPermissions.length) {
      setError("Select at least one FHIR permission.");
      return;
    }
    setBusy(true); setError(""); setStatusMessage("");
    try {
      await updateIntegrationPermissions(integrationId, selectedPermissions);
      setStatusMessage("Integration permissions updated. Revoked permissions take effect immediately; use Sync Client Scopes to grant newly-added permissions to an existing machine client.");
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to update integration permissions");
    } finally { setBusy(false); }
  }

  async function syncClientScopes(client: FhirClientRow) {
    const scopes = integration?.permissions.map((permission) => permission.capabilityCode) ?? [];
    if (!scopes.length) return;
    if (!window.confirm("Replace this machine client's scopes with the integration's current granted permissions?")) return;
    setBusy(true); setError(""); setStatusMessage("");
    try {
      await updateFhirClientScopes(integrationId, client.id, scopes);
      setStatusMessage(`Machine client scopes synchronized (${scopes.length} scopes).`);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to synchronize client scopes");
    } finally { setBusy(false); }
  }

  const copy = (value: string) => navigator.clipboard?.writeText(value);

  if (!integration && !error) return <main style={{ padding: 24 }}>Loading integration…</main>;

  return <main style={{ padding: 24, maxWidth: 1100, margin: "auto" }}>
    <Link href="/app/admin/integrations">← Integrations</Link>
    <h1 style={{ marginBottom: 4 }}>{integration?.displayName ?? "FHIR Integration"}</h1>
    {integration && <p style={{ color: "#475569" }}>{integration.partnerName} · {integration.protocol} · {integration.environment} · {integration.status} · {integration.provisioningState}</p>}
    {error && <p role="alert" style={{ color: "#991b1b", background: "#fee2e2", padding: 12, borderRadius: 6 }}>{error}</p>}
    {credentialWarning && <p role="status" style={{ color: "#92400e", background: "#fef3c7", padding: 12, borderRadius: 6 }}>{credentialWarning}</p>}
    {statusMessage && <p role="status" style={{ color: "#166534", background: "#dcfce7", padding: 12, borderRadius: 6 }}>{statusMessage}</p>}

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
      {!clients.length ? <p>No machine client has been provisioned yet.</p> : clients.map((client) => {
        const keys = credentialsByClient[client.id] ?? [];
        const activeKeyCount = keys.filter((key) => key.status === "ACTIVE").length;
        const scopeDrift = [...(integration?.permissions.map((p) => p.capabilityCode) ?? [])].sort().join("|") !== [...client.scopes].sort().join("|");
        return <article key={client.id} style={{ borderTop: "1px solid #e2e8f0", padding: "14px 0" }}>
          <strong>{client.displayName}</strong> — {client.active ? "ACTIVE" : "REVOKED"}<br />
          <small>Facility: {facilityName(client.facilityId)} · Client ID: <code>{client.id}</code></small>
          <p>Scopes: {client.scopes.join(", ") || "none"}</p>
          <p>Active credentials: {activeKeyCount} · Last used: {client.lastUsedAt ? new Date(client.lastUsedAt).toLocaleString() : "Never"}</p>
          {scopeDrift && client.active && <p style={{ color: "#92400e" }}><strong>Scope update available.</strong> Integration grants and machine-client scopes differ.</p>}
          <div style={{ marginBottom: 12 }}>
            {client.active && <><button disabled={busy} onClick={() => void rotate(client)}>Rotate Secret</button>{" "}<button disabled={busy || !scopeDrift} onClick={() => void syncClientScopes(client)}>Sync Client Scopes</button>{" "}<button disabled={busy} onClick={() => void revoke(client)}>Revoke Client</button></>}
          </div>
          <details open>
            <summary><strong>Credentials / Keys ({keys.length})</strong></summary>
            {!keys.length ? <p>No credentials.</p> : <div style={{ overflowX: "auto" }}><table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
              <thead><tr><th align="left">Key ID</th><th align="left">Status</th><th align="left">Created</th><th align="left">Expires</th><th align="left">Last used</th><th /></tr></thead>
              <tbody>{keys.map((key) => <tr key={key.id} style={{ borderTop: "1px solid #e2e8f0" }}>
                <td><code>{key.keyId}</code></td>
                <td>{key.status}</td>
                <td>{new Date(key.createdAt).toLocaleString()}</td>
                <td>{key.expiresAt ? new Date(key.expiresAt).toLocaleString() : "No expiry"}</td>
                <td>{key.lastUsedAt ? new Date(key.lastUsedAt).toLocaleString() : "Never"}</td>
                <td>{client.active && key.status === "ACTIVE" ? <button disabled={busy} onClick={() => void revokeKey(client, key)}>Revoke Key</button> : null}</td>
              </tr>)}</tbody>
            </table></div>}
          </details>
        </article>;
      })}
    </section>

    <section style={panel}>
      <h2>FHIR Permissions</h2>
      <p>Integration permissions are the maximum scopes a machine client may use. Removing a permission takes effect on machine requests immediately. Newly added permissions require <strong>Sync Client Scopes</strong> for an existing client.</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 8, marginBottom: 14 }}>
        {permissionOptions.map((permission) => <label key={permission.code} style={{ border: "1px solid #e2e8f0", borderRadius: 6, padding: 8 }}>
          <input type="checkbox" checked={selectedPermissions.includes(permission.code)} onChange={() => togglePermission(permission.code)} />{" "}
          <code>{permission.code}</code> <small style={{ color: "#64748b" }}>({permission.resourceType} {permission.interaction})</small>
        </label>)}
      </div>
      <button disabled={busy || !selectedPermissions.length} onClick={() => void savePermissions()}>Save FHIR Permissions</button>
      <h3 style={{ marginTop: 18 }}>Currently Granted</h3>
      <ul>{integration?.permissions.map((permission) => <li key={permission.capabilityCode}><code>{permission.capabilityCode}</code></li>)}</ul>
    </section>
  </main>;
}
