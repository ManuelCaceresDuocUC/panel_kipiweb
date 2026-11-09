'use client';
import { useCallback, useEffect, useState } from 'react';
import { Insignia, Modal } from './ui';
import { api, type Dato } from '@/lib/api';
import { clp, fecha, num } from '@/lib/formato';

interface Props { id: number; alCerrar: () => void; alCambiar: () => void }

export default function DetalleEmpresa({ id, alCerrar, alCambiar }: Props) {
  const [d, setD] = useState<Dato | null>(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [trabajando, setTrabajando] = useState(false);
  const [pidiendoMotivo, setPidiendoMotivo] = useState(false);
  const [motivo, setMotivo] = useState('');

  const cargar = useCallback(async () => {
    try {
      setD((await api('GET', 'empresas/' + id)).data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
  }, [id]);
  useEffect(() => { void cargar(); }, [cargar]);

  async function accion(sufijo: string, cuerpo?: object) {
    setMsg('');
    setTrabajando(true);
    try {
      await api('POST', 'empresas/' + id + sufijo, cuerpo);
      setPidiendoMotivo(false);
      setMotivo('');
      await cargar();
      alCambiar();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'Error');
    }
    setTrabajando(false);
  }

  async function copiar(texto: string) {
    try {
      await navigator.clipboard.writeText(texto);
      setMsg('Copiado.');
    } catch {
      setMsg('No se pudo copiar.');
    }
  }

  if (error) {
    return (
      <Modal chico alCerrar={alCerrar}>
        <div className="error">{error}</div>
        <div className="acc"><button onClick={alCerrar}>Cerrar</button></div>
      </Modal>
    );
  }
  if (!d) {
    return (
      <Modal chico alCerrar={alCerrar}>
        <div className="vacio">Cargando…</div>
      </Modal>
    );
  }

  const dato = (t: string, v: React.ReactNode) => (
    <div key={t}>
      <span>{t}</span>
      {v == null || v === '' ? '—' : v}
    </div>
  );

  if (pidiendoMotivo) {
    return (
      <Modal chico alCerrar={() => setPidiendoMotivo(false)}>
        <h3>Suspender {d.razonSocial}</h3>
        <div className="sub">Quedará en solo lectura: podrá consultar pero no vender. Se avisa al cliente en pantalla y queda registrado.</div>
        <label htmlFor="motivo">Motivo (obligatorio)</label>
        <textarea id="motivo" rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ej.: pago pendiente acordado, solicitud del cliente…" />
        {msg ? <div className="error">{msg}</div> : null}
        <div className="acc">
          <button className="peligro" disabled={trabajando || motivo.trim().length < 3} onClick={() => accion('/suspender', { motivo })}>Confirmar suspensión</button>
          <button onClick={() => setPidiendoMotivo(false)}>Cancelar</button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal alCerrar={alCerrar}>
      <h3>{d.razonSocial}</h3>
      <div className="sub">{d.rut}{d.giro ? ' · ' + d.giro : ''}{d.comuna ? ' · ' + d.comuna : ''}</div>
      <div className="mt-s">
        <Insignia estado={d.estadoEfectivo} /> {d.bloqueoManual ? <span className="badge b-bloq">BLOQUEO MANUAL</span> : null}
      </div>
      {d.bloqueoManual ? <div className="aviso">Suspendida desde {fecha(d.bloqueoDesde)}. Motivo: {d.bloqueoMotivo || '—'}</div> : null}

      <div className="dos">
        {dato('Registrada', fecha(d.fechaRegistro))}
        {dato('Modo de acceso', d.modo)}
        {dato('Estado guardado', d.estado)}
        {dato('Suscripción en Flow', d.conSuscripcionFlow ? 'Sí' : 'No')}
        {dato('Prueba hasta', fecha(d.pruebaHasta, false))}
        {dato('Mora desde', fecha(d.moraDesde, false))}
        {dato('Acceso hasta', fecha(d.accesoHasta, false))}
        {dato('Cancelada', d.cancelada ? 'Sí' : 'No')}
        {dato('Última sincronización con Flow', fecha(d.flowUltimaSync))}
        {dato('Estado / morosidad en Flow', (d.flowStatus ?? '—') + ' / ' + (d.flowMorosidad ?? '—'))}
        {dato('Ventas últimos 30 días', clp(d.ventas30dMonto) + ' (' + num(d.ventas30dCantidad) + ')')}
        {dato('Ventas totales', clp(d.ventasTotalesMonto) + ' (' + num(d.ventasTotalesCantidad) + ')')}
        {dato('Productos', num(d.productos))}
        {dato('Términos aceptados', (d.terminosVersion || '—') + ' · ' + fecha(d.terminosAceptadosEn))}
      </div>

      {msg ? <div className={msg === 'Copiado.' ? 'aviso' : 'error'}>{msg}</div> : null}
      <div className="acc">
        {d.bloqueoManual ? (
          <button className="primario" disabled={trabajando} onClick={() => accion('/reactivar')}>Reactivar cuenta</button>
        ) : (
          <button className="peligro" disabled={trabajando} onClick={() => setPidiendoMotivo(true)}>Suspender (solo lectura)</button>
        )}
        {d.conSuscripcionFlow ? <button disabled={trabajando} onClick={() => accion('/sincronizar')}>Sincronizar con Flow ahora</button> : null}
        {d.correoAdmin ? <button onClick={() => copiar(d.correoAdmin)}>Copiar correo del admin</button> : null}
        <button onClick={alCerrar}>Cerrar</button>
      </div>

      <h4>Usuarios</h4>
      <div className="lista-eventos">
        {(d.usuarios || []).map((u: Dato) => (
          <div key={u.usuario} className="log fila-dos">
            <div>
              <div className="m">{u.usuario} <span className="sub">· {u.rol}</span></div>
              <div className="sub">{u.correo || '—'}</div>
            </div>
            <span className={'badge ' + (u.activo ? 'b-ACTIVA' : 'b-BAJA')}>{u.activo ? 'Activo' : 'Inactivo'}</span>
          </div>
        ))}
      </div>

      <h4>Últimos eventos de auditoría</h4>
      {(d.auditoria || []).length ? (
        <div className="lista-eventos">
          {d.auditoria.map((a: Dato, i: number) => (
            <div key={i} className="log">
              <span className="sub">{fecha(a.fecha)} · {a.usuario || '—'}</span>
              <div className="m">{a.accion}</div>
              {a.detalle ? <div className="x">{a.detalle}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="sub">Sin eventos.</div>
      )}
    </Modal>
  );
}
