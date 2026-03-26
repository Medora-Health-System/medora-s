/** Base path for backend proxy. Pass backend-relative paths only (e.g. "/trackboard", "/pharmacy/inventory"), not "/api/backend/...". */
import { normalizeUserFacingError } from "./userFacingError";
import { enqueueOfflineAction } from "@/lib/offline/offlineQueue";
import type { OfflineQueueItemType } from "@/lib/offline/offlineTypes";
import { processOfflineQueueOnce } from "@/lib/offline/offlineSync";

const API_BASE = "/api/backend";

/**
 * Lecture sûre du corps de réponse — évite `response.json()` sur corps vide
 * (« Unexpected end of JSON input »).
 */
export async function parseApiResponse(response: Response): Promise<unknown> {
  if (response.status === 204) return null;

  const contentType = response.headers.get("content-type") || "";
  const contentLength = response.headers.get("content-length");

  if (contentLength === "0") return null;

  const text = await response.text().catch(() => "");

  const trimmed = text.trim();
  if (!trimmed) return null;

  if (contentType.toLowerCase().includes("application/json")) {
    try {
      return JSON.parse(trimmed);
    } catch {
      throw new Error("Réponse JSON invalide du serveur");
    }
  }

  return trimmed;
}

/** Objet JSON attendu (GET) : exclut null, tableaux, et enveloppe hors-ligne `queued`. */
export function asApiObject<T extends object = Record<string, unknown>>(data: unknown): T | null {
  if (data === null || typeof data !== "object" || Array.isArray(data)) return null;
  if ((data as { queued?: boolean }).queued === true) return null;
  return data as T;
}

function queueTypeForRequest(path: string, method: string): OfflineQueueItemType | null {
  const m = method.toUpperCase();
  if (m === "POST" && path === "/patients") return "create_patient";
  if (m === "PATCH" && /^\/patients\/[^/]+$/.test(path)) return "patch_patient";
  if ((m === "PUT" || m === "POST") && /\/encounters\/[^/]+\/triage$/.test(path)) return "save_vitals";
  if (m === "POST" && /^\/patients\/[^/]+\/encounters(\/outpatient)?$/.test(path)) return "create_encounter";
  if (m === "POST" && path === "/follow-ups") return "create_followup";
  if (m === "POST" && /^\/follow-ups\/[^/]+\/(complete|cancel)$/.test(path)) return "update_followup_status";
  if (m === "POST" && /\/encounters\/[^/]+\/orders$/.test(path)) return "create_order";
  if (m === "POST" && /^\/encounters\/[^/]+\/medication-administrations$/.test(path)) return "medication_administration";
  if (m === "POST" && /^\/encounters\/[^/]+\/close$/.test(path)) return "close_encounter";
  if (
    m === "POST" &&
    /^\/orders\/items\/[^/]+\/(acknowledge|start|complete)$/.test(path)
  ) {
    return "order_item_action";
  }
  if (m === "PUT" && /^\/orders\/[^/]+\/result$/.test(path)) return "order_item_result";
  if (m === "PATCH" && /^\/encounters\/[^/]+$/.test(path)) return "patch_encounter";
  if (m === "PATCH" && /\/encounters\/[^/]+\/operational$/.test(path)) return "patch_encounter_operational";
  if (m === "POST" && (/^\/pharmacy\/inventory\/[^/]+\/receive$/.test(path) || path === "/pharmacy/inventory"))
    return "pharmacy_stock_add";
  if (
    m === "POST" &&
    (path === "/pharmacy/dispenses" ||
      path === "/pharmacy/dispenses/record-order" ||
      path === "/pharmacy/dispense"))
    return "pharmacy_dispense";
  return null;
}

export async function apiFetch(
  path: string,
  options: RequestInit & { facilityId?: string } = {}
): Promise<any> {
  const { facilityId: providedFacilityId, ...fetchOptions } = options;
  const method = (fetchOptions.method ?? "GET").toUpperCase();
  const queueType = queueTypeForRequest(path, method);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(fetchOptions.headers && typeof fetchOptions.headers === "object" && !(fetchOptions.headers instanceof Headers)
      ? (fetchOptions.headers as Record<string, string>)
      : {}),
  };
  if (providedFacilityId) {
    headers["x-facility-id"] = providedFacilityId;
  }

  const offline = typeof navigator !== "undefined" && !navigator.onLine;
  if (offline && queueType && providedFacilityId && method !== "GET") {
    let payload: unknown = {};
    try {
      payload = typeof fetchOptions.body === "string" ? JSON.parse(fetchOptions.body) : fetchOptions.body ?? {};
    } catch {
      payload = fetchOptions.body ?? {};
    }
    await enqueueOfflineAction(queueType, path, method as "POST" | "PATCH" | "PUT", payload, providedFacilityId);
    // Pas de parse de réponse réseau — la requête est mise en file uniquement.
    return {
      queued: true,
      syncState: "pending",
      message: "En attente de synchronisation",
    };
  }

  // Must use credentials: "include" so browser sends session cookies (medora_session / accessToken).
  const doFetch = () =>
    fetch(`${API_BASE}${path}`, {
      method,
      headers,
      credentials: "include",
      ...(fetchOptions.body !== undefined && { body: fetchOptions.body }),
    });

  let response!: Response;
  try {
    let attempt = 0;
    while (attempt < 2) {
      response = await doFetch();
      if (response.status !== 401 || attempt === 1) break;
      const skipRefresh = path.startsWith("/auth/") || path.includes("/auth/");
      if (skipRefresh || typeof window === "undefined") break;
      const ref = await fetch("/api/auth/refresh", { method: "POST", credentials: "include" });
      if (!ref.ok) {
        if (process.env.NODE_ENV !== "production") {
          console.warn("[apiClient] refresh refusé après 401:", ref.status);
        }
        break;
      }
      if (process.env.NODE_ENV !== "production") {
        console.log("[apiClient] session renouvelée, nouvelle tentative:", path);
      }
      attempt++;
    }
  } catch (networkErr: unknown) {
    if (queueType && providedFacilityId && method !== "GET") {
      let payload: unknown = {};
      try {
        payload = typeof fetchOptions.body === "string" ? JSON.parse(fetchOptions.body) : fetchOptions.body ?? {};
      } catch {
        payload = fetchOptions.body ?? {};
      }
      await enqueueOfflineAction(queueType, path, method as "POST" | "PATCH" | "PUT", payload, providedFacilityId);
      return {
        queued: true,
        syncState: "pending",
        message: "En attente de synchronisation",
      };
    }
    throw new Error(normalizeUserFacingError((networkErr as Error)?.message) || "Erreur de communication avec le serveur.");
  }

  if (!response.ok) {
    if (response.status === 413) {
      throw new Error(
        normalizeUserFacingError(
          "Payload trop volumineux : réduisez la taille des fichiers ou du texte, ou contactez l’administrateur pour augmenter la limite."
        ) ||
          "Payload trop volumineux : réduisez la taille des fichiers ou du texte, ou contactez l’administrateur pour augmenter la limite."
      );
    }
    const txt = await response.text().catch(() => "");
    let message = `La requête a échoué (${response.status}).`;
    try {
      if (txt.trim()) {
        const json = JSON.parse(txt) as {
          message?: string | string[];
          error?: string;
          statusCode?: number;
        };
        if (typeof json?.message === "string") message = json.message;
        else if (Array.isArray(json?.message)) message = json.message.filter(Boolean).join(" ");
        else if (typeof json?.error === "string") message = json.error;
      }
    } catch {
      if (txt?.trim()) {
        const short = txt.length > 500 ? `${txt.slice(0, 500)}…` : txt;
        message = short;
      } else if (response.statusText) {
        message = `${response.status} ${response.statusText}`;
      }
    }
    throw new Error(
      normalizeUserFacingError(message) || `La requête a échoué (${response.status}).`
    );
  }

  if (queueType && method !== "GET") {
    void processOfflineQueueOnce();
  }

  return await parseApiResponse(response);
}
