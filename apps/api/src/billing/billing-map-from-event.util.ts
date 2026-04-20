import type { PrismaService } from "../prisma/prisma.service";

/** Default professional vs facility split when catalog row is missing a valid billClass (Phase 4.6). */
export function defaultBillClassForTrigger(
  triggerSource: string
): "professional" | "facility" | "both" {
  const t = triggerSource.trim().toUpperCase();
  if (t === "LAB" || t === "IMAGING" || t === "SUPPLY") return "facility";
  if (t === "MEDICATION" || t === "PROCEDURE") return "both";
  return "both";
}

export type CatalogBillingMapping = {
  code: string;
  system: "CPT" | "HCPCS";
  billClass: "professional" | "facility" | "both";
  description: string;
};

async function findMapping(
  prisma: PrismaService,
  triggerSource: string,
  externalCode: string | null | undefined
): Promise<CatalogBillingMapping | null> {
  const c = externalCode?.trim();
  if (!c) return null;

  let row = await prisma.billingCatalog.findFirst({
    where: {
      triggerSource,
      externalCode: c,
    },
  });

  if (!row) {
    row = await prisma.billingCatalog.findFirst({
      where: {
        triggerSource,
        externalCode: { equals: c, mode: "insensitive" },
      },
    });
  }

  if (!row) {
    return null;
  }

  const sys = row.system.trim().toUpperCase();
  if (sys !== "CPT" && sys !== "HCPCS") return null;
  const rawBc = row.billClass?.trim().toLowerCase() ?? "";
  const bc: CatalogBillingMapping["billClass"] =
    rawBc === "professional" || rawBc === "facility" || rawBc === "both" ? rawBc : defaultBillClassForTrigger(triggerSource);

  return {
    code: row.code.trim(),
    system: sys as "CPT" | "HCPCS",
    billClass: bc,
    description: row.description.trim(),
  };
}

export async function mapLabToBillingCode(
  prisma: PrismaService,
  labCode: string | null | undefined
): Promise<CatalogBillingMapping | null> {
  return findMapping(prisma, "LAB", labCode);
}

export async function mapImagingToBillingCode(
  prisma: PrismaService,
  studyCode: string | null | undefined
): Promise<CatalogBillingMapping | null> {
  return findMapping(prisma, "IMAGING", studyCode);
}

export async function mapMedicationToBillingCode(
  prisma: PrismaService,
  medCode: string | null | undefined
): Promise<CatalogBillingMapping | null> {
  return findMapping(prisma, "MEDICATION", medCode);
}

export async function mapProcedureToBillingCode(
  prisma: PrismaService,
  procCode: string | null | undefined
): Promise<CatalogBillingMapping | null> {
  return findMapping(prisma, "PROCEDURE", procCode);
}

export async function mapSupplyToBillingCode(
  prisma: PrismaService,
  supplyCode: string | null | undefined
): Promise<CatalogBillingMapping | null> {
  return findMapping(prisma, "SUPPLY", supplyCode);
}
