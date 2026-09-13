import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";
import { ExtractJwt, Strategy } from "passport-jwt";
import { FhirMachineIdentityService } from "./fhir-machine-identity.service";

@Injectable()
export class FhirMachineStrategy extends PassportStrategy(Strategy, "fhir-client") {
  constructor(config: ConfigService, private readonly identities: FhirMachineIdentityService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      issuer: config.get<string>("FHIR_M2M_ISSUER")?.trim() || "medora-s",
      audience: config.get<string>("FHIR_M2M_AUDIENCE")?.trim() || "medora-fhir",
      secretOrKeyProvider: (_request: unknown, _rawJwt: string, done: (error: Error | null, secret?: string) => void) => {
        const secret = config.get<string>("FHIR_M2M_ACCESS_SECRET")?.trim();
        if (!secret || secret.length < 32) return done(new Error("FHIR machine-token signing secret is not configured"));
        return done(null, secret);
      },
    });
  }

  async validate(payload: unknown) {
    try {
      return await this.identities.resolveMachinePrincipal(payload);
    } catch (error) {
      if (error instanceof UnauthorizedException) throw error;
      throw error;
    }
  }
}
