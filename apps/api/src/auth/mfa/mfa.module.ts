import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { PrismaModule } from "../../prisma/prisma.module";
import { AuditService } from "../../common/services/audit.service";
import { AuthModule } from "../auth.module";
import { MfaController } from "./mfa.controller";
import { MfaService } from "./mfa.service";
import { MfaChallengeGuard, MfaEnrollmentGuard } from "./mfa-grant.guard";

@Module({
  imports: [PrismaModule, PassportModule, JwtModule.register({}), AuthModule],
  controllers: [MfaController],
  providers: [MfaService, AuditService, MfaChallengeGuard, MfaEnrollmentGuard],
  exports: [MfaService],
})
export class MfaModule {}
