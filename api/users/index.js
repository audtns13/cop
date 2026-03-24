const { getPool } = require('../../lib/db');
const { getUser } = require('../../lib/auth');
const cors        = require('../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: '로그인 필요' });

  const pool = getPool();
  const { rows } = await pool.query('SELECT user_id, user_nm, user_role, reg_dt FROM tb_user ORDER BY reg_dt');
  res.json(rows.map(r => ({ userId: r.user_id, userNm: r.user_nm, userRole: r.user_role, regDt: r.reg_dt })));
};
