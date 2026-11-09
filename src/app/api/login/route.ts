import { createHash, timingSafeEqual } from 'node:crypto';
import { NextResponse } from 'next/server';
import { leerClavesPanel } from '@/lib/config';
import { COOKIE_SESION, DURACION_SESION_S, crearSesion, mismoOrigen } from '@/lib/sesion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Freno básico contra adivinar la contraseña (por instancia del servidor; el retraso en cada fallo ayuda además)
const intentos = new Map<string, { n: number; hasta: number }>();
const MAX_FALLOS = 5;
const VENTANA_MS = 15 * 60 * 1000;

const sha = (s: string) => createHash('sha256').update(s).digest();
const respuesta = (cuerpo: object, status: number) => NextResponse.json(cuerpo, { status, headers: { 'Cache-Control': 'no-store' } });
const pausa = (ms: number) => new Promise((r) => setTimeout(r, ms));

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return respuesta({ message: 'Solicitud no permitida.' }, 403);
  const claves = leerClavesPanel();
  if (!claves) return respuesta({ message: 'El panel no está configurado: define PANEL_PASSWORD (12+ caracteres) y PANEL_SESSION_SECRET (32+) en el servidor.' }, 503);

  const ip = (req.headers.get('x-forwarded-for') || 'desconocida').split(',')[0].trim();
  const ahora = Date.now();
  const reg = intentos.get(ip);
  if (reg && reg.hasta > ahora && reg.n >= MAX_FALLOS) return respuesta({ message: 'Demasiados intentos. Espera unos minutos.' }, 429);

  let password = '';
  try {
    const cuerpo = await req.json();
    password = typeof cuerpo?.password === 'string' ? cuerpo.password : '';
  } catch {
    return respuesta({ message: 'Solicitud inválida.' }, 400);
  }

  if (!timingSafeEqual(sha(password), sha(claves.password))) {
    const previo = reg && reg.hasta > ahora ? reg.n : 0;
    intentos.set(ip, { n: previo + 1, hasta: ahora + VENTANA_MS });
    await pausa(800);
    return respuesta({ message: 'Contraseña incorrecta.' }, 401);
  }

  intentos.delete(ip);
  const valor = await crearSesion();
  if (!valor) return respuesta({ message: 'No se pudo crear la sesión.' }, 500);
  const res = respuesta({ ok: true }, 200);
  res.cookies.set(COOKIE_SESION, valor, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: DURACION_SESION_S,
  });
  return res;
}
