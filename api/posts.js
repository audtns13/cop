const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

function toPost(r) {
  return {
    postId: r.post_id, postType: r.post_type, title: r.title, content: r.content,
    writerId: r.writer_id, writerNm: r.writer_nm, meetingDt: r.meeting_dt,
    viewCnt: r.view_cnt, confirmedLunchNm: r.confirmed_lunch_nm,
    confirmedLunchId: r.confirmed_lunch_id, regDt: r.reg_dt, modDt: r.mod_dt
  };
}

// GET    /api/posts           - 목록 (?type=)
// POST   /api/posts           - 생성
// GET    /api/posts?id=xxx    - 단건
// PUT    /api/posts?id=xxx    - 수정
// DELETE /api/posts?id=xxx   - 삭제 (ADMIN)
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { id, type } = req.query;

  if (req.method === 'GET') {
    // 공지 팝업 (?popup=1)
    if (req.query.popup) {
      const { rows } = await pool.query(
        "SELECT * FROM tb_post WHERE post_type='NOTICE' ORDER BY reg_dt DESC LIMIT 1"
      );
      return res.json(rows[0] ? toPost(rows[0]) : null);
    }
    if (id) {
      await pool.query('UPDATE tb_post SET view_cnt=view_cnt+1 WHERE post_id=$1', [id]);
      const { rows } = await pool.query('SELECT * FROM tb_post WHERE post_id=$1', [id]);
      if (!rows[0]) return res.status(404).end();
      return res.json(toPost(rows[0]));
    }
    const q = type
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

  if (req.method === 'PUT') {
    if (!u) return res.status(401).end();
    if (!id) return res.status(400).json({ error: 'id 필요' });
    const { title, content, meetingDt } = req.body || {};
    const { rows } = await pool.query(
      'UPDATE tb_post SET title=$1,content=$2,meeting_dt=$3,mod_dt=NOW() WHERE post_id=$4 RETURNING *',
      [title, content, meetingDt || null, id]
    );
    return res.json(toPost(rows[0]));
  }

  if (req.method === 'DELETE') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    if (!id) return res.status(400).json({ error: 'id 필요' });
    await pool.query('DELETE FROM tb_post WHERE post_id=$1', [id]);
    return res.status(204).end();
  }

  res.status(405).end();
};
