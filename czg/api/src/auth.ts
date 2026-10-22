import { sign, verify } from "hono/jwt";

export const JWT_SECRET = (typeof (globalThis as any).process !== "undefined" && (globalThis as any).process.env?.JWT_SECRET) || "czg_super_secret_jwt_key_2026";

/**
 * Hash password using WebCrypto PBKDF2 (Native & lightning fast < 1ms)
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const saltBuf = crypto.getRandomValues(new Uint8Array(16));
  const salt = Array.from(saltBuf).map(b => b.toString(16).padStart(2, '0')).join('');
  
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
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

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

  const hash = Array.from(new Uint8Array(derivedBits))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return hash === storedHash;
}

/**
 * Generate user JWT
 */
export async function createToken(payload: { userId: string; username: string; role?: string }): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30; // 30 days
  return sign({ ...payload, exp }, JWT_SECRET);
}

/**
 * Verify token
 */
export async function verifyToken(token: string): Promise<{ userId: string; username: string; role?: string } | null> {
  try {
    const payload = await verify(token, JWT_SECRET, "HS256") as any;
    if (payload && payload.userId) {
      return { userId: payload.userId, username: payload.username, role: payload.role || "user" };
    }
    return null;
  } catch {
    return null;
  }
}
