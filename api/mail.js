const crypto = require('crypto');
const U = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
const T = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
const R = (path, body) => fetch(U + path, { method: 'POST', headers: { Authorization: 'Bearer ' + T }, body: JSON.stringify(body) }).then(r => r.json());
const okId = s => typeof s == 'string' && /^[\w-]{2,80}$/.test(s);
const DAY = 86400, KEEP = 30 * DAY;

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method == 'OPTIONS') return res.status(204).end();
  if (!U || !T) return res.status(503).json({ e: 'storage not connected' });
  let b = req.body;
  if (typeof b == 'string') try { b = JSON.parse(b) } catch (e) { b = null }
  b = b || {};
  try {
    if (b.a == 'put') {
      const to = [...new Set(Array.isArray(b.to) ? b.to : [])].filter(okId).slice(0, 300), s = JSON.stringify(b.m || null);
      if (!to.length || s.length > 9e5) return res.status(400).json({ e: 'bad request' });
      await R('/pipeline', to.flatMap(i => [['RPUSH', 'in:' + i, s], ['LTRIM', 'in:' + i, '-200', '-1'], ['EXPIRE', 'in:' + i, String(KEEP)]]));
      return res.json({ ok: 1 });
    }
    if (b.a == 'get') {
      if (!okId(b.id) || typeof b.k != 'string' || b.k.length < 16) return res.status(400).json({ e: 'bad request' });
      const h = crypto.createHash('sha256').update(b.k).digest('hex'), ok = 'ow:' + b.id;
      const r = await R('/pipeline', [['SET', ok, h, 'NX'], ['GET', ok]]);
      if (r[1].result != h) return res.status(403).json({ e: 'not your inbox' });
      const x = await R('/multi-exec', [['LRANGE', 'in:' + b.id, '0', '-1'], ['DEL', 'in:' + b.id]]);
      const l = (x[0].result || []).map(s => { try { return JSON.parse(s) } catch (e) { return null } }).filter(Boolean);
      return res.json({ l });
    }
    if (b.a == 'login' || b.a == 'pass') {
      const u = typeof b.u == 'string' ? b.u.trim().toLowerCase() : '', hx = s => typeof s == 'string' && /^[0-9a-f]{64}$/.test(s);
      if (u.length < 3 || u.length > 64 || !hx(b.ph)) return res.status(400).json({ e: 'bad request' });
      const key = 'ac:' + encodeURIComponent(u), h = s => crypto.createHash('sha256').update('hivelume-pw:' + s).digest('hex');
      const [g] = await R('/pipeline', [['GET', key]]);
      let a = g.result ? JSON.parse(g.result) : null;
      if (b.a == 'login' && !a) {
        if (!okId(b.id) || typeof b.k != 'string' || b.k.length < 16) return res.status(400).json({ e: 'bad request' });
        a = { id: b.id, k: b.k, h: h(b.ph) };
        const [s] = await R('/pipeline', [['SET', key, JSON.stringify(a), 'NX']]);
        if (s.result != 'OK') return res.status(409).json({ e: 'try again' });
        return res.json({ id: a.id, k: a.k });
      }
      if (!a || a.h != h(b.ph)) return res.status(403).json({ e: 'wrong password' });
      if (b.a == 'login') return res.json({ id: a.id, k: a.k });
      if (!hx(b.nph)) return res.status(400).json({ e: 'bad request' });
      a.h = h(b.nph);
      await R('/pipeline', [['SET', key, JSON.stringify(a)]]);
      return res.json({ ok: 1 });
    }
    res.status(400).json({ e: 'bad request' });
  } catch (e) {
    res.status(500).json({ e: 'server error' });
  }
};
