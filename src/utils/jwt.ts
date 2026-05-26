import jwt from "jsonwebtoken";
import { env } from "../config/env";
import { JwtPayload } from "../middleware/auth";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, env.jwtSecret, {
    expiresIn: env.jwtExpiresIn as jwt.SignOptions["expiresIn"],
  });
}
