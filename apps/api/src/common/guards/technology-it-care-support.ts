import { RoleCode } from "@prisma/client";
import type { PrismaService } from "../../prisma/prisma.service";

const SAFE_READ_PREFIXES = [
  "/admin",
  "/facility-configuration",
  "/facilities",
  "/departments",
  "/roles",
] as const;

const DENIED_SEGMENTS = [
  "/billing",
  "/roi",
  "/data-exports",
  "/exports",
  "/patients",
  "/encounters",
  "/orders",
  "/medications",
  "/pharmacy",
  "/lab",
  "/radiology",
  "/imaging",
] as const;

function requestPath(request: any): string {
  const raw = String(request.originalUrl ?? request.url ?? "");
  const path = raw.split("?")[0] ?? "";
  return path.startsWith("/api/") ? path.slice(4) : path;
}

export async function isActiveTechnologyItStaff(
  prisma: PrismaService,
  userId: string
): Promise<boolean> {
  const rows = await prisma.$queryRawUnsafe<Array<{ ok: number }>>(
    `SELECT 1 AS ok
     FROM "MedoraWorkforceProfile" w
     JOIN "MedoraStaffProfile" s ON s."userId" = w."userId"
     WHERE w."userId" = $1
       AND w."department" = 'TECHNOLOGY_IT'::"MedoraCorporateDepartment"
       AND w."employmentStatus" = 'ACTIVE'::"MedoraEmploymentStatus"
       AND s."isActive" = TRUE
     LIMIT 1`,
    userId
  );
  return rows.length > 0;
}

export async function tryAuthorizeTechnologyItCareSupport(
  prisma: PrismaService,
  request: any,
  facilityId: string,
  userId: string,
  requiredRoles: readonly RoleCode[]
): Promise<boolean> {
  if (!requiredRoles.includes(RoleCode.ADMIN)) return false;

  const method = String(request.method ?? "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") return false;

  const path = requestPath(request);
  if (!SAFE_READ_PREFIXES.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
    return false;
  }
  if (DENIED_SEGMENTS.some((segment) => path.includes(segment))) return false;
  if (!(await isActiveTechnologyItStaff(prisma, userId))) return false;

  const facility = await prisma.facility.findFirst({
    where: { id: facilityId, isActive: true },
    select: { id: true },
  });
  if (!facility) return false;

  request.userRole = RoleCode.ADMIN;
  request.facilityId = facilityId;
  request.user = request.user || {};
  request.user.facilityId = facilityId;
  request.platformPrincipal = false;
  request.platformFacilityMembership = false;
  request.technologyItCareSupport = true;
  request.breakGlassSessionId = undefined;
  return true;
}
