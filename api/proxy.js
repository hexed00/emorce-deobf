module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'POST only' });
  }

  const path = (req.query && req.query.path) || '/detect';
  const target = 'https://leakd.up.railway.app' + (String(path).startsWith('/') ? path : '/' + path);

  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const body = Buffer.concat(chunks);
    const ct = req.headers['content-type'] || 'application/octet-stream';

    const upstream = await fetch(target, {
      method: 'POST',
      headers: { 'content-type': ct },
      body,
    });

    const text = await upstream.text();
    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers.get('content-type') || 'application/json');
    return res.send(text);
  } catch (e) {
    return res.status(502).json({ success: false, error: String(e) });
  }
};
