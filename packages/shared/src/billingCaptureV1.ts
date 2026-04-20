/**
 * U.S. billing foundation — structured charge-capture candidates (V1).
 * Stored on Encounter.billingCaptureJson. No payer submission, no licensed CPT/HCPCS lists.
 * Codes are user-entered or interface slots only.
 */

export const BILLING_CAPTURE_VERSION = 1 as const;

/** Origin of a billing line candidate (extensible). */
export type BillingCaptureSourceType =
  | "DIAGNOSIS"
  | "ORDER_ITEM"
  | "MEDICATION_DISPENSE"
  | "MEDICATION_ADMINISTRATION"
  | "ENCOUNTER_DISPOSITION"
  | "VACCINE_ADMINISTRATION"
  | "MANUAL";

/** Review lifecycle — never auto “final”. */
export type BillingEventStatus = "draft" | "needs_review" | "ready";

export type BillingBillClass = "facility" | "professional" | "both";

export type BillingCaptureItem = {
  id: string;
  encounterId?: string;
  patientId?: string;
  facilityId?: string;
  /** Service line / cost center label (free text). */
  department?: string;
  sourceType: BillingCaptureSourceType;
  /** Stable id for dedupe (diagnosis id, order item id, dispense id, etc.). */
  sourceId?: string;
  /** ICD-10-CM codes as entered in product (no embedded code set). */
  diagnosisCodes?: string[];
  /** Links to Diagnosis.id rows when applicable. */
  linkedDiagnosisIds?: string[];
  /** CPT / HCPCS Level I slot — optional string until licensed data is wired. */
  procedureCode?: string | null;
  /** HCPCS (supply / drug / ancillary) slot. */
  hcpcsCode?: string | null;
  /** Institutional revenue code slot. */
  revenueCode?: string | null;
  modifiers?: string[];
  units?: number | null;
  billClass?: BillingBillClass;
  status: BillingEventStatus;
  note?: string | null;
  rationale?: string | null;
  /** Service date (ISO 8601). */
  serviceDate?: string | null;
  renderingProviderId?: string | null;
  createdAt: string;
  createdByUserId?: string | null;
};

export type BillingCaptureV1Stored = {
  version: typeof BILLING_CAPTURE_VERSION;
  items: BillingCaptureItem[];
};

const MAX_ITEMS = 500;
const MAX_NOTE = 4000;
const MAX_CODES = 40;

function trimStr(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const t = v.trim();
  if (!t) return undefined;
  return t.slice(0, max);
}

function readIso(v: unknown): string | undefined {
  return trimStr(v, 40);
}

export function emptyBillingCaptureV1(): BillingCaptureV1Stored {
  return { version: BILLING_CAPTURE_VERSION, items: [] };
}

export function readBillingCaptureV1(raw: unknown): BillingCaptureV1Stored {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return emptyBillingCaptureV1();
  }
  const o = raw as Record<string, unknown>;
  const itemsRaw = o.items;
  /** If `version` was omitted but `items` is an array (client merge), do not wipe the document. */
  const versionEffective =
    o.version === BILLING_CAPTURE_VERSION
      ? BILLING_CAPTURE_VERSION
      : o.version === undefined && Array.isArray(itemsRaw)
        ? BILLING_CAPTURE_VERSION
        : null;
  if (versionEffective !== BILLING_CAPTURE_VERSION) {
    return emptyBillingCaptureV1();
  }
  if (!Array.isArray(itemsRaw)) {
    return emptyBillingCaptureV1();
  }
  const items: BillingCaptureItem[] = [];
  const seenRowIds = new Set<string>();
  for (const row of itemsRaw) {
    if (!row || typeof row !== "object" || Array.isArray(row)) continue;
    const r = row as Record<string, unknown>;
    const id = trimStr(r.id, 64);
    const st = trimStr(r.sourceType, 64);
    const status = trimStr(r.status, 32);
    const createdAt = readIso(r.createdAt);
    if (!id || !st || !status || !createdAt) continue;
    if (seenRowIds.has(id)) continue;
    seenRowIds.add(id);
    const item: BillingCaptureItem = {
      id,
      sourceType: st as BillingCaptureSourceType,
      status: status as BillingEventStatus,
      createdAt,
    };
    const encId = trimStr(r.encounterId, 64);
    if (encId) item.encounterId = encId;
    const pid = trimStr(r.patientId, 64);
    if (pid) item.patientId = pid;
    const fid = trimStr(r.facilityId, 64);
    if (fid) item.facilityId = fid;
    const dept = trimStr(r.department, 256);
    if (dept) item.department = dept;
    const sid = trimStr(r.sourceId, 64);
    if (sid) item.sourceId = sid;
    if (Array.isArray(r.diagnosisCodes)) {
      const codes = r.diagnosisCodes
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        .map((c) => c.trim().slice(0, 16))
        .slice(0, MAX_CODES);
      if (codes.length) item.diagnosisCodes = codes;
    }
    if (Array.isArray(r.linkedDiagnosisIds)) {
      const lids = r.linkedDiagnosisIds
        .filter((c): c is string => typeof c === "string" && c.trim().length > 0)
        .map((c) => c.trim().slice(0, 64))
        .slice(0, MAX_CODES);
      if (lids.length) item.linkedDiagnosisIds = lids;
    }
    if (typeof r.procedureCode === "string") {
      const pc = trimStr(r.procedureCode, 32);
      item.procedureCode = pc ?? null;
    }
    if (typeof r.hcpcsCode === "string") {
      const hc = trimStr(r.hcpcsCode, 32);
      item.hcpcsCode = hc ?? null;
    }
    if (typeof r.revenueCode === "string") {
      const rev = trimStr(r.revenueCode, 32);
      item.revenueCode = rev ?? null;
    }
    if (Array.isArray(r.modifiers)) {
      const mods = r.modifiers
        .filter((m): m is string => typeof m === "string" && m.trim().length > 0)
        .map((m) => m.trim().slice(0, 8))
        .slice(0, 24);
      if (mods.length) item.modifiers = mods;
    }
    if (typeof r.units === "number" && Number.isFinite(r.units) && r.units >= 0) {
      item.units = Math.min(Math.floor(r.units), 999999);
    }
    const bc = trimStr(r.billClass, 32);
    if (bc === "facility" || bc === "professional" || bc === "both") item.billClass = bc;
    if (typeof r.note === "string") {
      const note = trimStr(r.note, MAX_NOTE);
      item.note = note ?? null;
    }
    if (typeof r.rationale === "string") {
      const rat = trimStr(r.rationale, MAX_NOTE);
      item.rationale = rat ?? null;
    }
    const sd = readIso(r.serviceDate);
    if (sd) item.serviceDate = sd;
    const rpid = trimStr(r.renderingProviderId, 64);
    if (rpid) item.renderingProviderId = rpid;
    const cb = trimStr(r.createdByUserId, 64);
    if (cb) item.createdByUserId = cb;
    items.push(item);
  }
  return { version: BILLING_CAPTURE_VERSION, items: items.slice(0, MAX_ITEMS) };
}

function sourceDedupeKey(item: Pick<BillingCaptureItem, "sourceType" | "sourceId">): string | null {
  const sid = item.sourceId?.trim();
  if (!sid) return null;
  return `${item.sourceType}:${sid}`;
}

/**
 * Append or replace by (sourceType, sourceId) when both set — idempotent auto-capture.
 * Manual items without sourceId always append.
 */
export function upsertBillingCaptureItem(previous: unknown, incoming: BillingCaptureItem): BillingCaptureV1Stored {
  const base = readBillingCaptureV1(previous);
  const key = sourceDedupeKey(incoming);
  let next = [...base.items];
  if (key) {
    next = next.filter((it) => sourceDedupeKey(it) !== key);
  }
  next.push(incoming);
  return { version: BILLING_CAPTURE_VERSION, items: next.slice(-MAX_ITEMS) };
}

export function newBillingCaptureItemId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `bc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 11)}`;
}

export function buildDiagnosisCandidate(params: {
  diagnosisId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  code: string;
  description?: string | null;
  createdAtIso: string;
  createdByUserId?: string | null;
}): BillingCaptureItem {
  const noteParts = [`ICD-10-CM linkage candidate`, params.code.trim()];
  if (params.description?.trim()) noteParts.push(params.description.trim());
  return {
    id: newBillingCaptureItemId(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: "DIAGNOSIS",
    sourceId: params.diagnosisId,
    diagnosisCodes: [params.code.trim().slice(0, 16)],
    linkedDiagnosisIds: [params.diagnosisId],
    billClass: "professional",
    status: "needs_review",
    note: noteParts.join(" — ").slice(0, MAX_NOTE),
    createdAt: params.createdAtIso,
    createdByUserId: params.createdByUserId ?? undefined,
  };
}

export function buildOrderItemCandidate(params: {
  orderItemId: string;
  orderId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  orderType: string;
  catalogItemType: string;
  manualLabel?: string | null;
  quantity?: number | null;
  completedAtIso: string;
  createdByUserId?: string | null;
}): BillingCaptureItem {
  const label =
    params.manualLabel?.trim() ||
    [params.orderType, params.catalogItemType].filter(Boolean).join(" / ") ||
    "Order line";
  return {
    id: newBillingCaptureItemId(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: "ORDER_ITEM",
    sourceId: params.orderItemId,
    units: params.quantity ?? null,
    billClass: "both",
    status: "needs_review",
    note: `Charge capture candidate — order ${params.orderId} — ${label}`.slice(0, MAX_NOTE),
    serviceDate: params.completedAtIso,
    createdAt: params.completedAtIso,
    createdByUserId: params.createdByUserId ?? undefined,
  };
}

export function buildMedicationDispenseCandidate(params: {
  dispenseId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  quantity: number;
  medicationLabel: string;
  atIso: string;
  createdByUserId?: string | null;
}): BillingCaptureItem {
  return {
    id: newBillingCaptureItemId(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: "MEDICATION_DISPENSE",
    sourceId: params.dispenseId,
    units: params.quantity,
    billClass: "facility",
    status: "needs_review",
    note: `Dispense candidate — ${params.medicationLabel}`.slice(0, MAX_NOTE),
    serviceDate: params.atIso,
    createdAt: params.atIso,
    createdByUserId: params.createdByUserId ?? undefined,
  };
}

export function buildMedicationAdministrationCandidate(params: {
  administrationId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  medicationLabel: string;
  atIso: string;
  createdByUserId?: string | null;
}): BillingCaptureItem {
  return {
    id: newBillingCaptureItemId(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: "MEDICATION_ADMINISTRATION",
    sourceId: params.administrationId,
    billClass: "facility",
    status: "needs_review",
    note: `Administration candidate — ${params.medicationLabel}`.slice(0, MAX_NOTE),
    serviceDate: params.atIso,
    createdAt: params.atIso,
    createdByUserId: params.createdByUserId ?? undefined,
  };
}

export function buildVaccineAdministrationCandidate(params: {
  vaccineAdministrationId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  vaccineLabel: string;
  atIso: string;
  createdByUserId?: string | null;
}): BillingCaptureItem {
  return {
    id: newBillingCaptureItemId(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: "VACCINE_ADMINISTRATION",
    sourceId: params.vaccineAdministrationId,
    units: 1,
    billClass: "professional",
    status: "needs_review",
    note: `Vaccine administration — ${params.vaccineLabel}`.slice(0, MAX_NOTE),
    serviceDate: params.atIso,
    createdAt: params.atIso,
    createdByUserId: params.createdByUserId ?? undefined,
  };
}

export function buildEncounterDispositionCandidate(params: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  dischargeStatus?: string | null;
  atIso: string;
  createdByUserId?: string | null;
}): BillingCaptureItem {
  const ds = params.dischargeStatus?.trim() || "UNKNOWN";
  return {
    id: newBillingCaptureItemId(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: "ENCOUNTER_DISPOSITION",
    sourceId: params.encounterId,
    billClass: "both",
    status: "needs_review",
    note: `Visit disposition / closure — ${ds}`.slice(0, MAX_NOTE),
    serviceDate: params.atIso,
    createdAt: params.atIso,
    createdByUserId: params.createdByUserId ?? undefined,
  };
}

/** Flat rows for future CSV / clearinghouse mapping (no PHI beyond codes in notes). */
export type BillingCaptureExportRow = {
  billingEventId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  sourceType: string;
  sourceId: string;
  status: string;
  billClass: string;
  diagnosisCodes: string;
  procedureCode: string;
  hcpcsCode: string;
  revenueCode: string;
  modifiers: string;
  units: string;
  serviceDate: string;
  note: string;
};

export function billingCaptureToExportRows(stored: BillingCaptureV1Stored): BillingCaptureExportRow[] {
  return stored.items.map((it) => ({
    billingEventId: it.id,
    encounterId: it.encounterId ?? "",
    patientId: it.patientId ?? "",
    facilityId: it.facilityId ?? "",
    sourceType: it.sourceType,
    sourceId: it.sourceId ?? "",
    status: it.status,
    billClass: it.billClass ?? "",
    diagnosisCodes: (it.diagnosisCodes ?? []).join(";"),
    procedureCode: it.procedureCode ?? "",
    hcpcsCode: it.hcpcsCode ?? "",
    revenueCode: it.revenueCode ?? "",
    modifiers: (it.modifiers ?? []).join(";"),
    units: it.units != null ? String(it.units) : "",
    serviceDate: it.serviceDate ?? "",
    note: it.note ?? "",
  }));
}
