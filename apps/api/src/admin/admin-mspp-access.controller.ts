import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { AdminMsppAccessService } from "./admin-mspp-access.service";
import {
  createMsppAccessDtoSchema,
  msppOnboardDtoSchema,
  patchMsppAccessDtoSchema,
} from "./dto/admin-mspp-access.dto";

@Controller("admin")
export class AdminMsppAccessController {
  constructor(private readonly msppAccess: AdminMsppAccessService) {}

  @Get("mspp-access/geo-departments")
  @UseGuards(AuthGuard("jwt"))
  async listGeo(@Req() req: { user: { userId: string } }) {
    return this.msppAccess.listGeoDepartments(req.user.userId);
  }

  @Get("mspp-access/assignments")
  @UseGuards(AuthGuard("jwt"))
  async listAssignments(@Req() req: { user: { userId: string } }) {
    return this.msppAccess.listAssignments(req.user.userId);
  }

  @Post("mspp-access/onboard")
  @UseGuards(AuthGuard("jwt"))
  async onboard(@Body() body: unknown, @Req() req: { user: { userId: string } }) {
    const parsed = msppOnboardDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.msppAccess.onboard(req.user.userId, parsed.data);
  }

  @Post("mspp-access/assignments")
  @UseGuards(AuthGuard("jwt"))
  async create(@Body() body: unknown, @Req() req: { user: { userId: string } }) {
    const parsed = createMsppAccessDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.msppAccess.createAssignment(req.user.userId, parsed.data);
  }

  @Patch("mspp-access/assignments/:id")
  @UseGuards(AuthGuard("jwt"))
  async patch(
    @Param("id") id: string,
    @Body() body: unknown,
    @Req() req: { user: { userId: string } }
  ) {
    const parsed = patchMsppAccessDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.issues[0]?.message ?? "Requête invalide.", {
        cause: parsed.error,
      });
    }
    return this.msppAccess.patchAssignment(req.user.userId, id, parsed.data);
  }
}
