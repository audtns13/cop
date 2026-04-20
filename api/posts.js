const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

// 행(row) → 클라이언트 응답 객체 변환
function toPost(r) {
  return {
    postId:           r.post_id,
    postType:         r.post_type,
    title:            r.title,
    content:          r.content,
    writerId:         r.writer_id,
    writerNm:         r.writer_nm,
    meetingDt:        r.meeting_dt,
    viewCnt:          r.view_cnt || 0,
    confirmedLunchNm: r.confirmed_lunch_nm,
    confirmedLunchId: r.confirmed_lunch_id,
    regDt:            r.reg_dt,
    modDt:            r.mod_dt,
    commentCount:     parseInt(r.comment_count || 0, 10),
    fileCount:        parseInt(r.file_count    || 0, 10),
    // files: JSON 배열(문자열) 또는 배열 객체 → 항상 배열로 변환
    files:            r.files ? (typeof r.files === 'string' ? JSON.parse(r.files) : r.files) : [],
    // 공지사항 필드
    noticeYn:         r.notice_yn       || 'N',
    noticeStartDt:    r.notice_start_dt || null,
    noticeEndDt:      r.notice_end_dt   || null,
    // 카테고리
    category:         r.category        || null,
  };
}

// GET    /api/posts            - 목록 (?type=)
// GET    /api/posts?id=xxx     - 단건 (조회수 +1)
// GET    /api/posts?popup=1    - 유효한 공지 팝업
// POST   /api/posts            - 생성
// PUT    /api/posts?id=xxx     - 수정 (본인)
// DELETE /api/posts?id=xxx     - 삭제 (본인 또는 ADMIN)
module.exports = async (req, res) => {
  if (cors(req, res)) return;
  const u    = getUser(req);
  const pool = getPool();
  const { id, type } = req.query;

  // ── GET ──────────────────────────────────────────────────────────────────
  if (req.method === 'GET') {

    // 공지 팝업: 유효 기간 내 FREE 공지 최신 1건 (파일 목록 포함)
    if (req.query.popup) {
      const { rows } = await pool.query(
        `SELECT p.*,
           (SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
             'fileId',f.file_id,'origNm',f.orig_nm,'fileSize',f.file_size,'regDt',f.reg_dt
           ) ORDER BY f.reg_dt), '[]'::json)
           FROM tb_file_info f WHERE f.post_id=p.post_id) AS files
         FROM tb_post p
         WHERE post_type='FREE' AND notice_yn='Y'
           AND (notice_start_dt IS NULL OR notice_start_dt <= NOW())
           AND (notice_end_dt   IS NULL OR notice_end_dt   >= NOW())
         ORDER BY reg_dt DESC LIMIT 1`
      );
      return res.json(rows[0] ? toPost(rows[0]) : null);
    }

    // 단건 조회 (조회수 증가 + 파일 목록 포함)
    if (id) {
      await pool.query('UPDATE tb_post SET view_cnt=view_cnt+1 WHERE post_id=$1', [id]);
      const { rows } = await pool.query(
        `SELECT p.*,
           (SELECT COUNT(*)
            FROM tb_comment c WHERE c.post_id=p.post_id) AS comment_count,
           (SELECT COUNT(*)
            FROM tb_file_info f WHERE f.post_id=p.post_id) AS file_count,
           (SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
             'fileId',f.file_id, 'origNm',f.orig_nm, 'fileSize',f.file_size, 'regDt',f.reg_dt
           ) ORDER BY f.reg_dt), '[]'::json)
            FROM tb_file_info f WHERE f.post_id=p.post_id) AS files
         FROM tb_post p WHERE p.post_id=$1`, [id]
      );
      if (!rows[0]) return res.status(404).end();
      return res.json(toPost(rows[0]));
    }

    // 목록 조회
    let q, params = [];
    if (type === 'FREE') {
      // 유효 공지글 상단 고정(최대 3개), 나머지 최신순
      q = `SELECT p.*,
             (SELECT COUNT(*) FROM tb_comment  c WHERE c.post_id=p.post_id) AS comment_count,
             (SELECT COUNT(*) FROM tb_file_info f WHERE f.post_id=p.post_id) AS file_count
           FROM tb_post p WHERE p.post_type='FREE'
           ORDER BY
             CASE WHEN p.notice_yn='Y'
                   AND (p.notice_end_dt IS NULL OR p.notice_end_dt >= NOW()) THEN 0 ELSE 1 END,
             p.reg_dt DESC`;
    } else if (type) {
      // ACTIVITY 등: 파일 목록 포함
      q = `SELECT p.*,
             (SELECT COUNT(*) FROM tb_comment  c WHERE c.post_id=p.post_id) AS comment_count,
             (SELECT COUNT(*) FROM tb_file_info f WHERE f.post_id=p.post_id) AS file_count,
             (SELECT COALESCE(JSON_AGG(JSON_BUILD_OBJECT(
               'fileId',f.file_id, 'origNm',f.orig_nm, 'fileSize',f.file_size
             ) ORDER BY f.reg_dt), '[]'::json)
              FROM tb_file_info f WHERE f.post_id=p.post_id) AS files
           FROM tb_post p WHERE p.post_type=$1 ORDER BY p.reg_dt DESC`;
      params = [type];
    } else {
      q = `SELECT p.*,
             (SELECT COUNT(*) FROM tb_comment  c WHERE c.post_id=p.post_id) AS comment_count,
             (SELECT COUNT(*) FROM tb_file_info f WHERE f.post_id=p.post_id) AS file_count
           FROM tb_post p ORDER BY p.reg_dt DESC`;
    }
    const { rows } = await pool.query(q, params);
    return res.json(rows.map(toPost));
  }

  // ── POST (생성) ───────────────────────────────────────────────────────────
  if (req.method === 'POST') {
    if (!u) return res.status(401).json({ error: '로그인 필요' });
    const { postType, title, content, meetingDt, noticeYn, noticeStartDt, noticeEndDt, category } = req.body || {};
    if (!postType || !title) return res.status(400).json({ error: '필수 항목 누락' });
    // 공지 설정은 ADMIN만 가능
    const nYn = (u.userRole === 'ADMIN' && noticeYn === 'Y') ? 'Y' : 'N';
    const { rows } = await pool.query(
      `INSERT INTO tb_post
         (post_type, title, content, writer_id, writer_nm, meeting_dt,
          notice_yn, notice_start_dt, notice_end_dt, category)
       VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *`,
      [postType, title, content || '', u.userId, u.userNm, meetingDt || null,
       nYn,
       nYn === 'Y' ? (noticeStartDt || null) : null,
       nYn === 'Y' ? (noticeEndDt   || null) : null,
       category || null]
    );
    return res.status(201).json(toPost(rows[0]));
  }

  // ── PUT (수정) ────────────────────────────────────────────────────────────
  if (req.method === 'PUT') {
    if (!u) return res.status(401).end();
    if (!id) return res.status(400).json({ error: 'id 필요' });
    const { title, content, meetingDt, noticeYn, noticeStartDt, noticeEndDt, category } = req.body || {};
    const nYn = (u.userRole === 'ADMIN' && noticeYn === 'Y') ? 'Y' : 'N';
    const { rows } = await pool.query(
      `UPDATE tb_post
       SET title=$1, content=$2, meeting_dt=$3, mod_dt=NOW(),
           notice_yn=$4, notice_start_dt=$5, notice_end_dt=$6, category=$7
       WHERE post_id=$8 RETURNING *`,
      [title, content, meetingDt || null,
       nYn,
       nYn === 'Y' ? (noticeStartDt || null) : null,
       nYn === 'Y' ? (noticeEndDt   || null) : null,
       category || null,
       id]
    );
    return res.json(toPost(rows[0]));
  }

  // ── DELETE ────────────────────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (!u) return res.status(401).end();
    if (!id) return res.status(400).json({ error: 'id 필요' });
    // 본인 게시글이거나 ADMIN이면 삭제 가능
    const { rows: check } = await pool.query(
      'SELECT writer_id FROM tb_post WHERE post_id=$1', [id]
    );
    if (!check[0]) return res.status(404).end();
    if (check[0].writer_id !== u.userId && u.userRole !== 'ADMIN') {
      return res.status(403).end();
    }
    await pool.query('DELETE FROM tb_post WHERE post_id=$1', [id]);
    return res.status(204).end();
  }

  res.status(405).end();
};
