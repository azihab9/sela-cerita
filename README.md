# Sela Cerita

**Every moment has a story.** Ruang kecil untuk cerita yang berarti.

Website personal untuk merayakan anniversary, ulang tahun, kelulusan, pernikahan, dan momen spesial lainnya.

## Teknologi
HTML, CSS, dan Vanilla JavaScript.

## Menjalankan
Buka `index.html` di browser atau gunakan static server.

## Konfigurasi WhatsApp
Isi konstanta `SELA_WHATSAPP_NUMBER` di `script.js` dengan nomor internasional tanpa tanda + (contoh format: `62812xxxxxxx`). Form saat ini hanya membuat pesan inquiry WhatsApp; belum ada database atau pembayaran otomatis.

## Struktur
- `index.html` — katalog utama
- `styles.css` — styling responsive
- `script.js` — menu dan form inquiry
- `assets/` — logo dan favicon
- `demos/` — tiga demo template

## Arsitektur akun customer
- `app/auth.html` — login dan registrasi Supabase
- `app/dashboard.html` — dashboard customer
- `app/editor.html` — Guided Editor per project
- `app/supabase-config.js` — konfigurasi Supabase public client
- `supabase/schema.sql` — schema database dan kebijakan data
- `supabase/storage.sql` — bucket foto privat dan kebijakan akses Storage

## Domain dan migrasi
Saat ini frontend dikembangkan melalui GitHub Pages dan backend menggunakan Supabase. Domain sendiri dapat ditambahkan nanti tanpa harus memindahkan database atau akun customer. Ikuti checklist pada [docs/DOMAIN-MIGRATION.md](docs/DOMAIN-MIGRATION.md) ketika domain resmi sudah dibeli.
