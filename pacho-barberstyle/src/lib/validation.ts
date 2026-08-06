/** Input validation shared by the booking form and the data layer. */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

export function isValidEmail(value: string): boolean {
  return EMAIL_RE.test(value.trim());
}

/**
 * Accepts Swiss numbers in national (`079 123 45 67`) or international
 * (`+41 79 123 45 67`) form, plus other international numbers — Geneva has a
 * large cross-border and expat clientele with French and foreign mobiles.
 */
export function isValidPhone(value: string): boolean {
  const digits = value.replace(/[^\d+]/g, "");
  if (digits.startsWith("00")) return digits.length >= 12 && digits.length <= 17;
  if (digits.startsWith("+")) return digits.length >= 11 && digits.length <= 16;
  if (digits.startsWith("0")) return digits.length === 10;
  return false;
}

/** Store phone numbers in E.164 so reminders and WhatsApp links just work. */
export function normalizePhone(value: string): string {
  const raw = value.replace(/[^\d+]/g, "");
  if (raw.startsWith("+")) return raw;
  if (raw.startsWith("00")) return `+${raw.slice(2)}`;
  if (raw.startsWith("0")) return `+41${raw.slice(1)}`;
  return raw;
}

export function formatPhone(e164: string): string {
  const m = /^\+41(\d{2})(\d{3})(\d{2})(\d{2})$/.exec(e164);
  return m ? `+41 ${m[1]} ${m[2]} ${m[3]} ${m[4]}` : e164;
}

export function isValidName(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length >= 2 && trimmed.length <= 80;
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Reference shown to the customer. Unambiguous alphabet — no O/0, I/1. */
export function generateReference(): string {
  const alphabet = "ACDEFGHJKLMNPQRSTUVWXYZ23456789";
  let out = "";
  for (let i = 0; i < 6; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return `PB-${out}`;
}

export function generateToken(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}
