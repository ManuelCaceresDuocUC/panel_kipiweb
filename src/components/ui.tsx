'use client';
import { useEffect } from 'react';

export function Tarjeta({ titulo, valor, sub, clase }: { titulo: string; valor: React.ReactNode; sub?: React.ReactNode; clase?: string }) {
  return (
    <div className={'tarjeta ' + (clase || '')}>
      <div className="t">{titulo}</div>
      <div className="v">{valor}</div>
      {sub ? <div className="s">{sub}</div> : null}
    </div>
  );
}

export function Semaforo({ titulo, ok, detalle }: { titulo: string; ok: boolean | null | undefined; detalle?: string }) {
  const clase = ok === true ? 'ok' : ok === false ? 'mal' : '';
  return (
    <div className={'tarjeta ' + clase}>
      <div className="t">{titulo}</div>
      <div className="v chico">{ok === true ? 'OK' : ok === false ? 'Falla' : 'Sin datos'}</div>
      {detalle ? <div className="s">{detalle}</div> : null}
    </div>
  );
}

export function Insignia({ estado }: { estado: string }) {
  return <span className={'badge b-' + estado}>{estado.replace(/_/g, ' ')}</span>;
}

/** Ventana: en el celular sube desde abajo (hoja), en pantalla grande va centrada. Se cierra con Escape o tocando fuera. */
export function Modal({ children, chico, alCerrar }: { children: React.ReactNode; chico?: boolean; alCerrar: () => void }) {
  useEffect(() => {
    const tecla = (e: KeyboardEvent) => e.key === 'Escape' && alCerrar();
    document.addEventListener('keydown', tecla);
    const previo = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', tecla);
      document.body.style.overflow = previo;
    };
  }, [alCerrar]);
  return (
    <div className="fondo" onMouseDown={(e) => e.target === e.currentTarget && alCerrar()}>
      <div className={'modal' + (chico ? ' chico' : '')} role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function Cabecera({ titulo, children, onActualizar, cargando }: { titulo: string; children?: React.ReactNode; onActualizar?: () => void; cargando?: boolean }) {
  return (
    <div className="cab">
      <h2>{titulo}</h2>
      <div className="acciones">
        {children}
        {onActualizar ? (
          <button onClick={onActualizar} disabled={cargando}>
            {cargando ? 'Actualizando…' : 'Actualizar'}
          </button>
        ) : null}
      </div>
    </div>
  );
}
