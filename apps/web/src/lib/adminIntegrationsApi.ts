export type IntegrationPermissionOption = { code: string; resourceType: string; interaction: string };
export type IntegrationFacilityOption = { id: string; code: string; name: string; country: string; billingCity: string | null; billingStateProvince: string | null };
export type IntegrationRow = { id: string; displayName: string; partnerName: string; status: string; protocol: string; direction: string; environment: string; jurisdiction: string; provisioningState: string; facilities: { facilityId: string }[]; permissions: { capabilityCode: string }[] };

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
export const fetchIntegrationPermissions = () => call("/permission-options") as Promise<IntegrationPermissionOption[]>;
export const fetchIntegrationFacilities = () => call("/facility-options") as Promise<IntegrationFacilityOption[]>;
export const createIntegration = (body: unknown) => call("", { method: "POST", body: JSON.stringify(body) }) as Promise<IntegrationRow>;
export const setIntegrationEnabled = (id: string, enabled: boolean) => call(`/${id}/${enabled ? "enable" : "disable"}`, { method: "POST" }) as Promise<IntegrationRow>;
