/** Emorce HEXED v4 API - temporary bootstrap; full engine in next commit */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  if (req.method === 'OPTIONS') { res.statusCode = 204; res.end(); return; }
  res.statusCode = 503;
  res.end(JSON.stringify({ error: 'HEXED v4 deploying - hard refresh in 30s' }));
};
