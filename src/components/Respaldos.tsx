'use client';
import { useCallback, useEffect, useState } from 'react';
import { Cabecera } from './ui';
import { api, type Dato } from '@/lib/api';
import { bytes, fecha } from '@/lib/formato';

export default function Respaldos() {
  const [r, setR] = useState<Dato | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setR((await api('GET', 'respaldos?max=30')).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setCargando(false);
  }, []);
  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <>
      <Cabecera titulo="Respaldos de la base de datos" onActualizar={cargar} cargando={cargando} />
      {error ? <div className="error">{error}</div> : null}
      {r ? (
        <>
          <div className={r.alerta ? 'error' : 'tarjeta ok'}>{r.mensaje || ''}</div>
          {r.horasDesdeUltimo != null ? <div className="sub">Hace {r.horasDesdeUltimo} hora(s) se hizo el último.</div> : null}
          <h4>Archivos (más recientes primero)</h4>
          {(r.archivos || []).length ? (
            <div className="lista-eventos">
              {r.archivos.map((a: Dato) => (
                <div key={a.nombre} className="log fila-dos">
                  <div>
                    <div className="m">{a.nombre}</div>
                    <div className="sub">{fecha(a.fecha)}</div>
                  </div>
                  <div className="num">{bytes(a.bytes)}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="vacio">No hay archivos.</div>
          )}
          <div className="sub mt">Para restaurar uno, sigue la guía docs/RESPALDOS_BD.md del repositorio.</div>
        </>
      ) : !error ? (
        <div className="vacio">Cargando…</div>
      ) : null}
    </>
  );
}
