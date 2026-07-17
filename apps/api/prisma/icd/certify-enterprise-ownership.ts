/**
 * Enterprise ICD ownership certification (Phase 19 Commit 2).
 *
 *   pnpm --filter @medora/api icd:ownership:enterprise-diagnostic-intelligence -- \
 *     --file=/path/to/official-release.zip --release=2026 --write-reports
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  ENTERPRISE_OWNERSHIP_PROBES,
  resolveEnterpriseOwnershipForCode,
  selectEnterpriseUniqueScopedBillableCodes,
} from "./enterprise-diagnostic-intelligence-registry";
import { validateIcd10CmRelease } from "./validate-icd10-cm-release";

const arg = (name: string) => process.argv.find((value) => value.startsWith(`--${name}=`))?.split("=", 2)[1]?.trim();
const flag = (name: string) => process.argv.includes(`--${name}`);

function main() {
  const file = arg("file");
  const release = arg("release") ?? "2026";
  if (!file) throw new Error("Missing --file");
  const validation = validateIcd10CmRelease({
    file,
    release,
    allowDevSample: flag("allow-dev-sample"),
    skipChecksum: flag("skip-checksum"),
  });
  if (!validation.ok || !validation.parse) {
    throw new Error(`Official release validation failed: ${validation.errors.join("; ")}`);
  }

  const scoped = selectEnterpriseUniqueScopedBillableCodes(validation.parse.rows, { billableOnly: true });
  const failures: string[] = [];
  const probeResults: Array<{
    id: string;
    codePattern: string;
    resolvedCode: string | null;
    primaryOwner: string | null;
    primaryFamilyId: string | null;
    pass: boolean;
    notes?: string;
  }> = [];

  for (const probe of ENTERPRISE_OWNERSHIP_PROBES) {
    const match = resolveEnterpriseOwnershipForCode(scoped, probe);
    let pass = Boolean(match);
    if (match) {
      if (match.primaryOwner !== probe.expectedPrimaryOwner) {
        failures.push(`${probe.id}: expected owner ${probe.expectedPrimaryOwner}, got ${match.primaryOwner}`);
        pass = false;
      }
      if (probe.expectedFamilyId && match.primaryFamilyId !== probe.expectedFamilyId) {
        failures.push(`${probe.id}: expected family ${probe.expectedFamilyId}, got ${match.primaryFamilyId}`);
        pass = false;
      }
      if (probe.forbiddenFamilyIds?.includes(match.primaryFamilyId)) {
        failures.push(`${probe.id}: forbidden family ${match.primaryFamilyId}`);
        pass = false;
      }
    } else {
      failures.push(`${probe.id}: no scoped code matched pattern ${probe.codePattern}`);
    }
    probeResults.push({
      id: probe.id,
      codePattern: probe.codePattern,
      resolvedCode: match?.code ?? null,
      primaryOwner: match?.primaryOwner ?? null,
      primaryFamilyId: match?.primaryFamilyId ?? null,
      pass,
      notes: probe.notes,
    });
  }

  const ownerByCode = new Map<string, string>();
  const conflictingPrimaryOwners: string[] = [];
  for (const row of scoped) {
    const prev = ownerByCode.get(row.code);
    if (prev && prev !== row.primaryOwner) {
      conflictingPrimaryOwners.push(`${row.code}: ${prev} vs ${row.primaryOwner}`);
    }
    ownerByCode.set(row.code, row.primaryOwner);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    probeCount: ENTERPRISE_OWNERSHIP_PROBES.length,
    probesPassed: probeResults.filter((p) => p.pass).length,
    probesFailed: probeResults.filter((p) => !p.pass).length,
    probeResults,
    failures,
    conflictingPrimaryOwners,
    enterpriseUniqueScoped: scoped.length,
    certification: {
      pass: failures.length === 0 && conflictingPrimaryOwners.length === 0,
    },
  };

  const summary = JSON.stringify(report, null, 2);
  if (flag("write-reports")) {
    const dir = resolve(__dirname, "certification-summaries");
    mkdirSync(join(dir, release), { recursive: true });
    writeFileSync(join(dir, "fy2026-enterprise-ownership-summary.json"), summary);
    writeFileSync(join(dir, release, "fy2026-enterprise-ownership-summary.json"), summary);
  }
  console.log(summary);
  process.exit(report.certification.pass ? 0 : 2);
}

main();
