# SHIAP Booking Engine

SHIAP Booking Engine menggunakan Next.js App Router, TypeScript, Tailwind CSS, dan Supabase. Mitra masuk di `/login` untuk membuka `/workspace`. Fitur reservasi, pembayaran, dan manajemen properti belum tersedia.

## Pengembangan lokal

1. Gunakan versi Node.js pada [.nvmrc](.nvmrc).
2. Jalankan `npm ci`.
3. Untuk mengembangkan fitur Supabase, salin `.env.example` ke `.env.local` dan isi URL serta publishable key proyek lokal. Halaman awal dan endpoint health dapat dijalankan tanpa konfigurasi Supabase.
4. Jalankan `npm run dev` dan buka [http://localhost:3000](http://localhost:3000).

| Perintah | Pemeriksaan |
| --- | --- |
| `npm run lint` | ESLint untuk kode aplikasi dan konfigurasi |
| `npm run typecheck` | Tipe rute Next.js dan TypeScript strict |
| `npm test` | Unit test autentikasi, pemilihan tenant, dan kontrak endpoint health |
| `npm run build` | Build production dan output standalone |

`GET /api/health` mengembalikan HTTP 200 dengan `{"status":"ok","service":"shiap-booking-engine"}` dan `Cache-Control: no-store`. Pemeriksaan ini menguji ketersediaan proses aplikasi. Koneksi database dan Storage diperiksa terpisah saat memvalidasi integrasi Supabase.

## Supabase

- Gunakan proyek Supabase khusus Booking Engine staging. Atur **Auth Site URL** ke `https://dev-booking.shiap.id` dan izinkan redirect persis ke `https://dev-booking.shiap.id/auth/recovery`. Nonaktifkan signup publik dan anonymous sign-in.
- Buat akun mitra melalui **Authentication → Users → Add user**. Administrator menautkan ID akun ke tenant melalui `tenant_members`. Role yang tersedia adalah `admin` dan `member`. Akses dashboard diperiksa dengan identitas server dan policy RLS pada setiap permintaan.
- Reset kata sandi memakai tautan bawaan Supabase dan PKCE. Pengguna membuka tautan dalam browser yang sama, lalu menentukan kata sandi baru. Untuk mengirim email ke mitra di luar tim proyek Supabase, konfigurasikan custom SMTP yang telah disetujui untuk proyek tersebut.
- Untuk pengembangan dengan Docker dan Supabase CLI, jalankan `supabase start` lalu `supabase db reset --local`. Ambil URL dan publishable key lokal dari `supabase status`.
- Untuk staging, jalankan `supabase link --project-ref <ref-staging>`, periksa target dengan `supabase migration list --linked`, lalu jalankan `supabase db push --linked --dry-run` sebelum `supabase db push --linked`. Gunakan project ref staging pada setiap langkah yang menargetkan proyek cloud.
- Migrasi membuat tabel `tenants` dan `tenant_members` dengan RLS. Pengguna terautentikasi hanya dapat membaca keanggotaan sendiri dan tenant yang diikutinya. Provisioning tenant dan keanggotaan dilakukan melalui akses administratif proyek.
- Bucket privat `tenant-files` menggunakan jalur `<tenant_uuid>/<nama-berkas>`. Anggota dapat membaca berkas tenant sendiri. Admin tenant juga dapat membuat, memperbarui, dan menghapus berkas.
- Proxy memperbarui sesi cookie untuk `/login` dan `/workspace`. Untuk memeriksa proteksi HTTP dan callback tanpa akun, atur `BOOKING_AUTH_TEST_ORIGIN` ke URL build yang sedang berjalan dan jalankan `node --test test/auth-http.test.mjs`.

## Branch dan GitHub Actions

| Branch | Tujuan |
| --- | --- |
| `main` | Production |
| `develop` | Staging |
| `feature/*` | Pengembangan fitur melalui pull request |

Workflow [CI](.github/workflows/ci.yml) menjalankan install, lint, typecheck, unit test, simulasi rollback, dan build pada push yang sesuai serta PR ke `main` atau `develop`. Setelah CI lulus pada push atau dispatch dari `develop`, workflow [Staging](.github/workflows/staging.yml) dapat membangun artefak di GitHub Environment `staging`. Deployment SSH hanya berjalan dari event push ke `develop` ketika `STAGING_SSH_DEPLOY_ENABLED=true`.

Untuk menjalankan pengemasan, buat Environment `staging`, batasi branch deployment ke `develop`, dan isi dua **environment variables** berikut. Setelah keduanya tersedia, atur **repository variable** `STAGING_PACKAGE_ENABLED=true`.

| Environment variable | Nilai |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | URL proyek Supabase Booking Engine staging |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Publishable key proyek staging dengan awalan `sb_publishable_` |

Kedua nilai publik dibaca pada waktu build karena Next.js menyematkan `NEXT_PUBLIC_*` ke bundle. Build standalone menyertakan `server.js`, `.next/static`, dan `public` jika tersedia. Arsip berisi satu rilis yang dibangun dari SHA Git yang sama dengan CI.

## Deployment staging di cPanel

CloudLinux Setup Node.js App memakai Node.js 24.22.3, mode **Production**, dan startup file `server.js` di `/home/shiapsit/bookingengine-staging`. Rilis manual pertama berada di `release-6bc972e`. Launcher CommonJS di application root memanggil `import("./release-6bc972e/server.js")`, sehingga Passenger tetap memuat CommonJS dan Next.js menjalankan entry point ESM di dalam rilis. `server.placeholder.js` menyimpan halaman bawaan cPanel dan bukan salinan rilis Booking Engine.

Job deploy mengambil artefak berdasarkan ID dari job package pada run yang sama. Runner memeriksa SHA-256, jalur dan tipe entri tar, serta file yang diperlukan. [Skrip transfer](scripts/staging/transfer.sh) memakai SSH dengan host key pinning. [Skrip server](scripts/staging/deploy.sh) memeriksa checksum ulang, menyimpan salinan launcher saat ini, lalu mengekstrak rilis ke `release-<sha>-<run>-<attempt>`. Hanya launcher CommonJS baru yang dipindah atomik ke `server.js`. Application root dan direktori rilis adalah direktori biasa. Aplikasi menggunakan aset dan dependency dari rilisnya sendiri.

Setelah pergantian launcher, skrip memanggil restart Node.js Selector dan memeriksa HTTPS homepage, stylesheet, serta health JSON. Header `X-SHIAP-Release` membuktikan SHA yang disajikan Passenger, dan `X-SHIAP-Release-Id` membedakan percobaan deployment untuk SHA yang sama. Jika restart atau pemeriksaan gagal, skrip mengembalikan launcher lama secara atomik, restart lagi, dan mengulangi pemeriksaan. Rilis lama dipertahankan. Log dan backup launcher disimpan di `/home/shiapsit/bookingengine-staging/.deploy`. Jika rollback otomatis gagal, pulihkan backup yang disebut di log menjadi `server.js` melalui File Manager, gunakan **Restart** pada aplikasi staging, dan periksa HTTPS lagi.

| Pengaturan GitHub | Nama dan nilai |
| --- | --- |
| Environment `staging` variables | `STAGING_SSH_HOST` untuk origin SSH hosting, `STAGING_SSH_PORT` untuk port SSH provider, `STAGING_SSH_USER=shiapsit` |
| Environment `staging` secrets | `STAGING_SSH_PRIVATE_KEY` khusus pipeline ini dan `STAGING_SSH_KNOWN_HOSTS` berisi entri OpenSSH dari host key yang sudah diverifikasi |
| Repository variables | `STAGING_PACKAGE_ENABLED=true` dan `STAGING_SSH_DEPLOY_ENABLED=true` setelah akses dan restart SSH teruji |
| Repository variable opsional | `STAGING_ROLLBACK_DRILL_SHA`, kosong untuk operasi normal |

Sebelum mengaktifkan deployment, otorisasi hanya public key baru di cPanel. Cocokkan fingerprint SSH dengan data dari provider atau host key yang dibaca lewat sesi administrasi yang sudah dipercaya. Untuk port nonstandar, entri known_hosts memakai bentuk `[host]:port`. Uji login noninteraktif, akses tulis pada root staging, Node.js pada `/home/shiapsit/nodevenv/bookingengine-staging/24/bin/node`, dan perintah berikut. Perintah harus mengembalikan JSON dengan `"result":"success"`, lalu staging harus lolos pemeriksaan HTTPS.

```sh
cloudlinux-selector restart --json --interpreter nodejs --domain dev-booking.shiap.id --app-root bookingengine-staging
```

Untuk latihan rollback, setelah deployment pertama lulus, set `STAGING_ROLLBACK_DRILL_SHA` ke SHA penuh terbaru di `develop` dan pilih **Re-run all jobs** pada run push SHA tersebut. Pipeline menguji rilis kandidat yang sehat, lalu memicu jalur rollback dengan sengaja. Job harus gagal dengan log `Rollback verified` dan staging tetap sehat. Hapus variabel latihan setelah hasil diverifikasi.

## Dokumentasi

- [Next.js standalone output](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)
- [Supabase Auth SSR untuk Next.js](https://supabase.com/docs/guides/auth/server-side/nextjs)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Panduan aplikasi Node.js cPanel](https://docs.cpanel.net/knowledge-base/web-services/how-to-install-a-node.js-application/)
