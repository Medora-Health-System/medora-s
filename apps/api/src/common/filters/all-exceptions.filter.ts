import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { createStructuredLogger } from "../logging/structured-logger";

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
        log.warn("http_exception_client", {
          statusCode,
          name: exception.name,
          requestId: request.requestId,
          method: request.method,
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
      log.error("non_http_exception", {
        name: exception.name,
        requestId: request.requestId,
        method: request.method,
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

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(typeof message === "object" ? message : { message }),
    });
  }
}

