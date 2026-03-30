const bcrypt           = require('bcryptjs');
const { getPool }      = require('../lib/db');
const { signToken, setCookie, clearCookie, getUser } = require('../lib/auth');
const cors             = require('../lib/cors');

// POST /api/auth?action=login|register|logout  GET /api/auth?action=me
module.exports = async (req, res) => {
  if (cors(req, res)) return;

  const action = req.query.action;
  const pool   = getPool();

  // ── login ──────────────────────────────────────────────────────────
  if (action === 'login') {
    if (req.method !== 'POST') return res.status(405).end();
    const { userId, userPwd } = req.body || {};
    if (!userId || !userPwd) return res.status(400).json({ error: '아이디/비밀번호를 입력하세요.' });
    const { rows } = await pool.query('SELECT * FROM tb_user WHERE user_id=$1', [userId]);
    const user = rows[0];
    if (!user || !bcrypt.compareSync(userPwd, user.user_pwd))
      return res.status(401).json({ error: '사번 또는 비밀번호가 올바르지 않습니다.' });
    if (user.status === 'PENDING')
      return res.status(403).json({ error: 'PENDING' });
    const token = signToken({ userId: user.user_id, userNm: user.user_nm, userRole: user.user_role });
    setCookie(res, token);
    return res.json({ userId: user.user_id, userNm: user.user_nm, userRole: user.user_role, regDt: user.reg_dt });
  }

  // ── register ───────────────────────────────────────────────────────
  if (action === 'register') {
    if (req.method !== 'POST') return res.status(405).end();
    const { userId, userNm, userPwd } = req.body || {};
    if (!userId || !userNm || !userPwd) return res.status(400).json({ error: '모든 항목을 입력하세요.' });
    const exists = await pool.query('SELECT 1 FROM tb_user WHERE user_id=$1', [userId]);
    if (exists.rows.length > 0) return res.status(400).json({ error: '이미 사용 중인 사번입니다.' });
    const hashed = bcrypt.hashSync(userPwd, 10);
    await pool.query(
      "INSERT INTO tb_user(user_id, user_nm, user_pwd, user_role, status) VALUES($1,$2,$3,$4,'PENDING')",
      [userId, userNm, hashed, 'USER']
    );
    return res.json({ message: 'PENDING' });
  }

  // ── logout ─────────────────────────────────────────────────────────
  if (action === 'logout') {
    clearCookie(res);
    return res.json({ message: '로그아웃 되었습니다.' });
  }

  // ── me ─────────────────────────────────────────────────────────────
  if (action === 'me') {
    if (req.method !== 'GET') return res.status(405).end();
    const u = getUser(req);
    if (!u) return res.status(401).json({ error: '로그인 필요' });
    const { rows } = await pool.query('SELECT * FROM tb_user WHERE user_id=$1', [u.userId]);
    if (!rows[0]) return res.status(401).json({ error: '사용자 없음' });
    const user = rows[0];
    return res.json({ userId: user.user_id, userNm: user.user_nm, userRole: user.user_role, regDt: user.reg_dt });
  }

  res.status(400).json({ error: 'action 파라미터가 필요합니다.' });
};
