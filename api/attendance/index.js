const { getPool } = require('../../lib/db');
const { getUser } = require('../../lib/auth');
const cors        = require('../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();

  if (req.method === 'GET') {
    const { postId } = req.query;
    const q = postId
      ? 'SELECT * FROM tb_attendance WHERE post_id=$1 ORDER BY reg_dt'
      : 'SELECT * FROM tb_attendance ORDER BY reg_dt';
    const { rows } = await pool.query(q, postId ? [postId] : []);
    return res.json(rows.map(r => ({
      attId: r.att_id, postId: r.post_id, userId: r.user_id,
      userNm: r.user_nm, status: r.status, regDt: r.reg_dt
    })));
  }

  if (req.method === 'POST') {
    if (!u) return res.status(401).end();
    const { postId, status } = req.body || {};
    if (!postId || !status) return res.status(400).json({ error: '필수 항목 누락' });
    const { rows } = await pool.query(
      `INSERT INTO tb_attendance(post_id,user_id,user_nm,status)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(post_id,user_id) DO UPDATE SET status=$4, reg_dt=NOW()
       RETURNING *`,
      [postId, u.userId, u.userNm, status]
    );
    const r = rows[0];
    return res.json({ attId: r.att_id, postId: r.post_id, userId: r.user_id, userNm: r.user_nm, status: r.status, regDt: r.reg_dt });
  }

  res.status(405).end();
};
