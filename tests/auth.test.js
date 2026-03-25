/**
 * api/auth.js 테스트
 * - DB와 bcrypt를 mock 처리해 실제 연결 없이 로직 검증
 */
jest.mock('../lib/db');
jest.mock('bcryptjs');

const { getPool } = require('../lib/db');
const bcrypt      = require('bcryptjs');

// ── 공통 mock 헬퍼 ──────────────────────────────────────────────────
function mockPool(rowsMap) {
  const query = jest.fn(async (sql) => {
    for (const [key, rows] of Object.entries(rowsMap)) {
      if (sql.includes(key)) return { rows };
    }
    return { rows: [] };
  });
  getPool.mockReturnValue({ query });
  return query;
}

function makeReq(method, query = {}, body = {}, cookie = '') {
  return { method, query, body, headers: { cookie } };
}
function makeRes() {
  const res = { _status: 200, _body: null, _headers: {} };
  res.status  = (s) => { res._status = s; return res; };
  res.json    = (b) => { res._body = b; return res; };
  res.end     = ()  => res;
  res.setHeader = (k, v) => { res._headers[k] = v; };
  return res;
}

// lib/cors mock – CORS preflight 통과
jest.mock('../lib/cors', () => () => false);

// lib/auth 실제 사용 (JWT 로직 검증)
const { signToken, getUser } = require('../lib/auth');

const handler = require('../api/auth');

// ════════════════════════════════════════════════════════════════════
describe('POST /api/auth?action=login', () => {
  test('아이디/비밀번호 없으면 400', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { action: 'login' }, {}), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/아이디/);
  });

  test('사용자 없으면 401', async () => {
    mockPool({ tb_user: [] });
    bcrypt.compareSync.mockReturnValue(false);
    const res = makeRes();
    await handler(makeReq('POST', { action: 'login' }, { userId: 'u1', userPwd: 'pw' }), res);
    expect(res._status).toBe(401);
  });

  test('비밀번호 불일치 시 401', async () => {
    mockPool({ tb_user: [{ user_id: 'u1', user_nm: '홍길동', user_pwd: 'hashed', user_role: 'USER', reg_dt: new Date() }] });
    bcrypt.compareSync.mockReturnValue(false);
    const res = makeRes();
    await handler(makeReq('POST', { action: 'login' }, { userId: 'u1', userPwd: 'wrong' }), res);
    expect(res._status).toBe(401);
  });

  test('정상 로그인 시 200 + 쿠키 발급', async () => {
    const fakeUser = { user_id: 'u1', user_nm: '홍길동', user_pwd: 'hashed', user_role: 'USER', reg_dt: new Date() };
    mockPool({ tb_user: [fakeUser] });
    bcrypt.compareSync.mockReturnValue(true);
    const res = makeRes();
    await handler(makeReq('POST', { action: 'login' }, { userId: 'u1', userPwd: 'pw' }), res);
    expect(res._status).toBe(200);
    expect(res._body.userId).toBe('u1');
    expect(res._headers['Set-Cookie']).toBeTruthy();
  });
});

// ════════════════════════════════════════════════════════════════════
describe('POST /api/auth?action=register', () => {
  test('항목 미입력 시 400', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register' }, { userId: 'u1' }), res);
    expect(res._status).toBe(400);
  });

  test('중복 사번 시 400', async () => {
    mockPool({ SELECT: [{ '?column?': 1 }] });
    bcrypt.hashSync.mockReturnValue('hashed');
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register' }, { userId: 'u1', userNm: '홍길동', userPwd: 'pw' }), res);
    expect(res._status).toBe(400);
    expect(res._body.error).toMatch(/이미/);
  });

  test('신규 가입 성공', async () => {
    // SELECT 1 – 없음, INSERT – rows 없어도 OK
    const query = jest.fn(async (sql) => {
      if (sql.includes('SELECT 1')) return { rows: [] };
      return { rows: [] };
    });
    getPool.mockReturnValue({ query });
    bcrypt.hashSync.mockReturnValue('hashed');
    const res = makeRes();
    await handler(makeReq('POST', { action: 'register' }, { userId: 'u2', userNm: '이순신', userPwd: 'pw' }), res);
    expect(res._body.message).toMatch(/완료/);
  });
});

// ════════════════════════════════════════════════════════════════════
describe('GET /api/auth?action=me', () => {
  test('토큰 없으면 401', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { action: 'me' }, {}, ''), res);
    expect(res._status).toBe(401);
  });

  test('유효 토큰 + 사용자 존재 시 200', async () => {
    const token = signToken({ userId: 'u1', userNm: '홍길동', userRole: 'USER' });
    const fakeUser = { user_id: 'u1', user_nm: '홍길동', user_role: 'USER', reg_dt: new Date() };
    mockPool({ tb_user: [fakeUser] });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'me' }, {}, `token=${token}`), res);
    expect(res._body.userId).toBe('u1');
  });
});

// ════════════════════════════════════════════════════════════════════
describe('POST /api/auth?action=logout', () => {
  test('로그아웃 시 쿠키 삭제', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { action: 'logout' }), res);
    expect(res._body.message).toMatch(/로그아웃/);
    expect(res._headers['Set-Cookie']).toContain('token=;');
  });
});

// ════════════════════════════════════════════════════════════════════
describe('잘못된 action', () => {
  test('action 없으면 400', async () => {
    const res = makeRes();
    await handler(makeReq('GET', {}), res);
    expect(res._status).toBe(400);
  });
});
