import { Injectable, Logger } from "@nestjs/common";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import {
  DocumentStorageProvider,
  DocumentStorageSaveInput,
  DocumentStorageSaveResult,
  DocumentStorageReadResult,
} from "./document-storage.provider";

const STORAGE_DIR =
  process.env.MEDORA_DOCUMENT_STORAGE_DIR || "/tmp/medora-documents";
const STORAGE_ROOT = path.resolve(STORAGE_DIR);
const LOCAL_KEY_PREFIX = "local://";
const DOCUMENT_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/;

function safeDocumentId(documentId: string): string {
  const value = documentId?.trim();
  if (!DOCUMENT_ID_PATTERN.test(value)) {
    throw new Error("Invalid document storage identifier");
  }
  return value;
}

function storageKey(documentId: string): string {
  return `${LOCAL_KEY_PREFIX}${safeDocumentId(documentId)}`;
}

function documentIdFromStorageKey(key: string, expectedDocumentId: string): string {
  const expected = safeDocumentId(expectedDocumentId);
  if (key !== storageKey(expected)) {
    throw new Error("Document storage key does not match the requested document");
  }
  return expected;
}

function ensureCanonicalStorageRoot(): string {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true, mode: 0o700 });
  const rootStat = fs.lstatSync(STORAGE_ROOT);
  if (rootStat.isSymbolicLink() || !rootStat.isDirectory()) {
    throw new Error("Document storage root must be a real directory");
  }
  return fs.realpathSync(STORAGE_ROOT);
}

function documentPath(realRoot: string, documentId: string): string {
  return path.join(realRoot, safeDocumentId(documentId));
}

function openExistingDocument(realRoot: string, documentId: string): number {
  const candidate = documentPath(realRoot, documentId);
  const noFollow = (fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;
  const fd = fs.openSync(candidate, fs.constants.O_RDONLY | noFollow);
  const stat = fs.fstatSync(fd);
  if (!stat.isFile()) {
    fs.closeSync(fd);
    throw new Error("Document storage object is not a regular file");
  }
  return fd;
}

@Injectable()
export class LocalDocumentStorageProvider implements DocumentStorageProvider {
  readonly type = "local" as const;
  private readonly logger = new Logger(LocalDocumentStorageProvider.name);

  async save(input: DocumentStorageSaveInput): Promise<DocumentStorageSaveResult> {
    const realRoot = ensureCanonicalStorageRoot();
    const documentId = safeDocumentId(input.documentId);
    const target = documentPath(realRoot, documentId);
    const noFollow = (fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;
    const flags = fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | noFollow;

    const fd = fs.openSync(target, flags, 0o600);
    try {
      fs.writeFileSync(fd, input.buffer);
      fs.fsyncSync(fd);
      const stat = fs.fstatSync(fd);
      if (!stat.isFile() || stat.size !== input.buffer.length) {
        throw new Error("Local document write verification failed");
      }
    } finally {
      fs.closeSync(fd);
    }

    return {
      provider: "local",
      storagePath: storageKey(documentId),
      verified: true,
    };
  }

  async read(storagePath: string, documentId: string): Promise<DocumentStorageReadResult | null> {
    try {
      const id = documentIdFromStorageKey(storagePath, documentId);
      const realRoot = ensureCanonicalStorageRoot();
      const fd = openExistingDocument(realRoot, id);
      try {
        return { provider: "local", buffer: fs.readFileSync(fd) };
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return null;
    }
  }

  async exists(storagePath: string, documentId: string): Promise<boolean> {
    try {
      const id = documentIdFromStorageKey(storagePath, documentId);
      const realRoot = ensureCanonicalStorageRoot();
      const fd = openExistingDocument(realRoot, id);
      fs.closeSync(fd);
      return true;
    } catch {
      return false;
    }
  }

  async delete(storagePath: string, documentId: string): Promise<void> {
    try {
      const id = documentIdFromStorageKey(storagePath, documentId);
      const realRoot = ensureCanonicalStorageRoot();
      const candidate = documentPath(realRoot, id);

      const noFollow = (fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;
      const fd = fs.openSync(candidate, fs.constants.O_RDONLY | noFollow);
      try {
        const stat = fs.fstatSync(fd);
        if (!stat.isFile()) throw new Error("Document storage object is not a regular file");
        const current = fs.lstatSync(candidate);
        const opened = fs.fstatSync(fd);
        if (current.isSymbolicLink() || current.dev !== opened.dev || current.ino !== opened.ino) {
          throw new Error("Document storage object changed during delete validation");
        }
        fs.unlinkSync(candidate);
      } finally {
        fs.closeSync(fd);
      }
    } catch (err) {
      this.logger.warn(`local delete rejected or failed: err=${(err as Error)?.message}`);
    }
  }
}
