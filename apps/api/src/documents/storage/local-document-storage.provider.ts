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

function assertContainedStoragePath(storagePath: string): string {
  const resolved = path.resolve(storagePath);
  const relative = path.relative(STORAGE_ROOT, resolved);
  if (relative === "" || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("Document storage path is outside the configured storage root");
  }
  return resolved;
}

function safeFacilityStorageSegment(facilityId: string | undefined): string {
  const raw = facilityId?.trim() || "global";
  if (!/^[A-Za-z0-9_-]+$/.test(raw)) {
    throw new Error("Invalid facility storage identifier");
  }
  return raw;
}

@Injectable()
export class LocalDocumentStorageProvider implements DocumentStorageProvider {
  readonly type = "local" as const;
  private readonly logger = new Logger(LocalDocumentStorageProvider.name);

  async save(input: DocumentStorageSaveInput): Promise<DocumentStorageSaveResult> {
    const subDir = safeFacilityStorageSegment(input.facilityId);
    const targetDir = assertContainedStoragePath(path.join(STORAGE_ROOT, subDir));

    fs.mkdirSync(targetDir, { recursive: true });

    const ext = path.extname(input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")) || "";
    const storedName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const storagePath = assertContainedStoragePath(path.join(targetDir, storedName));

    fs.writeFileSync(storagePath, input.buffer);

    const verified = fs.existsSync(storagePath);
    if (!verified) {
      this.logger.warn("local write verification failed");
    }

    return { provider: "local", storagePath, verified };
  }

  async read(storagePath: string): Promise<DocumentStorageReadResult | null> {
    if (!storagePath) return null;
    let safePath: string;
    try {
      safePath = assertContainedStoragePath(storagePath);
    } catch {
      return null;
    }
    if (!fs.existsSync(safePath)) return null;
    try {
      const buffer = fs.readFileSync(safePath);
      return { provider: "local", buffer };
    } catch {
      return null;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    if (!storagePath) return false;
    try {
      return fs.existsSync(assertContainedStoragePath(storagePath));
    } catch {
      return false;
    }
  }

  async delete(storagePath: string): Promise<void> {
    if (!storagePath) return;
    let safePath: string;
    try {
      safePath = assertContainedStoragePath(storagePath);
    } catch {
      this.logger.warn("local delete rejected: path outside configured storage root");
      return;
    }
    if (fs.existsSync(safePath)) {
      try {
        fs.unlinkSync(safePath);
      } catch (err) {
        this.logger.warn(`local delete failed: err=${(err as Error)?.message}`);
      }
    }
  }
}
