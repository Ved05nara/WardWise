import { useEffect } from 'react';
import { FEVER, NEED, dl, rd } from '../lib/lib.js';

export function Dots({ p, T }) {
  return (
    <span className="dots" aria-label="Last five days">
      {[4, 3, 2, 1, 0].map(k => {
        const d = T - k, rs = rd(p, d);
        const c = !rs.length ? '' : rs.some(x => x.temp >= FEVER) ? 'fv' : 'ok';
        return <span key={d} className={`dot ${c} ${d === T ? 'now' : ''}`}
          title={`${dl(d)}: ${rs.length ? rs.map(x => x.temp.toFixed(1) + '°C').join(', ') : 'no reading'}`} />;
      })}
    </span>
  );
}

export const TempTag = ({ r }) => r ? <span className={`temp ${r.temp >= FEVER ? 'f' : ''}`}>{r.temp.toFixed(1)}°C</span> : null;

export function Pips({ n }) {
  return (
    <div className="pips">
      {Array.from({ length: NEED }, (_, i) => <span key={i} className={`pip ${i < n ? 'on' : ''}`} />)}
      <span style={{ marginLeft: 6 }}>{Math.min(n, NEED)} of {NEED} fever-free days</span>
    </div>
  );
}

export function TempChart({ p, T }) {
  const from = Math.max(p.adm, T - 9), pts = [];
  for (let d = from; d <= T; d++) { const rs = rd(p, d); if (rs.length) pts.push({ d, v: Math.max(...rs.map(x => x.temp)) }); }
  if (!pts.length) return <div className="empty">No readings yet</div>;
  const W = 640, H = 170, L = 38, R = 10, Tp = 10, B = 26;
  const x = d => L + (d - from) / Math.max(1, T - from) * (W - L - R);
  const y = v => Tp + (41 - Math.min(41, Math.max(35, v))) / 6 * (H - Tp - B);
  const path = pts.map((q, i) => (i ? 'L' : 'M') + x(q.d) + ' ' + y(q.v)).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Daily peak temperature chart">
      {[36, 37, 38, 39, 40].map(v => (
        <g key={v}>
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--line)" />
          <text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="var(--ink2)">{v}</text>
        </g>
      ))}
      <line x1={L} x2={W - R} y1={y(FEVER)} y2={y(FEVER)} stroke="var(--red)" strokeDasharray="5 4" />
      <path d={path} fill="none" stroke="var(--teal)" strokeWidth="2.5" />
      {pts.map(q => (
        <circle key={q.d} cx={x(q.d)} cy={y(q.v)} r="5" fill={q.v >= FEVER ? 'var(--red)' : 'var(--green)'}>
          <title>{dl(q.d)}: {q.v.toFixed(1)}°C</title>
        </circle>
      ))}
      {pts.filter((q, i) => i % 2 === 0 || q.d === T).map(q => (
        <text key={'l' + q.d} x={x(q.d)} y={H - 6} fontSize="11" textAnchor="middle" fill="var(--ink2)">{dl(q.d)}</text>
      ))}
    </svg>
  );
}

export function SearchBox({ value, onChange }) {
  return <input type="search" placeholder="Search by name or room number" value={value}
    onChange={e => onChange(e.target.value)} aria-label="Search patients" />;
}

export function Modal({ children, onClose, wide, label }) {
  useEffect(() => {
    const h = e => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onClose]);
  return (
    <div className="mask">
      <div className={`modal ${wide ? 'wide' : ''}`} role="dialog" aria-modal="true" aria-label={label}>{children}</div>
    </div>
  );
}

export function Hero({ title, sub, done, total }) {
  return (
    <div className="hero">
      <div><h2>{title}</h2><p>{sub}</p></div>
      {total != null && (
        <div className="prog"><b>{done}</b> of {total} {title === 'Doctor rounds' ? 'visited' : 'measured'}
          <div className="bar"><i style={{ width: `${total ? done / total * 100 : 0}%` }} /></div></div>
      )}
    </div>
  );
}
