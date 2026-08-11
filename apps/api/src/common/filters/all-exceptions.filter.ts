import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { DIRECT_ADMISSION_ERROR_MESSAGES_FR } from "@medora/shared";
import { createStructuredLogger } from "../logging/structured-logger";
import {
  prismaAlertGroupKey,
  sanitizePrismaException,
} from "../logging/prisma-error-sanitizer";
import { isPrismaMissingHospitalEpisodeIdColumn } from "../../encounters/direct-admission-api-errors.util";

const log = createStructuredLogger("AllExceptionsFilter");

/** Express / http-errors / body-parser client errors expose status|statusCode. */
function readClientErrorStatus(exception: unknown): number | undefined {
  if (!exception || typeof exception !== "object") return undefined;
  const e = exception as { status?: unknown; statusCode?: unknown };
  const raw =
    typeof e.status === "number"
      ? e.status
      : typeof e.statusCode === "number"
        ? e.statusCode
        : undefined;
  if (raw === undefined || !Number.isFinite(raw)) return undefined;
  const status = Math.trunc(raw);
  if (status >= 400 && status < 500) return status;
  return undefined;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isDev = process.env.NODE_ENV !== "production";
    const isHttpException = exception instanceof HttpException;
    const clientStatus = !isHttpException ? readClientErrorStatus(exception) : undefined;

    if (isHttpException) {
      const statusCode = exception.getStatus();
      if (statusCode >= 400 && statusCode < 500) {
        const exceptionResponse = exception.getResponse();
        const canonicalCode =
          exceptionResponse && typeof exceptionResponse === "object"
            ? String(
                (exceptionResponse as { code?: unknown; errorCode?: unknown }).code ??
                  (exceptionResponse as { errorCode?: unknown }).errorCode ??
                  "HTTP_CLIENT_ERROR"
              )
            : "HTTP_CLIENT_ERROR";
        const route =
          typeof request.url === "string" ? request.url.split("?")[0] : undefined;
        log.warn("http_exception_client", {
          statusCode,
          name: exception.name,
          requestId: request.requestId,
          method: request.method,
          route,
          operation: `${request.method ?? "UNKNOWN"} ${route ?? "UNKNOWN"}`,
          canonicalCode,
        });
      } else if (exception instanceof Error) {
        log.error("http_exception_server", {
          statusCode,
          name: exception.name,
          requestId: request.requestId,
          method: request.method,
        });
      } else {
        log.error("http_exception_unknown_shape", {
          statusCode,
          requestId: request.requestId,
          method: request.method,
        });
      }
    } else if (clientStatus !== undefined) {
      log.warn("http_client_error", {
        statusCode: clientStatus,
        name: exception instanceof Error ? exception.name : typeof exception,
        requestId: request.requestId,
        method: request.method,
      });
    } else if (exception instanceof Error) {
      const prismaSanitized = sanitizePrismaException(exception);
      const routePath =
        typeof request.url === "string" ? request.url.split("?")[0] : undefined;
      log.error("non_http_exception", {
        name: exception.name,
        requestId: request.requestId,
        method: request.method,
        route: routePath,
        deploymentSha:
          process.env.RAILWAY_GIT_COMMIT_SHA?.trim() ??
          process.env.GIT_COMMIT_SHA?.trim() ??
          null,
        hospitalEpisodeFoundationEnabled:
          (process.env.HOSPITAL_EPISODE_FOUNDATION_ENABLED ?? "")
            .trim()
            .toLowerCase() === "true",
        ...(prismaSanitized
          ? {
              prismaCode: prismaSanitized.prismaCode,
              prismaModel: prismaSanitized.modelName,
              prismaClientVersion: prismaSanitized.clientVersion,
              prismaMissingObject: prismaSanitized.missingDatabaseObject,
              prismaMessageSummary: prismaSanitized.messageSummary,
              prismaMeta: prismaSanitized.meta,
              alertGroupKey: prismaAlertGroupKey(prismaSanitized, routePath),
            }
          : {}),
      });
    } else {
      log.error("non_http_exception_unknown_shape", {
        requestId: request.requestId,
        valueType: typeof exception,
        method: request.method,
      });
    }

    let status: number;
    let message: string | object;

    if (isHttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      message =
        typeof exceptionResponse === "string"
          ? exceptionResponse
          : exceptionResponse;
    } else if (clientStatus !== undefined) {
      status = clientStatus;
      message =
        exception instanceof Error
          ? { error: exception.name, message: exception.message }
          : "Bad Request";
    } else if (
      isPrismaMissingHospitalEpisodeIdColumn(exception) &&
      typeof request.url === "string" &&
      request.url.includes("/inpatient-operations/direct-admission")
    ) {
      // Belt-and-suspenders: map escaped P2022 to coded 503 (service also maps).
      status = HttpStatus.SERVICE_UNAVAILABLE;
      const code = "DIRECT_ADMISSION_SCHEMA_INCOMPATIBLE" as const;
      message = {
        statusCode: status,
        message: DIRECT_ADMISSION_ERROR_MESSAGES_FR[code],
        code,
        errorCode: code,
      };
    } else if (
      isPrismaMissingHospitalEpisodeIdColumn(exception) &&
      typeof request.url === "string" &&
      (request.url.includes("/workspace-bootstrap") ||
        request.url.includes("/hospital-care/census") ||
        request.url.includes("/hospital-care/dashboard") ||
        request.url.includes("/hospital-care/units"))
    ) {
      // D4A.2.8-HF1 belt-and-suspenders — preferred path never selects the column.
      status = HttpStatus.SERVICE_UNAVAILABLE;
      const code = "SCHEMA_COMPATIBILITY" as const;
      message = {
        statusCode: status,
        message:
          "Compatibilité du schéma hospitalier indisponible. Contactez un administrateur.",
        code,
        errorCode: code,
      };
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      if (isDev) {
        message = {
          error: exception instanceof Error ? exception.name : "Unknown Error",
          message:
            exception instanceof Error ? exception.message : String(exception),
          stack: exception instanceof Error ? exception.stack : undefined,
        };
      } else {
        message = "Internal server error";
      }
    }

    const requestId =
      typeof request?.requestId === "string" && request.requestId.trim()
        ? request.requestId.trim()
        : undefined;

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(requestId ? { requestId } : {}),
      ...(typeof message === "object" ? message : { message }),
    });
  }
}
