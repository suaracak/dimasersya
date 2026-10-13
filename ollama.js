// Pemanggilan Ollama API dari browser lewat proxy Cloudflare Worker (untuk melewati CORS).
// Mendukung endpoint /api/chat dan /v1/chat/completions (OpenAI compatible).
import { SISTEM, susunPesan, validasiHasil } from './prompt.js';

// GANTI dengan URL Worker kamu setelah deploy.
export const ENDPOINT_BAWAAN = 'https://ollama-proxy.sundysundala.workers.dev';

export class GalatOllama extends Error {
  constructor(kode, pesan, statusHttp = 0) {
    super(pesan);
    this.name = 'GalatOllama';
    this.kode = kode;
    this.statusHttp = statusHttp;
  }
}

function ekstrakJsonDariTeks(teks) {
  if (!teks || typeof teks !== 'string') return null;
  const bersih = teks.trim();
  try {
    return JSON.parse(bersih);
  } catch { }

  // Blok markdown ```json ... ```
  const cocokBlok = bersih.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (cocokBlok && cocokBlok[1]) {
    try {
      return JSON.parse(cocokBlok[1].trim());
    } catch { }
  }

  // Substring kurung kurawal terluar { ... }
  const awal = bersih.indexOf('{');
  const akhir = bersih.lastIndexOf('}');
  if (awal !== -1 && akhir > awal) {
    try {
      return JSON.parse(bersih.slice(awal, akhir + 1));
    } catch { }
  }

  return null;
}

function normalisasiEndpoint(endpointAwal) {
  let ep = (endpointAwal || '').trim();
  return ep || ENDPOINT_BAWAAN;
}

async function kirim(url, headers, body, signal) {
  const respons = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
    signal,
  });
  const teks = await respons.text();
  return { respons, teks };
}

export async function suntingDenganOllama(
  masukan,
  { kunci, model = 'gpt-oss:120b', endpoint = ENDPOINT_BAWAAN } = {},
  signal
) {
  const modelNama = model || 'gpt-oss:120b';
  const urlDasar = normalisasiEndpoint(endpoint);
  const pesanPrompt = susunPesan(masukan);

  const headers = { 'content-type': 'application/json' };
  if (kunci && kunci.trim()) {
    headers.authorization = `Bearer ${kunci.trim()}`;
  }

  const pesan = [
    { role: 'system', content: SISTEM },
    { role: 'user', content: pesanPrompt },
  ];

  const bodyChat = {
    model: modelNama,
    messages: pesan,
    format: 'json',
    stream: false,
    options: { temperature: 0.2, num_ctx: 8192 },
  };

  const bodyOpenAi = {
    model: modelNama,
    messages: pesan,
    response_format: { type: 'json_object' },
    stream: false,
    temperature: 0.2,
  };

  let respons;
  let teksRespons;

  try {
    ({ respons, teks: teksRespons } = await kirim(`${urlDasar}/api/chat`, headers, bodyChat, signal));
  } catch (err) {
    if (signal?.aborted) throw new GalatOllama('dibatalkan', 'Penyuntingan dibatalkan.');

    // Fallback ke endpoint OpenAI-compatible
    try {
      ({ respons, teks: teksRespons } = await kirim(
        `${urlDasar}/v1/chat/completions`,
        headers,
        bodyOpenAi,
        signal
      ));
    } catch (err2) {
      if (signal?.aborted) throw new GalatOllama('dibatalkan', 'Penyuntingan dibatalkan.');
      throw new GalatOllama(
        'jaringan',
        `Gagal menghubungi proxy Ollama (${urlDasar}). /api/chat: ${err.message}; /v1/chat/completions: ${err2.message}. ` +
        `Periksa URL Worker dan pastikan origin halaman ini ada di ORIGIN_DIIZINKAN.`
      );
    }
  }

  let dataJson = null;
  try {
    dataJson = JSON.parse(teksRespons);
  } catch {
    dataJson = null;
  }

  if (!respons.ok) {
    const pesanGalat =
      dataJson?.error?.message || dataJson?.error || dataJson?.message || teksRespons || '';

    if (respons.status === 401) {
      throw new GalatOllama(
        'kunci_ditolak',
        'Kunci API Ollama Cloud ditolak (401 Unauthorized). Periksa API key Anda di Pengaturan Kunci.',
        401
      );
    }
    if (respons.status === 403) {
      throw new GalatOllama(
        'origin_ditolak',
        'Proxy menolak origin halaman ini (403). Tambahkan origin Anda ke ORIGIN_DIIZINKAN di Worker.',
        403
      );
    }
    if (respons.status === 404) {
      throw new GalatOllama(
        'model_tidak_ditemukan',
        `Model "${modelNama}" atau endpoint tidak ditemukan (404). Pastikan nama model sudah sesuai (misal: gpt-oss:120b).`,
        404
      );
    }
    throw new GalatOllama(
      'provider_galat',
      `Ollama mengembalikan galat (HTTP ${respons.status}): ${pesanGalat}`,
      respons.status
    );
  }

  // Ekstrak teks dari format native Ollama, OpenAI-compatible, atau /api/generate
  let teksHasil = '';
  if (dataJson?.message?.content) {
    teksHasil = dataJson.message.content;
  } else if (Array.isArray(dataJson?.choices) && dataJson.choices[0]?.message?.content) {
    teksHasil = dataJson.choices[0].message.content;
  } else if (dataJson?.response) {
    teksHasil = dataJson.response;
  } else if (dataJson?.message?.thinking) {
    // Model reasoning kadang menaruh jawaban di thinking saat content kosong
    teksHasil = dataJson.message.thinking;
  }

  const objekTerkurai = ekstrakJsonDariTeks(teksHasil);
  const hasil = validasiHasil(objekTerkurai);

  if (!hasil) {
    throw new GalatOllama(
      'format_tidak_valid',
      `Model Ollama (${modelNama}) tidak mengembalikan format JSON editorial yang sesuai. Cuplikan balasan: "${teksHasil.slice(0, 150)}..."`
    );
  }

  return {
    sumber: 'model',
    penyedia: 'Ollama Cloud (via proxy)',
    model: dataJson?.model || modelNama,
    ...hasil,
  };
}