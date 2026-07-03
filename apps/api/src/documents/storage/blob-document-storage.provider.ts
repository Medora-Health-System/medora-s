import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import {
  DocumentStorageProvider,
  DocumentStorageSaveInput,
  DocumentStorageSaveResult,
  DocumentStorageReadResult,
} from "./document-storage.provider";

const DB_BLOB_MAX_SIZE = 10 * 1024 * 1024;

@Injectable()
export class BlobDocumentStorageProvider implements DocumentStorageProvider {
  readonly type = "blob" as const;
  private readonly logger = new Logger(BlobDocumentStorageProvider.name);

  constructor(private readonly prisma: PrismaService) {}

  async save(input: DocumentStorageSaveInput): Promise<DocumentStorageSaveResult> {
    if (input.buffer.length > DB_BLOB_MAX_SIZE) {
      throw new Error(`File exceeds DB blob max size (${DB_BLOB_MAX_SIZE} bytes)`);
    }

    await this.prisma.enterpriseDocumentBlob.upsert({
      where: { documentId: input.documentId },
      create: { documentId: input.documentId, data: Uint8Array.from(input.buffer) },
      update: { data: Uint8Array.from(input.buffer) },
    });

    return { provider: "blob", storagePath: `blob://${input.documentId}`, verified: true };
  }

  async read(_storagePath: string, documentId: string): Promise<DocumentStorageReadResult | null> {
    const blob = await this.prisma.enterpriseDocumentBlob.findUnique({
      where: { documentId },
      select: { data: true },
    });
    if (!blob?.data) return null;
    const buffer = Buffer.from(blob.data.buffer, blob.data.byteOffset, blob.data.byteLength);
    return { provider: "blob", buffer };
  }

  async exists(_storagePath: string, documentId: string): Promise<boolean> {
    const count = await this.prisma.enterpriseDocumentBlob.count({
      where: { documentId },
    });
    return count > 0;
  }

  async delete(_storagePath: string, documentId: string): Promise<void> {
    try {
      await this.prisma.enterpriseDocumentBlob.delete({ where: { documentId } });
    } catch {
      this.logger.warn(`blob delete skipped (not found): docId=${documentId}`);
    }
  }
}
