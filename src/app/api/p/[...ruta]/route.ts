import { NextRequest, NextResponse } from 'next/server';
import { leerConfig } from '@/lib/config';
import { COOKIE_SESION, mismoOrigen, sesionValida } from '@/lib/sesion';

/**
 * Proxy hacia /api/owner/** del backend. El token del dueño vive solo aquí (variable de entorno del servidor):
 * el navegador solo tiene una cookie de sesión httpOnly. Solo se reenvían las rutas que la app usa.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const GET_PERMITIDAS = [/^(resumen|salud|respaldos|errores|empresas)$/, /^empresas\/\d{1,12}$/];
const POST_PERMITIDAS = [/^empresas\/\d{1,12}\/(suspender|reactivar|sincronizar)$/];
const QUERY_PERMITIDA = /^[A-Za-z0-9_\-=&.%]{0,200}$/;

const error = (message: string, status: number, codigo?: string) =>
  NextResponse.json({ message, origen: 'panel', codigo }, { status, headers: { 'Cache-Control': 'no-store' } });

async function manejar(req: NextRequest, ctx: { params: Promise<{ ruta: string[] }> }) {
  if (!(await sesionValida(req.cookies.get(COOKIE_SESION)?.value))) return error('Sesión vencida.', 401);

  const metodo = req.method;
  if (metodo !== 'GET' && metodo !== 'POST') return error('Método no permitido.', 405);
  if (metodo === 'POST' && !mismoOrigen(req)) return error('Solicitud no permitida.', 403);

  const { ruta } = await ctx.params;
  const camino = ruta.join('/');
  const permitidas = metodo === 'GET' ? GET_PERMITIDAS : POST_PERMITIDAS;
  if (!permitidas.some((re) => re.test(camino))) return error('Ruta no permitida.', 404);
  const query = req.nextUrl.search.replace(/^\?/, '');
  if (!QUERY_PERMITIDA.test(query)) return error('Parámetros no permitidos.', 400);

  const cfg = leerConfig();
  if (!cfg.ok) return error(cfg.error, 503, 'SIN_CONFIG');

  let cuerpo: string | undefined;
  if (metodo === 'POST') {
    const texto = await req.text();
    if (texto.length > 4000) return error('Solicitud demasiado grande.', 413);
    cuerpo = texto || undefined;
  }

  const t0 = Date.now();
  try {
    const res = await fetch(`${cfg.backend}/api/owner/${camino}${query ? '?' + query : ''}`, {
      method: metodo,
      headers: {
        Authorization: 'Bearer ' + cfg.token,
        Accept: 'application/json',
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo,
      cache: 'no-store',
      signal: AbortSignal.timeout(25000), // Render puede tardar en despertar
    });
    const ms = Date.now() - t0;
    const texto = await res.text();

    if (res.status === 401) return error('El servidor rechazó el token del panel. Revisa OWNER_API_TOKEN en Vercel.', 502, 'TOKEN_RECHAZADO');
    if (res.status === 404 && camino === 'salud') return error('Panel no disponible en el servidor: ¿está definida OWNER_API_TOKEN en Render?', 502, 'PANEL_NO_DISPONIBLE');

    return new NextResponse(texto, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('content-type') || 'application/json',
        'Cache-Control': 'no-store',
        'x-backend-ms': String(ms),
      },
    });
  } catch (e) {
    const agotado = e instanceof Error && (e.name === 'TimeoutError' || e.name === 'AbortError');
    return error(agotado ? 'El servidor no respondió a tiempo.' : 'No se pudo conectar con el servidor.', 502, 'SIN_CONEXION');
  }
}

export const GET = manejar;
export const POST = manejar;
