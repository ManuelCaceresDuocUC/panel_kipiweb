export const clp = (n: number | null | undefined) =>
  new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(n || 0);
export const num = (n: number | null | undefined) => new Intl.NumberFormat('es-CL').format(n || 0);

export function fecha(s: string | null | undefined, conHora = true): string {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s);
  return d.toLocaleString('es-CL', conHora ? { dateStyle: 'short', timeStyle: 'short' } : { dateStyle: 'short' });
}

export function diasHasta(s: string | null | undefined): number | null {
  if (!s) return null;
  const d = new Date(s);
  if (isNaN(d.getTime())) return null;
  return Math.ceil((d.getTime() - Date.now()) / 86400000);
}

export function bytes(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n < 1024) return n + ' B';
  if (n < 1048576) return (n / 1024).toFixed(1) + ' KB';
  if (n < 1073741824) return (n / 1048576).toFixed(1) + ' MB';
  return (n / 1073741824).toFixed(2) + ' GB';
}

export function duracion(seg: number): string {
  const d = Math.floor(seg / 86400);
  const h = Math.floor((seg % 86400) / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return (d ? d + ' d ' : '') + (h ? h + ' h ' : '') + m + ' min';
}
