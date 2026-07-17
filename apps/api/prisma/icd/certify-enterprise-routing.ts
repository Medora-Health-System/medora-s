/**
 * Enterprise ICD discharge routing certification (Phase 19 Commit 2).
 *
 *   pnpm --filter @medora/api icd:routing:enterprise-diagnostic-intelligence -- \
 *     --file=/path/to/official-release.zip --release=2026 --write-reports
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import {
  bestEnterpriseDischargeFamily,
  ENTERPRISE_DISCHARGE_ROUTING_PREFIXES,
  ENTERPRISE_ROUTING_PROBE_EXPECTATIONS,
} from "./enterprise-discharge-routing-map";
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

  const probeFailures: string[] = [];
  const probeResults = ENTERPRISE_ROUTING_PROBE_EXPECTATIONS.map((probe) => {
    const resolved = bestEnterpriseDischargeFamily(probe.code);
    const pass = resolved?.family === probe.expectedFamily;
    if (!pass) {
      probeFailures.push(
        `${probe.label} (${probe.code}): expected ${probe.expectedFamily}, got ${resolved?.family ?? "null"}`,
      );
    }
    return {
      ...probe,
      resolvedFamily: resolved?.family ?? null,
      pass,
    };
  });

  const unexplainedRoutingFallbacks = probeResults.filter((p) => !p.resolvedFamily).map((p) => p.code);

  const uniqueFamilies = new Set(ENTERPRISE_DISCHARGE_ROUTING_PREFIXES.map((e) => e.family));

  const report = {
    generatedAt: new Date().toISOString(),
    uniqueDischargeFamilyCount: uniqueFamilies.size,
    probeCount: ENTERPRISE_ROUTING_PROBE_EXPECTATIONS.length,
    unexplainedRoutingFallbacks,
    probeResults,
    probeFailures,
    certification: {
      pass: unexplainedRoutingFallbacks.length === 0 && probeFailures.length === 0,
    },
  };

  const summary = JSON.stringify(report, null, 2);
  if (flag("write-reports")) {
    const dir = resolve(__dirname, "certification-summaries");
    mkdirSync(join(dir, release), { recursive: true });
    writeFileSync(join(dir, "fy2026-enterprise-routing-summary.json"), summary);
    writeFileSync(join(dir, release, "fy2026-enterprise-routing-summary.json"), summary);
  }
  console.log(summary);
  process.exit(report.certification.pass ? 0 : 2);
}

main();
