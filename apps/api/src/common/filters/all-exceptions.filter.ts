import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { createStructuredLogger } from "../logging/structured-logger";

const log = createStructuredLogger("AllExceptionsFilter");

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const isDev = process.env.NODE_ENV !== "production";
    const isHttpException = exception instanceof HttpException;

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

