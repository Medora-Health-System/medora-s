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
  | "MANUAL"
  | "LAB_RESULT"
  | "IMAGING_RESULT"
  | "MED_ADMIN"
  | "PROCEDURE"
  | "ENCOUNTER_EM"
  | "SUPPLY";

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
  /** Optional catalog display label from Phase 2 enrichment (persisted in capture JSON). */
  catalogLabel?: string | null;
  /** True when a default billing code was applied from a Medora catalog (Phase 2). */
  catalogEnriched?: boolean;
  /** ER-2: optional link to `BillingProcedureCode.id` when catalog-backed. */
  procedureCatalogId?: string | null;
  /** ER-2: explicit manual procedure path (not reference-validated). */
  procedureManualNonCatalog?: boolean;
  /** ER-3: normalized medication NDC (11 digits) when available. */
  ndc11?: string | null;
  /** ER-3: display-form NDC snapshot as entered/shown at capture time. */
  ndcDisplay?: string | null;
  /** ER-3: administered/dispensed dose amount value (not payer-specific units). */
  doseValue?: number | null;
  /** ER-3: dose unit string (mg, mL, unit, each, etc.). */
  doseUnit?: string | null;
  /** ER-3: quantity administered at bedside (clinical quantity). */
  administeredQuantity?: number | null;
  /** ER-3: quantity captured for billing math (defaults may differ later by payer). */
  billingQuantity?: number | null;
  /** ER-3: quantity unit label (mL, tablet, vial, each). */
  quantityUnit?: string | null;
  createdAt: string;
  createdByUserId?: string | null;
  /**
   * IVPB / infusion duration evidence (billing review — not a substitute for payer-specific infusion CPT/units).
   * Populated from documented infusion STOP + MAR terminal row; omit for non-infusion administrations.
   */
  billingOrderItemId?: string | null;
  infusionSessionKey?: string | null;
  infusionStartedAt?: string | null;
  infusionStoppedAt?: string | null;
  infusionDurationMinutes?: number | null;
  /**
   * When true, automated catalog MAR drug billing (HCPCS + route-derived companion CPT) must not stand in
   * for therapeutic infusion time coding — biller assigns appropriate codes/units.
   */
  infusionDurationBillingManualReview?: boolean;
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
    const catLabel = trimStr(r.catalogLabel, 512);
    if (catLabel) item.catalogLabel = catLabel;
    if (r.catalogEnriched === true) item.catalogEnriched = true;
    const procCatId = trimStr(r.procedureCatalogId, 64);
    if (procCatId) item.procedureCatalogId = procCatId;
    if (r.procedureManualNonCatalog === true) item.procedureManualNonCatalog = true;
    if (typeof r.ndc11 === "string") {
      const ndc11 = trimStr(r.ndc11, 11);
      item.ndc11 = ndc11 ?? null;
    }
    if (typeof r.ndcDisplay === "string") {
      const ndcDisplay = trimStr(r.ndcDisplay, 32);
      item.ndcDisplay = ndcDisplay ?? null;
    }
    if (typeof r.doseValue === "number" && Number.isFinite(r.doseValue) && r.doseValue >= 0) {
      item.doseValue = Number(r.doseValue);
    }
    if (typeof r.doseUnit === "string") {
      const doseUnit = trimStr(r.doseUnit, 32);
      item.doseUnit = doseUnit ?? null;
    }
    if (typeof r.administeredQuantity === "number" && Number.isFinite(r.administeredQuantity) && r.administeredQuantity >= 0) {
      item.administeredQuantity = Number(r.administeredQuantity);
    }
    if (typeof r.billingQuantity === "number" && Number.isFinite(r.billingQuantity) && r.billingQuantity >= 0) {
      item.billingQuantity = Number(r.billingQuantity);
    }
    if (typeof r.quantityUnit === "string") {
      const quantityUnit = trimStr(r.quantityUnit, 32);
      item.quantityUnit = quantityUnit ?? null;
    }
    const boi = trimStr(r.billingOrderItemId, 64);
    if (boi) item.billingOrderItemId = boi;
    const isk = trimStr(r.infusionSessionKey, 64);
    if (isk) item.infusionSessionKey = isk;
    const isa = readIso(r.infusionStartedAt);
    if (isa) item.infusionStartedAt = isa;
    const isoStop = readIso(r.infusionStoppedAt);
    if (isoStop) item.infusionStoppedAt = isoStop;
    if (typeof r.infusionDurationMinutes === "number" && Number.isFinite(r.infusionDurationMinutes)) {
      const dm = Math.floor(r.infusionDurationMinutes);
      if (dm >= 0 && dm <= 2880) item.infusionDurationMinutes = dm;
    }
    if (r.infusionDurationBillingManualReview === true) item.infusionDurationBillingManualReview = true;
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

/** Mirrors `DiagnosisCodeSource` in Prisma — kept string-union for shared package independence. */
export type DiagnosisBillingCodeSource = "ICD10_CATALOG" | "MANUAL_DECLARED" | "LEGACY";

export function buildDiagnosisCandidate(params: {
  diagnosisId: string;
  encounterId: string;
  patientId: string;
  facilityId: string;
  code: string;
  description?: string | null;
  createdAtIso: string;
  createdByUserId?: string | null;
  /** How the code was chosen — appended to capture note for audit / biller review. */
  codeSource?: DiagnosisBillingCodeSource;
}): BillingCaptureItem {
  const reliability = params.codeSource ?? "LEGACY";
  const relNote =
    reliability === "ICD10_CATALOG"
      ? "Catalog ICD-10-CM"
      : reliability === "MANUAL_DECLARED"
        ? "Manual non-catalog code (not ICD-validated)"
        : "Legacy / unstructured code entry";
  const noteParts = [`ICD-10-CM linkage candidate`, params.code.trim(), `— ${relNote}`];
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
  ndc11?: string | null;
  ndcDisplay?: string | null;
  doseValue?: number | null;
  doseUnit?: string | null;
  billingQuantity?: number | null;
  quantityUnit?: string | null;
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
    ndc11: params.ndc11?.trim() || null,
    ndcDisplay: params.ndcDisplay?.trim() || null,
    doseValue: params.doseValue != null && params.doseValue >= 0 ? params.doseValue : null,
    doseUnit: params.doseUnit?.trim() || null,
    billingQuantity: params.billingQuantity != null && params.billingQuantity >= 0 ? params.billingQuantity : null,
    quantityUnit: params.quantityUnit?.trim() || null,
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
  ndc11?: string | null;
  ndcDisplay?: string | null;
  doseValue?: number | null;
  doseUnit?: string | null;
  administeredQuantity?: number | null;
  billingQuantity?: number | null;
  quantityUnit?: string | null;
  createdByUserId?: string | null;
  billingOrderItemId?: string | null;
  infusionSessionKey?: string | null;
  infusionStartedAt?: string | null;
  infusionStoppedAt?: string | null;
  infusionDurationMinutes?: number | null;
  infusionDurationBillingManualReview?: boolean;
}): BillingCaptureItem {
  const manualReview = params.infusionDurationBillingManualReview === true;
  const noteParts = [`Administration candidate — ${params.medicationLabel}`];
  if (manualReview) {
    noteParts.push(
      "IV infusion stop — duration evidence on record; therapeutic infusion coding and units require manual payer review (no automated infusion CPT/minute assignment)."
    );
  }
  const dm =
    params.infusionDurationMinutes != null && Number.isFinite(params.infusionDurationMinutes)
      ? Math.floor(Number(params.infusionDurationMinutes))
      : null;
  const dmSafe = dm != null && dm >= 0 && dm <= 2880 ? dm : null;
  return {
    id: newBillingCaptureItemId(),
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: "MEDICATION_ADMINISTRATION",
    sourceId: params.administrationId,
    billClass: "facility",
    status: "needs_review",
    note: noteParts.join(" — ").slice(0, MAX_NOTE),
    ndc11: params.ndc11?.trim() || null,
    ndcDisplay: params.ndcDisplay?.trim() || null,
    doseValue: params.doseValue != null && params.doseValue >= 0 ? params.doseValue : null,
    doseUnit: params.doseUnit?.trim() || null,
    administeredQuantity:
      params.administeredQuantity != null && params.administeredQuantity >= 0
        ? params.administeredQuantity
        : null,
    billingQuantity: params.billingQuantity != null && params.billingQuantity >= 0 ? params.billingQuantity : null,
    quantityUnit: params.quantityUnit?.trim() || null,
    serviceDate: params.atIso,
    createdAt: params.atIso,
    createdByUserId: params.createdByUserId ?? undefined,
    billingOrderItemId: params.billingOrderItemId?.trim() || null,
    infusionSessionKey: params.infusionSessionKey?.trim() || null,
    infusionStartedAt: params.infusionStartedAt?.trim() ? params.infusionStartedAt.trim().slice(0, 40) : null,
    infusionStoppedAt: params.infusionStoppedAt?.trim() ? params.infusionStoppedAt.trim().slice(0, 40) : null,
    infusionDurationMinutes: dmSafe,
    infusionDurationBillingManualReview: manualReview ? true : undefined,
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

/**
 * ER-2 — structured procedure line on billing capture (`sourceType` PROCEDURE).
 * `sourceId` matches `id` so each append is a distinct line unless replaced by same id upstream.
 */
const DEFAULT_PROCEDURE_CAPTURE_DEDUP_WINDOW_MS = 120_000;

function effectiveProcedureCaptureUnits(units: number | null | undefined): number {
  return units != null && units > 0 ? Math.min(Math.floor(units), 999999) : 1;
}

export type ProcedureCaptureDuplicateCheckParams = {
  procedureCatalogId?: string | null;
  codeSystem: "CPT" | "HCPCS";
  code: string;
  units: number;
  /** ISO timestamp of the append attempt (e.g. `new Date().toISOString()`). */
  pendingCreatedAtIso: string;
  /** Defaults to 2 minutes. */
  windowMs?: number;
};

/**
 * ER-2.1 — Detect a near-duplicate structured PROCEDURE line on billing capture.
 * Duplicate when: same encounter context (caller passes stored items for one encounter),
 * same units, same catalog id OR same billable code (CPT vs HCPCS slot), and prior row's
 * `createdAt` is within `windowMs` of `pendingCreatedAtIso`.
 */
export function findBillingCaptureProcedureDuplicate(
  stored: BillingCaptureV1Stored,
  params: ProcedureCaptureDuplicateCheckParams
): BillingCaptureItem | null {
  const atMs = Date.parse(params.pendingCreatedAtIso);
  if (!Number.isFinite(atMs)) return null;
  const windowMs = params.windowMs ?? DEFAULT_PROCEDURE_CAPTURE_DEDUP_WINDOW_MS;
  const cat = params.procedureCatalogId?.trim() ?? "";
  const normCode = params.code.trim().toUpperCase();
  const u = params.units;

  for (const it of stored.items) {
    if (it.sourceType !== "PROCEDURE") continue;
    if (effectiveProcedureCaptureUnits(it.units) !== u) continue;
    const createdMs = Date.parse(it.createdAt);
    if (!Number.isFinite(createdMs)) continue;
    const delta = atMs - createdMs;
    if (delta < 0 || delta > windowMs) continue;

    if (cat && it.procedureCatalogId?.trim() === cat) {
      return it;
    }
    const cpt = it.procedureCode?.trim().toUpperCase() ?? "";
    const hc = it.hcpcsCode?.trim().toUpperCase() ?? "";
    if (params.codeSystem === "CPT" && cpt && cpt === normCode) return it;
    if (params.codeSystem === "HCPCS" && hc && hc === normCode) return it;
  }
  return null;
}

export function buildProcedureCaptureCandidate(params: {
  encounterId: string;
  patientId: string;
  facilityId: string;
  codeSystem: "CPT" | "HCPCS";
  code: string;
  shortDescription?: string | null;
  billingProcedureCodeId?: string | null;
  manualNonCatalog?: boolean;
  modifiers?: string[];
  units?: number | null;
  atIso: string;
  createdByUserId?: string | null;
}): BillingCaptureItem {
  const id = newBillingCaptureItemId();
  const fromCatalog = !!params.billingProcedureCodeId?.trim() && params.manualNonCatalog !== true;
  const c = params.code.trim();
  const desc = (params.shortDescription ?? "").trim();
  const relNote = fromCatalog
    ? "Catalog CPT/HCPCS (reference table)"
    : params.manualNonCatalog === true
      ? "Manual non-catalog procedure code (format-only check)"
      : "Structured procedure capture";
  const noteParts = ["Procedure charge capture", `${params.codeSystem} ${c}`, `— ${relNote}`];
  if (desc) noteParts.push(desc);
  const mods = (params.modifiers ?? [])
    .map((m) => m.trim())
    .filter(Boolean)
    .map((m) => m.slice(0, 8))
    .slice(0, 8);

  return {
    id,
    encounterId: params.encounterId,
    patientId: params.patientId,
    facilityId: params.facilityId,
    sourceType: "PROCEDURE",
    sourceId: id,
    procedureCode: params.codeSystem === "CPT" ? c.slice(0, 32) : null,
    hcpcsCode: params.codeSystem === "HCPCS" ? c.slice(0, 32) : null,
    modifiers: mods.length ? mods : undefined,
    units: effectiveProcedureCaptureUnits(params.units),
    billClass: "both",
    status: "needs_review",
    note: noteParts.join(" — ").slice(0, MAX_NOTE),
    catalogLabel: (desc || c).slice(0, 512),
    catalogEnriched: fromCatalog,
    procedureCatalogId: params.billingProcedureCodeId?.trim() || undefined,
    procedureManualNonCatalog: params.manualNonCatalog === true ? true : undefined,
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
