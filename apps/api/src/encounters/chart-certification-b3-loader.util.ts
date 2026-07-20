/**
 * Facility-scoped loaders for Stage B3 medication / MAR / procedure certification snapshots.
 * PHI-safe selected fields only — no full note bodies.
 */

import type { PrismaClient } from "@prisma/client";
import {
  computeMedicationProcedureRevision,
  type ChartCertificationB3MedicationsContext,
  type DoseInstanceSnapshot,
  type InfusionSessionSnapshot,
  type MarAdministrationSnapshot,
  type MedicationOrderSnapshot,
  type ProcedureEvidenceSnapshot,
  type ReassessmentEvidenceSnapshot,
} from "@medora/shared";

function asObject(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function notesHas(notes: string | null | undefined, patterns: RegExp[]): boolean {
  if (!notes) return false;
  return patterns.some((p) => p.test(notes));
}

function isAnalgesicLabel(label: string | null | undefined): boolean {
  if (!label) return false;
  return /\b(morphine|fentanyl|hydromorphone|oxycodone|tramadol|ketorolac|ibuprofen|acetaminophen|tylenol|toradol|dilaudid)\b/i.test(
    label
  );
}

export async function loadChartCertificationB3MedicationsContext(
  prisma: PrismaClient,
  facilityId: string,
  encounterId: string
): Promise<ChartCertificationB3MedicationsContext> {
  try {
    const [orders, administrations, doseInstances, infusionSessions, procedureEvents, painEntries] =
      await Promise.all([
        prisma.order.findMany({
          where: { encounterId, facilityId, type: "MEDICATION" },
          select: {
            id: true,
            status: true,
            cancelledAt: true,
            updatedAt: true,
            items: {
              select: {
                id: true,
                catalogItemType: true,
                status: true,
                lifecycleState: true,
                medicationLifecycleStatus: true,
                medicationLifecycleReason: true,
                medicationFulfillmentIntent: true,
                replacesOrderItemId: true,
                strength: true,
                route: true,
                frequencyCode: true,
                manualLabel: true,
                notes: true,
                enterpriseProcedureId: true,
                updatedAt: true,
              },
            },
          },
          take: 200,
        }),
        prisma.medicationAdministration.findMany({
          where: { encounterId, facilityId, orderItemId: { not: null } },
          select: {
            id: true,
            orderItemId: true,
            medicationDoseInstanceId: true,
            marAction: true,
            administeredAt: true,
            doseValue: true,
            doseUnit: true,
            route: true,
            notes: true,
            infusionPhase: true,
            infusionSessionKey: true,
            medicationLabelSnapshot: true,
            createdAt: true,
            verifications: {
              select: { verificationType: true, verificationStatus: true },
              take: 5,
            },
            wasteDocumentations: {
              select: { status: true, wastedAmount: true, witnessUserId: true },
              take: 3,
            },
          },
          take: 500,
          orderBy: { administeredAt: "desc" },
        }),
        prisma.medicationDoseInstance.findMany({
          where: { encounterId, facilityId },
          select: {
            id: true,
            orderItemId: true,
            doseStatus: true,
            scheduledAt: true,
            dueWindowStartAt: true,
            dueWindowEndAt: true,
            overdueAt: true,
            updatedAt: true,
          },
          take: 500,
        }),
        prisma.infusionSession.findMany({
          where: { encounterId, facilityId },
          select: {
            id: true,
            orderItemId: true,
            status: true,
            startedAt: true,
            stoppedAt: true,
            updatedAt: true,
          },
          take: 100,
        }),
        prisma.encounterClinicalEvent.findMany({
          where: {
            encounterId,
            facilityId,
            eventType: "PROCEDURE_DOCUMENTED",
          },
          select: {
            id: true,
            payloadJson: true,
            createdAt: true,
          },
          take: 100,
          orderBy: { createdAt: "desc" },
        }),
        prisma.encounterClinicalDocumentationEntry.findMany({
          where: {
            encounterId,
            facilityId,
            voidedAt: null,
            cardId: {
              in: [
                "pain_reassessment",
                "pain_post_intervention_reassessment",
                "nebulizer_reassessment",
              ],
            },
          },
          select: { id: true, cardId: true, createdAt: true },
          take: 50,
        }),
      ]);

    // Procedure CARE orders (non-medication)
    const careOrders = await prisma.order.findMany({
      where: { encounterId, facilityId, type: "CARE" },
      select: {
        id: true,
        status: true,
        updatedAt: true,
        items: {
          select: {
            id: true,
            enterpriseProcedureId: true,
            manualLabel: true,
            status: true,
            lifecycleState: true,
            updatedAt: true,
          },
        },
      },
      take: 100,
    });

    const supersededBy = new Map<string, string>();
    for (const order of orders) {
      for (const it of order.items) {
        if (it.replacesOrderItemId) supersededBy.set(it.replacesOrderItemId, it.id);
      }
    }

    const medicationOrders: MedicationOrderSnapshot[] = [];
    for (const order of orders) {
      for (const it of order.items) {
        const freq = (it.frequencyCode ?? "").trim();
        const isPrn = freq.toUpperCase().includes("PRN");
        const intent = it.medicationFulfillmentIntent
          ? String(it.medicationFulfillmentIntent)
          : "ADMINISTER_CHART";
        medicationOrders.push({
          orderId: order.id,
          orderItemId: it.id,
          medicationLabel: it.manualLabel ?? it.strength ?? null,
          doseValue: it.strength ?? null,
          doseUnit: null,
          route: it.route ?? null,
          frequencyCode: freq || null,
          isPrn,
          prnIndication: isPrn && it.notes ? String(it.notes).slice(0, 200) : null,
          fulfillmentIntent: intent,
          medicationLifecycleStatus: it.medicationLifecycleStatus
            ? String(it.medicationLifecycleStatus)
            : null,
          orderStatus: String(order.status),
          itemStatus: String(it.status),
          lifecycleState: it.lifecycleState ? String(it.lifecycleState) : null,
          heldReason:
            String(it.medicationLifecycleStatus ?? "") === "ON_HOLD"
              ? it.medicationLifecycleReason
              : null,
          discontinueReason:
            String(it.medicationLifecycleStatus ?? "") === "DISCONTINUED"
              ? it.medicationLifecycleReason
              : null,
          cancelledAt: order.cancelledAt?.toISOString() ?? null,
          replacesOrderItemId: it.replacesOrderItemId,
          supersededByOrderItemId: supersededBy.get(it.id) ?? null,
          startAt: null,
          endAt: null,
          updatedAt: (it.updatedAt ?? order.updatedAt)?.toISOString() ?? null,
          catalogItemType: it.catalogItemType,
          isDischargePrescription: intent === "PHARMACY_DISPENSE",
          isHomeMedication: false,
          isFutureOutpatient: false,
        });
      }
    }

    const marAdministrations: MarAdministrationSnapshot[] = administrations
      .filter((a): a is typeof a & { orderItemId: string } => Boolean(a.orderItemId))
      .map((a) => {
      const notes = a.notes ?? "";
      const waste = a.wasteDocumentations?.[0];
      const witness = (a.verifications ?? []).some(
        (v) =>
          String(v.verificationType).includes("WITNESS") ||
          String(v.verificationType).includes("CONTROLLED") ||
          String(v.verificationStatus) === "COMPLETED"
      );
      return {
        id: a.id,
        orderItemId: a.orderItemId,
        doseInstanceId: a.medicationDoseInstanceId,
        marAction: a.marAction ? String(a.marAction) : null,
        administeredAt: a.administeredAt?.toISOString() ?? null,
        doseValue: a.doseValue != null ? String(a.doseValue) : null,
        doseUnit: a.doseUnit,
        route: a.route,
        notesHasRefusalReason: notesHas(notes, [/refus/i, /patient refused/i]),
        notesHasHoldReason: notesHas(notes, [/hold/i]),
        notesHasOmissionReason: notesHas(notes, [/omiss/i, /missed/i]),
        notesHasNotAvailableAction: notesHas(notes, [/not available/i, /non disponible/i, /pharmacy/i]),
        notesHasPrnIndication: notesHas(notes, [/indication/i, /for pain/i, /prn/i]),
        notesHasEffectivenessResponse: notesHas(notes, [
          /reassess/i,
          /response/i,
          /effectiveness/i,
          /pain score/i,
          /réévalu/i,
        ]),
        infusionPhase: a.infusionPhase ? String(a.infusionPhase) : null,
        infusionSessionKey: a.infusionSessionKey,
        wasteDocumented: Boolean(waste && String(waste.status) !== "VOIDED"),
        witnessCompleted: witness || Boolean(waste?.witnessUserId),
        controlledSubstance: (a.verifications ?? []).some((v) =>
          String(v.verificationType).includes("CONTROLLED")
        ),
        wastedAmountPresent: waste?.wastedAmount != null,
        quantityMismatch: false,
        updatedAt: a.createdAt?.toISOString() ?? null,
        voided: false,
        isCorrection: false,
      };
    });

    const doseInstanceSnapshots: DoseInstanceSnapshot[] = doseInstances.map((d) => ({
      id: d.id,
      orderItemId: d.orderItemId,
      doseStatus: d.doseStatus,
      scheduledAt: d.scheduledAt?.toISOString() ?? null,
      dueWindowStartAt: d.dueWindowStartAt?.toISOString() ?? null,
      dueWindowEndAt: d.dueWindowEndAt?.toISOString() ?? null,
      overdueAt: d.overdueAt?.toISOString() ?? null,
      updatedAt: d.updatedAt?.toISOString() ?? null,
    }));

    const infusionSessionSnapshots: InfusionSessionSnapshot[] = infusionSessions.map((s) => ({
      id: s.id,
      orderItemId: s.orderItemId,
      status: String(s.status),
      startedAt: s.startedAt?.toISOString() ?? null,
      stoppedAt: s.stoppedAt?.toISOString() ?? null,
      discontinuationReasonPresent: Boolean(s.stoppedAt),
      handoffDocumented: false,
      adverseEventDocumented: false,
      infiltrationDocumented: false,
      updatedAt: s.updatedAt?.toISOString() ?? null,
    }));

    const documentedProcedureTypes = new Set<string>();
    for (const ev of procedureEvents) {
      const payload = asObject(ev.payloadJson);
      const type =
        typeof payload?.procedureType === "string"
          ? payload.procedureType
          : typeof payload?.enterpriseProcedureId === "string"
            ? payload.enterpriseProcedureId
            : null;
      if (type) documentedProcedureTypes.add(type);
      if (typeof payload?.orderItemId === "string") {
        documentedProcedureTypes.add(`item:${payload.orderItemId}`);
      }
    }

    const procedures: ProcedureEvidenceSnapshot[] = [];
    for (const order of careOrders) {
      for (const it of order.items) {
        if (!it.enterpriseProcedureId && !(it.manualLabel ?? "").trim()) continue;
        const hasEvent =
          documentedProcedureTypes.has(it.enterpriseProcedureId ?? "") ||
          documentedProcedureTypes.has(`item:${it.id}`);
        const payloadMatch = procedureEvents.find((ev) => {
          const p = asObject(ev.payloadJson);
          return p?.orderItemId === it.id || p?.enterpriseProcedureId === it.enterpriseProcedureId;
        });
        const payload = asObject(payloadMatch?.payloadJson);
        const consent = String(payload?.consent ?? payload?.procedureConsent ?? "").toUpperCase();
        const timeout = String(payload?.timeout ?? payload?.timeoutWitness ?? "").toUpperCase();
        const signed =
          payload?.signed === true ||
          Boolean(payload?.signedAt) ||
          Boolean(payload?.providerSignedAt);
        const status = String(order.status).toUpperCase();
        const life = String(it.lifecycleState ?? it.status).toUpperCase();
        let performedClass = "PROCEDURE_STATUS_UNKNOWN";
        if (status === "CANCELLED" || life === "CANCELLED") performedClass = "PROCEDURE_CANCELLED";
        else if (hasEvent || life === "COMPLETED" || status === "COMPLETED")
          performedClass = "PROCEDURE_PERFORMED";
        else if (life === "ORDERED" || status === "PLACED")
          performedClass = "PROCEDURE_PLANNED_NOT_PERFORMED";

        procedures.push({
          orderItemId: it.id,
          enterpriseProcedureId: it.enterpriseProcedureId,
          procedureLabel: it.manualLabel,
          orderStatus: String(order.status),
          lifecycleState: it.lifecycleState ? String(it.lifecycleState) : null,
          performedClass,
          hasSignedDocumentation: signed,
          hasDocumentationEvent: hasEvent,
          consentPresent:
            ["OBTAINED", "IMPLIED_EMERGENCY", "NOT_REQUIRED", "YES"].includes(consent) ||
            consent.length > 0,
          timeoutPresent:
            ["CONFIRMED", "NOT_APPLICABLE", "YES"].includes(timeout) || timeout.length > 0,
          operatorPresent: Boolean(payload?.operator || payload?.performedBy),
          siteSidePresent: Boolean(payload?.site || payload?.laterality),
          techniquePresent: Boolean(payload?.technique),
          complicationsStatusPresent:
            payload?.complications != null || payload?.complicationsNone === true,
          postAssessmentPresent: Boolean(payload?.postProcedureAssessment),
          supplyOrChargeOnly: false,
          updatedAt: (it.updatedAt ?? order.updatedAt)?.toISOString() ?? null,
        });
      }
    }

    const reassessments: ReassessmentEvidenceSnapshot[] = painEntries.map((e) => ({
      id: e.id,
      kind: e.cardId.includes("pain") ? "PAIN" : "POST_MEDICATION",
      triggerEntityId: null,
      completed: true,
      unableOrRefused: false,
      updatedAt: e.createdAt?.toISOString() ?? null,
    }));

    // Link analgesic MAR → need reassessment signal when no pain card
    for (const a of marAdministrations) {
      if ((a.marAction ?? "").toLowerCase() !== "administered") continue;
      const order = medicationOrders.find((o) => o.orderItemId === a.orderItemId);
      if (order && isAnalgesicLabel(order.medicationLabel) && a.notesHasEffectivenessResponse) {
        reassessments.push({
          id: `mar-resp-${a.id}`,
          kind: "POST_MEDICATION",
          triggerEntityId: order.orderItemId,
          completed: true,
          unableOrRefused: false,
          updatedAt: a.updatedAt,
        });
      }
    }

    const ctx = {
      medicationOrders,
      marAdministrations,
      doseInstances: doseInstanceSnapshots,
      infusionSessions: infusionSessionSnapshots,
      procedures,
      reassessments,
      medicationProcedureRevision: "",
      loadError: null as { code: string; messageKey: string } | null,
    };
    ctx.medicationProcedureRevision = computeMedicationProcedureRevision(ctx);
    return ctx;
  } catch {
    return {
      medicationOrders: [],
      marAdministrations: [],
      doseInstances: [],
      infusionSessions: [],
      procedures: [],
      reassessments: [],
      medicationProcedureRevision: "error",
      loadError: {
        code: "B3_MEDICATION_LOAD_FAILED",
        messageKey: "edLifecycle.certification.b3.errors.loadFailed",
      },
    };
  }
}
