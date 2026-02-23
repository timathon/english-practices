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
2.  **Encryption**: The `challenges` array is stringified, converted to UTF-8 bytes, XOR-encrypted using a key derived from `ID_A` (via djb2), and finally Base64 encoded.
3.  **Obfuscation**: The decryption logic in the final HTML is renamed to generic identifiers (e.g., `_0x4f2a`) and comments are stripped to hide the underlying mechanism.

## 📝 Creating a New Exercise

1.  Copy `templates/content-template.json` to a new file in `data/`.
2.  Fill in the `title`, `ID_A` (unique 15-char string), `ipaDict`, and `challenges`.
3.  Choose a unique `storageSuffix` (e.g., `_unit5`) to prevent data collision in the browser's LocalStorage.
4.  Run the generator script.
