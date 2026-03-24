const { getPool } = require('../../../lib/db');
const { getUser } = require('../../../lib/auth');
const cors        = require('../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u = getUser(req);
  if (!u || u.userRole !== 'ADMIN') return res.status(403).end();

  const { id } = req.query;
  const pool = getPool();

  if (req.method === 'DELETE') {
    await pool.query('DELETE FROM tb_user WHERE user_id=$1', [id]);
    return res.status(204).end();
  }
  res.status(405).end();
};
