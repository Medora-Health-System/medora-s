import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { createSign, randomUUID } from "crypto";
import { PrismaService } from "../../prisma/prisma.service";
import type { PatientPortalAccessContext } from "../auth/patient-portal.types";

type Kind = "MESSAGE" | "RESULT_RELEASED";
type Platform = "IOS" | "ANDROID" | "WEB";

@Injectable()
export class PatientNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  private async activeAccount(patientId: string, facilityId: string) {
    const rows = await this.prisma.$queryRaw<Array<{ portalAccountId: string }>>(Prisma.sql`
      SELECT l."portalAccountId" FROM "PatientPortalLink" l
      INNER JOIN "PatientPortalAccount" a ON a."id"=l."portalAccountId"
      WHERE l."patientId"=${patientId} AND l."facilityId"=${facilityId}
        AND l."status"='VERIFIED'::"PatientPortalLinkStatus" AND l."revokedAt" IS NULL
        AND a."status"='ACTIVE'::"PatientPortalAccountStatus" LIMIT 1
    `);
    return rows[0]?.portalAccountId ?? null;
  }

  async notify(patientId: string, facilityId: string, kind: Kind, entityId: string, title: string, body: string, route: string) {
    const portalAccountId = await this.activeAccount(patientId, facilityId);
    if (!portalAccountId) return;
    const id = randomUUID();
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PatientPortalNotification" ("id","portalAccountId","facilityId","patientId","kind","entityId","title","body","route")
      VALUES (${id},${portalAccountId},${facilityId},${patientId},${kind},${entityId},${title},${body},${route})
      ON CONFLICT ("portalAccountId","kind","entityId") DO NOTHING
    `);
    const devices = await this.prisma.$queryRaw<Array<{ token: string }>>(Prisma.sql`
      SELECT "token" FROM "PatientPortalPushDevice"
      WHERE "portalAccountId"=${portalAccountId} AND "patientId"=${patientId}
        AND "facilityId"=${facilityId} AND "enabled"=TRUE
    `);
    await Promise.allSettled(devices.map((d) => this.sendFcm(d.token, title, body, { kind, entityId, route, facilityId })));
  }

  async list(access: PatientPortalAccessContext) {
    const rows = await this.prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT "id","kind","entityId","title","body","route","readAt","createdAt"
      FROM "PatientPortalNotification"
      WHERE "portalAccountId"=${access.portalAccountId} AND "patientId"=${access.patientId} AND "facilityId"=${access.facilityId}
      ORDER BY "createdAt" DESC LIMIT 100
    `);
    const unread = rows.filter((r) => !r.readAt).length;
    return { unread, notifications: rows };
  }

  async markRead(access: PatientPortalAccessContext, id: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "PatientPortalNotification" SET "readAt"=COALESCE("readAt",CURRENT_TIMESTAMP)
      WHERE "id"=${id} AND "portalAccountId"=${access.portalAccountId}
        AND "patientId"=${access.patientId} AND "facilityId"=${access.facilityId}
    `);
    return { id, read: true };
  }

  async registerDevice(access: PatientPortalAccessContext, token: string, platform: Platform) {
    await this.prisma.$executeRaw(Prisma.sql`
      INSERT INTO "PatientPortalPushDevice" ("id","portalAccountId","facilityId","patientId","token","platform")
      VALUES (${randomUUID()},${access.portalAccountId},${access.facilityId},${access.patientId},${token},${platform})
      ON CONFLICT ("token") DO UPDATE SET "portalAccountId"=EXCLUDED."portalAccountId","facilityId"=EXCLUDED."facilityId",
        "patientId"=EXCLUDED."patientId","platform"=EXCLUDED."platform","enabled"=TRUE,"lastSeenAt"=CURRENT_TIMESTAMP,"updatedAt"=CURRENT_TIMESTAMP
    `);
    return { registered: true };
  }

  async unregisterDevice(access: PatientPortalAccessContext, token: string) {
    await this.prisma.$executeRaw(Prisma.sql`
      UPDATE "PatientPortalPushDevice" SET "enabled"=FALSE,"updatedAt"=CURRENT_TIMESTAMP
      WHERE "token"=${token} AND "portalAccountId"=${access.portalAccountId}
        AND "patientId"=${access.patientId} AND "facilityId"=${access.facilityId}
    `);
    return { registered: false };
  }

  private async sendFcm(token: string, title: string, body: string, data: Record<string,string>) {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) return;
    const sa = JSON.parse(raw) as { client_email:string; private_key:string; project_id:string };
    const now = Math.floor(Date.now()/1000);
    const enc=(v:unknown)=>Buffer.from(JSON.stringify(v)).toString("base64url");
    const unsigned=`${enc({alg:"RS256",typ:"JWT"})}.${enc({iss:sa.client_email,scope:"https://www.googleapis.com/auth/firebase.messaging",aud:"https://oauth2.googleapis.com/token",iat:now,exp:now+3600})}`;
    const signer=createSign("RSA-SHA256"); signer.update(unsigned); signer.end();
    const assertion=`${unsigned}.${signer.sign(sa.private_key,"base64url")}`;
    const auth=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:new URLSearchParams({grant_type:"urn:ietf:params:oauth:grant-type:jwt-bearer",assertion})});
    if(!auth.ok) throw new Error("FCM OAuth failed");
    const {access_token}=await auth.json() as {access_token:string};
    const response=await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,{method:"POST",headers:{authorization:`Bearer ${access_token}`,"content-type":"application/json"},body:JSON.stringify({message:{token,notification:{title,body},data}})});
    if(!response.ok) throw new Error("FCM send failed");
  }
}
