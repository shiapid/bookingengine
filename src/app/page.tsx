export default function Home() {
  return (
    <main className="mx-auto max-w-[1240px] px-6 sm:px-10">
      <header className="flex flex-wrap items-center justify-between gap-4 border-b border-navy/10 py-6">
        <div className="flex items-center gap-3">
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <p className="text-xl font-extrabold tracking-tight">SHIAP <span className="font-medium">Booking Engine</span></p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <a className="text-sm font-bold text-navy hover:underline" href="/api/health">
            Status layanan <span aria-hidden="true">↗</span>
          </a>
          <a className="rounded-lg bg-navy px-3 py-2 text-sm font-bold text-white hover:bg-action" href="/login">Masuk mitra</a>
        </div>
      </header>

      <section className="grid items-center gap-12 py-16 lg:grid-cols-[1fr_0.9fr] lg:py-28">
        <div>
          <p className="mb-5 flex items-center gap-2 text-sm font-bold text-navy/75">
            <span className="size-2 rounded-full bg-orange" aria-hidden="true" />
            Platform reservasi
          </p>
          <h1 className="max-w-[12ch] text-5xl leading-[1.05] font-extrabold tracking-[-0.065em] sm:text-7xl">
            Satu tempat untuk <span className="text-action">reservasi bisnis.</span>
          </h1>
          <p className="mt-6 max-w-[44ch] text-base leading-8 text-navy/75 sm:text-lg">
            SHIAP Booking Engine sedang disiapkan untuk membantu tim mengelola jadwal dan reservasi dalam ruang kerja masing-masing.
          </p>
          <a
            className="mt-8 inline-flex items-center gap-4 rounded-xl bg-navy px-5 py-3 text-sm font-bold text-white hover:bg-action"
            href="#fondasi"
          >
            Lihat fondasi platform <span aria-hidden="true">↓</span>
          </a>
        </div>

        <div className="calendar-illustration" aria-hidden="true">
          <div className="calendar">
            <div className="calendar-top">
              <span /><span /><span />
            </div>
            <div className="calendar-grid">
              {Array.from({ length: 21 }, (_, index) => <span key={index} />)}
            </div>
          </div>
        </div>
      </section>

      <section id="fondasi" className="scroll-mt-6 border-t border-navy/10 py-10" aria-labelledby="fondasi-heading">
        <h2 id="fondasi-heading" className="mb-6 text-2xl font-extrabold tracking-tight">Fondasi platform</h2>
        <dl className="grid gap-6 md:grid-cols-3">
          <div>
            <dt className="font-extrabold">Ruang kerja terpisah</dt>
            <dd className="mt-1 text-sm leading-6 text-navy/75">Keanggotaan menentukan ruang kerja yang dapat diakses.</dd>
          </div>
          <div>
            <dt className="font-extrabold">Akun pengguna</dt>
            <dd className="mt-1 text-sm leading-6 text-navy/75">Fondasi autentikasi menggunakan Supabase Auth.</dd>
          </div>
          <div>
            <dt className="font-extrabold">Penyimpanan privat</dt>
            <dd className="mt-1 text-sm leading-6 text-navy/75">Akses berkas dibatasi oleh keanggotaan ruang kerja.</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
