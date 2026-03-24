const { getPool } = require('../../lib/db');
const { getUser } = require('../../lib/auth');
const cors        = require('../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();

  if (req.method === 'GET') {
    const type = req.query.type || null;
    const q    = type
      ? 'SELECT * FROM tb_post WHERE post_type=$1 ORDER BY reg_dt DESC'
      : 'SELECT * FROM tb_post ORDER BY reg_dt DESC';
    const { rows } = await pool.query(q, type ? [type] : []);
    return res.json(rows.map(toPost));
  }

  if (req.method === 'POST') {
    if (!u) return res.status(401).json({ error: '로그인 필요' });
    const { postType, title, content, meetingDt } = req.body || {};
    if (!postType || !title) return res.status(400).json({ error: '필수 항목 누락' });
    const { rows } = await pool.query(
      `INSERT INTO tb_post(post_type,title,content,writer_id,writer_nm,meeting_dt)
       VALUES($1,$2,$3,$4,$5,$6) RETURNING *`,
      [postType, title, content || '', u.userId, u.userNm, meetingDt || null]
    );
    return res.status(201).json(toPost(rows[0]));
  }

  res.status(405).end();
};

function toPost(r) {
  return {
    postId: r.post_id, postType: r.post_type, title: r.title, content: r.content,
    writerId: r.writer_id, writerNm: r.writer_nm, meetingDt: r.meeting_dt,
    viewCnt: r.view_cnt, confirmedLunchNm: r.confirmed_lunch_nm,
    confirmedLunchId: r.confirmed_lunch_id, regDt: r.reg_dt, modDt: r.mod_dt
  };
}
