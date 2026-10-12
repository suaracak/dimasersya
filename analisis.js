// Indikator keterbacaan lokal. Tidak mengukur kualitas substansi atau probabilitas AI.
export function analisisTeks(teks = '') {
  const kata = teks.trim().match(/\S+/g) || [];
  const paragraf = teks.trim() ? teks.trim().split(/\n\s*\n/).filter(Boolean) : [];
  const lindungi = teks.replace(/\b(?:t\.t\.|n\.d\.|et al\.|dkk\.|hlm\.|dll\.|Dr\.|Prof\.|PT\.)/gi, (s) => s.replace(/\./g, '\uE000'));
  const kalimat = lindungi.split(/(?<=[.!?])\s+(?=[\p{Lu}\d])/u).map((s) => s.trim().replace(/\uE000/g, '.')).filter(Boolean);
  const panjang = kalimat.map((s) => (s.match(/\S+/g) || []).length);
  return {
    kata: kata.length,
    paragraf: paragraf.length,
    kalimat: kalimat.length,
    panjangMaks: panjang.length ? Math.max(...panjang) : 0,
    kalimatPanjang: kalimat.map((teks, i) => ({ nomor: i + 1, kata: panjang[i], teks })).filter((s) => s.kata > 40),
  };
}

export function tinjauanKurasi(sumber, revisi, arel = false) {
  if (!arel || !revisi.trim()) return '';
  const selisih = analisisTeks(revisi).kata - analisisTeks(sumber).kata;
  return selisih > 0
    ? `Revisi bertambah ${selisih} kata. Fokus ringkas belum berarti teks lebih pendek. Tinjau tambahan kata dan sambungan antarparagraf; pertahankan hanya yang memperjelas makna. Jangan menghapus bukti atau batas klaim demi memendekkan teks.`
    : 'Tinjau kurasi: panjang yang sama atau lebih pendek tidak membuktikan alur lebih baik. Pastikan alasan dan bukti tetap utuh, serta sambungan antarparagraf tidak mengubah hubungan gagasan.';
}
