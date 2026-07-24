import type { HitEvent } from '../types';

const HIT_COLORS: Record<string, string> = {
  home_run: '#ef4444',
  triple: '#f59e0b',
  double: '#3b82f6',
  single: '#22c55e',
  flyout: '#6b7280',
  groundout: '#6b7280',
  out: '#6b7280',
};

interface Props {
  events: HitEvent[];
}

const HOME_X = 200;
const HOME_Y = 290;

function transformCoords(mlbX: number, mlbY: number, isFairHit: boolean): [number, number] {
  const scale = 1.6;
  let x = HOME_X + (mlbX - 125.42) * scale;
  let y = HOME_Y - (199.27 - mlbY) * scale;

  if (isFairHit) {
    const dx = x - HOME_X;
    const dy = HOME_Y - y;
    if (dy > 0) {
      const ratio = dx / dy;
      if (ratio < -1) {
        x = HOME_X - dy;
      } else if (ratio > 1) {
        x = HOME_X + dy;
      }
    }
  }

  return [x, y];
}

const LEGEND: [string, string, string][] = [
  ['HR', '#ef4444', 'ring'],
  ['3B', '#f59e0b', 'triangle'],
  ['2B', '#3b82f6', 'diamond'],
  ['1B', '#22c55e', 'circle'],
  ['FO', '#6b7280', 'circle'],
  ['GO', '#6b7280', 'x'],
];

function renderMarker(event: HitEvent, i: number, x: number, y: number, color: string) {
  if (event.type === 'home_run') {
    return (
      <g key={i} opacity={0.95}>
        <circle cx={x} cy={y} r={7} fill="none" stroke={color} strokeWidth={2.5} />
        <circle cx={x} cy={y} r={2.5} fill={color} />
      </g>
    );
  }
  if (event.type === 'double') {
    return (
      <rect key={i} x={x - 5} y={y - 5} width={10} height={10}
        fill={color} opacity={0.85} rx={1.5}
        transform={`rotate(45,${x},${y})`} />
    );
  }
  if (event.type === 'triple') {
    return (
      <polygon key={i}
        points={`${x},${y - 7} ${x - 6},${y + 4} ${x + 6},${y + 4}`}
        fill={color} opacity={0.85} />
    );
  }
  if (event.type === 'groundout') {
    return (
      <g key={i} opacity={0.45}>
        <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} stroke={color} strokeWidth={2} />
        <line x1={x + 4} y1={y - 4} x2={x - 4} y2={y + 4} stroke={color} strokeWidth={2} />
      </g>
    );
  }
  if (event.type === 'flyout') {
    return (
      <circle key={i} cx={x} cy={y} r={4.5} fill={color} opacity={0.35} />
    );
  }
  return (
    <circle key={i} cx={x} cy={y} r={5} fill={color} opacity={0.85} />
  );
}

export function SprayChart({ events }: Props) {
  const batted = events.filter((e) => e.coord_x && e.coord_y);

  if (batted.length === 0) {
    return (
      <div className="spray-empty">No batted ball data</div>
    );
  }

  const markers = batted.map((event, i) => {
    const color = HIT_COLORS[event.type] || HIT_COLORS.out;
    const isFairHit = ['home_run', 'triple', 'double', 'single'].includes(event.type);
    const [x, y] = transformCoords(event.coord_x, event.coord_y, isFairHit);
    return (
      <g key={i} style={{ animation: `spray-pop 0.2s ease-out ${i * 40}ms both`, transformOrigin: `${x}px ${y}px` }}>
        {renderMarker(event, i, x, y, color)}
      </g>
    );
  });

  return (
    <div className="spray-chart">
      <div className="spray-legend">
        {LEGEND.map(([label, color, shape]) => (
          <div key={label} className="spray-legend-item">
            <svg width="16" height="16" viewBox="0 0 16 16">
              {shape === 'ring' && (
                <>
                  <circle cx={8} cy={8} r={7} fill="none" stroke={color} strokeWidth={2.5} />
                  <circle cx={8} cy={8} r={2.5} fill={color} />
                </>
              )}
              {shape === 'triangle' && (
                <polygon points="8,1 2,12 14,12" fill={color} opacity={0.85} />
              )}
              {shape === 'diamond' && (
                <rect x={3} y={3} width={10} height={10} fill={color} opacity={0.85} rx={1.5} transform="rotate(45,8,8)" />
              )}
              {shape === 'circle' && (
                <circle cx={8} cy={8} r={5} fill={color} opacity={0.85} />
              )}
              {shape === 'x' && (
                <g opacity={0.45}>
                  <line x1={4} y1={4} x2={12} y2={12} stroke={color} strokeWidth={2} />
                  <line x1={12} y1={4} x2={4} y2={12} stroke={color} strokeWidth={2} />
                </g>
              )}
            </svg>
            <span style={{ color: '#94a3b8', fontSize: 13, fontFamily: 'monospace' }}>{label}</span>
          </div>
        ))}
      </div>
      <svg viewBox="0 0 400 310" style={{ width: '100%', maxWidth: 600 }}>
        <defs>
          <radialGradient id="grass" cx="50%" cy="100%" r="85%">
            <stop offset="0%" stopColor="#1a5c2e" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#0f3a1d" stopOpacity="0.25" />
          </radialGradient>
          <radialGradient id="dirt" cx="50%" cy="70%" r="60%">
            <stop offset="0%" stopColor="#a07520" stopOpacity="0.3" />
            <stop offset="100%" stopColor="#8B6914" stopOpacity="0.15" />
          </radialGradient>
        </defs>

        <path d="M 200 290 L 18 100 A 260 260 0 0 1 382 100 Z" fill="url(#grass)" />
        <path d="M 18 100 A 260 260 0 0 1 382 100" fill="none" stroke="#f1f5f9" strokeWidth="2" opacity="0.2" />
        <path d="M 28 108 A 248 248 0 0 1 372 108" fill="none" stroke="#8B6914" strokeWidth="6" opacity="0.12" />

        <path d="M 200 290 L 128 218 L 200 155 L 272 218 Z" fill="url(#dirt)" />
        <circle cx="200" cy="225" r="18" fill="#1a5c2e" opacity="0.25" />
        <circle cx="200" cy="225" r="4" fill="#a07520" opacity="0.35" />

        <line x1="200" y1="290" x2="18" y2="100" stroke="#f1f5f9" strokeWidth="1.2" opacity="0.25" />
        <line x1="200" y1="290" x2="382" y2="100" stroke="#f1f5f9" strokeWidth="1.2" opacity="0.25" />

        <line x1="200" y1="290" x2="272" y2="218" stroke="#f1f5f9" strokeWidth="0.8" opacity="0.18" />
        <line x1="272" y1="218" x2="200" y2="155" stroke="#f1f5f9" strokeWidth="0.8" opacity="0.18" />
        <line x1="200" y1="155" x2="128" y2="218" stroke="#f1f5f9" strokeWidth="0.8" opacity="0.18" />
        <line x1="128" y1="218" x2="200" y2="290" stroke="#f1f5f9" strokeWidth="0.8" opacity="0.18" />

        <rect x="197" y="287" width="6" height="6" fill="white" transform="rotate(45,200,290)" opacity="0.9" />
        <rect x="269" y="215" width="6" height="6" fill="white" transform="rotate(45,272,218)" opacity="0.5" />
        <rect x="197" y="152" width="6" height="6" fill="white" transform="rotate(45,200,155)" opacity="0.5" />
        <rect x="125" y="215" width="6" height="6" fill="white" transform="rotate(45,128,218)" opacity="0.5" />

        {markers}
      </svg>
    </div>
  );
}
