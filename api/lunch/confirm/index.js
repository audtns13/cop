const { getPool } = require('../../../lib/db');
const { getUser } = require('../../../lib/auth');
const cors        = require('../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'PUT') return res.status(405).end();

  const u = getUser(req);
  if (!u || u.userRole !== 'ADMIN') return res.status(403).end();

  const pool = getPool();
  const { meetingPostId, menuNm, menuId } = req.body || {};
  if (!meetingPostId) return res.status(400).json({ error: 'meetingPostId 필요' });

  const { rows } = await pool.query(
    `UPDATE tb_post SET confirmed_lunch_nm=$1, confirmed_lunch_id=$2
     WHERE post_id=$3 RETURNING *`,
    [menuNm || null, menuId || null, meetingPostId]
  );
  if (!rows[0]) return res.status(404).end();
  const r = rows[0];
  res.json({
    postId: r.post_id, confirmedLunchNm: r.confirmed_lunch_nm,
    confirmedLunchId: r.confirmed_lunch_id
  });
};
