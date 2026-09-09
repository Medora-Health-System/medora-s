import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { resolvePlatformAuthority } from "../auth/platform-principal";
import { PrismaService } from "../prisma/prisma.service";

/** Controller-layer, current database-backed boundary for the PHI integration security console. */
@Injectable()
export class PlatformIntegrationAdminGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const userId = String(context.switchToHttp().getRequest().user?.userId ?? "").trim();
    if (!userId || !(await resolvePlatformAuthority(this.prisma, userId)).granted) {
      throw new ForbiddenException("Platform integration administration required");
    }
    return true;
  }
}
