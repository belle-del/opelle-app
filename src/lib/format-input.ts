/**
 * Auto-formatting utilities for manual input fields.
 * Formats pronouns, phone numbers, and names on blur.
 */

/**
 * Format phone number: "5051234567" → "(505) 123-4567"
 * Also handles partial inputs and existing formatting
 */
export function formatPhone(raw: string): string {
  // Strip all non-digits
  const digits = raw.replace(/\D/g, "");

  if (digits.length === 0) return "";

  // Handle 10-digit US phone
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle 11-digit (1 + 10)
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }

  // Handle 7-digit local
  if (digits.length === 7) {
    return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  }

  // Return as-is if we can't determine the format
  return raw;
}

/**
 * Format pronouns: "he him" → "He/Him", "she her hers" → "She/Her/Hers"
 * Handles slash-separated, space-separated, and comma-separated
 */
export function formatPronouns(raw: string): string {
  if (!raw.trim()) return "";

  // Split by slashes, commas, or spaces
  const parts = raw
    .split(/[\/,\s]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (parts.length === 0) return "";

  // Capitalize each pronoun
  const formatted = parts.map(
    (p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()
  );

  return formatted.join("/");
}

/**
 * Format a person's name: capitalize first letter of each word
 * "jane doe" → "Jane Doe", "JOHN" → "John"
 */
export function formatName(raw: string): string {
  if (!raw.trim()) return "";

  return raw
    .trim()
    .split(/\s+/)
    .map((word) => {
      if (word.length === 0) return word;
      // Handle hyphenated names like "Smith-Jones"
      return word
        .split("-")
        .map((part) =>
          part.length > 0
            ? part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()
            : part
        )
        .join("-");
    })
    .join(" ");
}

/**
 * Format tags: ensure consistent casing
 * "COLOR, blonde , HIGHLIGHTS" → "Color, Blonde, Highlights"
 */
export function formatTags(raw: string): string {
  if (!raw.trim()) return "";

  return raw
    .split(",")
    .map((tag) => {
      const trimmed = tag.trim();
      if (!trimmed) return "";
      return trimmed.charAt(0).toUpperCase() + trimmed.slice(1).toLowerCase();
    })
    .filter(Boolean)
    .join(", ");
}
