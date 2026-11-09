'use client';
import { useEffect, useState } from 'react';

interface EventoInstalacion extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Registra el service worker y ofrece instalar la app (Android/Chrome) o explica cómo en iPhone. */
export default function InstalarPwa() {
  const [evento, setEvento] = useState<EventoInstalacion | null>(null);
  const [ios, setIos] = useState(false);
  const [instalada, setInstalada] = useState(true);
  const [oculto, setOculto] = useState(false);

  useEffect(() => {
    if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => undefined);
    }
    const standalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
    setInstalada(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent));
    try {
      setOculto(localStorage.getItem('kp_ocultar_instalar') === '1');
    } catch { /* sin almacenamiento */ }

    const antes = (e: Event) => {
      e.preventDefault();
      setEvento(e as EventoInstalacion);
    };
    const ya = () => setInstalada(true);
    window.addEventListener('beforeinstallprompt', antes);
    window.addEventListener('appinstalled', ya);
    return () => {
      window.removeEventListener('beforeinstallprompt', antes);
      window.removeEventListener('appinstalled', ya);
    };
  }, []);

  if (instalada || oculto || (!evento && !ios)) return null;

  const cerrar = () => {
    setOculto(true);
    try { localStorage.setItem('kp_ocultar_instalar', '1'); } catch { /* sin almacenamiento */ }
  };

  return (
    <div className="instalar" role="region" aria-label="Instalar aplicación">
      <div>
        <strong>Instala el panel en tu celular</strong>
        <div className="sub">
          {evento ? 'Se abre como una app, a pantalla completa.' : 'En Safari: botón Compartir y luego "Agregar a pantalla de inicio".'}
        </div>
      </div>
      <div className="acc sin-margen">
        {evento ? (
          <button className="primario" onClick={async () => { await evento.prompt(); setEvento(null); }}>Instalar</button>
        ) : null}
        <button onClick={cerrar}>Ahora no</button>
      </div>
    </div>
  );
}
