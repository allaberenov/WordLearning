import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeWord(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function capitalizeFirst(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function safeInt(value: string | null, fallback: number, min: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(Math.trunc(parsed), min, max);
}

export function levenshteinDistance(a: string, b: string) {
  const source = normalizeWord(a);
  const target = normalizeWord(b);
  const matrix = Array.from({ length: source.length + 1 }, (_, i) => [i]);

  for (let j = 1; j <= target.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= source.length; i += 1) {
    for (let j = 1; j <= target.length; j += 1) {
      const substitutionCost = source[i - 1] === target[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + substitutionCost
      );
    }
  }

  return matrix[source.length][target.length];
}

export function classifyTypedAnswer(answer: string, expected: string) {
  const normalizedAnswer = normalizeWord(answer);
  const normalizedExpected = normalizeWord(expected);

  if (normalizedAnswer === normalizedExpected) {
    return "correct" as const;
  }

  const distance = levenshteinDistance(normalizedAnswer, normalizedExpected);
  const typoThreshold = normalizedExpected.length <= 5 ? 1 : 2;
  return distance <= typoThreshold ? ("typo" as const) : ("wrong" as const);
}
