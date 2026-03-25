const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const pool = getPool();

  if (req.method === 'GET') {
    const { postId } = req.query;
    const q = postId
      ? 'SELECT file_id,post_id,orig_nm,file_size,reg_dt FROM tb_file_info WHERE post_id=$1'
      : 'SELECT file_id,post_id,orig_nm,file_size,reg_dt FROM tb_file_info';
    const { rows } = await pool.query(q, postId ? [postId] : []);
    return res.json(rows.map(r => ({
      fileId: r.file_id, postId: r.post_id, origNm: r.orig_nm,
      fileSize: r.file_size, regDt: r.reg_dt
    })));
  }

  res.status(501).json({ error: '파일 업로드는 추후 지원 예정입니다.' });
};
