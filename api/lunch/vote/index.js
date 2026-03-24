const { getPool } = require('../../../lib/db');
const { getUser } = require('../../../lib/auth');
const cors        = require('../../../lib/cors');

module.exports = async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return res.status(405).end();

  const u = getUser(req);
  if (!u) return res.status(401).end();

  const pool = getPool();
  const { meetingPostId, menuId, customMenuNm, notEating } = req.body || {};
  if (!meetingPostId) return res.status(400).json({ error: 'meetingPostId 필요' });

  const isNotEating = notEating === true || notEating === 'true';
  const isCustom    = !isNotEating && customMenuNm && customMenuNm.trim();

  let menuIdVal   = null;
  let menuNmVal   = null;
  let notEatingYn = 'N';
  let customYn    = 'N';

  if (isNotEating) {
    menuNmVal   = '안먹음';
    notEatingYn = 'Y';
  } else if (isCustom) {
    menuNmVal = customMenuNm.trim();
    customYn  = 'Y';
  } else {
    menuIdVal = menuId;
    const { rows } = await pool.query('SELECT menu_nm FROM tb_lunch_menu WHERE menu_id=$1', [menuId]);
    menuNmVal = rows[0] ? rows[0].menu_nm : null;
  }

  const { rows } = await pool.query(
    `INSERT INTO tb_lunch_vote(meeting_post_id,menu_id,menu_nm,user_id,user_nm,not_eating_yn,custom_yn)
     VALUES($1,$2,$3,$4,$5,$6,$7)
     ON CONFLICT(user_id,meeting_post_id) DO UPDATE
       SET menu_id=$2, menu_nm=$3, not_eating_yn=$6, custom_yn=$7, vote_dt=NOW()
     RETURNING *`,
    [meetingPostId, menuIdVal, menuNmVal, u.userId, u.userNm, notEatingYn, customYn]
  );
  const r = rows[0];
  res.json({
    voteId: r.vote_id, meetingPostId: r.meeting_post_id, menuId: r.menu_id,
    menuNm: r.menu_nm, userId: r.user_id, userNm: r.user_nm,
    notEatingYn: r.not_eating_yn, customYn: r.custom_yn, voteDt: r.vote_dt
  });
};
