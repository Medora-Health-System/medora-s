import {
  createClinicalDraft,
  removeClinicalDraft,
  writeClinicalDraft,
  type ClinicalDraftScope,
} from "@/lib/clinicalDraftStorage";
import { stripMedicationFromOrderDraftPayload } from "./createOrderMedicationDraft";
import type { CreateOrderModalTab, OrderModalTab } from "./types";
import type { OrderSetKey } from "./enterpriseOrderSetAdapter";

export type OrderTypeKey = OrderModalTab;

export type CreateOrderDraftPayload = {
  activeTab: CreateOrderModalTab;
  selectedOrderSet: OrderSetKey;
  selectedOrderSetItemKeys: string[];
  orderSetReviewActive: boolean;
  stagedItems: Record<OrderTypeKey, import("./types").CreateOrderLineItem[]>;
  formData: {
    type: OrderTypeKey;
    priority: "ROUTINE" | "URGENT" | "STAT";
    notes: string;
    prescriberName: string;
    prescriberLicense: string;
    prescriberContact: string;
    orderSource: import("@medora/shared").OrderSource | "";
    readbackConfirmed: boolean;
    protocolName: string;
    items: import("./types").CreateOrderLineItem[];
  };
};

export function createOrderDraftHasContent(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const p = payload as Partial<CreateOrderDraftPayload>;
  const staged = p.stagedItems ?? {};
  const stagedHasItems = Object.values(staged).some((items) => Array.isArray(items) && items.length > 0);
  const form = p.formData;
  return Boolean(
    stagedHasItems ||
      (Array.isArray(form?.items) && form.items.length > 0) ||
      form?.notes?.trim() ||
      form?.prescriberName?.trim() ||
      form?.prescriberLicense?.trim() ||
      form?.prescriberContact?.trim() ||
      form?.protocolName?.trim() ||
      form?.readbackConfirmed ||
      p.orderSetReviewActive
  );
}

export function buildDraftPayloadAfterDomainSubmit(input: {
  submittedType: OrderTypeKey;
  nextStagedItems: Record<OrderTypeKey, import("./types").CreateOrderLineItem[]>;
  nextReviewTab: OrderTypeKey | null;
  activeTab: CreateOrderModalTab;
  selectedOrderSet: OrderSetKey;
  selectedOrderSetItemKeys: string[];
  orderSetReviewActive: boolean;
  formData: CreateOrderDraftPayload["formData"];
}): CreateOrderDraftPayload {
  const reviewStillActive = input.orderSetReviewActive && input.nextReviewTab !== null;
  const nextActiveTab = input.nextReviewTab ?? input.activeTab;
  const nextFormType = input.nextReviewTab ?? input.formData.type;
  const nextFormItems = input.nextReviewTab
    ? [...input.nextStagedItems[input.nextReviewTab]]
    : input.formData.type === input.submittedType
      ? []
      : [...input.formData.items];

  return {
    activeTab: nextActiveTab,
    selectedOrderSet: input.selectedOrderSet,
    selectedOrderSetItemKeys: reviewStillActive ? input.selectedOrderSetItemKeys : [],
    orderSetReviewActive: reviewStillActive,
    stagedItems: {
      LAB: [...input.nextStagedItems.LAB],
      IMAGING: [...input.nextStagedItems.IMAGING],
      MEDICATION: [...input.nextStagedItems.MEDICATION],
      CARE: [...input.nextStagedItems.CARE],
    },
    formData: {
      ...input.formData,
      type: nextFormType,
      items: nextFormItems,
    },
  };
}

export function persistCreateOrderDraftSnapshot(input: {
  storage: Storage;
  draftKey: string;
  draftScope: ClinicalDraftScope;
  payload: CreateOrderDraftPayload;
}): { savedLocallyAt: string | null; cleared: boolean } {
  const stripped = stripMedicationFromOrderDraftPayload(input.payload);
  if (!createOrderDraftHasContent(stripped)) {
    removeClinicalDraft(input.storage, input.draftKey);
    return { savedLocallyAt: null, cleared: true };
  }
  const savedLocallyAt = new Date().toISOString();
  writeClinicalDraft(
    input.storage,
    input.draftKey,
    createClinicalDraft({
      scope: input.draftScope,
      payload: stripped,
      savedLocallyAt,
    })
  );
  return { savedLocallyAt, cleared: false };
}

export function clearCreateOrderDraftSnapshot(input: {
  storage: Storage;
  draftKey: string;
}): void {
  removeClinicalDraft(input.storage, input.draftKey);
}
