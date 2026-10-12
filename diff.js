// Perbandingan kata antara teks awal dan revisi memakai LCS (subbarisan bersama terpanjang).
// Dipakai di browser tanpa pustaka luar.

const BATAS_SEL = 12_000_000;

export function tokenisasi(teks) {
  const token = teks.replace(/\r\n?/g, '\n').match(/\n+|[^\s]+/g) || [];
  return token.map((t) => (t.startsWith('\n') ? (t.length > 1 ? '\n\n' : '\n') : t));
}

export function adalahBaris(token) {
  return token.startsWith('\n');
}

export function bandingkanKata(awal, akhir) {
  const a = tokenisasi(awal);
  const b = tokenisasi(akhir);

  let depan = 0;
  while (depan < a.length && depan < b.length && a[depan] === b[depan]) depan++;
  let belakang = 0;
  while (
    belakang < a.length - depan &&
    belakang < b.length - depan &&
    a[a.length - 1 - belakang] === b[b.length - 1 - belakang]
  ) belakang++;

  const A = a.slice(depan, a.length - belakang);
  const B = b.slice(depan, b.length - belakang);
  const kasar = A.length * B.length > BATAS_SEL;
  const tengah = kasar
    ? [...A.map((t) => ['hapus', t]), ...B.map((t) => ['tambah', t])]
    : lcs(A, B);

  const urutan = [
    ...a.slice(0, depan).map((t) => ['sama', t]),
    ...tengah,
    ...a.slice(a.length - belakang).map((t) => ['sama', t]),
  ];

  return {
    segmen: susunSegmen(urutan),
    kasar,
    dihapus: urutan.filter(([j, t]) => j === 'hapus' && !adalahBaris(t)).length,
    ditambah: urutan.filter(([j, t]) => j === 'tambah' && !adalahBaris(t)).length,
  };
}

function lcs(A, B) {
  const n = A.length;
  const m = B.length;
  const lebar = m + 1;
  const Larik = Math.min(n, m) < 65535 ? Uint16Array : Uint32Array;
  const L = new Larik((n + 1) * lebar);
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      L[i * lebar + j] = A[i] === B[j]
        ? L[(i + 1) * lebar + j + 1] + 1
        : Math.max(L[(i + 1) * lebar + j], L[i * lebar + j + 1]);
    }
  }
  const hasil = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (A[i] === B[j]) {
      hasil.push(['sama', A[i]]);
      i++;
      j++;
    } else if (L[(i + 1) * lebar + j] >= L[i * lebar + j + 1]) {
      hasil.push(['hapus', A[i++]]);
    } else {
      hasil.push(['tambah', B[j++]]);
    }
  }
  while (i < n) hasil.push(['hapus', A[i++]]);
  while (j < m) hasil.push(['tambah', B[j++]]);
  return hasil;
}

function susunSegmen(urutan) {
  const segmen = [];
  const dorong = (jenis, token) => {
    if (!token.length) return;
    const terakhir = segmen[segmen.length - 1];
    if (terakhir && terakhir.jenis === jenis) terakhir.token.push(...token);
    else segmen.push({ jenis, token: [...token] });
  };
  let hapus = [];
  let tambah = [];
  const tuntaskan = () => {
    dorong('hapus', hapus);
    dorong('tambah', tambah);
    hapus = [];
    tambah = [];
  };
  for (const [jenis, token] of urutan) {
    if (jenis === 'sama') {
      tuntaskan();
      dorong('sama', [token]);
    } else if (jenis === 'hapus') {
      hapus.push(token);
    } else {
      tambah.push(token);
    }
  }
  tuntaskan();
  return segmen;
}
