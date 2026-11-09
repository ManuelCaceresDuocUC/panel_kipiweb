'use client';
import { Cabecera, Insignia, Tarjeta } from './ui';
import type { Dato } from '@/lib/api';
import { clp, diasHasta, fecha, num } from '@/lib/formato';

export function atencion(e: Dato): string[] {
  const m: string[] = [];
  if (e.bloqueoManual) m.push('Suspendida por ti: ' + (e.bloqueoMotivo || ''));
  if (e.estadoEfectivo === 'EN_MORA') m.push('En mora desde ' + fecha(e.moraDesde, false));
  if (e.estadoEfectivo === 'SUSPENDIDA' && !e.bloqueoManual) m.push('Suspendida por falta de pago');
  if (e.estadoEfectivo === 'PRUEBA_VENCIDA') m.push('Prueba vencida: no activó su suscripción');
  if (e.estadoEfectivo === 'PRUEBA') {
    const d = diasHasta(e.pruebaHasta);
    if (d != null && d <= 3) m.push('La prueba termina en ' + Math.max(d, 0) + ' día(s)');
  }
  const vigente = ['ACTIVA', 'EN_MORA', 'PRUEBA'].includes(e.estadoEfectivo);
  if (vigente && (e.diasSinVender == null || e.diasSinVender >= 14)) m.push(e.diasSinVender == null ? 'Nunca ha registrado ventas' : 'Sin ventas hace ' + e.diasSinVender + ' días');
  return m;
}

interface Props { resumen: Dato | null; empresas: Dato[]; cargando: boolean; alActualizar: () => void; alAbrirEmpresa: (id: number) => void }

export default function Resumen({ resumen: r, empresas, cargando, alActualizar, alAbrirEmpresa }: Props) {
  if (!r) {
    return (
      <>
        <Cabecera titulo="Resumen" onActualizar={alActualizar} cargando={cargando} />
        <div className="vacio">{cargando ? 'Cargando…' : 'Sin datos.'}</div>
      </>
    );
  }
  const resp = r.respaldo || {};
  const s = r.servidor || {};
  const lista = empresas.map((e) => [e, atencion(e)] as const).filter(([, m]) => m.length);
  return (
    <>
      <Cabecera titulo="Resumen" onActualizar={alActualizar} cargando={cargando} />
      <div className="grid">
        <Tarjeta titulo="Empresas" valor={num(r.empresasTotal)} sub={r.bloqueadasManual ? r.bloqueadasManual + ' suspendida(s) por ti' : ''} />
        <Tarjeta titulo="Ventas de hoy" valor={clp(r.ventasHoyMonto)} sub={num(r.ventasHoyCantidad) + ' venta(s) en todos los clientes'} />
        <Tarjeta titulo="Errores (24 h)" valor={num(r.errores24h)} sub={num(r.avisos24h) + ' aviso(s)'} clase={r.errores24h > 0 ? 'warn' : 'ok'} />
        <Tarjeta titulo="Último respaldo" valor={resp.alerta ? 'Revisar' : 'Al día'} sub={resp.mensaje || ''} clase={resp.alerta ? 'mal' : 'ok'} />
      </div>

      <h4>Empresas por estado</h4>
      <div className="chips">
        {Object.entries(r.porEstado || {}).map(([k, v]) => (
          <span key={k} className={'badge b-' + k}>{k.replace('_', ' ')}: {String(v)}</span>
        ))}
      </div>

      <h4>Requieren atención ({lista.length})</h4>
      {lista.length ? (
        <div className="lista-atencion">
          {lista.map(([e, m]) => (
            <button key={e.id} className="item-atencion" onClick={() => alAbrirEmpresa(e.id)}>
              <span>
                <strong>{e.razonSocial}</strong>
                <span className="sub bloque">{m.join(' · ')}</span>
              </span>
              <Insignia estado={e.estadoEfectivo} />
            </button>
          ))}
        </div>
      ) : (
        <div className="vacio">Nada pendiente.</div>
      )}

      <h4>Servidor</h4>
      <div className="sub">
        Encendido desde {fecha(s.encendidoDesde)} · Memoria {s.memoriaUsadaMb}/{s.memoriaMaxMb} MB · S3 {s.s3Configurado ? 'sí' : 'no'} · Correo {s.correoConfigurado ? 'sí' : 'no'}
      </div>
    </>
  );
}
