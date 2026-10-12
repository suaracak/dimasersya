# Panduan Publikasi & Deploy Gratis

Aplikasi **Editor Akademik Dimas (Versi Publik)** ini dirancang **100% statis (client-side)** tanpa ketergantungan server Node.js. Artinya, Anda dapat mempublikasikannya secara **gratis seumur hidup** ke berbagai layanan hosting statis terpercaya seperti **GitHub Pages**, **Vercel**, **Cloudflare Pages**, atau **Netlify**.

---

## 🔒 Mengapa Aman & API Key Tidak Bocor?

1. **Zero-Server Backend**: Tidak ada server atau database perantara yang menampung API key Anda.
2. **BYOK (Bring Your Own Key)**: Setiap pengguna/pengunjung memasukkan kunci API Anthropic mereka sendiri di browser.
3. **Penyimpanan Lokal Saja**: Kunci API hanya disimpan di browser pengguna (`localStorage` atau memori sesi) dan tidak pernah masuk ke kode sumber publik di GitHub atau server hosting.
4. **Koneksi Langsung Resmi**: Panggilan API dikirim langsung dari browser pengguna ke endpoint resmi Anthropic (`https://api.anthropic.com/v1/messages`) menggunakan header resmi `anthropic-dangerous-direct-browser-access: true`.
5. **Jalur Chat Tanpa Kunci**: Pengunjung yang tidak memiliki API key tetap dapat memakai aplikasi ini secara penuh melalui jalur *Sunting melalui chat* (salin prompt gratis).

---

## Opsi 1: Deploy ke GitHub Pages (Sangat Direkomendasikan & Gratis)

GitHub Pages adalah opsi paling praktis jika Anda sudah memiliki akun GitHub.

### Langkah-langkah:
1. **Buat Repositori Baru di GitHub**:
   - Buka [github.com/new](https://github.com/new).
   - Beri nama repositori, misalnya: `editor-akademik`.
   - Pilih visibilitas **Public**.
   - Klik **Create repository**.

2. **Unggah Berkas dari Folder Ini**:
   - Buka folder `editor-akademik-dimas-publik`.
   - Unggah semua berkas di folder ini (`index.html`, `gaya.css`, `aplikasi.js`, dan berkas `.js` lainnya) ke repositori Anda.
   - *Jika memakai Git CLI*:
     ```bash
     cd editor-akademik-dimas-publik
     git init
     git add .
     git commit -m "Inisialisasi Editor Akademik Dimas Publik"
     git branch -M main
     git remote add origin https://github.com/<username-anda>/<nama-repo>.git
     git push -u origin main
     ```

3. **Aktifkan Fitur GitHub Pages**:
   - Masuk ke tab **Settings** di halaman repositori GitHub Anda.
   - Pada menu sebelah kiri, klik **Pages**.
   - Pada bagian **Build and deployment** > **Branch**:
     - Pilih branch: **`main`**
     - Pilih folder: **`/ (root)`**
     - Klik **Save**.

4. **Selesai!**
   - Dalam 1–2 menit, web Anda akan aktif di alamat:
     `https://<username-anda>.github.io/<nama-repo>/`

---

## Opsi 2: Deploy ke Vercel (Otomatis & Gratis)

Vercel memberikan performa super cepat dengan sertifikat SSL (HTTPS) otomatis dan domain gratis `*.vercel.app`.

### Cara A: Melalui Dashboard Vercel (Paling Mudah)
1. Unggah folder ini ke repositori GitHub Anda (seperti langkah di Opsi 1).
2. Masuk ke [vercel.com](https://vercel.com) (login dengan akun GitHub).
3. Klik tombol **Add New...** > **Project**.
4. Pilih repositori GitHub Anda, lalu klik **Import**.
5. Pada bagian **Framework Preset**, biarkan **Other** (karena ini web statis murni).
6. Klik **Deploy**.
7. Tunggu beberapa detik, situs Anda langsung aktif di `https://<nama-proyek>.vercel.app`!

### Cara B: Melalui Terminal (Vercel CLI)
Jika Anda memiliki Node.js di komputer:
```bash
cd editor-akademik-dimas-publik
npx vercel
```
Ikuti instruksi singkat di terminal (tekan Enter untuk opsi default). Situs Anda akan langsung ter-deploy!

---

## 🛠️ Pengujian Lokal Sebelum Deploy

Aplikasi ini sekarang sudah dilengkapi dengan `bundle.js` sehingga dapat dibuka dan diuji secara lokal dengan sangat mudah:

### Cara 1: Langsung Buka di Browser (Paling Praktis)
- Cukup **klik dua kali berkas `index.html`** di File Explorer.
- Tombol **🔑 Atur Kunci API**, validasi kata KBBI, pembuatan prompt, diff perbandingan, dan penyimpanan kunci lokal (`localStorage`) akan langsung aktif tanpa perlu menginstal apa pun.

### Cara 2: Menggunakan Berkas Launcher Otomatis (`jalankan-lokal.bat`)
- Cukup **klik dua kali berkas `jalankan-lokal.bat`**.
- Skrip ini akan secara otomatis mendeteksi Python, Node.js (`npx serve`), atau PowerShell bawaan Windows untuk membuat server lokal di `http://localhost:8000` dan langsung membuka peramban Anda.
- Sangat direkomendasikan jika peramban Anda menerapkan pembatasan ketat terhadap panggilan API eksternal dari protokol `file://`.

### Cara 3: Menggunakan Live Server di VS Code
- Klik kanan pada `index.html` > **Open with Live Server**.

