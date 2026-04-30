/**
 * Serialize a plain object to multipart/form-data format.
 *
 * This is for cases where RN's FormData can't pass through the interceptor chain
 * (since WebBridgeRequest.body is string | ArrayBuffer | null).
 */

export interface FormDataEntry {
  name: string;
  value: string | { data: string; filename: string; contentType: string };
}

/**
 * Generate a random multipart boundary string.
 */
export function generateBoundary(): string {
  const chars =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let boundary = '----WebBridgeFormBoundary';
  for (let i = 0; i < 16; i++) {
    boundary += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return boundary;
}

/**
 * Serialize form data entries to a multipart/form-data body string.
 *
 * @param entries - Array of form data entries (text fields or file-like objects)
 * @returns An object containing the serialized body and Content-Type header with boundary
 */
export function serializeFormData(entries: FormDataEntry[]): {
  body: string;
  contentType: string;
} {
  if (entries.length === 0) {
    throw new Error('FormData entries must not be empty');
  }

  const boundary = generateBoundary();
  const parts: string[] = [];

  for (const entry of entries) {
    if (typeof entry.value === 'string') {
      // Text field
      parts.push(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${escapeQuotes(entry.name)}"\r\n` +
          `\r\n` +
          `${entry.value}\r\n`,
      );
    } else {
      // File-like entry
      const { data, filename, contentType } = entry.value;
      parts.push(
        `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="${escapeQuotes(entry.name)}"; filename="${escapeQuotes(filename)}"\r\n` +
          `Content-Type: ${contentType}\r\n` +
          `\r\n` +
          `${data}\r\n`,
      );
    }
  }

  // Closing boundary
  parts.push(`--${boundary}--\r\n`);

  return {
    body: parts.join(''),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}

function escapeQuotes(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}
