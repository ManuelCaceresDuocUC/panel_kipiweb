import { NextRequest, NextResponse } from 'next/server';
import { COOKIE_SESION, sesionValida } from '@/lib/sesion';

/**
 * 1) Pone una política CSP con nonce (sin scripts inline arbitrarios).
 * 2) Exige sesión para todo salvo login, manifest, service worker, iconos y página offline.
 */
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const publico = pathname === '/login' || pathname === '/api/login' || pathname === '/offline';

  if (!publico && !(await sesionValida(req.cookies.get(COOKIE_SESION)?.value))) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ message: 'Sesión vencida.', origen: 'panel' }, { status: 401, headers: { 'Cache-Control': 'no-store' } });
    }
    return NextResponse.redirect(new URL('/login', req.url));
  }

  const nonce = btoa(crypto.randomUUID());
  const dev = process.env.NODE_ENV !== 'production';
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ''}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "font-src 'self'",
    "connect-src 'self'",
    "manifest-src 'self'",
    "worker-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "object-src 'none'",
  ].join('; ');

  const cabeceras = new Headers(req.headers);
  cabeceras.set('x-nonce', nonce);
  cabeceras.set('Content-Security-Policy', csp);
  const res = NextResponse.next({ request: { headers: cabeceras } });
  res.headers.set('Content-Security-Policy', csp);
  res.headers.set('Cache-Control', 'no-store');
  return res;
}

export const config = {
  matcher: [
    {
      source: '/((?!_next/static|_next/image|icons/|manifest.webmanifest|sw.js|favicon.ico).*)',
      missing: [{ type: 'header', key: 'next-router-prefetch' }, { type: 'header', key: 'purpose', value: 'prefetch' }],
    },
  ],
};
