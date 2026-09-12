import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module.js";
import { EncounterAiSnapshotBuilder } from "./encounter-ai-snapshot.builder.js";

@Module({
  imports: [PrismaModule],
  providers: [EncounterAiSnapshotBuilder],
  exports: [EncounterAiSnapshotBuilder],
})
export class EncounterAiSnapshotModule {}
