// Saran editorial lokal. Pilihan bersifat opsional, bukan penilaian ketepatan makna.
const BATAS_TEKS = 40000;
const BATAS_SARAN = 20;
const ATURAN = [
  ['melakukan pengamatan terhadap', 'mengamati', 'Frasa verba dapat dipadatkan menjadi mengamati. Periksa kembali hubungan tindakan dan objeknya.'],
  ['melakukan evaluasi terhadap', 'mengevaluasi', 'Frasa verba dapat dipadatkan menjadi mengevaluasi. Pastikan objek evaluasi tetap sama.'],
  ['melakukan identifikasi terhadap', 'mengidentifikasi', 'Frasa verba dapat dipadatkan menjadi mengidentifikasi. Pastikan objek identifikasi tetap sama.'],
  ['dalam rangka untuk', 'untuk', 'Penanda tujuan berulang dapat dipadatkan menjadi untuk.'],
  ['mengalami peningkatan', 'meningkat', 'Verba meningkat dapat menyatakan perubahan dengan lebih singkat. Periksa kesesuaian subjek dan konteks.'],
  ['mengalami penurunan', 'menurun', 'Verba menurun dapat menyatakan perubahan dengan lebih singkat. Periksa kesesuaian subjek dan konteks.'],
];
const polaAturan = (frasa) => new RegExp(`(?<![\\p{L}\\p{M}\\p{N}_])${frasa.replaceAll(' ', '[ \\t]+')}(?![\\p{L}\\p{M}\\p{N}_])`, 'giu');
const KUTIP = new Map([['"', '"'], ["'", "'"], ['“', '”'], ['‘', '’']]);

function lindungi(teks, istilah) {
  const mask = new Uint8Array(teks.length);
  let kedalaman = 0;
  let tutupKutip = null;
  for (let i = 0; i < teks.length; i++) {
    const huruf = teks[i];
    if (tutupKutip !== null) {
      mask[i] = 1;
      if (huruf === tutupKutip) {
        let garis = 0; for (let j = i - 1; j >= 0 && teks[j] === '\\'; j--) garis++;
        if (garis % 2 === 0) tutupKutip = null;
      }
      continue;
    }
    if (KUTIP.has(huruf)) { tutupKutip = KUTIP.get(huruf); mask[i] = 1; continue; }
    if (huruf === '(') kedalaman++;
    if (kedalaman) mask[i] = 1;
    if (huruf === ')' && kedalaman) kedalaman--;
  }
  for (const cocok of teks.matchAll(/^[ \t]*>[^\r\n]*/gm)) mask.fill(1, cocok.index, cocok.index + cocok[0].length);
  if (Array.isArray(istilah)) {
    for (const kata of istilah) {
      if (typeof kata !== 'string' || !kata.trim() || kata.length > teks.length) continue;
      const literal = kata.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      for (const cocok of teks.matchAll(new RegExp(literal, 'giu'))) mask.fill(1, cocok.index, cocok.index + cocok[0].length);
    }
  }
  return mask;
}

function sesuaikanKapital(asal, pengganti) {
  if (asal === asal.toLocaleUpperCase('id-ID')) return pengganti.toLocaleUpperCase('id-ID');
  if (asal[0] === asal[0].toLocaleUpperCase('id-ID')) return pengganti[0].toLocaleUpperCase('id-ID') + pengganti.slice(1);
  return pengganti;
}

export function cariSaranDiksi(teks, istilah = []) {
  if (typeof teks !== 'string' || !teks.trim() || teks.length > BATAS_TEKS) return [];
  const mask = lindungi(teks, istilah);
  const daftar = [];
  for (const [nomor, [frasa, pengganti, alasan]] of ATURAN.entries()) {
    let jumlah = 0;
    for (const cocok of teks.matchAll(polaAturan(frasa))) {
      const mulai = cocok.index;
      const akhir = mulai + cocok[0].length;
      if (mask.subarray(mulai, akhir).some(Boolean)) continue;
      daftar.push({
        id: `${nomor}:${mulai}:${akhir}`, mulai, akhir, asal: cocok[0],
        opsi: [sesuaikanKapital(cocok[0], pengganti)], alasan,
        konteks: teks.slice(Math.max(0, mulai - 65), Math.min(teks.length, akhir + 65)),
        snapshot: teks,
      });
      if (++jumlah === BATAS_SARAN) break;
    }
  }
  return daftar.sort((a, b) => a.mulai - b.mulai).slice(0, BATAS_SARAN);
}

export function terapkanSaranDiksi(teks, saran, pilihan) {
  if (typeof teks !== 'string' || teks.length > BATAS_TEKS || !saran || typeof saran !== 'object') {
    throw new Error('Saran diksi tidak sah.');
  }
  if (saran.snapshot !== teks) throw new Error('Teks telah berubah; saran diksi kedaluwarsa. Muat kembali saran.');
  const { mulai, akhir, asal, opsi } = saran;
  if (!Number.isInteger(mulai) || !Number.isInteger(akhir) || mulai < 0 || akhir <= mulai || akhir > teks.length ||
      typeof asal !== 'string' || teks.slice(mulai, akhir) !== asal) throw new Error('Rentang saran tidak cocok dengan teks.');
  const aturan = ATURAN.find(([frasa]) => asal.toLocaleLowerCase('id-ID').replace(/[ \t]+/g, ' ') === frasa);
  if (!aturan || typeof pilihan !== 'string' || !Array.isArray(opsi) || !opsi.includes(pilihan) ||
      pilihan !== sesuaikanKapital(asal, aturan[1])) throw new Error('Pilihan diksi tidak tersedia untuk saran ini.');
  return teks.slice(0, mulai) + pilihan + teks.slice(akhir);
}
