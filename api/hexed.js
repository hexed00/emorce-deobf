/**
 * Vercel serverless: POST /api/hexed
 */
const { obfuscate } = require('../hexed_v3.js');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        try { resolve(JSON.parse(buf.toString('utf8'))); } catch (e) { reject(e); }
        return;
      }
      const text = buf.toString('utf8');
      const out = { script: '', pastefy: false };
      const fileM = text.match(/name="(?:file|script)"[^\r\n]*\r\n(?:Content-Type:[^\r\n]*\r\n)?\r\n([\s\S]*?)\r\n--/);
      if (fileM) out.script = fileM[1];
      else out.script = text;
      if (/name="pastefy"[\s\S]*?\r\n\r\n\s*(true|1)/i.test(text)) out.pastefy = true;
      resolve(out);
    });
    req.on('error', reject);
  });
}

async function uploadPastefy(content, title) {
  try {
    const res = await fetch('https://pastefy.app/api/v2/paste', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ type: 'PASTE', title: title || 'Emorce HEXED', content, visibility: 'UNLISTED', encrypted: false }),
    });
    const data = await res.json();
    if (data && data.success && data.paste) {
      return { id: data.paste.id, url: `https://pastefy.app/${data.paste.id}`, raw: data.paste.raw_url || `https://pastefy.app/${data.paste.id}/raw` };
    }
    return null;
  } catch (e) { return null; }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  if (req.method !== 'POST') { res.statusCode = 405; res.end(JSON.stringify({ error: 'POST only' })); return; }
  try {
    const body = await parseBody(req);
    const script = body.script || body.code || body.source || '';
    if (!String(script).trim()) { res.statusCode = 400; res.end(JSON.stringify({ error: 'empty script' })); return; }
    const code = obfuscate(script);
    const buildMatch = code.match(/build ([a-f0-9]+)/i);
    const build = buildMatch ? buildMatch[1] : 'unknown';
    const wantPaste = body.pastefy === true || body.pastefy === '1' || body.pastefy === 'true' || req.headers['x-pastefy'] === '1';
    let pastefy = null;
    if (wantPaste) pastefy = await uploadPastefy(code, `Emorce HEXED ${build}`);
    res.setHeader('Content-Type', 'application/json');
    res.statusCode = 200;
    res.end(JSON.stringify({ code, obfuscated_code: code, build, pastefy }));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(e.message || e) }));
  }
};
