import { Injectable } from "@nestjs/common";
import { DocumentStorageService } from "../documents/storage";

export type SecureExportPutMetadata = {
  algorithm: string;
  encryptedSha256: string;
};

export interface SecureExportStorage {
  put(
    exportId: string,
    facilityId: string,
    fileName: string,
    payload: Buffer,
    metadata: SecureExportPutMetadata
  ): Promise<{ objectKey: string; sizeBytes: number }>;
  read(objectKey: string, exportId: string): Promise<Buffer | null>;
  delete(objectKey: string, exportId: string): Promise<void>;
}

@Injectable()
export class DocumentSecureExportStorage implements SecureExportStorage {
  constructor(private readonly storage: DocumentStorageService) {}

  async put(
    exportId: string,
    facilityId: string,
    fileName: string,
    payload: Buffer,
    _metadata: SecureExportPutMetadata
  ): Promise<{ objectKey: string; sizeBytes: number }> {
    const saved = await this.storage.save({
      documentId: exportId,
      facilityId,
      fileName,
      mimeType: "application/octet-stream",
      buffer: payload,
    });
    return { objectKey: saved.storagePath, sizeBytes: payload.length };
  }

  async read(objectKey: string, exportId: string): Promise<Buffer | null> {
    const file = await this.storage.read(objectKey, exportId);
    return file?.buffer ?? null;
  }

  async delete(objectKey: string, exportId: string): Promise<void> {
    await this.storage.delete(objectKey, exportId);
  }
}
