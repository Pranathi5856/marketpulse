"use client";

import { useId } from "react";

export function Sparkline({
  points,
  positive,
  width = 96,
  height = 34,
}: {
  points: number[];
  positive: boolean;
  width?: number;
  height?: number;
}) {
  const rawId = useId();
  const gradId = `sparkline-grad-${rawId.replace(/:/g, "")}`;

  if (!points || points.length < 2) {
    return (
      <div
        style={{ width, height }}
        className="text-muted/40 text-[11px] font-mono flex items-center justify-center border border-dashed border-ink-800/80 rounded"
      >
        ···
      </div>
    );
  }

  const min = Math.min(...points);
  const max = Math.max(...points);
  const isFlat = max === min;
  const range = isFlat ? 1 : max - min;

  const w = width;
  const h = height;
  const padTop = 4;
  const padBottom = 4;
  const padX = 2;
  const innerW = w - padX * 2;
  const innerH = h - padTop - padBottom;
  const step = innerW / (points.length - 1);

  const coords = points.map((p, i) => {
    const x = Number((padX + i * step).toFixed(1));
    const y = Number((isFlat ? h / 2 : padTop + (innerH - ((p - min) / range) * innerH)).toFixed(1));
    return { x, y };
  });

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"}${c.x},${c.y}`).join(" ");
  const first = coords[0];
  const last = coords[coords.length - 1];
  const areaPath = `${linePath} L${last.x},${h} L${first.x},${h} Z`;

  const strokeColor = positive ? "#10B981" : "#F43F5E";

  return (
    <div className="relative inline-flex items-center">
      <svg
        width={w}
        height={h}
        viewBox={`0 0 ${w} ${h}`}
        className="overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
            <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Gradient area under the curve */}
        <path d={areaPath} fill={`url(#${gradId})`} />

        {/* Primary trajectory line */}
        <path
          d={linePath}
          fill="none"
          stroke={strokeColor}
          strokeWidth={1.75}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Terminal pulse anchor dot */}
        <circle cx={last.x} cy={last.y} r="4" fill={strokeColor} fillOpacity="0.2" />
        <circle cx={last.x} cy={last.y} r="2" fill={strokeColor} />
      </svg>
    </div>
  );
}

