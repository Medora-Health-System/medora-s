import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { DocumentSignatureService } from "./document-signature.service";
import { PacketPdfService } from "./packet-pdf.service";
import { PacketSourceService } from "./packet-source.service";
import { RegistrationPacketTemplateEngine } from "./registration-packet-template.engine";
import { LocalDocumentStorageProvider } from "./storage/local-document-storage.provider";
import { BlobDocumentStorageProvider } from "./storage/blob-document-storage.provider";
import { DocumentStorageService } from "./storage/document-storage.service";

@Module({
  imports: [PrismaModule],
  controllers: [DocumentsController],
  providers: [
    LocalDocumentStorageProvider,
    BlobDocumentStorageProvider,
    DocumentStorageService,
    DocumentsService,
    DocumentSignatureService,
    PacketPdfService,
    PacketSourceService,
    RegistrationPacketTemplateEngine,
  ],
  exports: [
    DocumentsService,
    DocumentSignatureService,
    DocumentStorageService,
    PacketSourceService,
    RegistrationPacketTemplateEngine,
  ],
})
export class DocumentsModule {}
