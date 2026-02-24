# Exercise Release Generator

This script automates the process of converting raw exercise content (JSON) into secure, obfuscated HTML files for production. It handles data encryption, authentication integration, and UI shell generation.

## 🛠 Usage

```bash
node scripts/generate_release.js <json_path> <type> <output_path>
```

### Parameters
1.  **`json_path`**: Path to the filled-out content JSON (see `templates/content-template.json`).
2.  **`type`**:
    *   `post`: Generates a version that requires a POST request to the authentication server to retrieve the decryption key. Implements local storage caching.
    *   `builtin`: Generates a version where the decryption key is pre-calculated and embedded. No network request is made.
3.  **`output_path`**: The filename for the generated HTML (e.g., `release/My-Exercise.html`).

## 📁 System Components

-   **`templates/shell-post.html`**: The UI template for authenticated exercises.
-   **`templates/shell-builtin.html`**: The UI template for standalone exercises.
-   **`data/`**: Folder containing the extracted content for existing exercises.
-   **`templates/content-template.json`**: A blueprint for creating new exercise data.

## 🔒 Security Model

1.  **ID_A**: A unique identifier assigned to each exercise.
2.  **ID_A Suffix**: During generation, a two-letter suffix is appended to `ID_A` to encode license metadata:
    *   **User Count Encoding**: 3 users → 'a', 6 users → 'b', 10 users → 'c'.
    *   **Validity Months Encoding**: 3 months → 'o', 6 months → 'p', 12 months → 'q'.
    *   **Obfuscation Shift**: Both letters are shifted forward by the **last numeric digit** found in the original `ID_A`.
        *   *Example*: If base `ID_A` ends in digit `3`, and we select 3 users ('a') for 12 months ('q'), the suffix becomes `dt` ('a'+3, 'q'+3).
3.  **Encryption**: The `challenges` array is stringified, converted to UTF-8 bytes, XOR-encrypted using a key derived from the final `ID_A` (via djb2), and finally Base64 encoded.
4.  **Obfuscation**: The decryption logic in the final HTML is renamed to generic identifiers (e.g., `_0x4f2a`) and comments are stripped to hide the underlying mechanism.

## 📝 Creating a New Exercise

1.  Copy `templates/content-template.json` to a new file in `data/`.
2.  Fill in the `title`, `ID_A` (unique 15-char string), `ipaDict`, and `challenges`.
3.  Choose a unique `storageSuffix` (e.g., `_unit5`) to prevent data collision in the browser's LocalStorage.
4.  Run the generator script.
