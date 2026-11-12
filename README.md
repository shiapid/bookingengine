# SHIAP Booking Engine

Fondasi aplikasi SaaS reservasi SHIAP. Aplikasi menggunakan Next.js App Router, TypeScript, Tailwind CSS, dan Supabase. Halaman awal memperkenalkan produk dan menyediakan tautan ke status layanan. Fitur pemesanan dan antarmuka masuk akun belum tersedia.

## Pengembangan lokal

1. Gunakan versi Node.js pada [.nvmrc](.nvmrc).
2. Jalankan `npm ci`.
3. Untuk mengembangkan fitur Supabase, salin `.env.example` ke `.env.local` dan isi URL serta publishable key proyek lokal. Halaman awal dan endpoint health dapat dijalankan tanpa konfigurasi Supabase.
4. Jalankan `npm run dev` dan buka [http://localhost:3000](http://localhost:3000).

| Perintah | Pemeriksaan |
| --- | --- |
| `npm run lint` | ESLint untuk kode aplikasi dan konfigurasi |
| `npm run typecheck` | Tipe rute Next.js dan TypeScript strict |
| `npm test` | Unit test kontrak endpoint health |
| `npm run build` | Build production dan output standalone |

`GET /api/health` mengembalikan HTTP 200 dengan `{"status":"ok","service":"shiap-booking-engine"}` dan `Cache-Control: no-store`. Pemeriksaan ini menguji ketersediaan proses aplikasi. Koneksi database dan Storage diperiksa terpisah saat memvalidasi integrasi Supabase.

## Supabase

- Buat proyek Supabase khusus Booking Engine staging. Atur **Auth Site URL** ke `https://dev-booking.shiap.id`, tambahkan URL callback yang diperlukan saat alur masuk dibuat, dan nonaktifkan anonymous sign-in.
- Untuk pengembangan dengan Docker dan Supabase CLI, jalankan `supabase start` lalu `supabase db reset --local`. Ambil URL dan publishable key lokal dari `supabase status`.
- Untuk staging, jalankan `supabase link --project-ref <ref-staging>`, periksa target dengan `supabase migration list --linked`, lalu jalankan `supabase db push --linked --dry-run` sebelum `supabase db push --linked`. Gunakan project ref staging pada setiap langkah yang menargetkan proyek cloud.
- Migrasi membuat tabel `tenants` dan `tenant_members` dengan RLS. Pengguna terautentikasi hanya dapat membaca keanggotaan sendiri dan tenant yang diikutinya. Provisioning tenant dan keanggotaan dilakukan melalui akses administratif proyek.
- Bucket privat `tenant-files` menggunakan jalur `<tenant_uuid>/<nama-berkas>`. Anggota dapat membaca berkas tenant sendiri. Admin tenant juga dapat membuat, memperbarui, dan menghapus berkas.
- Client browser dan server tersedia di `src/lib/supabase`. Proxy memperbarui sesi cookie untuk rute di bawah `/workspace`. Saat rute workspace dibuat, periksa identitas pada server sebelum memberikan akses dan gunakan RLS untuk setiap operasi data tenant.

## Branch dan GitHub Actions

| Branch | Tujuan |
| --- | --- |
| `main` | Production |
| `develop` | Staging |
| `feature/*` | Pengembangan fitur melalui pull request |

Workflow [CI](.github/workflows/ci.yml) menjalankan install, lint, typecheck, unit test, dan build pada push yang sesuai dan PR ke `main` atau `develop`. Setelah CI lulus pada push atau dispatch dari `develop`, workflow [Staging](.github/workflows/staging.yml) dapat membangun artefak di GitHub Environment `staging`. Workflow ini menyiapkan artefak saja selama audit cPanel menunggu konfigurasi.

Untuk menjalankan pengemasan, buat Environment `staging`, batasi branch deployment ke `develop`, dan isi dua **environment variables** berikut. Setelah keduanya tersedia, atur **repository variable** `STAGING_PACKAGE_ENABLED=true`.

| Environment variable | Nilai |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase Booking Engine staging |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key proyek staging dengan awalan `sb_publishable_` |

Kedua nilai publik dibaca pada waktu build karena Next.js menyematkan `NEXT_PUBLIC_*` ke bundle. Build standalone menyertakan `server.js`, `.next/static`, dan `public` jika tersedia. Arsip berisi satu rilis yang dibangun dari SHA Git yang sama dengan CI.

## Audit cPanel dan aktivasi deployment

Salin nilai nonrahasia dari **Setup Node.js App** untuk staging dan, jika tersedia, untuk referensi aplikasi utama secara read-only.

| Yang perlu diverifikasi | Detail |
| --- | --- |
| Runtime | Versi Node.js yang tersedia, versi Node.js dan Next.js aplikasi referensi, arsitektur Linux, dan kompatibilitas native dependency dengan runner Ubuntu |
| Node.js App | Application root absolut, application URL, startup file, mode production, env yang dibutuhkan, dan cara Passenger menangani host serta port |
| Build dan restart | Output aplikasi referensi, dukungan untuk menjalankan `server.js` standalone, perintah restart yang didukung provider, dan lokasi log |
| SSH | Host, port, pengguna deploy staging, public host key terverifikasi, akses dari runner GitHub, serta izin untuk menulis rilis dan restart aplikasi |
| Subdomain | DNS, sertifikat HTTPS, document root, dan pemetaan `dev-booking.shiap.id` ke aplikasi staging |
| Pergantian rilis | Direktori rilis yang terpisah dan dukungan application root stabil dengan pengalihan atomik atau mekanisme setara dari provider |

Setelah metode hosting terverifikasi, pipeline SSH membutuhkan GitHub Environment secret `STAGING_SSH_PRIVATE_KEY`. Simpan host, port, user, application root, dan public host key terverifikasi sebagai konfigurasi environment. Untuk migrasi Supabase manual, gunakan autentikasi CLI dan kata sandi database proyek staging melalui mekanisme kredensial Supabase. Workflow pengemasan saat ini tidak memerlukan secret GitHub.

Urutan rilis yang akan digunakan setelah audit adalah transfer ke direktori rilis baru, aktivasi atomik, restart aplikasi staging, lalu verifikasi HTTPS dan isi respons `/api/health`. Jika pemeriksaan gagal, aktifkan kembali rilis sebelumnya, restart, dan verifikasi ulang. Deployment staging menggunakan proses production sesuai konfigurasi cPanel.

## Dokumentasi

- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Supabase Auth SSR untuk Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Panduan aplikasi Node.js cPanel](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
