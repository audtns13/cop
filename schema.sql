-- ============================================================
-- Data On AI CoP - PostgreSQL 초기화 스크립트
-- Neon / Supabase / Railway PostgreSQL 에서 실행하세요
-- ============================================================

CREATE TABLE IF NOT EXISTS tb_user (
  user_id   VARCHAR(20)  PRIMARY KEY,
  user_nm   VARCHAR(50)  NOT NULL,
  user_pwd  VARCHAR(255) NOT NULL,
  user_role VARCHAR(10)  NOT NULL DEFAULT 'USER',
  reg_dt    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_post (
  post_id             BIGSERIAL    PRIMARY KEY,
  post_type           VARCHAR(20)  NOT NULL,
  title               VARCHAR(200) NOT NULL,
  content             TEXT,
  writer_id           VARCHAR(20),
  writer_nm           VARCHAR(50),
  meeting_dt          TIMESTAMP,
  view_cnt            INTEGER      NOT NULL DEFAULT 0,
  confirmed_lunch_nm  VARCHAR(200),
  confirmed_lunch_id  INTEGER,
  reg_dt              TIMESTAMP    NOT NULL DEFAULT NOW(),
  mod_dt              TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_comment (
  comment_id BIGSERIAL   PRIMARY KEY,
  post_id    BIGINT      NOT NULL,
  content    TEXT        NOT NULL,
  writer_id  VARCHAR(20),
  writer_nm  VARCHAR(50),
  reg_dt     TIMESTAMP   NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_attendance (
  att_id   BIGSERIAL   PRIMARY KEY,
  post_id  BIGINT      NOT NULL,
  user_id  VARCHAR(20) NOT NULL,
  user_nm  VARCHAR(50),
  status   VARCHAR(10) NOT NULL,
  reg_dt   TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

CREATE TABLE IF NOT EXISTS tb_lunch_menu (
  menu_id   SERIAL       PRIMARY KEY,
  menu_nm   VARCHAR(100) NOT NULL,
  menu_addr VARCHAR(200),
  reg_dt    TIMESTAMP    NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tb_lunch_menu_item (
  item_id BIGSERIAL    PRIMARY KEY,
  menu_id INTEGER      NOT NULL,
  item_nm VARCHAR(100) NOT NULL
);

CREATE TABLE IF NOT EXISTS tb_lunch_vote (
  vote_id         BIGSERIAL   PRIMARY KEY,
  meeting_post_id BIGINT,
  menu_id         INTEGER,
  menu_nm         VARCHAR(100),
  user_id         VARCHAR(20) NOT NULL,
  user_nm         VARCHAR(50),
  not_eating_yn   VARCHAR(1)  NOT NULL DEFAULT 'N',
  custom_yn       VARCHAR(1)  NOT NULL DEFAULT 'N',
  vote_dt         TIMESTAMP   NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, meeting_post_id)
);

CREATE TABLE IF NOT EXISTS tb_file_info (
  file_id   BIGSERIAL    PRIMARY KEY,
  post_id   BIGINT,
  orig_nm   VARCHAR(255),
  file_size BIGINT,
  reg_dt    TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ============================================================
-- 마이그레이션: 공지사항 컬럼 추가 (이미 존재하면 무시)
-- ============================================================
ALTER TABLE tb_post ADD COLUMN IF NOT EXISTS notice_yn        VARCHAR(1)  DEFAULT 'N';
ALTER TABLE tb_post ADD COLUMN IF NOT EXISTS notice_start_dt  TIMESTAMP;
ALTER TABLE tb_post ADD COLUMN IF NOT EXISTS notice_end_dt    TIMESTAMP;

-- 마이그레이션: 첨부파일 Base64 데이터 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE tb_file_info ADD COLUMN IF NOT EXISTS file_data TEXT;

-- 마이그레이션: 회원 상태 컬럼 추가 (이미 존재하면 무시)
ALTER TABLE tb_user ADD COLUMN IF NOT EXISTS status VARCHAR(10);

-- ============================================================
-- 마이그레이션: 게시판 카테고리 (이미 존재하면 무시)
-- ============================================================
CREATE TABLE IF NOT EXISTS tb_board_category (
  cat_id   SERIAL       PRIMARY KEY,
  cat_nm   VARCHAR(50)  NOT NULL,
  sort_ord INTEGER      NOT NULL DEFAULT 0,
  reg_dt   TIMESTAMP    NOT NULL DEFAULT NOW()
);
INSERT INTO tb_board_category (cat_nm, sort_ord) VALUES
  ('교육자료', 1), ('정보공유', 2), ('과제', 3), ('공지', 4), ('기타', 99)
ON CONFLICT DO NOTHING;

-- 마이그레이션: 게시글 카테고리 컬럼
ALTER TABLE tb_post ADD COLUMN IF NOT EXISTS category VARCHAR(50);

-- 마이그레이션: 점심 정산 여부 컬럼
ALTER TABLE tb_post ADD COLUMN IF NOT EXISTS lunch_settled_yn VARCHAR(1) DEFAULT 'N';

-- ============================================================
-- 초기 관리자 계정 (EMP001 / 1234)
-- bcrypt hash of "1234"
-- ============================================================
INSERT INTO tb_user (user_id, user_nm, user_pwd, user_role)
VALUES (
  'EMP001',
  '관리자',
  '$2a$10$6DYqIiIjdt73kNwrIq3x9O9yzvgytu2.J9z47D9fKVrhoUYpFLhGK',
  'ADMIN'
)
ON CONFLICT (user_id) DO NOTHING;
