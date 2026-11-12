import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AuthForm } from "../auth-form";

export const metadata: Metadata = { title: "Masuk Mitra | SHIAP Booking Engine" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (data.user && !data.user.is_anonymous) redirect("/workspace");

  const notice = status === "password-updated"
    ? "Kata sandi berhasil diubah. Silakan masuk dengan kata sandi baru."
    : status === "signed-out" ? "Anda telah keluar dari akun." : null;

  return (
    <>
      <h1 className="auth-title">Masuk ke akun mitra</h1>
      <p className="auth-description">Gunakan akun yang diberikan administrator untuk membuka ruang kerja Anda.</p>
      {notice && <p className="form-success mb-5" role="status">{notice}</p>}
      <AuthForm mode="login" />
    </>
  );
}
