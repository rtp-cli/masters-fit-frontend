/**
 * Phone numbers for SMS sign-in. US + Canada (+1) only, matching the backend's
 * normalizeUsPhone — the server is the authority, this just gives instant
 * feedback and a nicely formatted field.
 */

/** The 10 national digits from whatever was typed (drops a leading 1). */
function nationalDigits(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) digits = digits.slice(1);
  return digits;
}

/** "+13125550123", or null when it isn't a plausible US/Canadian number yet. */
export function toUsE164(raw: string): string | null {
  const digits = nationalDigits(raw);
  if (digits.length !== 10) return null;
  if (!/^[2-9]\d{2}[2-9]\d{6}$/.test(digits)) return null;
  return `+1${digits}`;
}

/** Format as the user types: "312" → "(312", "3125550" → "(312) 555-0". */
export function formatPhoneAsTyped(raw: string): string {
  const digits = nationalDigits(raw).slice(0, 10);
  if (digits.length === 0) return "";
  if (digits.length < 4) return `(${digits}`;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/** Display form of a stored E.164 number: "+13125550123" → "(312) 555-0123". */
export function formatPhoneDisplay(phone: string | null | undefined): string {
  if (!phone) return "";
  const digits = phone.replace(/^\+1/, "");
  if (!/^\d{10}$/.test(digits)) return phone;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}
