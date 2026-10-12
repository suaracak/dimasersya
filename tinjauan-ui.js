// Provenance display shared by the result panel and export. Not a semantic score.
export function ringkasTinjauan(hasil, diminta = false, disuntingManual = false) {
  const tidak = (status, judul, pesan) => ({ status, judul, pesan, draf: null, penyedia: '' });
  if (hasil.sumber === 'chat') return tidak('manual', 'Impor manual', 'Aplikasi belum menjalankan peninjau model terpisah untuk hasil impor ini.');
  if (hasil.sumber === 'demo') return tidak('tidak_tersedia', 'Tanpa peninjau model', 'Demo hanya merapikan mekanis; tidak ada tinjauan model.');
  const t = hasil.tinjauan;
  if (!t && !diminta) return tidak('tidak_diminta', 'Satu tahap', 'Tinjauan model terpisah tidak diminta.');
  if (!t || !['selesai', 'gagal', 'tidak_tersedia'].includes(t.status) || typeof t.draf !== 'string' || !t.draf.trim()) {
    return tidak('tidak_tersedia', 'Status tinjauan tidak tersedia', 'Hasil tidak memuat metadata tinjauan yang lengkap. Jangan menganggapnya sudah ditinjau.');
  }
  const penyedia = [t.penyedia, t.model].filter((v) => typeof v === 'string' && v.trim()).join(' · ');
  if (disuntingManual) return { status: 'diubah_manual', judul: 'Hasil sudah disunting manual', pesan: 'Teks saat ini berbeda dari keluaran terakhir model. Perubahan manual belum ditinjau model; tinjau kembali maknanya.', draf: t.draf, penyedia };
  const pesan = typeof t.pesan === 'string' ? t.pesan : '';
  return {
    status: t.status,
    judul: t.status === 'selesai' ? 'Dua tahap model selesai' : t.status === 'gagal' ? 'Peninjau gagal; draf dipertahankan' : 'Peninjau tidak tersedia',
    pesan: `${pesan} Ini tinjauan editorial, bukan verifikasi fakta atau bukti kesetaraan makna.`.trim(),
    draf: t.draf,
    penyedia,
  };
}

export function masukanSama(a, b) {
  return ['teks', 'instruksi', 'istilah', 'mode', 'nada', 'arel', 'tujuan', 'contohGaya', 'tinjau'].every((k) => a[k] === b[k]);
}
