export function bytesToBase64(bytes: Uint8Array): string {
    let binString = '';
    const chunkSize = 8192;
    for (let i = 0; i < bytes.length; i += chunkSize) {
        const chunk = bytes.subarray(i, i + chunkSize);
        binString += String.fromCharCode.apply(null, chunk as any);
    }
    return btoa(binString);
}

export function base64ToBytes(base64: string): Uint8Array {
    const binString = atob(base64);
    const bytes = new Uint8Array(binString.length);
    for (let i = 0; i < binString.length; i++) {
        bytes[i] = binString.charCodeAt(i);
    }
    return bytes;
}

export function encryptContent(contentObj: any, key: string): string {
    const jsonStr = JSON.stringify(contentObj);
    const bytes = new TextEncoder().encode(jsonStr);
    const keyBytes = new TextEncoder().encode(key);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] ^= keyBytes[i % keyBytes.length];
    }
    return bytesToBase64(bytes);
}

export function decryptContent(encryptedBase64: string, key: string): any {
    const bytes = base64ToBytes(encryptedBase64);
    const keyBytes = new TextEncoder().encode(key);
    for (let i = 0; i < bytes.length; i++) {
        bytes[i] ^= keyBytes[i % keyBytes.length];
    }
    const jsonStr = new TextDecoder().decode(bytes);
    return JSON.parse(jsonStr);
}

export const OBSCURE_KEY = 'english-practices-secret-key-2026';
