export type PeriodKey = "7d" | "4w";

export type PeriodData = {
  label: string;
  periodLabel: string;
  detected: number[];
  blocked: number[];
  warn: number[];
  sanitize: number[];
  allow: number[];
  risk: number[];
  categories: number[];
  xLabels: string[];
};

export const PERIODS: Record<PeriodKey, PeriodData> = {
  "7d": {
    label: "7 days",
    periodLabel: "vs Sat",
    detected: [6, 9, 7, 10, 8, 11, 12],
    blocked: [3, 4, 3, 5, 3, 4, 7],
    warn: [2, 3, 2, 3, 3, 4, 3],
    sanitize: [1, 2, 2, 2, 2, 3, 2],
    allow: [38, 42, 40, 46, 44, 49, 47],
    risk: [58, 61, 60, 63, 62, 65, 64],
    categories: [27, 16, 11, 9],
    xLabels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
  },
  "4w": {
    label: "4 weeks",
    periodLabel: "vs last week",
    detected: [41, 52, 58, 67],
    blocked: [21, 27, 30, 35],
    warn: [12, 15, 17, 19],
    sanitize: [8, 10, 11, 13],
    allow: [262, 281, 296, 319],
    risk: [52, 57, 61, 64],
    categories: [94, 55, 38, 31],
    xLabels: ["W1", "W2", "W3", "W4"],
  },
};

export const CATEGORY_LABELS = [
  "Direct injection",
  "Prompt leakage",
  "Role escalation",
  "Obfuscation",
] as const;
