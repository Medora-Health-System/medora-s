import { RoleCode } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";
import type { PlatformCapabilityCode } from "../../platform-staff/platform-capabilities";

/**
 * Phase 18E — Technology / IT care access is explicit and owner-selectable.
 * Department identity only makes a user eligible for this bridge; it grants nothing by itself.
 * Every care/module path below requires a live PlatformCapabilityGrant.
 */
const PATH_SCOPES: ReadonlyArray<{ match: readonly string[]; capability: PlatformCapabilityCode }> = [
  { match:["/inpatient", "/hospital-care", "/hospital/"], capability:"IT_CARE_INPATIENT_HOSPITAL" },
  { match:["/emergency", "/ed-", "/er-"], capability:"IT_CARE_EMERGENCY" },
  { match:["/urgent-care"], capability:"IT_CARE_URGENT_CARE" },
  { match:["/clinic", "/ambulatory"], capability:"IT_CARE_CLINIC" },
  { match:["/observation"], capability:"IT_CARE_OBSERVATION" },
  { match:["/lab", "/laboratory", "/results"], capability:"IT_CARE_LABORATORY" },
  { match:["/radiology", "/imaging", "/diagnostic"], capability:"IT_CARE_RADIOLOGY" },
  { match:["/pharmacy", "/medication", "/mar"], capability:"IT_CARE_PHARMACY" },
  { match:["/digital-care"], capability:"IT_CARE_DIGITAL_CARE" },
  { match:["/patient-portal", "/patient-portal-admin"], capability:"IT_CARE_PATIENT_PORTAL" },
  { match:["/scheduling", "/appointments"], capability:"IT_CARE_SCHEDULING" },
  { match:["/telemedicine", "/telehealth"], capability:"IT_CARE_TELEMEDICINE" },
  { match:["/ai/", "/ai-"], capability:"IT_CARE_AI" },
  { match:["/billing", "/claims", "/payments", "/revenue-cycle"], capability:"IT_CARE_BILLING" },
  { match:["/orders", "/order-sets"], capability:"IT_CARE_ORDERS" },
  { match:["/patients", "/encounters", "/diagnoses", "/documents", "/vitals"], capability:"IT_CARE_PATIENT_RECORDS" },
];

const ADMIN_READ_PREFIXES = ["/admin", "/facility-configuration", "/facilities", "/departments", "/roles"] as const;

function requestPath(request: any): string {
  const raw = String(request.originalUrl ?? request.url ?? "");
  const path = raw.split("?")[0] ?? "";
  return path.startsWith("/api/") ? path.slice(4) : path;
}

export async function isActiveTechnologyItStaff(prisma: PrismaService, userId: string): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ ok: number }>>(
    `SELECT 1 AS ok FROM "MedoraWorkforceProfile" w
     JOIN "MedoraStaffProfile" s ON s."userId" = w."userId"
     WHERE w."userId" = $1
       AND w."department" = 'TECHNOLOGY_IT'::"MedoraCorporateDepartment"
       AND w."employmentStatus" = 'ACTIVE'::"MedoraEmploymentStatus"
       AND s."isActive" = TRUE LIMIT 1`, userId
  );
  return rows.length > 0;
}

async function activeCapabilityCodes(prisma: PrismaService, userId: string): Promise<Set<string>> {
  const rows = await prisma.platformCapabilityGrant.findMany({
    where:{ userId, isActive:true, capability:{ isActive:true } },
    select:{ capability:{ select:{ code:true } } },
  });
  return new Set(rows.map((row) => row.capability.code));
}

function requiredCareCapability(path: string): PlatformCapabilityCode | null {
  for (const scope of PATH_SCOPES) if (scope.match.some((token) => path.includes(token))) return scope.capability;
  return null;
}

function projectedRole(requiredRoles: readonly RoleCode[]): RoleCode | null {
  const preference = [RoleCode.ADMIN, RoleCode.PROVIDER, RoleCode.RN, RoleCode.PHARMACY, RoleCode.LAB, RoleCode.RADIOLOGY, RoleCode.FRONT_DESK];
  return preference.find((role) => requiredRoles.includes(role)) ?? requiredRoles[0] ?? null;
}

export async function tryAuthorizeTechnologyItCareSupport(
  prisma: PrismaService,
  request: any,
  facilityId: string,
  userId: string,
  requiredRoles: readonly RoleCode[]
): Promise<boolean> {
  if (!(await isActiveTechnologyItStaff(prisma, userId))) return false;
  const facility = await prisma.facility.findFirst({ where:{id:facilityId,isActive:true}, select:{id:true} });
  if (!facility) return false;

  const path = requestPath(request);
  const method = String(request.method ?? "GET").toUpperCase();
  const capabilities = await activeCapabilityCodes(prisma, userId);
  const careCapability = requiredCareCapability(path);

  // Existing platform/facility administration remains capability-governed. Read-only admin
  // projection is retained for compatibility; writes require FACILITY_CONFIGURE.
  if (!careCapability) {
    if (!ADMIN_READ_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) return false;
    if (method !== "GET" && method !== "HEAD" && !capabilities.has("FACILITY_CONFIGURE")) return false;
  } else if (!capabilities.has(careCapability)) {
    return false;
  }

  const role = projectedRole(requiredRoles);
  if (!role) return false;
  request.userRole = role;
  request.facilityId = facilityId;
  request.user = request.user || {};
  request.user.facilityId = facilityId;
  request.platformPrincipal = false;
  request.platformFacilityMembership = false;
  request.technologyItCareSupport = true;
  request.technologyItCareCapability = careCapability;
  request.breakGlassSessionId = undefined;
  return true;
}
