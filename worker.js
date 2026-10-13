// Cloudflare Worker: proxy ke Ollama Cloud dengan header CORS.
// Browser memanggil Worker ini, Worker meneruskan ke https://ollama.com.

// Origin yang boleh memakai proxy ini (tanpa path repo, tanpa slash akhir).
const ORIGIN_DIIZINKAN = [
    'https://suaracak.github.io', // GANTI dengan username GitHub kamu
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

export default {
    async fetch(request, env) {
        const origin = request.headers.get('Origin') || '';

        if (!ORIGIN_DIIZINKAN.includes(origin)) {
            return new Response('Origin tidak diizinkan.', { status: 403 });
        }

        const cors = headerCors(origin);

        // Preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, { status: 204, headers: cors });
        }

        if (request.method !== 'POST') {
            return new Response('Metode tidak diizinkan.', { status: 405, headers: cors });
        }

        const url = new URL(request.url);
        if (!PATH_DIIZINKAN.includes(url.pathname)) {
            return new Response('Path tidak ditemukan.', { status: 404, headers: cors });
        }

        // Kunci: pakai dari browser (BYOK), kalau kosong pakai secret Worker.
        let auth = request.headers.get('authorization') || '';
        if (!auth && env.OLLAMA_API_KEY) {
            auth = `Bearer ${env.OLLAMA_API_KEY}`;
        }

        const resp = await fetch(TARGET + url.pathname, {
            method: 'POST',
            headers: {
                'content-type': 'application/json',
                ...(auth ? { authorization: auth } : {}),
            },
            body: request.body,
        });

        return new Response(resp.body, {
            status: resp.status,
            headers: {
                ...cors,
                'content-type': resp.headers.get('content-type') || 'application/json',
            },
        });
    },
};