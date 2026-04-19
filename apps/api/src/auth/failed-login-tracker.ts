import { HttpException, HttpStatus, Injectable } from "@nestjs/common";

type Entry = { fails: number; lockedUntil: number };

/**
 * In-memory failed-login throttling (IP + known account). Not durable across restarts;
 * use for abuse resistance without storing credentials.
 */
@Injectable()
export class FailedLoginTracker {
  private readonly byIp = new Map<string, Entry>();
  private readonly byAcc = new Map<string, Entry>();

  /** Failures before lockout (per window). */
  private readonly ipMaxFails = 40;
  private readonly accMaxFails = 8;

  /** Lock duration after threshold reached. */
  private readonly lockMs = 15 * 60 * 1000;

  private keyIp(ip: string) {
    return `ip:${ip}`;
  }

  private keyAcc(emailNorm: string) {
    return `acc:${emailNorm.toLowerCase().trim()}`;
  }

  private assertNotLocked(map: Map<string, Entry>, key: string, label: "ip" | "acc") {
    const now = Date.now();
    const e = map.get(key);
    if (!e) return;
    if (e.lockedUntil > now) {
      const retryAfterSec = Math.ceil((e.lockedUntil - now) / 1000);
      throw new HttpException(
        {
          statusCode: HttpStatus.TOO_MANY_REQUESTS,
          message: "Trop de tentatives. Réessayez plus tard.",
          retryAfterSec,
          scope: label,
        },
        HttpStatus.TOO_MANY_REQUESTS
      );
    }
    if (e.lockedUntil > 0 && e.lockedUntil <= now) {
      map.delete(key);
    }
  }

  /** Call before processing login — throttle by client IP. */
  assertIpNotLocked(ip: string) {
    this.assertNotLocked(this.byIp, this.keyIp(ip), "ip");
  }

  /** After user row is found, throttle by account identifier. */
  assertAccountNotLocked(normalizedEmail: string) {
    this.assertNotLocked(this.byAcc, this.keyAcc(normalizedEmail), "acc");
  }

  private bump(map: Map<string, Entry>, key: string, maxFails: number) {
    const now = Date.now();
    let e = map.get(key);
    if (e?.lockedUntil && e.lockedUntil > now) {
      return;
    }
    if (e?.lockedUntil && e.lockedUntil <= now) {
      e = { fails: 0, lockedUntil: 0 };
    }
    const next: Entry = e ?? { fails: 0, lockedUntil: 0 };
    next.fails += 1;
    if (next.fails >= maxFails) {
      next.lockedUntil = now + this.lockMs;
      next.fails = 0;
    }
    map.set(key, next);
  }

  /** Unknown email / no user row — count toward IP only. */
  recordUnknownUser(ip: string) {
    this.bump(this.byIp, this.keyIp(ip), this.ipMaxFails);
  }

  /** Wrong password or inactive account — IP + account. */
  recordBadPassword(ip: string, accountEmailNorm: string) {
    this.bump(this.byIp, this.keyIp(ip), this.ipMaxFails);
    this.bump(this.byAcc, this.keyAcc(accountEmailNorm), this.accMaxFails);
  }

  reset(ip: string, accountEmailNorm: string) {
    this.byIp.delete(this.keyIp(ip));
    this.byAcc.delete(this.keyAcc(accountEmailNorm));
  }
}
