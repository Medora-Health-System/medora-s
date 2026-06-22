/**
 * MEDUI.MEDICATION_CATALOG.HOSPITAL_ORDERABILITY_AND_TDAP.1
 * Static registry of medication catalog sources for audit tooling.
 */

export type MedicationCatalogSourceRisk = "LOW" | "MEDIUM" | "HIGH";

export type MedicationCatalogSourceRow = {
  source: string;
  fileOrModel: string;
  count: number | "runtime";
  orderable: boolean | "gated";
  providerOrderSearch: boolean | "primary" | "gated" | "no";
  mar: boolean | "via_orders" | "no";
  pharmacy: boolean | "required_fk" | "optional" | "no";
  risk: MedicationCatalogSourceRisk;
  notes: string;
};

export function buildMedicationCatalogSourceAudit(counts: {
  haitiCatalog: number;
  wave1: number;
  wave2: number;
  wave3: number;
  wave4: number;
  pilotTrancheA: number;
  vaccineCatalogSeed: number;
}): MedicationCatalogSourceRow[] {
  return [
    {
      source: "Haiti medication master (CatalogMedication seed)",
      fileOrModel: "packages/shared/src/medication/haitiMedicationFormularyCatalog.ts",
      count: counts.haitiCatalog,
      orderable: "gated",
      providerOrderSearch: "primary",
      mar: "via_orders",
      pharmacy: "required_fk",
      risk: "LOW",
      notes: "Legacy runtime catalog; isActive + canonical activation gate",
    },
    {
      source: "Enterprise Wave 1 formulary",
      fileOrModel: "packages/shared/src/medication/enterpriseWave1FormularyManifest.ts",
      count: counts.wave1,
      orderable: "gated",
      providerOrderSearch: "gated",
      mar: "via_orders",
      pharmacy: "optional",
      risk: "MEDIUM",
      notes: "Anticoagulation, vaccines, chronic care; staged activation required",
    },
    {
      source: "Enterprise Wave 2 formulary",
      fileOrModel: "packages/shared/src/medication/enterpriseWave2FormularyManifest.ts",
      count: counts.wave2,
      orderable: "gated",
      providerOrderSearch: "gated",
      mar: "via_orders",
      pharmacy: "optional",
      risk: "MEDIUM",
      notes: "Specialty expansion; not auto-orderable until activated",
    },
    {
      source: "Enterprise Wave 3 formulary",
      fileOrModel: "packages/shared/src/medication/enterpriseWave3FormularyManifest.ts",
      count: counts.wave3,
      orderable: "gated",
      providerOrderSearch: "gated",
      mar: "via_orders",
      pharmacy: "optional",
      risk: "MEDIUM",
      notes: "Hospital expansion batch",
    },
    {
      source: "Enterprise Wave 4 ED/hospital formulary",
      fileOrModel: "packages/shared/src/medication/enterpriseWave4EdHospitalFormularyManifest.ts",
      count: counts.wave4,
      orderable: "gated",
      providerOrderSearch: "gated",
      mar: "via_orders",
      pharmacy: "optional",
      risk: "MEDIUM",
      notes: "ED/hospital core expansion",
    },
    {
      source: "Pilot Tranche A (activated subset)",
      fileOrModel: "packages/shared/src/medication/enterpriseFormularyPilotTrancheAManifest.ts",
      count: counts.pilotTrancheA,
      orderable: true,
      providerOrderSearch: "primary",
      mar: "via_orders",
      pharmacy: "optional",
      risk: "LOW",
      notes: "12 low-risk oral chronic meds designated pilot-orderable",
    },
    {
      source: "VaccineCatalog (public health)",
      fileOrModel: "apps/api/prisma/schema.prisma VaccineCatalog",
      count: counts.vaccineCatalogSeed,
      orderable: false,
      providerOrderSearch: "no",
      mar: "no",
      pharmacy: "no",
      risk: "HIGH",
      notes: "Separate from medication order search; DTP seed only — no Tdap",
    },
    {
      source: "MedicationConcept / Product / Package (canonical)",
      fileOrModel: "apps/api/prisma/schema.prisma MedicationProduct",
      count: "runtime",
      orderable: "gated",
      providerOrderSearch: "gated",
      mar: "via_orders",
      pharmacy: "optional",
      risk: "MEDIUM",
      notes: "Governance activation gates orderSearchEnabled / marEnabled",
    },
    {
      source: "FacilityFormularyItem",
      fileOrModel: "apps/api/prisma/schema.prisma FacilityFormularyItem",
      count: "runtime",
      orderable: "gated",
      providerOrderSearch: "gated",
      mar: "no",
      pharmacy: "optional",
      risk: "MEDIUM",
      notes: "isOnFormulary required for gated provider search",
    },
    {
      source: "MedicationFormularyImportStaging",
      fileOrModel: "apps/api/prisma/schema.prisma MedicationFormularyImportStaging",
      count: "runtime",
      orderable: false,
      providerOrderSearch: "no",
      mar: "no",
      pharmacy: "no",
      risk: "LOW",
      notes: "Staging only until promoted — never silent activation",
    },
    {
      source: "Billing / NDC catalog",
      fileOrModel: "packages/shared/src/medication/enterpriseWave*BillingManifest.ts",
      count: "runtime",
      orderable: false,
      providerOrderSearch: "no",
      mar: "no",
      pharmacy: "no",
      risk: "LOW",
      notes: "Billing linkage; NDC review gate for activation",
    },
  ];
}
