import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { DocumentsController } from "./documents.controller";
import { DocumentsService } from "./documents.service";
import { DocumentSignatureService } from "./document-signature.service";
import { PacketPdfService } from "./packet-pdf.service";
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
  ],
  exports: [DocumentsService, DocumentSignatureService, DocumentStorageService],
})
export class DocumentsModule {}
