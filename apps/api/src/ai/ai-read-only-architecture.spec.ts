import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const AI_READ_PATH_FILES = [
  "src/ai/ai-chart-review.controller.ts",
  "src/ai/review/clinical-review-orchestrator.service.ts",
  "src/ai/review/deterministic-review-engine.service.ts",
  "src/ai/snapshot/encounter-ai-snapshot.builder.ts",
  "src/ai/review/external-clinical-input.ts",
];

function source(path: string): string {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("AI clinical review read-only architecture", () => {
  it("does not introduce direct Prisma mutations in the clinical review path", () => {
    const mutationPattern = /\.\s*(create|createMany|update|updateMany|upsert|delete|deleteMany)\s*\(/g;

    for (const path of AI_READ_PATH_FILES) {
      const text = source(path);
      expect({ path, matches: text.match(mutationPattern) ?? [] }).toEqual({
        path,
        matches: [],
      });
    }
  });

  it("does not import encounter documentation mutation services into the AI read path", () => {
    const forbiddenImportPattern = /(encounters\.service|provider-documentation.*service|orders\.service|medication.*service|billing.*service)/i;

    for (const path of AI_READ_PATH_FILES) {
      expect(source(path)).not.toMatch(forbiddenImportPattern);
    }
  });

  it("keeps model instructions explicitly advisory and forbids chart/order/coding mutation", () => {
    const orchestrator = source("src/ai/review/clinical-review-orchestrator.service.ts");

    expect(orchestrator).toContain("Do not diagnose autonomously");
    expect(orchestrator).toContain("place or imply orders");
    expect(orchestrator).toContain("modify documentation");
    expect(orchestrator).toContain("Do not provide CPT/E&M/payer/reimbursement advice");
    expect(orchestrator).toContain("Recommended actions may only ask the clinician to review or navigate");
  });

  it("keeps signed documentation fields read-only inside the snapshot builder", () => {
    const snapshotBuilder = source("src/ai/snapshot/encounter-ai-snapshot.builder.ts");

    expect(snapshotBuilder).toContain("providerDocumentationSignedAt: true");
    expect(snapshotBuilder).toContain("providerDocumentationSignedByUserId: true");
    expect(snapshotBuilder).not.toMatch(/providerDocumentationSignedAt\s*=/);
    expect(snapshotBuilder).not.toMatch(/providerDocumentationSignedByUserId\s*=/);
  });
});
