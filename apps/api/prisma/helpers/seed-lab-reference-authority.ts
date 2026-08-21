/**
 * MEDUI.LAB.REF.1/2 — seed helper for canonical analytes / aliases / panels / Mayo curated intervals.
 * Idempotent. Does NOT seed critical thresholds or facility overrides.
 */

import type { PrismaClient } from "@prisma/client";
import {
  LAB_REF_CANONICAL_ANALYTES,
  LAB_REF_MAYO_CURATED_INTERVALS,
  LAB_REF_PANEL_DEFINITIONS,
} from "@medora/shared";

export async function seedLabReferenceAuthority(prisma: PrismaClient) {
  let analytesUpserted = 0;
  let aliasesUpserted = 0;
  let panelsUpserted = 0;
  let membersUpserted = 0;

  const analyteIdByCode: Record<string, string> = {};

  for (const a of LAB_REF_CANONICAL_ANALYTES) {
    const row = await prisma.canonicalLabAnalyte.upsert({
      where: { code: a.code },
      update: {
        displayNameEn: a.displayNameEn,
        displayNameFr: a.displayNameFr,
        description: a.description ?? null,
        defaultLoincCode: a.defaultLoincCode ?? null,
        isActive: true,
      },
      create: {
        code: a.code,
        displayNameEn: a.displayNameEn,
        displayNameFr: a.displayNameFr,
        description: a.description ?? null,
        defaultLoincCode: a.defaultLoincCode ?? null,
        isActive: true,
      },
    });
    analyteIdByCode[a.code] = row.id;
    analytesUpserted += 1;

    const keepAliasCodes = new Set(a.aliases.map((x) => x.aliasCode));
    for (const alias of a.aliases) {
      await prisma.canonicalLabAnalyteAlias.upsert({
        where: { aliasCode: alias.aliasCode },
        update: {
          canonicalLabAnalyteId: row.id,
          notes: alias.notes ?? null,
        },
        create: {
          aliasCode: alias.aliasCode,
          canonicalLabAnalyteId: row.id,
          notes: alias.notes ?? null,
        },
      });
      aliasesUpserted += 1;
    }
    // Drop obsolete aliases for this analyte (idempotent cleanup).
    await prisma.canonicalLabAnalyteAlias.deleteMany({
      where: {
        canonicalLabAnalyteId: row.id,
        aliasCode: { notIn: [...keepAliasCodes] },
      },
    });
  }

  for (const panel of LAB_REF_PANEL_DEFINITIONS) {
    const panelRow = await prisma.labPanelDefinition.upsert({
      where: { code: panel.code },
      update: {
        displayNameEn: panel.displayNameEn,
        displayNameFr: panel.displayNameFr,
        isActive: true,
      },
      create: {
        code: panel.code,
        displayNameEn: panel.displayNameEn,
        displayNameFr: panel.displayNameFr,
        isActive: true,
      },
    });
    panelsUpserted += 1;

    for (const m of panel.members) {
      const analyteId = analyteIdByCode[m.analyteCode];
      if (!analyteId) {
        throw new Error(`Lab panel ${panel.code}: missing analyte ${m.analyteCode}`);
      }
      await prisma.labPanelMember.upsert({
        where: {
          panelId_canonicalLabAnalyteId: {
            panelId: panelRow.id,
            canonicalLabAnalyteId: analyteId,
          },
        },
        update: {
          sortOrder: m.sortOrder,
          unitHint: m.unitHint ?? null,
        },
        create: {
          panelId: panelRow.id,
          canonicalLabAnalyteId: analyteId,
          sortOrder: m.sortOrder,
          unitHint: m.unitHint ?? null,
        },
      });
      membersUpserted += 1;
    }
    // Drop obsolete panel members not in current definition.
    const keepAnalyteIds = panel.members.map((m) => analyteIdByCode[m.analyteCode]!).filter(Boolean);
    await prisma.labPanelMember.deleteMany({
      where: {
        panelId: panelRow.id,
        canonicalLabAnalyteId: { notIn: keepAnalyteIds },
      },
    });
  }

  // Replace Medora Mayo curation wave rows only (never touch facility overrides / other sources).
  await prisma.labReferenceInterval.deleteMany({
    where: {
      OR: [
        { sourceIdentifier: { startsWith: "MAYO.CBC." } },
        { sourceIdentifier: { startsWith: "MAYO.BMAMA." } },
        { sourceIdentifier: { startsWith: "MAYO.CMP." } },
      ],
    },
  });

  let intervalsCreated = 0;
  for (const iv of LAB_REF_MAYO_CURATED_INTERVALS) {
    const analyteId = analyteIdByCode[iv.analyteCode];
    if (!analyteId) {
      throw new Error(`Mayo interval missing analyte ${iv.analyteCode}`);
    }
    await prisma.labReferenceInterval.create({
      data: {
        canonicalLabAnalyteId: analyteId,
        loincCode: iv.loincCode,
        specimen: iv.specimen,
        unit: iv.unit,
        ageMinYears: iv.ageMinYears,
        ageMaxYears: iv.ageMaxYears,
        sexApplicability: iv.sexApplicability,
        pregnancyApplicability: iv.pregnancyApplicability,
        methodOrAnalyzer: iv.methodOrAnalyzer,
        low: iv.low,
        high: iv.high,
        textualInterval: iv.textualInterval,
        sourceName: iv.sourceName,
        sourceIdentifier: iv.sourceIdentifier,
        sourceUrl: iv.sourceUrl,
        sourceVersion: iv.sourceVersion,
        sourcePublishedAt: iv.sourcePublishedAt ? new Date(iv.sourcePublishedAt) : null,
        effectiveFrom: new Date(iv.effectiveFrom),
        effectiveTo: null,
        status: "ACTIVE",
      },
    });
    intervalsCreated += 1;
  }

  console.log(
    `✅ Lab reference authority (analytes=${analytesUpserted}, aliases=${aliasesUpserted}, panels=${panelsUpserted}, members=${membersUpserted}, mayoIntervals=${intervalsCreated}; criticalPolicies=0; facilityOverrides=0)`
  );

  return {
    analytesUpserted,
    aliasesUpserted,
    panelsUpserted,
    membersUpserted,
    intervalsCreated,
  };
}
