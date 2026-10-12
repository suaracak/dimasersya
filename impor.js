export function bacaHasilChat(teks) {
  const isi = teks.trim().replace(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/i, '$1').trim();
  if (!isi) throw new Error('Tempel teks revisi atau JSON hasil chat terlebih dahulu.');
  if (isi.startsWith('{') || isi.startsWith('[')) {
    let data;
    try { data = JSON.parse(isi); } catch { throw new Error('JSON hasil chat belum valid. Tempel objek JSON lengkap, atau hanya teks revisinya.'); }
    if (!data || Array.isArray(data) || typeof data.revisi !== 'string' || !data.revisi.trim()) throw new Error('JSON harus memiliki kolom revisi berupa teks.');
    for (const nama of ['masukan', 'catatan']) {
      if (data[nama] !== undefined && (!Array.isArray(data[nama]) || !data[nama].every((s) => typeof s === 'string'))) throw new Error(`Kolom ${nama} harus berupa daftar teks.`);
    }
    return { revisi: data.revisi.trim(), masukan: (data.masukan || []).filter((s) => s.trim()).slice(0, 3), catatan: (data.catatan || []).filter((s) => s.trim()) };
  }
  return { revisi: isi, masukan: [], catatan: ['Hasil ditempel sebagai teks biasa. Periksa bahwa yang ditempel hanya revisi, tanpa instruksi atau pengantar chat.'] };
}
