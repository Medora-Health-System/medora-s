import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import {
  createFacilityDtoSchema,
  facilityBillingIdentityPatchDtoSchema,
  facilityBillingWorkflowPatchDtoSchema,
  setFacilityActiveDtoSchema,
  setFacilityLanguageDtoSchema,
} from "@medora/shared";
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

  /** Création d'établissement : JWT + compte principal plateforme fixe (service) — pas de rôle ADMIN par établissement courant. */
  @Post("facilities")
  @UseGuards(AuthGuard("jwt"))
  async create(@Body() body: unknown, @Req() req: { user: { userId: string } }) {
    const parsed = createFacilityDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.facilities.create(parsed.data, req.user.userId);
  }

  /** Langue d’interface par établissement : JWT + compte principal plateforme (service). */
  @Patch("facilities/:id/language")
  @UseGuards(AuthGuard("jwt"))
  async setLanguage(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { user: { userId: string } }
  ) {
    const parsed = setFacilityLanguageDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.facilities.setFacilityLanguage(id, parsed.data.defaultLanguage, req.user.userId);
  }

  /** Activation / désactivation contractuelle : JWT + compte principal plateforme (service). */
  @Patch("facilities/:id")
  @UseGuards(AuthGuard("jwt"))
  async setActive(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { user: { userId: string } }
  ) {
    const parsed = setFacilityActiveDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.facilities.setFacilityActive(id, parsed.data.isActive, req.user.userId);
  }

  /** Liste globale : principal plateforme ou ADMIN à l'établissement actif (header). */
  @Get("facilities")
  @UseGuards(AuthGuard("jwt"))
  async list(@Req() req: any, @Query("includeInactive") includeInactive?: string) {
    const facilityId = facilityIdFromReq(req);
    await this.facilities.assertCanListFacilities(req.user.userId, facilityId);
    const include =
      includeInactive === "true" || includeInactive === "1" || includeInactive === "yes";
    return this.facilities.list(req.user.userId, include);
  }

  /** Profil de facturation (lecture) — principal plateforme ou ADMIN de l'établissement cible. */
  @Get("facilities/:id/billing-identity")
  @UseGuards(AuthGuard("jwt"))
  async getFacilityBillingIdentity(@Param("id") id: string, @Req() req: { user: { userId: string } }) {
    return this.facilities.getFacilityBillingIdentityForAdmin(req.user.userId, id);
  }

  /** Profil de facturation (écriture) — même règle que GET. */
  @Patch("facilities/:id/billing-identity")
  @UseGuards(AuthGuard("jwt"))
  async patchFacilityBillingIdentity(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { user: { userId: string } }
  ) {
    const parsed = facilityBillingIdentityPatchDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.facilities.updateFacilityBillingIdentityForAdmin(req.user.userId, id, parsed.data);
  }

  /** Phase 19UCED.2 — encounter billing workflow config (read). */
  @Get("facilities/:id/billing-workflow")
  @UseGuards(AuthGuard("jwt"))
  async getFacilityBillingWorkflow(@Param("id") id: string, @Req() req: { user: { userId: string } }) {
    return this.facilities.getFacilityBillingWorkflowForAdmin(req.user.userId, id);
  }

  /** Phase 19UCED.2 — encounter billing workflow config (write). */
  @Patch("facilities/:id/billing-workflow")
  @UseGuards(AuthGuard("jwt"))
  async patchFacilityBillingWorkflow(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { user: { userId: string } }
  ) {
    const parsed = facilityBillingWorkflowPatchDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten());
    }
    return this.facilities.updateFacilityBillingWorkflowForAdmin(req.user.userId, id, parsed.data);
  }
}
