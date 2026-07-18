import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import type { Request } from "express";
import { RolesGuard, RequireRoles } from "../../common/guards/roles.guard";
import {
  RXNORM_PILOT_ADMIN_ROLES,
  RXNORM_REVIEW_READ_ROLES,
  RXNORM_REVIEW_WRITE_ROLES,
} from "../rxnorm-review/rxnorm-review.roles";
import { MedicationSafetyKnowledgeHttpService } from "./medication-safety-knowledge.http-service";

type AuthReq = Request & {
  user?: { userId?: string; facilityId?: string };
  userRole?: string;
};

function actorFromReq(req: AuthReq) {
  const userId = req.user?.userId;
  if (!userId) throw new UnauthorizedException();
  return {
    userId,
    roles: req.userRole ? [String(req.userRole)] : ["MEDICATION_REVIEWER"],
  };
}

@Controller("medications/safety-knowledge")
@UseGuards(AuthGuard("jwt"), RolesGuard)
export class MedicationSafetyKnowledgeController {
  constructor(private readonly safety: MedicationSafetyKnowledgeHttpService) {}

  @Get("dashboard")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  dashboard() {
    return this.safety.dashboard();
  }

  @Get("sources")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listSources() {
    return this.safety.listSources();
  }

  @Post("sources")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  upsertSource(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.upsertSource(body, actorFromReq(req));
  }

  @Get("versions")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listVersions(@Query("sourceId") sourceId?: string) {
    return this.safety.listVersions(sourceId);
  }

  @Post("versions")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createVersion(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.createVersion(body, actorFromReq(req));
  }

  @Get("interactions")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listInteractions(
    @Query("status") status?: string,
    @Query("limit") limit?: string,
    @Query("offset") offset?: string
  ) {
    return this.safety.listInteractions({
      status,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get("interactions/:id")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  getInteraction(@Param("id") id: string) {
    return this.safety.getInteraction(id);
  }

  @Post("interactions")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createInteraction(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.createInteraction(body, actorFromReq(req));
  }

  @Patch("interactions/:id")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  patchInteraction(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.safety.patchInteraction(id, body, actorFromReq(req));
  }

  @Post("interactions/:id/transition")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  transitionInteraction(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.safety.transitionInteraction(id, body, actorFromReq(req));
  }

  @Post("interactions/:id/fork")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  forkInteraction(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    return this.safety.forkInteraction(id, body, actorFromReq(req));
  }

  @Post("interactions/:id/approve")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  approveInteraction(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: AuthReq
  ) {
    const rationale =
      body && typeof body === "object" && "rationale" in body
        ? String((body as { rationale?: string }).rationale ?? "")
        : "";
    return this.safety.transitionInteraction(
      id,
      { toStatus: "APPROVED", rationale },
      actorFromReq(req)
    );
  }

  @Get("classes")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listClasses() {
    return this.safety.listClasses();
  }

  @Post("classes")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  upsertClass(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.upsertClass(body, actorFromReq(req));
  }

  @Get("class-memberships")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listClassMemberships(
    @Query("therapeuticClassId") therapeuticClassId?: string,
    @Query("status") status?: string
  ) {
    return this.safety.listClassMemberships(therapeuticClassId, status);
  }

  @Post("class-memberships")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createClassMembership(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.createClassMembership(body, actorFromReq(req));
  }

  @Get("allergens")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listAllergens() {
    return this.safety.listAllergens();
  }

  @Post("allergens")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  upsertAllergen(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.upsertAllergen(body, actorFromReq(req));
  }

  @Get("allergen-mappings")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listAllergenMappings() {
    return this.safety.listAllergenMappings();
  }

  @Post("allergen-mappings")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createAllergenMapping(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.createAllergenMapping(body, actorFromReq(req));
  }

  @Get("cross-reactivity")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listCrossReactivity() {
    return this.safety.listCrossReactivity();
  }

  @Post("cross-reactivity")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createCrossReactivity(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.createCrossReactivity(body, actorFromReq(req));
  }

  @Get("duplicate-therapy/groups")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listDupGroups() {
    return this.safety.listDupGroups();
  }

  @Post("duplicate-therapy/groups")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  upsertDupGroup(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.upsertDupGroup(body, actorFromReq(req));
  }

  @Get("duplicate-therapy/rules")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listDupRules() {
    return this.safety.listDupRules();
  }

  @Post("duplicate-therapy/rules")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createDupRule(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.createDupRule(body, actorFromReq(req));
  }

  @Get("duplicate-therapy/memberships")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  listDupMemberships() {
    return this.safety.listDupMemberships();
  }

  @Post("duplicate-therapy/memberships")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  createDupMembership(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.createDupMembership(body, actorFromReq(req));
  }

  @Post("duplicate-check")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  duplicateCheck(@Body() body: unknown) {
    return this.safety.duplicateCheck(body);
  }

  @Get("duplicate-queue")
  @RequireRoles(...RXNORM_REVIEW_READ_ROLES)
  duplicateQueue() {
    return this.safety.duplicateQueue();
  }

  @Post("import/preview")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  importPreview(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.importPreview(body, actorFromReq(req));
  }

  @Post("import/dry-run")
  @RequireRoles(...RXNORM_REVIEW_WRITE_ROLES)
  importDryRun(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.importDryRun(body, actorFromReq(req));
  }

  @Post("import/rollback")
  @RequireRoles(...RXNORM_PILOT_ADMIN_ROLES)
  importRollback(@Body() body: unknown, @Req() req: AuthReq) {
    return this.safety.importRollback(body, actorFromReq(req));
  }
}
