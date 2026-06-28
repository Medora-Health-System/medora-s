import { apiFetch } from "./apiClient";
import type {
  EnterpriseOrderSetAnalyticsFilters,
  EnterpriseOrderSetAnalyticsResponse,
} from "@medora/shared";

export async function fetchEnterpriseOrderSetAnalytics(
  facilityId: string,
  query: EnterpriseOrderSetAnalyticsFilters
): Promise<EnterpriseOrderSetAnalyticsResponse> {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (query.orderSetCode) params.set("orderSetCode", query.orderSetCode);
  if (query.category) params.set("category", query.category);
  if (query.clinicalDomain) params.set("clinicalDomain", query.clinicalDomain);
  if (query.providerId) params.set("providerId", query.providerId);
  if (query.encounterId) params.set("encounterId", query.encounterId);
  if (query.limit != null) params.set("limit", String(query.limit));
  if (query.cursor) params.set("cursor", query.cursor);
  const qs = params.toString();
  return (await apiFetch(`/orders/enterprise-order-sets/analytics${qs ? `?${qs}` : ""}`, {
    facilityId,
  })) as EnterpriseOrderSetAnalyticsResponse;
}
