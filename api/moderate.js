module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'content-type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ flagged: false });
  let b = req.body;
  if (typeof b === 'string') { try { b = JSON.parse(b) } catch (e) { b = {} } }
  b = b || {};
  let text = String(b.text || '').trim().slice(0, 2000);
  let key = process.env.OPENAI_API_KEY;
  if (!text || !key) return res.json({ flagged: false });
  try {
    let r = await fetch('https://api.openai.com/v1/moderations', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'omni-moderation-latest', input: text })
    });
    if (!r.ok) return res.json({ flagged: false });
    let j = await r.json();
    return res.json({ flagged: !!(j.results && j.results[0] && j.results[0].flagged) });
  } catch (e) {
    return res.json({ flagged: false });
  }
};
