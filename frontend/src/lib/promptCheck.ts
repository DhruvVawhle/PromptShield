export type Decision = {
  ok: boolean;
  heading: string;
  reason: string;
};

function hasMatch(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function checkPrompt(text: string): Decision {
  const lower = text.toLowerCase();

  if (
    hasMatch(lower, [
      /ignore\s+(your|previous|all)\s+instructions/,
      /disregard\s+the\s+above/,
    ])
  ) {
    return {
      ok: false,
      heading: "Instruction override detected",
      reason: "The request attempts to bypass system rules and expose protected instructions.",
    };
  }

  if (
    hasMatch(lower, [
      /reveal|print|show|repeat/,
    ]) &&
    hasMatch(lower, [/system|hidden|developer\s+prompt|message/])
  ) {
    return {
      ok: false,
      heading: "System prompt extraction detected",
      reason: "The request tries to read instructions that are meant to stay private.",
    };
  }

  if (
    hasMatch(lower, [
      /\bDAN\b/,
      /jailbreak/,
      /no\s+restrictions/,
      /developer\s+mode/,
    ])
  ) {
    return {
      ok: false,
      heading: "Role hijack detected",
      reason: "The request tries to replace the assistant's role with one that ignores policy.",
    };
  }

  return {
    ok: true,
    heading: "No threat detected",
    reason: "The request follows normal usage and is passed to your model.",
  };
}