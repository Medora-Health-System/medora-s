/**
 * Validation déterministe des paquets WHO JSON (même schéma que les builders).
 * Lecture seule — aucun appel réseau ; les messages sont des clés techniques pour logs / manifeste.
 */

import {
  WHO_COUNTRY,
  WHO_SCHEMA_VERSION,
  WHO_SOURCE,
  type WhoPriorityAlertsPayload,
  type WhoValidationAnalyticsPayload,
  type WhoWeeklySurveillancePayload,
} from "./msppWhoExportsBuild";

export type WhoPackageProfile = "WEEKLY_SURVEILLANCE" | "PRIORITY_ALERTS" | "VALIDATION_ANALYTICS";

/** Niveau d’affichage ministère (libellés via i18n). */
export type WhoReadinessLevel = "READY" | "READY_WITH_WARNINGS" | "INCOMPLETE";

export type WhoPackageValidationResult = {
  profile: WhoPackageProfile;
  checkedAt: string;
  isValid: boolean;
  errors: string[];
  warnings: string[];
  readiness: WhoReadinessLevel;
};

export type WhoExportManifest = {
  profile: WhoPackageProfile;
  schemaVersion: string;
  generatedAt: string;
  country: string;
  source: string;
  recordCount: number;
  validationSummary: {
    isValid: boolean;
    readiness: WhoReadinessLevel;
    errorCount: number;
    warningCount: number;
  };
};

function nowIso(): string {
  return new Date().toISOString();
}

function isRecord(x: unknown): x is Record<string, unknown> {
  return typeof x === "object" && x !== null && !Array.isArray(x);
}

function nonEmptyString(x: unknown): x is string {
  return typeof x === "string" && x.trim().length > 0;
}

function optionalIsoDate(x: unknown): boolean {
  if (typeof x !== "string" || !x.trim()) return false;
  const t = Date.parse(x);
  return !Number.isNaN(t);
}

function validateCommonEnvelope(
  o: Record<string, unknown>,
  profile: WhoPackageProfile,
  errors: string[],
  warnings: string[]
): void {
  if (o.schemaVersion !== WHO_SCHEMA_VERSION) {
    errors.push(`schemaVersion: attendu "${WHO_SCHEMA_VERSION}", reçu ${String(o.schemaVersion)}`);
  }
  if (o.country !== WHO_COUNTRY) {
    errors.push(`country: attendu "${WHO_COUNTRY}", reçu ${String(o.country)}`);
  }
  if (!optionalIsoDate(o.generatedAt)) {
    errors.push("generatedAt: date ISO absente ou invalide");
  }
  if (o.source !== WHO_SOURCE) {
    warnings.push(`source: attendu "${WHO_SOURCE}", reçu ${String(o.source)}`);
  }
  if (!("window" in o) || o.window == null) {
    errors.push("window: absent");
  }
  if (!("data" in o)) {
    errors.push("data: absent");
  } else if (!Array.isArray(o.data)) {
    errors.push("data: doit être un tableau");
  }
  void profile;
}

function validateSurveillanceWindow(w: unknown, errors: string[], label: string): void {
  if (!isRecord(w)) {
    errors.push(`${label}: objet attendu`);
    return;
  }
  const keys = ["currentStart", "currentEnd", "previousStart", "previousEnd"] as const;
  for (const k of keys) {
    if (!optionalIsoDate(w[k])) {
      errors.push(`${label}.${k}: date ISO invalide ou absente`);
    }
  }
}

function validateValidationWindow(w: unknown, errors: string[], warnings: string[]): void {
  if (!isRecord(w)) {
    errors.push("window: objet attendu");
    return;
  }
  if (w.kind !== "validation_analytics_snapshot") {
    errors.push(`window.kind: attendu "validation_analytics_snapshot", reçu ${String(w.kind)}`);
  }
  if (!optionalIsoDate(w.snapshotAt)) {
    errors.push("window.snapshotAt: date ISO invalide ou absente");
  }
  if (typeof w.analyticsLookbackDays !== "number" || Number.isNaN(w.analyticsLookbackDays)) {
    errors.push("window.analyticsLookbackDays: nombre attendu");
  } else if (w.analyticsLookbackDays < 0) {
    warnings.push("window.analyticsLookbackDays: valeur négative (inhabituelle)");
  }
}

function readinessFrom(errors: string[], warnings: string[]): WhoReadinessLevel {
  if (errors.length > 0) return "INCOMPLETE";
  if (warnings.length > 0) return "READY_WITH_WARNINGS";
  return "READY";
}

function finalize(
  profile: WhoPackageProfile,
  errors: string[],
  warnings: string[]
): WhoPackageValidationResult {
  const readiness = readinessFrom(errors, warnings);
  return {
    profile,
    checkedAt: nowIso(),
    isValid: errors.length === 0,
    errors,
    warnings,
    readiness,
  };
}

/**
 * Valide un paquet surveillance hebdomadaire (types runtime + champs par enregistrement).
 */
export function validateWhoWeeklySurveillancePackage(pkg: unknown): WhoPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(pkg)) {
    return finalize("WEEKLY_SURVEILLANCE", ["Racine: objet JSON attendu"], warnings);
  }
  if (pkg.profile !== "WEEKLY_SURVEILLANCE") {
    errors.push(`profile: attendu WEEKLY_SURVEILLANCE, reçu ${String(pkg.profile)}`);
  }
  validateCommonEnvelope(pkg, "WEEKLY_SURVEILLANCE", errors, warnings);

  if ("window" in pkg && pkg.window != null) {
    validateSurveillanceWindow(pkg.window, errors, "window");
  }

  const data = pkg.data;
  if (Array.isArray(data)) {
    if (data.length === 0) {
      warnings.push("data: tableau vide (aucun signal département ni commune)");
    }
    data.forEach((row, i) => {
      if (!isRecord(row)) {
        errors.push(`data[${i}]: objet attendu`);
        return;
      }
      const rt = row.recordType;
      if (rt !== "department_signal" && rt !== "commune_signal") {
        errors.push(`data[${i}].recordType: department_signal ou commune_signal attendu`);
      }
      if (!nonEmptyString(row.diseaseCode)) {
        errors.push(`data[${i}].diseaseCode: requis (non vide)`);
      }
      if (typeof row.diseaseName !== "string") {
        errors.push(`data[${i}].diseaseName: chaîne attendue`);
      } else if (!row.diseaseName.trim()) {
        warnings.push(`data[${i}]: diseaseName vide`);
      }
      const geo = row.geography;
      if (!isRecord(geo)) {
        errors.push(`data[${i}].geography: objet attendu`);
      } else {
        if (rt === "department_signal") {
          const codeOk = nonEmptyString(geo.departmentCode);
          const nameOk = nonEmptyString(geo.departmentName);
          if (!codeOk && !nameOk) {
            warnings.push(`data[${i}]: departmentCode et departmentName tous deux absents (libellé département manquant)`);
          }
        }
        if (rt === "commune_signal") {
          if (!nonEmptyString(geo.geoCommuneId)) {
            errors.push(`data[${i}].geography.geoCommuneId: requis pour commune_signal`);
          }
          if (!nonEmptyString(geo.communeName)) {
            warnings.push(`data[${i}]: communeName vide`);
          }
        }
      }
      if (!nonEmptyString(row.signalLevel)) {
        errors.push(`data[${i}].signalLevel: requis`);
      }
      const counts = row.counts;
      if (!isRecord(counts)) {
        errors.push(`data[${i}].counts: objet attendu`);
      } else {
        for (const k of ["currentPeriod", "previousPeriod", "delta"] as const) {
          if (typeof counts[k] !== "number" || Number.isNaN(counts[k])) {
            errors.push(`data[${i}].counts.${k}: nombre attendu`);
          }
        }
      }
    });

    if (isRecord(pkg.meta)) {
      if (pkg.meta.communeTruncated === true) {
        warnings.push("meta.communeTruncated: jeu tronqué côté API");
      }
      if (typeof pkg.meta.communeExcludedUnlinkedOrMismatchCount === "number" && pkg.meta.communeExcludedUnlinkedOrMismatchCount > 0) {
        warnings.push(
          `meta.communeExcludedUnlinkedOrMismatchCount: ${pkg.meta.communeExcludedUnlinkedOrMismatchCount} commune(s) exclue(s) (référentiel)`
        );
      }
    }
  }

  return finalize("WEEKLY_SURVEILLANCE", errors, warnings);
}

/** Valide un paquet alertes prioritaires. */
export function validateWhoPriorityAlertsPackage(pkg: unknown): WhoPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(pkg)) {
    return finalize("PRIORITY_ALERTS", ["Racine: objet JSON attendu"], warnings);
  }
  if (pkg.profile !== "PRIORITY_ALERTS") {
    errors.push(`profile: attendu PRIORITY_ALERTS, reçu ${String(pkg.profile)}`);
  }
  validateCommonEnvelope(pkg, "PRIORITY_ALERTS", errors, warnings);

  if ("window" in pkg && pkg.window != null) {
    validateSurveillanceWindow(pkg.window, errors, "window");
  }

  const data = pkg.data;
  if (Array.isArray(data)) {
    if (data.length === 0) {
      warnings.push("data: aucune ligne d’escalade (liste vide)");
    }
    data.forEach((row, i) => {
      if (!isRecord(row)) {
        errors.push(`data[${i}]: objet attendu`);
        return;
      }
      if (!nonEmptyString(row.diseaseCode)) {
        errors.push(`data[${i}].diseaseCode: requis`);
      }
      if (typeof row.diseaseName !== "string") {
        errors.push(`data[${i}].diseaseName: chaîne attendue`);
      } else if (!row.diseaseName.trim()) {
        warnings.push(`data[${i}]: diseaseName vide`);
      }
      if (!nonEmptyString(row.escalationLevel)) {
        errors.push(`data[${i}].escalationLevel: requis`);
      }
      if (row.reportingCategory == null) {
        warnings.push(`data[${i}]: reportingCategory absent (interop partenaire possible)`);
      }
      if (row.surveillancePriority == null) {
        warnings.push(`data[${i}]: surveillancePriority absent (interop partenaire possible)`);
      }
      const geo = row.geography;
      if (!isRecord(geo)) {
        errors.push(`data[${i}].geography: objet attendu`);
      } else {
        if (!nonEmptyString(geo.departmentId)) {
          errors.push(`data[${i}].geography.departmentId: requis`);
        }
      }
      const counts = row.counts;
      if (!isRecord(counts)) {
        errors.push(`data[${i}].counts: objet attendu`);
      } else {
        for (const k of ["currentPeriod", "previousPeriod", "delta"] as const) {
          if (typeof counts[k] !== "number" || Number.isNaN(counts[k])) {
            errors.push(`data[${i}].counts.${k}: nombre attendu`);
          }
        }
      }
    });

    if (isRecord(pkg.meta) && pkg.meta.truncated === true) {
      warnings.push("meta.truncated: liste d’escalade tronquée côté API");
    }
  }

  return finalize("PRIORITY_ALERTS", errors, warnings);
}

/** Valide un paquet analytique validation. */
export function validateWhoValidationAnalyticsPackage(pkg: unknown): WhoPackageValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!isRecord(pkg)) {
    return finalize("VALIDATION_ANALYTICS", ["Racine: objet JSON attendu"], warnings);
  }
  if (pkg.profile !== "VALIDATION_ANALYTICS") {
    errors.push(`profile: attendu VALIDATION_ANALYTICS, reçu ${String(pkg.profile)}`);
  }
  validateCommonEnvelope(pkg, "VALIDATION_ANALYTICS", errors, warnings);

  if ("window" in pkg && pkg.window != null) {
    validateValidationWindow(pkg.window, errors, warnings);
  }

  const data = pkg.data;
  if (Array.isArray(data)) {
    if (data.length !== 1) {
      errors.push(`data: attendu exactement 1 instantané, reçu ${data.length} élément(s)`);
    }
    const snap = data[0];
    if (isRecord(snap)) {
      if (!isRecord(snap.summary)) {
        errors.push("data[0].summary: objet attendu");
      }
      if (!isRecord(snap.timing)) {
        errors.push("data[0].timing: objet attendu");
      }
      if (!Array.isArray(snap.departments)) {
        errors.push("data[0].departments: tableau attendu");
      } else if (snap.departments.length === 0) {
        warnings.push("data[0].departments: aucune ligne département (instantané vide ou filtré)");
      }
      if (!isRecord(snap.flow)) {
        warnings.push("data[0].flow: structure attendue pour complétude partenaire");
      }
    } else if (data.length > 0) {
      errors.push("data[0]: objet instantané attendu");
    }
  }

  return finalize("VALIDATION_ANALYTICS", errors, warnings);
}

export function buildWhoExportManifest(
  pkg:
    | WhoWeeklySurveillancePayload
    | WhoPriorityAlertsPayload
    | WhoValidationAnalyticsPayload,
  validation: WhoPackageValidationResult
): WhoExportManifest {
  const recordCount = Array.isArray(pkg.data)
    ? pkg.profile === "VALIDATION_ANALYTICS"
      ? (pkg.data[0]?.departments?.length ?? 0)
      : pkg.data.length
    : 0;

  return {
    profile: pkg.profile,
    schemaVersion: pkg.schemaVersion,
    generatedAt: pkg.generatedAt,
    country: pkg.country,
    source: pkg.source,
    recordCount,
    validationSummary: {
      isValid: validation.isValid,
      readiness: validation.readiness,
      errorCount: validation.errors.length,
      warningCount: validation.warnings.length,
    },
  };
}
