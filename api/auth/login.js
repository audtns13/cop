const bcrypt    = require('bcryptjs');
const { getPool }   = require('../../lib/db');
const { signToken, setCookie } = require('../../lib/auth');
const cors      = require('../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, userPwd } = req.body || {};
  if (!userId || !userPwd) return res.status(400).json({ error: '아이디/비밀번호를 입력하세요.' });

  const pool = getPool();
  const { rows } = await pool.query('SELECT * FROM tb_user WHERE user_id=$1', [userId]);
  const user = rows[0];

  if (!user || !bcrypt.compareSync(userPwd, user.user_pwd)) {
    return res.status(401).json({ error: '사번 또는 비밀번호가 올바르지 않습니다.' });
  }

  const token = signToken({ userId: user.user_id, userNm: user.user_nm, userRole: user.user_role });
  setCookie(res, token);
  res.json({ userId: user.user_id, userNm: user.user_nm, userRole: user.user_role, regDt: user.reg_dt });
};
