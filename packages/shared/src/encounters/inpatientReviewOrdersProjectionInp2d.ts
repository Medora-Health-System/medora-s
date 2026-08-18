/**
 * MEDUI.INP.2D — Inpatient Review Orders projection over enterprise Order / OrderItem.
 * Pure selector. Does not persist, complete, or invent a second order engine.
 */

import {
  orderItemIsTerminalStatus,
  orderItemNeedsAcknowledge,
  orderItemAllowsStart,
  orderItemAllowsComplete,
  normalizeOrderItemStatus,
} from "../orders/orderItemLifecycle.js";
import { inpatientOrdersUseSharedEnterpriseEngines } from "./inpatientOrderOwnershipV1.js";
import { canonicalCareProcedureByCode } from "../procedures/canonicalCareProcedureCatalog.js";
import { enterpriseProcedureById } from "../procedures/enterpriseProcedureCatalog.js";
import {
  resolveProcedureExecutionProfile,
  resolveLegacyCareExecutionProfile,
} from "../procedures/enterpriseProcedureExecutionProfile.js";
import { requestorMayPerformEnterpriseProcedureAction } from "../auth/freestandingErTechnicianProcedureGovernance.js";
import { orderCancelPolicyAllowsRequestor } from "../orders/orderCancelPolicy.js";

export const INPATIENT_REVIEW_ORDERS_USES_ENTERPRISE_ENGINE = true as const;

export const INPATIENT_REVIEW_ORDER_CLINICAL_GROUPS = [
  "MEDICATIONS",
  "LABORATORY",
  "IMAGING",
  "NURSING",
  "RESPIRATORY",
  "DIET",
  "ACTIVITY",
  "PRECAUTIONS",
  "CONSULTS",
  "PROCEDURES",
  "OTHER",
] as const;

export type InpatientReviewOrderClinicalGroup =
  (typeof INPATIENT_REVIEW_ORDER_CLINICAL_GROUPS)[number];

export const INPATIENT_REVIEW_ORDER_STATUS_BUCKETS = [
  "NEW_UNREVIEWED",
  "ACTIVE",
  "DUE",
  "OVERDUE",
  "SCHEDULED",
  "PRN",
  "STAT_URGENT",
  "PENDING_VERIFICATION",
  "HELD",
  "DISCONTINUED",
  "COMPLETED",
] as const;

export type InpatientReviewOrderStatusBucket =
  (typeof INPATIENT_REVIEW_ORDER_STATUS_BUCKETS)[number];

/** How due/overdue/scheduled was classified — never guessed from display text. */
export type InpatientReviewOrderDueClass =
  | "A_EXPLICIT"
  | "B_FREQUENCY"
  | "C_UNSCHEDULED"
  | "D_MAR_DOSE";

export const INPATIENT_REVIEW_ORDER_CHANGED_EVENT_TYPES = [
  "MODIFIED",
  "DISCONTINUED",
  "ON_HOLD",
  "RESUMED",
  "SUPERSEDED",
] as const;

const DIET_PROCEDURE_IDS = new Set(["diet", "npo_status", "oral_challenge", "com_diet_ad_lib"]);
const ACTIVITY_PROCEDURE_IDS = new Set(["ambulation_trial"]);
const PRECAUTION_PROCEDURE_IDS = new Set(["fall_precautions", "isolation_precautions"]);
const RESPIRATORY_PROCEDURE_IDS = new Set([
  "oxygen_therapy",
  "nebulizer_treatment",
  "respiratory_treatment",
  "suctioning",
  "bag_valve_mask_ventilation",
  "airway_assist",
  "high_flow_nasal_cannula",
]);
const RESPIRATORY_CATEGORIES = new Set(["RESPIRATORY"]);
const CONSULT_CATEGORIES = new Set(["CONSULTS"]);
const NURSING_CATEGORIES = new Set(["NURSING_PATIENT_CARE", "NURSING_TASK", "MONITORING"]);
const SCHEDULED_FREQUENCY = new Set([
  "DAILY",
  "BID",
  "TID",
  "QID",
  "Q2H",
  "Q3H",
  "Q4H",
  "Q6H",
  "Q8H",
  "Q12H",
  "Q24H",
  "WEEKLY",
  "MONTHLY",
  "AC",
  "PC",
  "HS",
  "ACHS",
  "CONTINUOUS",
  "TAPER",
  "ONCE",
]);

export type InpatientReviewOrderLine = {
  orderId: string;
  orderItemId: string;
  encounterId: string | null;
  orderType: string;
  catalogItemType: string;
  enterpriseProcedureId: string | null;
  clinicalGroup: InpatientReviewOrderClinicalGroup;
  status: string;
  lifecycleState: string | null;
  medicationLifecycleStatus: string | null;
  priority: string;
  frequencyCode: string | null;
  source: string | null;
  orderedByUserId: string | null;
  orderedByDisplay: string | null;
  orderedAtIso: string | null;
  updatedAtIso: string | null;
  completedAtIso: string | null;
  lastChangedAtIso: string | null;
  intendedAdministrationAtIso: string | null;
  dueClass: InpatientReviewOrderDueClass;
  displayLabelFr: string | null;
  displayLabelEn: string | null;
  manualLabel: string | null;
  pharmacyVerificationStatus: string | null;
  medicationFulfillmentIntent: string | null;
  marManaged: boolean;
  buckets: InpatientReviewOrderStatusBucket[];
  primaryBucket: InpatientReviewOrderStatusBucket;
  changed: boolean;
  needsAction: boolean;
};

export type InpatientReviewOrdersProjection = {
  usesEnterpriseEngine: true;
  viewingDoesNotComplete: true;
  lines: InpatientReviewOrderLine[];
  countsByBucket: Record<InpatientReviewOrderStatusBucket, number>;
  countsByGroup: Record<InpatientReviewOrderClinicalGroup, number>;
  needsActionCount: number;
  changedCount: number;
};

export type InpatientReviewOrderActions = {
  canAcknowledge: boolean;
  canStart: boolean;
  canComplete: boolean;
  canOpenMar: boolean;
  canHoldDiscontinue: boolean;
  canCancel: boolean;
  canCreateProviderOrder: boolean;
  canCreateRnVerbalOrProtocol: boolean;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function asIso(value: unknown): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  const text = asString(value);
  return text;
}

function upper(value: string | null | undefined): string {
  return String(value ?? "").trim().toUpperCase();
}

function orderItemIdFromEventMetadata(metadata: unknown): string | null {
  const rec = asRecord(metadata);
  if (!rec) return null;
  return asString(rec.orderItemId) ?? asString(rec.itemId);
}

export function inpatientReviewOrdersViewingDoesNotComplete(): true {
  return true;
}

export function inpatientReviewOrdersReuseEnterpriseEngine(): true {
  return inpatientOrdersUseSharedEnterpriseEngines();
}

function isMarManagedMedication(orderType: string, item: Record<string, unknown>): boolean {
  if (upper(orderType) !== "MEDICATION" && upper(asString(item.catalogItemType)) !== "MEDICATION") {
    return false;
  }
  const intent = upper(asString(item.medicationFulfillmentIntent));
  return intent === "" || intent === "ADMINISTER_CHART";
}

function pharmacyVerificationStatusOf(item: Record<string, unknown>): string | null {
  const nested = asRecord(item.medicationSafetyGovernance);
  const fromGov = nested ? asString(nested.pharmacyVerificationStatus) : null;
  if (fromGov) return upper(fromGov);
  const direct = asString(item.pharmacyVerificationStatus);
  const fromPv = asRecord(item.pharmacyVerification);
  return upper(fromGov ?? direct ?? (fromPv ? asString(fromPv.status) : null)) || null;
}

function orderedByDisplayOf(order: Record<string, unknown>): string | null {
  const created = asRecord(order.createdByDisplay);
  const createdName = created ? asString(created.display) ?? asString(created.name) : null;
  return (
    asString(order.orderedByDisplayFr) ??
    asString(order.orderedByDisplay) ??
    createdName
  );
}

export function classifyInpatientReviewOrderClinicalGroup(input: {
  orderType?: string | null;
  catalogItemType?: string | null;
  enterpriseProcedureId?: string | null;
  manualLabel?: string | null;
}): InpatientReviewOrderClinicalGroup {
  const orderType = upper(input.orderType);
  const catalog = upper(input.catalogItemType);
  if (orderType === "LAB" || catalog === "LAB_TEST") return "LABORATORY";
  if (orderType === "IMAGING" || catalog === "IMAGING_STUDY") return "IMAGING";
  if (orderType === "MEDICATION" || catalog === "MEDICATION") return "MEDICATIONS";

  const procedureId = String(input.enterpriseProcedureId ?? "").trim();
  const label = String(input.manualLabel ?? "").trim().toLowerCase();
  if (DIET_PROCEDURE_IDS.has(procedureId) || /\b(diet|npo)\b/.test(label)) return "DIET";
  if (ACTIVITY_PROCEDURE_IDS.has(procedureId) || /ambulat/.test(label)) return "ACTIVITY";
  if (PRECAUTION_PROCEDURE_IDS.has(procedureId) || /precaution|isolation|fall/.test(label)) {
    return "PRECAUTIONS";
  }
  if (RESPIRATORY_PROCEDURE_IDS.has(procedureId) || /oxygen|nebuli|respirat/.test(label)) {
    return "RESPIRATORY";
  }

  const canonical = procedureId ? canonicalCareProcedureByCode(procedureId) : undefined;
  const enterprise = procedureId ? enterpriseProcedureById(procedureId) : undefined;
  const category = String(canonical?.category ?? enterprise?.category ?? "").toUpperCase();
  const execution = String(canonical?.executionRoleCategory ?? enterprise?.executionRoleCategory ?? "").toUpperCase();
  if (CONSULT_CATEGORIES.has(category) || /consult/.test(procedureId) || /consult/.test(label)) {
    return "CONSULTS";
  }
  if (RESPIRATORY_CATEGORIES.has(category) && execution === "RESPIRATORY") {
    return "RESPIRATORY";
  }
  if (execution === "RESPIRATORY") return "RESPIRATORY";
  if (NURSING_CATEGORIES.has(category) || execution === "NURSING") {
    return "NURSING";
  }
  if (orderType === "CARE" || catalog === "CARE") return "PROCEDURES";
  return "OTHER";
}

function parseTimeMs(value: unknown): number | null {
  const iso = asIso(value);
  if (!iso) return null;
  const ms = Date.parse(iso);
  return Number.isFinite(ms) ? ms : null;
}

/**
 * Authoritative due/overdue/scheduled from durable order fields only.
 * Medication dose due/overdue remains MAR (class D) — Review Orders does not read MedicationDoseInstance.
 */
export function classifyInpatientReviewOrderDue(input: {
  item: Record<string, unknown>;
  marManaged: boolean;
  nowMs: number;
}): {
  due: boolean;
  overdue: boolean;
  scheduledFromTime: boolean;
  dueClass: InpatientReviewOrderDueClass;
} {
  const item = input.item;
  const nowMs = input.nowMs;
  const overdueFlag = item.overdue === true;
  const overdueAtMs = parseTimeMs(item.overdueAt);
  const dueFlag = item.due === true;
  const dueAtMs = parseTimeMs(item.dueAt) ?? parseTimeMs(item.nextDueAt);
  const intendedMs = parseTimeMs(item.intendedAdministrationAt);
  const freq = upper(asString(item.frequencyCode));

  if (input.marManaged) {
    return {
      due: false,
      overdue: false,
      scheduledFromTime: false,
      dueClass: "D_MAR_DOSE",
    };
  }

  let overdue = overdueFlag || (overdueAtMs != null && overdueAtMs <= nowMs);
  let due = false;
  let scheduledFromTime = false;

  if (dueFlag && !overdue) due = true;
  if (dueAtMs != null) {
    if (dueAtMs > nowMs) scheduledFromTime = true;
    else if (!overdue) due = true;
  }
  if (intendedMs != null) {
    if (intendedMs > nowMs) scheduledFromTime = true;
    else overdue = true;
  }

  const hasExplicit =
    overdueFlag || dueFlag || overdueAtMs != null || dueAtMs != null || intendedMs != null;
  const dueClass: InpatientReviewOrderDueClass = hasExplicit
    ? "A_EXPLICIT"
    : SCHEDULED_FREQUENCY.has(freq) && freq !== "PRN"
      ? "B_FREQUENCY"
      : "C_UNSCHEDULED";

  return { due, overdue, scheduledFromTime, dueClass };
}

function classifyBuckets(input: {
  orderStatus: string;
  itemStatus: string;
  medicationLifecycleStatus: string | null;
  priority: string;
  frequencyCode: string | null;
  pharmacyVerificationStatus: string | null;
  due: boolean;
  overdue: boolean;
  scheduledFromTime: boolean;
}): InpatientReviewOrderStatusBucket[] {
  const itemStatus = normalizeOrderItemStatus(input.itemStatus);
  const orderStatus = normalizeOrderItemStatus(input.orderStatus);
  const medLife = upper(input.medicationLifecycleStatus);
  const freq = upper(input.frequencyCode);
  const priority = upper(input.priority);
  const pharmacy = upper(input.pharmacyVerificationStatus);
  const cancelled =
    itemStatus === "CANCELLED" ||
    orderStatus === "CANCELLED" ||
    medLife === "DISCONTINUED" ||
    medLife === "CANCELED_ENTERED_IN_ERROR" ||
    medLife === "SUPERSEDED";
  const completed =
    !cancelled &&
    (orderItemIsTerminalStatus(itemStatus) || medLife === "COMPLETED" || medLife === "EXPIRED");
  const held = medLife === "ON_HOLD";

  const buckets: InpatientReviewOrderStatusBucket[] = [];
  if (cancelled) buckets.push("DISCONTINUED");
  if (completed) buckets.push("COMPLETED");
  if (held) buckets.push("HELD");
  if (input.overdue && !cancelled && !completed) buckets.push("OVERDUE");
  if (input.due && !cancelled && !completed && !input.overdue) buckets.push("DUE");
  if ((priority === "STAT" || priority === "URGENT" || freq === "STAT" || freq === "NOW") && !cancelled) {
    buckets.push("STAT_URGENT");
  }
  if (!cancelled && !completed && orderItemNeedsAcknowledge(itemStatus)) {
    buckets.push("NEW_UNREVIEWED");
  }
  if (pharmacy === "PENDING" && !cancelled && !completed) buckets.push("PENDING_VERIFICATION");
  if (freq === "PRN" && !cancelled) buckets.push("PRN");
  if (
    (input.scheduledFromTime || (SCHEDULED_FREQUENCY.has(freq) && freq !== "PRN")) &&
    !cancelled &&
    !completed
  ) {
    buckets.push("SCHEDULED");
  }
  if (!cancelled && !completed && !held) buckets.push("ACTIVE");
  return buckets;
}

function primaryBucketOf(buckets: InpatientReviewOrderStatusBucket[]): InpatientReviewOrderStatusBucket {
  const rank: InpatientReviewOrderStatusBucket[] = [
    "DISCONTINUED",
    "HELD",
    "OVERDUE",
    "DUE",
    "STAT_URGENT",
    "NEW_UNREVIEWED",
    "PENDING_VERIFICATION",
    "PRN",
    "SCHEDULED",
    "COMPLETED",
    "ACTIVE",
  ];
  for (const key of rank) {
    if (buckets.includes(key)) return key;
  }
  return "ACTIVE";
}

function emptyCounts(): InpatientReviewOrdersProjection["countsByBucket"] {
  return {
    NEW_UNREVIEWED: 0,
    ACTIVE: 0,
    DUE: 0,
    OVERDUE: 0,
    SCHEDULED: 0,
    PRN: 0,
    STAT_URGENT: 0,
    PENDING_VERIFICATION: 0,
    HELD: 0,
    DISCONTINUED: 0,
    COMPLETED: 0,
  };
}

function emptyGroupCounts(): InpatientReviewOrdersProjection["countsByGroup"] {
  return {
    MEDICATIONS: 0,
    LABORATORY: 0,
    IMAGING: 0,
    NURSING: 0,
    RESPIRATORY: 0,
    DIET: 0,
    ACTIVITY: 0,
    PRECAUTIONS: 0,
    CONSULTS: 0,
    PROCEDURES: 0,
    OTHER: 0,
  };
}

export function projectInpatientReviewOrders(input: {
  encounterId: string;
  orders: unknown[];
  orderEvents?: unknown[];
  nowIso?: string;
}): InpatientReviewOrdersProjection {
  const changedByItem = new Map<string, string>();
  for (const rawEvent of input.orderEvents ?? []) {
    const ev = asRecord(rawEvent);
    if (!ev) continue;
    const eventType = upper(asString(ev.eventType) ?? asString(ev.type));
    if (!(INPATIENT_REVIEW_ORDER_CHANGED_EVENT_TYPES as readonly string[]).includes(eventType)) {
      continue;
    }
    const itemId = orderItemIdFromEventMetadata(ev.metadata) ?? asString(ev.orderItemId);
    if (!itemId) continue;
    const at = asIso(ev.performedAt) ?? asIso(ev.createdAt);
    const prev = changedByItem.get(itemId);
    const stamp = at ?? prev ?? "changed";
    if (!prev || stamp >= prev) changedByItem.set(itemId, stamp);
  }

  const lines: InpatientReviewOrderLine[] = [];
  for (const rawOrder of input.orders ?? []) {
    const order = asRecord(rawOrder);
    if (!order) continue;
    const orderId = asString(order.id);
    if (!orderId) continue;
    const orderType = asString(order.type) ?? "";
    const items = Array.isArray(order.items) ? order.items : [];
    for (const rawItem of items) {
      const item = asRecord(rawItem);
      if (!item) continue;
      const orderItemId = asString(item.id);
      if (!orderItemId) continue;
      const catalogItemType = asString(item.catalogItemType) ?? "";
      const enterpriseProcedureId = asString(item.enterpriseProcedureId);
      const status = asString(item.status) ?? asString(order.status) ?? "";
      const medicationLifecycleStatus = asString(item.medicationLifecycleStatus);
      const marManaged = isMarManagedMedication(orderType, item);
      const nowMs = Date.parse(input.nowIso ?? "") || Date.now();
      const dueFlags = classifyInpatientReviewOrderDue({ item, marManaged, nowMs });
      const buckets = classifyBuckets({
        orderStatus: asString(order.status) ?? "",
        itemStatus: status,
        medicationLifecycleStatus,
        priority: asString(order.priority) ?? asString(item.priority) ?? "ROUTINE",
        frequencyCode: asString(item.frequencyCode),
        pharmacyVerificationStatus: pharmacyVerificationStatusOf(item),
        due: dueFlags.due,
        overdue: dueFlags.overdue,
        scheduledFromTime: dueFlags.scheduledFromTime,
      });
      const changed = changedByItem.has(orderItemId);
      const primaryBucket = primaryBucketOf(buckets);
      const needsAction =
        changed ||
        buckets.includes("NEW_UNREVIEWED") ||
        buckets.includes("DUE") ||
        buckets.includes("OVERDUE") ||
        buckets.includes("STAT_URGENT") ||
        buckets.includes("PENDING_VERIFICATION") ||
        buckets.includes("HELD");
      lines.push({
        orderId,
        orderItemId,
        encounterId: asString(order.encounterId) ?? input.encounterId,
        orderType,
        catalogItemType,
        enterpriseProcedureId,
        clinicalGroup: classifyInpatientReviewOrderClinicalGroup({
          orderType,
          catalogItemType,
          enterpriseProcedureId,
          manualLabel: asString(item.manualLabel) ?? asString(item.displayLabelEn),
        }),
        status,
        lifecycleState: asString(item.lifecycleState),
        medicationLifecycleStatus,
        priority: asString(order.priority) ?? asString(item.priority) ?? "ROUTINE",
        frequencyCode: asString(item.frequencyCode),
        source: asString(order.source) ?? asString(asRecord(order.authority)?.source),
        orderedByUserId: asString(order.orderedBy),
        orderedByDisplay: orderedByDisplayOf(order),
        orderedAtIso: asIso(order.createdAt) ?? asIso(item.createdAt),
        updatedAtIso: asIso(item.updatedAt) ?? asIso(order.updatedAt),
        completedAtIso: asIso(item.completedAt) ?? asIso(item.documentedCompletedAt),
        lastChangedAtIso: changedByItem.get(orderItemId) ?? null,
        displayLabelFr: asString(item.displayLabelFr),
        displayLabelEn: asString(item.displayLabelEn),
        manualLabel: asString(item.manualLabel),
        pharmacyVerificationStatus: pharmacyVerificationStatusOf(item),
        medicationFulfillmentIntent: asString(item.medicationFulfillmentIntent),
        marManaged,
        intendedAdministrationAtIso: asIso(item.intendedAdministrationAt),
        dueClass: dueFlags.dueClass,
        buckets,
        primaryBucket,
        changed,
        needsAction: needsAction && primaryBucket !== "COMPLETED" && primaryBucket !== "DISCONTINUED",
      });
    }
  }

  const countsByBucket = emptyCounts();
  const countsByGroup = emptyGroupCounts();
  for (const line of lines) {
    countsByGroup[line.clinicalGroup] += 1;
    for (const bucket of line.buckets) countsByBucket[bucket] += 1;
  }

  return {
    usesEnterpriseEngine: INPATIENT_REVIEW_ORDERS_USES_ENTERPRISE_ENGINE,
    viewingDoesNotComplete: true,
    lines,
    countsByBucket,
    countsByGroup,
    needsActionCount: lines.filter((line) => line.needsAction).length,
    changedCount: lines.filter((line) => line.changed).length,
  };
}

export function filterInpatientReviewOrderLines(
  lines: readonly InpatientReviewOrderLine[],
  input: {
    bucket?: InpatientReviewOrderStatusBucket | "NEEDS_ACTION" | "CHANGED" | "ALL";
    group?: InpatientReviewOrderClinicalGroup | "ALL";
  }
): InpatientReviewOrderLine[] {
  const bucket = input.bucket ?? "NEEDS_ACTION";
  const group = input.group ?? "ALL";
  return lines.filter((line) => {
    if (group !== "ALL" && line.clinicalGroup !== group) return false;
    if (bucket === "ALL") return true;
    if (bucket === "NEEDS_ACTION") return line.needsAction;
    if (bucket === "CHANGED") return line.changed;
    return line.buckets.includes(bucket);
  });
}

function hasRole(roles: readonly string[], ...codes: string[]): boolean {
  const set = new Set(roles.map((r) => String(r ?? "").trim().toUpperCase()));
  return codes.some((code) => set.has(code));
}

function isPctOnly(roles: readonly string[]): boolean {
  const set = new Set(roles.map((r) => String(r ?? "").trim().toUpperCase()));
  return set.has("PATIENT_CARE_TECH") && !set.has("RN") && !set.has("PROVIDER") && !set.has("ADMIN");
}

export function resolveInpatientReviewOrderActions(input: {
  roles: readonly string[];
  canPrescribe: boolean;
  encounterSigned: boolean;
  actorUserId?: string | null;
  encounterPhysicianAssignedUserId?: string | null;
  encounterNurseAssignedUserId?: string | null;
  line: InpatientReviewOrderLine;
}): InpatientReviewOrderActions {
  const roles = input.roles;
  const signed = input.encounterSigned;
  const line = input.line;
  const pctOnly = isPctOnly(roles);
  const rn = hasRole(roles, "RN");
  const admin = hasRole(roles, "ADMIN");
  const provider = hasRole(roles, "PROVIDER");
  const canPrescribe = input.canPrescribe && (provider || admin);
  const canCreateRnVerbalOrProtocol = rn && !canPrescribe && !signed;

  if (pctOnly || signed) {
    return {
      canAcknowledge: false,
      canStart: false,
      canComplete: false,
      canOpenMar: line.marManaged && !pctOnly,
      canHoldDiscontinue: false,
      canCancel: false,
      canCreateProviderOrder: false,
      canCreateRnVerbalOrProtocol: false,
    };
  }

  const status = line.status;
  const marManaged = line.marManaged;
  let canAcknowledge = false;
  let canStart = false;
  let canComplete = false;

  if (marManaged) {
    canAcknowledge = orderItemNeedsAcknowledge(status) && (rn || admin);
  } else if (upper(line.orderType) === "LAB" || upper(line.catalogItemType) === "LAB_TEST") {
    const dept = hasRole(roles, "LAB", "ADMIN");
    canAcknowledge = dept && orderItemNeedsAcknowledge(status);
    canStart = dept && orderItemAllowsStart(status);
    canComplete = dept && orderItemAllowsComplete(status);
  } else if (upper(line.orderType) === "IMAGING" || upper(line.catalogItemType) === "IMAGING_STUDY") {
    const dept = hasRole(roles, "RADIOLOGY", "ADMIN");
    canAcknowledge = dept && orderItemNeedsAcknowledge(status);
    canStart = dept && orderItemAllowsStart(status);
    canComplete = dept && orderItemAllowsComplete(status);
  } else if (upper(line.orderType) === "CARE" || upper(line.catalogItemType) === "CARE") {
    const profile =
      resolveProcedureExecutionProfile({ enterpriseProcedureId: line.enterpriseProcedureId }) ??
      (line.enterpriseProcedureId ? null : resolveLegacyCareExecutionProfile());
    const allowAck = requestorMayPerformEnterpriseProcedureAction({
      roleCodes: [...roles],
      enterpriseProcedureId: line.enterpriseProcedureId,
      profile,
      action: "acknowledge",
    });
    const allowStart = requestorMayPerformEnterpriseProcedureAction({
      roleCodes: [...roles],
      enterpriseProcedureId: line.enterpriseProcedureId,
      profile,
      action: "start",
    });
    const allowComplete = requestorMayPerformEnterpriseProcedureAction({
      roleCodes: [...roles],
      enterpriseProcedureId: line.enterpriseProcedureId,
      profile,
      action: "complete",
    });
    canAcknowledge = allowAck && orderItemNeedsAcknowledge(status);
    canStart = allowStart && orderItemAllowsStart(status);
    canComplete = allowComplete && orderItemAllowsComplete(status);
  } else if (upper(line.orderType) === "MEDICATION") {
    const pharmacy = hasRole(roles, "PHARMACY", "ADMIN");
    canAcknowledge = pharmacy && orderItemNeedsAcknowledge(status);
    canStart = pharmacy && orderItemAllowsStart(status);
    canComplete = pharmacy && orderItemAllowsComplete(status);
  }

  const cancelled = line.buckets.includes("DISCONTINUED");
  const actorUserId = String(input.actorUserId ?? "").trim();
  const canCancel =
    Boolean(actorUserId) &&
    !line.buckets.includes("COMPLETED") &&
    !cancelled &&
    orderCancelPolicyAllowsRequestor(
      {
        order: {
          type: line.orderType,
          orderedBy: line.orderedByUserId,
          source: line.source,
        },
        catalogItemType: line.catalogItemType,
        lifecycleState: line.lifecycleState ?? line.status,
        encounter: {
          physicianAssignedUserId: input.encounterPhysicianAssignedUserId ?? null,
          nurseAssignedUserId: input.encounterNurseAssignedUserId ?? null,
        },
      },
      roles,
      actorUserId
    );
  return {
    canAcknowledge,
    canStart,
    canComplete: canComplete && !marManaged,
    canOpenMar: marManaged && (rn || admin || provider),
    canHoldDiscontinue:
      canPrescribe &&
      (upper(line.orderType) === "MEDICATION" || upper(line.catalogItemType) === "MEDICATION") &&
      !cancelled,
    canCancel,
    canCreateProviderOrder: canPrescribe && !signed,
    canCreateRnVerbalOrProtocol,
  };
}

export function inpatientReviewOrderLineHasBucket(
  line: InpatientReviewOrderLine,
  bucket: InpatientReviewOrderStatusBucket
): boolean {
  return line.buckets.includes(bucket);
}

export type InpatientReviewOrdersOverviewHint = {
  newUnreviewed: number;
  statUrgent: number;
  dueNursingActionable: number;
  overdueNursingActionable: number;
  held: number;
};

export function summarizeInpatientReviewOrdersForOverview(
  projection: InpatientReviewOrdersProjection
): InpatientReviewOrdersOverviewHint {
  const nursingActionable = (line: InpatientReviewOrderLine) =>
    line.clinicalGroup === "NURSING" ||
    line.clinicalGroup === "RESPIRATORY" ||
    line.clinicalGroup === "PRECAUTIONS" ||
    line.clinicalGroup === "DIET" ||
    line.clinicalGroup === "ACTIVITY" ||
    (upper(line.orderType) === "CARE" && !line.marManaged);

  return {
    newUnreviewed: projection.countsByBucket.NEW_UNREVIEWED,
    statUrgent: projection.countsByBucket.STAT_URGENT,
    dueNursingActionable: projection.lines.filter(
      (line) => line.buckets.includes("DUE") && nursingActionable(line)
    ).length,
    overdueNursingActionable: projection.lines.filter(
      (line) => line.buckets.includes("OVERDUE") && nursingActionable(line)
    ).length,
    held: projection.countsByBucket.HELD,
  };
}
