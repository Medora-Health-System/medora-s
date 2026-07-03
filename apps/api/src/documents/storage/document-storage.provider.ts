export type StorageProviderType = "local" | "blob" | "s3" | "r2" | "azure";

export interface DocumentStorageSaveInput {
  documentId: string;
  facilityId: string | null;
  fileName: string;
  mimeType: string;
  buffer: Buffer;
}

export interface DocumentStorageSaveResult {
  provider: StorageProviderType;
  storagePath: string;
  verified: boolean;
}

export interface DocumentStorageReadResult {
  provider: StorageProviderType;
  buffer: Buffer;
}

export interface DocumentStorageProvider {
  readonly type: StorageProviderType;
  save(input: DocumentStorageSaveInput): Promise<DocumentStorageSaveResult>;
  read(storagePath: string, documentId: string): Promise<DocumentStorageReadResult | null>;
  exists(storagePath: string, documentId: string): Promise<boolean>;
  delete(storagePath: string, documentId: string): Promise<void>;
}
