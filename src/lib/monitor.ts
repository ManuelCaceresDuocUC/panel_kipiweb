'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, ErrorApi, type Dato } from './api';

export type EstadoSalud = 'DESCONOCIDO' | 'OK' | 'AVISO' | 'CRITICO' | 'SIN_CONEXION';
export interface Problema { codigo: string; nivel: 'AVISO' | 'CRITICO'; mensaje: string }
export interface Muestra { t: number; ms: number | null; bdMs?: number | null; mem?: number | null; cpu?: number | null }
export interface Evento { fecha: string; nivel: string; titulo: string; detalle?: string }
export interface Salud {
  estado: EstadoSalud;
  problemas: Problema[];
  datos: Dato | null;
  muestras: Muestra[];
  eventos: Evento[];
  error: string | null;
  actualizado: number | null;
}

const INTERVALO_MS = 20000;
const MAX_MUESTRAS = 180; // 1 hora a 20 s
const RECORDATORIO_CRITICO_MS = 30 * 60 * 1000;
const FALLOS_PARA_CAIDA = 2; // evita falsas alarmas por un solo corte
const LATENCIA_LENTA_MS = 4000;

const inicial: Salud = { estado: 'DESCONOCIDO', problemas: [], datos: null, muestras: [], eventos: [], error: null, actualizado: null };

async function avisar(titulo: string, cuerpo: string, critico: boolean) {
  try {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
    const opciones: NotificationOptions = {
      body: cuerpo,
      icon: '/icons/icon-192.png',
      badge: '/icons/icon-192.png',
      tag: 'kipipos-' + titulo,
      silent: !critico,
      data: { url: '/' },
    };
    const reg = await navigator.serviceWorker?.getRegistration();
    if (reg) await reg.showNotification(titulo, opciones);
    else new Notification(titulo, opciones);
  } catch {
    /* las notificaciones nunca deben romper el monitor */
  }
}

/**
 * Sondea /salud cada 20 s mientras la app está visible, detecta problemas y avisa con notificaciones.
 * Importante: un navegador no puede vigilar con la app cerrada; los avisos llegan mientras esté abierta
 * (o en segundo plano, si el sistema lo permite).
 */
export function useMonitor(activo: boolean) {
  const [salud, setSalud] = useState<Salud>(inicial);
  const est = useRef({
    muestras: [] as Muestra[],
    eventos: [] as Evento[],
    activos: new Map<string, { desde: number; ultimoAviso: number }>(),
    caido: false,
    fallos: 0,
    enCurso: false,
  });

  const sondear = useCallback(async () => {
    const m = est.current;
    if (m.enCurso) return;
    m.enCurso = true;

    const evento = (nivel: string, titulo: string, detalle?: string) => {
      m.eventos.unshift({ fecha: new Date().toISOString(), nivel, titulo, detalle });
      m.eventos.length = Math.min(m.eventos.length, 60);
    };
    const procesar = (lista: Problema[]) => {
      const ahora = Date.now();
      const vigentes = new Set(lista.map((p) => p.codigo));
      for (const p of lista) {
        const previo = m.activos.get(p.codigo);
        if (!previo) {
          m.activos.set(p.codigo, { desde: ahora, ultimoAviso: ahora });
          evento(p.nivel, 'Problema: ' + p.codigo, p.mensaje);
          void avisar(p.nivel === 'CRITICO' ? 'KIPIPOS: problema crítico' : 'KIPIPOS: aviso', p.mensaje, p.nivel === 'CRITICO');
        } else if (p.nivel === 'CRITICO' && ahora - previo.ultimoAviso > RECORDATORIO_CRITICO_MS) {
          previo.ultimoAviso = ahora;
          void avisar('KIPIPOS: sigue el problema', p.mensaje, true);
        }
      }
      for (const [codigo, info] of [...m.activos]) {
        if (!vigentes.has(codigo)) {
          m.activos.delete(codigo);
          evento('OK', 'Resuelto: ' + codigo, 'Duró unos ' + Math.max(1, Math.round((ahora - info.desde) / 60000)) + ' min.');
          void avisar('KIPIPOS: resuelto', codigo + ' volvió a la normalidad.', false);
        }
      }
    };

    let nuevo: Partial<Salud>;
    try {
      const { data, ms } = await api('GET', 'salud');
      if (m.caido) {
        m.caido = false;
        evento('OK', 'Servidor recuperado', 'Vuelve a responder.');
        void avisar('KIPIPOS: servidor recuperado', 'El servidor volvió a responder.', false);
      }
      m.fallos = 0;
      const lista: Problema[] = [...(data.problemas || [])];
      if (ms >= LATENCIA_LENTA_MS) lista.push({ codigo: 'RESPUESTA_LENTA', nivel: 'AVISO', mensaje: 'El servidor tarda ' + (ms / 1000).toFixed(1) + ' s en responder.' });
      m.muestras.push({ t: Date.now(), ms, bdMs: data.baseDatos?.ms, mem: data.servidor?.memoriaPct, cpu: data.servidor?.cpuPct });
      procesar(lista);
      nuevo = { estado: lista.some((p) => p.nivel === 'CRITICO') ? 'CRITICO' : lista.length ? 'AVISO' : 'OK', problemas: lista, datos: data, error: null };
    } catch (e) {
      const err = e instanceof ErrorApi ? e : new ErrorApi('Error desconocido', 0);
      if (err.status === 401 && !err.codigo) {
        m.enCurso = false;
        return; // sesión vencida: api() ya redirige al ingreso
      }
      if (err.codigo === 'SIN_RED') {
        // el problema es la conexión de este teléfono, no el servidor: no se avisa de caída
        nuevo = { error: err.message };
      } else if (err.codigo === 'SIN_CONEXION' || (err.status >= 500 && err.codigo !== 'TOKEN_RECHAZADO')) {
        m.fallos += 1;
        m.muestras.push({ t: Date.now(), ms: null });
        if (m.fallos >= FALLOS_PARA_CAIDA) {
          const p: Problema = { codigo: 'SERVIDOR_CAIDO', nivel: 'CRITICO', mensaje: 'El servidor no responde (' + err.message + ').' };
          if (!m.caido) {
            m.caido = true;
            evento('CRITICO', 'Servidor sin respuesta', err.message);
            void avisar('KIPIPOS: el servidor no responde', 'Los clientes pueden estar sin servicio. ' + err.message, true);
          }
          nuevo = { estado: 'SIN_CONEXION', problemas: [p], error: err.message };
        } else {
          nuevo = { error: err.message };
        }
      } else {
        // token rechazado, panel no disponible, falta configuración…: hay que corregir la configuración
        const p: Problema = { codigo: 'PANEL_' + (err.codigo || err.status), nivel: 'AVISO', mensaje: err.message };
        procesar([p]);
        nuevo = { estado: 'AVISO', problemas: [p], error: err.message };
      }
    }
    m.muestras = m.muestras.slice(-MAX_MUESTRAS);
    setSalud((prev) => ({ ...prev, ...nuevo, muestras: [...m.muestras], eventos: [...m.eventos], actualizado: Date.now() }));
    m.enCurso = false;
  }, []);

  useEffect(() => {
    if (!activo) return;
    void sondear();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void sondear();
    }, INTERVALO_MS);
    const alVolver = () => {
      if (document.visibilityState === 'visible') void sondear();
    };
    document.addEventListener('visibilitychange', alVolver);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [activo, sondear]);

  return { salud, sondear };
}
