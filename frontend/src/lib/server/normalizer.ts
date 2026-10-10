import type { NormalizedInput } from "./security-types";

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;
const BASE64_CHUNK_REGEX = /\b[A-Za-z0-9+/]{24,}={0,2}\b/g;
const HEX_SEQUENCE_REGEX = /(?:\\x[0-9a-fA-F]{2}){4,}|(?:0x[0-9a-fA-F]{2}\s*){4,}/g;

/**
 * Normalizes user prompt input to prevent evasion via Unicode tricks,
 * zero-width characters, or URL encoding.
 */
export function normalizePromptInput(raw: string): NormalizedInput {
  const encodings: string[] = [];

  // Check for zero-width characters
  const containsZeroWidthChars = ZERO_WIDTH_REGEX.test(raw);
  if (containsZeroWidthChars) {
    encodings.push("zero-width-characters");
  }

  // Strip zero-width chars and normalize Unicode using NFKC compatibility
  let cleaned = raw.replace(ZERO_WIDTH_REGEX, "").normalize("NFKC");

  // Check for URL encoding (e.g. %20, %69)
  if (/%[0-9a-fA-F]{2}/.test(cleaned)) {
    try {
      const decoded = decodeURIComponent(cleaned);
      if (decoded !== cleaned) {
        cleaned = decoded;
        encodings.push("url-encoding");
      }
    } catch {
      // Malformed URL encoding — keep existing string
    }
  }

  // Check for suspicious Base64 chunks
  let hasObfuscation = false;
  const base64Matches = cleaned.match(BASE64_CHUNK_REGEX);
  if (base64Matches && base64Matches.length > 0) {
    hasObfuscation = true;
    encodings.push("base64");
  }

  const hexMatches = cleaned.match(HEX_SEQUENCE_REGEX);
  if (hexMatches && hexMatches.length > 0) {
    hasObfuscation = true;
    encodings.push("hex-escape");
  }

  // Canonicalize whitespaces
  const normalized = cleaned.replace(/\r\n/g, "\n").replace(/[ \t]+/g, " ").trim();

  return {
    raw,
    normalized,
    length: normalized.length,
    containsZeroWidthChars,
    isObfuscatedEncoding: hasObfuscation,
    detectedEncodings: encodings,
  };
}
