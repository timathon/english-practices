import { sign, verify } from "hono/jwt";

export interface TokenPayload {
  sub: string;        // user_id
  username: string;
  role: "admin" | "student";
  grade: number;
  exp: number;        // unix timestamp
}

/**
 * Hash password using WebCrypto PBKDF2 (Native, < 1ms, zero npm bloat)
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBuf = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBuf).map(b => b.toString(16).padStart(2, "0")).join("");

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: 10000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  const hash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return { hash, salt };
}

/**
 * Verify password against stored hash & salt
 */
export async function verifyPassword(password: string, storedHash: string, saltHex: string): Promise<boolean> {
  const saltBuf = new Uint8Array(
    saltHex.match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
  );

  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"]
  );

  const derivedBits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBuf,
      iterations: 10000,
      hash: "SHA-256"
    },
    keyMaterial,
    256
  );

  const computedHash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");

  return computedHash === storedHash;
}

/**
 * Sign JWT token for user
 */
export async function createToken(
  payload: Omit<TokenPayload, "exp">,
  secret: string,
  expiresInDays: number = 7
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  return await sign({ ...payload, exp }, secret);
}

/**
 * Verify JWT token
 */
export async function verifyToken(token: string, secret: string): Promise<TokenPayload | null> {
  try {
    const verified = await verify(token, secret, "HS256");
    return verified as unknown as TokenPayload;
  } catch {
    return null;
  }
}
