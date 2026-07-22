// Small shared helpers used across lib + API routes.

export function csvToList(csv: string | null | undefined): string[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function listToCsv(list: string[]): string {
  return list.map((s) => s.trim()).filter(Boolean).join(",");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Canonicalize to a 10-digit US number: strip non-digits and a leading country
// code "1". This keeps lead intake, the suppression list, and the inbound SMS
// webhook keyed identically regardless of input format (e.g. "+1 (617)…" vs
// "617…") so opt-outs reliably match.
export function normalizePhone(phone: string): string {
  const digits = phone.replace(/[^\d]/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  return digits;
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// Valid once canonicalized to exactly 10 US digits.
export function isValidPhone(phone: string): boolean {
  return normalizePhone(phone).length === 10;
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
