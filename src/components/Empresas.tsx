'use client';
import { useMemo, useState } from 'react';
import { Cabecera, Insignia } from './ui';
import type { Dato } from '@/lib/api';
import { clp, fecha, num } from '@/lib/formato';

const ESTADOS = ['ACTIVA', 'PRUEBA', 'EN_MORA', 'SUSPENDIDA', 'PRUEBA_VENCIDA', 'PENDIENTE', 'BAJA'];

function vigencia(e: Dato): string {
  if (e.estadoEfectivo === 'PRUEBA' || e.estadoEfectivo === 'PRUEBA_VENCIDA') return 'Prueba hasta ' + fecha(e.pruebaHasta, false);
  if (e.cancelada && e.accesoHasta) return 'Cancelada, acceso hasta ' + fecha(e.accesoHasta, false);
  if (e.moraDesde) return 'Mora desde ' + fecha(e.moraDesde, false);
  return '—';
}

interface Props { empresas: Dato[]; cargando: boolean; alActualizar: () => void; alAbrir: (id: number) => void }

export default function Empresas({ empresas, cargando, alActualizar, alAbrir }: Props) {
  const [texto, setTexto] = useState('');
  const [estado, setEstado] = useState('');

  const filas = useMemo(() => {
    const t = texto.trim().toLowerCase();
    return empresas.filter(
      (e) => (!estado || e.estadoEfectivo === estado) && (!t || [e.razonSocial, e.rut, e.correoAdmin].some((x) => (x || '').toLowerCase().includes(t)))
    );
  }, [empresas, texto, estado]);

  return (
    <>
      <Cabecera titulo="Empresas" onActualizar={alActualizar} cargando={cargando} />
      <div className="barra">
        <input type="search" placeholder="Buscar por nombre, RUT o correo…" value={texto} onChange={(e) => setTexto(e.target.value)} aria-label="Buscar empresa" />
        <select value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Filtrar por estado">
          <option value="">Todos los estados</option>
          {ESTADOS.map((x) => (
            <option key={x} value={x}>{x.replace('_', ' ')}</option>
          ))}
        </select>
      </div>

      {filas.length === 0 ? <div className="vacio">Sin resultados.</div> : null}

      {/* Celular: tarjetas */}
      <div className="solo-movil lista-tarjetas">
        {filas.map((e) => (
          <button key={e.id} className="tarjeta-empresa" onClick={() => alAbrir(e.id)}>
            <span className="fila-dos">
              <strong>{e.razonSocial}</strong>
              <Insignia estado={e.estadoEfectivo} />
            </span>
            <span className="sub bloque">{e.rut}{e.bloqueoManual ? ' · BLOQUEO MANUAL' : ''}</span>
            <span className="fila-dos mt-s">
              <span>{clp(e.ventas30dMonto)} <span className="sub">en 30 días</span></span>
              <span className="sub">{e.ultimaVenta ? 'Última: ' + e.diasSinVender + ' d' : 'Sin ventas'}</span>
            </span>
            <span className="sub bloque">{vigencia(e)}</span>
          </button>
        ))}
      </div>

      {/* Pantalla grande: tabla */}
      {filas.length ? (
        <div className="solo-escritorio tabla-caja">
          <table className="tabla">
            <thead>
              <tr>{['Empresa', 'Estado', 'Vigencia', 'Ventas 30 días', 'Última venta', 'Usuarios', 'Correo admin'].map((t) => <th key={t}>{t}</th>)}</tr>
            </thead>
            <tbody>
              {filas.map((e) => (
                <tr key={e.id} className="fila" onClick={() => alAbrir(e.id)}>
                  <td><strong>{e.razonSocial}</strong><div className="sub">{e.rut}</div></td>
                  <td><Insignia estado={e.estadoEfectivo} /> {e.bloqueoManual ? <span className="badge b-bloq">BLOQUEO MANUAL</span> : null}</td>
                  <td className="sub">{vigencia(e)}</td>
                  <td className="num">{clp(e.ventas30dMonto)}<div className="sub">{num(e.ventas30dCantidad)} ventas</div></td>
                  <td className="sub">{e.ultimaVenta ? fecha(e.ultimaVenta) + ' (' + e.diasSinVender + ' d)' : 'Nunca'}</td>
                  <td className="num">{num(e.usuariosActivos)}</td>
                  <td className="sub">{e.correoAdmin || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </>
  );
}
