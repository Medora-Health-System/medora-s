import { readFileSync } from "fs";
import { join } from "path";

describe("Audit trail preservation vs console log policy", () => {
  it("AuditService still persists Prisma audit rows independently of log policy", () => {
    const src = readFileSync(join(__dirname, "../services/audit.service.ts"), "utf8");
    expect(src).toContain("auditLog.create");
    expect(src).toContain("createStructuredLogger");
    // Console/ Nest log reduction must not remove durable audit write path.
    expect(src).not.toMatch(/if\s*\(\s*getLogPolicy|shouldLog|MEDORA_LOG_/);
  });

  it("claim retry operational events remain appended regardless of log.debug skips", () => {
    const src = readFileSync(
      join(__dirname, "../../billing/claim-retry-worker.service.ts"),
      "utf8",
    );
    expect(src).toContain('eventType: "RETRY_TRIGGERED"');
    expect(src).toContain('eventType: "RETRY_SKIPPED"');
    expect(src).toContain("claimOperationalEventService.append");
    expect(src).toMatch(/log\.debug\("retry_attempt_skipped"/);
  });
});
