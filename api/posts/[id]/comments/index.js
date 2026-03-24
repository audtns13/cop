const { getPool } = require('../../../../lib/db');
const { getUser } = require('../../../../lib/auth');
const cors        = require('../../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { id } = req.query;   // post id

  if (req.method === 'GET') {
    const { rows } = await pool.query(
      'SELECT * FROM tb_comment WHERE post_id=$1 ORDER BY reg_dt', [id]
    );
    return res.json(rows.map(r => ({
      commentId: r.comment_id, postId: r.post_id, content: r.content,
      writerId: r.writer_id, writerNm: r.writer_nm, regDt: r.reg_dt
    })));
  }

  if (req.method === 'POST') {
    if (!u) return res.status(401).end();
    const { content } = req.body || {};
    if (!content) return res.status(400).json({ error: '내용을 입력하세요.' });
    const { rows } = await pool.query(
      'INSERT INTO tb_comment(post_id,content,writer_id,writer_nm) VALUES($1,$2,$3,$4) RETURNING *',
      [id, content, u.userId, u.userNm]
    );
    const r = rows[0];
    return res.status(201).json({
      commentId: r.comment_id, postId: r.post_id, content: r.content,
      writerId: r.writer_id, writerNm: r.writer_nm, regDt: r.reg_dt
    });
  }

  if (req.method === 'DELETE') {
    const { commentId } = req.query;
    if (!u) return res.status(401).end();
    await pool.query('DELETE FROM tb_comment WHERE comment_id=$1', [commentId]);
    return res.status(204).end();
  }

  res.status(405).end();
};
