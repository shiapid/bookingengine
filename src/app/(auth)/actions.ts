"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { recoveryCodeCookie, recoveryCookies } from "@/lib/auth/cookies";
import { field, isRecoveryCode, parseEmail, parseLogin, validateNewPassword, type FormState } from "@/lib/auth/validation";
import { createRecoveryClient } from "@/lib/supabase/recovery";
import { createClient } from "@/lib/supabase/server";

export async function login(_: FormState, form: FormData): Promise<FormState> {
  const credentials = parseLogin(form);
  if (!credentials) return { error: "Masukkan alamat email dan kata sandi yang valid." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(credentials);
  if (error) {
    return { error: error.code === "over_request_rate_limit"
      ? "Terlalu banyak percobaan. Silakan coba lagi dalam beberapa menit."
      : "Tidak bisa masuk. Periksa email dan kata sandi, lalu coba lagi." };
  }

  redirect("/workspace");
}

export async function requestPasswordReset(_: FormState, form: FormData): Promise<FormState> {
  const email = parseEmail(form);
  if (!email) return { error: "Masukkan alamat email yang valid." };

  const supabase = await createRecoveryClient();
  const origin = process.env.NODE_ENV === "development" ? "http://localhost:3000" : "https://dev-booking.shiap.id";
  await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${origin}/auth/recovery` });

  return { success: "Jika email terdaftar, tautan reset akan dikirim. Buka tautan di browser yang sama dalam waktu satu jam." };
}

export async function resetPassword(_: FormState, form: FormData): Promise<FormState> {
  const validation = validateNewPassword(form);
  if (validation.error) return validation;

  const cookieStore = await cookies();
  const code = cookieStore.get(recoveryCodeCookie)?.value ?? null;
  if (!isRecoveryCode(code)) return { error: "Tautan reset tidak valid atau kedaluwarsa. Minta tautan baru." };

  const supabase = await createRecoveryClient();
  let recoveryVerified = false;
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === "PASSWORD_RECOVERY") recoveryVerified = true;
  });
  const { error: verificationError, data } = await supabase.auth.exchangeCodeForSession(code)
    .finally(() => subscription.unsubscribe());
  cookieStore.set(recoveryCodeCookie, "", { ...recoveryCookies, maxAge: 0 });
  if (verificationError || !data.session || !recoveryVerified) {
    return { error: "Tautan reset tidak valid atau sudah digunakan. Minta tautan baru." };
  }

  const { error } = await supabase.auth.updateUser({ password: field(form, "password") });
  await supabase.auth.signOut({ scope: "local" });
  if (error) return { error: "Kata sandi belum diubah. Minta tautan baru dan pilih kata sandi yang berbeda." };

  // Clear an existing browser session too so the next visit requires the new credentials.
  const browserSession = await createClient();
  await browserSession.auth.signOut({ scope: "local" });
  redirect("/login?status=password-updated");
}

export async function logout(): Promise<FormState> {
  const supabase = await createClient();
  const { error } = await supabase.auth.signOut({ scope: "local" });
  if (error) return { error: "Belum bisa keluar. Coba lagi." };
  redirect("/login?status=signed-out");
}
