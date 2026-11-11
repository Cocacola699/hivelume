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
    let hit = j.results && j.results[0] || {};
    let cat = hit.categories || {}, score = hit.category_scores || {};
    let severe = !!(cat['illicit/violent'] || cat['violence/graphic'] || cat['sexual/minors'] || cat['harassment/threatening'] || cat['hate/threatening'] || (cat.violence && (score.violence || 0) >= 0.4) || (cat.illicit && (score.illicit || 0) >= 0.7));
    let top = Math.max(score['illicit/violent'] || 0, score['violence/graphic'] || 0, score['sexual/minors'] || 0, score['harassment/threatening'] || 0, score['hate/threatening'] || 0, cat.violence ? (score.violence || 0) : 0, cat.illicit ? (score.illicit || 0) : 0);
    let days = severe ? Math.min(5, Math.max(1, Math.ceil(top * 5))) : 0;
    return res.json({ flagged: !!hit.flagged, days });
  } catch (e) {
    return res.json({ flagged: false });
  }
};
