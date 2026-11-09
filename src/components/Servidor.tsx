'use client';
import { useEffect, useState } from 'react';
import { Cabecera, Semaforo, Tarjeta } from './ui';
import { Spark, serie } from './Spark';
import type { Salud } from '@/lib/monitor';
import { duracion, fecha, num } from '@/lib/formato';

const TITULOS: Record<string, string> = { OK: 'Todo funciona con normalidad', AVISO: 'Hay avisos que revisar', CRITICO: 'Problema crítico', SIN_CONEXION: 'El servidor no responde' };

export default function Servidor({ salud: sa, alSondear }: { salud: Salud; alSondear: () => void }) {
  const [permiso, setPermiso] = useState<string>('desconocido');
  useEffect(() => {
    setPermiso(typeof Notification === 'undefined' ? 'no-soportado' : Notification.permission);
  }, []);

  async function activarAvisos() {
    if (typeof Notification === 'undefined') return;
    setPermiso(await Notification.requestPermission());
  }

  const acciones = (
    <>
      {sa.actualizado ? <span>Revisado {new Date(sa.actualizado).toLocaleTimeString('es-CL')} (cada 20 s)</span> : null}
      <button onClick={alSondear}>Revisar ahora</button>
    </>
  );

  const d = sa.datos;
  const s = d?.servidor || {};
  const bd = d?.baseDatos || {};
  const pool = bd.pool || {};
  const er = d?.errores || {};
  const fl = d?.flow || {};
  const s3 = d?.s3 || {};
  const ultima = sa.muestras.filter((m) => m.ms != null).slice(-1)[0];

  return (
    <>
      <Cabecera titulo="Servidor en vivo">{acciones}</Cabecera>

      {sa.estado === 'DESCONOCIDO' ? (
        <div className="vacio">{sa.error ? sa.error : 'Esperando la primera lectura…'}</div>
      ) : (
        <>
          <div className={'banner bn-' + sa.estado}>
            <strong>{TITULOS[sa.estado] || sa.estado}</strong>
            {sa.estado === 'OK' ? <div className="sub">Sin problemas detectados en este momento.</div> : null}
          </div>
          {sa.problemas.map((p) => (
            <div key={p.codigo} className={p.nivel === 'CRITICO' ? 'error' : 'aviso'}>
              <strong>{p.codigo.replace(/_/g, ' ')}: </strong>
              {p.mensaje}
            </div>
          ))}
          {sa.error && sa.estado === 'OK' ? <div className="aviso">{sa.error}</div> : null}
        </>
      )}

      {d ? (
        <>
          <div className="grid">
            <Tarjeta titulo="Respuesta de la API" valor={ultima ? ultima.ms + ' ms' : '—'} sub="Medida desde el servidor del panel" clase={ultima && (ultima.ms ?? 0) > 4000 ? 'warn' : 'ok'} />
            <Tarjeta
              titulo="Base de datos"
              valor={bd.ok ? bd.ms + ' ms' : 'Caída'}
              sub={Object.keys(pool).length ? `Conexiones: ${pool.activas} activas / ${pool.total} (${pool.esperando} esperando)` : ''}
              clase={bd.ok ? (bd.ms >= 1500 ? 'warn' : 'ok') : 'mal'}
            />
            <Tarjeta titulo="Memoria" valor={s.memoriaPct + '%'} sub={`${s.memoriaUsadaMb} de ${s.memoriaMaxMb} MB`} clase={s.memoriaPct >= 85 ? 'warn' : 'ok'} />
            <Tarjeta titulo="CPU" valor={s.cpuPct == null ? '—' : s.cpuPct + '%'} sub={s.hilos + ' hilos'} clase={s.cpuPct >= 90 ? 'warn' : ''} />
            <Tarjeta titulo="En marcha hace" valor={duracion(s.uptimeSeg || 0)} sub={'Desde ' + fecha(s.encendidoDesde)} />
            <Tarjeta titulo="Errores (5 min)" valor={num(er.errores5min)} sub={`${num(er.avisos5min)} avisos · ${num(er.errores24h)} errores en 24 h`} clase={er.errores5min >= 5 ? 'warn' : 'ok'} />
          </div>
          <div className="grid">
            <Semaforo titulo="Flow (pagos)" ok={fl.ok} detalle={fl.ok === false ? fl.error : fl.ms ? 'Respondió en ' + fl.ms + ' ms' : 'Revisión cada 5 min'} />
            <Semaforo
              titulo="Almacenamiento S3"
              ok={s3.configurado ? s3.ok : null}
              detalle={!s3.configurado ? 'No configurado' : s3.ok === false ? s3.error : s3.horasDesdeRespaldo != null ? 'Último respaldo hace ' + s3.horasDesdeRespaldo + ' h' : 'Sin respaldos'}
            />
            <Semaforo titulo="Correo" ok={!!d.correo?.configurado} detalle={d.correo?.configurado ? 'Configurado' : 'Sin configurar'} />
          </div>
        </>
      ) : null}

      {sa.muestras.length > 1 ? (
        <>
          <h4>Última hora</h4>
          <div className="grid graf">
            <div className="tarjeta"><div className="t">Respuesta de la API (ms) — rojo: sin respuesta</div><Spark valores={serie(sa.muestras, 'ms')} color="#38bdf8" umbral={4000} /></div>
            <div className="tarjeta"><div className="t">Base de datos (ms)</div><Spark valores={serie(sa.muestras, 'bdMs')} color="#a78bfa" umbral={1500} /></div>
            <div className="tarjeta"><div className="t">Memoria (%)</div><Spark valores={serie(sa.muestras, 'mem')} color="#f59e0b" max={100} umbral={85} /></div>
          </div>
        </>
      ) : null}

      <h4>Historial de avisos (desde que abriste la app)</h4>
      {sa.eventos.length ? (
        <div className="lista-eventos">
          {sa.eventos.slice(0, 25).map((e, i) => (
            <div key={i} className="log">
              <span className={'badge b-' + (e.nivel === 'OK' ? 'ACTIVA' : e.nivel === 'CRITICO' ? 'ERROR' : 'WARN')}>{e.nivel}</span>{' '}
              <span className="sub">{fecha(e.fecha)}</span>
              <div className="m">{e.titulo}</div>
              {e.detalle ? <div className="x">{e.detalle}</div> : null}
            </div>
          ))}
        </div>
      ) : (
        <div className="vacio">Sin incidentes registrados.</div>
      )}

      <h4>Avisos en este dispositivo</h4>
      <div className="sub">
        Las notificaciones llegan mientras la app esté abierta (también en segundo plano si el sistema lo permite). Una página web no puede vigilar con la app cerrada del todo.
      </div>
      <div className="acc">
        {permiso === 'granted' ? (
          <span className="badge b-ACTIVA">Avisos activados</span>
        ) : permiso === 'denied' ? (
          <span className="aviso">Bloqueaste las notificaciones: actívalas desde los ajustes del navegador o de la app instalada.</span>
        ) : permiso === 'no-soportado' ? (
          <span className="aviso">Este navegador no admite notificaciones. En iPhone, instala la app en la pantalla de inicio (iOS 16.4 o superior).</span>
        ) : (
          <button className="primario" onClick={activarAvisos}>Activar avisos</button>
        )}
      </div>
    </>
  );
}
