const API_BASE = "/api/backend"; // ✅ proxy through Next so cookies can be used server-side

export async function apiFetch(
  path: string,
  options: RequestInit & { facilityId?: string } = {}
): Promise<any> {
  const { facilityId: providedFacilityId, ...fetchOptions } = options;
  
  const headers = new Headers(fetchOptions.headers);

  // Facility header passed to proxy (proxy will forward to backend)
  if (providedFacilityId) {
    headers.set("x-facility-id", providedFacilityId);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include",
  });

  if (!response.ok) {
    const txt = await response.text().catch(() => "");
    throw new Error(txt || `Request failed: ${response.status}`);
  }

  return response.json();
}

