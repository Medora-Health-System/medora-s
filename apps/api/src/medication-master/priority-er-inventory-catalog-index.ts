import type { PrismaService } from "../prisma/prisma.service";
import {
  normalizeDoseForMatch,
  normalizeFormForMatch,
  normalizeMedicationNameForMatch,
} from "./priority-er-inventory-match-normalize.util";

export type CatalogIndexEntry = {
  kind: "concept" | "product" | "package" | "catalog";
  id: string;
  code: string | null;
  nameNormalized: string;
  doseNormalized: string;
  formNormalized: string;
  ndc11: string | null;
  legacyCatalogMedicationId: string | null;
  conceptId: string | null;
  productId: string | null;
};

export type MedicationCatalogIndex = {
  entries: CatalogIndexEntry[];
  aliasToEntryKeys: Map<string, CatalogIndexEntry[]>;
};

function entryKey(e: CatalogIndexEntry): string {
  return `${e.kind}:${e.id}`;
}

export async function loadMedicationCatalogIndex(prisma: PrismaService): Promise<MedicationCatalogIndex> {
  const [concepts, products, packages, catalogMeds, medicationAliases, searchAliases] = await Promise.all([
    prisma.medicationConcept.findMany({
      where: { isActive: true },
      select: { id: true, code: true, genericName: true, displayName: true },
    }),
    prisma.medicationProduct.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        conceptId: true,
        strengthDisplay: true,
        dosageForm: true,
        legacyCatalogMedicationId: true,
        defaultRoute: { select: { code: true } },
      },
    }),
    prisma.medicationPackage.findMany({
      select: {
        id: true,
        code: true,
        productId: true,
        packageDescription: true,
        packageType: true,
        ndc11: true,
        product: {
          select: {
            conceptId: true,
            strengthDisplay: true,
            dosageForm: true,
            concept: { select: { genericName: true, displayName: true } },
          },
        },
      },
    }),
    prisma.catalogMedication.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        genericName: true,
        displayNameEn: true,
        displayNameFr: true,
        name: true,
        strength: true,
        dosageForm: true,
        route: true,
        ndc11: true,
      },
    }),
    prisma.medicationAlias.findMany({
      select: { alias: true, catalogMedicationId: true },
    }),
    prisma.medicationSearchAlias.findMany({
      select: { alias: true, conceptId: true, productId: true },
    }),
  ]);

  const entries: CatalogIndexEntry[] = [];

  for (const c of concepts) {
    const name = c.genericName || c.displayName;
    entries.push({
      kind: "concept",
      id: c.id,
      code: c.code,
      nameNormalized: normalizeMedicationNameForMatch(name),
      doseNormalized: "",
      formNormalized: "",
      ndc11: null,
      legacyCatalogMedicationId: null,
      conceptId: c.id,
      productId: null,
    });
  }

  for (const p of products) {
    const concept = concepts.find((c) => c.id === p.conceptId);
    const name = concept?.genericName ?? concept?.displayName ?? p.code;
    entries.push({
      kind: "product",
      id: p.id,
      code: p.code,
      nameNormalized: normalizeMedicationNameForMatch(name),
      doseNormalized: normalizeDoseForMatch(p.strengthDisplay),
      formNormalized: normalizeFormForMatch(
        [p.dosageForm, p.defaultRoute?.code ?? ""].filter(Boolean).join(" ")
      ),
      ndc11: null,
      legacyCatalogMedicationId: p.legacyCatalogMedicationId,
      conceptId: p.conceptId,
      productId: p.id,
    });
  }

  for (const pkg of packages) {
    const conceptName =
      pkg.product.concept.genericName || pkg.product.concept.displayName || "";
    entries.push({
      kind: "package",
      id: pkg.id,
      code: pkg.code,
      nameNormalized: normalizeMedicationNameForMatch(conceptName),
      doseNormalized: normalizeDoseForMatch(pkg.product.strengthDisplay),
      formNormalized: normalizeFormForMatch(
        [pkg.product.dosageForm, pkg.packageDescription, pkg.packageType].filter(Boolean).join(" ")
      ),
      ndc11: pkg.ndc11,
      legacyCatalogMedicationId: null,
      conceptId: pkg.product.conceptId,
      productId: pkg.productId,
    });
  }

  for (const cm of catalogMeds) {
    const display = cm.displayNameEn || cm.displayNameFr || cm.name;
    const name = cm.genericName || display;
    entries.push({
      kind: "catalog",
      id: cm.id,
      code: cm.code,
      nameNormalized: normalizeMedicationNameForMatch(name),
      doseNormalized: normalizeDoseForMatch(cm.strength ?? ""),
      formNormalized: normalizeFormForMatch([cm.dosageForm, cm.route].filter(Boolean).join(" ")),
      ndc11: cm.ndc11,
      legacyCatalogMedicationId: cm.id,
      conceptId: null,
      productId: null,
    });
  }

  const aliasToEntryKeys = new Map<string, CatalogIndexEntry[]>();

  const addAlias = (alias: string, entry: CatalogIndexEntry) => {
    const key = normalizeMedicationNameForMatch(alias);
    if (!key) return;
    const list = aliasToEntryKeys.get(key) ?? [];
    if (!list.some((e) => entryKey(e) === entryKey(entry))) list.push(entry);
    aliasToEntryKeys.set(key, list);
  };

  for (const a of medicationAliases) {
    const cm = catalogMeds.find((c) => c.id === a.catalogMedicationId);
    if (!cm) continue;
    const entry = entries.find((e) => e.kind === "catalog" && e.id === cm.id);
    if (entry) addAlias(a.alias, entry);
  }

  for (const a of searchAliases) {
    let entry: CatalogIndexEntry | undefined;
    if (a.productId) {
      entry = entries.find((e) => e.kind === "product" && e.id === a.productId);
    } else if (a.conceptId) {
      entry = entries.find((e) => e.kind === "concept" && e.id === a.conceptId);
    }
    if (entry) addAlias(a.alias, entry);
  }

  return { entries, aliasToEntryKeys };
}
