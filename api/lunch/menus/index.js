const { getPool } = require('../../../lib/db');
const { getUser } = require('../../../lib/auth');
const cors        = require('../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();

  if (req.method === 'GET') {
    const { rows } = await pool.query('SELECT * FROM tb_lunch_menu ORDER BY menu_id');
    return res.json(rows.map(r => ({ menuId: r.menu_id, menuNm: r.menu_nm, menuAddr: r.menu_addr, regDt: r.reg_dt })));
  }

  if (req.method === 'POST') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    const { menuNm, menuAddr } = req.body || {};
    if (!menuNm) return res.status(400).json({ error: '식당명을 입력하세요.' });
    const { rows } = await pool.query(
      'INSERT INTO tb_lunch_menu(menu_nm,menu_addr) VALUES($1,$2) RETURNING *',
      [menuNm, menuAddr || null]
    );
    const r = rows[0];
    return res.status(201).json({ menuId: r.menu_id, menuNm: r.menu_nm, menuAddr: r.menu_addr, regDt: r.reg_dt });
  }

  res.status(405).end();
};
