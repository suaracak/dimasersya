// Logika antarmuka Editor Akademik Dimas (Versi Publik Statis - BYOK Multi-Penyedia).
// Mendukung Anthropic Claude & Ollama Cloud (misal: gpt-oss:120b).
// 100% Client-Side. Kunci API hanya disimpan di browser pengguna (localStorage / memori).
import { bandingkanKata, adalahBaris } from './diff.js';
import { periksaPerubahan, konteks } from './periksa.js';
import { susunPromptChat, pecahIstilah, LABEL_MODE, LABEL_NADA, LABEL_TUJUAN } from './pedoman.js';
import { analisisTeks, tinjauanKurasi } from './analisis.js';
import { bacaHasilChat } from './impor.js';
import { ringkasTinjauan, masukanSama } from './tinjauan-ui.js';
import { cariSaranKata, terapkanSaran, BATAS_SARAN, BATAS_TEKS_SARAN } from './saran-kata.js';
import {
  ambilPenyediaAktif,
  simpanPenyediaAktif,
  ambilKunci,
  simpanKunci,
  hapusSemuaKunci,
  ambilModel,
  simpanModel,
  ambilEndpointOllama,
  simpanEndpointOllama,
  apakahKunciTersimpanPermanen,
  validasiFormatKunci,
  MODEL_ANTHROPIC_PILIHAN,
  MODEL_OLLAMA_PILIHAN,
} from './konfigurasi-kunci.js';
import { suntingBertinjauClient } from './tinjauan.js';

const el = (id) => document.getElementById(id);
const TAB = ['berdampingan', 'perbandingan', 'masukan', 'pemeriksaan'];
const BATAS_KARAKTER_DEFAULT = 15000;

let terakhir = null; // { masukan, sumber, hasil, ... }
let promptTersiap = null;
let pengendaliBatal = null;

// ---------- status & modal kunci ----------

function perbaruiStatusKunci() {
  const penyedia = ambilPenyediaAktif();
  const kunci = ambilKunci(penyedia);
  const model = ambilModel(penyedia);
  const lencana = el('lencana-status');
  const privasi = el('catatan-privasi');
  const spandukDemo = el('spanduk-demo');

  const namaPenyedia = penyedia === 'ollama' ? 'Ollama' : 'Anthropic';

  if (kunci) {
    lencana.textContent = `🟢 ${namaPenyedia} · ${model}`;
    lencana.title = `Kunci API ${namaPenyedia} aktif. Klik untuk mengubah pengaturan.`;
    lencana.className = 'lencana lencana-aktif';
    spandukDemo.hidden = true;
    privasi.innerHTML = `<strong>Kunci API Aktif (${namaPenyedia} - ${model}).</strong> Teks disunting langsung dari browser Anda. Kunci Anda tidak pernah disimpan di server mana pun.`;
  } else {
    lencana.textContent = '🔑 Atur Kunci API';
    lencana.title = 'Klik untuk memasukkan Kunci API Anthropic atau Ollama Cloud';
    lencana.className = 'lencana lencana-kunci';
    spandukDemo.hidden = false;
    privasi.innerHTML = `<strong>Mode Tanpa Kunci:</strong> Masukkan API Key (${namaPenyedia} / Claude) untuk menjalankan revisi otomatis langsung di browser, atau gunakan <em>Sunting melalui chat</em> secara gratis.`;
  }
}

function perbaruiPilihanModelSelect(penyedia, modelTerpilih) {
  const select = el('pilihan-model');
  select.replaceChildren();

  const daftar = penyedia === 'ollama' ? MODEL_OLLAMA_PILIHAN : MODEL_ANTHROPIC_PILIHAN;

  let modelDitemukan = false;
  for (const item of daftar) {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.nama;
    if (item.id === modelTerpilih) {
      opt.selected = true;
      modelDitemukan = true;
    }
    select.appendChild(opt);
  }

  // Jika model kustom yang sebelumnya disimpan
  if (!modelDitemukan && modelTerpilih) {
    const opt = document.createElement('option');
    opt.value = modelTerpilih;
    opt.textContent = `${modelTerpilih} (Kustom)`;
    opt.selected = true;
    select.appendChild(opt);
  }
}

function sesuaikanTampilanPenyediaModal() {
  const penyedia = el('pilihan-penyedia').value;
  const blokOllama = el('grup-endpoint-ollama');
  const labelKunci = el('label-kunci');
  const bantuanKunci = el('bantuan-kunci');
  const inputKunci = el('masukan-kunci');

  if (penyedia === 'ollama') {
    blokOllama.hidden = false;
    labelKunci.textContent = 'Ollama Cloud API Key / Token';
    inputKunci.placeholder = 'Tempel API key Ollama Cloud Anda...';
    bantuanKunci.innerHTML =
      'Masukkan API key untuk model Ollama Cloud Anda (misal: <code>gpt-oss:120b</code>).';
  } else {
    blokOllama.hidden = true;
    labelKunci.textContent = 'Anthropic Claude API Key';
    inputKunci.placeholder = 'sk-ant-api03-...';
    bantuanKunci.innerHTML =
      'Dapatkan API key Anda di <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer">console.anthropic.com</a>. Kunci selalu diawali dengan <code>sk-ant-</code>.';
  }

  const modelSaatIni = ambilModel(penyedia);
  perbaruiPilihanModelSelect(penyedia, modelSaatIni);
  inputKunci.value = ambilKunci(penyedia);
}

function bukaModalKunci() {
  const dialog = el('dialog-kunci');
  const penyediaAktif = ambilPenyediaAktif();

  el('pilihan-penyedia').value = penyediaAktif;
  el('endpoint-ollama').value = ambilEndpointOllama();
  el('simpan-permanen').checked = apakahKunciTersimpanPermanen();
  el('pesan-modal-kunci').textContent = '';
  el('pesan-modal-kunci').hidden = true;

  sesuaikanTampilanPenyediaModal();

  const kunciAda = ambilKunci(penyediaAktif);
  el('tombol-hapus-kunci').hidden = !kunciAda;

  dialog.showModal();
  if (!kunciAda) {
    el('masukan-kunci').focus();
  }
}

function tutupModalKunci() {
  el('dialog-kunci').close();
}

function simpanPengaturanKunci(ev) {
  ev.preventDefault();
  const penyedia = el('pilihan-penyedia').value;
  const inputKunci = el('masukan-kunci').value.trim();
  const modelDipilih = el('pilihan-model').value;
  const endpointOllama = el('endpoint-ollama').value.trim();
  const permanen = el('simpan-permanen').checked;

  if (inputKunci) {
    const validasi = validasiFormatKunci(inputKunci, penyedia);
    if (!validasi.valid) {
      el('pesan-modal-kunci').textContent = validasi.pesan;
      el('pesan-modal-kunci').className = 'peringatan';
      el('pesan-modal-kunci').hidden = false;
      return;
    }
  }

  simpanPenyediaAktif(penyedia);
  simpanKunci(inputKunci, penyedia, permanen);
  simpanModel(modelDipilih, penyedia);
  if (penyedia === 'ollama') {
    simpanEndpointOllama(endpointOllama);
  }

  perbaruiStatusKunci();
  tutupModalKunci();
  umpan(
    inputKunci
      ? `Pengaturan disimpan (${penyedia === 'ollama' ? 'Ollama Cloud' : 'Anthropic Claude'} - ${modelDipilih}).`
      : 'Pengaturan disimpan.'
  );
}

function hapusKunciPengguna() {
  if (confirm('Apakah Anda yakin ingin menghapus semua Kunci API dari browser ini?')) {
    hapusSemuaKunci();
    el('masukan-kunci').value = '';
    el('tombol-hapus-kunci').hidden = true;
    perbaruiStatusKunci();
    tutupModalKunci();
    umpan('Kunci API telah dihapus dari browser.');
  }
}

function togolLihatKunci() {
  const input = el('masukan-kunci');
  const tombol = el('tombol-lihat-kunci');
  if (input.type === 'password') {
    input.type = 'text';
    tombol.textContent = 'Sembunyikan';
    tombol.setAttribute('aria-label', 'Sembunyikan kunci API');
  } else {
    input.type = 'password';
    tombol.textContent = 'Lihat';
    tombol.setAttribute('aria-label', 'Lihat kunci API');
  }
}

// ---------- penghitung & validasi masukan ----------

function perbaruiPenghitung() {
  const n = el('sumber').value.trim().length;
  const p = el('penghitung');
  const kata = analisisTeks(el('sumber').value).kata;
  p.textContent = `${n.toLocaleString('id-ID')} / ${BATAS_KARAKTER_DEFAULT.toLocaleString('id-ID')} karakter · ${kata.toLocaleString('id-ID')} kata`;
  p.classList.toggle('lebih', n > BATAS_KARAKTER_DEFAULT);
}

function pilihan(nama) {
  return document.querySelector(`input[name="${nama}"]:checked`).value;
}

function masukanSaatIni() {
  return {
    teks: el('sumber').value.trim(),
    instruksi: el('instruksi').value.trim(),
    istilah: el('istilah').value.trim(),
    mode: pilihan('mode'),
    nada: pilihan('nada'),
    arel: el('arel').checked,
    tujuan: el('tujuan').value,
    contohGaya: el('contoh-gaya').value.trim(),
    tinjau: el('tinjau').checked,
  };
}

function sumberValid(data) {
  if (!data.teks) throw new Error('Teks sumber masih kosong.');
  if (data.teks.length > BATAS_KARAKTER_DEFAULT) {
    throw new Error(
      `Teks sumber ${data.teks.length.toLocaleString('id-ID')} karakter, melebihi batas ${BATAS_KARAKTER_DEFAULT.toLocaleString('id-ID')}. Sunting per bagian.`
    );
  }
}

function tampilkanGalat(pesan) {
  const kotak = el('galat');
  kotak.textContent = pesan;
  kotak.hidden = !pesan;
}

function setSibuk(sibuk, teksProgres = '') {
  el('tombol-jalankan').disabled = sibuk;
  el('formulir').setAttribute('aria-busy', String(sibuk));
  el('status-proses').textContent = sibuk ? teksProgres || 'Menghubungi AI Model…' : '';
}

// ---------- menjalankan penyuntingan model ----------

async function jalankan(ev) {
  ev.preventDefault();
  tampilkanGalat('');

  const masukan = masukanSaatIni();
  try {
    sumberValid(masukan);
  } catch (err) {
    return tampilkanGalat(err.message);
  }

  const penyedia = ambilPenyediaAktif();
  const kunci = ambilKunci(penyedia);
  const model = ambilModel(penyedia);
  const endpoint = ambilEndpointOllama();

  if (!kunci) {
    const namaP = penyedia === 'ollama' ? 'Ollama Cloud' : 'Anthropic';
    tampilkanGalat(
      `Kunci API ${namaP} belum dimasukkan. Silakan masukkan API Key Anda melalui menu Pengaturan Kunci, atau gunakan "Sunting melalui chat" tanpa kunci.`
    );
    bukaModalKunci();
    return;
  }

  pengendaliBatal = new AbortController();
  const namaPenyediaLabel = penyedia === 'ollama' ? `Ollama (${model})` : `Claude (${model})`;
  setSibuk(true, `Menghubungkan ke ${namaPenyediaLabel}…`);

  try {
    const hasil = await suntingBertinjauClient(
      masukan,
      {
        penyedia,
        kunci,
        model,
        endpoint,
        maxTokens: 4096,
      },
      pengendaliBatal.signal,
      (pesanProgres) => setSibuk(true, pesanProgres)
    );

    simpanHasil(masukan, hasil);
    tampilkanHasil();
  } catch (galat) {
    if (galat.kode === 'dibatalkan') {
      tampilkanGalat('Penyuntingan dibatalkan.');
    } else if (galat.kode === 'kunci_ditolak') {
      tampilkanGalat(`${galat.message} Klik "Atur Kunci API" di atas untuk memeriksa kunci.`);
      bukaModalKunci();
    } else {
      tampilkanGalat(galat.message || 'Terjadi kesalahan saat memproses permintaan.');
    }
  } finally {
    setSibuk(false);
    pengendaliBatal = null;
  }
}

function simpanHasil(data, hasil) {
  terakhir = {
    masukan: { ...data },
    sumber: data.teks,
    instruksi: data.instruksi,
    istilah: data.istilah,
    hasil,
    revisiModel: hasil.revisi,
    mode: data.mode,
    nada: data.nada,
    arel: data.arel,
    tujuan: data.tujuan,
    contohGaya: data.contohGaya,
    tinjau: data.tinjau,
    pemeriksaan: periksaPerubahan(data.teks, hasil.revisi, pecahIstilah(data.istilah)),
    waktu: new Date(),
    disuntingManual: false,
  };
}

// ---------- jalur chat (tanpa api key) ----------

function galatChat(pesan = '') {
  el('galat-chat').textContent = pesan;
  el('galat-chat').hidden = !pesan;
}

function siapkanPrompt(data = masukanSaatIni()) {
  try {
    galatChat();
    sumberValid(data);
    promptTersiap = data;
    el('prompt-chat').value = susunPromptChat(data);
    el('rincian-prompt').hidden = false;
    el('tombol-salin-prompt').disabled = false;
    el('sumber-prompt').textContent = `Prompt memakai ${analisisTeks(data.teks).kata} kata sumber; ${LABEL_MODE[data.mode]}, ${LABEL_NADA[data.nada]}, ${LABEL_TUJUAN[data.tujuan]}${data.arel ? ', AREL dan kohesi' : ''}.`;
    el('status-chat').textContent = 'Prompt siap. Salin ke chat (Claude / ChatGPT), lalu tempel hasilnya kembali di bawah.';
  } catch (e) {
    galatChat(e.message);
  }
}

async function salinPrompt() {
  try {
    await navigator.clipboard.writeText(el('prompt-chat').value);
    el('status-chat').textContent = 'Prompt tersalin ke papan klip!';
  } catch {
    el('rincian-prompt').open = true;
    el('prompt-chat').focus();
    el('prompt-chat').select();
    el('status-chat').textContent = 'Pilih prompt yang disorot dan salin dengan Ctrl+C.';
  }
}

function imporHasil() {
  try {
    galatChat();
    const data = promptTersiap || masukanSaatIni();
    sumberValid(data);
    const hasil = bacaHasilChat(el('revisi-chat').value);
    if (hasil.revisi.length > 40000) throw new Error('Revisi terlalu panjang untuk dibandingkan.');
    simpanHasil(data, { ...hasil, sumber: 'chat', penyedia: 'Impor chat manual', model: null });
    tampilkanHasil();
  } catch (e) {
    galatChat(e.message);
  }
}

function periksaHasilLama() {
  if (!terakhir) return;
  const data = masukanSaatIni();
  el('hasil-lama').hidden = masukanSama(data, terakhir.masukan);
}

// ---------- menampilkan hasil ----------

function tampilkanHasil() {
  const { sumber, hasil, pemeriksaan } = terakhir;
  const lencana = el('lencana-sumber');
  lencana.textContent = `${hasil.sumber === 'chat' ? 'Impor manual' : `Hasil ${hasil.penyedia}`}${hasil.model ? ` · ${hasil.model}` : ''}`;

  el('fokus-hasil').hidden = !terakhir.arel;
  el('fokus-hasil').textContent = `Fokus yang diminta: AREL dan kohesi (${LABEL_MODE[terakhir.mode]}). Tinjau penataan pada tab Masukan dan catatan; pemeriksaan pola tidak menilai mutu argumen.`;
  el('rincian-draf').open = false;

  el('teks-awal').textContent = sumber;
  el('teks-revisi').value = hasil.revisi;
  el('konfirmasi-hasil').checked = false;
  tampilkanPerbandingan(sumber, hasil.revisi);

  el('judul-daftar-masukan').textContent = 'Masukan Editorial';
  isiDaftar(el('daftar-masukan'), hasil.masukan, 'Tidak ada masukan khusus.');
  isiDaftar(el('daftar-catatan'), hasil.catatan, 'Tidak ada catatan.');

  tampilkanPemeriksaan(sumber, hasil.revisi, pemeriksaan);
  const hitung = el('jumlah-tanda');
  hitung.textContent = String(pemeriksaan.jumlahTanda);
  hitung.classList.toggle('aman', pemeriksaan.jumlahTanda === 0);

  el('umpan').textContent = '';
  el('bagian-hasil').hidden = false;
  perbaruiRevisi();
  periksaHasilLama();
  pilihTab('berdampingan');
  el('bagian-hasil').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function isiDaftar(wadah, butir, kosong) {
  wadah.replaceChildren();
  wadah.classList.toggle('kosong', butir.length === 0);
  for (const teks of butir.length ? butir : [kosong]) {
    const li = document.createElement('li');
    li.textContent = teks;
    wadah.appendChild(li);
  }
}

function perbaruiRevisi() {
  if (!terakhir) return;
  const teks = el('teks-revisi').value;
  if (teks !== terakhir.hasil.revisi) el('konfirmasi-hasil').checked = false;
  terakhir.hasil.revisi = teks;
  terakhir.disuntingManual = teks !== terakhir.revisiModel;
  terakhir.pemeriksaan = periksaPerubahan(terakhir.sumber, teks, pecahIstilah(terakhir.istilah));
  tampilkanPerbandingan(terakhir.sumber, teks);
  tampilkanPemeriksaan(terakhir.sumber, teks, terakhir.pemeriksaan);
  const awal = analisisTeks(terakhir.sumber);
  const akhir = analisisTeks(teks);
  el('ringkasan-hasil').textContent = `${awal.kata} → ${akhir.kata} kata · ${awal.paragraf} → ${akhir.paragraf} paragraf · kalimat terpanjang ${awal.panjangMaks} → ${akhir.panjangMaks} kata${terakhir.disuntingManual ? ' · sudah disunting manual' : ''}.`;
  const kurasi = tinjauanKurasi(terakhir.sumber, teks, terakhir.arel || terakhir.tujuan === 'ringkas');
  el('tinjauan-kurasi').hidden = !kurasi;
  el('tinjauan-kurasi').textContent = kurasi;
  el('jumlah-tanda').textContent = String(terakhir.pemeriksaan.jumlahTanda);
  el('jumlah-tanda').classList.toggle('aman', !terakhir.pemeriksaan.jumlahTanda);
  perbaruiIzinSalin();
  tampilkanTinjauan();
  tampilkanSaranRevisi();
}

function perbaruiIzinSalin() {
  if (!terakhir) return;
  const n = terakhir.pemeriksaan.jumlahTanda;
  el('label-konfirmasi').hidden = !n;
  const kosong = !terakhir.hasil.revisi.trim();
  const boleh = !kosong && (!n || el('konfirmasi-hasil').checked);
  for (const id of ['tombol-salin', 'tombol-txt', 'tombol-md']) el(id).disabled = !boleh;
  el('status-tinjau').classList.toggle('perlu', Boolean(n));
  el('status-tinjau').textContent = kosong
    ? 'Revisi masih kosong.'
    : n
    ? `${n} tanda perubahan perlu ditinjau. Buka tab pemeriksaan, lalu centang konfirmasi sebelum menyalin.`
    : 'Tidak ditemukan perubahan pola unsur penting. Tetap baca ulang revisi.';
}

function tampilkanPerbandingan(awal, revisi) {
  const hasil = bandingkanKata(awal, revisi);
  const wadah = el('teks-diff');
  wadah.replaceChildren();
  let awalBaris = true;
  for (const seg of hasil.segmen) {
    const node = document.createElement(seg.jenis === 'hapus' ? 'del' : seg.jenis === 'tambah' ? 'ins' : 'span');
    let teks = '';
    for (const token of seg.token) {
      if (adalahBaris(token)) {
        teks += token;
        awalBaris = true;
      } else {
        teks += (awalBaris ? '' : ' ') + token;
        awalBaris = false;
      }
    }
    node.textContent = teks;
    wadah.appendChild(node);
  }
  el('statistik-diff').textContent =
    `${hasil.dihapus.toLocaleString('id-ID')} kata dihapus, ${hasil.ditambah.toLocaleString('id-ID')} kata ditambahkan` +
    (hasil.kasar ? ' (teks terlalu panjang untuk perbandingan per kata)' : '');
}

const KELOMPOK = [
  ['angka', 'Angka'],
  ['sitasi', 'Sitasi (Penulis, tahun)'],
  ['peraturan', 'Rujukan peraturan (Pasal, Nomor ... Tahun ...)'],
  ['satuan', 'Angka beserta satuannya (persen, rupiah, hektare, dll.)'],
  ['hukum', 'Kata hukum: wajib, harus, dilarang, paling sedikit, dan/atau'],
  ['kepastian', 'Negasi dan tingkat kepastian'],
  ['pembatas', 'Kata pembatas: hanya, masih, sekadar'],
  ['atribusi', 'Atribusi sumber: menurut, dilaporkan, diklaim'],
  ['kausal', 'Asosiasi dan sebab-akibat: terkait, karena, menyebabkan'],
  ['inferensi', 'Penghubung kesimpulan: dengan demikian, karena itu, maka'],
  ['rencana', 'Rencana dan pelaksanaan: akan, ditargetkan, telah'],
  ['konsep', 'Istilah konseptual'],
  ['istilah', 'Istilah yang dikunci'],
];

function tampilkanPemeriksaan(awal, revisi, hasil) {
  const wadah = el('hasil-pemeriksaan');
  wadah.replaceChildren();
  if (hasil.jumlahTanda === 0) {
    const p = document.createElement('p');
    p.className = 'aman-semua';
    p.textContent = 'Tidak ada perubahan pola pada angka, satuan, sitasi, peraturan, kata hukum, kepastian, pembatas, atribusi, atau istilah terkunci.';
    wadah.appendChild(p);
    return;
  }
  for (const [kunci, judul] of KELOMPOK) {
    const { hilang, baru } = hasil[kunci];
    if (!hilang.length && !baru.length) continue;
    const blok = document.createElement('div');
    blok.className = 'kelompok';
    const h = document.createElement('h3');
    h.textContent = judul;
    blok.appendChild(h);
    for (const butir of hilang) blok.appendChild(tanda(butir, 'hilang', awal));
    for (const butir of baru) blok.appendChild(tanda(butir, 'baru', revisi));
    wadah.appendChild(blok);
  }
  if (hasil.emDash) {
    const blok = document.createElement('div');
    blok.className = 'kelompok';
    blok.innerHTML = '<h3>Tanda pisah em</h3>';
    const d = document.createElement('div');
    d.className = 'tanda';
    d.textContent = `Revisi memuat ${hasil.emDash} tanda pisah em (—). Ganti dengan koma atau tanda hubung sesuai EYD.`;
    blok.appendChild(d);
    wadah.appendChild(blok);
  }
}

function tanda(butir, jenis, teksAsal) {
  const d = document.createElement('div');
  d.className = jenis === 'baru' ? 'tanda baru' : 'tanda';
  const kode = document.createElement('code');
  kode.textContent = butir.nilai;
  d.append(
    jenis === 'baru' ? 'Muncul di revisi tetapi tidak ada di teks awal: ' : 'Ada di teks awal tetapi berkurang atau hilang di revisi: ',
    kode,
    ` (teks awal ${butir.awal}×, revisi ${butir.revisi}×)`
  );
  const k = konteks(teksAsal, butir.nilai);
  if (k) {
    const span = document.createElement('span');
    span.className = 'konteks';
    span.textContent = `${jenis === 'baru' ? 'Di revisi' : 'Di teks awal'}: ${k}`;
    d.appendChild(span);
  }
  return d;
}

function tampilkanTinjauan() {
  const r = ringkasTinjauan(terakhir.hasil, terakhir.tinjau, terakhir.disuntingManual);
  el('status-model').textContent = `${r.judul}${r.penyedia ? ` · ${r.penyedia}` : ''}. ${r.pesan}`;
  el('status-model').classList.toggle('perlu', ['gagal', 'diubah_manual', 'tidak_tersedia'].includes(r.status));
  el('rincian-draf').hidden = !r.draf;
  el('draf-editor').textContent = r.draf || '';
  el('tombol-draf').disabled = !r.draf || r.draf === terakhir.hasil.revisi;
}

function gunakanDraf() {
  if (!terakhir) return;
  const r = ringkasTinjauan(terakhir.hasil, terakhir.tinjau, terakhir.disuntingManual);
  if (!r.draf) return;
  el('teks-revisi').value = r.draf;
  perbaruiRevisi();
  umpan('Draf pertama digunakan.');
  el('teks-revisi').focus({ preventScroll: true });
}

// ---------- saran pilihan kata lokal ----------

const riwayatSaran = new WeakMap();

function barisSaran(wadah, kelas, teks) {
  const li = document.createElement('li');
  li.className = kelas;
  li.textContent = teks;
  wadah.appendChild(li);
  return li;
}

function tampilkanSaran(wadah, ambil, setel, istilah = []) {
  const teks = ambil();
  wadah.replaceChildren();
  if (riwayatSaran.get(wadah)?.sesudah !== teks) riwayatSaran.delete(wadah);
  if (riwayatSaran.has(wadah)) {
    const li = barisSaran(wadah, 'urungkan', '');
    const tombol = document.createElement('button');
    tombol.type = 'button';
    tombol.textContent = 'Urungkan perubahan terakhir';
    tombol.addEventListener('click', () => {
      const r = riwayatSaran.get(wadah);
      riwayatSaran.delete(wadah);
      if (r && ambil() === r.sesudah) setel(r.sebelum);
      tampilkanSaran(wadah, ambil, setel, istilah);
    });
    li.appendChild(tombol);
  }
  if (!teks.trim()) return void barisSaran(wadah, 'kosong', 'Teks masih kosong.');
  if (teks.length > BATAS_TEKS_SARAN) return void barisSaran(wadah, 'kosong', 'Teks terlalu panjang untuk saran lokal.');
  const daftar = cariSaranKata(teks, istilah);
  if (!daftar.length) return void barisSaran(wadah, 'kosong', 'Tidak ada saran lokal untuk teks ini.');
  for (const item of daftar.slice(0, BATAS_SARAN)) {
    const li = document.createElement('li');
    const kode = document.createElement('code');
    kode.textContent = item.asli;
    li.append(kode, ' → ');
    for (const pilihan of item.saran) {
      const tombol = document.createElement('button');
      tombol.type = 'button';
      tombol.className = 'pilihan-saran';
      tombol.textContent = pilihan || 'hapus';
      tombol.setAttribute('aria-label', pilihan ? `Ganti "${item.asli}" dengan "${pilihan}"` : `Hapus "${item.asli}"`);
      tombol.addEventListener('click', () => {
        const sebelum = ambil();
        const baru = terapkanSaran(sebelum, item, pilihan);
        if (baru !== null) {
          setel(baru);
          riwayatSaran.set(wadah, { sebelum, sesudah: baru });
        }
        tampilkanSaran(wadah, ambil, setel, istilah);
      });
      li.appendChild(tombol);
    }
    const ket = document.createElement('span');
    ket.className = 'konteks';
    const awal = Math.max(0, item.mulai - 40);
    const akhir = Math.min(teks.length, item.akhir + 40);
    ket.textContent = `${item.alasan} Konteks: ${awal > 0 ? '…' : ''}${teks.slice(awal, akhir).replace(/\s+/g, ' ')}${akhir < teks.length ? '…' : ''}`;
    li.appendChild(ket);
    wadah.appendChild(li);
  }
}

function tampilkanSaranSumber() {
  const wadah = el('saran-sumber');
  wadah.hidden = false;
  tampilkanSaran(wadah, () => el('sumber').value, (teks) => {
    el('sumber').value = teks;
    el('sumber').dispatchEvent(new Event('input', { bubbles: true }));
  }, pecahIstilah(el('istilah').value));
}

function tampilkanSaranRevisi() {
  tampilkanSaran(el('saran-revisi'), () => el('teks-revisi').value, (teks) => {
    el('teks-revisi').value = teks;
    perbaruiRevisi();
  }, pecahIstilah(terakhir?.istilah || ''));
}

// ---------- tab & salin/unduh ----------

function pilihTab(nama, fokus = false) {
  for (const t of TAB) {
    el(`tab-${t}`).setAttribute('aria-selected', String(t === nama));
    el(`tab-${t}`).tabIndex = t === nama ? 0 : -1;
    el(`panel-${t}`).tabIndex = 0;
    el(`panel-${t}`).hidden = t !== nama;
  }
  if (fokus) el(`tab-${nama}`).focus();
}

function umpan(pesan, lama = 4000) {
  el('umpan').textContent = pesan;
  clearTimeout(umpan.pengatur);
  umpan.pengatur = setTimeout(() => { el('umpan').textContent = ''; }, lama);
}

async function salin() {
  perbaruiRevisi();
  if (el('tombol-salin').disabled) return;
  const teks = terakhir.hasil.revisi;
  try {
    await navigator.clipboard.writeText(teks);
    umpan('Revisi tersalin ke papan klip.');
  } catch {
    const area = document.createElement('textarea');
    area.value = teks;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
    umpan('Revisi tersalin.');
  }
}

function stempelWaktu(d) {
  const dua = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${dua(d.getMonth() + 1)}${dua(d.getDate())}-${dua(d.getHours())}${dua(d.getMinutes())}`;
}

function unduh(namaBerkas, isi, jenis) {
  const url = URL.createObjectURL(new Blob([isi], { type: jenis }));
  const a = document.createElement('a');
  a.href = url;
  a.download = namaBerkas;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function unduhTxt() {
  perbaruiRevisi();
  if (el('tombol-txt').disabled) return;
  unduh(`revisi-${stempelWaktu(terakhir.waktu)}.txt`, terakhir.hasil.revisi.replace(/\r?\n/g, '\r\n'), 'text/plain;charset=utf-8');
  umpan('Berkas TXT diunduh.');
}

function susunMarkdown(t) {
  const tinjauan = ringkasTinjauan(t.hasil, t.tinjau, t.disuntingManual);
  const daftar = (butir, kosong, bernomor = false) =>
    butir.length ? butir.map((b, i) => `${bernomor ? `${i + 1}.` : '-'} ${b}`).join('\n') : kosong;
  const p = t.pemeriksaan;
  const baris = [];
  for (const [kunci, judul] of KELOMPOK) {
    for (const b of p[kunci]?.hilang || []) baris.push(`- ${judul}: \`${b.nilai}\` hilang/berkurang`);
    for (const b of p[kunci]?.baru || []) baris.push(`- ${judul}: \`${b.nilai}\` muncul baru`);
  }
  return [
    '# Hasil Editor Akademik Dimas',
    '',
    `- Waktu: ${t.waktu.toLocaleString('id-ID')}`,
    `- Model: ${t.hasil.penyedia}${t.hasil.model ? ` (${t.hasil.model})` : ''}`,
    `- Mode: ${LABEL_MODE[t.mode]}; nada: ${LABEL_NADA[t.nada]}; tujuan: ${LABEL_TUJUAN[t.tujuan || 'lancar']}`,
    `- Status tinjauan: ${tinjauan.judul}. ${tinjauan.pesan}`,
    '',
    '## Masukan Editorial',
    daftar(t.hasil.masukan, 'Tidak ada masukan.', true),
    '',
    '## Teks Revisi',
    t.hasil.revisi,
    '',
    '## Catatan yang Perlu Diperiksa',
    daftar(t.hasil.catatan, 'Tidak ada catatan.'),
    '',
    '## Teks Awal',
    t.sumber,
    '',
  ].join('\n');
}

function unduhMarkdown() {
  perbaruiRevisi();
  if (el('tombol-md').disabled) return;
  unduh(`revisi-${stempelWaktu(terakhir.waktu)}.md`, susunMarkdown(terakhir), 'text/markdown;charset=utf-8');
  umpan('Berkas Markdown diunduh.');
}

function kembali() {
  el('bagian-sumber').scrollIntoView({ behavior: 'smooth', block: 'start' });
  el('sumber').focus({ preventScroll: true });
}

// ---------- pasang event listener ----------

el('formulir').addEventListener('submit', jalankan);
el('sumber').addEventListener('input', perbaruiPenghitung);
el('tombol-saran-sumber').addEventListener('click', tampilkanSaranSumber);
el('sumber').addEventListener('input', () => { if (!el('saran-sumber').hidden) tampilkanSaranSumber(); });

for (const id of ['sumber', 'instruksi', 'istilah', 'contoh-gaya']) el(id).addEventListener('input', periksaHasilLama);
for (const id of ['tujuan', 'tinjau']) el(id).addEventListener('change', periksaHasilLama);
el('arel').addEventListener('change', periksaHasilLama);
for (const nama of ['mode', 'nada']) for (const input of document.querySelectorAll(`input[name="${nama}"]`)) input.addEventListener('change', periksaHasilLama);

el('tombol-prompt').addEventListener('click', () => siapkanPrompt());
el('tombol-salin-prompt').addEventListener('click', salinPrompt);
el('tombol-impor').addEventListener('click', imporHasil);

el('teks-revisi').addEventListener('input', perbaruiRevisi);
el('konfirmasi-hasil').addEventListener('change', perbaruiIzinSalin);
el('tombol-salin').addEventListener('click', salin);
el('tombol-txt').addEventListener('click', unduhTxt);
el('tombol-md').addEventListener('click', unduhMarkdown);
el('tombol-kembali').addEventListener('click', kembali);
el('tombol-draf').addEventListener('click', gunakanDraf);

// Modal Kunci API & Penyedia
el('lencana-status').addEventListener('click', bukaModalKunci);
el('tombol-buka-modal-kunci').addEventListener('click', bukaModalKunci);
el('tombol-tutup-kunci').addEventListener('click', tutupModalKunci);
el('pilihan-penyedia').addEventListener('change', sesuaikanTampilanPenyediaModal);
el('formulir-kunci').addEventListener('submit', simpanPengaturanKunci);
el('tombol-hapus-kunci').addEventListener('click', hapusKunciPengguna);
el('tombol-lihat-kunci').addEventListener('click', togolLihatKunci);

for (const t of TAB) {
  el(`tab-${t}`).tabIndex = t === 'berdampingan' ? 0 : -1;
  el(`tab-${t}`).addEventListener('click', () => pilihTab(t));
}

// Inisialisasi awal
perbaruiStatusKunci();
perbaruiPenghitung();
