import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { WORKFORCE_ACCESS_PACKAGES } from "./workforce-access-packages";

@Injectable()
export class WorkforceAccessPackageService {
  constructor(private readonly prisma: PrismaService) {}

  async preview(targetUserId: string) {
    const staff = await this.prisma.medoraStaffProfile.findUnique({ where:{userId:targetUserId}, select:{isActive:true} });
    if (!staff?.isActive) throw new NotFoundException("Active Medora staff profile not found");
    const workforce = await this.prisma.$queryRawUnsafe<any[]>(`SELECT "department","jobTitle","employmentStatus" FROM "MedoraWorkforceProfile" WHERE "userId"=$1`, targetUserId);
    if (!workforce[0]) throw new NotFoundException("Corporate workforce profile not found");
    const pkg = WORKFORCE_ACCESS_PACKAGES[workforce[0].department as keyof typeof WORKFORCE_ACCESS_PACKAGES];
    if (!pkg) throw new NotFoundException("Governed workforce access package not found");
    const [catalog, active] = await Promise.all([
      this.prisma.platformCapability.findMany({ where:{code:{in:[...pkg.capabilities]},isActive:true}, select:{code:true,riskLevel:true} }),
      this.prisma.platformCapabilityGrant.findMany({ where:{userId:targetUserId,isActive:true}, select:{capability:{select:{code:true}}} }),
    ]);
    const activeCodes = new Set(active.map(g=>g.capability.code));
    const byCode = new Map(catalog.map(c=>[c.code,c]));
    const missing = pkg.capabilities.filter(code=>!activeCodes.has(code));
    return {
      targetUserId,
      workforce:{department:workforce[0].department,jobTitle:workforce[0].jobTitle,employmentStatus:workforce[0].employmentStatus},
      package:{code:pkg.code,label:pkg.label,department:pkg.department},
      runtimeAuthority:"EXPLICIT_PLATFORM_CAPABILITY_GRANTS_ONLY",
      automaticallyApplied:false,
      activePackageCapabilities:pkg.capabilities.filter(code=>activeCodes.has(code)),
      missingDirectGrantEligible:missing.filter(code=>byCode.get(code)?.riskLevel!=="CRITICAL"),
      missingDualControlRequired:missing.filter(code=>byCode.get(code)?.riskLevel==="CRITICAL"),
      catalogMismatch:pkg.capabilities.filter(code=>!byCode.has(code)),
    };
  }
}
