/* ---------- constants ---------- */
export const FEVER = 38.0;   // °C – a reading at or above this counts as a fever
export const ROOMS = 74;     // facility capacity
export const NEED = 3;       // consecutive fever-free days needed for cure
export const KEY = 'wardwise_react_v1';
export const USERS = { nurse: 'Nurse Priya', doctor: 'Dr. Rao', admin: 'Admin Sam' };
export const TX = ['Antipyretics + oral fluids', 'IV fluids + monitoring', 'Antiviral course', 'Oxygen support', 'Continue current plan'];

/* ---------- date helpers (days are integers since epoch, local time) ---------- */
export const baseToday = () => { const n = new Date(); return Math.floor((n.getTime() - n.getTimezoneOffset() * 6e4) / 864e5); };
export const today = S => baseToday() + S.off;   // S.off lets the demo "advance a day"
export const dl = d => new Date(d * 864e5).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' });
export const nowT = () => { const n = new Date(); return String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0'); };

/* ---------- patient helpers ---------- */
export const active = S => S.p.filter(p => p.st === 'admitted');
export const rd = (p, d) => p.r.filter(x => x.d === d);
export const lastR = (p, d) => { const a = rd(p, d); return a[a.length - 1]; };
export const vis = (p, d) => p.v.find(x => x.d === d);

/* consecutive fever-free days (each with a reading), ending today if measured, else yesterday */
export function streak(p, T) {
    let d = lastR(p, T) ? T : T - 1, n = 0;
    while (d >= p.adm) {
        const rs = rd(p, d);
        if (!rs.length || rs.some(x => x.temp >= FEVER)) break;
        n++; d--;
    }
    return n;
}
export const eligible = (p, T) => streak(p, T) >= NEED && !!lastR(p, T);
export const feverToday = (p, T) => { const r = lastR(p, T); return !!r && r.temp >= FEVER; };
export function stats(S) {
    const dis = S.p.filter(p => p.st === 'discharged').length, dec = S.p.filter(p => p.st === 'deceased').length, tot = dis + dec;
    return { dis, dec, tot, mort: tot ? dec / tot * 100 : 0, succ: tot ? dis / tot * 100 : 0 };
}
export const matches = (list, q) => {
    const s = q.trim().toLowerCase();
    return s ? list.filter(p => p.name.toLowerCase().includes(s) || String(p.room) === s) : list;
};

/* ---------- seed data (deterministic) ---------- */
function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
export function seed() {
    const rnd = mulberry(11), ri = (a, b) => a + Math.floor(rnd() * (b - a + 1));
    const T = baseToday(), hm = (h, m) => String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
    const FN = ['Aarav', 'Diya', 'Kabir', 'Meera', 'Rohan', 'Anaya', 'Vihaan', 'Isha', 'Arjun', 'Sana', 'Neel', 'Tara', 'Imran', 'Kavya', 'Yash', 'Zoya', 'Dev', 'Riya', 'Nikhil', 'Pooja'];
    const LN = ['Sharma', 'Patil', 'Khan', 'Iyer', 'Deshmukh', 'Mehta', 'Nair', 'Gupta', 'Joshi', 'Fernandes', 'Shaikh', 'Rao', 'Kulkarni', 'Singh'];
    const nm = () => FN[ri(0, FN.length - 1)] + ' ' + LN[ri(0, LN.length - 1)];
    const P = [];
    const force = { 3: 'elig', 11: 'eligvis', 22: 'appr', 41: 'elig', 57: 'fever' };
    for (let i = 1; i <= ROOMS; i++) {
        let s = [0, 0, 1, 1, 2, 2, 3, 3, 4][ri(0, 8)], fd = ri(2, 5);
        const f = force[i];
        if (f && f !== 'fever') { s = 3; fd = ri(2, 4); }
        const adm = T - (s + fd), r = [], v = [];
        for (let k = 0; k < s + fd; k++) {
            const fev = k < fd;
            if (!fev && !f && rnd() < 0.06) continue; // occasional missed reading
            r.push({ d: adm + k, t: hm(ri(6, 10), ri(0, 59)), temp: fev ? +(38.1 + rnd() * 1.7).toFixed(1) : +(36.4 + rnd()).toFixed(1), by: USERS.nurse });
        }
        const p = { id: i, name: nm(), age: ri(8, 82), room: i, adm, st: 'admitted', r, v, appr: null, out: null };
        if (f || rnd() < 0.42) {
            const fev = f === 'fever' || (s === 0 && rnd() < 0.5);
            p.r.push({ d: T, t: hm(ri(6, 9), ri(0, 59)), temp: fev ? +(38.2 + rnd() * 1.3).toFixed(1) : +(36.5 + rnd() * 0.9).toFixed(1), by: USERS.nurse });
            if (f === 'eligvis' || f === 'appr' || rnd() < 0.5) p.v.push({ d: T, t: hm(ri(10, 12), ri(0, 59)), by: USERS.doctor, tx: TX[ri(0, 4)], notes: 'Reviewed chart. Stable.' });
        }
        if (f === 'appr') p.appr = T;
        P.push(p);
    }
    for (let i = 0; i < 46; i++) P.push({ id: 100 + i, name: nm(), age: ri(8, 82), room: null, adm: T - ri(8, 20), st: 'discharged', r: [], v: [], appr: null, out: T - ri(1, 15) });
    for (let i = 0; i < 6; i++) P.push({ id: 200 + i, name: nm(), age: ri(30, 88), room: null, adm: T - ri(8, 20), st: 'deceased', r: [], v: [], appr: null, out: T - ri(1, 15) });
    return { off: 0, p: P, nextId: 300 };
}
export function load() { try { const j = localStorage.getItem(KEY); return j ? JSON.parse(j) : seed(); } catch (e) { return seed(); } }
export function save(S) { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { /* storage unavailable */ } }
