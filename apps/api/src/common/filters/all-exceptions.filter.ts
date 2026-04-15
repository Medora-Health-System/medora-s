import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";

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
        console.warn("HTTP exception:", {
          statusCode,
          name: exception.name,
          message: exception.message,
          requestId: request.requestId,
          url: request.url,
          method: request.method,
        });
      } else if (exception instanceof Error) {
        console.error("Exception caught:", {
          name: exception.name,
          message: exception.message,
          stack: exception.stack,
          requestId: request.requestId,
          url: request.url,
          method: request.method,
        });
      } else {
        console.error("Unknown exception:", { exception, requestId: request.requestId });
      }
    } else if (exception instanceof Error) {
      console.error("Exception caught:", {
        name: exception.name,
        message: exception.message,
        stack: exception.stack,
        requestId: request.requestId,
        url: request.url,
        method: request.method,
      });
    } else {
      console.error("Unknown exception:", { exception, requestId: request.requestId });
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

