const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

// GET  /api/attendance?postId=xxx          - 특정 게시물 출결 목록
// GET  /api/attendance?action=stats        - 사용자별 출결 통계
// GET  /api/attendance?action=mine         - 내 postId→status 맵
// GET  /api/attendance?action=my           - 내 출결 요약
// POST /api/attendance                     - 출결 등록/수정
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { postId, action } = req.query;

  if (req.method === 'GET') {

    // ── 사용자별 출결 통계 ───────────────────────────────────────────
    if (action === 'stats') {
      // 전체 ACTIVITY 게시물 수
      const { rows: posts } = await pool.query(
        "SELECT post_id FROM tb_post WHERE post_type='ACTIVITY'"
      );
      const totalMeetings = posts.length;

      // 전체 회원 목록 (PENDING 제외)
      const { rows: users } = await pool.query(
        "SELECT user_id, user_nm, user_role FROM tb_user WHERE status='ACTIVE' OR status IS NULL ORDER BY user_nm"
      );

      // 전체 출결 데이터
      const { rows: atts } = await pool.query('SELECT * FROM tb_attendance');
      const attMap = {};
      atts.forEach(a => {
        if (!attMap[a.user_id]) attMap[a.user_id] = {};
        attMap[a.user_id][a.post_id] = a.status;
      });

      const stats = users.map(u => {
        const myAtts = attMap[u.user_id] || {};
        const attendCount = Object.values(myAtts).filter(s => s === 'Y').length;
        const attendRate = totalMeetings > 0 ? Math.round(attendCount / totalMeetings * 100) : 0;
        return { userId: u.user_id, userNm: u.user_nm, userRole: u.user_role,
                 attendCount, totalMeetings, attendRate };
      });
      return res.json(stats);
    }

    // ── 회차별 참석 집계 ────────────────────────────────────────────
    if (action === 'summary') {
      const { rows: userRows } = await pool.query('SELECT COUNT(*) as cnt FROM tb_user');
      const totalUsers = parseInt(userRows[0].cnt);
      const { rows } = await pool.query(
        "SELECT post_id, COUNT(*) FILTER (WHERE status='Y') as attend_count FROM tb_attendance GROUP BY post_id"
      );
      const attendMap = {};
      rows.forEach(r => { attendMap[r.post_id] = parseInt(r.attend_count); });
      return res.json({ totalUsers, attendMap });
    }

    // ── 내 postId→status 맵 ─────────────────────────────────────────
    if (action === 'mine') {
      if (!u) return res.json({});
      const { rows } = await pool.query(
        'SELECT post_id, status FROM tb_attendance WHERE user_id=$1', [u.userId]
      );
      const map = {};
      rows.forEach(r => { map[r.post_id] = r.status; });
      return res.json(map);
    }

    // ── 출결 통계 summary (PENDING 제외)
    if (action === 'summary') {
      const { rows: userRows } = await pool.query("SELECT COUNT(*) as cnt FROM tb_user WHERE status='ACTIVE' OR status IS NULL");
      const totalUsers = parseInt(userRows[0].cnt);
      const { rows } = await pool.query(
        "SELECT post_id, COUNT(*) FILTER (WHERE status='Y') as attend_count FROM tb_attendance GROUP BY post_id"
      );
      const attendMap = {};
      rows.forEach(r => { attendMap[r.post_id] = parseInt(r.attend_count); });
      return res.json({ totalUsers, attendMap });
    }

    // ── 내 출결 요약 ────────────────────────────────────────────────
    if (action === 'my') {
      if (!u) return res.json({ attendCount: 0, totalMeetings: 0, attendRate: 0 });
      const { rows: posts } = await pool.query(
        "SELECT post_id FROM tb_post WHERE post_type='ACTIVITY'"
      );
      const totalMeetings = posts.length;
      const { rows: myAtts } = await pool.query(
        "SELECT status FROM tb_attendance WHERE user_id=$1 AND status='Y'", [u.userId]
      );
      const attendCount = myAtts.length;
      const attendRate = totalMeetings > 0 ? Math.round(attendCount / totalMeetings * 100) : 0;
      return res.json({ attendCount, totalMeetings, attendRate });
    }

    // ── 특정 게시물 출결 목록 (탈퇴 회원 제외) ─────────────────────
    const q = postId
      ? `SELECT a.* FROM tb_attendance a
         INNER JOIN tb_user u ON a.user_id = u.user_id
         WHERE a.post_id=$1 AND (u.status='ACTIVE' OR u.status IS NULL)
         ORDER BY a.reg_dt`
      : `SELECT a.* FROM tb_attendance a
         INNER JOIN tb_user u ON a.user_id = u.user_id
         WHERE (u.status='ACTIVE' OR u.status IS NULL)
         ORDER BY a.reg_dt`;
    const { rows } = await pool.query(q, postId ? [postId] : []);
    return res.json(rows.map(r => ({
      attId: r.att_id, postId: r.post_id, userId: r.user_id,
      userNm: r.user_nm, status: r.status, regDt: r.reg_dt
    })));
  }

  if (req.method === 'POST') {
    if (!u) return res.status(401).end();
    const { postId: pid, status } = req.body || {};
    if (!pid || !status) return res.status(400).json({ error: '필수 항목 누락' });
    const { rows } = await pool.query(
      `INSERT INTO tb_attendance(post_id,user_id,user_nm,status)
       VALUES($1,$2,$3,$4)
       ON CONFLICT(post_id,user_id) DO UPDATE SET status=$4, reg_dt=NOW()
       RETURNING *`,
      [pid, u.userId, u.userNm, status]
    );
    const r = rows[0];
    return res.json({ attId: r.att_id, postId: r.post_id, userId: r.user_id, userNm: r.user_nm, status: r.status, regDt: r.reg_dt });
  }

  res.status(405).end();
};
