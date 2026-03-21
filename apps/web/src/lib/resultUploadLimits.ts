/**
 * Limites alignées sur `apps/api/src/results/results.service.ts` (assertPayloadSize).
 * À maintenir en synchronisation avec le backend — ne pas augmenter sans changement serveur.
 */

export const MAX_TOTAL_RESULT_CHARS = 2_500_000;
export const MAX_SINGLE_BASE64_CHARS = 2_400_000;

/** Plus grand fichier binaire (octets) dont le base64 reste ≤ MAX_SINGLE_BASE64_CHARS. */
export const MAX_RAW_BYTES_PER_FILE = Math.floor((MAX_SINGLE_BASE64_CHARS * 3) / 4);

/** Texte d’aide affiché sous le formulaire d’envoi (cohérent avec le serveur). */
export const RESULT_UPLOAD_HINT_FR =
  "Formats : PDF (champ dédié), PNG, JPEG ou WebP. Taille max. environ 1,5 Mo par fichier (limite serveur après encodage). Volume total du texte + des pièces en JSON : max. 2,5 millions de caractères.";

/** Longueur base64 pour une taille binaire donnée (RFC 4648). */
export function base64LengthForBinarySize(bytes: number): number {
  if (bytes <= 0) return 0;
  return 4 * Math.ceil(bytes / 3);
}

function estimateAttachmentJsonChars(file: File): number {
  const name = file.name || "fichier";
  const mime = file.type || "application/octet-stream";
  const b64 = base64LengthForBinarySize(file.size);
  return 80 + name.length * 2 + mime.length + b64;
}

/**
 * Estime la longueur de JSON.stringify(resultData) après fusion côté serveur avec les nouvelles pièces.
 * Borne supérieure prudente pour éviter les envois voués à l’échec.
 */
export function estimateMergedResultDataJsonChars(existingResultData: unknown, newFiles: File[]): number {
  const perNew = newFiles.reduce((s, f) => s + estimateAttachmentJsonChars(f), 0);
  if (existingResultData === null || existingResultData === undefined) {
    return 2 + perNew + 120;
  }
  return JSON.stringify(existingResultData).length + perNew + 120;
}

/** Conforme à assertPayloadSize : t.length + JSON.stringify(resultData).length */
export function estimateTotalPayloadCharsForApi(resultText: string, existingResultData: unknown, newFiles: File[]): number {
  const t = resultText.trim().length;
  const d = estimateMergedResultDataJsonChars(existingResultData, newFiles);
  return t + d;
}

function isPdfAllowed(file: File): boolean {
  const name = file.name.toLowerCase();
  if (file.type === "application/pdf") return true;
  if (!file.type && name.endsWith(".pdf")) return true;
  if (file.type === "application/octet-stream" && name.endsWith(".pdf")) return true;
  return false;
}

function isImageAllowed(file: File): boolean {
  const ok = new Set(["image/png", "image/jpeg", "image/webp", "image/jpg"]);
  if (ok.has(file.type)) return true;
  if (!file.type && /\.(png|jpe?g|webp)$/i.test(file.name)) return true;
  if (file.type === "application/octet-stream" && /\.(png|jpe?g|webp)$/i.test(file.name)) return true;
  return false;
}

export type ResultUploadFileSlot = "pdf" | "image";

export function collectResultUploadFiles(
  pdfFiles: FileList | null,
  imgFiles: FileList | null
): { file: File; slot: ResultUploadFileSlot }[] {
  const out: { file: File; slot: ResultUploadFileSlot }[] = [];
  if (pdfFiles?.length) {
    for (let i = 0; i < pdfFiles.length; i++) {
      out.push({ file: pdfFiles[i], slot: "pdf" });
    }
  }
  if (imgFiles?.length) {
    for (let i = 0; i < imgFiles.length; i++) {
      out.push({ file: imgFiles[i], slot: "image" });
    }
  }
  return out;
}

/**
 * Validation avant lecture base64 / envoi : types, taille par fichier, volume total estimé.
 */
export function validateResultUploadPreflight(params: {
  resultText: string;
  existingResultData: unknown;
  newFiles: { file: File; slot: ResultUploadFileSlot }[];
}): { ok: true } | { ok: false; messageFr: string } {
  const { resultText, existingResultData, newFiles } = params;
  const filesOnly = newFiles.map((x) => x.file);

  for (const { file, slot } of newFiles) {
    const label = file.name?.trim() || "fichier";
    if (slot === "pdf" && !isPdfAllowed(file)) {
      return {
        ok: false,
        messageFr: `Le fichier « ${label} » n’est pas un PDF valide pour ce champ. Formats acceptés : PDF.`,
      };
    }
    if (slot === "image" && !isImageAllowed(file)) {
      return {
        ok: false,
        messageFr: `Le fichier « ${label} » n’est pas une image acceptée pour ce champ. Formats acceptés : PNG, JPEG, WebP.`,
      };
    }
    if (file.size > MAX_RAW_BYTES_PER_FILE) {
      return {
        ok: false,
        messageFr: `Le fichier « ${label} » est trop volumineux (maximum environ 1,5 Mo par fichier après encodage, comme sur le serveur). Réduisez la taille ou compressez le fichier avant l’envoi.`,
      };
    }
  }

  const totalChars = estimateTotalPayloadCharsForApi(resultText, existingResultData, filesOnly);
  if (totalChars > MAX_TOTAL_RESULT_CHARS) {
    return {
      ok: false,
      messageFr:
        "Le volume total (texte du résultat + pièces jointes encodées en JSON) dépasse la limite serveur (2,5 millions de caractères). Réduisez le texte, le nombre de fichiers ou leur taille, ou retirez d’anciennes pièces volumineuses déjà présentes.",
    };
  }

  return { ok: true };
}
