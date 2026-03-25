jest.mock('../lib/db');
jest.mock('../lib/cors', () => () => false);

const { getPool } = require('../lib/db');
const { signToken } = require('../lib/auth');
const handler = require('../api/posts');

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
function adminToken() {
  return `token=${signToken({ userId: 'admin', userNm: '관리자', userRole: 'ADMIN' })}`;
}
function userToken() {
  return `token=${signToken({ userId: 'u1', userNm: '홍길동', userRole: 'USER' })}`;
}

const fakePost = {
  post_id: 1, post_type: 'FREE', title: '제목', content: '내용',
  writer_id: 'u1', writer_nm: '홍길동', meeting_dt: null,
  view_cnt: 0, confirmed_lunch_nm: null, confirmed_lunch_id: null,
  reg_dt: new Date(), mod_dt: new Date()
};

describe('GET /api/posts (목록)', () => {
  test('전체 목록 반환', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakePost] })) });
    const res = makeRes();
    await handler(makeReq('GET', {}), res);
    expect(Array.isArray(res._body)).toBe(true);
    expect(res._body[0].postId).toBe(1);
  });

  test('type 필터 작동', async () => {
    const q = jest.fn(async () => ({ rows: [fakePost] }));
    getPool.mockReturnValue({ query: q });
    const res = makeRes();
    await handler(makeReq('GET', { type: 'FREE' }), res);
    expect(q.mock.calls[0][0]).toContain('post_type');
  });

  test('popup=1 이면 단건(NOTICE) 반환', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [{ ...fakePost, post_type: 'NOTICE' }] })) });
    const res = makeRes();
    await handler(makeReq('GET', { popup: '1' }), res);
    expect(res._body.postType).toBe('NOTICE');
  });
});

describe('GET /api/posts?id= (단건)', () => {
  test('존재하는 게시글 반환', async () => {
    const q = jest.fn(async () => ({ rows: [fakePost] }));
    getPool.mockReturnValue({ query: q });
    const res = makeRes();
    await handler(makeReq('GET', { id: '1' }), res);
    expect(res._body.postId).toBe(1);
  });

  test('없는 게시글 404', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [] })) });
    const res = makeRes();
    await handler(makeReq('GET', { id: '999' }), res);
    expect(res._status).toBe(404);
  });
});

describe('POST /api/posts (생성)', () => {
  test('비로그인 시 401', async () => {
    const res = makeRes();
    await handler(makeReq('POST', {}, { postType: 'FREE', title: '제목' }), res);
    expect(res._status).toBe(401);
  });

  test('제목 없으면 400', async () => {
    const res = makeRes();
    await handler(makeReq('POST', {}, { postType: 'FREE' }, userToken()), res);
    expect(res._status).toBe(400);
  });

  test('정상 생성 시 201', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakePost] })) });
    const res = makeRes();
    await handler(makeReq('POST', {}, { postType: 'FREE', title: '제목' }, userToken()), res);
    expect(res._status).toBe(201);
  });
});

describe('DELETE /api/posts?id= (삭제)', () => {
  test('일반 유저 삭제 시도 → 403', async () => {
    const res = makeRes();
    await handler(makeReq('DELETE', { id: '1' }, {}, userToken()), res);
    expect(res._status).toBe(403);
  });

  test('ADMIN 삭제 성공 → 204', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [] })) });
    const res = makeRes();
    await handler(makeReq('DELETE', { id: '1' }, {}, adminToken()), res);
    expect(res._status).toBe(204);
  });
});
