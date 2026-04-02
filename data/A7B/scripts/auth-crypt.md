# Authentication & Content Encryption Workflow

This document outlines the complete process for converting a standard exercise HTML file into a secure "release" version with authentication and encrypted content.

## 1. Preparation: Key Generation

The security model relies on a unique `ID_A` hardcoded in each HTML file.

1.  **Assign `ID_A`**: Use a unique 15-character alphanumeric string.
2.  **Generate Key**: Use the `djb2` hash algorithm to derive a 32-bit unsigned integer from `ID_A`.

```javascript
function generateKey(idA) {
    let hash = 5381;
    for (let i = 0; i < idA.length; i++) {
        hash = ((hash << 5) + hash) + idA.charCodeAt(i);
    }
    return hash >>> 0;
}
```

## 2. HTML Structure Changes

### CSS Additions
Add the following styles for the authentication overlay and device indicator:

```css
/* Auth Overlay */
#auth-overlay {
    position: fixed;
    top: 0; left: 0; right: 0; bottom: 0;
    background: var(--bg);
    display: flex; flex-direction: column;
    justify-content: center; align-items: center;
    z-index: 1000;
}
#auth-overlay.hidden { display: none; }
.auth-spinner {
    width: 50px; height: 50px;
    border: 5px solid var(--neutral);
    border-top-color: var(--secondary);
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 20px;
}
.auth-message { font-size: 1.2rem; color: var(--text); text-align: center; }
.auth-error { color: var(--danger); font-weight: bold; }
@keyframes spin { to { transform: rotate(360deg); } }

/* Device indicator */
#device-indicator {
    position: fixed; top: 10px; right: 10px;
    background: var(--secondary); color: white;
    padding: 5px 12px; border-radius: 12px;
    font-size: 0.85rem; font-weight: bold;
    z-index: 999; display: none;
}
#device-indicator.visible { display: block; }

#app { display: none; } /* Hide app by default */
```

### Body Additions
Insert these at the top of the `<body>`:

```html
<div id="auth-overlay">
    <div class="auth-spinner"></div>
    <div class="auth-message">正在认证...</div>
</div>
<div id="device-indicator"></div>
```

## 3. Data Encryption (UTF-8 Support)

The `challenges` array must be stringified, converted to UTF-8 bytes, XOR-encrypted, and then Base64 encoded.

### Encryption Script (Node.js)
```javascript
const fs = require('fs');
const challenges = [/* ... your data ... */];
const key = 123456789; // Your generated key

function xorEncrypt(bytes, key) {
    const keyBytes = new Uint8Array(4);
    keyBytes[0] = key & 0xFF;
    keyBytes[1] = (key >> 8) & 0xFF;
    keyBytes[2] = (key >> 16) & 0xFF;
    keyBytes[3] = (key >> 24) & 0xFF;
    const result = new Uint8Array(bytes.length);
    for (let i = 0; i < bytes.length; i++) {
        result[i] = bytes[i] ^ keyBytes[i % 4];
    }
    return result;
}

const json = JSON.stringify(challenges);
const bytes = Buffer.from(json, 'utf8');
const encrypted = xorEncrypt(bytes, key);
const base64 = Buffer.from(encrypted).toString('base64');
console.log(base64);
```

## 4. Obfuscated Implementation in HTML

Replace the plain `challenges` array with an obfuscated decryption function and the encrypted string.

### Decryption Function (Obfuscated)
```javascript
const encryptedChallenges = "YOUR_BASE64_STRING";
let challenges = [];

function _0x4f2a(cipherText, key) {
    const _0xb1 = new Uint8Array(4);
    _0xb1[0] = key & 0xFF;
    _0xb1[1] = (key >> 8) & 0xFF;
    _0xb1[2] = (key >> 16) & 0xFF;
    _0xb1[3] = (key >> 24) & 0xFF;
    
    const _0xc2 = atob(cipherText);
    const bytes = new Uint8Array(_0xc2.length);
    for (let i = 0; i < _0xc2.length; i++) {
        bytes[i] = _0xc2.charCodeAt(i) ^ _0xb1[i % 4];
    }
    return new TextDecoder().decode(bytes);
}
```

## 5. Authentication Flow

The `authenticate` function handles server verification and key persistence.

1.  **Check Cache**: If `AUTH_DONE_KEY` and `DECRYPTION_KEY_KEY` exist, use them.
2.  **Server POST**: Send `{idA, idB}` to the auth endpoint.
3.  **Handle Response**:
    -   If `number > 0`, store the `number` and `key` in `localStorage`.
    -   Decrypt `encryptedChallenges` using the `key`.
    -   Initialize the app (`app.init()`).

```javascript
async function authenticate() {
    const cachedDeviceNumber = localStorage.getItem(DEVICE_NUMBER_KEY);
    const cachedKey = localStorage.getItem(DECRYPTION_KEY_KEY);
    
    if (localStorage.getItem(AUTH_DONE_KEY) === "true" && cachedDeviceNumber && cachedKey) {
        showApp(cachedDeviceNumber);
        const key = parseInt(cachedKey, 10);
        challenges = JSON.parse(_0x4f2a(encryptedChallenges, key));
        app.init();
        return;
    }

    const overlay = document.getElementById("auth-overlay");
    try {
        const response = await fetch("https://AUTH_ENDPOINT", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ idA: ID_A, idB: ID_B })
        });
        const data = await response.json();
        if (data.number > 0 && data.key) {
            showApp(data.number);
            challenges = JSON.parse(_0x4f2a(encryptedChallenges, data.key));
            localStorage.setItem(AUTH_DONE_KEY, "true");
            localStorage.setItem(DEVICE_NUMBER_KEY, data.number);
            localStorage.setItem(DECRYPTION_KEY_KEY, data.key.toString());
            app.init();
        } else {
            overlay.innerHTML = "<div class='auth-message auth-error'>认证失败</div>";
        }
    } catch (e) {
        overlay.innerHTML = "<div class='auth-message auth-error'>系统错误</div>";
    }
}

function showApp(num) {
    document.getElementById("device-indicator").textContent = "设备" + num;
    document.getElementById("device-indicator").classList.add("visible");
    document.getElementById("auth-overlay").classList.add("hidden");
    document.getElementById("app").style.display = "flex";
}
```

## 6. Summary Checklist

1.  [ ] Unique `ID_A` assigned.
2.  [ ] Key generated via djb2.
3.  [ ] Data encrypted using UTF-8 Buffer.
4.  [ ] `auth-overlay` and `device-indicator` added to CSS/HTML.
5.  [ ] `#app` set to `display: none`.
6.  [ ] `_0x4f2a` decryption function added (obfuscated).
7.  [ ] `authenticate` function implements caching and server verification.
8.  [ ] All comments referencing "encryption" or "XOR" removed from final HTML.
