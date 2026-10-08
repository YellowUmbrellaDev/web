// Worker de la web. Los estáticos los sirve Cloudflare directamente; este código solo
// atiende /api/*. El correo de contacto no está en el HTML: únicamente se entrega a
// quien supera una comprobación de Turnstile, para que los scrapers no lo recojan.

const CORREO = 'info@yellowumbrella.dev';
const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface Env {
  TURNSTILE_SECRET_KEY?: string;
}

const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
  });

async function correo(request: Request, env: Env): Promise<Response> {
  if (request.method !== 'POST') return json({ error: 'metodo-no-permitido' }, 405, { allow: 'POST' });

  const secreto = env.TURNSTILE_SECRET_KEY;
  if (!secreto) return json({ error: 'servidor-mal-configurado' }, 500);

  let token: unknown;
  try {
    ({ token } = (await request.json()) as { token?: unknown });
  } catch {
    return json({ error: 'peticion-invalida' }, 400);
  }
  if (typeof token !== 'string' || token.length === 0 || token.length > 2048) {
    return json({ error: 'peticion-invalida' }, 400);
  }

  const form = new FormData();
  form.set('secret', secreto);
  form.set('response', token);
  const ip = request.headers.get('CF-Connecting-IP');
  if (ip) form.set('remoteip', ip);

  let success: boolean;
  try {
    const respuesta = await fetch(VERIFY_URL, { method: 'POST', body: form, signal: AbortSignal.timeout(5000) });
    if (!respuesta.ok) return json({ error: 'verificacion-no-disponible' }, 502);
    ({ success } = (await respuesta.json()) as { success: boolean });
  } catch {
    return json({ error: 'verificacion-no-disponible' }, 502);
  }

  return success ? json({ correo: CORREO }) : json({ error: 'verificacion-fallida' }, 403);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const { pathname } = new URL(request.url);
    if (pathname === '/api/correo') return correo(request, env);
    return json({ error: 'no-encontrado' }, 404);
  },
};
