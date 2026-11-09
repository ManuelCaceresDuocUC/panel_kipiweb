// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dato = any;

export class ErrorApi extends Error {
  status: number;
  codigo?: string;
  constructor(mensaje: string, status: number, codigo?: string) {
    super(mensaje);
    this.status = status;
    this.codigo = codigo;
  }
}

export interface Respuesta {
  data: Dato;
  /** Tiempo que tardó el backend en responder, medido desde el servidor del panel (no desde tu celular). */
  ms: number;
}

/** Llama al proxy del panel. Si la sesión venció, vuelve a la pantalla de ingreso. */
export async function api(metodo: 'GET' | 'POST', ruta: string, cuerpo?: object): Promise<Respuesta> {
  let res: Response;
  try {
    res = await fetch('/api/p/' + ruta, {
      method: metodo,
      headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      cache: 'no-store',
    });
  } catch {
    throw new ErrorApi('Sin conexión a internet.', 0, 'SIN_RED');
  }
  if (res.status === 401) {
    window.location.replace('/login');
    throw new ErrorApi('Sesión vencida.', 401);
  }
  const texto = await res.text();
  let data: Dato = null;
  try {
    data = texto ? JSON.parse(texto) : null;
  } catch {
    data = null;
  }
  if (!res.ok) throw new ErrorApi((data && data.message) || 'Error ' + res.status, res.status, data && data.codigo);
  return { data, ms: Number(res.headers.get('x-backend-ms')) || 0 };
}
