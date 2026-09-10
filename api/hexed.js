const { obfuscate } = require('../hexed.js');

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'POST only' });

  try {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    const body = Buffer.concat(chunks);
    const ct = req.headers['content-type'] || '';

    let source = '';
    if (ct.includes('multipart/form-data')) {
      const s = body.toString('binary');
      const m = s.match(/\r\n\r\n([\s\S]*?)\r\n--/);
      if (m) source = Buffer.from(m[1], 'binary').toString('utf8');
      else source = body.toString('utf8');
    } else if (ct.includes('application/json')) {
      const j = JSON.parse(body.toString('utf8'));
      source = j.code || j.source || j.script || '';
    } else {
      source = body.toString('utf8');
    }
    source = source.replace(/^\uFEFF/, '').trim();
    if (!source) return res.status(400).json({ success: false, error: 'empty source' });

    const code = obfuscate(source);
    return res.status(200).json({
      success: true,
      code,
      message: 'Emorce HEXED complete',
      file: {
        input_size_kb: +(Buffer.byteLength(source) / 1024).toFixed(2),
        output_size_kb: +(Buffer.byteLength(code) / 1024).toFixed(2)
      }
    });
  } catch (e) {
    return res.status(500).json({ success: false, error: String(e && e.message || e) });
  }
};
