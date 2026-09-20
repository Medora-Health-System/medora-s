import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { SIDEBAR_NAV_ITEMS } from "@/components/app-shell/sidebarNavConfig";
import { resolveClinicalUiMessage } from "@/i18n/messages/registry";

const webRoot = join(import.meta.dirname, "../../..");
const readRoute = (route: string) =>
  readFileSync(join(webRoot, "app/app", route, "page.tsx"), "utf8");

describe("Appointments replaces legacy follow-up navigation", () => {
  it("exposes the calendar in the existing staff menu without a legacy follow-up entry", () => {
    const calendar = SIDEBAR_NAV_ITEMS.filter(item => item.href === "/app/appointments");
    expect(calendar).toHaveLength(1);
    expect(calendar[0].roles).toEqual(["RN", "PROVIDER", "ADMIN", "FRONT_DESK"]);
    expect(SIDEBAR_NAV_ITEMS.some(item => item.href === "/app/follow-ups")).toBe(false);
  });

  it.each([
    ["en", "Appointments"],
    ["es", "Citas"],
    ["fr", "Rendez-vous"],
  ] as const)("labels the menu in %s", (locale, label) => {
    expect(resolveClinicalUiMessage(locale, "nav.appointments")).toBe(label);
  });

  it.each(["follow-ups", "clinic-care/follow-up"])(
    "redirects retired %s page without mounting the legacy UI",
    route => {
      const source = readRoute(route);
      expect(source).toContain('redirect("/app/appointments")');
      expect(source).not.toContain("FollowUpsPage />");
      expect(source).not.toContain("@/lib/followUpsApi");
    }
  );

  it("keeps the new appointments calendar as the destination", () => {
    const source = readRoute("appointments");
    expect(source).toContain("fetchAppointmentCalendar");
    expect(source).toContain("AddAppointmentForm");
  });
});
