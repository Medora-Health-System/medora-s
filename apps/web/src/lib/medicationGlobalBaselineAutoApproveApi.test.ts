import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const apiSource = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "medicationGlobalBaselineApi.ts"),
  "utf8"
);

const panelSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../components/admin/GlobalBaselineAutoApprovalPanel.tsx"
  ),
  "utf8"
);

const pageSource = readFileSync(
  join(
    dirname(fileURLToPath(import.meta.url)),
    "../../app/app/admin/medication-governance/page.tsx"
  ),
  "utf8"
);

describe("medicationGlobalBaseline auto-approve (19I)", () => {
  it("API targets tiered auto-approve endpoint", () => {
    expect(apiSource).toContain("/governance/global-baseline/auto-approve-tiered");
    expect(apiSource).toContain("dryRun");
    expect(apiSource).toContain("PRIORITY_ER_INVENTORY");
  });

  it("panel requires dry-run before commit", () => {
    expect(panelSource).toContain("runGlobalBaselineTieredAutoApprove");
    expect(panelSource).toContain("dryRunResult");
    expect(panelSource).toContain("commitConfirm");
    expect(panelSource).toContain("globalBaselineAutoApprove.warning");
  });

  it("governance page embeds auto-approval panel exactly once", () => {
    const importMatches =
      pageSource.match(
        /import \{ GlobalBaselineAutoApprovalPanel \} from "@\/components\/admin\/GlobalBaselineAutoApprovalPanel";/g
      ) ?? [];
    expect(importMatches.length).toBe(1);
    const renderMatches =
      pageSource.match(/<GlobalBaselineAutoApprovalPanel[\s/>]/g) ?? [];
    expect(renderMatches.length).toBe(1);
  });

  it("controller defines auto-approve-tiered route once", () => {
    const controllerSource = readFileSync(
      join(
        dirname(fileURLToPath(import.meta.url)),
        "../../../api/src/medication-master/medication-master.controller.ts"
      ),
      "utf8"
    );
    const matches =
      controllerSource.match(/governance\/global-baseline\/auto-approve-tiered/g) ?? [];
    expect(matches.length).toBe(1);
  });
});
