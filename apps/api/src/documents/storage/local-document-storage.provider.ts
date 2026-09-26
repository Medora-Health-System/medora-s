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

function isPathInside(root: string, candidate: string): boolean {
  const relative = path.relative(root, candidate);
  return relative !== "" &&
    relative !== ".." &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
}

function assertContainedStoragePath(storagePath: string): string {
  const resolved = path.resolve(storagePath);
  if (!isPathInside(STORAGE_ROOT, resolved)) {
    throw new Error("Document storage path is outside the configured storage root");
  }
  return resolved;
}

function safeFacilityStorageSegment(facilityId: string | null | undefined): string {
  const raw = facilityId?.trim() || "global";
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new Error("Invalid facility storage identifier");
  }
  return raw;
}

function ensureStorageRoot(): string {
  fs.mkdirSync(STORAGE_ROOT, { recursive: true, mode: 0o700 });
  const stat = fs.lstatSync(STORAGE_ROOT);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("Document storage root must be a real directory");
  }
  return fs.realpathSync(STORAGE_ROOT);
}

function assertRealDirectoryInsideRoot(directoryPath: string, realRoot: string): string {
  const lexical = assertContainedStoragePath(directoryPath);
  const stat = fs.lstatSync(lexical);
  if (stat.isSymbolicLink() || !stat.isDirectory()) {
    throw new Error("Document storage directory must be a real directory");
  }
  const realDirectory = fs.realpathSync(lexical);
  if (!isPathInside(realRoot, realDirectory)) {
    throw new Error("Document storage directory resolves outside the configured storage root");
  }
  return realDirectory;
}

function resolveExistingStoredFile(storagePath: string): { lexical: string; real: string } {
  const lexical = assertContainedStoragePath(storagePath);
  const stat = fs.lstatSync(lexical);
  if (stat.isSymbolicLink() || !stat.isFile()) {
    throw new Error("Document storage path must be a real file");
  }
  const realRoot = ensureStorageRoot();
  const real = fs.realpathSync(lexical);
  if (!isPathInside(realRoot, real)) {
    throw new Error("Document storage path resolves outside the configured storage root");
  }
  return { lexical, real };
}

@Injectable()
export class LocalDocumentStorageProvider implements DocumentStorageProvider {
  readonly type = "local" as const;
  private readonly logger = new Logger(LocalDocumentStorageProvider.name);

  async save(input: DocumentStorageSaveInput): Promise<DocumentStorageSaveResult> {
    const realRoot = ensureStorageRoot();
    const subDir = safeFacilityStorageSegment(input.facilityId);
    const targetDir = assertContainedStoragePath(path.join(STORAGE_ROOT, subDir));

    fs.mkdirSync(targetDir, { recursive: true, mode: 0o700 });
    const realTargetDir = assertRealDirectoryInsideRoot(targetDir, realRoot);

    const ext = path.extname(input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")) || "";
    const storedName = `${Date.now()}_${crypto.randomBytes(8).toString("hex")}${ext}`;
    const storagePath = assertContainedStoragePath(path.join(realTargetDir, storedName));

    const noFollow = (fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;
    const flags = fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | noFollow;
    const fd = fs.openSync(storagePath, flags, 0o600);
    try {
      fs.writeFileSync(fd, input.buffer);
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }

    const verified = fs.existsSync(storagePath);
    if (!verified) {
      this.logger.warn("local write verification failed");
    }

    return { provider: "local", storagePath, verified };
  }

  async read(storagePath: string): Promise<DocumentStorageReadResult | null> {
    if (!storagePath) return null;
    try {
      const { real } = resolveExistingStoredFile(storagePath);
      const noFollow = (fs.constants as typeof fs.constants & { O_NOFOLLOW?: number }).O_NOFOLLOW ?? 0;
      const fd = fs.openSync(real, fs.constants.O_RDONLY | noFollow);
      try {
        return { provider: "local", buffer: fs.readFileSync(fd) };
      } finally {
        fs.closeSync(fd);
      }
    } catch {
      return null;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    if (!storagePath) return false;
    try {
      resolveExistingStoredFile(storagePath);
      return true;
    } catch {
      return false;
    }
  }

  async delete(storagePath: string): Promise<void> {
    if (!storagePath) return;
    try {
      const { lexical, real } = resolveExistingStoredFile(storagePath);
      if (lexical !== real) {
        this.logger.warn("local delete rejected: non-canonical storage path");
        return;
      }
      fs.unlinkSync(real);
    } catch (err) {
      this.logger.warn(`local delete rejected or failed: err=${(err as Error)?.message}`);
    }
  }
}
