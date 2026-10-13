// Pengelolaan Kunci API & Model di Browser Pengguna (BYOK - Bring Your Own Key)
// Mendukung Anthropic Claude & Ollama Cloud (misal: gpt-oss:120b)
// Kunci API HANYA disimpan di browser ini (localStorage atau sesi memori).
// Kunci TIDAK PERNAH dikirim ke server hosting atau pihak ketiga mana pun.

const PENYEDIA_KEY = 'ead_penyedia'; // 'anthropic' | 'ollama'
const KUNCI_ANTHROPIC_KEY = 'ead_anthropic_api_key';
const MODEL_ANTHROPIC_KEY = 'ead_anthropic_model';
const KUNCI_OLLAMA_KEY = 'ead_ollama_api_key';
const MODEL_OLLAMA_KEY = 'ead_ollama_model';
const ENDPOINT_OLLAMA_KEY = 'ead_ollama_endpoint';
const SIMPAN_PERMANEN_KEY = 'ead_simpan_permanen';

export const PENYEDIA_DEFAULT = 'anthropic';

export const MODEL_ANTHROPIC_PILIHAN = [
  { id: 'claude-3-5-sonnet-20241022', nama: 'Claude 3.5 Sonnet (Rekomendasi - Kualitas Terbaik)', ringkas: 'Sonnet 3.5' },
  { id: 'claude-3-5-haiku-20241022', nama: 'Claude 3.5 Haiku (Sangat Cepat & Hemat Token)', ringkas: 'Haiku 3.5' },
  { id: 'claude-3-opus-20240229', nama: 'Claude 3 Opus (Analisis Mendalam)', ringkas: 'Opus 3' },
];

export const MODEL_OLLAMA_PILIHAN = [
  { id: 'gpt-oss:120b', nama: 'gpt-oss:120b (Gratis / Komunitas)', ringkas: 'gpt-oss:120b' },
  { id: 'llama3.3:70b', nama: 'Llama 3.3 70B', ringkas: 'Llama 3.3 70B' },
  { id: 'qwen2.5:72b', nama: 'Qwen 2.5 72B', ringkas: 'Qwen 2.5 72B' },
  { id: 'mistral-large', nama: 'Mistral Large', ringkas: 'Mistral Large' },
];

export const ENDPOINT_OLLAMA_DEFAULT = 'https://ollama-proxy.sundysundala.workers.dev';

let memoriKunci = {
  anthropic: '',
  ollama: '',
};

export function ambilPenyediaAktif() {
  try {
    return localStorage.getItem(PENYEDIA_KEY) || PENYEDIA_DEFAULT;
  } catch {
    return PENYEDIA_DEFAULT;
  }
}

export function simpanPenyediaAktif(penyedia) {
  try {
    localStorage.setItem(PENYEDIA_KEY, penyedia || PENYEDIA_DEFAULT);
  } catch {}
}

export function ambilKunci(penyedia = ambilPenyediaAktif()) {
  if (memoriKunci[penyedia]) return memoriKunci[penyedia];
  try {
    const keyStorage = penyedia === 'ollama' ? KUNCI_OLLAMA_KEY : KUNCI_ANTHROPIC_KEY;
    const tersimpan = localStorage.getItem(keyStorage);
    if (tersimpan) {
      memoriKunci[penyedia] = tersimpan.trim();
      return memoriKunci[penyedia];
    }
  } catch {}
  return '';
}

export function simpanKunci(kunci, penyedia = ambilPenyediaAktif(), permanen = true) {
  const bersih = (kunci || '').trim();
  memoriKunci[penyedia] = bersih;
  const keyStorage = penyedia === 'ollama' ? KUNCI_OLLAMA_KEY : KUNCI_ANTHROPIC_KEY;
  try {
    if (permanen && bersih) {
      localStorage.setItem(keyStorage, bersih);
      localStorage.setItem(SIMPAN_PERMANEN_KEY, 'true');
    } else {
      localStorage.removeItem(keyStorage);
    }
  } catch {}
}

export function hapusSemuaKunci() {
  memoriKunci.anthropic = '';
  memoriKunci.ollama = '';
  try {
    localStorage.removeItem(KUNCI_ANTHROPIC_KEY);
    localStorage.removeItem(KUNCI_OLLAMA_KEY);
    localStorage.removeItem(SIMPAN_PERMANEN_KEY);
  } catch {}
}

export function apakahKunciTersimpanPermanen() {
  try {
    return localStorage.getItem(SIMPAN_PERMANEN_KEY) === 'true';
  } catch {
    return false;
  }
}

export function ambilModel(penyedia = ambilPenyediaAktif()) {
  try {
    if (penyedia === 'ollama') {
      return localStorage.getItem(MODEL_OLLAMA_KEY) || 'gpt-oss:120b';
    }
    return localStorage.getItem(MODEL_ANTHROPIC_KEY) || 'claude-3-5-sonnet-20241022';
  } catch {
    return penyedia === 'ollama' ? 'gpt-oss:120b' : 'claude-3-5-sonnet-20241022';
  }
}

export function simpanModel(model, penyedia = ambilPenyediaAktif()) {
  try {
    if (penyedia === 'ollama') {
      localStorage.setItem(MODEL_OLLAMA_KEY, model || 'gpt-oss:120b');
    } else {
      localStorage.setItem(MODEL_ANTHROPIC_KEY, model || 'claude-3-5-sonnet-20241022');
    }
  } catch {}
}

export function ambilEndpointOllama() {
  try {
    const tersimpan = localStorage.getItem(ENDPOINT_OLLAMA_KEY);
    // Migrasi: hapus nilai lama yang menunjuk langsung ke ollama.com
    if (tersimpan === 'https://ollama.com' || tersimpan === 'https://ollama.com/') {
      localStorage.removeItem(ENDPOINT_OLLAMA_KEY);
      return ENDPOINT_OLLAMA_DEFAULT;
    }
    return tersimpan || ENDPOINT_OLLAMA_DEFAULT;
  } catch {
    return ENDPOINT_OLLAMA_DEFAULT;
  }
}

export function simpanEndpointOllama(endpoint) {
  try {
    localStorage.setItem(ENDPOINT_OLLAMA_KEY, (endpoint || ENDPOINT_OLLAMA_DEFAULT).trim());
  } catch {}
}

export function validasiFormatKunci(kunci = '', penyedia = 'anthropic') {
  const k = kunci.trim();
  if (!k) return { valid: false, pesan: 'Kunci API belum diisi.' };

  if (penyedia === 'anthropic') {
    if (!k.startsWith('sk-ant-')) {
      return {
        valid: false,
        pesan: 'Format kunci Anthropic biasanya diawali dengan "sk-ant-". Pastikan Anda menyalin kunci dengan benar.',
      };
    }
    if (k.length < 25) {
      return { valid: false, pesan: 'Kunci API Anthropic terlalu pendek.' };
    }
  }

  // Untuk Ollama Cloud atau self-hosted token
  if (penyedia === 'ollama') {
    if (k.length < 6) {
      return { valid: false, pesan: 'Kunci/Token Ollama terlalu pendek.' };
    }
  }

  return { valid: true, pesan: '' };
}
