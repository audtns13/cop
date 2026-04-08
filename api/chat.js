const { getPool } = require('../lib/db');
const { getUser } = require('../lib/auth');
const cors        = require('../lib/cors');

// POST /api/chat — AI 챗봇 엔드포인트 (Gemini 2.0 Flash)
// Body: { messages: [{ role: 'user'|'model', parts: [{ text }] }] }
// Response: { reply: string }

// gemini-2.5-flash: 무료 티어 안정 지원 모델 (v1beta, generateContent + Function Calling 지원)
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const GEMINI_URL   = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=`;

// ── Gemini에게 제공할 Function 도구 정의
const TOOLS = [{
  functionDeclarations: [
    {
      name: 'get_my_attendance',
      description: '현재 로그인한 사용자의 출결 통계와 최근 모임 출결 목록을 조회합니다.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'get_upcoming_meetings',
      description: '앞으로 예정된 모임(활동기록) 일정 목록을 조회합니다.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'get_lunch_votes',
      description: '가장 최근 모임의 점심 투표 현황을 조회합니다.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'get_recent_posts',
      description: '자유게시판 최근 게시글 목록을 조회합니다.',
      parameters: {
        type: 'OBJECT',
        properties: {
          limit: { type: 'NUMBER', description: '조회할 게시글 수 (기본 5, 최대 10)' }
        }
      }
    },
    {
      name: 'register_attendance',
      description: '특정 모임의 출결을 등록하거나 변경합니다. 사용자가 명확히 요청한 경우에만 호출하세요.',
      parameters: {
        type: 'OBJECT',
        required: ['postId', 'status'],
        properties: {
          postId: { type: 'NUMBER', description: '모임의 post_id' },
          status: { type: 'STRING', description: '출결 상태: Y(참석) 또는 N(불참)' }
        }
      }
    },
    {
      name: 'get_site_guide',
      description: '사이트의 주요 기능 및 이용 방법을 안내합니다.',
      parameters: { type: 'OBJECT', properties: {} }
    }
  ]
}];

// ── 도구 실행: DB 조회 또는 작업 수행
async function executeTool(name, args, userId, pool) {
  switch (name) {

    case 'get_my_attendance': {
      const { rows } = await pool.query(
        `SELECT p.post_id, p.title, p.meeting_dt, a.status
         FROM tb_post p
         LEFT JOIN tb_attendance a ON a.post_id = p.post_id AND a.user_id = $1
         WHERE p.post_type = 'ACTIVITY'
         ORDER BY p.meeting_dt DESC LIMIT 10`,
        [userId]
      );
      const total    = rows.length;
      const attended = rows.filter(r => r.status === 'Y').length;
      const rate     = total > 0 ? Math.round((attended / total) * 100) : 0;
      return {
        summary: `총 ${total}회 모임 중 ${attended}회 참석 (출결률 ${rate}%)`,
        meetings: rows.map(r => ({
          postId:    r.post_id,
          title:     r.title,
          meetingDt: r.meeting_dt ? r.meeting_dt.toISOString().split('T')[0] : null,
          status:    r.status === 'Y' ? '참석' : r.status === 'N' ? '불참' : '미등록'
        }))
      };
    }

    case 'get_upcoming_meetings': {
      const { rows } = await pool.query(
        `SELECT p.post_id, p.title, p.meeting_dt,
                (SELECT COUNT(*) FROM tb_attendance a
                 WHERE a.post_id = p.post_id AND a.status='Y') AS attend_cnt,
                me.status AS my_status
         FROM tb_post p
         LEFT JOIN tb_attendance me ON me.post_id = p.post_id AND me.user_id = $1
         WHERE p.post_type = 'ACTIVITY' AND p.meeting_dt >= NOW()
         ORDER BY p.meeting_dt ASC LIMIT 5`,
        [userId]
      );
      if (rows.length === 0) return { message: '예정된 모임이 없습니다.' };
      return {
        meetings: rows.map(r => ({
          postId:       r.post_id,
          title:        r.title,
          meetingDt:    r.meeting_dt ? r.meeting_dt.toISOString().split('T')[0] : null,
          attendCount:  parseInt(r.attend_cnt, 10),
          myStatus:     r.my_status === 'Y' ? '참석' : r.my_status === 'N' ? '불참' : '미등록'
        }))
      };
    }

    case 'get_lunch_votes': {
      const { rows: [meeting] } = await pool.query(
        `SELECT post_id, title, meeting_dt, confirmed_lunch_nm
         FROM tb_post WHERE post_type='ACTIVITY'
         ORDER BY meeting_dt DESC LIMIT 1`
      );
      if (!meeting) return { message: '모임 데이터가 없습니다.' };
      const { rows: votes } = await pool.query(
        `SELECT menu_nm, not_eating_yn, COUNT(*) AS cnt
         FROM tb_lunch_vote WHERE meeting_post_id = $1
         GROUP BY menu_nm, not_eating_yn ORDER BY cnt DESC`,
        [meeting.post_id]
      );
      return {
        meetingTitle:   meeting.title,
        meetingDt:      meeting.meeting_dt ? meeting.meeting_dt.toISOString().split('T')[0] : null,
        confirmedLunch: meeting.confirmed_lunch_nm || '미확정',
        votes: votes.map(v => ({
          menu:  v.not_eating_yn === 'Y' ? '안먹음' : (v.menu_nm || '기타'),
          count: parseInt(v.cnt, 10)
        }))
      };
    }

    case 'get_recent_posts': {
      const limit = Math.min(parseInt(args.limit, 10) || 5, 10);
      const { rows } = await pool.query(
        `SELECT p.post_id, p.title, p.writer_nm, p.reg_dt, p.view_cnt,
                (SELECT COUNT(*) FROM tb_comment c WHERE c.post_id = p.post_id) AS comment_count
         FROM tb_post p WHERE post_type='FREE'
         ORDER BY reg_dt DESC LIMIT $1`,
        [limit]
      );
      return {
        posts: rows.map(r => ({
          postId:       r.post_id,
          title:        r.title,
          writer:       r.writer_nm,
          regDt:        r.reg_dt ? r.reg_dt.toISOString().split('T')[0] : null,
          viewCnt:      r.view_cnt || 0,
          commentCount: parseInt(r.comment_count, 10)
        }))
      };
    }

    case 'register_attendance': {
      const { postId, status } = args;
      if (!postId || !['Y', 'N'].includes(status)) {
        return { error: '잘못된 파라미터입니다.' };
      }
      const { rows: [post] } = await pool.query(
        `SELECT post_id, title FROM tb_post
         WHERE post_id=$1 AND post_type='ACTIVITY'`,
        [postId]
      );
      if (!post) return { error: '해당 모임을 찾을 수 없습니다.' };
      await pool.query(
        `INSERT INTO tb_attendance(post_id, user_id, status) VALUES($1,$2,$3)
         ON CONFLICT (post_id, user_id) DO UPDATE SET status=$3`,
        [postId, userId, status]
      );
      return {
        success: true,
        message: `"${post.title}" 모임 출결이 ${status === 'Y' ? '참석' : '불참'}으로 등록되었습니다.`
      };
    }

    case 'get_site_guide': {
      return {
        guide: `Data On AI CoP 관리 시스템 기능 안내:

1. 대시보드: 다음 모임 D-Day, 점심 투표 현황, 내 출결률, 최근 활동기록 한눈에 확인
2. 출결 관리: 각 모임별 참석/불참 등록, 전체 멤버 출결 통계 확인
   - 출결률 90% 이상 → 개근 배지 / 80% 이상 → 우수 배지
3. 점심 메뉴: 모임별 점심 투표 (메뉴 선택/직접 입력/안먹음), 관리자가 최종 확정
4. 활동 기록: 모임 활동 내용 게시글 등록 (파일 첨부 가능), 참석자 현황 확인
5. 자유 게시판: 자유 글 작성/댓글/파일 첨부, 공지사항 설정 가능 (관리자)
   - 게시글 상세에서 A−/A+ 버튼으로 글자 크기 조정 가능
6. 멤버 관리 (관리자 전용): 신규 가입 승인, 비밀번호 초기화, 회원 삭제`
      };
    }

    default:
      return { error: `알 수 없는 함수: ${name}` };
  }
}

// ── 메인 핸들러
module.exports = async (req, res) => {
  if (cors(req, res)) return;

  // 로그인 필수
  const u = getUser(req);
  if (!u) return res.status(401).json({ error: '로그인 필요' });

  if (req.method !== 'POST') return res.status(405).end();

  const { messages } = req.body || {};
  if (!Array.isArray(messages) || messages.length === 0) {
    return res.status(400).json({ error: '메시지가 없습니다.' });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'AI 서비스가 설정되지 않았습니다.' });

  const pool = getPool();

  // 시스템 프롬프트 (사용자 정보 + 오늘 날짜 포함)
  const today = new Date().toLocaleDateString('ko-KR', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long'
  });
  const systemPrompt =
    `당신은 'Data On AI CoP' 관리 시스템의 AI 도우미입니다.\n` +
    `현재 사용자: ${u.userNm || u.userId} (${u.userId}), 역할: ${u.userRole === 'ADMIN' ? '관리자' : '일반 회원'}\n` +
    `오늘 날짜: ${today}\n\n` +
    `역할:\n` +
    `1. 사이트 기능 설명 및 이용 안내\n` +
    `2. 출결, 모임, 점심 투표 등 데이터 조회 (도구 활용)\n` +
    `3. 출결 등록 등 작업 수행 (사용자가 명확히 요청한 경우에만)\n` +
    `4. 한국어로 친절하고 간결하게 답변\n` +
    `5. 불가능한 작업은 솔직하게 안내`;

  // Function Calling 루프 (최대 3회 반복)
  let contents       = [...messages];
  let reply          = '';
  const MAX_ITER     = 3;

  for (let i = 0; i < MAX_ITER; i++) {
    const body = {
      system_instruction: { parts: [{ text: systemPrompt }] },
      contents,
      tools: TOOLS,
      generationConfig: { maxOutputTokens: 1024, temperature: 0.7 }
    };

    const gemRes = await fetch(GEMINI_URL + apiKey, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });

    if (!gemRes.ok) {
      const errBody = await gemRes.json().catch(() => ({}));
      // 디버그: Vercel Functions 로그에 실제 오류 기록
      console.error('[chat.js] Gemini error', gemRes.status, JSON.stringify(errBody));
      if (gemRes.status === 429) {
        return res.status(429).json({
          error: 'AI 요청 한도에 도달했습니다. 잠시 후 다시 시도해주세요.',
          detail: errBody
        });
      }
      // 그 외 오류는 실제 메시지 포함해서 반환 (디버깅용)
      const gemErrMsg = errBody?.error?.message || JSON.stringify(errBody);
      return res.status(502).json({ error: `AI 오류 (${gemRes.status}): ${gemErrMsg}` });
    }

    const data      = await gemRes.json();
    const candidate = data.candidates?.[0];
    if (!candidate) return res.status(502).json({ error: 'AI 응답을 받지 못했습니다.' });

    const parts          = candidate.content?.parts || [];
    const fnCallPart     = parts.find(p => p.functionCall);

    if (!fnCallPart) {
      // 텍스트 응답 → 종료
      reply = parts.map(p => p.text || '').join('');
      break;
    }

    // Function 실행 후 결과를 대화에 추가
    const { name, args } = fnCallPart.functionCall;
    const toolResult     = await executeTool(name, args || {}, u.userId, pool);

    contents.push({ role: 'model', parts: [{ functionCall: { name, args: args || {} } }] });
    contents.push({
      role:  'user',
      parts: [{ functionResponse: { name, response: { output: JSON.stringify(toolResult) } } }]
    });
  }

  return res.json({ reply: reply || '답변을 생성하지 못했습니다.' });
};
