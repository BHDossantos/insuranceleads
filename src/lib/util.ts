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

export function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// US phone: 10 digits, or 11 starting with 1.
export function isValidPhone(phone: string): boolean {
  const d = normalizePhone(phone);
  return d.length === 10 || (d.length === 11 && d.startsWith("1"));
}

export function safeJson<T>(value: string | null | undefined, fallback: T): T {
  if (!value) return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
