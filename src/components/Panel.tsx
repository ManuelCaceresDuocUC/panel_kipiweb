'use client';
import { useCallback, useEffect, useState } from 'react';
import Resumen from './Resumen';
import Servidor from './Servidor';
import Empresas from './Empresas';
import Respaldos from './Respaldos';
import Errores from './Errores';
import DetalleEmpresa from './DetalleEmpresa';
import InstalarPwa from './InstalarPwa';
import { api, type Dato } from '@/lib/api';
import { useMonitor } from '@/lib/monitor';

type Vista = 'resumen' | 'servidor' | 'empresas' | 'respaldos' | 'errores';
const NAV: [Vista, string, string][] = [
  ['resumen', 'Resumen', 'Resumen'],
  ['servidor', 'Servidor en vivo', 'Servidor'],
  ['empresas', 'Empresas', 'Empresas'],
  ['respaldos', 'Respaldos', 'Respaldos'],
  ['errores', 'Errores', 'Errores'],
];

export default function Panel() {
  const [vista, setVista] = useState<Vista>('resumen');
  const [resumen, setResumen] = useState<Dato | null>(null);
  const [empresas, setEmpresas] = useState<Dato[]>([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [ultima, setUltima] = useState<Date | null>(null);
  const [detalleId, setDetalleId] = useState<number | null>(null);
  const { salud, sondear } = useMonitor(true);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      const [r, e] = await Promise.all([api('GET', 'resumen'), api('GET', 'empresas')]);
      setResumen(r.data);
      setEmpresas(e.data);
      setUltima(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    }
    setCargando(false);
  }, []);

  useEffect(() => {
    void cargar();
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void cargar();
    }, 120000);
    return () => clearInterval(id);
  }, [cargar]);

  useEffect(() => {
    const v = new URLSearchParams(window.location.search).get('vista');
    if (v && NAV.some(([k]) => k === v)) setVista(v as Vista);
  }, []);

  async function salir() {
    try {
      await fetch('/api/logout', { method: 'POST', cache: 'no-store' });
    } finally {
      window.location.replace('/login');
    }
  }

  const punto = <span className={'punto p-' + salud.estado} aria-label={'Estado: ' + salud.estado} />;

  return (
    <div className="layout">
      <header className="barra-movil">
        <strong className="marca">KIPIPOS PANEL</strong>
        <span className="estado-movil">{punto} {salud.estado === 'OK' ? 'Todo bien' : salud.estado === 'DESCONOCIDO' ? '…' : salud.estado === 'SIN_CONEXION' ? 'Sin conexión' : salud.estado === 'CRITICO' ? 'Crítico' : 'Avisos'}</span>
      </header>

      <nav className="lado" aria-label="Secciones">
        <h1 className="marca">KIPIPOS PANEL</h1>
        {NAV.map(([k, largo, corto]) => (
          <button key={k} className={vista === k ? 'activo' : ''} onClick={() => setVista(k)} aria-current={vista === k ? 'page' : undefined}>
            <span className="txt-largo">{largo}</span>
            <span className="txt-corto">{corto}</span>
            {k === 'servidor' ? punto : null}
          </button>
        ))}
        <button className="salir" onClick={salir}>Cerrar sesión</button>
        <div className="pie">{ultima ? 'Actualizado ' + ultima.toLocaleTimeString('es-CL') : 'Sin datos'}</div>
      </nav>

      <main className="principal">
        <InstalarPwa />
        {error ? <div className="error" role="alert">{error}</div> : null}
        {vista === 'resumen' && <Resumen resumen={resumen} empresas={empresas} cargando={cargando} alActualizar={cargar} alAbrirEmpresa={setDetalleId} />}
        {vista === 'servidor' && <Servidor salud={salud} alSondear={sondear} />}
        {vista === 'empresas' && <Empresas empresas={empresas} cargando={cargando} alActualizar={cargar} alAbrir={setDetalleId} />}
        {vista === 'respaldos' && <Respaldos />}
        {vista === 'errores' && <Errores />}
        <div className="solo-movil pie-movil">
          <button onClick={salir}>Cerrar sesión</button>
        </div>
      </main>

      {detalleId != null ? <DetalleEmpresa id={detalleId} alCerrar={() => setDetalleId(null)} alCambiar={cargar} /> : null}
    </div>
  );
}
