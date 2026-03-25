jest.mock('../lib/db');
jest.mock('../lib/cors', () => () => false);

const { getPool } = require('../lib/db');
const { signToken } = require('../lib/auth');
const handler = require('../api/lunch');

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

const fakeMenu = { menu_id: 1, menu_nm: '신촌설렁탕', menu_addr: '서울 서대문구', reg_dt: new Date() };

// ── menus ────────────────────────────────────────────────────────────
describe('resource=menus (식당)', () => {
  test('GET - 식당 목록 반환', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakeMenu] })) });
    const res = makeRes();
    await handler(makeReq('GET', { resource: 'menus' }), res);
    expect(res._body[0].menuId).toBe(1);
    expect(res._body[0].menuNm).toBe('신촌설렁탕');
  });

  test('POST - 비 ADMIN 시 403', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { resource: 'menus' }, { menuNm: '한솥' }, userToken()), res);
    expect(res._status).toBe(403);
  });

  test('POST - ADMIN 식당 추가 201', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakeMenu] })) });
    const res = makeRes();
    await handler(makeReq('POST', { resource: 'menus' }, { menuNm: '신촌설렁탕' }, adminToken()), res);
    expect(res._status).toBe(201);
    expect(res._body.menuNm).toBe('신촌설렁탕');
  });

  test('DELETE - ADMIN 식당 삭제 204', async () => {
    const q = jest.fn(async () => ({ rows: [] }));
    getPool.mockReturnValue({ query: q });
    const res = makeRes();
    await handler(makeReq('DELETE', { resource: 'menus', menuId: '1' }, {}, adminToken()), res);
    expect(res._status).toBe(204);
    expect(q).toHaveBeenCalledTimes(2); // items, menus 순서로 2번 삭제
  });
});

// ── items ────────────────────────────────────────────────────────────
const fakeItem = { item_id: 10, menu_id: 1, item_nm: '설렁탕' };

describe('resource=items (메뉴 아이템)', () => {
  test('GET - 아이템 목록 반환', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakeItem] })) });
    const res = makeRes();
    await handler(makeReq('GET', { resource: 'items', menuId: '1' }), res);
    expect(res._body[0].itemNm).toBe('설렁탕');
  });

  test('POST - 아이템 추가 201', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakeItem] })) });
    const res = makeRes();
    await handler(makeReq('POST', { resource: 'items', menuId: '1' }, { itemNm: '설렁탕' }, adminToken()), res);
    expect(res._status).toBe(201);
  });

  test('DELETE - 아이템 삭제 204', async () => {
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [] })) });
    const res = makeRes();
    await handler(makeReq('DELETE', { resource: 'items', itemId: '10' }, {}, adminToken()), res);
    expect(res._status).toBe(204);
  });
});

// ── votes ────────────────────────────────────────────────────────────
describe('resource=votes (투표 현황)', () => {
  test('meetingPostId 없으면 400', async () => {
    const res = makeRes();
    await handler(makeReq('GET', { resource: 'votes' }), res);
    expect(res._status).toBe(400);
  });

  test('정상 투표 현황 반환', async () => {
    const fakeVote = { vote_id: 1, meeting_post_id: 5, menu_id: 1, menu_nm: '설렁탕', user_id: 'u1', user_nm: '홍길동', not_eating_yn: 'N', custom_yn: 'N', vote_dt: new Date() };
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakeVote] })) });
    const res = makeRes();
    await handler(makeReq('GET', { resource: 'votes', meetingPostId: '5' }), res);
    expect(res._body.summary).toBeDefined();
    expect(res._body.allVotes).toHaveLength(1);
    expect(res._body.summary[0].key).toBe('1'); // menu_id 기준
  });
});

// ── vote ─────────────────────────────────────────────────────────────
describe('resource=vote (투표 제출)', () => {
  test('비로그인 시 401', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { resource: 'vote' }, { meetingPostId: 5 }), res);
    expect(res._status).toBe(401);
  });

  test('meetingPostId 없으면 400', async () => {
    const res = makeRes();
    await handler(makeReq('POST', { resource: 'vote' }, {}, userToken()), res);
    expect(res._status).toBe(400);
  });

  test('식당 선택 투표 성공', async () => {
    const fakeVoteRow = { vote_id: 1, meeting_post_id: 5, menu_id: 1, menu_nm: '설렁탕', user_id: 'u1', user_nm: '홍길동', not_eating_yn: 'N', custom_yn: 'N', vote_dt: new Date() };
    const q = jest.fn(async (sql) => {
      if (sql.includes('menu_nm')) return { rows: [{ menu_nm: '설렁탕' }] };
      return { rows: [fakeVoteRow] };
    });
    getPool.mockReturnValue({ query: q });
    const res = makeRes();
    await handler(makeReq('POST', { resource: 'vote' }, { meetingPostId: 5, menuId: 1 }, userToken()), res);
    expect(res._body.menuNm).toBe('설렁탕');
  });

  test('안먹음 투표 시 notEatingYn=Y', async () => {
    const fakeVoteRow = { vote_id: 2, meeting_post_id: 5, menu_id: null, menu_nm: '안먹음', user_id: 'u1', user_nm: '홍길동', not_eating_yn: 'Y', custom_yn: 'N', vote_dt: new Date() };
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakeVoteRow] })) });
    const res = makeRes();
    await handler(makeReq('POST', { resource: 'vote' }, { meetingPostId: 5, notEating: true }, userToken()), res);
    expect(res._body.notEatingYn).toBe('Y');
  });
});

// ── confirm ──────────────────────────────────────────────────────────
describe('resource=confirm (식당 확정)', () => {
  test('비 ADMIN 시 403', async () => {
    const res = makeRes();
    await handler(makeReq('PUT', { resource: 'confirm' }, { meetingPostId: 5, menuNm: '설렁탕', menuId: 1 }, userToken()), res);
    expect(res._status).toBe(403);
  });

  test('meetingPostId 없으면 400', async () => {
    const res = makeRes();
    await handler(makeReq('PUT', { resource: 'confirm' }, {}, adminToken()), res);
    expect(res._status).toBe(400);
  });

  test('ADMIN 확정 성공', async () => {
    const fakeRow = { post_id: 5, confirmed_lunch_nm: '설렁탕', confirmed_lunch_id: 1 };
    getPool.mockReturnValue({ query: jest.fn(async () => ({ rows: [fakeRow] })) });
    const res = makeRes();
    await handler(makeReq('PUT', { resource: 'confirm' }, { meetingPostId: 5, menuNm: '설렁탕', menuId: 1 }, adminToken()), res);
    expect(res._body.confirmedLunchNm).toBe('설렁탕');
  });
});
