const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

// resource=menus   GET/POST/DELETE(?menuId=)
// resource=items   GET/POST/DELETE(?menuId=, ?itemId=)
// resource=votes   GET(?meetingPostId=)
// resource=vote    POST
// resource=confirm PUT
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { resource, menuId, itemId, meetingPostId } = req.query;

  // ── menus ──────────────────────────────────────────────────────────
  if (resource === 'menus') {
    if (req.method === 'GET') {
      const { rows } = await pool.query('SELECT * FROM tb_lunch_menu ORDER BY menu_id');
      return res.json(rows.map(r => ({
        menuId: r.menu_id, menuNm: r.menu_nm,
        menuLink: r.menu_addr || r.menu_link || null,  // 양쪽 컬럼 지원
        menuAddr: r.menu_addr || r.menu_link || null,
        useYn: 'Y',  // 삭제된 레코드는 DB에서 제거되므로 항상 Y
        regDt: r.reg_dt
      })));
    }
    if (req.method === 'POST') {
      if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
      const { menuNm, menuAddr, menuLink } = req.body || {};
      const addr = menuAddr || menuLink || null;
      if (!menuNm) return res.status(400).json({ error: '식당명을 입력하세요.' });
      const { rows } = await pool.query(
        'INSERT INTO tb_lunch_menu(menu_nm,menu_addr) VALUES($1,$2) RETURNING *',
        [menuNm, addr]
      );
      const r = rows[0];
      return res.status(201).json({ menuId: r.menu_id, menuNm: r.menu_nm, menuLink: r.menu_addr, menuAddr: r.menu_addr, useYn: 'Y', regDt: r.reg_dt });
    }
    if (req.method === 'DELETE') {
      if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
      if (!menuId) return res.status(400).json({ error: 'menuId 필요' });
      await pool.query('DELETE FROM tb_lunch_menu_item WHERE menu_id=$1', [menuId]);
      await pool.query('DELETE FROM tb_lunch_menu WHERE menu_id=$1', [menuId]);
      return res.status(204).end();
    }
    if (req.method === 'PUT') {
      if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
      if (!menuId) return res.status(400).json({ error: 'menuId 필요' });
      const { menuNm, menuAddr, menuLink } = req.body || {};
      const addr = menuAddr || menuLink || null;
      const { rows } = await pool.query(
        'UPDATE tb_lunch_menu SET menu_nm=$1, menu_addr=$2 WHERE menu_id=$3 RETURNING *',
        [menuNm, addr, menuId]
      );
      const r = rows[0];
      return res.json({ menuId: r.menu_id, menuNm: r.menu_nm, menuLink: r.menu_addr, menuAddr: r.menu_addr, useYn: 'Y', regDt: r.reg_dt });
    }
    return res.status(405).end();
  }

  // ── items ──────────────────────────────────────────────────────────
  if (resource === 'items') {
    if (req.method === 'GET') {
      if (!menuId) return res.status(400).json({ error: 'menuId 필요' });
      const { rows } = await pool.query(
        'SELECT * FROM tb_lunch_menu_item WHERE menu_id=$1 ORDER BY item_id', [menuId]
      );
      return res.json(rows.map(r => ({ itemId: r.item_id, menuId: r.menu_id, itemNm: r.item_nm })));
    }
    if (req.method === 'POST') {
      if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
      if (!menuId) return res.status(400).json({ error: 'menuId 필요' });
      const { itemNm } = req.body || {};
      if (!itemNm) return res.status(400).json({ error: '메뉴명을 입력하세요.' });
      const { rows } = await pool.query(
        'INSERT INTO tb_lunch_menu_item(menu_id,item_nm) VALUES($1,$2) RETURNING *',
        [menuId, itemNm.trim()]
      );
      const r = rows[0];
      return res.status(201).json({ itemId: r.item_id, menuId: r.menu_id, itemNm: r.item_nm });
    }
    if (req.method === 'DELETE') {
      if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
      if (!itemId) return res.status(400).json({ error: 'itemId 필요' });
      await pool.query('DELETE FROM tb_lunch_menu_item WHERE item_id=$1', [itemId]);
      return res.status(204).end();
    }
    return res.status(405).end();
  }

  // ── votes ──────────────────────────────────────────────────────────
  if (resource === 'votes') {
    if (req.method !== 'GET') return res.status(405).end();
    if (!meetingPostId) return res.status(400).json({ error: 'meetingPostId 필요' });
    const { rows: allVotes } = await pool.query(
      'SELECT * FROM tb_lunch_vote WHERE meeting_post_id=$1 ORDER BY vote_dt', [meetingPostId]
    );
    // 정산 여부
    const { rows: postRows } = await pool.query(
      'SELECT lunch_settled_yn FROM tb_post WHERE post_id=$1', [meetingPostId]
    );
    const settledYn = postRows[0] ? (postRows[0].lunch_settled_yn || 'N') : 'N';

    const grouped = {};
    allVotes.forEach(v => {
      const key = v.not_eating_yn === 'Y' ? 'NOT_EATING'
                : v.custom_yn === 'Y'     ? 'CUSTOM:' + v.menu_nm
                : String(v.menu_id);
      grouped[key] = (grouped[key] || 0) + 1;
    });
    const summary = Object.entries(grouped).map(([k, cnt]) => ({ key: k, count: cnt }));
    return res.json({
      summary,
      settledYn,
      allVotes: allVotes.map(r => ({
        voteId: r.vote_id, meetingPostId: r.meeting_post_id, menuId: r.menu_id,
        menuNm: r.menu_nm, userId: r.user_id, userNm: r.user_nm,
        notEatingYn: r.not_eating_yn, customYn: r.custom_yn, voteDt: r.vote_dt
      }))
    });
  }

  // ── vote ───────────────────────────────────────────────────────────
  if (resource === 'vote') {
    if (req.method !== 'POST') return res.status(405).end();
    if (!u) return res.status(401).end();
    const { meetingPostId: mpId, menuId: mId, customMenuNm, notEating } = req.body || {};
    if (!mpId) return res.status(400).json({ error: 'meetingPostId 필요' });
    const isNotEating = notEating === true || notEating === 'true';
    const isCustom    = !isNotEating && customMenuNm && customMenuNm.trim();
    let menuIdVal = null, menuNmVal = null, notEatingYn = 'N', customYn = 'N';
    if (isNotEating) {
      menuNmVal = '안먹음'; notEatingYn = 'Y';
    } else if (isCustom) {
      menuNmVal = customMenuNm.trim(); customYn = 'Y';
    } else {
      menuIdVal = mId;
      const { rows } = await pool.query('SELECT menu_nm FROM tb_lunch_menu WHERE menu_id=$1', [mId]);
      menuNmVal = rows[0] ? rows[0].menu_nm : null;
    }
    const { rows } = await pool.query(
      `INSERT INTO tb_lunch_vote(meeting_post_id,menu_id,menu_nm,user_id,user_nm,not_eating_yn,custom_yn)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(user_id,meeting_post_id) DO UPDATE
         SET menu_id=$2, menu_nm=$3, not_eating_yn=$6, custom_yn=$7, vote_dt=NOW()
       RETURNING *`,
      [mpId, menuIdVal, menuNmVal, u.userId, u.userNm, notEatingYn, customYn]
    );
    const r = rows[0];
    return res.json({
      voteId: r.vote_id, meetingPostId: r.meeting_post_id, menuId: r.menu_id,
      menuNm: r.menu_nm, userId: r.user_id, userNm: r.user_nm,
      notEatingYn: r.not_eating_yn, customYn: r.custom_yn, voteDt: r.vote_dt
    });
  }

  // ── settle (밥값 정산 여부 토글) ──────────────────────────────────
  if (resource === 'settle') {
    if (req.method !== 'PUT') return res.status(405).end();
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    const { meetingPostId: mpId, settledYn } = req.body || {};
    if (!mpId) return res.status(400).json({ error: 'meetingPostId 필요' });
    const { rows } = await pool.query(
      'UPDATE tb_post SET lunch_settled_yn=$1 WHERE post_id=$2 RETURNING lunch_settled_yn',
      [settledYn === 'Y' ? 'Y' : 'N', mpId]
    );
    if (!rows[0]) return res.status(404).end();
    return res.json({ settledYn: rows[0].lunch_settled_yn });
  }

  // ── confirm ────────────────────────────────────────────────────────
  if (resource === 'confirm') {
    if (req.method !== 'PUT') return res.status(405).end();
    if (!u || u.userRole !== 'ADMIN') return res.status(403).end();
    const { meetingPostId: mpId, menuNm, menuId: mId } = req.body || {};
    if (!mpId) return res.status(400).json({ error: 'meetingPostId 필요' });
    const { rows } = await pool.query(
      `UPDATE tb_post SET confirmed_lunch_nm=$1, confirmed_lunch_id=$2
       WHERE post_id=$3 RETURNING *`,
      [menuNm || null, mId || null, mpId]
    );
    if (!rows[0]) return res.status(404).end();
    const r = rows[0];
    return res.json({
      postId: r.post_id, confirmedLunchNm: r.confirmed_lunch_nm,
      confirmedLunchId: r.confirmed_lunch_id
    });
  }

  res.status(400).json({ error: 'resource 파라미터가 필요합니다.' });
};
