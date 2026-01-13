import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { AuthGuard } from "@nestjs/passport";
import { PatientsService } from "./patients.service";
import { EncountersService } from "../encounters/encounters.service";
import {
  patientCreateDtoSchema,
  patientUpdateDtoSchema,
} from "@medora/shared";

@Controller("patients")
@UseGuards(AuthGuard("jwt"))
export class PatientsController {
  constructor(
    private readonly patientsService: PatientsService,
    private readonly encountersService: EncountersService
  ) {}

  @Get("search")
  async search(
    @Query() query: { q?: string; mrn?: string; phone?: string; dob?: string; limit?: string },
    @Req() req: any
  ) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.patientsService.search(
      facilityId,
      {
        q: query.q,
        mrn: query.mrn,
        phone: query.phone,
        dob: query.dob,
        limit: query.limit ? parseInt(query.limit, 10) : undefined,
      },
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Post()
  async create(@Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = patientCreateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.patientsService.create(
      facilityId,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get(":id")
  async findOne(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.patientsService.findOne(
      facilityId,
      id,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Patch(":id")
  async update(@Param("id") id: string, @Body() body: unknown, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    const parsed = patientUpdateDtoSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException("Invalid payload", { cause: parsed.error });
    }

    return this.patientsService.update(
      facilityId,
      id,
      parsed.data,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }

  @Get(":id/encounters")
  async getEncounters(@Param("id") id: string, @Req() req: any) {
    const facilityId = req.user?.facilityId || req.headers["x-facility-id"];
    if (!facilityId) {
      throw new BadRequestException("Facility ID required");
    }

    return this.encountersService.findByPatient(
      id,
      facilityId,
      req.user?.userId,
      req.ip,
      req.headers["user-agent"]
    );
  }
}

