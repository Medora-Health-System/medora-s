import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { en, fr } from "../../i18n/messages";
const root=join(__dirname,"../../../../..");
describe("D4SEC.1C.5C authorized single-admin staff UX",()=>{
 it("uses the direct staff endpoint and not privileged requests",()=>{const ui=readFileSync(join(root,"apps/web/src/features/platform/PlatformUi.tsx"),"utf8"),api=readFileSync(join(root,"apps/web/src/lib/platform/api.ts"),"utf8");const staff=ui.slice(ui.indexOf("export function Staff()"),ui.indexOf("const statuses="));expect(staff).toContain("platformStaffApi.provision");expect(staff).not.toContain("platformPrivilegedActionsApi.create");expect(api).toContain('/provision`');});
 it("provides actionable English and French errors and direct-operation labels",()=>{for(const key of ["staff.add","staff.createEmployee","staff.created","staff.directNotice","error.RECENT_SESSION_MFA_REQUIRED","error.STAFF_PROVISION_FORBIDDEN","error.STAFF_ALREADY_PROVISIONED","error.STAFF_TARGET_INACTIVE"] as const){expect(en[key]).toBeTruthy();expect(fr[key]).toBeTruthy();expect(fr[key]).not.toBe(en[key])}});
});
