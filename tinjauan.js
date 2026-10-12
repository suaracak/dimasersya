// Alur dua tahap editorial (Editor lalu Peninjau terpisah) langsung di browser.
// Mendukung penyedia Anthropic Claude maupun Ollama Cloud (misal: gpt-oss:120b).
import { suntingDenganAnthropic, GalatAnthropic } from './anthropic.js';
import { suntingDenganOllama, GalatOllama } from './ollama.js';

const catatanGabungan = (...daftar) => [...new Set(daftar.flat())];
const metadata = (status, pesan, awal, hasil = {}) => ({
  status,
  pesan,
  draf: awal.revisi,
  penyedia: hasil.penyedia ?? awal.penyedia ?? 'AI Provider',
  model: hasil.model ?? awal.model ?? '',
});

async function jalankanPenyedia(masukan, konfigurasi, signal) {
  if (konfigurasi.penyedia === 'ollama') {
    return await suntingDenganOllama(
      masukan,
      {
        kunci: konfigurasi.kunci,
        model: konfigurasi.model,
        endpoint: konfigurasi.endpoint,
      },
      signal
    );
  }
  return await suntingDenganAnthropic(masukan, konfigurasi, signal);
}

export async function suntingBertinjauClient(masukan, konfigurasi, signal, onProgres = () => {}) {
  const namaPenyedia = konfigurasi.penyedia === 'ollama' ? 'Ollama Cloud' : 'Anthropic Claude';
  onProgres(`Editor (${namaPenyedia}) sedang menyunting teks sumber...`);

  const awal = await jalankanPenyedia(masukan, konfigurasi, signal);

  if (!masukan.tinjau) {
    return awal;
  }

  signal?.throwIfAborted();
  onProgres(`Peninjau (${namaPenyedia}) sedang membandingkan draf editor dengan teks sumber...`);

  try {
    const hasil = await jalankanPenyedia(
      { ...masukan, tahap: 'tinjau', draf: awal.revisi },
      konfigurasi,
      signal
    );
    signal?.throwIfAborted();

    const pesan = 'Tinjauan model selesai. Tetap periksa kesetiaan makna terhadap sumber.';
    const catatanAkhir = new Set(hasil.catatan);
    const catatan = catatanGabungan(
      awal.catatan.filter((c) => !catatanAkhir.has(c)).map((c) => `Editor (draf awal): ${c}`),
      hasil.catatan.map((c) => `Peninjau (hasil akhir): ${c}`)
    );

    const masukanAkhir = hasil.masukan.length
      ? hasil.masukan
      : awal.masukan.map((m) => `Editor (draf awal): ${m}`);

    return {
      ...hasil,
      masukan: masukanAkhir,
      catatan,
      tinjauan: metadata('selesai', pesan, awal, hasil),
    };
  } catch (galat) {
    if (
      signal?.aborted ||
      galat.kode === 'dibatalkan' ||
      (!(galat instanceof GalatAnthropic) && !(galat instanceof GalatOllama))
    ) {
      throw galat;
    }
    const pesan = `Tinjauan tahap kedua gagal (${galat.message}). Draf awal editor dipertahankan.`;
    return {
      ...awal,
      catatan: catatanGabungan(awal.catatan, [pesan]),
      tinjauan: metadata('gagal', pesan, awal),
    };
  }
}
