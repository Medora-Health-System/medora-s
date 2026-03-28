import { Body, Controller, Get, Post, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { createFacilityDtoSchema } from "@medora/shared";
import { AdminFacilitiesService } from "./admin-facilities.service";

function facilityIdFromReq(req: { user?: { facilityId?: string }; headers: Record<string, string | string[] | undefined> }): string | undefined {
  const v = req.user?.facilityId ?? req.headers["x-facility-id"];
  if (typeof v === "string" && v.trim()) return v.trim();
  if (Array.isArray(v) && typeof v[0] === "string" && v[0].trim()) return v[0].trim();
  return undefined;
}

@Controller("admin")
export class AdminFacilitiesController {
  constructor(private readonly facilities: AdminFacilitiesService) {}

  /** Création d’établissement : JWT + `User.canCreateFacilities` (service) — pas de rôle ADMIN par établissement courant. */
  @Post("facilities")
  @UseGuards(AuthGuard("jwt"))
  async create(@Body() body: unknown, @Req() req: { user: { userId: string } }) {
    const parsed = createFacilityDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.facilities.create(parsed.data.name, req.user.userId);
  }

  /** Liste globale : plateforme (`canCreateFacilities`) ou ADMIN à l’établissement actif (header). */
  @Get("facilities")
  @UseGuards(AuthGuard("jwt"))
  async list(@Req() req: any) {
    const facilityId = facilityIdFromReq(req);
    await this.facilities.assertCanListFacilities(req.user.userId, facilityId);
    return this.facilities.list();
  }
}
