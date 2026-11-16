// Local control panel. Start with:  npm start   then open http://localhost:3000
const http = require('http');
const fs = require('fs');
const path = require('path');
const bot = require('./e2e/bot');

const PORT = process.env.PORT || 3000;
const REL = { father: 1, mother: 1, son: 1, daughter: 1, brother: 1, sister: 1, spouse: 1 };
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

let running = false;
let logs = [];
const clients = new Set();

function emit(type, data) {
    const line = JSON.stringify({ type, data });
    if (type === 'log') { logs.push(data); if (logs.length > 2000) logs.shift(); }
    for (const c of clients) c.write(`data: ${line}\n\n`);
}

function validate(b) {
    const err = [];
    if (!b.username || !b.password) err.push('Enter the username and password.');
    const dates = (b.dates || []).filter(Boolean).map((d) => {
        const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
        if (!m) { err.push(`Invalid date: ${d}`); return null; }
        const day = String(parseInt(m[3], 10)), month = MONTHS[parseInt(m[2], 10) - 1];
        return { label: `${month} ${day}`, day, month, year: m[1] };
    }).filter(Boolean);
    if (!dates.length) err.push('Add at least one date.');
    const rows = [...new Set(String(b.pilgrimRows || '').split(/[\s,]+/).filter(Boolean).map(Number))];
    if (!rows.length || rows.some((n) => !Number.isInteger(n) || n < 1)) err.push('Pilgrim rows must be numbers from 1, e.g. 2,3,4,5.');
    const checkNominee = (n, who) => {
        if (!/^[a-zA-Z ]+$/.test(n.name || '') || n.name.length > 32) err.push(`${who}: name must be letters/spaces, max 32.`);
        if (!/^[0-9]{1,3}$/.test(String(n.age || ''))) err.push(`${who}: age must be 1 to 3 digits.`);
        if (!(String(n.relation || '').toLowerCase() in REL)) err.push(`${who}: choose a relation.`);
    };
    checkNominee(b.nominee || {}, 'Nominee');
    const overrides = {};
    for (const o of b.overrides || []) {
        checkNominee(o, `Row ${o.row} nominee`);
        overrides[o.row] = { name: o.name, age: String(o.age), relation: o.relation };
    }
    const slots = String(b.slots || '').split('\n').map((s) => s.trim()).filter(Boolean);
    if (b.slotMode === 'particular' && !slots.length) err.push('Add at least one preferred slot, or switch to Auto.');
    return { err, cfg: {
        username: b.username, password: b.password, dates, pilgrimRows: rows,
        nominee: { name: (b.nominee || {}).name, age: String((b.nominee || {}).age), relation: (b.nominee || {}).relation },
        overrides, slotMode: b.slotMode === 'particular' ? 'particular' : 'auto', slots,
        routeValue: String(b.routeValue || '1'),
        maxFailures: Math.max(1, +b.maxFailures || 20), retryDelaySec: Math.max(1, +b.retryDelaySec || 5),
        headless: b.headless !== false, useInstalledChrome: !!b.useInstalledChrome,
    } };
}

function readBody(req) {
    return new Promise((res) => { let d = ''; req.on('data', (c) => (d += c)); req.on('end', () => { try { res(JSON.parse(d || '{}')); } catch { res({}); } }); });
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(obj)); };

http.createServer(async (req, res) => {
    if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(fs.readFileSync(path.join(__dirname, 'public', 'index.html')));
    }
    if (req.url === '/api/events') {
        res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
        res.write(`data: ${JSON.stringify({ type: 'init', data: { running, logs } })}\n\n`);
        clients.add(res);
        return req.on('close', () => clients.delete(res));
    }
    if (req.method === 'POST' && req.url === '/api/start') {
        if (running) return json(res, 409, { errors: ['Automation is already running.'] });
        const { err, cfg } = validate(await readBody(req));
        if (err.length) return json(res, 400, { errors: err });
        running = true; logs = []; emit('status', { running: true });
        bot.run(cfg, (line) => emit('log', line))
            .catch((e) => emit('log', `🛑 ${e.message}`))
            .finally(() => { running = false; emit('status', { running: false }); });
        return json(res, 200, { ok: true });
    }
    if (req.method === 'POST' && req.url === '/api/stop') {
        if (running) { emit('log', '⏹ Stop requested...'); bot.stop(); }
        return json(res, 200, { ok: true });
    }
    res.writeHead(404); res.end('Not found');
}).listen(PORT, '127.0.0.1', () => console.log(`Open http://localhost:${PORT}`));
