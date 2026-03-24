const { getPool } = require('../../lib/db');
const { getUser } = require('../../lib/auth');
const cors        = require('../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: '로그인 필요' });

  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM tb_user WHERE user_id=$1', [u.userId]);
  if (!rows[0]) return res.status(401).json({ error: '사용자 없음' });
  const user = rows[0];
  res.json({ userId: user.user_id, userNm: user.user_nm, userRole: user.user_role, regDt: user.reg_dt });
};
