import type { UnifiedTimelineApiItem } from "@/lib/unifiedEncounterTimelineUi";

const DEFAULT_LIMIT = 80;

function asRecord(v: unknown): Record<string, unknown> | null {
  if (v != null && typeof v === "object" && !Array.isArray(v)) return v as Record<string, unknown>;
  return null;
}

export function parseUnifiedTimelineResponse(data: unknown): {
  items: UnifiedTimelineApiItem[];
  capped: boolean;
  limit: number;
} {
  const root = asRecord(data);
  const itemsRaw = Array.isArray(root?.items) ? root.items : [];
  const items: UnifiedTimelineApiItem[] = [];
  for (const r of itemsRaw) {
    const o = asRecord(r);
    if (!o) continue;
    const id = typeof o.id === "string" ? o.id : "";
    const sourceKind = typeof o.sourceKind === "string" ? o.sourceKind : "";
    const documentedAtIso = typeof o.documentedAtIso === "string" ? o.documentedAtIso : "";
    if (!id || !sourceKind || !documentedAtIso) continue;
    const actor = asRecord(o.actor) ?? {};
    items.push({
      id,
      sourceKind: sourceKind as UnifiedTimelineApiItem["sourceKind"],
      sourceId: typeof o.sourceId === "string" ? o.sourceId : "",
      storedEventType: typeof o.storedEventType === "string" ? o.storedEventType : "",
      displayEventType: typeof o.displayEventType === "string" ? o.displayEventType : "",
      displayGroup: (typeof o.displayGroup === "string"
        ? o.displayGroup
        : "CLINICAL") as UnifiedTimelineApiItem["displayGroup"],
      carePhase: (typeof o.carePhase === "string" ? o.carePhase : "ED") as UnifiedTimelineApiItem["carePhase"],
      documentedAtIso,
      effectiveClinicalAtIso:
        typeof o.effectiveClinicalAtIso === "string" ? o.effectiveClinicalAtIso : null,
      hasClinicalTimeCorrection: o.hasClinicalTimeCorrection === true,
      actor: {
        userId: typeof actor.userId === "string" ? actor.userId : null,
        displayName: typeof actor.displayName === "string" ? actor.displayName : null,
        role: typeof actor.role === "string" ? actor.role : null,
        department: typeof actor.department === "string" ? actor.department : null,
      },
      chips: Array.isArray(o.chips)
        ? (o.chips.filter((c) => typeof c === "string") as UnifiedTimelineApiItem["chips"])
        : [],
      titleFr: typeof o.titleFr === "string" ? o.titleFr : null,
      titleEn: typeof o.titleEn === "string" ? o.titleEn : null,
      summaryFr: typeof o.summaryFr === "string" ? o.summaryFr : null,
      summaryEn: typeof o.summaryEn === "string" ? o.summaryEn : null,
      orderId: typeof o.orderId === "string" ? o.orderId : null,
      orderItemId: typeof o.orderItemId === "string" ? o.orderItemId : null,
      payloadJson: o.payloadJson,
    });
  }
  return {
    items,
    capped: root?.capped === true,
    limit: typeof root?.limit === "number" ? root.limit : DEFAULT_LIMIT,
  };
}
