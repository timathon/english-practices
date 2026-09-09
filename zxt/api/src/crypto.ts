// HMAC-SHA256 Web Crypto Helper Functions for Tamper-Proof Tokens
const JWT_SECRET = 'zxt_secure_hmac_secret_key_2026_v3';

export function base64UrlEncode(str: string): string {
  const base64 = btoa(str);
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return atob(base64);
}

async function getHmacKey(secret: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  return await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify']
  );
}

export async function createSignedJWT(payload: object, secret: string = JWT_SECRET): Promise<string> {
  const header = { alg: 'HS256', typ: 'JWT' };
  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const dataToSign = `${encodedHeader}.${encodedPayload}`;

  const key = await getHmacKey(secret);
  const signatureBuffer = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(dataToSign));
  const signatureArr = Array.from(new Uint8Array(signatureBuffer));
  const signatureStr = String.fromCharCode(...signatureArr);
  const encodedSignature = base64UrlEncode(signatureStr);

  return `${dataToSign}.${encodedSignature}`;
}

export async function verifySignedJWT(token: string, secret: string = JWT_SECRET): Promise<any | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;

    const [encodedHeader, encodedPayload, encodedSignature] = parts;
    const dataToVerify = `${encodedHeader}.${encodedPayload}`;

    const key = await getHmacKey(secret);
    const signatureBytes = Uint8Array.from(base64UrlDecode(encodedSignature), c => c.charCodeAt(0));

    const isValid = await crypto.subtle.verify(
      'HMAC',
      key,
      signatureBytes,
      new TextEncoder().encode(dataToVerify)
    );

    if (!isValid) return null;

    const payload = JSON.parse(base64UrlDecode(encodedPayload));
    if (payload.exp && Date.now() > payload.exp) {
      return null; // Expired token
    }
    return payload;
  } catch (_) {
    return null;
  }
}

// Fast & Lightweight SHA-256 Hash helper (Stays under 50ms Worker CPU limit)
export async function hashPassword(password: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(`zxt_salt_${password}`);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
