import type { PrismaService } from "../prisma/prisma.service";

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

  const row = await prisma.billingCatalog.findFirst({
    where: {
      triggerSource,
      externalCode: c,
    },
  });

  if (!row) {
    return null;
  }

  const sys = row.system.trim().toUpperCase();
  if (sys !== "CPT" && sys !== "HCPCS") return null;
  const bc = row.billClass.trim().toLowerCase();
  if (bc !== "professional" && bc !== "facility" && bc !== "both") return null;

  return {
    code: row.code.trim(),
    system: sys as "CPT" | "HCPCS",
    billClass: bc as CatalogBillingMapping["billClass"],
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
