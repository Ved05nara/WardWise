/*
 * Business rules. Every action mutates a draft copy of the state and returns
 * { fail?: true, msg?: string, kind?: 'err'|'warn'|'' }.
 * In a real product the same checks must be enforced on the server too.
 */
import { today, lastR, vis, eligible, streak, nowT, active, dl, ROOMS, NEED, FEVER, USERS } from './lib.js';

const find = (S, id) => S.p.find(p => p.id === id);

export function recordTemp(S, id, temp) {            // nurse only
  const p = find(S, id), T = today(S), ex = lastR(p, T);
  const rec = { d: T, t: nowT(), temp: Math.round(temp * 10) / 10, by: USERS.nurse };
  if (ex) { p.r.splice(p.r.indexOf(ex), 1); rec.corr = true; }   // correction replaces, never duplicates
  p.r.push(rec);
  let msg = `Saved ${rec.temp.toFixed(1)}°C for Room ${p.room}.`, kind = '';
  if (rec.temp >= FEVER) {
    kind = 'warn'; msg += ' Fever recorded. The doctor will see it first.';
    if (p.appr) { p.appr = null; msg += ' Discharge approval cancelled.'; }
  }
  return { msg, kind };
}

export function saveVisit(S, id, tx, notes) {        // doctor only
  const p = find(S, id), T = today(S);
  if (!lastR(p, T)) return { fail: true, msg: 'Temperature isn’t recorded yet. Ask the nurse first.' };
  if (vis(p, T)) return { fail: true, kind: 'warn', msg: 'Already visited today.' };
  p.v.push({ d: T, t: nowT(), by: USERS.doctor, tx, notes: notes.trim() });
  return { msg: `Visit logged for Room ${p.room}.` };
}

export function approveDischarge(S, id) {            // doctor only
  const p = find(S, id), T = today(S);
  if (!eligible(p, T) || !vis(p, T)) return { fail: true, msg: `Discharge needs ${NEED} fever-free days, today’s reading and today’s visit.` };
  p.appr = T;
  return { msg: `Discharge approved for Room ${p.room}. Admin notified.` };
}

export function recordDeath(S, id) {                 // doctor only
  const p = find(S, id), rm = p.room;
  p.st = 'deceased'; p.out = today(S); p.appr = null; p.room = null;
  return { kind: 'warn', msg: `Case closed. Room ${rm} is now free.` };
}

export function confirmDischarge(S, id) {            // admin only
  const p = find(S, id);
  if (!p.appr) return { fail: true, msg: 'Only patients approved by a doctor can be discharged.' };
  const rm = p.room;
  p.st = 'discharged'; p.out = today(S); p.room = null; p.appr = null;
  return { msg: `Room ${rm} is free. Patient discharged.` };
}

export function admitPatient(S, name, age) {         // admin only
  const used = new Set(active(S).map(p => p.room));
  let room = 0; for (let i = 1; i <= ROOMS; i++) if (!used.has(i)) { room = i; break; }
  if (!room) return { fail: true, msg: `All ${ROOMS} rooms are occupied.` };
  if (name.trim().length < 2) return { fail: true, msg: 'Enter the patient’s full name.' };
  if (isNaN(age) || age < 0 || age > 120) return { fail: true, msg: 'Enter an age between 0 and 120.' };
  S.p.push({ id: S.nextId++, name: name.trim(), age, room, adm: today(S), st: 'admitted', r: [], v: [], appr: null, out: null });
  return { msg: `${name.trim()} admitted to Room ${room}. They now appear in the nurse’s list.` };
}

export function nextDay(S) {
  S.off++;
  return { msg: `Now showing ${dl(today(S))}. No readings or visits yet today.` };
}
