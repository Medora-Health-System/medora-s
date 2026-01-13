import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { EncountersService } from "./encounters.service";
import { encounterCreateDtoSchema, encounterUpdateDtoSchema } from "@medora/shared";

@Controller()
@UseGuards(AuthGuard("jwt"))
export class EncountersController {
  constructor(private readonly encountersService: EncountersService) {}

  @Post("patients/:patientId/encounters")
  async create(@Param("patientId") patientId: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.encountersService.create(
      patientId,
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("patients/:patientId/encounters")
  async findByPatient(@Param("patientId") patientId: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.encountersService.findByPatient(
      patientId,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get("encounters/:id")
  async findOne(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.encountersService.findOne(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch("encounters/:id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = encounterUpdateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.encountersService.update(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post("encounters/:id/close")
  async close(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.encountersService.close(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

