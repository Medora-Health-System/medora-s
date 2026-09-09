export type IntegrationPermissionOption = { code: string; resourceType: string; interaction: string };
export type IntegrationRow = { id: string; displayName: string; partnerName: string; status: string; protocol: string; direction: string; environment: string; jurisdiction: string; provisioningState: string; facilities: { facilityId: string }[]; permissions: { capabilityCode: string }[] };
async function call(path: string, init?: RequestInit) { const res = await fetch(`/api/admin/integrations${path}`, { credentials: "include", headers: { "Content-Type": "application/json" }, ...init }); if (!res.ok) throw new Error((await res.json().catch(() => null))?.message ?? `Request failed (${res.status})`); return res.json(); }
export const fetchIntegrations = () => call("") as Promise<IntegrationRow[]>;
export const fetchIntegrationPermissions = () => call("/permission-options") as Promise<IntegrationPermissionOption[]>;
export const createIntegration = (body: unknown) => call("", { method: "POST", body: JSON.stringify(body) }) as Promise<IntegrationRow>;
export const setIntegrationEnabled = (id: string, enabled: boolean) => call(`/${id}/${enabled ? "enable" : "disable"}`, { method: "POST" }) as Promise<IntegrationRow>;
