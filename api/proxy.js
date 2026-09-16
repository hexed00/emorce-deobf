/**
 * Proxy to LeakD-style backends. Path query: ?path=/detect|/moonsec|...
 */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'POST only' })); return; }

  const u = new URL(req.url, 'http://localhost');
  const path = u.searchParams.get('path') || '/detect';
  const upstream = 'https://leakd-api.vercel.app' + (path.startsWith('/') ? path : '/' + path);

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);

  try {
    const r = await fetch(upstream, {
      method: 'POST',
      headers: {
        'content-type': req.headers['content-type'] || 'application/octet-stream',
      },
      body,
    });
    const text = await r.text();
    res.statusCode = r.status;
    res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
    res.end(text);
  } catch (e) {
    res.statusCode = 502;
    res.end(JSON.stringify({ error: 'proxy failed: ' + (e.message || e) }));
  }
};
