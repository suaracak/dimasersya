// Pemeriksaan otomatis: mencocokkan angka, satuan, sitasi, rujukan peraturan, dan penanda makna
// antara teks awal dan revisi. Hanya mencocokkan pola, tidak menilai apakah maknanya tetap sama.

const EM_DASH = new RegExp(String.fromCharCode(0x2014), 'g');
const POLA_ANGKA = /\d+(?:[.,]\d+)*/g;
const POLA_KURUNG = /\(([^()]*)\)/g;
const TAHUN = '(?:(?:1[5-9]|20)\\d{2}[a-z]?|t\\.t\\.|n\\.d\\.)';
const POLA_BUTIR_SITASI = new RegExp(`,\\s*${TAHUN}(?=\\s*(?:,|$))`);
const POLA_HANYA_TAHUN = new RegExp(`^${TAHUN}$`);
const POLA_PERATURAN =
  /\bPasal\s+\d+[A-Z]?(?:\s+ayat\s+\(\d+\))?(?:\s+huruf\s+[a-z]\b)?|\bNomor\s+\d+\s+Tahun\s+\d{4}|\b\d+\/\d{4}\b/g;
const PENGHUBUNG_PENULIS = /^(?:et|al\.|dkk\.|&|dan)$/i;
const KIRI = '(?<![\\p{L}\\p{N}/-])';
const KANAN = '(?![\\p{L}\\p{N}/-])';
const lolos = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&').replace(/ /g, '\\s+');

const SATUAN = ['poin persentase', 'persen', '%', 'poin', 'kali', 'orang', 'jiwa', 'kk', 'unit', 'rumah', 'siswa',
  'sekolah', 'pekerja', 'peserta', 'perusahaan', 'desa', 'kelurahan', 'kecamatan', 'kabupaten', 'hektare', 'hektar',
  'ha', 'km²', 'km2', 'km', 'm²', 'm2', 'meter', 'm', 'liter', 'ton', 'kg', 'tahun', 'bulan', 'minggu', 'hari', 'jam',
  'menit', 'ribu', 'juta', 'miliar', 'triliun', 'rupiah', 'kata', 'halaman', 'kriteria'];
const SATUAN_SETARA = { '%': 'persen', hektar: 'hektare', ha: 'hektare', km2: 'km²', m2: 'm²', m: 'meter' };
const POLA_SATUAN = new RegExp(
  `(?:(?<!\\p{L})(Rp\\s?))?(\\d+(?:[.,]\\d+)*)(?:\\s*(${SATUAN.map(lolos).join('|')})(?![\\p{L}\\p{N}]))?`, 'giu');

const POLA_KEPASTIAN = new RegExp(`${KIRI}(?:belum\\s+(?:terbukti|diketahui|dapat|menunjukkan|mengukur|menilai)|` +
  'kurang\\s+lebih|terbukti|diperkirakan|diduga|dugaan|kemungkinan|mungkin|(?<!(?:di|ke|dari)\\s+)sekitar|hampir|' +
  `cenderung|tampaknya|sementara(?!\\s+itu)|hipotesis|berstatus|tidak|bukan|belum|tanpa|tak)${KANAN}`, 'giu');

const PENANDA = {
  hukum: ['wajib', 'harus', 'dilarang', 'paling sedikit', 'paling lama', 'paling banyak', 'dan/atau',
    'secara bertahap', 'dapat di-'],
  pembatas: ['hanya', 'masih', 'sekadar'],
  atribusi: ['menurut', 'dilaporkan|melaporkan', 'disebut|menyebut', 'mengakui', 'diklaim|mengklaim'],
  kausal: ['dikaitkan|mengaitkan', 'berkaitan', 'terkait', 'berhubungan', 'berasosiasi', 'seiring', 'bersamaan',
    'menyebabkan|disebabkan', 'mengakibatkan|diakibatkan', 'akibat', 'berdampak', 'karena|dikarenakan', 'sebab', 'sehingga'],
  inferensi: ['dengan demikian|karena itu|oleh sebab itu|maka', 'berdasarkan ... tersebut', 'hal ini menunjukkan'],
  rencana: ['direncanakan|merencanakan', 'ditargetkan|menargetkan', 'target', 'akan', 'telah|sudah',
    'terealisasi|direalisasikan', 'realisasi', 'dilaksanakan|melaksanakan'],
};

const POLA_KHUSUS = {
  'dapat di-': `${KIRI}dapat\\s+di(?!katakan)\\p{L}+`,
  sebab: `${KIRI}sebab(?:nya)?${KANAN}(?!\\s+(?:akibat|itu))`,
  akibat: `${KIRI}(?<!sebab\\s+)akibat(?:nya)?${KANAN}`,
  akan: `${KIRI}akan${KANAN}(?!\\s+tetapi)`,
  karena: `${KIRI}karena(?:nya)?${KANAN}(?!\\s+itu)`,
  'berdasarkan ... tersebut': `${KIRI}berdasarkan\\s+(?:\\p{L}+\\s+){0,2}(?:tersebut|ini|itu|di\\s+atas)${KANAN}`,
  'hal ini menunjukkan': `${KIRI}(?:hal\\s+)?(?:ini|tersebut|itu)\\s+(?:menunjukkan|membuktikan|menandakan|mencerminkan|berarti)${KANAN}`,
};
const polaPenanda = (p) => new RegExp(POLA_KHUSUS[p] || `${KIRI}${lolos(p)}(?:nya|lah|pun)?${KANAN}`, 'gu');
const PENANDA_SIAP = Object.fromEntries(Object.entries(PENANDA).map(([kelompok, daftar]) => [kelompok,
  daftar.map((entri) => ({ label: entri.replace(/\|/g, '/'), pola: entri.split('|').map(polaPenanda) }))]));

const POLA_MENURUT_SITASI = new RegExp(`${KIRI}menurut(?=\\s+[^()\\n]{1,80}?\\(\\s*${TAHUN}\\s*\\))`, 'gu');
const rapikan = (s) => s.replace(/\s+/g, ' ').trim();

export function ekstrakAngka(teks) {
  return teks.match(POLA_ANGKA) || [];
}

export function ekstrakPeraturan(teks) {
  return (teks.match(POLA_PERATURAN) || []).map(rapikan);
}

export function ekstrakSitasi(teks) {
  const hasil = [];
  for (const cocok of teks.matchAll(POLA_KURUNG)) {
    const isi = rapikan(cocok[1]);
    if (POLA_HANYA_TAHUN.test(isi)) {
      const nama = namaNaratif(teks.slice(Math.max(0, cocok.index - 80), cocok.index));
      hasil.push(rapikan(`${nama} ${isi}`));
      continue;
    }
    for (const butir of isi.split(';')) {
      if (POLA_BUTIR_SITASI.test(butir.trim())) hasil.push(rapikan(butir.replace(/,/g, ' ')));
    }
  }
  return hasil;
}

function namaNaratif(sebelum) {
  const kata = sebelum.trim().split(/\s+/);
  const ambil = [];
  for (let i = kata.length - 1; i >= 0; i--) {
    const k = kata[i];
    if (/^(?:Menurut|Dalam|Berdasarkan|Data|Lihat|Temuan|Sebagaimana)$/i.test(k)) break;
    if (PENGHUBUNG_PENULIS.test(k)) {
      ambil.unshift(k);
      continue;
    }
    if (/^\p{Lu}/u.test(k)) ambil.unshift(k);
    else break;
  }
  return ambil.join(' ') || '(tanpa nama)';
}

function hitung(daftar) {
  const peta = new Map();
  for (const x of daftar) peta.set(x, (peta.get(x) || 0) + 1);
  return peta;
}

function kurang(petaA, petaB) {
  const hasil = [];
  for (const [nilai, jumlah] of petaA) {
    const lain = petaB.get(nilai) || 0;
    if (jumlah > lain) hasil.push({ nilai, awal: jumlah, revisi: lain });
  }
  return hasil;
}

function bandingkan(daftarAwal, daftarRevisi) {
  const a = hitung(daftarAwal);
  const r = hitung(daftarRevisi);
  return {
    hilang: kurang(a, r),
    baru: kurang(r, a).map(({ nilai, awal, revisi }) => ({ nilai, awal: revisi, revisi: awal })),
  };
}

export function ekstrakSatuan(teks) {
  const hasil = [];
  for (const [, rp, angka, satuan] of teks.matchAll(POLA_SATUAN)) {
    if (!rp && !satuan) continue;
    const s = satuan ? rapikan(satuan.toLowerCase()) : '';
    hasil.push(rapikan(`${rp ? 'rp ' : ''}${angka} ${SATUAN_SETARA[s] || s}`));
  }
  return hasil;
}

function ekstrakKepastian(teks) {
  return (teks.match(POLA_KEPASTIAN) || []).map((s) => s.toLowerCase().replace(/\s+/g, ' '));
}

function ekstrakPenanda(teks, kelompok) {
  let t = teks.toLowerCase();
  if (kelompok === 'atribusi') t = t.replace(POLA_MENURUT_SITASI, '');
  const hasil = [];
  for (const { label, pola } of PENANDA_SIAP[kelompok]) {
    const n = pola.reduce((jumlah, p) => jumlah + (t.match(p) || []).length, 0);
    for (let i = 0; i < n; i++) hasil.push(label);
  }
  return hasil;
}

function ekstrakKonsep(teks) {
  return (teks.match(/\b(?:keluaran|output|dampak|hasil|asosiasi|sebab[\s-]+akibat|rencana|pelaksanaan)\b/gi) || []).map((s) => s.toLowerCase().replace(/\s+/g, ' '));
}

function ekstrakIstilah(teks, istilah) {
  const hasil = [];
  for (const kata of [...new Set(istilah.map((s) => s.trim()).filter(Boolean))]) {
    const pola = kata.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    const re = new RegExp(`(?<![\\p{L}\\p{N}])${pola}(?![\\p{L}\\p{N}])`, 'giu');
    for (const cocok of teks.matchAll(re)) hasil.push(kata);
  }
  return hasil;
}

export function periksaPerubahan(awal, revisi, istilahTerkunci = []) {
  const hasil = {
    angka: bandingkan(ekstrakAngka(awal), ekstrakAngka(revisi)),
    sitasi: bandingkan(ekstrakSitasi(awal), ekstrakSitasi(revisi)),
    peraturan: bandingkan(ekstrakPeraturan(awal), ekstrakPeraturan(revisi)),
    satuan: bandingkan(ekstrakSatuan(awal), ekstrakSatuan(revisi)),
    kepastian: bandingkan(ekstrakKepastian(awal), ekstrakKepastian(revisi)),
    konsep: bandingkan(ekstrakKonsep(awal), ekstrakKonsep(revisi)),
    istilah: bandingkan(ekstrakIstilah(awal, istilahTerkunci), ekstrakIstilah(revisi, istilahTerkunci)),
  };
  for (const kelompok of Object.keys(PENANDA)) {
    hasil[kelompok] = bandingkan(ekstrakPenanda(awal, kelompok), ekstrakPenanda(revisi, kelompok));
  }
  const jumlah = Object.values(hasil).reduce((n, x) => n + x.hilang.length + x.baru.length, 0);
  const emDash = (revisi.match(EM_DASH) || []).length;
  return { ...hasil, emDash, jumlahTanda: jumlah + (emDash ? 1 : 0) };
}

export function konteks(teks, nilai, lebar = 45) {
  const kecil = teks.toLowerCase();
  let i = -1;
  let panjang = 0;
  const cocok = POLA_KHUSUS[nilai] ? new RegExp(POLA_KHUSUS[nilai], 'u').exec(kecil) : null;
  if (cocok) { i = cocok.index; panjang = cocok[0].length; }
  if (i < 0) for (const calon of [nilai, ...nilai.split('/')]) {
    const c = calon.replace(/-$/, '').toLowerCase();
    if (!c) continue;
    i = kecil.indexOf(c);
    if (i >= 0) { panjang = c.length; break; }
  }
  if (i < 0) return '';
  const awal = Math.max(0, i - lebar);
  const akhir = Math.min(teks.length, i + panjang + lebar);
  return `${awal > 0 ? '…' : ''}${rapikan(teks.slice(awal, akhir))}${akhir < teks.length ? '…' : ''}`;
}
