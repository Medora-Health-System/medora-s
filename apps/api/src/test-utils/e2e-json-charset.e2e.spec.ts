/**
 * Proves production-like body-parser accepts standards-compliant JSON charsets
 * and still rejects unsupported charsets (415) before guards.
 */
import { Controller, INestApplication, Module, Post } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import * as request from "supertest";
import { closeE2eApp, createE2eApp } from "./e2e-app";

@Controller("e2e-charset-probe")
class CharsetProbeController {
  @Post()
  post(): { ok: true } {
    return { ok: true };
  }
}

@Module({ controllers: [CharsetProbeController] })
class CharsetProbeModule {}

describe("E2E JSON charset compatibility", () => {
  let app: INestApplication;

  beforeAll(async () => {
    process.env.MEDORA_ALERT_ENABLED = "false";
    process.env.MEDORA_BACKGROUND_WORKERS_ENABLED = "false";
    const moduleRef = await Test.createTestingModule({
      imports: [CharsetProbeModule],
    }).compile();
    app = await createE2eApp(moduleRef);
  });

  afterAll(async () => {
    await closeE2eApp({ app });
  });

  it("accepts application/json without charset", async () => {
    await request(app.getHttpServer())
      .post("/e2e-charset-probe")
      .set("Content-Type", "application/json")
      .send({ a: 1 })
      .expect(201);
  });

  it("accepts application/json; charset=utf-8", async () => {
    await request(app.getHttpServer())
      .post("/e2e-charset-probe")
      .set("Content-Type", "application/json; charset=utf-8")
      .send({ a: 1 })
      .expect(201);
  });

  it("accepts application/json; charset=UTF-8 (case-insensitive token)", async () => {
    await request(app.getHttpServer())
      .post("/e2e-charset-probe")
      .set("Content-Type", "application/json; charset=UTF-8")
      .send({ a: 1 })
      .expect(201);
  });

  it("rejects unsupported charset with 415", async () => {
    await request(app.getHttpServer())
      .post("/e2e-charset-probe")
      .set("Content-Type", "application/json; charset=ISO-8859-1")
      .send('{"a":1}')
      .expect(415);
  });
});
