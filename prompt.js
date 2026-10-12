// Instruksi API dan chat memakai pedoman editorial yang sama.
import {
  PEDOMAN,
  arahanMode,
  arahanStruktur,
  arahanTujuan,
  arahanTahap,
  dataSunting,
  BATAS_BAHAN,
} from './pedoman.js';

export { LABEL_MODE, LABEL_NADA } from './pedoman.js';

export const SISTEM = [
  'Anda adalah penyunting tulisan akademik berbahasa Indonesia. Tugas Anda menilai teks pengguna, ' +
    'merevisinya, lalu menjawab dalam format JSON sesuai skema (masukan, revisi, catatan).',
  '',
  'Prinsip penyuntingan:',
  PEDOMAN,
  '- Gunakan bahasa Indonesia akademik yang jelas sesuai EYD Edisi V dan KBBI.',
  BATAS_BAHAN,
  '',
  'Isi keluaran:',
  '- masukan: paling banyak tiga masukan spesifik tentang bagian yang kaku atau sulit dipahami. Setiap masukan ' +
    'menyebut bagian teksnya dan alasannya.',
  '- revisi: teks hasil revisi yang utuh dan siap ditempel, tanpa komentar, judul tambahan, atau penanda format.',
  '- catatan: klaim, data, atau bagian yang perlu diperiksa pengguna, misalnya klaim tanpa sitasi, angka yang ' +
    'tampak tidak konsisten, atau masalah substansi yang tidak dapat diselesaikan lewat penyuntingan bahasa. ' +
    'Kosongkan bila tidak ada.',
].join('\n');

export const SKEMA_HASIL = {
  type: 'object',
  properties: {
    masukan: {
      type: 'array',
      items: { type: 'string' },
      description: 'Paling banyak tiga masukan spesifik tentang bagian yang kaku atau sulit dipahami.',
    },
    revisi: {
      type: 'string',
      description: 'Teks hasil revisi yang utuh dan siap ditempel.',
    },
    catatan: {
      type: 'array',
      items: { type: 'string' },
      description: 'Klaim atau bagian yang perlu diperiksa pengguna. Boleh kosong.',
    },
  },
  required: ['masukan', 'revisi', 'catatan'],
  additionalProperties: false,
};

export function susunPesan(masukan) {
  const { mode, nada, arel = false, tujuan = 'lancar', tahap } = masukan;
  return [
    arahanMode(mode, nada),
    arahanStruktur(arel, mode),
    arahanTujuan(tujuan),
    arahanTahap(tahap),
    BATAS_BAHAN,
    JSON.stringify(dataSunting(masukan), null, 2),
    '',
    'Sunting teks_sumber sesuai mode dan nada di atas.',
  ].join('\n');
}

export function validasiHasil(data) {
  if (!data || typeof data !== 'object') return null;
  const { masukan, revisi, catatan } = data;
  if (typeof revisi !== 'string' || !revisi.trim()) return null;
  if (!Array.isArray(masukan) || !masukan.every((m) => typeof m === 'string')) return null;
  if (!Array.isArray(catatan) || !catatan.every((c) => typeof c === 'string')) return null;
  return {
    masukan: masukan.map((m) => m.trim()).filter(Boolean).slice(0, 3),
    revisi: revisi.trim(),
    catatan: catatan.map((c) => c.trim()).filter(Boolean),
  };
}
