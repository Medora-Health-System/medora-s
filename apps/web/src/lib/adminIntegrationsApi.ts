export type IntegrationPermissionOption = { code: string; resourceType: string; interaction: string };
export type IntegrationFacilityOption = {
  id: string;
  code?: string | null;
  name: string;
  country?: string | null;
  billingCity?: string | null;
  billingStateProvince?: string | null;
};
export type IntegrationRow = { id: string; displayName: string; partnerName: string; status: string; protocol: string; direction: string; environment: string; jurisdiction: string; provisioningState: string; facilities: { facilityId: string; active?: boolean }[]; permissions: { capabilityCode: string }[] };
export type IntegrationConnectionProfile = {
  fhirBaseUrl: string;
  tokenUrl: string;
  metadataUrl: string;
  runtimeEnabled: boolean;
  authMethod: string;
  credentialPolicy: string;
};
export type IntegrationClient = {
  id: string;
  integrationId: string;
  facilityId: string;
  displayName: string;
  sourceSystemIdentifier: string | null;
  active: boolean;
  revokedAt: string | null;
  createdAt: string;
  updatedAt: string;
  scopes: string[];
  credentialCount: number;
  lastUsedAt: string | null;
};
export type ProvisionedIntegrationClient = IntegrationConnectionProfile & {
  clientId: string;
  facilityId: string;
  keyId: string;
  clientSecret: string;
  scopes: string[];
  expiresAt: string | null;
  secretDisplayPolicy: string;
};

async function call(path: string, init?: RequestInit) {
  const res = await fetch(`/api/admin/integrations${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init });
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const details = body?.message;
    const fields = details?.fieldErrors ?? body?.fieldErrors;
    const firstFieldError = fields && Object.values(fields).flat().find((v) => typeof v === "string");
    throw new Error((firstFieldError as string | undefined) ?? (typeof details === "string" ? details : undefined) ?? `Request failed (${res.status})`);
  }
  return body;
}
export const fetchIntegrations = () => call("") as Promise<IntegrationRow[]>;
export const fetchIntegration = (id: string) => call(`/${id}`) as Promise<IntegrationRow>;
export const fetchIntegrationPermissions = () => call("/permission-options") as Promise<IntegrationPermissionOption[]>;
export const fetchIntegrationFacilities = () => call("/facility-options") as Promise<IntegrationFacilityOption[]>;
export const fetchIntegrationConnectionProfile = () => call("/connection-profile") as Promise<IntegrationConnectionProfile>;
export const fetchIntegrationClients = (id: string) => call(`/${id}/clients`) as Promise<IntegrationClient[]>;
export const provisionIntegrationClient = (id: string, body: unknown) => call(`/${id}/clients`, { method: "POST", body: JSON.stringify(body) }) as Promise<ProvisionedIntegrationClient>;
export const rotateIntegrationCredential = (id: string, clientId: string) => call(`/${id}/clients/${clientId}/credentials/rotate`, { method: "POST", body: "{}" }) as Promise<ProvisionedIntegrationClient>;
export const revokeIntegrationClient = (id: string, clientId: string) => call(`/${id}/clients/${clientId}/revoke`, { method: "POST" }) as Promise<{ revoked: boolean; clientId: string }>;
export const createIntegration = (body: unknown) => call("", { method: "POST", body: JSON.stringify(body) }) as Promise<IntegrationRow>;
export const setIntegrationEnabled = (id: string, enabled: boolean) => call(`/${id}/${enabled ? "enable" : "disable"}`, { method: "POST" }) as Promise<IntegrationRow>;
