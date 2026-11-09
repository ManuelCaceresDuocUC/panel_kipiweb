/**
 * Sesión firmada con HMAC-SHA256 (Web Crypto, funciona en middleware y en rutas de servidor).
 * La clave mezcla el secreto con la contraseña: si cambias cualquiera de las dos, todas las sesiones se invalidan.
 */
export const COOKIE_SESION = 'kp_sesion';
export const DURACION_SESION_S = 60 * 60 * 24 * 14; // 14 días

const enc = new TextEncoder();

function aB64u(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function deB64u(texto: string): Uint8Array<ArrayBuffer> | null {
  try {
    const b64 = texto.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (texto.length % 4)) % 4);
    const bin = atob(b64);
    const out = new Uint8Array(new ArrayBuffer(bin.length));
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function clave(): Promise<CryptoKey | null> {
  const secreto = process.env.PANEL_SESSION_SECRET || '';
  const password = process.env.PANEL_PASSWORD || '';
  if (secreto.length < 32 || password.length < 12) return null;
  return crypto.subtle.importKey('raw', enc.encode(secreto + '|' + password), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function crearSesion(): Promise<string | null> {
  const k = await clave();
  if (!k) return null;
  const carga = aB64u(enc.encode(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + DURACION_SESION_S })));
  const firma = aB64u(new Uint8Array(await crypto.subtle.sign('HMAC', k, enc.encode(carga))));
  return carga + '.' + firma;
}

export async function sesionValida(valor: string | undefined | null): Promise<boolean> {
  if (!valor) return false;
  const partes = valor.split('.');
  if (partes.length !== 2) return false;
  const k = await clave();
  const firma = deB64u(partes[1]);
  if (!k || !firma) return false;
  const ok = await crypto.subtle.verify('HMAC', k, firma, enc.encode(partes[0]));
  if (!ok) return false;
  const cargaBytes = deB64u(partes[0]);
  if (!cargaBytes) return false;
  try {
    const { exp } = JSON.parse(new TextDecoder().decode(cargaBytes));
    return typeof exp === 'number' && exp > Date.now() / 1000;
  } catch {
    return false;
  }
}

/** Evita peticiones de otro sitio (CSRF): el Origin debe coincidir con el host al que se llamó. */
export function mismoOrigen(req: Request): boolean {
  const origen = req.headers.get('origin');
  if (!origen) return false;
  try {
    return new URL(origen).host === req.headers.get('host');
  } catch {
    return false;
  }
}
