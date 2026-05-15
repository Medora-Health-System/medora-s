import { Module } from "@nestjs/common";
import { PlatformAnnouncementsController } from "./platform-announcements.controller";
import { PlatformAnnouncementsService } from "./platform-announcements.service";
import { PrismaModule } from "../prisma/prisma.module";
import { AuditService } from "../common/services/audit.service";

@Module({
  imports: [PrismaModule],
  controllers: [PlatformAnnouncementsController],
  providers: [PlatformAnnouncementsService, AuditService],
})
export class PlatformAnnouncementsModule {}
