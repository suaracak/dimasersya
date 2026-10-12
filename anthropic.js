// Pemanggilan Anthropic Claude Messages API langsung dari browser pengguna.
// Menjamin kunci API HANYA dikirim ke https://api.anthropic.com/v1/messages dan tidak pernah ke server lain.
// Header 'anthropic-dangerous-direct-browser-access: true' wajib untuk panggilan browser (CORS resmi Anthropic).
import { SISTEM, SKEMA_HASIL, susunPesan, validasiHasil } from './prompt.js';

export class GalatAnthropic extends Error {
  constructor(kode, pesan, statusHttp = 0) {
    super(pesan);
    this.name = 'GalatAnthropic';
    this.kode = kode;
    this.statusHttp = statusHttp;
  }
}

function ekstrakJsonDariTeks(teks) {
  if (!teks || typeof teks !== 'string') return null;
  const bersih = teks.trim();
  try {
    return JSON.parse(bersih);
  } catch {}

  // Coba hapus blok markdown ```json ... ```
  const polaBlok = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const cocokBlok = bersih.match(polaBlok);
  if (cocokBlok && cocokBlok[1]) {
    try {
      return JSON.parse(cocokBlok[1].trim());
    } catch {}
  }

  // Coba ambil substring dari kurung kurawal terluar { ... }
  const awal = bersih.indexOf('{');
  const akhir = bersih.lastIndexOf('}');
  if (awal !== -1 && akhir !== -1 && akhir > awal) {
    try {
      return JSON.parse(bersih.slice(awal, akhir + 1));
    } catch {}
  }

  return null;
}

function uraikanGalatResponse(status, data, model) {
  const tipe = data?.error?.type;
  const pesanAsli = data?.error?.message || '';

  if (status === 401 || tipe === 'authentication_error') {
    return new GalatAnthropic(
      'kunci_ditolak',
      'API Key Anthropic ditolak (401 Unauthorized). Pastikan Anda memasukkan kunci yang valid dan aktif di menu Pengaturan Kunci.',
      401
    );
  }
  if (status === 403 || tipe === 'permission_error') {
    return new GalatAnthropic(
      'akses_ditolak',
      `Akses ditolak (403 Forbidden). Kunci Anda tidak memiliki izin untuk model "${model}" atau saldo kredit belum mencukupi.`,
      403
    );
  }
  if (status === 404 || tipe === 'not_found_error') {
    return new GalatAnthropic(
      'model_tidak_ditemukan',
      `Model "${model}" tidak ditemukan (404 Not Found). Coba ganti model ke Claude 3.5 Sonnet atau Haiku di menu Pengaturan Kunci.`,
      404
    );
  }
  if (status === 429 || tipe === 'rate_limit_error') {
    return new GalatAnthropic(
      'batas_permintaan',
      'Batas kuota atau rate limit Anthropic tercapai (429 Rate Limit). Tunggu beberapa saat sebelum mencoba kembali.',
      429
    );
  }
  if (status === 529 || tipe === 'overloaded_error') {
    return new GalatAnthropic(
      'provider_sibuk',
      'Server Anthropic sedang kelebihan beban (529 Overloaded). Silakan coba lagi beberapa saat lagi.',
      529
    );
  }
  if (status === 400 || tipe === 'invalid_request_error') {
    return new GalatAnthropic(
      'permintaan_ditolak',
      `Anthropic menolak format permintaan: ${pesanAsli || 'Periksa panjang teks atau model yang dipilih.'}`,
      400
    );
  }
  return new GalatAnthropic(
    'provider_galat',
    `API Anthropic mengembalikan galat (HTTP ${status}): ${pesanAsli || 'Terjadi kesalahan pada layanan Anthropic.'}`,
    status
  );
}

export async function suntingDenganAnthropic(masukan, { kunci, model = 'claude-3-5-sonnet-20241022', maxTokens = 4096 }, signal) {
  if (!kunci || !kunci.trim()) {
    throw new GalatAnthropic(
      'kunci_kosong',
      'Kunci API Anthropic belum diisi. Klik tombol "🔑 Kunci API" di pojok kanan atas untuk memasukkan API Key Anda.'
    );
  }

  const endpoint = 'https://api.anthropic.com/v1/messages';
  const pesanPrompt = susunPesan(masukan);

  const payload = {
    model: model || 'claude-3-5-sonnet-20241022',
    max_tokens: maxTokens,
    system: SISTEM,
    messages: [{ role: 'user', content: pesanPrompt }],
    output_config: { format: { type: 'json_schema', schema: SKEMA_HASIL } },
  };

  const headers = {
    'content-type': 'application/json',
    'x-api-key': kunci.trim(),
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  };

  let respons;
  let teksRespons;

  try {
    respons = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      signal,
    });
    teksRespons = await respons.text();
  } catch (err) {
    if (signal?.aborted) {
      throw new GalatAnthropic('dibatalkan', 'Penyuntingan dibatalkan.');
    }
    throw new GalatAnthropic(
      'jaringan',
      `Tidak dapat terhubung ke Anthropic API (${err.message}). Periksa koneksi internet Anda.`
    );
  }

  let dataJson = null;
  try {
    dataJson = JSON.parse(teksRespons);
  } catch {
    dataJson = null;
  }

  // Jika gagal 400 karena model belum mendukung output_config, kirim ulang tanpa output_config
  if (!respons.ok && respons.status === 400 && dataJson?.error?.message?.toLowerCase().includes('output_config')) {
    delete payload.output_config;
    try {
      respons = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal,
      });
      teksRespons = await respons.text();
      try { dataJson = JSON.parse(teksRespons); } catch { dataJson = null; }
    } catch (err) {
      if (signal?.aborted) throw new GalatAnthropic('dibatalkan', 'Penyuntingan dibatalkan.');
      throw new GalatAnthropic('jaringan', `Koneksi terputus: ${err.message}`);
    }
  }

  if (!respons.ok) {
    throw uraikanGalatResponse(respons.status, dataJson, model);
  }

  if (!dataJson) {
    throw new GalatAnthropic('respons_tidak_valid', 'Respons dari Anthropic tidak dapat dibaca.');
  }

  if (dataJson.stop_reason === 'refusal') {
    throw new GalatAnthropic(
      'ditolak',
      'Anthropic menolak memproses teks ini karena pembatasan konten/kebijakan model.',
      422
    );
  }
  if (dataJson.stop_reason === 'max_tokens') {
    throw new GalatAnthropic(
      'terpotong',
      'Hasil terpotong karena melebihi batas token maksimum. Sunting teks per bagian atau gunakan teks yang lebih ringkas.',
      502
    );
  }

  const teksHasil = Array.isArray(dataJson.content)
    ? dataJson.content
        .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
        .map((b) => b.text)
        .join('')
    : '';

  const objekTerkurai = ekstrakJsonDariTeks(teksHasil);
  const hasil = validasiHasil(objekTerkurai);

  if (!hasil) {
    throw new GalatAnthropic(
      'format_tidak_valid',
      'Respons model tidak sesuai dengan format JSON editorial yang diharapkan (masukan, revisi, catatan).'
    );
  }

  return {
    sumber: 'model',
    penyedia: 'Anthropic (Claude API - BYOK)',
    model: dataJson.model || model,
    ...hasil,
  };
}
