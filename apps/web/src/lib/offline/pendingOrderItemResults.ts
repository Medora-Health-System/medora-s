import { listQueueItems } from "./offlineQueue";

function extractOrderItemId(endpoint: string): string | null {
  const m = /^\/orders\/([^/]+)\/result$/.exec(endpoint);
  return m ? m[1] : null;
}

export async function getPendingOrderItemResultsForEncounter(
  encounterId: string
): Promise<Record<string, any>> {
  const all = await listQueueItems();
  const out: Record<string, any> = {};

  for (const item of all) {
    if (item.type !== "order_item_result") continue;

    const orderItemId = extractOrderItemId(item.endpoint);
    if (!orderItemId) continue;

    const payload =
      item.payload && typeof item.payload === "object"
        ? (item.payload as Record<string, unknown>)
        : {};

    // Minimal safe extraction
    const resultText =
      typeof payload.resultText === "string"
        ? payload.resultText
        : typeof payload.value === "string"
          ? payload.value
          : undefined;

    const notes = typeof payload.notes === "string" ? payload.notes : undefined;

    let attachments = Array.isArray(payload.attachments) ? payload.attachments : undefined;
    if (
      !attachments &&
      payload.resultData &&
      typeof payload.resultData === "object" &&
      !Array.isArray(payload.resultData)
    ) {
      const rd = payload.resultData as { attachments?: unknown };
      if (Array.isArray(rd.attachments)) attachments = rd.attachments;
    }

    out[orderItemId] = {
      pendingSync: true,
      resultText,
      notes,
      attachments,
    };
  }

  return out;
}
