const bcrypt        = require('bcryptjs');
const { getPool }   = require('../../lib/db');
const cors          = require('../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  const { userId, userNm, userPwd } = req.body || {};
  if (!userId || !userNm || !userPwd) return res.status(400).json({ error: '모든 항목을 입력하세요.' });

  const pool = getPool();
  const exists = await pool.query('SELECT 1 FROM tb_user WHERE user_id=$1', [userId]);
  if (exists.rows.length > 0) return res.status(400).json({ error: '이미 사용 중인 사번입니다.' });

  const hashed = bcrypt.hashSync(userPwd, 10);
  await pool.query(
    'INSERT INTO tb_user(user_id, user_nm, user_pwd, user_role) VALUES($1,$2,$3,$4)',
    [userId, userNm, hashed, 'USER']
  );
  res.json({ message: '가입이 완료되었습니다.' });
};
