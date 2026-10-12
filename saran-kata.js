// Saran pilihan kata lokal (tanpa model dan tanpa kuota). Menandai ejaan tidak baku menurut KBBI/EYD,
// pleonasme, nominalisasi "melakukan + kata benda", dan frasa pengisi dalam tulisan akademik berbahasa
// Indonesia, lalu menawarkan alternatif yang lebih lugas. Setiap saran dipilih sendiri oleh pengguna.

export const BATAS_TEKS_SARAN = 40000;
export const BATAS_SARAN = 20;
const KIRI = '(?<![\\p{L}\\p{M}\\p{N}_])';
const KANAN = '(?![\\p{L}\\p{M}\\p{N}_])';

const ATURAN = [
  ['hal ini dikarenakan', ['hal ini karena'], '"Dikarenakan" tidak baku menurut KBBI.', 'tidak baku'],
  ['dikarenakan oleh', ['karena'], '"Dikarenakan" tidak baku menurut KBBI.', 'tidak baku'],
  ['dikarenakan', ['karena'], '"Dikarenakan" tidak baku menurut KBBI.', 'tidak baku'],
  ['dimana', ['di mana', 'yang', 'tempat'], 'Penulisan baku "di mana"; sebagai penghubung dalam kalimat pernyataan sering lebih tepat "yang" atau "tempat".', 'ejaan'],
  ['di mana(?![^.!?\\n]*\\?)', ['tempat', 'yang'], '"Di mana" sebagai penghubung dalam kalimat pernyataan adalah pengaruh terjemahan; lebih tepat "tempat" atau "yang".', 'diksi'],
  ['kedepannya', ['ke depan'], 'Penulisan baku "ke depan".', 'ejaan'],
  ['diantaranya', ['di antaranya'], 'Kata depan "di" ditulis terpisah.', 'ejaan'],
  ['di(atas|dalam|bawah|luar|samping|antara|tengah|sini|sana|situ|depan|belakang|sekitar)', ['di $1'], 'Kata depan "di" ditulis terpisah dari kata yang menunjukkan tempat (EYD).', 'ejaan'],
  ['ke(atas|dalam|bawah|samping|tengah|sini|sana|situ|mana|depan|belakang)', ['ke $1'], 'Kata depan "ke" ditulis terpisah (EYD).', 'ejaan'],
  ['di (atur|buat|lakukan|laksanakan|gunakan|tetapkan|terapkan|kembangkan|kelola|jelaskan|sebutkan|tuliskan|berikan|ambil|ubah|teliti|analisis|evaluasi|susun|rancang|catat|tulis|lihat|temukan|kumpulkan|hitung|ukur|uji|kaji|bahas|olah)', ['di$1'], 'Awalan "di-" pada kata kerja ditulis serangkai (EYD).', 'ejaan'],
  ['sekedar', ['sekadar'], 'Bentuk baku KBBI: "sekadar".', 'tidak baku'],
  ['merubah', ['mengubah'], 'Bentuk baku KBBI: "mengubah".', 'tidak baku'],
  ['dirubah', ['diubah'], 'Bentuk baku KBBI: "diubah".', 'tidak baku'],
  ['praktek', ['praktik'], 'Bentuk baku KBBI: "praktik".', 'tidak baku'],
  ['resiko', ['risiko'], 'Bentuk baku KBBI: "risiko".', 'tidak baku'],
  ['menganalisa', ['menganalisis'], 'Bentuk baku KBBI: "menganalisis".', 'tidak baku'],
  ['dianalisa', ['dianalisis'], 'Bentuk baku KBBI: "dianalisis".', 'tidak baku'],
  ['analisa', ['analisis'], 'Bentuk baku KBBI: "analisis".', 'tidak baku'],
  ['(akti|efekti|produkti|kreati|sensiti|objekti|subjekti)fitas', ['$1vitas'], 'Bentuk baku memakai -vitas (aktivitas, efektivitas, produktivitas).', 'tidak baku'],
  ['obyek', ['objek'], 'Bentuk baku KBBI: "objek".', 'tidak baku'],
  ['subyek', ['subjek'], 'Bentuk baku KBBI: "subjek".', 'tidak baku'],
  ['obyektif', ['objektif'], 'Bentuk baku KBBI: "objektif".', 'tidak baku'],
  ['subyektif', ['subjektif'], 'Bentuk baku KBBI: "subjektif".', 'tidak baku'],
  ['sistim', ['sistem'], 'Bentuk baku KBBI: "sistem".', 'tidak baku'],
  ['jaman', ['zaman'], 'Bentuk baku KBBI: "zaman".', 'tidak baku'],
  ['ijin', ['izin'], 'Bentuk baku KBBI: "izin".', 'tidak baku'],
  ['nasehat', ['nasihat'], 'Bentuk baku KBBI: "nasihat".', 'tidak baku'],
  ['himbauan', ['imbauan'], 'Bentuk baku KBBI: "imbauan".', 'tidak baku'],
  ['menghimbau', ['mengimbau'], 'Bentuk baku KBBI: "mengimbau".', 'tidak baku'],
  ['kwalitas', ['kualitas'], 'Bentuk baku KBBI: "kualitas".', 'tidak baku'],
  ['kwantitas', ['kuantitas'], 'Bentuk baku KBBI: "kuantitas".', 'tidak baku'],
  ['tehnik', ['teknik'], 'Bentuk baku KBBI: "teknik".', 'tidak baku'],
  ['tehnologi', ['teknologi'], 'Bentuk baku KBBI: "teknologi".', 'tidak baku'],
  ['propinsi', ['provinsi'], 'Bentuk baku KBBI: "provinsi".', 'tidak baku'],
  ['standarisasi', ['standardisasi'], 'Bentuk baku KBBI: "standardisasi".', 'tidak baku'],
  ['kordinasi', ['koordinasi'], 'Bentuk baku KBBI: "koordinasi".', 'tidak baku'],
  ['mengkoordinir', ['mengoordinasi'], 'Bentuk baku KBBI: "mengoordinasi".', 'tidak baku'],
  ['terlanjur', ['telanjur'], 'Bentuk baku KBBI: "telanjur".', 'tidak baku'],
  ['silahkan', ['silakan'], 'Bentuk baku KBBI: "silakan".', 'tidak baku'],
  ['kadaluarsa', ['kedaluwarsa'], 'Bentuk baku KBBI: "kedaluwarsa".', 'tidak baku'],
  ['mempengaruhi', ['memengaruhi'], 'Bentuk baku KBBI V: "memengaruhi" (fonem /p/ luluh).', 'tidak baku'],
  ['menterjemahkan', ['menerjemahkan'], 'Bentuk baku KBBI: "menerjemahkan".', 'tidak baku'],
  ['mentaati', ['menaati'], 'Bentuk baku KBBI: "menaati".', 'tidak baku'],
  ['mensosialisasikan', ['menyosialisasikan'], 'Bentuk baku KBBI: "menyosialisasikan".', 'tidak baku'],
  ['trampil', ['terampil'], 'Bentuk baku KBBI: "terampil".', 'tidak baku'],
  ['ketrampilan', ['keterampilan'], 'Bentuk baku KBBI: "keterampilan".', 'tidak baku'],
  ['nampak', ['tampak'], 'Bentuk baku KBBI: "tampak".', 'tidak baku'],
  ['agar supaya', ['agar', 'supaya'], 'Pleonasme: cukup salah satu.', 'pleonasme'],
  ['demi untuk', ['demi', 'untuk'], 'Pleonasme: cukup salah satu.', 'pleonasme'],
  ['dalam rangka untuk', ['untuk'], 'Penanda tujuan berulang; cukup "untuk".', 'pleonasme'],
  ['sebagai contoh misalnya', ['sebagai contoh', 'misalnya'], 'Pleonasme: cukup salah satu.', 'pleonasme'],
  ['seperti misalnya', ['seperti', 'misalnya'], 'Pleonasme: cukup salah satu.', 'pleonasme'],
  ['(adalah|ialah) merupakan', ['$1', 'merupakan'], 'Pleonasme: cukup salah satu.', 'pleonasme'],
  ['sangat (\\p{L}+) sekali', ['sangat $1', '$1 sekali'], 'Pleonasme: "sangat" dan "sekali" tidak dipakai bersamaan.', 'pleonasme'],
  ['para (\\p{L}+)-\\1', ['para $1'], 'Pleonasme jamak: "para" tidak diikuti kata ulang.', 'pleonasme'],
  ['banyak (\\p{L}+)-\\1', ['banyak $1'], 'Pleonasme jamak: "banyak" tidak diikuti kata ulang.', 'pleonasme'],
  ['mulai sejak', ['sejak', 'mulai'], 'Pleonasme: cukup salah satu.', 'pleonasme'],
  ['sejak dari', ['sejak', 'dari'], 'Pleonasme: cukup salah satu.', 'pleonasme'],
  ['dan lain sebagainya', ['dan sebagainya', 'dan lain-lain'], 'Pleonasme: cukup "dan sebagainya" atau "dan lain-lain".', 'pleonasme'],
  ['antara lain (yaitu|adalah|ialah)', ['antara lain'], 'Pleonasme: "antara lain" sudah memperkenalkan rincian.', 'pleonasme'],
  ['naik ke atas', ['naik'], 'Pleonasme: "naik" sudah berarti ke atas.', 'pleonasme'],
  ['turun ke bawah', ['turun'], 'Pleonasme: "turun" sudah berarti ke bawah.', 'pleonasme'],
  ['masih tetap', ['masih'], 'Pleonasme: cukup "masih"; kata pembatas tetap terjaga.', 'pleonasme'],
  ['mengalami peningkatan', ['meningkat'], 'Verba "meningkat" menyatakan perubahan dengan lebih singkat. Periksa kesesuaian subjeknya.', 'ringkas'],
  ['mengalami penurunan', ['menurun'], 'Verba "menurun" menyatakan perubahan dengan lebih singkat. Periksa kesesuaian subjeknya.', 'ringkas'],
  ['mengalami kenaikan', ['naik'], 'Verba "naik" menyatakan perubahan dengan lebih singkat. Periksa kesesuaian subjeknya.', 'ringkas'],
  ['mengalami perubahan', ['berubah'], 'Verba "berubah" menyatakan perubahan dengan lebih singkat. Periksa kesesuaian subjeknya.', 'ringkas'],
  ['dalam rangka', ['untuk'], 'Frasa birokratis; "untuk" lebih lugas.', 'ringkas'],
  ['(memiliki|mempunyai) kemampuan untuk', ['mampu'], 'Lebih ringkas dengan makna yang sama.', 'ringkas'],
  ['perlu diketahui bahwa', [''], 'Frasa pengisi; langsung ke pernyataannya.', 'pengisi'],
  ['perlu diingat bahwa', [''], 'Frasa pengisi; langsung ke pernyataannya.', 'pengisi'],
  ['adapun', [''], 'Sering bisa dihapus; mulai kalimat langsung dari subjeknya.', 'pengisi'],
  ['yang mana', ['yang'], '"Yang mana" sebagai penghubung adalah pengaruh terjemahan; cukup "yang".', 'diksi'],
  ['pada saat ini', ['saat ini', 'kini'], 'Lebih ringkas.', 'ringkas'],
  ['pada saat', ['saat', 'ketika'], 'Lebih ringkas.', 'ringkas'],
  ['di dalam hal', ['dalam hal'], 'Lebih ringkas.', 'ringkas'],
  ['oleh karena(?!\\s+itu)', ['karena'], 'Lebih ringkas; hubungan sebab tetap sama.', 'ringkas'],
  ['bertujuan untuk', ['bertujuan'], '"Bertujuan" sudah mengandung makna tujuan.', 'ringkas'],
  ['sebagaimana yang', ['sebagaimana'], 'Lebih ringkas.', 'ringkas'],
  ['terkait dengan', ['terkait'], 'Lebih ringkas; kata "terkait" tetap ada.', 'ringkas'],
  ['merupakan', ['adalah'], '"Merupakan" muncul berulang; ganti sebagian dengan "adalah" atau susun ulang kalimatnya.', 'pengulangan', 3],
];

const NOMINALISASI = {
  evaluasi: 'mengevaluasi', analisis: 'menganalisis', pengecekan: 'memeriksa', pemeriksaan: 'memeriksa',
  pengukuran: 'mengukur', penelitian: 'meneliti', perbaikan: 'memperbaiki', peningkatan: 'meningkatkan',
  pengembangan: 'mengembangkan', pengawasan: 'mengawasi', pendataan: 'mendata', pembangunan: 'membangun',
  perencanaan: 'merencanakan', pengumpulan: 'mengumpulkan', identifikasi: 'mengidentifikasi',
  koordinasi: 'berkoordinasi', 'kerja sama': 'bekerja sama', perubahan: 'mengubah', penyesuaian: 'menyesuaikan',
  pengolahan: 'mengolah', penilaian: 'menilai', pengamatan: 'mengamati', wawancara: 'mewawancarai',
  observasi: 'mengobservasi', pengujian: 'menguji', penyusunan: 'menyusun', pengelolaan: 'mengelola',
  pembahasan: 'membahas', pemantauan: 'memantau', pendampingan: 'mendampingi', pelatihan: 'melatih',
  penanganan: 'menangani', pengkajian: 'mengkaji', kajian: 'mengkaji', rekrutmen: 'merekrut',
  verifikasi: 'memverifikasi', validasi: 'memvalidasi', revisi: 'merevisi', pencatatan: 'mencatat',
};
const BERDIRI_SENDIRI = new Set(['berkoordinasi', 'bekerja sama']);
for (const [benda, kerja] of Object.entries(NOMINALISASI)) {
  const pola = `melakukan ${benda}${BERDIRI_SENDIRI.has(kerja) ? '' : '(?: terhadap)?'}`;
  ATURAN.push([pola, [kerja], 'Nominalisasi: kata kerja langsung lebih lugas. Periksa apakah objeknya tetap sama.', 'nominalisasi']);
}

const ATURAN_SIAP = ATURAN.map(([pola, saran, alasan, jenis, minimal = 1]) => ({
  re: new RegExp(`${KIRI}(?:${pola.replace(/ /g, '[ \\t]+')})${KANAN}`, 'giu'), saran, alasan, jenis, minimal,
}));

const lolos = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function rentangTerlindung(teks, istilah) {
  const rentang = [];
  const tambah = (re) => { for (const m of teks.matchAll(re)) rentang.push([m.index, m.index + m[0].length]); };
  tambah(/"[^"\n]*"/g);
  tambah(/“[^”\n]*”/g);
  tambah(/\([^()\n]*\)/g);
  tambah(/^[ \t]*>.*$/gm);
  for (const kata of istilah) {
    const k = String(kata).trim();
    if (k) tambah(new RegExp(`${KIRI}${lolos(k).replace(/\s+/g, '\\s+')}${KANAN}`, 'giu'));
  }
  return rentang;
}

export function cariSaranKata(teks = '', istilah = []) {
  if (!teks.trim() || teks.length > BATAS_TEKS_SARAN) return [];
  const terlindung = rentangTerlindung(teks, istilah);
  const kena = (a, b) => terlindung.some(([x, y]) => a < y && b > x);
  const temuan = [];
  ATURAN_SIAP.forEach((a, urutan) => {
    const semua = [...teks.matchAll(a.re)].filter((m) => m[0] && !kena(m.index, m.index + m[0].length));
    if (semua.length < a.minimal) return;
    for (const m of semua) {
      const saran = [...new Set(a.saran.map((s) => s.replace(/\$(\d)/g, (_, n) => m[Number(n)] ?? '')))];
      temuan.push({ mulai: m.index, akhir: m.index + m[0].length, asli: m[0], saran, alasan: a.alasan, jenis: a.jenis, urutan });
    }
  });
  temuan.sort((x, y) => x.mulai - y.mulai || (y.akhir - y.mulai) - (x.akhir - x.mulai) || x.urutan - y.urutan);
  const hasil = [];
  let batas = -1;
  for (const { urutan, ...t } of temuan) {
    if (t.mulai < batas) continue;
    hasil.push(t);
    batas = t.akhir;
  }
  return hasil;
}

function sesuaikanKapital(asli, ganti) {
  if (!ganti) return ganti;
  if (/\p{L}/u.test(asli) && asli === asli.toUpperCase()) return ganti.toUpperCase();
  return /^\p{Lu}/u.test(asli) ? ganti[0].toUpperCase() + ganti.slice(1) : ganti;
}

export function terapkanSaran(teks, item, pilihan) {
  if (!item || teks.slice(item.mulai, item.akhir) !== item.asli || !item.saran.includes(pilihan)) return null;
  const kiri = teks.slice(0, item.mulai);
  let kanan = teks.slice(item.akhir);
  if (pilihan) return kiri + sesuaikanKapital(item.asli, pilihan) + kanan;
  const awalKalimat = /(?:^|[.!?]\s+|\n\s*)$/.test(kiri);
  kanan = kanan.replace(/^[\s,]+/, '');
  if (awalKalimat) kanan = kanan.replace(/^\p{Ll}/u, (h) => h.toUpperCase());
  const pemisah = kiri && !/\s$/.test(kiri) && kanan && !/^[.,;:!?)]/.test(kanan) ? ' ' : '';
  return kiri + pemisah + kanan;
}
