import { NextResponse } from 'next/server';
import { COOKIE_SESION, mismoOrigen } from '@/lib/sesion';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  if (!mismoOrigen(req)) return NextResponse.json({ message: 'Solicitud no permitida.' }, { status: 403 });
  const res = NextResponse.json({ ok: true }, { headers: { 'Cache-Control': 'no-store' } });
  res.cookies.set(COOKIE_SESION, '', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict', path: '/', maxAge: 0 });
  return res;
}
