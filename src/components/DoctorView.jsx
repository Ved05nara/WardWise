import { useState } from 'react';
import { today, dl, active, lastR, vis, streak, eligible, matches, FEVER, NEED, TX } from '../lib/lib.js';
import { saveVisit, approveDischarge, recordDeath } from '../lib/actions.js';
import { Dots, TempTag, Pips, TempChart, SearchBox, Modal, Hero } from './Shared.jsx';

function PatientModal({ p, T, run, onClose, onDeath }) {
  const [tx, setTx] = useState(TX[0]);
  const [notes, setNotes] = useState('');
  const r = lastR(p, T), v = vis(p, T), n = streak(p, T);

  const miss = [];
  if (n < NEED) miss.push(`${NEED - n} more fever-free day${NEED - n > 1 ? 's' : ''}`);
  if (!r) miss.push('today’s temperature');
  if (!v) miss.push('today’s visit');

  const hist = [...p.r].sort((a, b) => b.d - a.d || b.t.localeCompare(a.t)).slice(0, 7);

  return (
    <Modal wide onClose={onClose} label="Patient detail">
      <h3>Room {p.room} · {p.name}</h3>
      <div className="sub">{p.age} yrs · admitted {dl(p.adm)} · day {T - p.adm + 1}</div>
      {r && r.temp >= FEVER && <div className="note err">Fever today ({r.temp.toFixed(1)}°C). Fever-free count restarts and any discharge approval is cancelled.</div>}
      <Pips n={n} />
      <TempChart p={p} T={T} />
      <table>
        <thead><tr><th>Recorded</th><th>Temp</th><th>By</th></tr></thead>
        <tbody>
          {hist.length === 0 && <tr><td colSpan="3">No readings</td></tr>}
          {hist.map((x, i) => (
            <tr key={i}><td>{dl(x.d)} {x.t}</td>
              <td className={`temp ${x.temp >= FEVER ? 'f' : ''}`} style={{ fontSize: 16 }}>{x.temp.toFixed(1)}°C</td>
              <td>{x.by}{x.corr ? ' (corrected)' : ''}</td></tr>
          ))}
        </tbody>
      </table>

      <h3 style={{ marginTop: 18, fontSize: 18 }}>Today’s visit</h3>
      {v ? (
        <div className="note info"><b>Visited at {v.t}.</b> Treatment: {v.tx}.{v.notes && ` Notes: ${v.notes}`}</div>
      ) : !r ? (
        <div className="note warn">Temperature not recorded today. The nurse must measure it first, so the visit can’t be logged yet.</div>
      ) : (<>
        <label htmlFor="tx">Treatment plan</label>
        <select id="tx" value={tx} onChange={e => setTx(e.target.value)}>{TX.map(t => <option key={t}>{t}</option>)}</select>
        <label htmlFor="nt">Notes (optional)</label>
        <textarea id="nt" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observations, changes to treatment" />
        <div className="acts" style={{ marginTop: 8 }}>
          <button className="btn" onClick={() => run(D => saveVisit(D, p.id, tx, notes))}>Mark as visited</button>
        </div>
      </>)}

      <h3 style={{ marginTop: 18, fontSize: 18 }}>Outcome</h3>
      {p.appr ? (
        <div className="note info">Discharge approved. Admin has been notified and will free the room.</div>
      ) : (<>
        <button className="btn" disabled={miss.length > 0} onClick={() => run(D => approveDischarge(D, p.id))}>Approve discharge</button>
        {miss.length > 0 && <div className="sub" style={{ marginTop: 6 }}>Needs: {miss.join(', ')}.</div>}
      </>)}

      <div className="acts" style={{ justifyContent: 'space-between' }}>
        <button className="btn danger" onClick={onDeath}>Record death</button>
        <button className="btn ghost" onClick={onClose}>Close</button>
      </div>
    </Modal>
  );
}

function DeathModal({ p, onClose, onConfirm }) {
  const [ok, setOk] = useState(false);
  const [err, setErr] = useState('');
  return (
    <Modal onClose={onClose} label="Confirm death">
      <h3>Record death for {p.name}?</h3>
      <div className="note err">This permanently closes the case, frees Room {p.room}, and counts toward the centre’s mortality rate. It can’t be undone from the app.</div>
      <label><input type="checkbox" checked={ok} onChange={e => setOk(e.target.checked)} /> I confirm this patient has passed away</label>
      {err && <div className="note err">{err}</div>}
      <div className="acts">
        <button className="btn ghost" onClick={onClose}>Cancel</button>
        <button className="btn danger" onClick={() => ok ? onConfirm() : setErr('Tick the box to confirm.')}>Record death</button>
      </div>
    </Modal>
  );
}

export default function DoctorView({ S, run }) {
  const T = today(S);
  const [f, setF] = useState('ready');
  const [q, setQ] = useState('');
  const [modal, setModal] = useState(null); // { type: 'pt' | 'death', id }

  const all = active(S);
  const sets = {
    ready: all.filter(p => lastR(p, T) && !vis(p, T)),   // measured, not yet visited
    wait: all.filter(p => !lastR(p, T)),                 // nurse hasn't measured yet
    done: all.filter(p => vis(p, T)),
    dis: all.filter(p => eligible(p, T)),
  };
  const tabs = [['ready', 'Ready to visit'], ['wait', 'Awaiting temperature'], ['done', 'Visited today'], ['dis', 'Discharge-ready']];
  let list = matches(sets[f], q);
  list = [...list].sort((a, b) => f === 'ready'
    ? ((lastR(b, T).temp >= FEVER) - (lastR(a, T).temp >= FEVER)) || (lastR(b, T).temp - lastR(a, T).temp)   // fevers first
    : a.room - b.room);
  const target = modal && S.p.find(p => p.id === modal.id);

  return (
    <>
      <Hero title="Doctor rounds" sub={`${dl(T)} · patients appear in “Ready to visit” once the nurse records their temperature`} done={sets.done.length} total={all.length} />
      <div className="tools">
        <SearchBox value={q} onChange={setQ} />
        {tabs.map(([k, l]) => <button key={k} className="chip" aria-pressed={f === k} onClick={() => setF(k)}>{l} ({sets[k].length})</button>)}
      </div>
      <div className="list">
        {list.length === 0 && <div className="empty">Nothing here right now.</div>}
        {list.map(p => {
          const r = lastR(p, T), n = streak(p, T), v = vis(p, T);
          const cls = !r ? '' : r.temp >= FEVER ? 's-fever' : p.appr ? 's-appr' : 's-done';
          return (
            <div key={p.id} className={`row ${cls}`}>
              <div className="room"><small>Room</small>{p.room}</div>
              <div className="nm"><b>{p.name}</b><span>{p.age} yrs · {n} of {NEED} fever-free days</span></div>
              <div>{r ? <TempTag r={r} /> : <span className="tag amber">Not measured</span>} <Dots p={p} T={T} /></div>
              <div>
                {p.appr ? <span className="tag green">Discharge approved</span>
                  : eligible(p, T) && !v ? <span className="tag teal">Meets cure criteria</span> : null}{' '}
                <button className={`btn ${v || !r ? 'ghost' : ''}`} onClick={() => setModal({ type: 'pt', id: p.id })}>
                  {!r ? 'View chart' : v ? 'View' : 'Visit'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
      {target && modal.type === 'pt' && (
        <PatientModal p={target} T={T} run={run} onClose={() => setModal(null)} onDeath={() => setModal({ type: 'death', id: target.id })} />
      )}
      {target && modal.type === 'death' && (
        <DeathModal p={target} onClose={() => setModal({ type: 'pt', id: target.id })}
          onConfirm={() => { run(D => recordDeath(D, target.id)); setModal(null); }} />
      )}
    </>
  );
}
