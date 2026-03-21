import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { PharmacyDispenseController } from "./pharmacy-dispense.controller";
import { PharmacyDispenseService } from "./pharmacy-dispense.service";

@Module({
  imports: [PrismaModule],
  controllers: [PharmacyDispenseController],
  providers: [PharmacyDispenseService],
})
export class PharmacyDispenseModule {}
