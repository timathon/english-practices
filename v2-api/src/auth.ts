import { sign, verify } from "hono/jwt";
import crypto from "node:crypto";

export interface TokenPayload {
  sub: string;       // userId
  username: string;
  role: string;
  exp: number;       // unix timestamp
}

export const JWT_SECRET_FALLBACK = "dev_secret_1234567890";

/**
 * Hash password using fast scrypt parameters N=1024, r=8, p=1
 * Output format matches stored passwords in account.password: "${salt}:${derivedKey}"
 */
export async function hashPassword(password: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const salt = crypto.randomBytes(16).toString("hex");
    crypto.scrypt(password, salt, 64, { N: 1024, r: 8, p: 1 }, (err: Error | null, derivedKey: Buffer) => {
      if (err) reject(err);
      else resolve(`${salt}:${derivedKey.toString("hex")}`);
    });
  });
}

/**
 * Verify password against stored "${salt}:${derivedKey}"
 * Compatible with existing passwords hashed by better-auth or custom scrypt (both N=1024 and N=16384)
 */
export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  if (!salt || !key) return false;

  return new Promise<boolean>((resolve) => {
    // 1. Try lightweight scrypt parameters N=1024 (new hashes)
    crypto.scrypt(password, salt, 64, { N: 1024, r: 8, p: 1 }, (err: Error | null, derivedKey: Buffer) => {
      if (!err && derivedKey.toString("hex") === key) {
        resolve(true);
        return;
      }
      // 2. Fallback to legacy default parameters N=16384 (with maxmem protection)
      crypto.scrypt(password, salt, 64, { N: 16384, r: 16, p: 1, maxmem: 67108864 }, (err2: Error | null, derivedKey2: Buffer) => {
        if (!err2 && derivedKey2.toString("hex") === key) {
          resolve(true);
        } else {
          resolve(false);
        }
      });
    });
  });
}

/**
 * Sign JWT token for user (default 365 days)
 */
export async function createToken(
  payload: Omit<TokenPayload, "exp">,
  secret: string = JWT_SECRET_FALLBACK,
  expiresInDays: number = 365
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  return await sign({ ...payload, exp }, secret);
}

/**
 * Verify JWT token
 */
export async function verifyToken(
  token: string,
  secret: string = JWT_SECRET_FALLBACK
): Promise<TokenPayload | null> {
  try {
    const verified = await verify(token, secret, "HS256");
    return verified as unknown as TokenPayload;
  } catch {
    return null;
  }
}
