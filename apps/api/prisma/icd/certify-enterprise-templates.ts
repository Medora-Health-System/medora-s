/**
 * Enterprise adaptive template certification (Phase 19 Commit 2).
 *
 *   pnpm --filter @medora/api clinical:templates:enterprise-certify --write-reports
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ENTERPRISE_ADAPTIVE_TEMPLATE_IDS,
  ENTERPRISE_TEMPLATE_INVENTORY,
  PHASE_19_NEW_TEMPLATE_IDS,
  TOTAL_VISIBLE_TEMPLATES,
} from "./enterprise-template-inventory-data";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);

const WEB_ROOT = resolve(__dirname, "../../../web/src");

function main() {
  const release = arg("release") ?? "2026";
  const failures: string[] = [];
  const missingEnTitles: string[] = [];

  const ids = ENTERPRISE_TEMPLATE_INVENTORY.map((t) => t.id);
  const duplicateIds = ids.filter((id, idx) => ids.indexOf(id) !== idx);
  if (duplicateIds.length > 0) failures.push(`Duplicate template IDs: ${[...new Set(duplicateIds)].join(", ")}`);

  if (PHASE_19_NEW_TEMPLATE_IDS.length > 0) {
    failures.push(`Phase 19 new templates must be 0, found ${PHASE_19_NEW_TEMPLATE_IDS.length}`);
  }

  const sourceFiles = [
    join(WEB_ROOT, "lib/providerDocumentationMskTraumaComplaintIntelligence19Mdm6.ts"),
    join(WEB_ROOT, "lib/providerDocumentationEntEmergencyComplaintIntelligence.ts"),
    join(WEB_ROOT, "lib/providerDocumentationSoftTissueWoundInfectionIntelligence.ts"),
    join(WEB_ROOT, "lib/providerDocumentationDermatologyIntelligence.ts"),
    join(WEB_ROOT, "lib/providerDocumentationEnvironmentalExposureIntelligence.ts"),
    join(WEB_ROOT, "lib/providerDocumentationToxicologyIntelligence.ts"),
    join(WEB_ROOT, "lib/providerDocumentationObgynUrologyIntelligence.ts"),
    join(WEB_ROOT, "lib/providerDocumentationPsychiatricBehavioralIntelligence.ts"),
  ];
  const catalogBlob = sourceFiles.filter(existsSync).map((p) => readFileSync(p, "utf8")).join("\n");

  for (const entry of ENTERPRISE_TEMPLATE_INVENTORY) {
    if (!catalogBlob.includes(`"${entry.id}"`)) {
      missingEnTitles.push(entry.id);
    }
  }

  if (missingEnTitles.length > 0) {
    failures.push(`${missingEnTitles.length} inventoried templates not found in complaint intelligence sources`);
  }

  const inventoryPayload = {
    generatedAt: new Date().toISOString(),
    totalVisibleTemplates: TOTAL_VISIBLE_TEMPLATES,
    inventoriedAdaptiveTemplates: ENTERPRISE_TEMPLATE_INVENTORY.length,
    adaptiveTemplateIds: ENTERPRISE_ADAPTIVE_TEMPLATE_IDS,
    entries: ENTERPRISE_TEMPLATE_INVENTORY,
    duplicateTemplateIds: duplicateIds.length,
    phase19NewTemplates: PHASE_19_NEW_TEMPLATE_IDS.length,
    missingCatalogEntries: missingEnTitles,
    certification: {
      pass: failures.length === 0,
    },
    failures,
  };

  const inventoryJson = JSON.stringify(inventoryPayload, null, 2);
  const summaryJson = JSON.stringify(
    {
      generatedAt: inventoryPayload.generatedAt,
      totalVisibleTemplates: TOTAL_VISIBLE_TEMPLATES,
      inventoriedCount: ENTERPRISE_TEMPLATE_INVENTORY.length,
      duplicateIds: duplicateIds.length,
      phase19NewTemplates: PHASE_19_NEW_TEMPLATE_IDS.length,
      inventorySha256: createHash("sha256").update(inventoryJson).digest("hex"),
      pass: failures.length === 0,
      failures,
    },
    null,
    2,
  );

  if (flag("write-reports")) {
    const dir = resolve(__dirname, "certification-summaries");
    mkdirSync(join(dir, release), { recursive: true });
    writeFileSync(join(dir, "fy2026-enterprise-template-inventory.json"), inventoryJson);
    writeFileSync(join(dir, release, "fy2026-enterprise-template-inventory.json"), inventoryJson);
    writeFileSync(join(dir, "fy2026-enterprise-template-certification-summary.json"), summaryJson);
    writeFileSync(join(dir, release, "fy2026-enterprise-template-certification-summary.json"), summaryJson);
  }

  console.log(summaryJson);
  process.exit(failures.length === 0 ? 0 : 2);
}

main();
