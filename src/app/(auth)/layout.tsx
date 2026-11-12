import Link from "next/link";
import type { ReactNode } from "react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen lg:grid-cols-[minmax(340px,0.9fr)_1.1fr]">
      <aside className="auth-aside px-6 py-6 text-white sm:px-12 lg:flex lg:flex-col lg:justify-between lg:p-14">
        <Link href="/" className="inline-flex items-center gap-3 text-sm font-extrabold text-white sm:text-base">
          <span className="brand-mark border border-white/25" aria-hidden="true"><span /></span>
          SHIAP Booking Engine
        </Link>
        <div className="hidden max-w-md lg:block">
          <p className="text-5xl font-extrabold leading-[1.1] tracking-tight">Ruang kerja untuk mitra SHIAP.</p>
          <p className="mt-5 leading-7 text-blue-100">Akses properti yang ditautkan ke akun Anda.</p>
        </div>
        <div aria-hidden="true" className="hidden h-10 lg:block" />
      </aside>
      <div className="grid place-items-center px-5 py-10 sm:px-10 lg:py-16">
        <section className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">{children}</section>
      </div>
    </main>
  );
}
