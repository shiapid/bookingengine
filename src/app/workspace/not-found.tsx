import Link from "next/link";

export default function TenantNotFound() {
  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <section className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="text-2xl font-extrabold tracking-tight">Ruang kerja tidak tersedia</h1>
        <p className="mt-3 text-sm leading-6 text-slate-600">Pilih ruang kerja yang terhubung ke akun Anda.</p>
        <Link href="/workspace" className="mt-5 inline-block font-bold text-action">Kembali ke ruang kerja</Link>
      </section>
    </main>
  );
}
