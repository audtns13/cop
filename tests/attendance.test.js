jest.mock('../lib/db');
jest.mock('../lib/cors', () => () => false);

const { getPool } = require('../lib/db');
const { signToken } = require('../lib/auth');
const handler = require('../api/attendance');

function makeReq(method, query = {}, body = {}, cookie = '') {
  return { method, query, body, headers: { cookie } };
}
function makeRes() {
  const res = { _status: 200, _body: null };
  res.status  = (s) => { res._status = s; return res; };
  res.json    = (b) => { res._body = b; return res; };
  res.end     = ()  => res;
  return res;
}
function userToken(userId = 'u1') {
  return `token=${signToken({ userId, userNm: '홍길동', userRole: 'USER' })}`;
}

const fakeAtt = { att_id: 1, post_id: 10, user_id: 'u1', user_nm: '홍길동', status: 'Y', reg_dt: new Date() };

describe('GET /api/attendance (목록)', () => {
  test('전체 출결 목록 반환', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakeAtt] })) });
    const res = makeRes();
    await handler(makeReq('GET', {}), res);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body[0].attId).toBe(1);
  });

  test('postId 필터 작동', async () => {
    const q = jest.fn(async () => ({ rows: [fakeAtt] }));
    getPool.mockReturnValue({ query: q });
    const res = makeRes();
    await handler(makeReq('GET', { postId: '10' }), res);
    expect(q.mock.calls[0][1]).toEqual(['10']);
  });
});

describe('GET /api/attendance?action=stats', () => {
  test('사용자별 통계 반환', async () => {
    const q = jest.fn(async (sql) => {
      if (sql.includes('tb_post')) return { rows: [{ post_id: 1 }, { post_id: 2 }] };
      if (sql.includes('tb_user')) return { rows: [{ user_id: 'u1', user_nm: '홍길동', user_role: 'USER' }] };
      if (sql.includes('tb_attendance')) return { rows: [{ user_id: 'u1', post_id: 1, status: 'Y' }] };
      return { rows: [] };
    });
    getPool.mockReturnValue({ query: q });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'stats' }), res);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body[0].totalMeetings).toBe(2);
    expect(res._body[0].attendCount).toBe(1);
    expect(res._body[0].attendRate).toBe(50);
  });
});

describe('GET /api/attendance?action=mine', () => {
  test('비로그인 시 빈 객체', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { action: 'mine' }), res);
    expect(res._body).toEqual({});
  });

  test('로그인 시 postId→status 맵', async () => {
    getPool.mockReturnValue({
      query: jest.fn(async () => ({ rows: [{ post_id: 10, status: 'Y' }, { post_id: 11, status: 'N' }] }))
    });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'mine' }, {}, userToken()), res);
    expect(res._body[10]).toBe('Y');
    expect(res._body[11]).toBe('N');
  });
});

describe('GET /api/attendance?action=my', () => {
  test('비로그인 시 0%', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { action: 'my' }), res);
    expect(res._body.attendRate).toBe(0);
  });

  test('로그인 시 출석률 계산', async () => {
    const q = jest.fn(async (sql) => {
      if (sql.includes('tb_post'))  return { rows: [{ post_id: 1 }, { post_id: 2 }, { post_id: 3 }, { post_id: 4 }] };
      if (sql.includes('tb_attendance')) return { rows: [{ status: 'Y' }, { status: 'Y' }] };
      return { rows: [] };
    });
    getPool.mockReturnValue({ query: q });
    const res = makeRes();
    await handler(makeReq('GET', { action: 'my' }, {}, userToken()), res);
    expect(res._body.totalMeetings).toBe(4);
    expect(res._body.attendCount).toBe(2);
    expect(res._body.attendRate).toBe(50);
  });
});

describe('POST /api/attendance (출결 등록)', () => {
  test('비로그인 시 401', async () => {
    const res = makeRes();
    await handler(makeReq('POST', {}, { postId: 1, status: 'Y' }), res);
    expect(res._status).toBe(401);
  });

  test('필수 항목 누락 시 400', async () => {
    const res = makeRes();
    await handler(makeReq('POST', {}, { postId: 1 }, userToken()), res);
    expect(res._status).toBe(400);
  });

  test('정상 등록 → upsert 실행', async () => {
    const q = jest.fn(async () => ({ rows: [fakeAtt] }));
    getPool.mockReturnValue({ query: q });
    const res = makeRes();
    await handler(makeReq('POST', {}, { postId: 10, status: 'Y' }, userToken()), res);
    expect(res._body.status).toBe('Y');
    expect(q.mock.calls[0][0]).toContain('ON CONFLICT');
  });
});
