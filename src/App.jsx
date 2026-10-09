import { useState, useEffect, useRef } from 'react';
import { load, save, seed, USERS } from './lib/lib.js';
import { nextDay } from './lib/actions.js';
import NurseView from './components/NurseView.jsx';
import DoctorView from './components/DoctorView.jsx';
import AdminView from './components/AdminView.jsx';

const ROLE_INFO = [
  ['nurse', 'Nurse', 'See who still needs a temperature check and record readings.'],
  ['doctor', 'Doctor', 'Visit patients with fresh readings, log treatment, approve discharges, record outcomes.'],
  ['admin', 'Admin', 'Admit patients, confirm discharges, watch occupancy and mortality.'],
];

export default function App() {
  const [S, setS] = useState(load);
  const [role, setRole] = useState(null);
  const [toast, setToast] = useState(null);
  const timer = useRef();

  useEffect(() => { save(S); }, [S]);

  const notify = (msg, kind = '') => {
    setToast({ msg, kind });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 3800);
  };

  /* Runs a business action on a draft copy; commits only if it didn't fail. Returns true on success. */
  const run = fn => {
    const draft = structuredClone(S);
    const res = fn(draft) || {};
    if (!res.fail) setS(draft);
    if (res.msg) notify(res.msg, res.kind || (res.fail ? 'err' : ''));
    return !res.fail;
  };

  const reset = () => { if (window.confirm('Reset all demo data?')) { setS(seed()); notify('Demo data reset.'); } };

  if (!role) {
    return (
      <div className="login">
        <h1>WardWise</h1>
        <p>Temperature tracking and discharge management for the quarantine & treatment centre. Choose a role to try the prototype. Data is saved in this browser.</p>
        <div className="roles">
          {ROLE_INFO.map(([k, t, d]) => (
            <button key={k} className="role" onClick={() => setRole(k)}><h3>{t}</h3><span>{d}</span></button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <>
      <header className="top">
        <span className="brand">WardWise</span><span className="sp" />
        <span className="who">{USERS[role]} · {role}</span>
        <button onClick={() => setRole(null)}>Switch role</button>
      </header>
      <main className="wrap">
        {role === 'nurse' && <NurseView S={S} run={run} />}
        {role === 'doctor' && <DoctorView S={S} run={run} />}
        {role === 'admin' && <AdminView S={S} run={run} />}
        <div className="demo">
          <span>Demo controls:</span>
          <button className="btn ghost" onClick={() => run(nextDay)}>Advance to next day</button>
          <button className="btn ghost" onClick={reset}>Reset demo data</button>
        </div>
      </main>
      {toast && <div className={`toast ${toast.kind}`} role="status" aria-live="polite">{toast.msg}</div>}
    </>
  );
}
