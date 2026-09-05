"use client";

export function Sparkline({ points, positive }: { points: number[]; positive: boolean }) {
  if (points.length < 2) {
    return <div className="h-8 w-20 text-muted text-xs flex items-center">—</div>;
  }
  const min = Math.min(...points);
  const max = Math.max(...points);
  const isFlat = max === min;
  const range = isFlat ? 1 : max - min;
  const w = 80;
  const h = 28;
  const pad = 4;
  const innerH = h - pad * 2;
  const step = w / (points.length - 1);

  const path = points
    .map((p, i) => {
      const x = i * step;
      const y = isFlat ? h / 2 : pad + (innerH - ((p - min) / range) * innerH);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <path
        d={path}
        fill="none"
        stroke={positive ? "#3DD68C" : "#FF6B6B"}
        strokeWidth={1.5}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}
