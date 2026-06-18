import {
  BillingCodeType,
  BillingSide,
  BillingSourceModule,
  EncounterType,
  type BillingEvent,
} from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import {
  mapImagingToBillingCode,
  mapLabToBillingCode,
  mapMedicationToBillingCode,
  mapProcedureToBillingCode,
  mapSupplyToBillingCode,
  type CatalogBillingMapping,
} from "./billing-map-from-event.util";
import { collectMedicationMarLookupOrder } from "./medication-code-derive.util";
import { inferMedicationAdministrationCpt } from "./medication-admin-cpt.util";
import { inferEmergencyEMCode } from "./billing-em.util";
import {
  ledgerLineLooksUnmapped,
  normalizeBillingMappingKey,
  type BillingAutoMappingCandidateType,
  type BillingAutoMappingConfidence,
} from "@medora/shared";

export type BillingAutoMappingLedgerProposal = {
  candidateType: BillingAutoMappingCandidateType;
  sourceLabel: string;
  normalizedKey: string;
  confidence: BillingAutoMappingConfidence;
  ambiguousCatalogMatch: boolean;
  medicationAdministrationRouteMissing: boolean;
  procedureCode: string | null;
  hcpcsCode: string | null;
  code: string;
  codeType: BillingCodeType;
  billingSide: BillingSide;
  descriptionSnapshot: string;
};

function billSideFromMapping(bc: CatalogBillingMapping["billClass"]): BillingSide {
  if (bc === "professional") return BillingSide.PROFESSIONAL;
  if (bc === "facility") return BillingSide.FACILITY;
  return BillingSide.BOTH;
}

function buildLedgerFieldsFromMapping(
  m: CatalogBillingMapping,
  descriptionFallback: string
): Pick<
  BillingEvent,
  "procedureCode" | "hcpcsCode" | "code" | "codeType" | "billingSide" | "descriptionSnapshot"
> {
  const desc = (m.description || descriptionFallback).slice(0, 8000);
  const codePrimary = m.code.trim().slice(0, 32);
  if (m.system === "CPT") {
    return {
      procedureCode: m.code.trim().slice(0, 32),
      hcpcsCode: null,
      code: codePrimary,
      codeType: BillingCodeType.CPT,
      billingSide: billSideFromMapping(m.billClass),
      descriptionSnapshot: desc,
    };
  }
  return {
    procedureCode: null,
    hcpcsCode: m.code.trim().slice(0, 32),
    code: codePrimary,
    codeType: BillingCodeType.HCPCS,
    billingSide: billSideFromMapping(m.billClass),
    descriptionSnapshot: desc,
  };
}

type ResolvedMapping = {
  mapping: CatalogBillingMapping;
  labelFallback: string;
  normalizedKey: string;
  confidence: BillingAutoMappingConfidence;
  ambiguousCatalogMatch: boolean;
  candidateType: BillingAutoMappingCandidateType;
  marAdministrationRoute?: string | null;
  medCatalogRoute?: string | null;
};

export async function resolveBillingAutoMappingProposal(
  prisma: PrismaService,
  row: BillingEvent
): Promise<BillingAutoMappingLedgerProposal | null> {
  if (!ledgerLineLooksUnmapped(row)) return null;

  let resolved: ResolvedMapping | null = null;

  switch (row.sourceModule) {
    case BillingSourceModule.LAB_RESULT: {
      const result = await prisma.result.findFirst({
        where: { id: row.sourceRecordId, facilityId: row.facilityId },
        include: { orderItem: { include: { order: true } } },
      });
      if (!result?.orderItem || result.orderItem.catalogItemType !== "LAB_TEST") return null;
      const oi = result.orderItem;
      let labCode: string | null = null;
      let labelFallback = oi.manualLabel?.trim() || row.descriptionSnapshot?.trim() || "Lab";
      let labCat: { code: string | null; name: string } | null = null;
      if (oi.catalogItemId) {
        labCat = await prisma.catalogLabTest.findUnique({
          where: { id: oi.catalogItemId },
          select: { code: true, name: true },
        });
        if (labCat?.code?.trim()) {
          labCode = labCat.code.trim();
          labelFallback = labCat.name?.trim() || labelFallback;
        }
      }
      if (!labCode && oi.manualLabel?.trim()) labCode = oi.manualLabel.trim();
      if (!labCode) return null;
      const primaryKey = labCat?.code?.trim() || labCode;
      const mapping = await mapLabToBillingCode(prisma, labCode);
      if (!mapping) return null;
      resolved = {
        mapping,
        labelFallback,
        normalizedKey: normalizeBillingMappingKey(primaryKey),
        confidence: primaryKey === labCode ? "HIGH" : "MEDIUM",
        ambiguousCatalogMatch: primaryKey !== labCode,
        candidateType: "LAB",
      };
      break;
    }

    case BillingSourceModule.IMAGING_RESULT: {
      const orderItem = await prisma.orderItem.findFirst({
        where: { id: row.sourceRecordId },
        include: { order: true },
      });
      if (!orderItem || orderItem.order.facilityId !== row.facilityId) return null;
      if (orderItem.catalogItemType !== "IMAGING_STUDY") return null;
      let studyCode: string | null = null;
      let labelFallback = orderItem.manualLabel?.trim() || "Imaging";
      let imgCat: { code: string | null; name: string } | null = null;
      if (orderItem.catalogItemId) {
        imgCat = await prisma.catalogImagingStudy.findUnique({
          where: { id: orderItem.catalogItemId },
          select: { code: true, name: true },
        });
        if (imgCat?.code?.trim()) {
          studyCode = imgCat.code.trim();
          labelFallback = imgCat.name?.trim() || labelFallback;
        }
      }
      if (!studyCode && orderItem.manualLabel?.trim()) studyCode = orderItem.manualLabel.trim();
      if (!studyCode) return null;
      const mapping = await mapImagingToBillingCode(prisma, studyCode);
      if (!mapping) return null;
      resolved = {
        mapping,
        labelFallback,
        normalizedKey: normalizeBillingMappingKey(studyCode),
        confidence: imgCat?.code?.trim() === studyCode ? "HIGH" : "MEDIUM",
        ambiguousCatalogMatch: Boolean(imgCat?.name?.trim() && imgCat.name.trim() !== studyCode),
        candidateType: "IMAGING",
      };
      break;
    }

    case BillingSourceModule.MED_ADMIN:
    case BillingSourceModule.MEDICATION_ADMINISTRATION: {
      const adm = await prisma.medicationAdministration.findFirst({
        where: { id: row.sourceRecordId, facilityId: row.facilityId },
        include: { orderItem: { include: { order: true } } },
      });
      if (!adm?.orderItem || adm.orderItem.catalogItemType !== "MEDICATION") return null;
      const marAdministrationRoute = adm.route?.trim() ?? null;
      const oi = adm.orderItem;
      let labelFallback =
        adm.medicationLabelSnapshot?.trim() || oi.manualLabel?.trim() || row.descriptionSnapshot?.trim() || "Medication";
      let cat: {
        code: string | null;
        genericName: string | null;
        strength: string | null;
        dosageForm: string | null;
        route: string | null;
        name: string;
      } | null = null;
      if (oi.catalogItemId) {
        cat = await prisma.catalogMedication.findUnique({
          where: { id: oi.catalogItemId },
          select: {
            code: true,
            name: true,
            genericName: true,
            strength: true,
            dosageForm: true,
            route: true,
          },
        });
        if (cat?.name?.trim()) labelFallback = cat.name.trim();
      }
      const medCatalogRoute = cat?.route?.trim() ?? null;
      let mapping: CatalogBillingMapping | null = null;
      let matchedKey: string | null = null;
      for (const key of collectMedicationMarLookupOrder({
        catalogMedicationCode: cat?.code?.trim() ? cat.code.trim() : null,
        orderManualLabel: oi.manualLabel?.trim() ?? null,
        medicationLabelSnapshot: adm.medicationLabelSnapshot?.trim() ?? null,
        deriveInput: cat?.genericName?.trim()
          ? {
              genericName: cat.genericName,
              strength: cat.strength ?? "",
              dosageForm: cat.dosageForm ?? "comprimé",
              route: cat.route ?? "orale",
            }
          : null,
      })) {
        if (!key) continue;
        mapping = await mapMedicationToBillingCode(prisma, key);
        if (mapping) {
          matchedKey = key;
          break;
        }
      }
      if (!mapping || !matchedKey) return null;
      resolved = {
        mapping,
        labelFallback,
        normalizedKey: normalizeBillingMappingKey(matchedKey),
        confidence: matchedKey === cat?.code?.trim() ? "HIGH" : "MEDIUM",
        ambiguousCatalogMatch: matchedKey !== cat?.code?.trim(),
        candidateType: mapping.system === "HCPCS" ? "MEDICATION_DRUG" : "MEDICATION_ADMINISTRATION",
        marAdministrationRoute,
        medCatalogRoute,
      };
      break;
    }

    case BillingSourceModule.PROCEDURE: {
      const orderItem = await prisma.orderItem.findFirst({
        where: { id: row.sourceRecordId },
        include: { order: true },
      });
      if (!orderItem || orderItem.order.facilityId !== row.facilityId) return null;
      if (orderItem.catalogItemType !== "CARE") return null;
      const procCode = orderItem.manualLabel?.trim();
      if (!procCode) return null;
      const mapping = await mapProcedureToBillingCode(prisma, procCode);
      if (!mapping) return null;
      resolved = {
        mapping,
        labelFallback: procCode,
        normalizedKey: normalizeBillingMappingKey(procCode),
        confidence: "HIGH",
        ambiguousCatalogMatch: false,
        candidateType: "PROCEDURE",
      };
      break;
    }

    case BillingSourceModule.ENCOUNTER_EM: {
      if (row.sourceRecordId !== row.encounterId) return null;
      const full = await prisma.encounter.findFirst({
        where: { id: row.encounterId, facilityId: row.facilityId },
        select: { type: true, triageAcuity: true, triage: { select: { esi: true } } },
      });
      if (!full || full.type !== EncounterType.EMERGENCY) return null;
      const cpt = inferEmergencyEMCode({
        type: full.type,
        triage: full.triage,
        triageAcuity: full.triageAcuity,
      });
      if (!cpt) return null;
      resolved = {
        mapping: {
          code: cpt,
          system: "CPT",
          billClass: "professional",
          description: "Emergency visit E/M",
        },
        labelFallback: "Emergency visit E/M",
        normalizedKey: normalizeBillingMappingKey(cpt),
        confidence: "MEDIUM",
        ambiguousCatalogMatch: false,
        candidateType: "EMERGENCY_E_M",
      };
      break;
    }

    case BillingSourceModule.ORDER_ITEM: {
      const orderItem = await prisma.orderItem.findFirst({
        where: { id: row.sourceRecordId },
        include: { order: true },
      });
      if (!orderItem || orderItem.order.facilityId !== row.facilityId) return null;
      if (orderItem.catalogItemType === "LAB_TEST") {
        let labCode: string | null = null;
        let labelFallback = orderItem.manualLabel?.trim() || "Lab";
        if (orderItem.catalogItemId) {
          const labCat = await prisma.catalogLabTest.findUnique({
            where: { id: orderItem.catalogItemId },
            select: { code: true, name: true },
          });
          if (labCat?.code?.trim()) {
            labCode = labCat.code.trim();
            labelFallback = labCat.name?.trim() || labelFallback;
          }
        }
        if (!labCode && orderItem.manualLabel?.trim()) labCode = orderItem.manualLabel.trim();
        if (!labCode) return null;
        const mapping = await mapLabToBillingCode(prisma, labCode);
        if (!mapping) return null;
        resolved = {
          mapping,
          labelFallback,
          normalizedKey: normalizeBillingMappingKey(labCode),
          confidence: "HIGH",
          ambiguousCatalogMatch: false,
          candidateType: "LAB",
        };
      } else if (orderItem.catalogItemType === "IMAGING_STUDY") {
        let studyCode: string | null = null;
        let labelFallback = orderItem.manualLabel?.trim() || "Imaging";
        if (orderItem.catalogItemId) {
          const imgCat = await prisma.catalogImagingStudy.findUnique({
            where: { id: orderItem.catalogItemId },
            select: { code: true, name: true },
          });
          if (imgCat?.code?.trim()) {
            studyCode = imgCat.code.trim();
            labelFallback = imgCat.name?.trim() || labelFallback;
          }
        }
        if (!studyCode && orderItem.manualLabel?.trim()) studyCode = orderItem.manualLabel.trim();
        if (!studyCode) return null;
        const mapping = await mapImagingToBillingCode(prisma, studyCode);
        if (!mapping) return null;
        resolved = {
          mapping,
          labelFallback,
          normalizedKey: normalizeBillingMappingKey(studyCode),
          confidence: "HIGH",
          ambiguousCatalogMatch: false,
          candidateType: "IMAGING",
        };
      } else {
        return null;
      }
      break;
    }

    case BillingSourceModule.SUPPLY: {
      const orderItem = await prisma.orderItem.findFirst({
        where: { id: row.sourceRecordId },
        include: { order: true },
      });
      if (!orderItem || orderItem.order.facilityId !== row.facilityId) return null;
      if (orderItem.catalogItemType !== "SUPPLY") return null;
      const supplyCode = orderItem.manualLabel?.trim();
      if (!supplyCode) return null;
      const mapping = await mapSupplyToBillingCode(prisma, supplyCode);
      if (!mapping) return null;
      resolved = {
        mapping,
        labelFallback: supplyCode,
        normalizedKey: normalizeBillingMappingKey(supplyCode),
        confidence: "HIGH",
        ambiguousCatalogMatch: false,
        candidateType: "UNKNOWN",
      };
      break;
    }

    default:
      return null;
  }

  if (!resolved) return null;

  let ledgerFields = buildLedgerFieldsFromMapping(resolved.mapping, resolved.labelFallback);
  let medicationAdministrationRouteMissing = false;

  if (
    (row.sourceModule === BillingSourceModule.MED_ADMIN ||
      row.sourceModule === BillingSourceModule.MEDICATION_ADMINISTRATION) &&
    resolved.mapping.system === "HCPCS"
  ) {
    const admCpt = inferMedicationAdministrationCpt({
      administrationRoute: resolved.marAdministrationRoute,
      catalogRoute: resolved.medCatalogRoute,
    });
    if (!admCpt) {
      medicationAdministrationRouteMissing = true;
    } else {
      ledgerFields = {
        ...ledgerFields,
        procedureCode: admCpt.cpt.slice(0, 32),
        code: admCpt.cpt.slice(0, 32),
        codeType: BillingCodeType.CPT,
        descriptionSnapshot: `${ledgerFields.descriptionSnapshot ?? ""}; ${admCpt.description}`.slice(0, 8000),
      };
    }
  }

  return {
    candidateType: resolved.candidateType,
    sourceLabel: resolved.labelFallback,
    normalizedKey: resolved.normalizedKey,
    confidence: resolved.confidence,
    ambiguousCatalogMatch: resolved.ambiguousCatalogMatch,
    medicationAdministrationRouteMissing,
    procedureCode: ledgerFields.procedureCode,
    hcpcsCode: ledgerFields.hcpcsCode,
    code: ledgerFields.code ?? "",
    codeType: ledgerFields.codeType ?? BillingCodeType.UNKNOWN,
    billingSide: ledgerFields.billingSide,
    descriptionSnapshot: ledgerFields.descriptionSnapshot ?? "",
  };
}
