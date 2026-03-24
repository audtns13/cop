const { getPool } = require('../../../lib/db');
const { getUser } = require('../../../lib/auth');
const cors        = require('../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u = getUser(req);
  if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
  if (req.method !== 'PUT') return res.status(405).end();

  const { id } = req.query;
  const { userRole } = req.body || {};
  if (!userRole) return res.status(400).json({ error: '권한을 입력하세요.' });

  const pool = getPool();
  await pool.query('UPDATE tb_user SET user_role=$1 WHERE user_id=$2', [userRole, id]);
  res.json({ message: '변경되었습니다.' });
};
