import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import { recoveryCodeCookie, recoveryVerifier } from "@/lib/auth/cookies";
import { isRecoveryCode } from "@/lib/auth/validation";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Atur Kata Sandi | SHIAP Booking Engine", referrer: "no-referrer" };

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const cookieStore = await cookies();
  const code = cookieStore.get(recoveryCodeCookie)?.value ?? null;
  const hasVerifier = cookieStore.getAll().some(({ name }) => recoveryVerifier.test(name));

  return (
    <>
      <h1 className="auth-title">Atur kata sandi baru</h1>
      {status !== "invalid" && hasVerifier && isRecoveryCode(code) ? (
        <>
          <p className="auth-description">Gunakan kata sandi baru untuk masuk kembali ke akun mitra Anda.</p>
          <AuthForm mode="reset" />
        </>
      ) : (
        <>
          <p className="auth-description">Tautan reset tidak tersedia atau sudah kedaluwarsa. Minta tautan baru untuk melanjutkan.</p>
          <Link href="/forgot-password" className="primary-button block text-center">Minta tautan reset</Link>
        </>
      )}
      <Link href="/login" className="mt-6 inline-block text-sm font-bold text-action">Kembali ke halaman masuk</Link>
    </>
  );
}
