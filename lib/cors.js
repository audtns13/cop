module.exports = function cors(req, res) {
  res.setHeader('Access-Control-Allow-Origin',      req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Methods',     'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers',     'Content-Type');
  if (req.method === 'OPTIONS') { res.status(200).end(); return true; }
  return false;
};
