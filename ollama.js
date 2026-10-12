// Pemanggilan Ollama API (baik Ollama Cloud maupun Ollama lokal/server) langsung dari browser.
// Mendukung endpoint /api/chat dan /v1/chat/completions (OpenAI compatible).
import { SISTEM, SKEMA_HASIL, susunPesan, validasiHasil } from './prompt.js';

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
  const polaBlok = /```(?:json)?\s*([\s\S]*?)\s*```/i;
  const cocokBlok = bersih.match(polaBlok);
  if (cocokBlok && cocokBlok[1]) {
    try {
      return JSON.parse(cocokBlok[1].trim());
    } catch { }
  }

  // Cari substring kurung kurawal terluar { ... }
  const awal = bersih.indexOf('{');
  const akhir = bersih.lastIndexOf('}');
  if (awal !== -1 && akhir !== -1 && akhir > awal) {
    try {
      return JSON.parse(bersih.slice(awal, akhir + 1));
    } catch { }
  }

  return null;
}

function normalisasiEndpoint(endpointAwal) {
  let ep = (endpointAwal || '').trim();
  if (!ep) ep = 'https://ollama.com';
  // Hapus trailing slash
  ep = ep.replace(/\/+$/, '');
  // Jika pengguna menyertakan /api/chat atau /v1..., hapus agar tidak dobel saat dirangkai
  ep = ep.replace(/\/api\/chat$/i, '');
  ep = ep.replace(/\/v1(?:\/chat\/completions)?$/i, '');
  ep = ep.replace(/\/+$/, '');
  if (!ep) ep = 'https://ollama.com';
  return ep;
}

export async function suntingDenganOllama(
  masukan,
  { kunci, model = 'gpt-oss:120b', endpoint = 'https://ollama.com' },
  signal
) {
  const modelNama = model || 'gpt-oss:120b';
  const urlDasar = normalisasiEndpoint(endpoint);
  const pesanPrompt = susunPesan(masukan);

  // Siapkan header
  const headers = {
    'content-type': 'application/json',
  };
  if (kunci && kunci.trim()) {
    headers.authorization = `Bearer ${kunci.trim()}`;
  }

  // Prioritaskan endpoint /api/chat khas Ollama dengan format: "json"
  const urlChat = `${urlDasar}/api/chat`;
  const bodyChat = {
    model: modelNama,
    messages: [
      { role: 'system', content: SISTEM },
      { role: 'user', content: pesanPrompt },
    ],
    format: 'json',
    stream: false,
    options: {
      temperature: 0.2,
      num_ctx: 8192,
    },
  };

  let respons;
  let teksRespons;

  try {
    respons = await fetch(urlChat, {
      method: 'POST',
      headers,
      body: JSON.stringify(bodyChat),
      signal,
    });
    teksRespons = await respons.text();
  } catch (err) {
    if (signal?.aborted) throw new GalatOllama('dibatalkan', 'Penyuntingan dibatalkan.');

    // Jika gagal terhubung ke /api/chat, coba fallback ke OpenAI-compatible endpoint /v1/chat/completions
    try {
      const urlOpenAi = `${urlDasar}/v1/chat/completions`;
      const bodyOpenAi = {
        model: modelNama,
        messages: [
          { role: 'system', content: SISTEM },
          { role: 'user', content: pesanPrompt },
        ],
        response_format: { type: 'json_object' },
        stream: false,
        temperature: 0.2,
      };
      respons = await fetch(urlOpenAi, {
        method: 'POST',
        headers,
        body: JSON.stringify(bodyOpenAi),
        signal,
      });
      teksRespons = await respons.text();
    } catch (err2) {
      if (signal?.aborted) throw new GalatOllama('dibatalkan', 'Penyuntingan dibatalkan.');
      throw new GalatOllama(
        'jaringan',
        `Gagal menghubungi endpoint Ollama (${urlDasar}): ${err.message}. Pastikan URL endpoint dapat diakses dan CORS diizinkan.`
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
    const pesanGalat = dataJson?.error?.message || dataJson?.error || dataJson?.message || teksRespons || '';
    if (respons.status === 401) {
      throw new GalatOllama(
        'kunci_ditolak',
        `Kunci API Ollama Cloud ditolak (401 Unauthorized). Periksa API key Anda di Pengaturan Kunci.`,
        401
      );
    }
    if (respons.status === 404) {
      throw new GalatOllama(
        'model_tidak_ditemukan',
        `Model "${modelNama}" atau endpoint Ollama tidak ditemukan (404). Pastikan nama model sudah sesuai (misal: gpt-oss:120b).`,
        404
      );
    }
    throw new GalatOllama(
      'provider_galat',
      `Ollama mengembalikan galat (HTTP ${respons.status}): ${pesanGalat}`,
      respons.status
    );
  }

  // Ekstrak teks konten baik dari format native Ollama (/api/chat) maupun OpenAI format (/v1/chat/completions)
  let teksHasil = '';
  if (dataJson?.message?.content) {
    // Format native Ollama
    teksHasil = dataJson.message.content;
  } else if (Array.isArray(dataJson?.choices) && dataJson.choices[0]?.message?.content) {
    // Format OpenAI compatible
    teksHasil = dataJson.choices[0].message.content;
  } else if (dataJson?.response) {
    // Format /api/generate
    teksHasil = dataJson.response;
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
    penyedia: 'Ollama Cloud / Self-Hosted',
    model: dataJson.model || modelNama,
    ...hasil,
  };
}
