
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

// Sanitizes user-provided strings.
// Removes problematic invisible/control chars, trims excess whitespace, and replaces suspicious code points.
// Allows all normal Unicode (emojis, CJK, accents, etc.)
export function sanitizeInput(input: string): string {
  // 1. Remove all control characters except newlines/tabs.
  // 2. Replace misplaced surrogates with a "?" (very rare, encoding error symptom).
  // 3. Trim whitespace.
  return input
    .replace(/[^\P{C}\t\n\r]/gu, "") // remove control chars except tabs, newlines
    .replace(/[\uD800-\uDFFF]/g, "?") // replace isolated surrogates
    .replace(/\s+/g, " ") // collapse whitespace
    .trim();
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
