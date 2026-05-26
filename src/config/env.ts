import dotenv from "dotenv";

dotenv.config();

function requireEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function parseClientUrls(raw: string): string[] {
  return raw
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);
}

const clientUrls = parseClientUrls(requireEnv("CLIENT_URL"));

export const env = {
  port: parseInt(process.env.PORT ?? "5000", 10),
  mongoUri: requireEnv("MONGO_URI"),
  jwtSecret: requireEnv("JWT_SECRET"),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? "7d",
  /** First origin (legacy). */
  clientUrl: clientUrls[0],
  /** Allowed CORS origins (comma-separated in CLIENT_URL). */
  clientUrls,
  nodeEnv: process.env.NODE_ENV ?? "development",
  isProduction: process.env.NODE_ENV === "production",
} as const;
