import type { Muestra } from '@/lib/monitor';

interface Props { valores: (number | null | undefined)[]; max?: number; color: string; umbral?: number }

/** Gráfico de línea mínimo en SVG. Los huecos (null) se marcan con un punto rojo: es "sin respuesta". */
export function Spark({ valores, max, color, umbral }: Props) {
  const w = 320;
  const h = 70;
  const n = valores.length;
  const tope = Math.max(max || 0, ...valores.filter((v): v is number => v != null), 1);
  const x = (i: number) => (n <= 1 ? w : (i / (n - 1)) * w);
  const y = (v: number) => h - 4 - (v / tope) * (h - 10);

  const tramos: string[][] = [];
  let actual: string[] = [];
  const puntosRojos: number[] = [];
  valores.forEach((v, i) => {
    if (v == null) {
      if (actual.length) tramos.push(actual);
      actual = [];
      puntosRojos.push(i);
    } else actual.push(x(i).toFixed(1) + ',' + y(v).toFixed(1));
  });
  if (actual.length) tramos.push(actual);

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} role="img" aria-label="Gráfico de la última hora">
      {umbral != null && umbral <= tope ? <line className="umbral" x1={0} x2={w} y1={y(umbral)} y2={y(umbral)} /> : null}
      {tramos.filter((t) => t.length > 1).map((t, i) => (
        <polyline key={i} points={t.join(' ')} fill="none" stroke={color} strokeWidth={2} />
      ))}
      {puntosRojos.map((i) => (
        <circle key={i} cx={x(i)} cy={h - 6} r={3} fill="#ef4444" />
      ))}
    </svg>
  );
}

export const serie = (m: Muestra[], campo: 'ms' | 'bdMs' | 'mem') => m.map((x) => (x[campo] ?? null) as number | null);
