# Key Generation for Content Encryption

## Overview

The challenges array is encrypted using a key derived from `ID_A`. This document explains how to generate the key.

## Key Generation Algorithm (Option 3: djb2 Hash)

```javascript
/**
 * Generate a 32-bit encryption key from ID_A using djb2 hash algorithm
 * @param {string} idA - The ID_A string (e.g., "Ay4Frm8E44C492O")
 * @returns {number} 32-bit unsigned integer key
 */
function generateKey(idA) {
    let hash = 5381;
    for (let i = 0; i < idA.length; i++) {
        hash = ((hash << 5) + hash) + idA.charCodeAt(i);
    }
    return hash >>> 0; // Convert to unsigned 32-bit integer
}
```

## Usage Example

```javascript
const ID_A = "Ay4Frm8E44C492O";
const key = generateKey(ID_A);
console.log(key); // Outputs the encryption key
```

## Encryption/Decryption

### Encrypt Challenges Array

```javascript
function xorEncrypt(plainText, key) {
    let result = '';
    const keyBytes = new Uint8Array(4);
    keyBytes[0] = key & 0xFF;
    keyBytes[1] = (key >> 8) & 0xFF;
    keyBytes[2] = (key >> 16) & 0xFF;
    keyBytes[3] = (key >> 24) & 0xFF;
    
    for (let i = 0; i < plainText.length; i++) {
        const charCode = plainText.charCodeAt(i) ^ keyBytes[i % 4];
        result += String.fromCharCode(charCode);
    }
    return result;
}

// Usage:
const challengesJson = JSON.stringify(challenges);
const encrypted = xorEncrypt(challengesJson, key);
const encoded = btoa(encrypted); // Store this base64 string in HTML
```

### Decrypt Challenges Array

```javascript
function xorDecrypt(cipherText, key) {
    let result = '';
    const keyBytes = new Uint8Array(4);
    keyBytes[0] = key & 0xFF;
    keyBytes[1] = (key >> 8) & 0xFF;
    keyBytes[2] = (key >> 16) & 0xFF;
    keyBytes[3] = (key >> 24) & 0xFF;
    
    for (let i = 0; i < cipherText.length; i++) {
        const charCode = cipherText.charCodeAt(i) ^ keyBytes[i % 4];
        result += String.fromCharCode(charCode);
    }
    return result;
}

// Usage:
const decoded = atob(encodedBase64);
const decrypted = xorDecrypt(decoded, key);
const challenges = JSON.parse(decrypted);
```

## Complete Standalone Script

Save as `encrypt-challenges.js`:

```javascript
// Key generation (djb2 hash)
function generateKey(idA) {
    let hash = 5381;
    for (let i = 0; i < idA.length; i++) {
        hash = ((hash << 5) + hash) + idA.charCodeAt(i);
    }
    return hash >>> 0;
}

// XOR encrypt with 4-byte key
function xorEncrypt(plainText, key) {
    let result = '';
    const keyBytes = new Uint8Array(4);
    keyBytes[0] = key & 0xFF;
    keyBytes[1] = (key >> 8) & 0xFF;
    keyBytes[2] = (key >> 16) & 0xFF;
    keyBytes[3] = (key >> 24) & 0xFF;
    
    for (let i = 0; i < plainText.length; i++) {
        const charCode = plainText.charCodeAt(i) ^ keyBytes[i % 4];
        result += String.fromCharCode(charCode);
    }
    return result;
}

// Main: Encrypt challenges
const ID_A = "Ay4Frm8E44C492O";
const key = generateKey(ID_A);
console.log('Generated key:', key);

// Read challenges from file or define here
const challenges = [/* your challenges array */];

const challengesJson = JSON.stringify(challenges);
const encrypted = xorEncrypt(challengesJson, key);
const encoded = btoa(encrypted);

console.log('Encrypted base64:');
console.log(encoded);
```

## Node.js Script to Encrypt

```javascript
// encrypt.js - Run with: node encrypt.js
const fs = require('fs');

function generateKey(idA) {
    let hash = 5381;
    for (let i = 0; i < idA.length; i++) {
        hash = ((hash << 5) + hash) + idA.charCodeAt(i);
    }
    return hash >>> 0;
}

function xorEncrypt(plainText, key) {
    let result = '';
    const keyBytes = new Uint8Array(4);
    keyBytes[0] = key & 0xFF;
    keyBytes[1] = (key >> 8) & 0xFF;
    keyBytes[2] = (key >> 16) & 0xFF;
    keyBytes[3] = (key >> 24) & 0xFF;
    
    for (let i = 0; i < plainText.length; i++) {
        const charCode = plainText.charCodeAt(i) ^ keyBytes[i % 4];
        result += String.fromCharCode(charCode);
    }
    return result;
}

// Read challenges from JSON file
const challenges = JSON.parse(fs.readFileSync('challenges.json', 'utf8'));
const ID_A = "Ay4Frm8E44C492O";
const key = generateKey(ID_A);

const challengesJson = JSON.stringify(challenges);
const encrypted = xorEncrypt(challengesJson, key);
const encoded = btoa(encrypted);

fs.writeFileSync('challenges.encrypted.txt', encoded);
console.log('Key:', key);
console.log('Encrypted data saved to challenges.encrypted.txt');
```

## Notes

- The key is deterministic - same `ID_A` always produces the same key
- XOR encryption is symmetric - same function for encrypt and decrypt
- The 4-byte key provides basic obfuscation, not military-grade security
- For stronger security, consider using Web Crypto API with AES

## Reference: Current Production Data (A Cold Day)

| Field | Value |
|-------|-------|
| **ID_A** | `Ay4Frm8E44C492O` |
| **Generated Key** | `4147568046` |
| **Encrypted Data File** | `the-challenges-encrypted-string` |

To generate this key again:
```bash
node -e 'function generateKey(idA) { let hash = 5381; for (let i = 0; i < idA.length; i++) { hash = ((hash << 5) + hash) + idA.charCodeAt(i); } return hash >>> 0; } console.log(generateKey("Ay4Frm8E44C492O"))'
```
