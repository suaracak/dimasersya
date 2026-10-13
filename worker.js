// Cloudflare Worker: proxy ke Ollama Cloud dengan header CORS.
// Browser memanggil Worker ini, Worker meneruskan ke https://ollama.com.

// Origin yang boleh memakai proxy ini (tanpa path repo, tanpa slash akhir).
const ORIGIN_DIIZINKAN = [
    'https://suaracak.github.io',
    // 'http://localhost:5500',   // aktifkan untuk uji coba lokal
];

// Hanya path ini yang diteruskan.
const PATH_DIIZINKAN = ['/api/chat', '/v1/chat/completions'];

const TARGET = 'https://ollama.com';

function headerCors(origin) {
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, content-type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
    };
}

function responError(pesan, status, cors) {
    return new Response(JSON.stringify({ error: pesan }), {
        status,
        headers: { ...cors, 'content-type': 'application/json' },
    });
}

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';

        // Selalu kirim CORS header bahkan untuk 403, agar browser tidak
        // menampilkan "Failed to fetch" melainkan pesan error yang jelas.
        const corsOrigin = ORIGIN_DIIZINKAN.includes(origin) ? origin : ORIGIN_DIIZINKAN[0];
        const cors = headerCors(corsOrigin);

        if (!ORIGIN_DIIZINKAN.includes(origin)) {
            return responError('Origin tidak diizinkan.', 403, cors);
        }

        // Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        if (request.method !== 'POST') {
            return responError('Metode tidak diizinkan.', 405, cors);
        }

        const url = new URL(request.url);
        if (!PATH_DIIZINKAN.includes(url.pathname)) {
            return responError('Path tidak ditemukan.', 404, cors);
        }

        // Kunci: pakai dari browser (BYOK), kalau kosong pakai secret Worker.
        let auth = request.headers.get('authorization') || '';
        if (!auth && env.OLLAMA_API_KEY) {
            auth = `Bearer ${env.OLLAMA_API_KEY}`;
        }

        // Bungkus fetch ke Ollama dalam try/catch agar error dari upstream
        // selalu dikembalikan dengan CORS header (mencegah "Failed to fetch").
        let resp;
        try {
            resp = await fetch(TARGET + url.pathname, {
                method: 'POST',
                headers: {
                    'content-type': 'application/json',
                    ...(auth ? { authorization: auth } : {}),
                },
                body: request.body,
            });
        } catch (err) {
            return responError(
                `Worker gagal menjangkau Ollama Cloud: ${err.message}. ` +
                `Pastikan TARGET (${TARGET}) dapat diakses dari Cloudflare Workers.`,
                502,
                cors
            );
        }

        return new Response(resp.body, {
            status: resp.status,
            headers: {
                ...cors,
                'content-type': resp.headers.get('content-type') || 'application/json',
            },
        });
    },
};