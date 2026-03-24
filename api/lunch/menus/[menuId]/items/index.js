const { getPool } = require('../../../../../lib/db');
const { getUser } = require('../../../../../lib/auth');
const cors        = require('../../../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { menuId } = req.query;

  if (req.method === 'GET') {
    const { rows } = await pool.query(
      'SELECT * FROM tb_lunch_menu_item WHERE menu_id=$1 ORDER BY item_id', [menuId]
    );
    return res.json(rows.map(r => ({ itemId: r.item_id, menuId: r.menu_id, itemNm: r.item_nm })));
  }

  if (req.method === 'POST') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    const { itemNm } = req.body || {};
    if (!itemNm) return res.status(400).json({ error: '메뉴명을 입력하세요.' });
    const { rows } = await pool.query(
      'INSERT INTO tb_lunch_menu_item(menu_id,item_nm) VALUES($1,$2) RETURNING *',
      [menuId, itemNm.trim()]
    );
    const r = rows[0];
    return res.status(201).json({ itemId: r.item_id, menuId: r.menu_id, itemNm: r.item_nm });
  }

  res.status(405).end();
};
