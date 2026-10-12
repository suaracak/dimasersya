# Editor Akademik Dimas (Versi Publik Statis)

Aplikasi web penyuntingan dan parafrase naskah akademik bahasa Indonesia dengan **Anthropic Claude** dan **Ollama Cloud** (termasuk model gratis seperti `gpt-oss:120b`).

Aplikasi ini dapat di-deploy secara publik dan gratis di **GitHub Pages** atau **Vercel** tanpa memerlukan backend server.

---

## ✨ Fitur Utama

- **Penyuntingan Akademik Langsung**:
  - **Anthropic Claude Messages API**: Claude 3.5 Sonnet, Claude 3.5 Haiku, Claude 3 Opus.
  - **Ollama Cloud / Self-Hosted**: `gpt-oss:120b` (gratis), `llama3.3:70b`, `qwen2.5:72b`, atau model kustom lainnya.
- **100% Client-Side & Aman (BYOK)**: Kunci API dimasukkan oleh pengguna di browser dan tidak pernah dikirim ke server hosting atau pihak ketiga.
- **Pemeriksaan Kesetiaan Fakta**: Otomatis membandingkan teks awal dan hasil revisi untuk menjaga angka, satuan, sitasi, rujukan pasal/peraturan, kata hukum, atribusi, penanda kepastian/negasi, dan istilah teknis yang dikunci.
- **Tampilan Perbandingan Visual (Diff)**: Melihat kata-kata yang dihapus dan ditambahkan dengan jelas.
- **Saran Pilihan Kata Lokal**: Mendeteksi ejaan tidak baku menurut KBBI/EYD, pleonasme, dan frasa bertele-tele secara lokal tanpa kuota.
- **Jalur Chat Tanpa Kunci**: Pengguna tanpa API key tetap dapat menyusun prompt terstandarisasi untuk dijalankan di Claude atau ChatGPT web gratis.
- **Ekspor Fleksibel**: Salin hasil, unduh berkas teks `.txt`, atau unduh laporan lengkap `.md` (Markdown).

---

## 💻 Menjalankan di Komputer Lokal

1. **Cara Langsung**: Cukup klik dua kali `index.html` di File Explorer peramban Anda.
2. **Server Otomatis (Rekomendasi)**: Klik dua kali `jalankan-lokal.bat` untuk membuka server lokal otomatis di `http://localhost:8000`.

---

## 🚀 Panduan Publikasi (Deploy)

Lihat panduan lengkap langkah-demi-langkah di **[CARA-DEPLOY.md](CARA-DEPLOY.md)** untuk petunjuk gratis di:
- **GitHub Pages**
- **Vercel**

---

## 🔒 Privasi dan Keamanan API Key

Aplikasi ini menggunakan paradigma **BYOK (Bring Your Own Key)**:
- Pengguna memilih penyedia (Anthropic Claude atau Ollama Cloud) dan memasukkan API Key milik sendiri melalui menu pengaturan kunci.
- Kunci disimpan di `localStorage` peramban (atau hanya di memori sesi).
- Panggilan API dikirim langsung dari peramban ke endpoint resmi (Anthropic `api.anthropic.com` atau Ollama Cloud).
- Kunci Anda tidak pernah disimpan di server repositori GitHub maupun server hosting Vercel.
