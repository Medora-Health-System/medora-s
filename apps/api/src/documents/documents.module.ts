import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { DocumentSignatureService } from "./document-signature.service";

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [DocumentsService, DocumentSignatureService],
  exports: [DocumentsService, DocumentSignatureService],
})
export class DocumentsModule {}
