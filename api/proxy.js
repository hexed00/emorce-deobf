/**
 * Emorce proxy → LeakD engines with DEMORCE key
 * Query: ?path=/detect|/luraph|/moonsec|/prometheus|/ironveil|...
 */
const UPSTREAMS = [
  'https://leakd.up.railway.app',
  'https://leakd-api.vercel.app',
];

const LEAKD_KEY = process.env.LEAKD_API_KEY || 'lkd_3W3nXSBFDx19hZh3NkpCSMLI';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Pastefy, Authorization');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }
  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.end(JSON.stringify({ error: 'POST only' }));
    return;
  }

  const u = new URL(req.url, 'http://localhost');
  let path = u.searchParams.get('path') || '/detect';
  if (!path.startsWith('/')) path = '/' + path;

  const chunks = [];
  for await (const c of req) chunks.push(c);
  const body = Buffer.concat(chunks);
  const ct = req.headers['content-type'] || 'application/octet-stream';

  let lastErr = null;
  for (const base of UPSTREAMS) {
    try {
      const r = await fetch(base + path, {
        method: 'POST',
        headers: {
          'content-type': ct,
          authorization: 'Bearer ' + LEAKD_KEY,
          'x-api-key': LEAKD_KEY,
        },
        body,
      });
      const text = await r.text();
      if (r.ok || (text && text.length > 2 && !/unauthorized|invalid.?key|forbidden/i.test(text))) {
        res.statusCode = r.status;
        res.setHeader('Content-Type', r.headers.get('content-type') || 'application/json');
        res.end(text);
        return;
      }
      lastErr = `upstream ${base} status ${r.status}: ${text.slice(0, 120)}`;
    } catch (e) {
      lastErr = e.message || String(e);
    }
  }

  res.statusCode = 502;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      error: 'all upstreams failed',
      detail: lastErr || 'unknown',
      tried: UPSTREAMS,
      path,
    })
  );
};
