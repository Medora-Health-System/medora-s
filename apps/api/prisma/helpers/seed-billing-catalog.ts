import { PrismaClient } from "@prisma/client";
import { US_ER_LAB_CATALOG } from "../data/er-us-lab-tests";
import {
  BILLING_CATALOG_PROCEDURE_EXAMPLES,
  HAITI_LAB_TO_CPT,
  IMAGING_CODE_TO_CPT,
  MED_CODE_TO_HCPCS,
  type BillingCatalogSeedRow,
} from "../data/billing-catalog-common";

/**
 * Idempotent: match by (triggerSource, externalCode) — first found row.
 * Phase 4.8: populate BillingCatalog for auto-mapping (lab/imaging/meds / procedure examples).
 */
export async function seedBillingCatalogCommonMappings(prisma: PrismaClient): Promise<void> {
  const toUpsert: BillingCatalogSeedRow[] = [
    ...BILLING_CATALOG_PROCEDURE_EXAMPLES,
    ...Object.keys(HAITI_LAB_TO_CPT).map((k) => {
      const m = HAITI_LAB_TO_CPT[k]!;
      return {
        triggerSource: "LAB" as const,
        externalCode: k,
        code: m.cpt,
        system: "CPT" as const,
        description: m.description,
        billClass: "facility" as const,
      };
    }),
    ...Object.keys(IMAGING_CODE_TO_CPT).map((k) => {
      const m = IMAGING_CODE_TO_CPT[k]!;
      return {
        triggerSource: "IMAGING" as const,
        externalCode: k,
        code: m.cpt,
        system: "CPT" as const,
        description: m.description,
        billClass: m.billClass,
      };
    }),
    ...Object.keys(MED_CODE_TO_HCPCS).map((k) => {
      const m = MED_CODE_TO_HCPCS[k]!;
      return {
        triggerSource: "MEDICATION" as const,
        externalCode: k,
        code: m.hcpcs,
        system: "HCPCS" as const,
        description: m.description,
        billClass: "both" as const,
      };
    }),
  ];

  for (const r of US_ER_LAB_CATALOG) {
    const d = r.billingCodeDefault?.trim();
    if (!d) continue;
    toUpsert.push({
      triggerSource: "LAB",
      externalCode: r.code,
      code: d,
      system: "CPT",
      description: r.nameEn.slice(0, 200),
      billClass: "facility",
    });
  }

  for (const row of toUpsert) {
    const existing = await prisma.billingCatalog.findFirst({
      where: { triggerSource: row.triggerSource, externalCode: row.externalCode },
    });
    if (existing) {
      await prisma.billingCatalog.update({
        where: { id: existing.id },
        data: {
          code: row.code,
          system: row.system,
          description: row.description,
          billClass: row.billClass,
        },
      });
    } else {
      await prisma.billingCatalog.create({
        data: {
          code: row.code,
          system: row.system,
          description: row.description,
          triggerSource: row.triggerSource,
          externalCode: row.externalCode,
          billClass: row.billClass,
        },
      });
    }
  }
}
