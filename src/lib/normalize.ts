export function normalizeText(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
}

export function normalizeEmail(value: unknown): string | undefined {
  const email = String(value ?? "").trim().toLowerCase();
  return email && email.includes("@") ? email : undefined;
}

export function normalizeBrazilPhone(value: unknown): string | undefined {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (!digits) return undefined;
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 10 || digits.length === 11) digits = `55${digits}`;
  if (digits.length < 12 || digits.length > 13 || !digits.startsWith("55")) return undefined;
  return `+${digits}`;
}

export function phoneDigits(value: unknown): string {
  return String(value ?? "").replace(/\D/g, "");
}
