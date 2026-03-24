const { getPool } = require('../../../../lib/db');
const { getUser } = require('../../../../lib/auth');
const cors        = require('../../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { menuId } = req.query;

  if (req.method === 'DELETE') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    await pool.query('DELETE FROM tb_lunch_menu_item WHERE menu_id=$1', [menuId]);
    await pool.query('DELETE FROM tb_lunch_menu WHERE menu_id=$1', [menuId]);
    return res.status(204).end();
  }

  res.status(405).end();
};
