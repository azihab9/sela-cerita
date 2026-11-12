# Sela Cerita — Domain & Migration Plan

Dokumen ini menjadi panduan saat Sela Cerita siap diluncurkan dengan domain sendiri. Jangan melakukan perpindahan DNS atau mengganti URL produksi sebelum domain benar-benar dibeli dan konfigurasi hosting siap.

## Prinsip arsitektur

- GitHub menjadi sumber kode (source of truth).
- Frontend tetap berupa HTML, CSS, dan JavaScript statis selama sesuai kebutuhan.
- Supabase menangani autentikasi, PostgreSQL, dan private object storage.
- URL domain tidak boleh ditanam berulang kali di banyak file. Gunakan satu konfigurasi per lingkungan saat domain resmi ditetapkan.
- Data project customer dan file foto harus tetap memiliki relasi kepemilikan serta kebijakan akses server-side (RLS/Storage policies).

## Tahap domain

### Tahap A — Development saat ini
- Landing page: GitHub Pages.
- Dashboard/editor: GitHub Pages di bawah `/app/`.
- Auth, database, dan foto: Supabase.
- Jangan menambahkan file `CNAME` sebelum domain dimiliki dan DNS diarahkan dengan benar.

### Tahap B — Domain resmi
Target alamat yang disarankan:
- `https://selacerita.com` — landing page dan katalog.
- `https://app.selacerita.com` — login, dashboard, dan editor.
- URL publik customer ditentukan sebelum fitur publish diluncurkan. Pilih satu pola yang konsisten, misalnya `https://selacerita.com/s/slug` atau subdomain khusus.

Subdomain `app` dan domain utama dapat diarahkan ke hosting frontend yang sama atau berbeda. Pemilihan provider hosting dilakukan berdasarkan kebutuhan, bukan sebelum ada kebutuhan nyata.

### Tahap C — Checklist cutover domain
1. Beli domain dan aktifkan DNS serta HTTPS pada hosting pilihan.
2. Deploy dan uji landing page, auth, dashboard, editor, serta halaman publik pada domain baru.
3. Tambahkan URL baru di Supabase Authentication > URL Configuration:
   - Site URL ke alamat aplikasi produksi yang dipilih.
   - Redirect URLs untuk callback auth yang tepat (termasuk halaman dashboard).
4. Periksa semua redirect signup, login, reset password, dan email confirmation.
5. Periksa CORS/allowed origins jika kelak backend tambahan digunakan.
6. Uji akses data lintas akun: akun A tidak boleh membaca/mengubah project atau foto akun B.
7. Uji signed URL foto dan perilaku setelah refresh.
8. Pertahankan URL GitHub Pages sementara sebagai fallback selama masa transisi.
9. Setelah semua tes lolos, tetapkan domain baru sebagai URL utama dan perbarui tautan pemasaran.

## Migrasi hosting bukan migrasi backend

Mengganti GitHub Pages ke hosting frontend lain umumnya hanya memindahkan file statis dan konfigurasi domain. Supabase dapat tetap digunakan sehingga database, akun, dan foto tidak perlu dipindahkan.

Jika suatu hari Supabase juga perlu diganti:
- ekspor dan verifikasi database PostgreSQL;
- rencanakan pemindahan file Storage beserta metadata/path;
- migrasikan identitas pengguna dengan prosedur yang didukung provider atau minta pengguna melakukan autentikasi ulang/reset password bila diperlukan;
- pindahkan dan uji ulang aturan akses/RLS;
- lakukan cutover hanya setelah backup dan rekonsiliasi data diverifikasi.

## Aturan keamanan

- Publishable/anon key boleh berada di frontend; akses data harus dilindungi RLS dan Storage policies.
- Jangan pernah memasukkan Supabase `service_role`/secret key, password database, atau token admin ke repository frontend.
- Backup database dan file foto secara terpisah dan uji pemulihannya.
- Batasi ukuran/jenis upload dan pantau penggunaan Storage serta bandwidth.
- Jangan menjanjikan kapasitas pengguna tertentu sebelum melihat batas paket dan melakukan load test.

## Kapan perlu upgrade?

Pantau metrik Supabase (database size, egress, storage, auth, compute), error rate, waktu muat, dan trafik. Upgrade atau pindah provider ketika metrik nyata mendekati batas atau performa tidak memenuhi kebutuhan customer—bukan hanya karena jumlah akun bertambah.
