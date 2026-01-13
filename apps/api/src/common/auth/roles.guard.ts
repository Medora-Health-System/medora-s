import { CanActivate, ExecutionContext, Injectable, ForbiddenException, BadRequestException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLES_KEY } from "./roles.decorator";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    
    // Check both new @Roles decorator and old "roles" metadata
    const required = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]) || this.reflector.get<string[]>("roles", ctx.getHandler()) ||
      this.reflector.get<string[]>("roles", ctx.getClass());

    if (!required || required.length === 0) return true;

    const facilityId = req.headers["x-facility-id"];
    if (!facilityId) throw new BadRequestException("x-facility-id required");

    const user = req.user; // set by JwtStrategy
    if (!user) {
      throw new ForbiddenException("Authentication required");
    }

    const roles = user?.facilityRoles || [];

    // Convert required roles to strings for comparison
    const requiredStrings = required.map(r => String(r));

    const hasRoleForFacility = roles.some(
      (r: any) => r.facilityId === facilityId && requiredStrings.includes(String(r.role)),
    );

    if (!hasRoleForFacility) {
      throw new ForbiddenException(`Insufficient role for facility. Required: ${requiredStrings.join(", ")}`);
    }
    
    return true;
  }
}

