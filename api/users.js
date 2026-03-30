const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

// GET  /api/users              - 목록
// DELETE /api/users?id=xxx     - 삭제 (ADMIN)
// PUT  /api/users?id=xxx&action=role - 권한변경 (ADMIN)
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { id, action } = req.query;

  if (req.method === 'GET') {
    if (!u) return res.status(401).json({ error: '로그인 필요' });
    const { rows } = await pool.query('SELECT user_id, user_nm, user_role, status, reg_dt FROM tb_user ORDER BY reg_dt');
    return res.json(rows.map(r => ({ userId: r.user_id, userNm: r.user_nm, userRole: r.user_role, status: r.status || 'ACTIVE', regDt: r.reg_dt })));
  }

  if (req.method === 'DELETE') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    if (!id) return res.status(400).json({ error: 'id 필요' });
    await pool.query('DELETE FROM tb_user WHERE user_id=$1', [id]);
    return res.status(204).end();
  }

  if (req.method === 'PUT' && action === 'role') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    if (!id) return res.status(400).json({ error: 'id 필요' });
    const { userRole } = req.body || {};
    if (!userRole) return res.status(400).json({ error: '권한을 입력하세요.' });
    await pool.query('UPDATE tb_user SET user_role=$1 WHERE user_id=$2', [userRole, id]);
    return res.json({ message: '변경되었습니다.' });
  }

  if (req.method === 'PUT' && action === 'approve') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    if (!id) return res.status(400).json({ error: 'id 필요' });
    await pool.query("UPDATE tb_user SET status='ACTIVE' WHERE user_id=$1", [id]);
    return res.json({ message: '승인되었습니다.' });
  }

  res.status(405).end();
};
