import type { NormalizedInput, TokenAnalysis } from "./security-types";

const ZERO_WIDTH_REGEX = /[\u200B-\u200D\uFEFF]/g;
const BASE64_CHUNK_REGEX = /\b[A-Za-z0-9+/]{24,}={0,2}\b/g;
const HEX_SEQUENCE_REGEX = /(?:\\x[0-9a-fA-F]{2}){4,}|(?:0x[0-9a-fA-F]{2}\s*){4,}/g;

/**
 * De-obfuscate common leetspeak substitutions
 */
export function deobfuscateLeetspeak(word: string): string {
  return word
    .toLowerCase()
    .replace(/0/g, "o")
    .replace(/1/g, "i")
    .replace(/3/g, "e")
    .replace(/4/g, "a")
    .replace(/@/g, "a")
    .replace(/\$/g, "s")
    .replace(/5/g, "s")
    .replace(/!/g, "i");
}

/**
 * Algorithmic English stemmer (Porter-style morphological reduction).
 * Reduces plurals, tenses, and derivational suffixes to common base roots.
 */
export function stemWord(rawWord: string): string {
  let word = deobfuscateLeetspeak(rawWord).toLowerCase().replace(/[^a-z]/g, "");
  if (word.length <= 3) return word;

  // Step 1: Plurals and basic third person
  if (word.endsWith("sses")) {
    word = word.slice(0, -2);
  } else if (word.endsWith("ies")) {
    word = word.slice(0, -3) + "i";
  } else if (word.endsWith("ss")) {
    // leave ss intact (bypass -> bypass)
  } else if (word.endsWith("s") && !word.endsWith("us") && !word.endsWith("is")) {
    word = word.slice(0, -1);
  }

  if (word.length <= 3) return word;

  // Step 2: Participles and past tense
  if (word.endsWith("ingly")) {
    word = word.slice(0, -5);
  } else if (word.endsWith("edly")) {
    word = word.slice(0, -4);
  } else if (word.endsWith("ing")) {
    const stem = word.slice(0, -3);
    if (stem.length >= 3) {
      word = stem.endsWith("at") ? stem + "e" : stem;
    }
  } else if (word.endsWith("ed")) {
    const stem = word.slice(0, -2);
    if (stem.length >= 3) {
      word = stem.endsWith("at") ? stem + "e" : stem;
    }
  }

  if (word.length <= 3) return word;

  // Step 3: Derivational suffixes
  const suffixes: Array<[string, string]> = [
    ["ational", "ate"],
    ["tional", "tion"],
    ["ization", "ize"],
    ["isation", "ize"],
    ["ation", "ate"],
    ["ition", "it"],
    ["fulness", "ful"],
    ["ousness", "ous"],
    ["iveness", "ive"],
    ["ability", "able"],
    ["ibility", "ible"],
    ["able", ""],
    ["ible", ""],
    ["ment", ""],
    ["ness", ""],
    ["ity", ""],
    ["ize", ""],
    ["ise", ""],
    ["ive", ""],
    ["ous", ""],
    ["ful", ""],
    ["ly", ""],
  ];

  for (const [suffix, repl] of suffixes) {
    if (word.endsWith(suffix) && word.length - suffix.length >= 3) {
      word = word.slice(0, -suffix.length) + repl;
      break;
    }
  }

  // Canonical root mappings for security analysis
  if (word.startsWith("ignor")) return "ignor";
  if (word.startsWith("overrid")) return "overrid";
  if (word.startsWith("bypass")) return "bypass";
  if (word.startsWith("disabl")) return "disabl";
  if (word.startsWith("disregard")) return "disregard";
  if (word.startsWith("exfiltrat")) return "exfiltrat";
  if (word.startsWith("jailbreak")) return "jailbreak";
  if (word.startsWith("unrestrict")) return "unrestrict";
  if (word.startsWith("neutraliz") || word.startsWith("neutralis")) return "neutral";
  if (word.startsWith("instruct")) return "instruct";
  if (word.startsWith("guidelin")) return "guidelin";
  if (word.startsWith("directiv")) return "direct";

  return word;
}

/**
 * Tokenize prompt into individual lexical tokens and morphological stems
 */
export function tokenizePrompt(text: string): { tokens: string[]; stems: string[]; wordCount: number } {
  // Normalize spaced characters (e.g. "i g n o r e" -> "ignore")
  const spacedLettersFixed = text.replace(/\b([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\s+([a-zA-Z])\b/g, "$1$2$3$4");

  const rawTokens = spacedLettersFixed
    .toLowerCase()
    .split(/[\s,.;:!?()[\]{}"'\/\\`~<>+=|]+/)
    .filter((t) => t.trim().length > 0);

  const stems = rawTokens.map(stemWord);

  return {
    tokens: rawTokens,
    stems,
    wordCount: rawTokens.length,
  };
}

/**
 * Normalizes user prompt input to prevent evasion via Unicode tricks,
 * zero-width characters, or URL encoding, and performs lexical tokenization.
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

  // Lexical tokenization & stemming analysis
  const { tokens, stems, wordCount } = tokenizePrompt(normalized);

  const tokenAnalysis: TokenAnalysis = {
    wordCount,
    tokenCount: tokens.length,
    tokens: tokens.slice(0, 100),
    stemmedTokens: stems.slice(0, 100),
    flaggedTokens: [],
  };

  return {
    raw,
    normalized,
    length: normalized.length,
    containsZeroWidthChars,
    isObfuscatedEncoding: hasObfuscation,
    detectedEncodings: encodings,
    tokenAnalysis,
  };
}
