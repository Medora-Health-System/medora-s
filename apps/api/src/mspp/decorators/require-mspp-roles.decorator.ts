import { SetMetadata } from "@nestjs/common";
import { MsppRoleCode } from "@prisma/client";

export const MSPP_ROLES_KEY = "msppRoles";

export const RequireMsppRoles = (...roles: MsppRoleCode[]) => SetMetadata(MSPP_ROLES_KEY, roles);
