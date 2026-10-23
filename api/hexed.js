/**
 * POST /api/hexed — Emorce HEXED v4
 */
const { obfuscate } = require('../hexed_v4.js');

function parseBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => {
      const buf = Buffer.concat(chunks);
      const ct = (req.headers['content-type'] || '').toLowerCase();
      if (ct.includes('application/json')) {
        try {
          resolve(JSON.parse(buf.toString('utf8')));
        } catch (e) {
          reject(e);
        }
        return;
      }
      const text = buf.toString('utf8');
      const out = { script: '', pastefy: false };
      const fileM = text.match(
        /name="(?:file|script)"[^\r\n]*\r\n(?:Content-Type:[^\r\n]*\r\n)?\r\n([\s\S]*?)\r\n--/
      );
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
      body: JSON.stringify({
        type: 'PASTE',
        title: title || 'Emorce HEXED',
        content,
        visibility: 'UNLISTED',
        encrypted: false,
      }),
    });
    const data = await res.json();
    if (data && data.success && data.paste) {
      return {
        id: data.paste.id,
        url: `https://pastefy.app/${data.paste.id}`,
        raw: data.paste.raw_url || `https://pastefy.app/${data.paste.id}/raw`,
      };
    }
    return null;
  } catch (e) {
    return null;
  }
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Pastefy');

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

  try {
    const body = await parseBody(req);
    let script = (body && body.script) || '';
    if (typeof script !== 'string') script = String(script || '');
    script = script.trim();
    if (!script) {
      res.statusCode = 400;
      res.end(JSON.stringify({ error: 'empty script' }));
      return;
    }

    const wantPaste =
      !!(body && body.pastefy) ||
      String(req.headers['x-pastefy'] || '').trim() === '1';

    const result = obfuscate(script);
    const code = typeof result === 'string' ? result : result && result.code;
    const build = (result && result.build) || 'hexed-v4';

    if (!code) {
      res.statusCode = 500;
      res.end(JSON.stringify({ error: 'obfuscate returned empty' }));
      return;
    }

    const out = { code, build };
    if (wantPaste) {
      const paste = await uploadPastefy(code, 'Emorce HEXED v4');
      if (paste) out.pastefy = paste;
    }

    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(out));
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: String(e && e.message ? e.message : e) }));
  }
};
