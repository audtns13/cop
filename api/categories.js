const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

// GET    /api/categories          - 카테고리 목록
// POST   /api/categories          - 카테고리 추가 (ADMIN)
// DELETE /api/categories?id=xxx   - 카테고리 삭제 (ADMIN)
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { id } = req.query;

  // 목록 조회 (인증 불필요)
  if (req.method === 'GET') {
    const { rows } = await pool.query(
      'SELECT * FROM tb_board_category ORDER BY sort_ord, cat_id'
    );
    return res.json(rows.map(r => ({
      catId:   r.cat_id,
      catNm:   r.cat_nm,
      sortOrd: r.sort_ord,
      regDt:   r.reg_dt,
    })));
  }

  // 추가 (ADMIN 전용)
  if (req.method === 'POST') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    const { catNm, sortOrd } = req.body || {};
    if (!catNm || !catNm.trim()) return res.status(400).json({ error: '카테고리명을 입력하세요.' });
    const { rows } = await pool.query(
      'INSERT INTO tb_board_category(cat_nm, sort_ord) VALUES($1,$2) RETURNING *',
      [catNm.trim(), sortOrd ?? 0]
    );
    const r = rows[0];
    return res.status(201).json({ catId: r.cat_id, catNm: r.cat_nm, sortOrd: r.sort_ord, regDt: r.reg_dt });
  }

  // 삭제 (ADMIN 전용)
  if (req.method === 'DELETE') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    if (!id) return res.status(400).json({ error: 'id 필요' });
    await pool.query('DELETE FROM tb_board_category WHERE cat_id=$1', [id]);
    return res.status(204).end();
  }

  res.status(405).end();
};
