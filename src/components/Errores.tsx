'use client';
import { useCallback, useEffect, useState } from 'react';
import { Cabecera } from './ui';
import { api, type Dato } from '@/lib/api';
import { fecha } from '@/lib/formato';

export default function Errores() {
  const [nivel, setNivel] = useState('');
  const [lista, setLista] = useState<Dato[] | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setLista((await api('GET', 'errores?max=150' + (nivel ? '&nivel=' + nivel : ''))).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setCargando(false);
  }, [nivel]);
  useEffect(() => { void cargar(); }, [cargar]);

  return (
    <>
      <Cabecera titulo="Errores recientes" onActualizar={cargar} cargando={cargando}>
        <select value={nivel} onChange={(e) => setNivel(e.target.value)} aria-label="Filtrar por nivel">
          <option value="">Errores y avisos</option>
          <option value="ERROR">Solo errores</option>
          <option value="WARN">Solo avisos</option>
        </select>
      </Cabecera>
      <div className="sub">Se guardan en memoria del servidor (últimos 300) y se pierden al reiniciar o desplegar. Para historial largo, usa los logs de Render.</div>
      {error ? <div className="error">{error}</div> : null}
      <div className="mt">
        {lista === null ? (
          !error ? <div className="vacio">Cargando…</div> : null
        ) : lista.length ? (
          lista.map((x, i) => (
            <div key={i} className="log">
              <span className={'badge b-' + x.nivel}>{x.nivel}</span> <span className="sub">{fecha(x.fecha)} · {x.origen}</span>
              <div className="m">{x.mensaje}</div>
              {x.excepcion ? <div className="x">{x.excepcion}</div> : null}
            </div>
          ))
        ) : (
          <div className="vacio">Sin errores registrados desde el último reinicio. 🎉</div>
        )}
      </div>
    </>
  );
}
