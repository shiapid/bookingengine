import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { LogoutForm } from "@/app/(auth)/auth-form";
import { createClient } from "@/lib/supabase/server";
import { selectTenant, type Tenant } from "@/lib/tenants/selection";
import { getMemberships } from "@/lib/tenants/server";

export const metadata: Metadata = { title: "Ruang Kerja | SHIAP Booking Engine" };

const roles: Record<Tenant["role"], string> = { admin: "Administrator", member: "Anggota" };

export default async function WorkspacePage({ searchParams }: { searchParams: Promise<{ tenant?: string | string[] }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user || user.is_anonymous) redirect("/login");

  const memberships = await getMemberships(supabase, user.id);
  const { tenant } = await searchParams;
  const selection = memberships ? selectTenant(memberships, tenant) : null;
  if (selection?.status === "denied") notFound();
  const active = selection?.status === "selected" ? selection.tenant : null;

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[16rem_minmax(0,1fr)]">
      <aside className="bg-navy px-5 py-4 text-white lg:sticky lg:top-0 lg:h-screen lg:px-5 lg:py-7">
        <Link href="/workspace" className="flex items-center gap-3 px-1 text-sm font-extrabold">
          <span className="brand-mark border border-white/25" aria-hidden="true"><span /></span>
          SHIAP Booking Engine
        </Link>
        <nav aria-label="Navigasi ruang kerja" className="mt-4 flex flex-wrap gap-2 lg:mt-10 lg:grid">
          <Link href={active ? `/workspace?tenant=${encodeURIComponent(active.id)}` : "/workspace"} aria-current="page" className="rounded-lg bg-white/15 px-3 py-2 text-sm font-extrabold text-white">
            Ringkasan
          </Link>
          {["Properti", "Reservasi", "Pengaturan"].map((label) => (
            <span key={label} aria-disabled="true" className="flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-sm text-blue-100">
              {label}<span className="text-xs text-blue-200">Segera</span>
            </span>
          ))}
        </nav>
      </aside>

      <div className="min-w-0">
        <header className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 bg-white px-5 py-4 sm:px-9">
          <div className="min-w-0 flex-1">
            <p className="break-words text-sm font-extrabold">{active?.name ?? "Ruang kerja mitra"}</p>
            <p className="break-all text-xs text-slate-600">{user.email ?? "Akun mitra"}{active && ` · ${roles[active.role]}`}</p>
          </div>
          <LogoutForm />
        </header>
        <main className="mx-auto max-w-6xl px-5 py-8 sm:px-9 sm:py-12">
          {active && memberships ? (
            <>
              <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-action">Ringkasan ruang kerja</p>
                  <h1 className="mt-2 break-words text-3xl font-extrabold tracking-tight sm:text-4xl">Selamat datang</h1>
                  <p className="mt-2 break-words text-sm leading-6 text-slate-600">Anda sedang melihat ruang kerja {active.name}.</p>
                </div>
                {memberships.length > 1 && (
                  <details className="w-full rounded-xl border border-slate-200 bg-white p-3 sm:w-auto sm:min-w-56">
                    <summary className="cursor-pointer text-sm font-extrabold">Ganti ruang kerja</summary>
                    <ul className="mt-2 grid gap-1">
                      {memberships.map(({ id, name }) => (
                        <li key={id}>
                          <Link
                            href={`/workspace?tenant=${encodeURIComponent(id)}`}
                            aria-current={id === active.id ? "true" : undefined}
                            className="block break-words rounded-md px-2 py-2 text-sm hover:bg-slate-100 aria-current:bg-blue-50 aria-current:font-extrabold"
                          >
                            {name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {[
                  { title: "Properti", text: "Detail dan pengelolaan properti akan tersedia di sini." },
                  { title: "Reservasi", text: "Ringkasan reservasi akan muncul setelah fitur tersedia." },
                ].map(({ title, text }) => (
                  <section key={title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                    <h2 className="text-sm font-extrabold">{title}</h2>
                    <p className="mt-4 text-2xl font-extrabold tracking-tight">Belum tersedia</p>
                    <p className="mt-2 text-sm leading-6 text-slate-600">{text}</p>
                  </section>
                ))}
              </div>
            </>
          ) : (
            <section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-9">
              <h1 className="text-2xl font-extrabold tracking-tight">
                {selection?.status === "empty" ? "Akun belum terhubung ke properti" : "Ruang kerja belum dapat dimuat"}
              </h1>
              <p className="mt-3 text-sm leading-6 text-slate-600">
                {selection?.status === "empty"
                  ? "Hubungi administrator mitra atau tim SHIAP untuk menautkan akun Anda ke properti."
                  : "Muat ulang halaman. Jika masalah berlanjut, hubungi tim SHIAP."}
              </p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
