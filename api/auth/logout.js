const { clearCookie } = require('../../lib/auth');
const cors = require('../../lib/cors');

module.exports = (req, res) => {
  if (cors(req, res)) return;
  clearCookie(res);
  res.json({ message: '로그아웃 되었습니다.' });
};
