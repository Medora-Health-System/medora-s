import { ArgumentsHost, HttpException, HttpStatus } from "@nestjs/common";
import { AllExceptionsFilter } from "./all-exceptions.filter";

function mockHost(path = "/probe") {
  const json = jest.fn();
  const status = jest.fn().mockReturnValue({ json });
  const response = { status };
  const request = { url: path, method: "POST", requestId: "req-1" };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => request,
    }),
  } as unknown as ArgumentsHost;
  return { host, status, json };
}

describe("AllExceptionsFilter", () => {
  const filter = new AllExceptionsFilter();

  it("maps HttpException status codes", () => {
    const { host, status, json } = mockHost();
    filter.catch(new HttpException("nope", HttpStatus.FORBIDDEN), host);
    expect(status).toHaveBeenCalledWith(403);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({ statusCode: 403 })
    );
  });

  it("maps body-parser UnsupportedMediaTypeError to 415 (not 500)", () => {
    const { host, status, json } = mockHost();
    const err = Object.assign(new Error('unsupported charset "ISO-8859-1"'), {
      name: "UnsupportedMediaTypeError",
      status: 415,
      statusCode: 415,
      type: "charset.unsupported",
    });
    filter.catch(err, host);
    expect(status).toHaveBeenCalledWith(415);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 415,
        error: "UnsupportedMediaTypeError",
      })
    );
  });

  it("keeps unknown errors as 500", () => {
    const { host, status } = mockHost();
    filter.catch(new Error("boom"), host);
    expect(status).toHaveBeenCalledWith(500);
  });
});
