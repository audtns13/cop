const { getPool } = require('../../../lib/db');
const { getUser } = require('../../../lib/auth');
const cors        = require('../../../lib/cors');

function toPost(r) {
  return {
    postId: r.post_id, postType: r.post_type, title: r.title, content: r.content,
    writerId: r.writer_id, writerNm: r.writer_nm, meetingDt: r.meeting_dt,
    viewCnt: r.view_cnt, confirmedLunchNm: r.confirmed_lunch_nm,
    confirmedLunchId: r.confirmed_lunch_id, regDt: r.reg_dt, modDt: r.mod_dt
  };
}

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { id } = req.query;

  if (req.method === 'GET') {
    await pool.query('UPDATE tb_post SET view_cnt=view_cnt+1 WHERE post_id=$1', [id]);
    const { rows } = await pool.query('SELECT * FROM tb_post WHERE post_id=$1', [id]);
    if (!rows[0]) return res.status(404).end();
    return res.json(toPost(rows[0]));
  }

  if (req.method === 'PUT') {
    if (!u) return res.status(401).end();
    const { title, content, meetingDt } = req.body || {};
    const { rows } = await pool.query(
      'UPDATE tb_post SET title=$1,content=$2,meeting_dt=$3,mod_dt=NOW() WHERE post_id=$4 RETURNING *',
      [title, content, meetingDt || null, id]
    );
    return res.json(toPost(rows[0]));
  }

  if (req.method === 'DELETE') {
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    await pool.query('DELETE FROM tb_post WHERE post_id=$1', [id]);
    return res.status(204).end();
  }

  res.status(405).end();
};
