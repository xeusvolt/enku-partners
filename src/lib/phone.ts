// Ethiopian Phone Number Validation and Normalization Utility

/**
 * Normalizes Ethiopian phone numbers to canonical 10-digit format:
 * `09XXXXXXXX` or `07XXXXXXXX`
 *
 * Accepted formats:
 * - +251912345678 / +251712345678
 * - 251912345678  / 251712345678
 * - 0912345678    / 0712345678
 * - 912345678     / 712345678
 *
 * Returns normalized string (e.g. "0912345678") or null if invalid.
 */
export function normalizeEthiopianPhone(input: string): string | null {
  if (!input) return null;
  // Remove whitespace, dashes, and parentheses
  const cleaned = input.trim().replace(/[\s\-\(\)]/g, '');

  // Case 1: International format with leading +251 or 251
  const intlMatch = cleaned.match(/^(?:\+251|251)([97]\d{8})$/);
  if (intlMatch) {
    return `0${intlMatch[1]}`;
  }

  // Case 2: Local 10-digit format starting with 09 or 07
  const localMatch = cleaned.match(/^(0[97]\d{8})$/);
  if (localMatch) {
    return localMatch[1];
  }

  // Case 3: 9-digit format starting with 9 or 7
  const shortMatch = cleaned.match(/^([97]\d{8})$/);
  if (shortMatch) {
    return `0${shortMatch[1]}`;
  }

  return null;
}

/**
 * Validates whether an input is a valid Ethiopian mobile phone number.
 */
export function isValidEthiopianPhone(input: string): boolean {
  return normalizeEthiopianPhone(input) !== null;
}

/**
 * Formats canonical 10-digit phone for display: "+251 (9) XX-XXX-XXX"
 */
export function formatEthiopianPhoneDisplay(phone: string): string {
  const norm = normalizeEthiopianPhone(phone);
  if (!norm) return phone;
  const prefix = norm.slice(0, 2); // 09 or 07
  const part1 = norm.slice(2, 4);
  const part2 = norm.slice(4, 7);
  const part3 = norm.slice(7, 10);
  return `${prefix} ${part1} ${part2} ${part3}`;
}
