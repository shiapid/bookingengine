export type FormState = { error?: string; success?: string };

export function field(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === "string" ? value : "";
}

export function parseEmail(form: FormData) {
  const email = field(form, "email").trim().toLowerCase();
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}

export function parseLogin(form: FormData) {
  const email = parseEmail(form);
  const password = field(form, "password");
  return email && password.length > 0 && password.length <= 1024 ? { email, password } : null;
}

export function validateNewPassword(form: FormData): FormState {
  const password = field(form, "password");
  if (password.length < 12 || new TextEncoder().encode(password).length > 72) {
    return { error: "Gunakan minimal 12 karakter dan maksimal 72 byte untuk kata sandi baru." };
  }
  if (password !== field(form, "confirmPassword")) {
    return { error: "Konfirmasi kata sandi belum sama." };
  }
  return {};
}

export function isRecoveryCode(value: string | null): value is string {
  return value !== null && /^[A-Za-z0-9_-]{32,256}$/.test(value);
}
