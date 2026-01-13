import { createParamDecorator, ExecutionContext } from "@nestjs/common";

export const FacilityId = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return request.facilityId || request.user?.facilityId || request.headers["x-facility-id"];
  }
);

export const UserRoles = createParamDecorator(
  (data: unknown, ctx: ExecutionContext): string[] => {
    const request = ctx.switchToHttp().getRequest();
    return request.userRoles || [];
  }
);

