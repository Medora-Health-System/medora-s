import { apiFetch } from "@/lib/apiClient";

export type ProviderDirectoryItem = {
  id: string;
  name: string;
  email: string;
};

export async function fetchProviderDirectory(facilityId: string): Promise<ProviderDirectoryItem[]> {
  const data = await apiFetch("/orders/provider-directory", { facilityId });
  return Array.isArray(data) ? (data as ProviderDirectoryItem[]) : [];
}
