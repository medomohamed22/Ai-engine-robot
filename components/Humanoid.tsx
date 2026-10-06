"use client";

export function Humanoid({ phase, fallRisk }: { phase: number; fallRisk: number }) {
  const sway = Math.sin(phase) * (4 + fallRisk * 8);
  const leg = Math.sin(phase * 1.7) * 10;
  const arm = Math.sin(phase * 1.7 + Math.PI) * 13;
  return (
    <svg className="humanoid" viewBox="0 0 300 430" role="img" aria-label="Animated humanoid training visualization">
      <defs>
        <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d8e7f8" />
          <stop offset="100%" stopColor="#7792ad" />
        </linearGradient>
        <linearGradient id="accent" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#8ef0c3" />
          <stop offset="100%" stopColor="#7ab8ff" />
        </linearGradient>
      </defs>
      <ellipse cx="150" cy="400" rx="80" ry="13" fill="rgba(0,0,0,.35)" />
      <g transform={`translate(${sway} 0) rotate(${sway * .18} 150 190)`}>
        <circle cx="150" cy="67" r="34" fill="url(#body)" stroke="rgba(255,255,255,.35)" />
        <rect x="129" y="101" width="42" height="30" rx="13" fill="#657d94" />
        <path d="M108 133 Q150 115 192 133 L181 230 Q150 245 119 230 Z" fill="url(#body)" stroke="rgba(255,255,255,.28)" />
        <circle cx="150" cy="176" r="18" fill="#162231" stroke="url(#accent)" strokeWidth="3" />
        <circle cx="150" cy="176" r="7" fill="#8ef0c3" />
        <g transform={`rotate(${arm} 112 145)`}>
          <rect x="80" y="139" width="45" height="17" rx="8" fill="#8399ae" />
          <circle cx="80" cy="148" r="11" fill="#314558" />
          <rect x="46" y="141" width="38" height="14" rx="7" fill="#72899f" />
          <circle cx="45" cy="148" r="8" fill="#8ef0c3" />
        </g>
        <g transform={`rotate(${-arm} 188 145)`}>
          <rect x="176" y="139" width="45" height="17" rx="8" fill="#8399ae" />
          <circle cx="221" cy="148" r="11" fill="#314558" />
          <rect x="216" y="141" width="38" height="14" rx="7" fill="#72899f" />
          <circle cx="255" cy="148" r="8" fill="#7ab8ff" />
        </g>
        <rect x="123" y="226" width="54" height="31" rx="12" fill="#51687e" />
        <g transform={`rotate(${leg} 135 250)`}>
          <rect x="121" y="250" width="27" height="74" rx="13" fill="#8aa0b4" />
          <circle cx="134" cy="326" r="13" fill="#32475a" />
          <rect x="122" y="327" width="25" height="63" rx="12" fill="#70899f" />
          <path d="M119 386 H153 Q161 386 161 396 V400 H117 Z" fill="#9cb2c6" />
        </g>
        <g transform={`rotate(${-leg} 165 250)`}>
          <rect x="152" y="250" width="27" height="74" rx="13" fill="#8aa0b4" />
          <circle cx="166" cy="326" r="13" fill="#32475a" />
          <rect x="153" y="327" width="25" height="63" rx="12" fill="#70899f" />
          <path d="M149 386 H183 Q191 386 191 396 V400 H147 Z" fill="#9cb2c6" />
        </g>
        {[ [112,145], [188,145], [134,326], [166,326], [135,250], [165,250] ].map(([x,y],i)=><circle key={i} cx={x} cy={y} r="4" fill={i%2 ? "#7ab8ff" : "#8ef0c3"} />)}
      </g>
    </svg>
  );
}
