const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

// GET  /api/files?postId=xxx        - 파일 목록
// GET  /api/files?fileId=xxx        - 파일 다운로드
// POST /api/files                   - 파일 업로드 (base64 JSON)
// DELETE /api/files?fileId=xxx      - 파일 삭제
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { postId, fileId } = req.query;

  if (req.method === 'GET') {
    // 단일 파일 다운로드
    if (fileId) {
      const { rows } = await pool.query(
        'SELECT orig_nm, file_size, file_data FROM tb_file_info WHERE file_id=$1', [fileId]
      );
      if (!rows[0]) return res.status(404).json({ error: '파일 없음' });
      return res.json({ origNm: rows[0].orig_nm, fileSize: rows[0].file_size, fileData: rows[0].file_data });
    }
    // 파일 목록
    const q = postId
      ? 'SELECT file_id,post_id,orig_nm,file_size,reg_dt FROM tb_file_info WHERE post_id=$1'
      : 'SELECT file_id,post_id,orig_nm,file_size,reg_dt FROM tb_file_info';
    const { rows } = await pool.query(q, postId ? [postId] : []);
    return res.json(rows.map(r => ({
      fileId: r.file_id, postId: r.post_id, origNm: r.orig_nm,
      fileSize: r.file_size, regDt: r.reg_dt
    })));
  }

  if (req.method === 'POST') {
    if (!u) return res.status(401).json({ error: '로그인 필요' });
    const { postId: pid, origNm, fileSize, fileData } = req.body || {};
    if (!pid || !origNm || !fileData) return res.status(400).json({ error: '필수 항목 누락' });
    const { rows } = await pool.query(
      'INSERT INTO tb_file_info(post_id, orig_nm, file_size, file_data) VALUES($1,$2,$3,$4) RETURNING file_id',
      [pid, origNm, fileSize || 0, fileData]
    );
    return res.json({ fileId: rows[0].file_id });
  }

  if (req.method === 'DELETE') {
    if (!u) return res.status(401).json({ error: '로그인 필요' });
    if (!fileId) return res.status(400).json({ error: 'fileId 필요' });
    await pool.query('DELETE FROM tb_file_info WHERE file_id=$1', [fileId]);
    return res.status(204).end();
  }

  res.status(405).end();
};
