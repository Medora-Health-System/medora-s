import fs from "node:fs";
import path from "node:path";
import { NotFoundException } from "@nestjs/common";
import { PlatformOwnerControlService } from "./platform-owner-control.service";
import { WORKFORCE_ACCESS_PACKAGES } from "./workforce-access-packages";

const read = (name: string) => fs.readFileSync(path.join(__dirname, name), "utf8");

describe("Phase 17 delegated-admin escalation hardening", () => {
  it("keeps delegated self-mutation and self-grant prohibited in the authoritative service", () => {
    const source = read("platform-staff.service.ts");
    expect(source).toContain("SELF_MUTATION_PROHIBITED");
    expect(source).toContain("Self staff mutation is prohibited");
    expect(source).toContain("SELF_GRANT_PROHIBITED");
    expect(source).toContain("Self-grant is prohibited");
  });

  it("keeps critical direct grants owner-only", () => {
    const staff = read("platform-staff.service.ts");
    const controller = read("platform-staff.controller.ts");
    const owner = read("platform-owner-control.service.ts");
    expect(staff).toContain('capability.riskLevel === "CRITICAL"');
    expect(staff).toContain("DUAL_CONTROL_REQUIRED");
    expect(controller).toContain("this.owner.directGrantAsOwner");
    expect(owner).toContain("Authoritative platform principal required");
  });

  it("does not let delegated workforce identity become runtime authority", () => {
    const packages = read("workforce-access-packages.ts");
    const apply = read("workforce-access-package.service.ts");
    expect(packages).toContain("Explicit PlatformCapabilityGrant rows remain authoritative");
    expect(apply).toContain('runtimeAuthority:"EXPLICIT_PLATFORM_CAPABILITY_GRANTS_ONLY"');
    expect(apply).toContain("actorIsOwner");
  });

  it("keeps Technology IT bounded away from billing, compliance mutation, and clinical authority", () => {
    const tech = new Set(WORKFORCE_ACCESS_PACKAGES.TECHNOLOGY_IT.capabilities);
    expect(tech.has("BILLING_RCM_VIEW")).toBe(false);
    expect(tech.has("BILLING_RCM_MANAGE")).toBe(false);
    expect(tech.has("COMPLIANCE_CONTROLS_MANAGE")).toBe(false);
    for (const code of tech) expect(String(code)).not.toMatch(/PATIENT|CHART|ENCOUNTER|CLINICAL/);
  });
});

describe("Phase 17 protected-owner enumeration and mutation hardening", () => {
  const principalUser = { id: "owner", isActive: true, canCreateFacilities: true, userRoles: [{ id: "r" }] };
  const delegatedUser = { id: "staff", isActive: true, canCreateFacilities: false, userRoles: [] };
  const prisma: any = { user: { findUnique: jest.fn(({ where }: any) => Promise.resolve(where.id === "owner" ? principalUser : delegatedUser)) } };
  const service = new PlatformOwnerControlService(prisma, {} as any);

  beforeEach(() => jest.clearAllMocks());

  it("returns not-found semantics for delegated direct owner targeting", async () => {
    await expect(service.assertTargetVisibleTo("staff", "owner")).rejects.toBeInstanceOf(NotFoundException);
  });

  it("removes owner identity from mixed delegated projections", async () => {
    await expect(service.filterProtectedUsers("staff", [
      { id: "owner", email: "hidden@example.invalid" },
      { id: "staff", email: "staff@example.invalid" },
    ])).resolves.toEqual([{ id: "staff", email: "staff@example.invalid" }]);
  });

  it("keeps owner concealment enforced before staff lifecycle/capability mutations", () => {
    const source = read("platform-staff.controller.ts");
    for (const route of ["provision", "deactivate", "grant", "revoke"]) {
      const marker = `async ${route}`;
      const start = source.indexOf(marker);
      expect(start).toBeGreaterThan(-1);
      const section = source.slice(start, start + 650);
      expect(section).toContain("assertTargetVisibleTo");
    }
  });

  it("conceals owner-linked privileged actions from delegated list and mutation paths", () => {
    const source = read("privileged-action.controller.ts");
    expect(source).toContain("this.owner.isOwner(r.targetUserId)");
    expect(source).toContain("this.owner.isOwner(r.requesterUserId)");
    for (const action of ["approve", "reject", "cancel", "execute"]) {
      expect(source).toContain(`async ${action}`);
      expect(source).toContain("this.visible(a.userId,id)");
    }
  });

  it("never identifies the protected owner with an email allowlist", () => {
    const source = read("platform-owner-control.service.ts");
    expect(source).toContain("resolvePlatformAuthority");
    expect(source).not.toMatch(/support@medoras\.com|mackentoch89@gmail\.com/i);
  });
});
