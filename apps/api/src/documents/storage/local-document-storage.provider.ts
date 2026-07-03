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

@Injectable()
export class LocalDocumentStorageProvider implements DocumentStorageProvider {
  readonly type = "local" as const;
  private readonly logger = new Logger(LocalDocumentStorageProvider.name);

  async save(input: DocumentStorageSaveInput): Promise<DocumentStorageSaveResult> {
    const subDir = input.facilityId || "global";
    const targetDir = path.join(STORAGE_DIR, subDir);

    fs.mkdirSync(targetDir, { recursive: true });

    const ext = path.extname(input.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")) || "";
    const storedName = `${Date.now()}_${crypto.randomBytes(4).toString("hex")}${ext}`;
    const storagePath = path.join(targetDir, storedName);

    fs.writeFileSync(storagePath, input.buffer);

    const verified = fs.existsSync(storagePath);
    if (!verified) {
      this.logger.warn(`local write verification failed: ${storagePath}`);
    }

    return { provider: "local", storagePath, verified };
  }

  async read(_storagePath: string): Promise<DocumentStorageReadResult | null> {
    if (!_storagePath || !fs.existsSync(_storagePath)) return null;
    try {
      const buffer = fs.readFileSync(_storagePath);
      return { provider: "local", buffer };
    } catch {
      return null;
    }
  }

  async exists(storagePath: string): Promise<boolean> {
    return !!storagePath && fs.existsSync(storagePath);
  }

  async delete(storagePath: string): Promise<void> {
    if (storagePath && fs.existsSync(storagePath)) {
      try {
        fs.unlinkSync(storagePath);
      } catch (err) {
        this.logger.warn(`local delete failed: ${storagePath} err=${(err as Error)?.message}`);
      }
    }
  }
}
