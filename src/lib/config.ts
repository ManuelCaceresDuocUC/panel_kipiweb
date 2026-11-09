/** Variables de entorno del servidor. Nunca se importa desde componentes de cliente. */
export function leerConfig(): { ok: true; backend: string; token: string } | { ok: false; error: string } {
  const backendCrudo = (process.env.BACKEND_URL || '').trim().replace(/\/+$/, '');
  const token = (process.env.OWNER_API_TOKEN || '').trim();
  if (!backendCrudo || !token) return { ok: false, error: 'Falta configurar BACKEND_URL y OWNER_API_TOKEN en el servidor.' };
  let u: URL;
  try {
    u = new URL(backendCrudo);
  } catch {
    return { ok: false, error: 'BACKEND_URL no es una dirección válida.' };
  }
  const local = ['localhost', '127.0.0.1'].includes(u.hostname);
  if (u.protocol !== 'https:' && !local) return { ok: false, error: 'BACKEND_URL debe empezar con https://' };
  return { ok: true, backend: u.origin, token };
}

export function leerClavesPanel(): { password: string; secreto: string } | null {
  const password = process.env.PANEL_PASSWORD || '';
  const secreto = process.env.PANEL_SESSION_SECRET || '';
  if (password.length < 12 || secreto.length < 32) return null;
  return { password, secreto };
}
