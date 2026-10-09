import { useState } from 'react';
import { today, dl, active, lastR, vis, streak, eligible, feverToday, stats, matches, ROOMS, NEED } from '../lib/lib.js';
import { confirmDischarge, admitPatient } from '../lib/actions.js';
import { TempTag, SearchBox, Hero } from './Shared.jsx';

function Overview({ S, T }) {
  const all = active(S), st = stats(S);
  const appr = all.filter(p => p.appr);
  const meas = all.filter(p => lastR(p, T)).length, visd = all.filter(p => vis(p, T)).length;
  const alert = !st.tot ? null
    : st.mort > 15 ? <div className="banner red"><b>Mortality is {st.mort.toFixed(1)}%, above the expected 15%.</b> Review treatment protocols and recent deaths with the head doctor.</div>
    : st.mort >= 13 ? <div className="banner amber"><b>Mortality is {st.mort.toFixed(1)}%, close to the 15% limit.</b> Keep an eye on new outcomes.</div>
    : <div className="banner green">Success rate is {st.succ.toFixed(1)}%, meeting the 85% benchmark.</div>;
  return (
    <>
      {alert}
      <div className="kpis">
        <div className="kpi"><b>{all.length}/{ROOMS}</b><span>Rooms occupied</span></div>
        <div className="kpi"><b>{meas}</b><span>Temperatures taken today</span></div>
        <div className="kpi"><b>{visd}</b><span>Doctor visits today</span></div>
        <div className="kpi"><b>{appr.length}</b><span>Discharges to confirm</span></div>
        <div className="kpi"><b>{st.succ.toFixed(1)}%</b><span>Success rate (target 85%)</span></div>
      </div>
      <div className="panel">
        <h3>Ward board</h3>
        <div className="legend">
          <span><i style={{ background: 'var(--grey)' }} />Not measured</span>
          <span><i style={{ background: 'var(--teal-l)' }} />Measured</span>
          <span><i style={{ background: 'var(--teal)' }} />Measured + visited</span>
          <span><i style={{ background: 'var(--green)' }} />Discharge approved</span>
          <span><i style={{ background: 'var(--red)' }} />Fever today</span>
          <span><i style={{ border: '2px dashed var(--line)' }} />Free room</span>
        </div>
        <div className="board">
          {Array.from({ length: ROOMS }, (_, i) => {
            const p = all.find(x => x.room === i + 1);
            if (!p) return <div key={i} className="cell c-free" title={`Room ${i + 1}: free`}>{i + 1}</div>;
            const c = p.appr ? 'c-appr' : vis(p, T) ? 'c-vis' : lastR(p, T) ? 'c-meas' : '';
            return <div key={i} className={`cell ${c} ${feverToday(p, T) ? 'fv' : ''}`} title={`Room ${i + 1}: ${p.name}`}>{i + 1}</div>;
          })}
        </div>
      </div>
      <div className="panel">
        <h3>Treatment outcomes</h3>
        <div className="two">
          <div>
            <b className="temp">{st.dis}</b> discharged cured<br />
            <b className="temp">{st.dec}</b> deceased<br />
            <span className="sub">{st.tot} closed cases · mortality {st.mort.toFixed(1)}% (limit 15%)</span>
          </div>
          <div className="prog">
            <div className="bar" style={{ height: 14 }}><i style={{ width: `${st.succ}%`, background: st.succ >= 85 ? 'var(--green)' : 'var(--red)' }} /></div>
            <span className="sub" style={{ fontSize: 14 }}>Success rate {st.succ.toFixed(1)}% against 85% benchmark</span>
          </div>
        </div>
      </div>
    </>
  );
}

function Discharges({ S, T, run }) {
  const all = active(S), appr = all.filter(p => p.appr), pend = all.filter(p => eligible(p, T) && !p.appr);
  return (
    <>
      <div className="panel"><h3>Approved by doctor: confirm to free the room</h3>
        <div className="list">
          {appr.length === 0 && <div className="empty">No discharges waiting.</div>}
          {appr.map(p => (
            <div key={p.id} className="row s-appr">
              <div className="room"><small>Room</small>{p.room}</div>
              <div className="nm"><b>{p.name}</b><span>Approved {dl(p.appr)} · {streak(p, T)} fever-free days</span></div>
              <div />
              <div><button className="btn" onClick={() => run(D => confirmDischarge(D, p.id))}>Confirm discharge</button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="panel"><h3>Meets cure criteria, doctor hasn’t approved yet</h3>
        <div className="list">
          {pend.length === 0 && <div className="empty">None.</div>}
          {pend.map(p => (
            <div key={p.id} className="row">
              <div className="room"><small>Room</small>{p.room}</div>
              <div className="nm"><b>{p.name}</b><span>{streak(p, T)} fever-free days · waiting for doctor sign-off</span></div>
              <div /><div><span className="tag amber">Awaiting doctor</span></div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Admit({ S, run }) {
  const free = ROOMS - active(S).length;
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [err, setErr] = useState('');
  const submit = () => {
    const ok = run(D => {
      const res = admitPatient(D, name, parseInt(age, 10));
      if (res.fail) setErr(res.msg);
      return res.fail ? { fail: true } : res;   // validation errors show inline, not as a toast
    });
    if (ok) { setName(''); setAge(''); setErr(''); }
  };
  return (
    <div className="panel" style={{ maxWidth: 520 }}>
      <h3>Admit a patient</h3>
      {free ? <div className="note info">{free} room{free > 1 ? 's' : ''} free. The lowest free room is assigned automatically.</div>
        : <div className="note err">All {ROOMS} rooms are occupied. Confirm a discharge before admitting anyone new.</div>}
      <label htmlFor="an">Full name</label>
      <input type="text" id="an" value={name} disabled={!free} onChange={e => setName(e.target.value)} />
      <label htmlFor="aa">Age</label>
      <input type="number" id="aa" min="0" max="120" value={age} disabled={!free} onChange={e => setAge(e.target.value)} />
      {err && <div className="note err">{err}</div>}
      <div className="acts"><button className="btn" disabled={!free} onClick={submit}>Admit patient</button></div>
    </div>
  );
}

function Patients({ S, T }) {
  const [q, setQ] = useState('');
  const rows = matches(active(S), q).sort((a, b) => a.room - b.room);
  return (
    <>
      <div className="tools"><SearchBox value={q} onChange={setQ} /></div>
      <div className="panel" style={{ overflow: 'auto', padding: 6 }}>
        <table>
          <thead><tr><th>Room</th><th>Patient</th><th>Temp today</th><th>Doctor visit</th><th>Fever-free</th><th>Status</th></tr></thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan="6">No patients match.</td></tr>}
            {rows.map(p => {
              const r = lastR(p, T), v = vis(p, T);
              return (
                <tr key={p.id}>
                  <td>{p.room}</td><td>{p.name}</td>
                  <td>{r ? <TempTag r={r} /> : <span className="tag amber">Pending</span>}</td>
                  <td>{v ? <span className="tag green">Visited</span> : <span className="tag">Not yet</span>}</td>
                  <td>{streak(p, T)}/{NEED}</td>
                  <td>{p.appr ? <span className="tag green">Discharge approved</span> : eligible(p, T) ? <span className="tag teal">Meets criteria</span> : 'In treatment'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function AdminView({ S, run }) {
  const T = today(S);
  const [tab, setTab] = useState('ov');
  const apprCount = active(S).filter(p => p.appr).length;
  const tabs = [['ov', 'Overview'], ['dc', 'Discharges'], ['ad', 'Admit patient'], ['pt', 'Patients']];
  return (
    <>
      <Hero title="Administration" sub={`${dl(T)} · admissions, discharges and centre performance`} />
      <div className="tabs" role="tablist">
        {tabs.map(([k, l]) => (
          <button key={k} className="tab" role="tab" aria-selected={tab === k} onClick={() => setTab(k)}>
            {l}{k === 'dc' && apprCount > 0 && <span className="n">{apprCount}</span>}
          </button>
        ))}
      </div>
      {tab === 'ov' && <Overview S={S} T={T} />}
      {tab === 'dc' && <Discharges S={S} T={T} run={run} />}
      {tab === 'ad' && <Admit S={S} run={run} />}
      {tab === 'pt' && <Patients S={S} T={T} />}
    </>
  );
}
