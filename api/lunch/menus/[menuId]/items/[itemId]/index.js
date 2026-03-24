const { getPool } = require('../../../../../../lib/db');
const { getUser } = require('../../../../../../lib/auth');
const cors        = require('../../../../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { itemId } = req.query;

  if (req.method === 'DELETE') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    await pool.query('DELETE FROM tb_lunch_menu_item WHERE item_id=$1', [itemId]);
    return res.status(204).end();
  }

  res.status(405).end();
};
