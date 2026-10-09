import { useState } from 'react';
import { today, dl, active, lastR, FEVER, matches } from '../lib/lib.js';
import { recordTemp } from '../lib/actions.js';
import { Dots, TempTag, SearchBox, Modal, Hero } from './Shared.jsx';

/* Temperature entry with validation: error = blocked, warning = needs a second confirm */
function TempModal({ p, T, onClose, onSave }) {
  const ex = lastR(p, T);
  const [val, setVal] = useState('');
  const [err, setErr] = useState('');
  const [warn, setWarn] = useState('');
  const [warnFor, setWarnFor] = useState(null);

  const submit = () => {
    const v = parseFloat(val);
    setErr('');
    if (isNaN(v)) return setErr('Enter a temperature, for example 37.2.');
    if (v < 34 || v > 43) return setErr('Temperature must be between 34.0 and 43.0 °C. Check the thermometer and measure again.');
    const w = v >= 40 ? 'Very high fever (40 °C or above). Tell the doctor right away.'
      : v < 35.5 ? 'Unusually low reading. Re-measure before saving if you can.' : '';
    if (w && warnFor !== v) { setWarn(w); setWarnFor(v); return; }
    onSave(v);
  };

  return (
    <Modal onClose={onClose} label="Record temperature">
      <h3>{ex ? 'Correct' : 'Record'} temperature</h3>
      <div className="sub">Room {p.room} · {p.name}</div>
      {ex && <div className="note warn">Already measured today at {ex.t} by {ex.by}: {ex.temp.toFixed(1)}°C. Saving replaces that reading and marks it as corrected. Only use this for a wrong entry, not for a second measurement.</div>}
      <label htmlFor="tv">Temperature (°C)</label>
      <input id="tv" type="number" step="0.1" inputMode="decimal" placeholder="e.g. 37.2" autoFocus
        value={val} onChange={e => { setVal(e.target.value); setWarn(''); setWarnFor(null); }}
        onKeyDown={e => e.key === 'Enter' && submit()} />
      {err && <div className="note err">{err}</div>}
      {warn && <div className="note warn">{warn}</div>}
      <div className="acts">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn" onClick={submit}>{warn ? 'Confirm and save' : 'Save reading'}</button>
      </div>
    </Modal>
  );
}

export default function NurseView({ S, run }) {
  const T = today(S);
  const [f, setF] = useState('todo');
  const [q, setQ] = useState('');
  const [modalId, setModalId] = useState(null);

  const all = active(S), done = all.filter(p => lastR(p, T)), todo = all.filter(p => !lastR(p, T));
  const list = matches(f === 'todo' ? todo : f === 'done' ? done : all, q).sort((a, b) => a.room - b.room);
  const target = all.find(p => p.id === modalId);

  return (
    <>
      <Hero title="Temperature round" sub={`${dl(T)} · each patient needs exactly one reading per day`} done={done.length} total={all.length} />
      <div className="tools">
        <SearchBox value={q} onChange={setQ} />
        {[['todo', `To measure (${todo.length})`], ['done', `Measured (${done.length})`], ['all', `All (${all.length})`]].map(([k, l]) => (
          <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>{l}</button>
        ))}
      </div>
      <div className="list">
        {list.length === 0 && <div className="empty">{f === 'todo' ? 'Every patient has been measured today. Nice work.' : 'No patients match.'}</div>}
        {list.map(p => {
          const r = lastR(p, T);
          return (
            <div key={p.id} className={`row ${r ? (r.temp >= FEVER ? 's-fever' : 's-done') : 's-todo'}`}>
              <div className="room"><small>Room</small>{p.room}</div>
              <div className="nm"><b>{p.name}</b><span>{p.age} yrs · day {T - p.adm + 1} in centre</span></div>
              <div><Dots p={p} T={T} /></div>
              <div>
                {r ? (<>
                  <TempTag r={r} /> <span className="tag green">Measured {r.t}</span>{' '}
                  <button className="link" onClick={() => setModalId(p.id)}>Correct</button>
                </>) : <button className="btn" onClick={() => setModalId(p.id)}>Record temperature</button>}
              </div>
            </div>
          );
        })}
      </div>
      {target && (
        <TempModal p={target} T={T} onClose={() => setModalId(null)}
          onSave={v => { run(D => recordTemp(D, target.id, v)); setModalId(null); }} />
      )}
    </>
  );
}
