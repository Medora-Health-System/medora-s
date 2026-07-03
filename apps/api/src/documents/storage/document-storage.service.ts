import { Injectable, Logger } from "@nestjs/common";
import {
  DocumentStorageProvider,
  DocumentStorageSaveInput,
  DocumentStorageSaveResult,
  DocumentStorageReadResult,
  StorageProviderType,
} from "./document-storage.provider";
import { LocalDocumentStorageProvider } from "./local-document-storage.provider";
import { BlobDocumentStorageProvider } from "./blob-document-storage.provider";

export interface StorageAvailability {
  primary: StorageProviderType;
  backup: StorageProviderType | null;
  available: boolean;
  sources: StorageProviderType[];
}

const CONFIGURED_PROVIDER: StorageProviderType =
  (process.env.MEDORA_DOCUMENT_STORAGE_PROVIDER as StorageProviderType) || "local";

@Injectable()
export class DocumentStorageService {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly primary: DocumentStorageProvider;
  private readonly backup: DocumentStorageProvider | null;

  constructor(
    private readonly localProvider: LocalDocumentStorageProvider,
    private readonly blobProvider: BlobDocumentStorageProvider,
  ) {
    switch (CONFIGURED_PROVIDER) {
      case "s3":
      case "r2":
      case "azure":
        this.logger.warn(
          `Storage provider "${CONFIGURED_PROVIDER}" not yet implemented — falling back to local+blob`,
        );
        this.primary = this.localProvider;
        this.backup = this.blobProvider;
        break;
      case "blob":
        this.primary = this.blobProvider;
        this.backup = null;
        break;
      case "local":
      default:
        this.primary = this.localProvider;
        this.backup = this.blobProvider;
        break;
    }

    this.logger.log(
      `Storage initialized: primary=${this.primary.type} backup=${this.backup?.type ?? "none"}`,
    );
  }

  get primaryType(): StorageProviderType {
    return this.primary.type;
  }

  get backupType(): StorageProviderType | null {
    return this.backup?.type ?? null;
  }

  async save(input: DocumentStorageSaveInput): Promise<DocumentStorageSaveResult> {
    let primaryResult: DocumentStorageSaveResult;

    try {
      primaryResult = await this.primary.save(input);
    } catch (err) {
      this.logger.error(
        `Primary storage (${this.primary.type}) save failed: docId=${input.documentId} err=${(err as Error)?.message}`,
      );
      if (this.backup) {
        this.logger.warn(`Falling back to backup storage (${this.backup.type}) for save`);
        primaryResult = await this.backup.save(input);
      } else {
        throw err;
      }
    }

    if (this.backup && this.primary !== this.backup) {
      try {
        await this.backup.save(input);
      } catch (backupErr) {
        this.logger.warn(
          `Backup storage (${this.backup.type}) save failed (non-fatal): docId=${input.documentId} err=${(backupErr as Error)?.message}`,
        );
      }
    }

    return primaryResult;
  }

  async read(storagePath: string, documentId: string): Promise<DocumentStorageReadResult | null> {
    const primaryResult = await this.primary.read(storagePath, documentId);
    if (primaryResult) return primaryResult;

    if (this.backup) {
      const backupResult = await this.backup.read(storagePath, documentId);
      if (backupResult) {
        this.logger.log(`Document served from backup (${this.backup.type}): docId=${documentId}`);
        return backupResult;
      }
    }

    return null;
  }

  async getAvailability(storagePath: string, documentId: string): Promise<StorageAvailability> {
    const sources: StorageProviderType[] = [];

    const primaryExists = await this.primary.exists(storagePath, documentId);
    if (primaryExists) sources.push(this.primary.type);

    if (this.backup) {
      const backupExists = await this.backup.exists(storagePath, documentId);
      if (backupExists) sources.push(this.backup.type);
    }

    return {
      primary: this.primary.type,
      backup: this.backup?.type ?? null,
      available: sources.length > 0,
      sources,
    };
  }

  async delete(storagePath: string, documentId: string): Promise<void> {
    await this.primary.delete(storagePath, documentId);
    if (this.backup) {
      await this.backup.delete(storagePath, documentId);
    }
  }
}
