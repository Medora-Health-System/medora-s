import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { InsurancePayersController } from "./insurance-payers.controller";
import { InsurancePayersService } from "./insurance-payers.service";

@Module({
  imports: [PrismaModule],
  controllers: [InsurancePayersController],
  providers: [InsurancePayersService],
  exports: [InsurancePayersService],
})
export class InsuranceModule {}
