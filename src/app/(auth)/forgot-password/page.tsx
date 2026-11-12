import type { Metadata } from "next";
import Link from "next/link";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Lupa Kata Sandi | SHIAP Booking Engine" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="auth-title">Lupa kata sandi?</h1>
      <p className="auth-description">Masukkan email akun mitra untuk meminta tautan reset.</p>
      <AuthForm mode="forgot" />
      <Link href="/login" className="mt-6 inline-block text-sm font-bold text-action">Kembali ke halaman masuk</Link>
    </>
  );
}
