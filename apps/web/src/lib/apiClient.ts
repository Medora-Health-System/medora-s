const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3000";

export async function apiFetch(
  path: string,
  options: RequestInit & { facilityId?: string } = {}
): Promise<any> {
  const { facilityId, ...fetchOptions } = options;
  
  const headersInit: HeadersInit = fetchOptions.headers || {};
  const headers = new Headers(headersInit);

  // Add facility ID header if provided
  if (facilityId) {
    headers.set("x-facility-id", facilityId);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...fetchOptions,
    headers,
    credentials: "include", // Include cookies
  });

  if (!response.ok) {
    let errorMessage: string;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText;
    }
    throw new Error(errorMessage);
  }

  const contentType = response.headers.get("content-type");
  if (contentType && contentType.includes("application/json")) {
    return response.json();
  }

  return response.text();
}

