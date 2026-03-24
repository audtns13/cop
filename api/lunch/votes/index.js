const { getPool } = require('../../../lib/db');
const { getUser } = require('../../../lib/auth');
const cors        = require('../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'GET') return res.status(405).end();

  const pool = getPool();
  const { meetingPostId } = req.query;
  if (!meetingPostId) return res.status(400).json({ error: 'meetingPostId 필요' });

  const { rows: allVotes } = await pool.query(
    'SELECT * FROM tb_lunch_vote WHERE meeting_post_id=$1 ORDER BY vote_dt', [meetingPostId]
  );

  const summary = [];
  const grouped = {};
  allVotes.forEach(v => {
    const key = v.not_eating_yn === 'Y' ? 'NOT_EATING'
              : v.custom_yn === 'Y'     ? 'CUSTOM:' + v.menu_nm
              : String(v.menu_id);
    grouped[key] = (grouped[key] || 0) + 1;
  });
  for (const [k, cnt] of Object.entries(grouped)) {
    summary.push({ key: k, count: cnt });
  }

  res.json({
    summary,
    allVotes: allVotes.map(r => ({
      voteId: r.vote_id, meetingPostId: r.meeting_post_id, menuId: r.menu_id,
      menuNm: r.menu_nm, userId: r.user_id, userNm: r.user_nm,
      notEatingYn: r.not_eating_yn, customYn: r.custom_yn, voteDt: r.vote_dt
    }))
  });
};
